/**
 * Pure access-control rules. No I/O here so the rules are trivially testable
 * and reused by every entry point (API routes, server components).
 */
export type ShareRole = "VIEWER" | "EDITOR";

export interface AccessSubject {
  ownerId: string;
  shares: ReadonlyArray<{ userId: string; role: ShareRole }>;
}

export type AccessLevel = "OWNER" | ShareRole | "NONE";

export function accessLevel(doc: AccessSubject, userId: string): AccessLevel {
  if (doc.ownerId === userId) return "OWNER";
  return doc.shares.find((s) => s.userId === userId)?.role ?? "NONE";
}

export const canRead = (doc: AccessSubject, userId: string) => accessLevel(doc, userId) !== "NONE";

export const canEdit = (doc: AccessSubject, userId: string) => {
  const level = accessLevel(doc, userId);
  return level === "OWNER" || level === "EDITOR";
};

/** Only the owner can delete the document or change who has access. */
export const canManage = (doc: AccessSubject, userId: string) => accessLevel(doc, userId) === "OWNER";
