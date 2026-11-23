import type { SaveStatus } from "@/lib/useAutosave";

interface Saver {
  status: SaveStatus;
  error: string | null;
  flush: () => Promise<void>;
}

/** Combines several autosave channels into one status label (worst state wins). */
export function SaveIndicator({ statuses, readOnly }: { statuses: Saver[]; readOnly: boolean }) {
  if (readOnly) return <span className="text-sm text-gray-500">Read only</span>;
  const failed = statuses.find((s) => s.status === "error");
  if (failed) {
    return (
      <span className="text-sm text-red-600">
        Not saved: {failed.error}{" "}
        <button className="underline" onClick={() => statuses.forEach((s) => void s.flush())}>
          Retry
        </button>
      </span>
    );
  }
  if (statuses.some((s) => s.status === "saving")) return <span className="text-sm text-gray-500">Saving...</span>;
  if (statuses.some((s) => s.status === "pending")) return <span className="text-sm text-gray-500">Unsaved changes</span>;
  return <span className="text-sm text-green-700">All changes saved</span>;
}
