import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  DocumentRecord,
  DocumentRepository,
  UnitOfWork,
  UserRepository,
  VersionRepository,
} from "./types";

/** Either the root client or the client scoped to an open transaction. */
type Db = PrismaClient | Prisma.TransactionClient;

const userSelect = { id: true, email: true, name: true } as const;
const include = {
  owner: { select: userSelect },
  updatedBy: { select: userSelect },
  shares: { include: { user: { select: userSelect } }, orderBy: { createdAt: "asc" } },
} as const;

type DocumentRow = Prisma.DocumentGetPayload<{ include: typeof include }>;

/** Explicit Prisma → domain mapping, so a schema change surfaces as a type error instead of hiding behind a cast. */
export function toDocumentRecord(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    ownerId: row.ownerId,
    owner: row.owner,
    shares: row.shares.map((s) => ({ userId: s.userId, role: s.role, user: s.user })),
    version: row.version,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const toRecordOrNull = (row: DocumentRow | null) => (row ? toDocumentRecord(row) : null);

const versionSummary = { id: true, title: true, createdAt: true, createdBy: { select: userSelect } } as const;

/** Builds the repositories on top of a given client, so the same code runs inside or outside a transaction. */
export function createPrismaRepositories(db: Db): { docs: DocumentRepository; versions: VersionRepository; users: UserRepository } {
  const docs: DocumentRepository = {
    findById: async (id) => toRecordOrNull(await db.document.findUnique({ where: { id }, include })),
    listOwnedBy: async (userId) =>
      (await db.document.findMany({ where: { ownerId: userId }, include, orderBy: { updatedAt: "desc" } })).map(toDocumentRecord),
    listSharedWith: async (userId) =>
      (
        await db.document.findMany({ where: { shares: { some: { userId } } }, include, orderBy: { updatedAt: "desc" } })
      ).map(toDocumentRecord),
    create: async (data) => toDocumentRecord(await db.document.create({ data, include })),
    update: async (id, data, { editorId, expectedVersion }) => {
      // updateMany lets us add the version to the WHERE clause: a single atomic compare-and-set.
      // Run inside a unit of work, the row stays locked until commit, so the read below sees exactly our write.
      const { count } = await db.document.updateMany({
        where: { id, ...(expectedVersion === undefined ? {} : { version: expectedVersion }) },
        data: { ...data, updatedById: editorId, version: { increment: 1 } },
      });
      return count === 0 ? null : toRecordOrNull(await db.document.findUnique({ where: { id }, include }));
    },
    delete: async (id) => {
      await db.document.delete({ where: { id } });
    },
    upsertShare: async (documentId, userId, role) => {
      await db.documentShare.upsert({
        where: { documentId_userId: { documentId, userId } },
        update: { role },
        create: { documentId, userId, role },
      });
    },
    removeShare: async (documentId, userId) => {
      await db.documentShare.deleteMany({ where: { documentId, userId } });
    },
  };

  const versions: VersionRepository = {
    create: async (data) => {
      await db.documentVersion.create({ data });
    },
    latest: (documentId) =>
      db.documentVersion.findFirst({ where: { documentId }, select: versionSummary, orderBy: { createdAt: "desc" } }),
    list: (documentId, limit) =>
      db.documentVersion.findMany({ where: { documentId }, select: versionSummary, orderBy: { createdAt: "desc" }, take: limit }),
    find: (documentId, versionId) =>
      db.documentVersion.findFirst({ where: { id: versionId, documentId }, select: { ...versionSummary, content: true } }),
  };

  const users: UserRepository = {
    findByEmail: (email) => db.user.findUnique({ where: { email }, select: userSelect }),
  };

  return { docs, versions, users };
}

export const prismaRepositories = createPrismaRepositories(prisma);

/** Unit of work backed by an interactive Prisma transaction. */
export const prismaUnitOfWork: UnitOfWork = (work) =>
  prisma.$transaction((tx) => {
    const { docs, versions } = createPrismaRepositories(tx);
    return work({ docs, versions });
  });
