import { getSiteUrl } from "@/lib/site";

const DISCORD = "https://discord.gg/erogetof";

export function SiteJsonLd() {
  const url = getSiteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HighHeavenSect",
    alternateName: ["High Heaven Sect", "HighHeavenSect guild"],
    url,
    logo: `${url}/icon.svg`,
    description:
      "Casual SEA English Where Winds Meet (WWM) guild—community, events, quizzes, and giveaways. Walk the martial path together.",
    sameAs: [DISCORD],
  } as const;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
