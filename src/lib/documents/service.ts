import { accessLevel, canEdit, canManage, canRead, type ShareRole } from "@/lib/access/policy";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type { DocumentListItem, DocumentRecord, DocumentRepository, UserRepository } from "./types";

export const DEFAULT_TITLE = "Untitled document";

export interface DocumentView extends DocumentRecord {
  access: ReturnType<typeof accessLevel>;
}

/**
 * Application use cases for documents. Every method receives the acting user id
 * and enforces the access policy before touching persistence.
 */
export class DocumentService {
  constructor(
    private readonly docs: DocumentRepository,
    private readonly users: UserRepository,
  ) {}

  async list(userId: string): Promise<{ owned: DocumentListItem[]; shared: DocumentListItem[] }> {
    const [owned, shared] = await Promise.all([this.docs.listOwnedBy(userId), this.docs.listSharedWith(userId)]);
    const toItem = (d: DocumentRecord): DocumentListItem => ({
      id: d.id,
      title: d.title,
      updatedAt: d.updatedAt,
      owner: d.owner,
      access: accessLevel(d, userId),
    });
    return { owned: owned.map(toItem), shared: shared.map(toItem) };
  }

  async get(userId: string, id: string): Promise<DocumentView> {
    const doc = await this.docs.findById(id);
    // Same error for "missing" and "no access" so ids cannot be probed.
    if (!doc || !canRead(doc, userId)) throw new NotFoundError("Document not found.");
    return { ...doc, access: accessLevel(doc, userId) };
  }

  create(userId: string, input: { title?: string; content?: string }): Promise<DocumentRecord> {
    return this.docs.create({ title: input.title ?? DEFAULT_TITLE, content: input.content ?? "", ownerId: userId });
  }

  async update(userId: string, id: string, input: { title?: string; content?: string }): Promise<DocumentView> {
    const doc = await this.get(userId, id);
    if (!canEdit(doc, userId)) throw new ForbiddenError("You have view-only access to this document.");
    const updated = await this.docs.update(id, input);
    return { ...updated, access: doc.access };
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.requireOwner(userId, id);
    await this.docs.delete(id);
  }

  async share(userId: string, id: string, email: string, role: ShareRole): Promise<DocumentView> {
    const doc = await this.requireOwner(userId, id);
    const target = await this.users.findByEmail(email);
    if (!target) throw new ValidationError(`No user with email ${email}. Try one of the demo accounts.`);
    if (target.id === doc.ownerId) throw new ValidationError("You already own this document.");
    await this.docs.upsertShare(id, target.id, role);
    return this.get(userId, id);
  }

  async unshare(userId: string, id: string, targetUserId: string): Promise<DocumentView> {
    await this.requireOwner(userId, id);
    await this.docs.removeShare(id, targetUserId);
    return this.get(userId, id);
  }

  private async requireOwner(userId: string, id: string): Promise<DocumentView> {
    const doc = await this.get(userId, id);
    if (!canManage(doc, userId)) throw new ForbiddenError("Only the owner can do that.");
    return doc;
  }
}
