import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gold/15 bg-void/90 py-8">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm text-mist md:px-6">
        <p className="font-display text-gold/90">HighHeavenSect</p>
        <p className="mt-1">On the path to the Martial Peak, no one walks alone.</p>
        <div className="mt-4 flex justify-center">
          <Link
            href="https://discord.gg/erogetof"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 max-w-[16.5rem] items-center justify-center rounded-lg border border-gold/45 bg-black/52 px-3.5 py-2 text-center shadow-[inset_0_1px_0_rgba(255,240,246,0.06)] backdrop-blur-sm transition hover:border-gold/65 hover:bg-black/62 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d12]"
          >
            <span className="flex flex-col gap-0.5 leading-snug">
              <span className="font-display text-xs font-semibold tracking-wide text-gold-bright">
                Join us on Discord
              </span>
              <span className="font-sans text-[10px] text-mist">discord.gg/erogetof</span>
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
