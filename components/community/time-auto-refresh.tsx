"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refreshes the current route when the target time is reached.
 * Used to flip quiz card states (scheduled/open/closed) without manual reload.
 */
export function TimeAutoRefresh({ targetIso }: { targetIso: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!targetIso) return;
    const targetMs = new Date(targetIso).getTime();
    if (Number.isNaN(targetMs)) return;
    let done = false;
    const refreshIfDue = () => {
      if (done) return;
      if (Date.now() >= targetMs) {
        done = true;
        router.refresh();
      }
    };
    // Interval + visibility hook is more reliable on mobile than one long timeout.
    const id = window.setInterval(refreshIfDue, 1000);
    const onVisible = () => {
      if (!document.hidden) refreshIfDue();
    };
    document.addEventListener("visibilitychange", onVisible);
    refreshIfDue();
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [targetIso, router]);

  return null;
}
