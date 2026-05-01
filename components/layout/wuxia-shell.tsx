import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { CherryBlossomOverlay } from "./cherry-blossom-overlay";
import { STORAGE_ASSETS } from "@/lib/storage-public";

const publicBackground = {
  src: STORAGE_ASSETS.siteBackground,
  imageOpacity: "opacity-[0.3]",
  imageFilter: "saturate-[1.04] contrast-[0.96] brightness-[1.02]",
  baseOverlay: "from-[#1a2230]/58 via-[#1d2734]/52 to-[#18202c]/66",
  accentOverlay:
    "bg-[radial-gradient(ellipse_88%_58%_at_50%_-12%,rgba(255,232,242,0.14),transparent_62%),radial-gradient(ellipse_72%_50%_at_96%_18%,rgba(248,176,210,0.12),transparent_45%)]",
} as const;

export function WuxiaShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-hidden bg-wuxia-mountains [--gold:#d9a4bb] [--gold-bright:#ffe9f3] [--gold-dim:#b77c97] [--mist:#bec9d8] [--foreground:#edf3fb]">
      <div
        className={`pointer-events-none fixed inset-0 z-0 ${publicBackground.imageOpacity} ${publicBackground.imageFilter}`}
        style={{
          backgroundImage: `url(${publicBackground.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
        aria-hidden
      />
      <div
        className={`pointer-events-none fixed inset-0 z-[1] bg-gradient-to-b ${publicBackground.baseOverlay}`}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[2] bg-grain opacity-45" aria-hidden />
      <div
        className={`pointer-events-none fixed inset-0 z-[3] ${publicBackground.accentOverlay}`}
        aria-hidden
      />
      <CherryBlossomOverlay />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto mb-6 flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-6 md:py-10">
          <div className="w-full rounded-3xl border border-gold/35 bg-[#1a2431]/82 p-4 shadow-[0_12px_36px_rgba(5,10,18,0.34)] sm:p-5 md:p-6">
            {children}
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
