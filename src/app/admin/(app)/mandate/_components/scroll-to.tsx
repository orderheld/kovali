"use client";

import { useEffect, useRef } from "react";

/**
 * Scrolls to an element once, e.g. the candidate opened from the candidate page
 * (?kandidat=…). Remembers the target, so showing the kept page again does not jump.
 */
export function ScrollTo({ targetId }: { targetId: string }) {
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (done.current === targetId) return;
    done.current = targetId;
    document.getElementById(targetId)?.scrollIntoView({ block: "start" });
  }, [targetId]);
  return null;
}
