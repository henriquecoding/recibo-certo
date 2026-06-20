import type { MetadataRoute } from "next";

const SITE_URL = "https://www.recibocerto.pt";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/api/"],
      },
      { userAgent: "AhrefsBot",  crawlDelay: 10 },
      { userAgent: "SemrushBot", crawlDelay: 10 },
      { userAgent: "MJ12bot",    disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
