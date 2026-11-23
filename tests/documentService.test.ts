import { beforeEach, describe, expect, it } from "vitest";
import { DocumentService } from "@/lib/documents/service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { createInMemoryRepos } from "./inMemoryRepository";

const users = [
  { id: "alice", email: "alice@ajaia.test", name: "Alice" },
  { id: "bob", email: "bob@ajaia.test", name: "Bob" },
  { id: "carol", email: "carol@ajaia.test", name: "Carol" },
];

describe("DocumentService sharing flow", () => {
  let service: DocumentService;
  let docId: string;

  beforeEach(async () => {
    const { docRepo, userRepo, versionRepo } = createInMemoryRepos(users);
    service = new DocumentService(docRepo, userRepo, versionRepo);
    docId = (await service.create("alice", { title: "Plan", content: "<p>v1</p>" })).id;
  });

  it("hides documents from users without access (404, not 403)", async () => {
    await expect(service.get("bob", docId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.update("bob", docId, { content: "<p>x</p>", baseVersion: 0 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("separates owned and shared documents in the list", async () => {
    await service.share("alice", docId, "bob@ajaia.test", "EDITOR");
    expect((await service.list("alice")).owned.map((d) => d.id)).toEqual([docId]);
    const bob = await service.list("bob");
    expect(bob.owned).toEqual([]);
    expect(bob.shared).toMatchObject([{ id: docId, access: "EDITOR" }]);
  });

  it("lets an editor change content and title, but not sharing or deletion", async () => {
    await service.share("alice", docId, "bob@ajaia.test", "EDITOR");
    const updated = await service.update("bob", docId, { title: "Plan v2", content: "<p>v2</p>", baseVersion: 0 });
    expect(updated).toMatchObject({ title: "Plan v2", content: "<p>v2</p>" });
    await expect(service.share("bob", docId, "carol@ajaia.test", "EDITOR")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.delete("bob", docId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("keeps viewers read-only", async () => {
    await service.share("alice", docId, "carol@ajaia.test", "VIEWER");
    expect((await service.get("carol", docId)).access).toBe("VIEWER");
    await expect(service.update("carol", docId, { content: "<p>hack</p>", baseVersion: 0 })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("revokes access when a share is removed", async () => {
    await service.share("alice", docId, "bob@ajaia.test", "EDITOR");
    await service.unshare("alice", docId, "bob");
    await expect(service.get("bob", docId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects sharing with unknown users or the owner", async () => {
    await expect(service.share("alice", docId, "nobody@ajaia.test", "EDITOR")).rejects.toBeInstanceOf(ValidationError);
    await expect(service.share("alice", docId, "alice@ajaia.test", "EDITOR")).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates the role when sharing twice instead of duplicating", async () => {
    await service.share("alice", docId, "bob@ajaia.test", "EDITOR");
    const doc = await service.share("alice", docId, "bob@ajaia.test", "VIEWER");
    expect(doc.shares).toMatchObject([{ userId: "bob", role: "VIEWER" }]);
  });
});
