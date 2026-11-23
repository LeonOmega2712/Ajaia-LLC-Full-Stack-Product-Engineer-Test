"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import type { Viewer } from "@/lib/presence/types";

export const PRESENCE_POLL_MS = 10_000;

/**
 * Sends a presence heartbeat now and every `PRESENCE_POLL_MS`, returning who is viewing
 * the document. Polling pauses while the tab is hidden and resumes immediately when it
 * becomes visible again. Presence is best-effort, so failures keep the last known list.
 */
export function usePresence(documentId: string): Viewer[] {
  const [viewers, setViewers] = useState<Viewer[]>([]);

  useEffect(() => {
    let active = true;
    const beat = () => {
      if (document.hidden) return;
      api<{ viewers: Viewer[] }>(`/api/documents/${documentId}/presence`, { method: "POST" })
        .then((res) => active && setViewers(res.viewers))
        .catch(() => undefined);
    };
    beat();
    const timer = setInterval(beat, PRESENCE_POLL_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [documentId]);

  return viewers;
}
