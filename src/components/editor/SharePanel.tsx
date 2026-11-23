"use client";

import { useState } from "react";
import type { ShareRole } from "@/lib/access/policy";
import { api } from "@/lib/apiClient";
import type { ShareRecord, UserSummary } from "@/lib/documents/types";

interface Props {
  documentId: string;
  owner: UserSummary;
  initialShares: ShareRecord[];
  canManage: boolean;
}

export function SharePanel({ documentId, owner, initialShares, canManage }: Props) {
  const [shares, setShares] = useState(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("EDITOR");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function mutate(request: () => Promise<{ shares: ShareRecord[] }>) {
    setBusy(true);
    setError(null);
    try {
      setShares((await request()).shares);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onShare(e: React.FormEvent) {
    e.preventDefault();
    const ok = await mutate(() =>
      api(`/api/documents/${documentId}/shares`, { method: "POST", body: JSON.stringify({ email, role }) }),
    );
    if (ok) setEmail("");
  }

  const base = `/api/documents/${documentId}/shares`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
      <h2 className="mb-3 font-semibold">People with access</h2>
      <ul className="mb-3 space-y-2">
        <li className="flex justify-between gap-2">
          <span className="truncate">{owner.name}</span>
          <span className="text-gray-500">Owner</span>
        </li>
        {shares.map((s) => (
          <li key={s.userId} className="flex items-center justify-between gap-2">
            <span className="truncate" title={s.user.email}>
              {s.user.name}
            </span>
            {canManage ? (
              <span className="flex items-center gap-1">
                <select
                  value={s.role}
                  disabled={busy}
                  aria-label={`Role for ${s.user.name}`}
                  onChange={(e) =>
                    mutate(() => api(base, { method: "POST", body: JSON.stringify({ email: s.user.email, role: e.target.value }) }))
                  }
                  className="rounded border border-gray-300 px-1 py-0.5"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  disabled={busy}
                  title="Remove access"
                  onClick={() => mutate(() => api(`${base}/${s.userId}`, { method: "DELETE" }))}
                  className="rounded px-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700"
                >
                  ✕
                </button>
              </span>
            ) : (
              <span className="text-gray-500">{s.role === "EDITOR" ? "Editor" : "Viewer"}</span>
            )}
          </li>
        ))}
      </ul>
      {canManage ? (
        <form onSubmit={onShare} className="space-y-2 border-t border-gray-200 pt-3">
          <label className="block text-xs font-medium text-gray-600" htmlFor="share-email">
            Share with (email)
          </label>
          <input
            id="share-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="bob@ajaia.test"
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ShareRole)}
              className="rounded border border-gray-300 px-1 py-1"
              aria-label="Role"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button disabled={busy} className="flex-1 rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              Share
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-gray-200 pt-3 text-xs text-gray-500">Only the owner can change sharing.</p>
      )}
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
