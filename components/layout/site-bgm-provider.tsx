"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { STORAGE_ASSETS } from "@/lib/storage-public";

/** Prefer Supabase public object; override with absolute or site-relative URL. */
const BGM_SRC =
  process.env.NEXT_PUBLIC_SITE_BGM_URL?.trim() || STORAGE_ASSETS.siteBgmAudio;
const DEFAULT_VOLUME = 0.32;

type SiteBgmContextValue = {
  /** User preference: background music enabled for public routes (Admin still suppresses playback). */
  isPlaying: boolean;
  /** True when audio is actually allowed to play (`isPlaying` and not under `/admin*`). */
  isAudible: boolean;
  toggle: () => void;
};

const SiteBgmContext = createContext<SiteBgmContextValue | null>(null);

export function useSiteBgm(): SiteBgmContextValue {
  const ctx = useContext(SiteBgmContext);
  if (!ctx) {
    throw new Error("useSiteBgm must be used within SiteBgmProvider");
  }
  return ctx;
}

/**
 * Single `<audio>` instance for the whole app — survives Next.js client navigations.
 * Uses native `loop`: continues from the same playback position across pages; restarts only when the file loops at the end.
 */
export function SiteBgmProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const isAudible = isPlaying && !isAdminRoute;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = DEFAULT_VOLUME;
    el.loop = true;
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const unlock = () => {
      void el.play().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (isAdminRoute || !isPlaying) {
      el.pause();
      return;
    }

    void el.play().catch(() => {});
  }, [isAdminRoute, isPlaying]);

  const toggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return (
    <SiteBgmContext.Provider value={{ isPlaying, isAudible, toggle }}>
      <audio ref={audioRef} preload="auto" loop src={BGM_SRC} />
      {children}
    </SiteBgmContext.Provider>
  );
}
