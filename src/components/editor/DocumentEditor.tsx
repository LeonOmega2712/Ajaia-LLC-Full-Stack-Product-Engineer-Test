"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type { AccessLevel } from "@/lib/access/policy";
import { api, ApiError } from "@/lib/apiClient";
import type { ShareRecord, UserSummary } from "@/lib/documents/types";
import { useAutosave } from "@/lib/useAutosave";
import { AccessBadge } from "../AccessBadge";
import { ConflictBanner, type ConflictInfo } from "./ConflictBanner";
import { ExportMenu } from "./ExportMenu";
import { PresenceIndicator } from "./PresenceIndicator";
import { SaveIndicator } from "./SaveIndicator";
import { SharePanel } from "./SharePanel";
import { Toolbar } from "./Toolbar";
import { VersionHistory } from "./VersionHistory";

interface Props {
  id: string;
  initialTitle: string;
  initialContent: string;
  initialVersion: number;
  access: AccessLevel;
  owner: UserSummary;
  initialShares: ShareRecord[];
}

type Patch = { title?: string; content?: string };
const mergePatch = (a: Patch, b: Patch): Patch => ({ ...a, ...b });

export function DocumentEditor({ id, initialTitle, initialContent, initialVersion, access, owner, initialShares }: Props) {
  const router = useRouter();
  const editable = access === "OWNER" || access === "EDITOR";
  const isOwner = access === "OWNER";
  const [title, setTitle] = useState(initialTitle);

  // Version the local copy is based on; sent with every save so the server can detect conflicts.
  const versionRef = useRef(initialVersion);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const save = useCallback(
    async (patch: Patch) => {
      try {
        const res = await api<{ version: number }>(`/api/documents/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...patch, baseVersion: versionRef.current }),
        });
        versionRef.current = res.version;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const details = e.data.details as { current?: Omit<ConflictInfo, "message"> } | undefined;
          if (details?.current) setConflict({ message: e.message, ...details.current });
        }
        throw e;
      }
    },
    [id],
  );
  // One serialized channel for title and content: concurrent saves would race on the version.
  const autosave = useAutosave<Patch>(save, { merge: mergePatch });

  const schedule = (patch: Patch) => {
    autosave.schedule(patch);
    if (conflict) autosave.hold(); // wait for the user's decision instead of retrying into the same 409
  };

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Start writing..." })],
    content: initialContent,
    editable,
    immediatelyRender: false,
    editorProps: { attributes: { class: "doc-content" } },
    onUpdate: ({ editor: e }) => schedule({ content: e.getHTML() }),
  });

  function keepMine() {
    if (!conflict) return;
    versionRef.current = conflict.version;
    setConflict(null);
    void autosave.flush();
  }

  function loadLatest() {
    autosave.discard();
    window.location.reload();
  }

  async function restore(versionId: string) {
    await autosave.flush();
    const doc = await api<{ title: string; content: string; version: number }>(
      `/api/documents/${id}/versions/${versionId}/restore`,
      { method: "POST" },
    );
    versionRef.current = doc.version;
    setTitle(doc.title);
    editor?.commands.setContent(doc.content, { emitUpdate: false });
  }

  function onTitleChange(value: string) {
    setTitle(value);
    if (value.trim()) schedule({ title: value });
  }

  async function onDelete() {
    if (!window.confirm("Delete this document permanently?")) return;
    setDeleteError(null);
    try {
      await api(`/api/documents/${id}`, { method: "DELETE" });
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete the document.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const titleInvalid = !title.trim();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px] print:block">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-3 print:hidden">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800" onClick={() => void autosave.flush()}>
            ← Documents
          </Link>
          <AccessBadge access={access} />
          <PresenceIndicator documentId={id} />
          <div className="ml-auto flex items-center gap-3">
            <ExportMenu editor={editor} title={title} />
            <SaveIndicator statuses={[autosave]} readOnly={!editable} conflict={conflict !== null} />
          </div>
        </div>
        {conflict && <ConflictBanner conflict={conflict} onKeepMine={keepMine} onLoadLatest={loadLatest} />}
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={() => void autosave.flush()}
          readOnly={!editable}
          maxLength={200}
          aria-label="Document title"
          className={`mb-3 w-full rounded border bg-transparent px-2 py-1 print:px-0 text-2xl font-semibold outline-none focus:border-blue-400 ${titleInvalid ? "border-red-400" : "border-transparent hover:border-gray-300"}`}
        />
        {titleInvalid && <p className="mb-2 print:hidden text-sm text-red-600">Title cannot be empty; the last valid title is kept.</p>}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm print:border-0 print:shadow-none">
          {editor && editable && <Toolbar editor={editor} />}
          {!editable && (
            <p className="border-b border-gray-200 bg-amber-50 print:hidden px-4 py-2 text-sm text-amber-800">
              You have view-only access. Ask {owner.name} for edit access.
            </p>
          )}
          <div className="px-8 py-6 print:p-0">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      <aside className="space-y-4 print:hidden">
        <SharePanel documentId={id} owner={owner} initialShares={initialShares} canManage={isOwner} />
        <VersionHistory documentId={id} canRestore={editable} onRestore={restore} />
        {isOwner && (
          <button onClick={onDelete} className="w-full rounded border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50">
            Delete document
          </button>
        )}
        {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
      </aside>
    </div>
  );
}
