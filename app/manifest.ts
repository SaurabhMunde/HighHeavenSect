import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  const site = getSiteUrl();
  return {
    name: "HighHeavenSect",
    short_name: "HighHeavenSect",
    description:
      "Where Winds Meet (WWM) SEA English guild community with schedule, quizzes, giveaways, and recruitment.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#d4a93d",
    icons: [
      {
        src: `${site}/icon.svg`,
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
