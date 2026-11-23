import { describe, expect, it } from "vitest";
import { DocumentService } from "@/lib/documents/service";
import { ConflictError, ValidationError } from "@/lib/errors";
import { withErrors } from "@/lib/http/handler";
import { createInMemoryRepos } from "./inMemoryRepository";

const users = [
  { id: "alice", email: "alice@ajaia.test", name: "Alice" },
  { id: "bob", email: "bob@ajaia.test", name: "Bob" },
];

function setup() {
  const repos = createInMemoryRepos(users);
  const service = new DocumentService(repos.docRepo, repos.userRepo, repos.versionRepo, () => new Date(), repos.unitOfWork);
  return { ...repos, service };
}

/** Fixes from the independent SOLID / good-practices audit (see docs/WALKTHROUGH.md). */
describe("SOLID audit fixes", () => {
  it("#1: a save that loses the race rolls back its snapshot too (no orphan history entry)", async () => {
    const { service, docRepo } = setup();
    const { id } = await service.create("alice", { title: "Plan", content: "<p>v0</p>" });
    const realUpdate = docRepo.update;
    docRepo.update = async () => null; // another save committed between our read and our conditional write
    await expect(service.update("alice", id, { content: "<p>mine</p>", baseVersion: 0 })).rejects.toBeInstanceOf(ConflictError);
    docRepo.update = realUpdate;
    expect(await service.listVersions("alice", id)).toEqual([]);
  });

  it("#1: restore snapshots and writes atomically", async () => {
    const { service, docRepo } = setup();
    const { id } = await service.create("alice", { title: "Plan", content: "<p>v0</p>" });
    await service.update("alice", id, { content: "<p>v1</p>", baseVersion: 0 }); // snapshot of v0
    const [v0] = await service.listVersions("alice", id);
    docRepo.update = async () => {
      throw new Error("db down");
    };
    await expect(service.restoreVersion("alice", id, v0.id)).rejects.toThrow("db down");
    expect(await service.listVersions("alice", id)).toHaveLength(1); // the pre-restore snapshot was rolled back
  });

  it("#3: error details are nested and cannot overwrite the message", async () => {
    const handler = withErrors(async () => {
      throw new ConflictError("Bob changed this document.", { error: "spoofed", current: { version: 3 } });
    });
    const res = await handler(new Request("http://x"), {});
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Bob changed this document.", details: { error: "spoofed", current: { version: 3 } } });
  });

  it("#3: errors without details keep a flat body", async () => {
    const res = await withErrors(async () => {
      throw new ValidationError("Nope.");
    })(new Request("http://x"), {});
    expect(await res.json()).toEqual({ error: "Nope." });
  });

  it("#6: sharing with an unknown email gives a generic message that does not echo the address", async () => {
    const { service } = setup();
    const { id } = await service.create("alice", {});
    const attempt = service.share("alice", id, "ghost@example.com", "VIEWER");
    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await expect(attempt).rejects.not.toThrow(/ghost@example\.com|demo/i);
  });
});
