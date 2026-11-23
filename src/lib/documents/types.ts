import type { AccessLevel, ShareRole } from "@/lib/access/policy";

export interface UserSummary {
  id: string;
  email: string;
  name: string;
}

export interface ShareRecord {
  userId: string;
  role: ShareRole;
  user: UserSummary;
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  owner: UserSummary;
  shares: ShareRecord[];
  /** Optimistic-concurrency counter, incremented on every save. */
  version: number;
  updatedBy: UserSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VersionSummary {
  id: string;
  title: string;
  createdAt: Date;
  createdBy: UserSummary | null;
}

export interface VersionRecord extends VersionSummary {
  content: string;
}

export interface DocumentListItem {
  id: string;
  title: string;
  updatedAt: Date;
  owner: UserSummary;
  access: AccessLevel;
}

/** Persistence port. The service depends on this abstraction, not on Prisma. */
export interface DocumentRepository {
  findById(id: string): Promise<DocumentRecord | null>;
  listOwnedBy(userId: string): Promise<DocumentRecord[]>;
  listSharedWith(userId: string): Promise<DocumentRecord[]>;
  create(data: { title: string; content: string; ownerId: string }): Promise<DocumentRecord>;
  /**
   * Applies the change and increments `version`. When `expectedVersion` is given the write is
   * atomic and conditional: it returns null if the stored version no longer matches.
   */
  update(
    id: string,
    data: { title?: string; content?: string },
    options: { editorId: string; expectedVersion?: number },
  ): Promise<DocumentRecord | null>;
  delete(id: string): Promise<void>;
  upsertShare(documentId: string, userId: string, role: ShareRole): Promise<void>;
  removeShare(documentId: string, userId: string): Promise<void>;
}

/** Persistence port for document snapshots (version history). */
export interface VersionRepository {
  create(data: { documentId: string; title: string; content: string; createdById: string }): Promise<void>;
  latest(documentId: string): Promise<VersionSummary | null>;
  list(documentId: string, limit: number): Promise<VersionSummary[]>;
  find(documentId: string, versionId: string): Promise<VersionRecord | null>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserSummary | null>;
}
