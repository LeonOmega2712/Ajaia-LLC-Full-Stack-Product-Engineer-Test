"use client";

import type { Viewer } from "@/lib/presence/types";
import { usePresence } from "@/lib/usePresence";

const MAX_AVATARS = 4;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

const firstName = (name: string) => name.split(/\s+/)[0] || name;

function summary(others: Viewer[]): string {
  if (others.length === 1) return `${firstName(others[0]!.name)} is also here`;
  return `${others.length} others viewing`;
}

/** Shows who else has this document open. Renders nothing when the current user is alone. */
export function PresenceIndicator({ documentId }: { documentId: string }) {
  const others = usePresence(documentId).filter((v) => !v.isYou);
  if (others.length === 0) return null;

  const shown = others.slice(0, MAX_AVATARS);
  const hidden = others.length - shown.length;

  return (
    <div className="flex items-center gap-2 print:hidden" aria-live="polite">
      <div className="flex -space-x-1.5">
        {shown.map((v) => (
          <span
            key={v.id}
            title={`${v.name} (${v.email})`}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-800 ring-2 ring-white"
          >
            {initials(v.name)}
          </span>
        ))}
        {hidden > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700 ring-2 ring-white">
            +{hidden}
          </span>
        )}
      </div>
      <span className="text-xs text-gray-500">{summary(others)}</span>
    </div>
  );
}
