import { describe, expect, it } from "vitest";
import { accessLevel, canEdit, canManage, canRead } from "@/lib/access/policy";

const doc = {
  ownerId: "alice",
  shares: [
    { userId: "bob", role: "EDITOR" as const },
    { userId: "carol", role: "VIEWER" as const },
  ],
};

describe("access policy", () => {
  it.each([
    ["alice", "OWNER", true, true, true],
    ["bob", "EDITOR", true, true, false],
    ["carol", "VIEWER", true, false, false],
    ["mallory", "NONE", false, false, false],
  ] as const)("%s -> %s", (user, level, read, edit, manage) => {
    expect(accessLevel(doc, user)).toBe(level);
    expect(canRead(doc, user)).toBe(read);
    expect(canEdit(doc, user)).toBe(edit);
    expect(canManage(doc, user)).toBe(manage);
  });
});
