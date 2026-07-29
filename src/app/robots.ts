import type { MetadataRoute } from "next";

const SITE_URL = "https://www.recibocerto.pt";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // `/ir/` é o redirecionador de parcerias: só existe para levar alguém
        // a outro sítio e não tem conteúdo para indexar. Fica também com
        // `X-Robots-Tag: noindex, nofollow` na própria resposta, porque um
        // robots.txt é uma sugestão e um cabeçalho é uma instrução.
        disallow: ["/dashboard/", "/admin/", "/api/", "/ir/"],
      },
      { userAgent: "AhrefsBot",  crawlDelay: 10 },
      { userAgent: "SemrushBot", crawlDelay: 10 },
      { userAgent: "MJ12bot",    disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
