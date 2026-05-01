"use client";

import { usePathname } from "next/navigation";

import { useSiteBgm } from "./site-bgm-provider";

function IconSpeakerOn({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5L6 9H3v6h3l5 4V5zM15 9a5 5 0 014 5" />
      <path d="M15 13a9 9 0 002 3" opacity="0.75" />
    </svg>
  );
}

function IconSpeakerMuted({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M22 9L16 15M16 9l6 6" />
    </svg>
  );
}

/** Header control — playback state lives in `SiteBgmProvider` (root) so navigation does not reset the track. */
export function SiteBgmToggle() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const { isPlaying, isAudible, toggle } = useSiteBgm();

  const adminHint =
    isAdminRoute && isPlaying
      ? "Music off in Admin (click to mute site-wide)"
      : undefined;
  const title = adminHint ?? (isAudible ? "Mute site music" : "Play site music");
  const ariaLabel = adminHint ?? (isAudible ? "Mute background music" : "Play background music");

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
        isAudible
          ? "border-gold/35 text-gold-bright hover:border-gold/55 hover:bg-white/10"
          : "border-gold/20 text-mist hover:border-gold/40 hover:bg-white/[0.07] hover:text-foreground"
      }`}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={isPlaying}
    >
      {isAudible ? (
        <IconSpeakerOn className="size-5" />
      ) : (
        <IconSpeakerMuted className="size-5" />
      )}
    </button>
  );
}
