import { prismaRepositories, prismaUnitOfWork } from "./prismaRepository";
import { DocumentService } from "./service";

const { docs, users, versions } = prismaRepositories;

/** Composition root: wires the document service to Prisma. */
export const documentService = new DocumentService(docs, users, versions, () => new Date(), prismaUnitOfWork);
