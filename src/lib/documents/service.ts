import { accessLevel, canEdit, canManage, canRead, type ShareRole } from "@/lib/access/policy";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type {
  DocumentListItem,
  DocumentRecord,
  DocumentRepository,
  UserRepository,
  VersionRecord,
  VersionRepository,
  VersionSummary,
  UnitOfWork,
} from "./types";

export const DEFAULT_TITLE = "Untitled document";
/** Autosave fires every second; history keeps at most one snapshot per window. */
export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
export const VERSION_LIST_LIMIT = 50;

export interface UpdateInput {
  title?: string;
  content?: string;
  /** Version the client's edit is based on. A mismatch means someone else saved first. */
  baseVersion: number;
}

export interface DocumentView extends DocumentRecord {
  access: ReturnType<typeof accessLevel>;
}

/** Thrown inside a unit of work when the conditional write loses a race, so the snapshot rolls back too. */
class StaleWrite extends Error {}

/**
 * Application use cases for documents. Every method receives the acting user id
 * and enforces the access policy before touching persistence.
 */
export class DocumentService {
  constructor(
    private readonly docs: DocumentRepository,
    private readonly users: UserRepository,
    private readonly versions: VersionRepository,
    private readonly now: () => Date = () => new Date(),
    /** Defaults to running without a transaction (fine for in-memory tests); production injects Prisma's. */
    private readonly inTransaction: UnitOfWork = (work) => work({ docs, versions }),
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

  async update(userId: string, id: string, input: UpdateInput): Promise<DocumentView> {
    const doc = await this.requireEditor(userId, id);
    if (doc.version !== input.baseVersion) throw this.conflict(doc);
    const { baseVersion, ...changes } = input;
    // Overwriting another person's save always keeps their state in history (e.g. "Keep mine" after a conflict);
    // the 5-minute throttle only applies to a user's own consecutive autosaves.
    const overwritesSomeoneElse = doc.updatedBy !== null && doc.updatedBy.id !== userId;
    try {
      // Snapshot and conditional write commit together: a lost race leaves no orphan history entry.
      const updated = await this.inTransaction(async ({ docs, versions }) => {
        await (overwritesSomeoneElse && doc.content ? this.snapshot(versions, doc, userId) : this.snapshotIfDue(versions, doc, userId));
        const result = await docs.update(id, changes, { editorId: userId, expectedVersion: baseVersion });
        // Null means another save won the race between our read and our write.
        if (!result) throw new StaleWrite();
        return result;
      });
      return { ...updated, access: doc.access };
    } catch (err) {
      if (err instanceof StaleWrite) throw this.conflict(await this.get(userId, id));
      throw err;
    }
  }

  async listVersions(userId: string, id: string): Promise<VersionSummary[]> {
    await this.get(userId, id);
    return this.versions.list(id, VERSION_LIST_LIMIT);
  }

  async getVersion(userId: string, id: string, versionId: string): Promise<VersionRecord> {
    await this.get(userId, id);
    const version = await this.versions.find(id, versionId);
    if (!version) throw new NotFoundError("Version not found.");
    return version;
  }

  /** Restores a snapshot. The current state is snapshotted first, so a restore can itself be undone. */
  async restoreVersion(userId: string, id: string, versionId: string): Promise<DocumentView> {
    const doc = await this.requireEditor(userId, id);
    const version = await this.getVersion(userId, id, versionId);
    // Restore is an explicit user action, so it overwrites whatever is current (no expectedVersion);
    // the current state is snapshotted in the same transaction, so nothing is lost.
    const updated = await this.inTransaction(async ({ docs, versions }) => {
      await this.snapshot(versions, doc, userId);
      return docs.update(id, { title: version.title, content: version.content }, { editorId: userId });
    });
    if (!updated) throw new NotFoundError("Document not found.");
    return { ...updated, access: doc.access };
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.requireOwner(userId, id);
    await this.docs.delete(id);
  }

  async share(userId: string, id: string, email: string, role: ShareRole): Promise<DocumentView> {
    const doc = await this.requireOwner(userId, id);
    const target = await this.users.findByEmail(email);
    if (!target) throw new ValidationError("Could not share with that email. Check the address and try again.");
    if (target.id === doc.ownerId) throw new ValidationError("You already own this document.");
    await this.docs.upsertShare(id, target.id, role);
    return this.get(userId, id);
  }

  async unshare(userId: string, id: string, targetUserId: string): Promise<DocumentView> {
    await this.requireOwner(userId, id);
    await this.docs.removeShare(id, targetUserId);
    return this.get(userId, id);
  }

  private async requireEditor(userId: string, id: string): Promise<DocumentView> {
    const doc = await this.get(userId, id);
    if (!canEdit(doc, userId)) throw new ForbiddenError("You have view-only access to this document.");
    return doc;
  }

  private conflict(current: DocumentRecord): ConflictError {
    const who = current.updatedBy?.name ?? "Someone else";
    return new ConflictError(`${who} changed this document after you loaded it.`, {
      current: { version: current.version, updatedAt: current.updatedAt, updatedBy: current.updatedBy },
    });
  }

  /** Keeps the pre-edit state, throttled so autosave does not flood the history. */
  private async snapshotIfDue(versions: VersionRepository, doc: DocumentRecord, userId: string): Promise<void> {
    if (!doc.content) return; // an empty body is not worth a history entry
    const latest = await versions.latest(doc.id);
    if (latest && this.now().getTime() - latest.createdAt.getTime() < SNAPSHOT_INTERVAL_MS) return;
    await this.snapshot(versions, doc, userId);
  }

  private snapshot(versions: VersionRepository, doc: DocumentRecord, userId: string): Promise<void> {
    return versions.create({ documentId: doc.id, title: doc.title, content: doc.content, createdById: userId });
  }

  private async requireOwner(userId: string, id: string): Promise<DocumentView> {
    const doc = await this.get(userId, id);
    if (!canManage(doc, userId)) throw new ForbiddenError("Only the owner can do that.");
    return doc;
  }
}
