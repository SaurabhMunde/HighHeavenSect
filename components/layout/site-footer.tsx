import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gold/15 bg-void/90 py-8">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm text-mist md:px-6">
        <p className="font-display text-gold/90">HighHeavenSect</p>
        <p className="mt-1">On the path to the Martial Peak, no one walks alone.</p>
        <Link
          href="https://discord.gg/erogetof"
          className="mt-3 inline-block text-gold transition hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          discord.gg/erogetof
        </Link>
      </div>
    </footer>
  );
}
