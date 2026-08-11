import type { MetadataRoute } from "next";
import { AGENTES_EXTRACAO_BLOQUEADOS } from "@/lib/crawler-policy";

const SITE_URL = "https://www.recibocerto.pt";

/** Rotas sem conteúdo indexável: privadas, técnicas ou redirecionadores. */
const PRIVADAS = ["/dashboard/", "/admin/", "/api/", "/ir/"];

/**
 * Política deliberada:
 *  - Googlebot e Bingbot continuam a poder indexar títulos e URLs;
 *  - crawlers declarados de IA, treino, datasets e scraping comercial recebem
 *    Disallow total e são também recusados por src/proxy.ts;
 *  - a reserva TDM é repetida no header HTTP, HTML e TDMRep.
 *
 * robots.txt é uma instrução para agentes cooperantes, não autenticação.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVADAS,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: PRIVADAS,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: PRIVADAS,
      },
      ...AGENTES_EXTRACAO_BLOQUEADOS.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
