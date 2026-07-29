import type { Metadata } from "next";
import { manifestoObrigatorio } from "./manifests";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

// ─────────────────────────────────────────────────────────────────────────
//  Metadados de um Guia, derivados do manifesto.
//
//  Antes, cada página escrevia à mão título, descrição, keywords, canonical
//  e Open Graph — e nada garantia que correspondessem ao conteúdo real
//  (critério de aceitação "schema e metadata correspondem ao conteúdo").
//  Agora há uma só fonte: o manifesto.
//
//  Os `aliases` do manifesto servem de keywords porque são exatamente a
//  linguagem comum que alimenta a pesquisa interna — assim, as duas nunca
//  divergem.
// ─────────────────────────────────────────────────────────────────────────

export function metadataDoGuia(slug: string): Metadata {
  const m = manifestoObrigatorio(slug);
  const url = `${SITE_URL}/guias/${m.slug}`;

  return {
    title: m.title,
    description: m.seo.description,
    keywords: m.seo.aliases,
    alternates: { canonical: url },
    openGraph: {
      title: `${m.title} | ${SITE_NAME}`,
      description: m.seo.description,
      url,
      siteName: SITE_NAME,
      locale: "pt_PT",
      type: "article",
      modifiedTime: m.lastReviewedAt,
    },
  };
}
