import type { MetadataRoute } from "next";
import { allModels, textPublishDate } from "@/lib/data";
import { TASKS } from "@/lib/tasks";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const d = new Date(textPublishDate() + "T12:00:00Z");
  const u = (p: string, priority = 0.6) => ({ url: `${SITE.url}${p}`, lastModified: d, changeFrequency: "weekly" as const, priority });
  return [
    u("/", 1),
    u("/leaderboard", 0.9),
    u("/compare", 0.7),
    u("/tools/cost", 0.6),
    u("/best", 0.8),
    ...TASKS.map((t) => u(`/best/${t.slug}`, 0.8)),
    u("/agents", 0.7),
    u("/methodology", 0.5),
    u("/about", 0.3),
    ...allModels()
      .filter((m) => m.si != null || m.arena.text)
      .map((m) => u(`/models/${m.slug}`, m.si != null ? 0.6 : 0.4)),
  ];
}
