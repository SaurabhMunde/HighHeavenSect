import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GuildLogDock } from "@/components/guild-log-dock";

export function WuxiaShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-hidden bg-wuxia-mountains">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.12]"
        style={{
          backgroundImage: "url(/bg-martial-peak.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
        aria-hidden
      />
      {/* Dims the artwork so body text and mist-colored copy stay readable site-wide */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] bg-gradient-to-b from-void/72 via-void/64 to-void/78"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[2] bg-grain bg-wuxia-radial"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[3] bg-[radial-gradient(ellipse_90%_60%_at_20%_0%,rgba(212,175,55,0.12),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_30%,rgba(100,80,20,0.08),transparent_45%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto mb-6 flex w-full max-w-5xl flex-1 flex-col px-4 py-8 md:px-6 md:py-10">
          <div className="w-full rounded-2xl border border-gold/20 bg-void/82 p-4 shadow-card backdrop-blur-sm sm:p-5 md:p-6">
            {children}
          </div>
        </main>
        <SiteFooter />
        <GuildLogDock />
      </div>
    </div>
  );
}
