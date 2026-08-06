import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuiaLayout from "@/components/guias/GuiaLayout";
import DadosOficiais from "@/components/guias/expansao/DadosOficiais";
import EmPreparacao from "@/components/guias/expansao/EmPreparacao";
import { CORPOS } from "@/components/guias/expansao/corpos";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { guiaExpansao, SLUGS_EXPANSAO } from "@/lib/guias/expansao/catalogo";
import { guiaSemCorpo } from "@/lib/guias/expansao/derivar";

// ═══════════════════════════════════════════════════════════════════════
//  ROTA DOS GUIAS DA EXPANSÃO EDITORIAL 2026
//  ---------------------------------------------------------------------
//  Uma rota dinâmica para os 112 guias novos, em vez de 112 pastas com um
//  `page.tsx` quase igual dentro. Os 57 guias anteriores continuam em
//  rotas próprias: cada um tem corpo escrito à mão, com componentes
//  próprios (calculadoras embutidas, comparadores), e o Next.js dá
//  precedência ao segmento estático sobre o dinâmico — nada muda para eles.
//
//  O que esta rota resolve é a parte que É igual em todos: cabeçalho de
//  confiança, resposta curta, aplicabilidade, dados do ano, checklist,
//  guias relacionados, fontes, histórico e rodapé. O que muda de guia para
//  guia é o corpo, e esse vem do registo `CORPOS`.
//
//  Um guia sem corpo continua a responder — com a base legal toda, que é
//  conteúdo real e verificado — mas sai `noindex`. Ver `EmPreparacao`.
// ═══════════════════════════════════════════════════════════════════════

export const dynamicParams = false;

export function generateStaticParams() {
  return SLUGS_EXPANSAO.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!guiaExpansao(slug)) return {};

  const base = metadataDoGuia(slug);
  if (!guiaSemCorpo(slug)) return base;

  // Andaime: existe, é útil a quem tem o link, não se candidata a resultado
  // de pesquisa. `follow` fica ligado — as fontes e os guias relacionados
  // são ligações legítimas que não há razão para cortar.
  return { ...base, robots: { index: false, follow: true } };
}

export default async function GuiaExpansaoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guia = guiaExpansao(slug);
  if (!guia) notFound();

  const Corpo = CORPOS[slug];

  return (
    <GuiaLayout slug={slug}>
      {Corpo ? <Corpo /> : <EmPreparacao slug={slug} />}
      <DadosOficiais slug={slug} />
    </GuiaLayout>
  );
}
