import type { MetadataRoute } from "next";
import data from "@/content/commands.json";
import { source } from "@/lib/source";
import { commandSlug } from "@/lib/reference";
import { siteUrl } from "@/lib/shared";

/** Every page, for search engines: the site, the docs and each command */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${siteUrl}${path}`;
  return [
    { url: url("/"), priority: 1 },
    { url: url("/playground"), priority: 0.9 },
    { url: url("/viewer"), priority: 0.9 },
    { url: url("/reference"), priority: 0.9 },
    { url: url("/releases"), priority: 0.5 },
    ...source.getPages().map((page) => ({ url: url(page.url), priority: 0.8 })),
    ...data.commands.map((command) => ({
      url: url(`/reference/${commandSlug(command.code)}`),
      priority: 0.6,
    })),
  ];
}
