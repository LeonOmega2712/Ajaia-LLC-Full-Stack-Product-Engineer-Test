import type { DocumentReader, PresenceRepository, Viewer } from "./types";

/** A viewer counts as present if their last heartbeat is newer than this. Clients poll well inside it. */
export const PRESENCE_WINDOW_MS = 30_000;

export class PresenceService {
  constructor(
    private readonly presence: PresenceRepository,
    private readonly documents: DocumentReader,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Records that the user is viewing the document and returns everyone viewing it now, others first. */
  async heartbeat(userId: string, documentId: string): Promise<Viewer[]> {
    // Reuses the document read rules: no access means NotFoundError, exactly like opening the document.
    await this.documents.get(userId, documentId);
    const now = this.now();
    await this.presence.touch(documentId, userId, now);
    const active = await this.presence.listActive(documentId, new Date(now.getTime() - PRESENCE_WINDOW_MS));
    return active
      .map(({ user }) => ({ ...user, isYou: user.id === userId }))
      .sort((a, b) => Number(a.isYou) - Number(b.isYou) || a.name.localeCompare(b.name));
  }
}
