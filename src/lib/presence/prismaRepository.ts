import { prisma } from "@/lib/db";
import type { PresenceRepository } from "./types";

export const prismaPresenceRepository: PresenceRepository = {
  touch: async (documentId, userId, at) => {
    await prisma.documentPresence.upsert({
      where: { documentId_userId: { documentId, userId } },
      update: { lastSeenAt: at },
      create: { documentId, userId, lastSeenAt: at },
    });
  },
  listActive: (documentId, since) =>
    prisma.documentPresence.findMany({
      where: { documentId, lastSeenAt: { gte: since } },
      select: { lastSeenAt: true, user: { select: { id: true, email: true, name: true } } },
    }),
};
