"use client";

import { useEffect, useState } from "react";

function fmt(sec: number) {
  if (sec <= 0) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * @param targetIso ISO 8601 string, or null to hide
 */
export function PublicCountdown({
  targetIso,
  label = "Starts in",
}: {
  targetIso: string | null;
  label?: string;
}) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!targetIso) {
      setLeft(null);
      return;
    }
    const t = new Date(targetIso).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((t - Date.now()) / 1000));
      setLeft(s);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!targetIso || left === null) return null;
  if (left === 0) {
    return (
      <p className="text-sm text-gold-bright" aria-live="polite">
        Time reached. Check Discord or refresh.
      </p>
    );
  }
  return (
    <p className="font-mono text-lg tabular-nums text-gold-bright" aria-live="polite">
      {label} {fmt(left)}
    </p>
  );
}
