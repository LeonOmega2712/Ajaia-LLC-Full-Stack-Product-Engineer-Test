"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/apiClient";

export function DashboardActions() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ id: string }>) {
    setBusy(true);
    setError(null);
    try {
      const doc = await action();
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    run(() => api("/api/documents/import", { method: "POST", body }));
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          title="Supported: .txt, .md (max 1 MB)"
        >
          Import .txt / .md
        </button>
        <button
          disabled={busy}
          onClick={() => run(() => api("/api/documents", { method: "POST", body: "{}" }))}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          + New document
        </button>
        <input ref={fileInput} type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" hidden onChange={onFile} />
      </div>
      <p className="text-xs text-gray-500">Import creates a new document. Supported: .txt and .md, up to 1 MB.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
