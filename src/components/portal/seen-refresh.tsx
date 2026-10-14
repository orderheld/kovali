"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Rendered on the first view of a vacancy, which the page just marked as seen. The portal
 * layout counted it as new in the same request (and keeps its state on later client
 * navigations), so one refresh brings the "Vakanzen" badge up to date.
 */
export function SeenRefresh() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    router.refresh();
  }, [router]);
  return null;
}
