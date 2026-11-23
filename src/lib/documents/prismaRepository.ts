import { prisma } from "@/lib/db";
import type { DocumentRecord, DocumentRepository, UserRepository } from "./types";

const userSelect = { id: true, email: true, name: true } as const;
const include = {
  owner: { select: userSelect },
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
  update: (id, data) => prisma.document.update({ where: { id }, data, include }),
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

export const prismaUserRepository: UserRepository = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email }, select: userSelect }),
};
