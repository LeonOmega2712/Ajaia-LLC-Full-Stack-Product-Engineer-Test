import type { UserSummary } from "@/lib/documents/types";

export interface ConflictInfo {
  message: string;
  version: number;
  updatedAt: string;
  updatedBy: UserSummary | null;
}

interface Props {
  conflict: ConflictInfo;
  onKeepMine: () => void;
  onLoadLatest: () => void;
}

/** Shown when a save is rejected because someone else saved first. Nothing is overwritten silently. */
export function ConflictBanner({ conflict, onKeepMine, onLoadLatest }: Props) {
  const when = new Date(conflict.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <div role="alert" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 print:hidden">
      <p className="font-medium">
        {conflict.message} <span className="font-normal">(saved at {when})</span>
      </p>
      <p className="mt-1">Your latest changes are not saved yet. Choose which version to keep:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={onLoadLatest} className="rounded border border-amber-400 bg-white px-3 py-1 hover:bg-amber-100">
          Load their version (discard mine)
        </button>
        <button onClick={onKeepMine} className="rounded bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700">
          Keep mine (overwrite)
        </button>
      </div>
      <p className="mt-2 text-xs text-amber-800">Either way, the previous state stays available in Version history.</p>
    </div>
  );
}
