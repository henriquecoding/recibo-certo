import type { MetadataRoute } from "next";
import { SITE_URL, PUBLIC_ROUTES } from "@/lib/seo";
import { comoData, revisaoDaRota } from "@/lib/revisoes";

// O sitemap deriva do registo único `PUBLIC_ROUTES` em `src/lib/seo.ts`,
// evitando divergência entre páginas reais e o que é submetido ao Google.
//
// `lastModified` era `new Date()` — a data do build. Todas as URLs
// anunciavam ter mudado a cada deploy, o que apaga a diferença entre «o
// escalão de IRS mudou» e «corrigimos um espaçamento no rodapé». O §3.4 do
// relatório estratégico identifica isto como lacuna de frescura de
// indexação; a data material vem agora de `revisoes.ts`, recurso a recurso.
//
// Quando não há data conhecida, o campo é OMITIDO em vez de preenchido com
// hoje: um `lastmod` errado ensina o motor a desconfiar de todos os outros.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => {
    const lastModified = comoData(revisaoDaRota(route.path));
    return {
      url: route.path === "/" ? SITE_URL : `${SITE_URL}${route.path}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    };
  });
}
