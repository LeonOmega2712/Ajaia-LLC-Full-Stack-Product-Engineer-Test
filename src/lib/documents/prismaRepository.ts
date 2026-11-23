import { prisma } from "@/lib/db";
import type { DocumentRecord, DocumentRepository, UserRepository, VersionRepository } from "./types";

const userSelect = { id: true, email: true, name: true } as const;
const include = {
  owner: { select: userSelect },
  updatedBy: { select: userSelect },
  shares: { include: { user: { select: userSelect } }, orderBy: { createdAt: "asc" } },
} as const;

export const prismaDocumentRepository: DocumentRepository = {
  findById: (id) => prisma.document.findUnique({ where: { id }, include }) as Promise<DocumentRecord | null>,
  listOwnedBy: (userId) =>
    prisma.document.findMany({ where: { ownerId: userId }, include, orderBy: { updatedAt: "desc" } }),
  listSharedWith: (userId) =>
    prisma.document.findMany({
      where: { shares: { some: { userId } } },
      include,
      orderBy: { updatedAt: "desc" },
    }),
  create: (data) => prisma.document.create({ data, include }),
  update: async (id, data, { editorId, expectedVersion }) => {
    // updateMany lets us add the version to the WHERE clause: a single atomic compare-and-set.
    const { count } = await prisma.document.updateMany({
      where: { id, ...(expectedVersion === undefined ? {} : { version: expectedVersion }) },
      data: { ...data, updatedById: editorId, version: { increment: 1 } },
    });
    return count === 0 ? null : prisma.document.findUnique({ where: { id }, include });
  },
  delete: async (id) => {
    await prisma.document.delete({ where: { id } });
  },
  upsertShare: async (documentId, userId, role) => {
    await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId, userId } },
      update: { role },
      create: { documentId, userId, role },
    });
  },
  removeShare: async (documentId, userId) => {
    await prisma.documentShare.deleteMany({ where: { documentId, userId } });
  },
};

const versionSummary = { id: true, title: true, createdAt: true, createdBy: { select: userSelect } } as const;

export const prismaVersionRepository: VersionRepository = {
  create: async (data) => {
    await prisma.documentVersion.create({ data });
  },
  latest: (documentId) =>
    prisma.documentVersion.findFirst({ where: { documentId }, select: versionSummary, orderBy: { createdAt: "desc" } }),
  list: (documentId, limit) =>
    prisma.documentVersion.findMany({
      where: { documentId },
      select: versionSummary,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  find: (documentId, versionId) =>
    prisma.documentVersion.findFirst({
      where: { id: versionId, documentId },
      select: { ...versionSummary, content: true },
    }),
};

export const prismaUserRepository: UserRepository = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email }, select: userSelect }),
};
