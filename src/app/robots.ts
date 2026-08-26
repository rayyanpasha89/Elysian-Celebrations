import { resolveSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

const base = resolveSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
