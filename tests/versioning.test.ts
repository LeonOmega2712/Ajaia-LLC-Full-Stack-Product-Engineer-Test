import { beforeEach, describe, expect, it } from "vitest";
import { DocumentService, SNAPSHOT_INTERVAL_MS } from "@/lib/documents/service";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { createInMemoryRepos } from "./inMemoryRepository";

const users = [
  { id: "alice", email: "alice@ajaia.test", name: "Alice" },
  { id: "bob", email: "bob@ajaia.test", name: "Bob" },
  { id: "carol", email: "carol@ajaia.test", name: "Carol" },
];

describe("save conflicts and version history", () => {
  let clock: number;
  let service: DocumentService;
  let docId: string;
  const advance = (ms: number) => (clock += ms);

  beforeEach(async () => {
    clock = Date.UTC(2026, 10, 22, 20);
    const now = () => new Date(clock);
    const { docRepo, userRepo, versionRepo } = createInMemoryRepos(users, now);
    service = new DocumentService(docRepo, userRepo, versionRepo, now);
    docId = (await service.create("alice", { title: "Plan", content: "<p>v0</p>" })).id;
    await service.share("alice", docId, "bob@ajaia.test", "EDITOR");
    await service.share("alice", docId, "carol@ajaia.test", "VIEWER");
  });

  it("increments the version on each save", async () => {
    const first = await service.update("alice", docId, { content: "<p>v1</p>", baseVersion: 0 });
    const second = await service.update("alice", docId, { content: "<p>v2</p>", baseVersion: first.version });
    expect([first.version, second.version]).toEqual([1, 2]);
  });

  it("rejects a stale save with a 409 naming who changed it, and keeps their content", async () => {
    await service.update("bob", docId, { content: "<p>bob</p>", baseVersion: 0 });
    const stale = service.update("alice", docId, { content: "<p>alice</p>", baseVersion: 0 });
    await expect(stale).rejects.toBeInstanceOf(ConflictError);
    await expect(stale).rejects.toMatchObject({ status: 409, message: expect.stringContaining("Bob"), details: { current: { version: 1 } } });
    expect((await service.get("alice", docId)).content).toBe("<p>bob</p>");
  });

  it("lets the user overwrite deliberately by re-sending with the current version", async () => {
    await service.update("bob", docId, { content: "<p>bob</p>", baseVersion: 0 });
    const doc = await service.update("alice", docId, { content: "<p>alice</p>", baseVersion: 1 });
    expect(doc.content).toBe("<p>alice</p>");
  });

  it("snapshots the previous state at most once per interval", async () => {
    let v = 0;
    for (const text of ["a", "b", "c"]) v = (await service.update("alice", docId, { content: `<p>${text}</p>`, baseVersion: v })).version;
    expect(await service.listVersions("alice", docId)).toHaveLength(1);
    advance(SNAPSHOT_INTERVAL_MS + 1);
    await service.update("alice", docId, { content: "<p>d</p>", baseVersion: v });
    const history = await service.listVersions("alice", docId);
    expect(history).toHaveLength(2);
    expect((await service.getVersion("alice", docId, history[0].id)).content).toBe("<p>c</p>");
  });

  it("restores a version and snapshots the current state first so the restore is undoable", async () => {
    await service.update("alice", docId, { title: "Plan v2", content: "<p>new</p>", baseVersion: 0 });
    const [original] = await service.listVersions("alice", docId);
    advance(1000);
    const restored = await service.restoreVersion("bob", docId, original.id);
    expect(restored).toMatchObject({ title: "Plan", content: "<p>v0</p>", version: 2 });
    const history = await service.listVersions("alice", docId);
    expect(history).toHaveLength(2);
    expect((await service.getVersion("alice", docId, history[0].id)).content).toBe("<p>new</p>");
  });

  it("enforces access: viewers can browse history but not restore; outsiders see nothing", async () => {
    await service.update("alice", docId, { content: "<p>new</p>", baseVersion: 0 });
    const [version] = await service.listVersions("carol", docId);
    await expect(service.restoreVersion("carol", docId, version.id)).rejects.toBeInstanceOf(ForbiddenError);
    await service.unshare("alice", docId, "carol");
    await expect(service.listVersions("carol", docId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getVersion("alice", docId, "missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
