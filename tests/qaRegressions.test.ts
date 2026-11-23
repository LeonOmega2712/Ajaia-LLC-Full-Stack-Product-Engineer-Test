import { describe, expect, it } from "vitest";
import { loginUrl, safeNextPath } from "@/lib/auth/nextPath";
import { DocumentService } from "@/lib/documents/service";
import { ValidationError } from "@/lib/errors";
import { htmlToMarkdown } from "@/lib/export/markdown";
import { readJson } from "@/lib/http/handler";
import { modifierLabel } from "@/lib/shortcuts";
import { createInMemoryRepos } from "./inMemoryRepository";

/** Regression tests for the bugs found in manual QA on production (see docs/WALKTHROUGH.md). */
describe("QA regressions", () => {
  it("bug 1: 'Keep mine' after a conflict keeps the other person's version in history, even inside the throttle window", async () => {
    const users = [
      { id: "alice", email: "alice@ajaia.test", name: "Alice" },
      { id: "bob", email: "bob@ajaia.test", name: "Bob" },
    ];
    const { docRepo, userRepo, versionRepo } = createInMemoryRepos(users);
    const service = new DocumentService(docRepo, userRepo, versionRepo);
    const { id } = await service.create("alice", { title: "Plan", content: "<p>v0</p>" });
    await service.share("alice", id, "bob@ajaia.test", "EDITOR");

    await service.update("alice", id, { content: "<p>alice edit</p>", baseVersion: 0 }); // snapshot of v0 (throttle starts)
    await expect(service.update("bob", id, { content: "<p>bob</p>", baseVersion: 0 })).rejects.toMatchObject({ status: 409 });
    await service.update("bob", id, { content: "<p>bob</p>", baseVersion: 1 }); // "Keep mine"

    const history = await service.listVersions("alice", id);
    const contents = await Promise.all(history.map((v) => service.getVersion("alice", id, v.id).then((r) => r.content)));
    expect(contents).toContain("<p>alice edit</p>");
  });

  it("bug 2: malformed JSON is rejected with a 400 instead of being treated as {}", async () => {
    const bad = new Request("http://x", { method: "POST", body: "{not json" });
    await expect(readJson(bad)).rejects.toBeInstanceOf(ValidationError);
    expect(await readJson(new Request("http://x", { method: "POST", body: "" }))).toEqual({});
    expect(await readJson(new Request("http://x", { method: "POST", body: '{"a":1}' }))).toEqual({ a: 1 });
  });

  it("nit 3: shortcut labels use the platform's modifier key", () => {
    expect(modifierLabel(true)).toBe("⌘");
    expect(modifierLabel(false)).toBe("Ctrl");
  });

  it("nit 4: exported lists are tight, with no whitespace-only lines", () => {
    const md = htmlToMarkdown("<ul><li><p>item a</p></li><li><p>item b</p></li></ul><ol><li><p>one</p></li><li><p>two</p></li></ol>");
    expect(md).toBe("- item a\n- item b\n\n1. one\n2. two\n");
  });

  it("nit 5: login returns to the page that required it, but only to same-origin paths", () => {
    expect(safeNextPath("/documents/abc")).toBe("/documents/abc");
    expect(safeNextPath("https://evil.test")).toBe("/");
    expect(safeNextPath("//evil.test")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(loginUrl("/documents/abc")).toBe("/login?next=%2Fdocuments%2Fabc");
    expect(loginUrl("/")).toBe("/login");
  });
});
