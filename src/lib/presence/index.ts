import { documentService } from "@/lib/documents";
import { prismaPresenceRepository } from "./prismaRepository";
import { PresenceService } from "./service";

/** Composition root: wires presence to Prisma and to the existing document read rules. */
export const presenceService = new PresenceService(prismaPresenceRepository, documentService);
