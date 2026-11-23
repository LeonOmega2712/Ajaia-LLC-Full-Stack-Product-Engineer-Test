"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { api } from "@/lib/apiClient";
import type { UserSummary } from "@/lib/documents/types";

interface VersionItem {
  id: string;
  title: string;
  createdAt: string;
  createdBy: UserSummary | null;
}

interface Props {
  documentId: string;
  canRestore: boolean;
  onRestore: (versionId: string) => Promise<void>;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function VersionHistory({ documentId, canRestore, onRestore }: Props) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<VersionItem[] | null>(null);
  const [preview, setPreview] = useState<{ title: string; content: string; createdAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/api/documents/${documentId}/versions`;

  async function attempt(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const load = () => attempt(async () => setVersions((await api<{ versions: VersionItem[] }>(base)).versions));

  function toggle() {
    setOpen(!open);
    if (!open) void load();
  }

  const restore = (v: VersionItem) =>
    attempt(async () => {
      if (!window.confirm(`Restore the version from ${formatTime(v.createdAt)}? The current state is kept in history.`)) return;
      await onRestore(v.id);
      setPreview(null);
      setVersions((await api<{ versions: VersionItem[] }>(base)).versions);
    });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
      <button onClick={toggle} className="flex w-full items-center justify-between font-semibold">
        Version history <span className="text-gray-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-gray-500">Snapshots are taken automatically while editing (at most one every 5 minutes) and before each restore.</p>
          {versions === null && !error && <p className="text-gray-500">Loading...</p>}
          {versions?.length === 0 && <p className="text-gray-500">No earlier versions yet.</p>}
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {versions?.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-gray-50">
                <button
                  className="min-w-0 text-left"
                  disabled={busy}
                  onClick={() => attempt(async () => setPreview(await api(`${base}/${v.id}`)))}
                  title="Preview"
                >
                  <span className="block">{formatTime(v.createdAt)}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {v.title} · {v.createdBy?.name ?? "Unknown"}
                  </span>
                </button>
                {canRestore && (
                  <button disabled={busy} onClick={() => restore(v)} className="shrink-0 rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100">
                    Restore
                  </button>
                )}
              </li>
            ))}
          </ul>
          {error && <p className="mt-2 text-red-600">{error}</p>}
        </div>
      )}
      {preview && <VersionPreview {...preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** Read-only render through the editor schema (never raw innerHTML), so stored HTML cannot inject markup. */
function VersionPreview({ title, content, createdAt, onClose }: { title: string; content: string; createdAt: string; onClose: () => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: "doc-content" } },
  });
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Version preview"
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">Version from {formatTime(createdAt)}</p>
            <h2 className="text-2xl font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100" aria-label="Close preview">
            ✕
          </button>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
