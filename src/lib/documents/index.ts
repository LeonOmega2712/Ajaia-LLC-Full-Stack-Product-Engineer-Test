import { prismaDocumentRepository, prismaUserRepository, prismaVersionRepository } from "./prismaRepository";
import { DocumentService } from "./service";

/** Composition root: the only place that wires the service to Prisma. */
export const documentService = new DocumentService(prismaDocumentRepository, prismaUserRepository, prismaVersionRepository);
