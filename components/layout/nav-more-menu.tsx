"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const moreNav = [
  { href: "/leadership", label: "Leadership" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/admin", label: "Admin" },
] as const;

export function NavMoreMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      if (!open) setPos(null);
      return;
    }
    const r = buttonRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + 6,
      right: Math.max(8, globalThis.innerWidth - r.right),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => {
      if (!buttonRef.current) return;
      const r = buttonRef.current.getBoundingClientRect();
      setPos({
        top: r.bottom + 6,
        right: Math.max(8, globalThis.innerWidth - r.right),
      });
    };
    globalThis.addEventListener("scroll", onReposition, true);
    globalThis.addEventListener("resize", onReposition);
    return () => {
      globalThis.removeEventListener("scroll", onReposition, true);
      globalThis.removeEventListener("resize", onReposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onToggle = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  const menu =
    open && pos && mounted ? (
      <div
        ref={menuRef}
        className="fixed z-[10000] w-48 overflow-hidden rounded-lg border border-gold/35 bg-void text-foreground shadow-2xl ring-1 ring-black/40"
        style={{ top: pos.top, right: pos.right }}
        role="menu"
      >
        {moreNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block bg-void px-3 py-2.5 text-sm text-foreground/95 transition hover:bg-gold/10"
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-mist transition hover:bg-white/5 hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More navigation"
      >
        More
        <span className="text-mist/50" aria-hidden>
          ▾
        </span>
      </button>
      {menu && createPortal(menu, document.body)}
    </div>
  );
}
