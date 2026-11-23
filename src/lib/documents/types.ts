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
  createdAt: Date;
  updatedAt: Date;
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
  update(id: string, data: { title?: string; content?: string }): Promise<DocumentRecord>;
  delete(id: string): Promise<void>;
  upsertShare(documentId: string, userId: string, role: ShareRole): Promise<void>;
  removeShare(documentId: string, userId: string): Promise<void>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserSummary | null>;
}
