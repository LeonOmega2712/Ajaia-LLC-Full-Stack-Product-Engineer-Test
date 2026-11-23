import type { UserSummary } from "@/lib/documents/types";

export interface PresenceRecord {
  user: UserSummary;
  lastSeenAt: Date;
}

export interface Viewer extends UserSummary {
  isYou: boolean;
}

/**
 * Persistence port for presence heartbeats. State lives in the database because
 * serverless instances share no memory.
 */
export interface PresenceRepository {
  touch(documentId: string, userId: string, at: Date): Promise<void>;
  listActive(documentId: string, since: Date): Promise<PresenceRecord[]>;
}

/** The slice of DocumentService presence needs: a read that enforces access (NotFoundError otherwise). */
export interface DocumentReader {
  get(userId: string, id: string): Promise<unknown>;
}
