import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/** Public routes we want search engines to discover. */
const PATHS = [
  "/",
  "/recruitment",
  "/schedule",
  "/quizzes",
  "/giveaways",
  "/members",
  "/leadership",
  "/leaderboard",
  "/gallery",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  return PATHS.map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
