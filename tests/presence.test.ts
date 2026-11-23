import { beforeEach, describe, expect, it } from "vitest";
import { DocumentService } from "@/lib/documents/service";
import type { UserSummary } from "@/lib/documents/types";
import { NotFoundError } from "@/lib/errors";
import { PRESENCE_WINDOW_MS, PresenceService } from "@/lib/presence/service";
import type { PresenceRepository } from "@/lib/presence/types";
import { createInMemoryRepos } from "./inMemoryRepository";

const users = [
  { id: "alice", email: "alice@ajaia.test", name: "Alice" },
  { id: "bob", email: "bob@ajaia.test", name: "Bob" },
  { id: "carol", email: "carol@ajaia.test", name: "Carol" },
  { id: "dave", email: "dave@ajaia.test", name: "Dave" },
];

/** Test double for the presence port. */
function createInMemoryPresenceRepo(allUsers: UserSummary[]): PresenceRepository {
  const seen = new Map<string, { documentId: string; userId: string; lastSeenAt: Date }>();
  return {
    touch: async (documentId, userId, at) => {
      seen.set(`${documentId}:${userId}`, { documentId, userId, lastSeenAt: at });
    },
    listActive: async (documentId, since) =>
      [...seen.values()]
        .filter((p) => p.documentId === documentId && p.lastSeenAt >= since)
        .map((p) => ({ user: allUsers.find((u) => u.id === p.userId)!, lastSeenAt: p.lastSeenAt })),
  };
}

describe("PresenceService", () => {
  let presence: PresenceService;
  let docId: string;
  let now: Date;

  const advance = (ms: number) => {
    now = new Date(now.getTime() + ms);
  };

  beforeEach(async () => {
    const { docRepo, userRepo } = createInMemoryRepos(users);
    const documents = new DocumentService(docRepo, userRepo);
    now = new Date("2026-01-01T12:00:00Z");
    presence = new PresenceService(createInMemoryPresenceRepo(users), documents, () => now);
    docId = (await documents.create("alice", { title: "Plan" })).id;
    await documents.share("alice", docId, "bob@ajaia.test", "EDITOR");
    await documents.share("alice", docId, "carol@ajaia.test", "VIEWER");
  });

  it("returns viewers seen within the window", async () => {
    await presence.heartbeat("bob", docId);
    advance(PRESENCE_WINDOW_MS - 1000);
    const viewers = await presence.heartbeat("alice", docId);
    expect(viewers.map((v) => v.id)).toEqual(["bob", "alice"]);
  });

  it("excludes viewers whose last heartbeat is older than the window", async () => {
    await presence.heartbeat("bob", docId);
    advance(PRESENCE_WINDOW_MS + 1);
    const viewers = await presence.heartbeat("alice", docId);
    expect(viewers.map((v) => v.id)).toEqual(["alice"]);
  });

  it("hides presence from users without access (404, not 403)", async () => {
    await expect(presence.heartbeat("dave", docId)).rejects.toBeInstanceOf(NotFoundError);
    // A rejected heartbeat must not be recorded.
    expect((await presence.heartbeat("alice", docId)).map((v) => v.id)).toEqual(["alice"]);
  });

  it("flags the current user and lists others first", async () => {
    await presence.heartbeat("alice", docId);
    await presence.heartbeat("carol", docId);
    const viewers = await presence.heartbeat("bob", docId);
    expect(viewers).toEqual([
      { ...users[0], isYou: false },
      { ...users[2], isYou: false },
      { ...users[1], isYou: true },
    ]);
  });
});
