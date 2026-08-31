import type { Metadata } from "next";
import { FOCO_POR_ID } from "@/components/foco/focos";
import { ROTA_POR_FOCO, type FocoHomepage } from "@/lib/foco-homepage";

/** Metadados sociais das cinco entradas, derivados da mesma definição editorial. */
export function metadataDoFoco(foco: FocoHomepage): Metadata {
  const definicao = FOCO_POR_ID.get(foco);
  if (!definicao) throw new Error(`Foco editorial sem definição: ${foco}`);

  const tituloSocial = `${definicao.titulo} | ReciboCerto`;
  return {
    title: { absolute: tituloSocial },
    description: definicao.descricao,
    // A política SEO existente trata as cinco leituras como variantes da
    // homepage. As rotas concretas isolam execução e cache sem mudar essa
    // decisão editorial nesta alteração de performance.
    alternates: { canonical: "/" },
    openGraph: {
      title: tituloSocial,
      description: definicao.descricao,
      url: ROTA_POR_FOCO[foco],
      siteName: "ReciboCerto",
      locale: "pt_PT",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: tituloSocial,
      description: definicao.descricao,
    },
  };
}
