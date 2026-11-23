import type { ShareRole } from "@/lib/access/policy";
import type { DocumentRecord, DocumentRepository, UserRepository, UserSummary } from "@/lib/documents/types";

/** Test double for the persistence port; lets the service be tested without a database. */
export function createInMemoryRepos(users: UserSummary[]) {
  const docs = new Map<string, Omit<DocumentRecord, "owner" | "shares">>();
  const shares: { documentId: string; userId: string; role: ShareRole }[] = [];
  let seq = 0;

  const userById = (id: string) => users.find((u) => u.id === id)!;
  const hydrate = (d: Omit<DocumentRecord, "owner" | "shares">): DocumentRecord => ({
    ...d,
    owner: userById(d.ownerId),
    shares: shares.filter((s) => s.documentId === d.id).map((s) => ({ userId: s.userId, role: s.role, user: userById(s.userId) })),
  });

  const docRepo: DocumentRepository = {
    findById: async (id) => (docs.has(id) ? hydrate(docs.get(id)!) : null),
    listOwnedBy: async (userId) => [...docs.values()].filter((d) => d.ownerId === userId).map(hydrate),
    listSharedWith: async (userId) =>
      [...docs.values()].filter((d) => shares.some((s) => s.documentId === d.id && s.userId === userId)).map(hydrate),
    create: async (data) => {
      const now = new Date();
      const doc = { id: `doc${++seq}`, ...data, createdAt: now, updatedAt: now };
      docs.set(doc.id, doc);
      return hydrate(doc);
    },
    update: async (id, data) => {
      const doc = { ...docs.get(id)!, ...data, updatedAt: new Date() };
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

  const userRepo: UserRepository = { findByEmail: async (email) => users.find((u) => u.email === email) ?? null };
  return { docRepo, userRepo };
}
