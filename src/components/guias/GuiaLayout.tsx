import type { ReactNode } from "react";
import { GuiaHero } from "./GuiaHero";
import EstadoRevisaoGuia from "./EstadoRevisaoGuia";
import RespostaCurtaGuia from "./RespostaCurtaGuia";
import ChecklistGuia from "./ChecklistGuia";
import SimuladoresRelacionados from "./SimuladoresRelacionados";
import GuiasRelacionados from "./GuiasRelacionados";
import FontesGuia from "./FontesGuia";
import HistoricoGuia from "./HistoricoGuia";
import NotaDisclaimer from "./NotaDisclaimer";
import FizNextStep from "@/components/fiz/FizNextStep";
import { resolverAcaoDoGuia } from "@/lib/fiz/guide-routing.server";
import { manifestoObrigatorio, ARQUETIPOS } from "@/lib/guias/manifests";
import { aplicabilidade } from "@/lib/guias/aplicabilidade";
import { generateArticleSchema, SITE_URL } from "@/lib/seo";
import { jsonLd } from "@/lib/jsonld";

// ═══════════════════════════════════════════════════════════════════════
//  ESQUELETO COMUM DE UM GUIA (anatomia do ponto 6.3 da auditoria)
//  ---------------------------------------------------------------------
//    1. Resposta curta          6. Checklist
//    2. Aplicabilidade          7. Próximo passo (FIZ, quando existe)
//    3. Resultado personalizado 8. Ferramentas relacionadas
//    4. Regra explicada         9. Fontes por autoridade
//    5. Simulação/exemplo      10. Alterações · 11. Revisão
//
//  A página de cada Guia passa a conter APENAS o corpo (passos 4 e 5). Tudo
//  o resto é derivado do manifesto — é isto que impede um Guia novo de
//  nascer sem fontes, sem estado de revisão ou sem ligações internas.
//
//  `manifestoObrigatorio` lança se o slug não tiver manifesto: um Guia sem
//  registo editorial falha o build em vez de chegar a produção.
// ═══════════════════════════════════════════════════════════════════════

interface GuiaLayoutProps {
  slug: string;
  children: ReactNode;
  /** Substitui a descrição do manifesto no herói, quando o Guia quer uma
      abertura mais concreta. O manifesto continua a ser a fonte do resto. */
  descricaoHero?: string;
}

export default async function GuiaLayout({ slug, children, descricaoHero }: GuiaLayoutProps) {
  const m = manifestoObrigatorio(slug);
  const a = aplicabilidade(slug);

  // Resolvido AQUI, no servidor, e não por `fetch` na montagem do componente.
  // Em modo LIGACAO o destino é conhecido no momento em que a página é
  // renderizada: manter o pedido custava um round-trip por visita em 54
  // Guias, um salto de layout, e nenhum link para quem tem JavaScript
  // desligado. `resolverAcaoDoGuia` nunca lança — devolve sempre um estado
  // renderizável, ou `null`.
  const acaoInicial = await resolverAcaoDoGuia({ slug, placement: "NEXT_STEP" });

  const article = generateArticleSchema({
    headline: m.title,
    description: m.seo.description,
    path: `/guias/${m.slug}`,
    dateModified: m.lastReviewedAt,
  });

  // Ponto 9.3: `HowTo` só quando existem passos completos e executáveis —
  // aqui, a checklist de um Guia de procedimento. Nunca gerado em série.
  const howTo =
    m.seo.schema.includes("HowTo") && a && a.checklist.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: m.title,
          description: m.seo.description,
          inLanguage: "pt-PT",
          url: `${SITE_URL}/guias/${m.slug}`,
          step: a.checklist.map((passo, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: passo,
          })),
        }
      : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      {howTo && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(howTo) }} />
      )}

      <GuiaHero
        eyebrow={ARQUETIPOS[m.archetype].rotulo}
        titulo={m.title}
        descricao={descricaoHero ?? m.descricao}
        tempoLeitura={m.tempo}
      />

      <EstadoRevisaoGuia slug={slug} />
      <RespostaCurtaGuia slug={slug} />

      {children}

      {a && <ChecklistGuia slug={slug} itens={a.checklist} />}
      <FizNextStep slug={slug} acaoInicial={acaoInicial} />
      <SimuladoresRelacionados slug={slug} />
      <GuiasRelacionados slug={slug} />
      <FontesGuia slug={slug} />
      <HistoricoGuia slug={slug} />
      <NotaDisclaimer slug={slug} />
    </>
  );
}
