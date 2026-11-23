import type { ShareRole } from "@/lib/access/policy";
import type {
  DocumentRecord,
  DocumentRepository,
  UserRepository,
  UserSummary,
  VersionRecord,
  VersionRepository,
} from "@/lib/documents/types";

type StoredDoc = Omit<DocumentRecord, "owner" | "shares" | "updatedBy"> & { updatedById: string | null };

/** Test doubles for the persistence ports; let the service be tested without a database. */
export function createInMemoryRepos(users: UserSummary[], now: () => Date = () => new Date()) {
  const docs = new Map<string, StoredDoc>();
  const shares: { documentId: string; userId: string; role: ShareRole }[] = [];
  const versions: (Omit<VersionRecord, "createdBy"> & { documentId: string; createdById: string })[] = [];
  let seq = 0;

  const userById = (id: string) => users.find((u) => u.id === id)!;
  const hydrate = ({ updatedById, ...d }: StoredDoc): DocumentRecord => ({
    ...d,
    owner: userById(d.ownerId),
    updatedBy: updatedById ? userById(updatedById) : null,
    shares: shares.filter((s) => s.documentId === d.id).map((s) => ({ userId: s.userId, role: s.role, user: userById(s.userId) })),
  });

  const docRepo: DocumentRepository = {
    findById: async (id) => (docs.has(id) ? hydrate(docs.get(id)!) : null),
    listOwnedBy: async (userId) => [...docs.values()].filter((d) => d.ownerId === userId).map(hydrate),
    listSharedWith: async (userId) =>
      [...docs.values()].filter((d) => shares.some((s) => s.documentId === d.id && s.userId === userId)).map(hydrate),
    create: async (data) => {
      const doc: StoredDoc = { id: `doc${++seq}`, ...data, version: 0, updatedById: null, createdAt: now(), updatedAt: now() };
      docs.set(doc.id, doc);
      return hydrate(doc);
    },
    update: async (id, data, { editorId, expectedVersion }) => {
      const current = docs.get(id)!;
      if (expectedVersion !== undefined && current.version !== expectedVersion) return null;
      const doc = { ...current, ...data, version: current.version + 1, updatedById: editorId, updatedAt: now() };
      docs.set(id, doc);
      return hydrate(doc);
    },
    delete: async (id) => {
      docs.delete(id);
    },
    upsertShare: async (documentId, userId, role) => {
      const existing = shares.find((s) => s.documentId === documentId && s.userId === userId);
      if (existing) existing.role = role;
      else shares.push({ documentId, userId, role });
    },
    removeShare: async (documentId, userId) => {
      const i = shares.findIndex((s) => s.documentId === documentId && s.userId === userId);
      if (i >= 0) shares.splice(i, 1);
    },
  };

  const toRecord = ({ createdById, ...v }: (typeof versions)[number]): VersionRecord => ({ ...v, createdBy: userById(createdById) });
  const newestFirst = (documentId: string) =>
    versions.filter((v) => v.documentId === documentId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const versionRepo: VersionRepository = {
    create: async (data) => {
      versions.push({ id: `v${++seq}`, ...data, createdAt: now() });
    },
    latest: async (documentId) => {
      const v = newestFirst(documentId)[0];
      return v ? toRecord(v) : null;
    },
    list: async (documentId, limit) => newestFirst(documentId).slice(0, limit).map(toRecord),
    find: async (documentId, versionId) => {
      const v = versions.find((x) => x.documentId === documentId && x.id === versionId);
      return v ? toRecord(v) : null;
    },
  };

  const userRepo: UserRepository = { findByEmail: async (email) => users.find((u) => u.email === email) ?? null };
  return { docRepo, userRepo, versionRepo };
}
