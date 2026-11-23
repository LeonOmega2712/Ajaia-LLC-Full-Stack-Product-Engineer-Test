"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "pending" | "saving" | "error";

interface Options<T> {
  delayMs?: number;
  /** Combines a newly scheduled value with one still waiting to be saved. Default: replace. */
  merge?: (pending: T, next: T) => T;
}

/**
 * Debounced, serialized autosave. `schedule(value)` on every change; the latest (merged) value
 * is persisted after `delayMs` of inactivity. Saves never overlap, which matters because each
 * save advances the document version used for conflict detection.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>, { delayMs = 800, merge }: Options<T> = {}) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saveRef = useRef(save);
  saveRef.current = save;

  const run = useCallback(async () => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    setStatus("saving");
    try {
      await saveRef.current(next.value);
      setError(null);
      setStatus(pending.current ? "pending" : "saved");
    } catch (e) {
      // Keep the unsaved value (merged with anything typed meanwhile) so a retry sends it.
      const typedMeanwhile = pending.current as { value: T } | null;
      pending.current = {
        value: typedMeanwhile ? (merge ? merge(next.value, typedMeanwhile.value) : typedMeanwhile.value) : next.value,
      };
      setError((e as Error).message);
      setStatus("error");
    }
  }, [merge]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    queue.current = queue.current.then(run);
    return queue.current;
  }, [run]);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value: pending.current && merge ? merge(pending.current.value, value) : value };
      setStatus((s) => (s === "error" ? s : "pending"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush, merge],
  );

  /** Drops unsaved changes (used when the user chooses to load someone else's newer version). */
  const discard = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    pending.current = null;
    setError(null);
    setStatus("saved");
  }, []);

  /** Pauses automatic retries: keeps the value but stops the timer (used while a conflict is open). */
  const hold = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return { status, error, schedule, flush, discard, hold };
}
