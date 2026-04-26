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
        className="pointer-events-none fixed inset-0 z-[2] bg-[radial-gradient(ellipse_90%_60%_at_20%_0%,rgba(212,175,55,0.12),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_30%,rgba(100,80,20,0.08),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[1] bg-grain bg-wuxia-radial"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.16]"
        style={{
          backgroundImage: "url(/bg-martial-peak.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6 md:py-10">
          {children}
        </main>
        <SiteFooter />
        <GuildLogDock />
      </div>
    </div>
  );
}
