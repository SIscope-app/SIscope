import type { MetadataRoute } from "next";
import { allModels, ensureData, siRanked, textPublishDate } from "@/lib/data";
import { popularMatchups } from "@/lib/matchups";
import { TASKS } from "@/lib/tasks";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await ensureData();
  const d = new Date(textPublishDate() + "T12:00:00Z");
  const u = (p: string, priority = 0.6) => ({ url: `${SITE.url}${p}`, lastModified: d, changeFrequency: "weekly" as const, priority });
  return [
    u("/", 1),
    u("/leaderboard", 0.9),
    u("/compare", 0.7),
    ...popularMatchups(siRanked()).map((p) => u(`/compare/${p.key}`, 0.5)),
    u("/developers", 0.4),
    u("/privacy", 0.2),
    u("/terms", 0.2),
    u("/tools/cost", 0.6),
    u("/best", 0.8),
    ...TASKS.map((t) => u(`/best/${t.slug}`, 0.8)),
    u("/agents", 0.7),
    u("/state-of-ai", 0.8),
    u("/benchmarks", 0.5),
    u("/methodology", 0.5),
    u("/methodology/changelog", 0.3),
    u("/trends", 0.5),
    u("/pick", 0.6),
    u("/changes", 0.4),
    u("/about", 0.3),
    ...allModels()
      .filter((m) => m.si != null || m.arena.text)
      .map((m) => u(`/models/${m.slug}`, m.si != null ? 0.6 : 0.4)),
  ];
}
