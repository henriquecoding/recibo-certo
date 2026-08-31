// ═══════════════════════════════════════════════════════════════════════
//  DERIVAÇÃO DA EXPANSÃO EDITORIAL 2026
//  ---------------------------------------------------------------------
//  Traduz o catálogo do pacote (112 guias) para os registos que o resto do
//  site já usa: manifestos, afirmações legais, aplicabilidade e histórico.
//
//  Não há uma segunda fonte de verdade. Escrever 112 manifestos à mão era
//  criar 112 oportunidades de o site divergir do pacote verificado — e a
//  auditoria já tinha apontado exatamente essa duplicação (ponto 4.5).
//
//  ESTADO EDITORIAL — o eixo que decide o que vai para o ar
//  ---------------------------------------------------------------------
//  Há DOIS eixos, e confundi-los é o erro fácil:
//
//    1. o pacote diz se a matéria nasce «Revisto» ou «Em revisão»;
//    2. nós sabemos se o CORPO do guia já está redigido.
//
//  Um guia com base legal impecável e corpo por escrever não é um guia —
//  é um andaime. O pacote é explícito: «o andaime é publicável apenas
//  depois de os H2 estarem redigidos; não indexar guias com corpo vazio».
//  Por isso:
//
//    corpo por redigir            → status "draft"      (fora do índice e do sitemap)
//    corpo redigido + Em revisão  → status "review"     (visível, marcado em revisão)
//    corpo redigido + Revisto     → status "published"  (visível, revisto)
//
//  `draft` não é um estado morto: a página existe, responde, mostra as
//  fontes e diz ao leitor em que pé está. O que não faz é apresentar-se ao
//  Google como conteúdo acabado.
// ═══════════════════════════════════════════════════════════════════════

import {
  Home, ChartProjection, Globe, Briefcase, Heart, Clock, Receipt, Calendar,
  User, Calculator, Building, FileSign, Scale, Bank, Coin,
} from "@/components/ui/Icons";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import type { GuideManifest, GuideStatus, HubGroup, IconType } from "../manifests";
import type { LegalClaim, ReviewSeverity } from "../claims";
import type { AlteracaoGuia } from "../historico";
import type { AplicabilidadeGuia } from "../aplicabilidade";
import { GUIAS_EXPANSAO, type GuiaExpansao } from "./catalogo";
import { CONTEUDO_EXPANSAO } from "./conteudo";
import { CORPOS_REDIGIDOS } from "./corpos-redigidos";
import { bindingsDoGuia } from "./dados-motor";

/** Data em que o pacote foi gerado e as fontes verificadas. */
export const DATA_EXPANSAO = "2026-08-06";
const EQUIPA = "Equipa editorial Recibo Certo";
/** 102 dos 112 guias trazem matéria que depende do caso concreto. Nascem
    com revisor por atribuir — e o rodapé diz isso ao leitor, em vez de
    deixar supor que um contabilista já assinou por baixo. */
const REVISOR_PENDENTE = "Por atribuir — revisão fiscal pendente";
const DE = `${FISCAL_YEAR}-01-01`;

// ─── Secções novas ─────────────────────────────────────────────────────

/** Os seis grupos de hub criados pelo pacote. A ordem final do menu é a do
    ciclo de vida do contribuinte e vive em `HUB_GRUPOS` (manifests.ts) —
    aqui só se declara o que cada um é. */
export const HUB_GRUPOS_EXPANSAO: { id: HubGroup; titulo: string; descricao: string }[] = [
  { id: "investir", titulo: "Investir e poupar", descricao: "Mais-valias, dividendos, juros e cripto — o que declarar e onde." },
  { id: "casa", titulo: "Casa e património", descricao: "Comprar, arrendar, herdar e vender: os impostos de cada momento." },
  { id: "familia", titulo: "Família e ciclo de vida", descricao: "Casar, ter filhos, separar-se, herdar — o que muda no IRS e nas deduções." },
  { id: "reforma", titulo: "Reforma e fim de carreira", descricao: "Pensões, PPR e o que acontece à atividade quando ela acaba." },
  { id: "estrangeiro", titulo: "Trabalhar com o estrangeiro", descricao: "Residência fiscal, dupla tributação e rendimentos de fora." },
  { id: "profissao", titulo: "Por profissão", descricao: "O enquadramento concreto de quem faz aquilo em particular." },
];

const ICONE_POR_HUB: Partial<Record<HubGroup, IconType>> = {
  casa: Home,
  investir: ChartProjection,
  estrangeiro: Globe,
  profissao: Briefcase,
  familia: Heart,
  reforma: Clock,
  faturar: Receipt,
  prazos: Calendar,
  contribuir: User,
  irs: Calculator,
  empresa: Building,
  "conta-outrem": FileSign,
  direitos: Scale,
  comecar: Bank,
  encerrar: Coin,
};

// ─── Rótulo curto para a navegação ─────────────────────────────────────

/**
 * `navLabel` a partir do título, sem lista escrita à mão.
 *
 * A barra lateral e o menu móvel não cabem com «IMI: como se calcula e
 * quando se paga». O título do pacote é o que o leitor procura e não se
 * toca; o rótulo curto é uma vista dele. Corta no primeiro sinal de dois
 * pontos ou travessão — que é onde os títulos deste pacote separam o
 * assunto da promessa — e, se ainda assim for longo, corta na última
 * palavra inteira que cabe.
 */
export function rotuloCurto(titulo: string, maximo = 26): string {
  const base = titulo.split(/\s*[:—]\s*/)[0].trim();
  if (base.length <= maximo) return base;
  const cortado = base.slice(0, maximo);
  const espaco = cortado.lastIndexOf(" ");
  return (espaco > 8 ? cortado.slice(0, espaco) : cortado).replace(/[,;]$/, "") + "…";
}

// ─── Estado editorial ──────────────────────────────────────────────────

export function estadoDoGuia(g: GuiaExpansao): GuideStatus {
  if (!CORPOS_REDIGIDOS.has(g.slug)) return "draft";
  return g.estado === "Revisto" ? "published" : "review";
}

const SLUGS = new Set(GUIAS_EXPANSAO.map((g) => g.slug));

/**
 * Este slug é um andaime da expansão — existe, tem fontes, não tem corpo.
 *
 * A pergunta é feita por SLUG e não pelo `status` do manifesto de
 * propósito. `draft` já era usado antes da expansão, noutro sentido: os
 * catorze guias de julho de 2026 estão escritos e marcados `draft` porque
 * falta a revisão fiscal humana. Filtrar o índice por `status === "draft"`
 * arrastava-os para fora do sitemap ao mesmo tempo — uma alteração a
 * conteúdo publicado que ninguém pediu, escondida dentro de outra.
 *
 * Aqui a pergunta é só uma: este guia tem corpo?
 */
export const guiaSemCorpo = (slug: string): boolean =>
  SLUGS.has(slug) && !CORPOS_REDIGIDOS.has(slug);

/** Um guia da expansão entra no índice público e no sitemap quando tem corpo. */
export const guiaIndexavel = (g: GuiaExpansao): boolean => !guiaSemCorpo(g.slug);

// ─── Manifestos ────────────────────────────────────────────────────────

export const MANIFESTOS_EXPANSAO: GuideManifest[] = GUIAS_EXPANSAO.map((g) => ({
  id: g.slug,
  slug: g.slug,
  title: g.titulo,
  navLabel: rotuloCurto(g.titulo),
  descricao: g.dek,
  categoria: g.publico,
  hub: g.hub,
  archetype: g.arquetipo,
  icon: ICONE_POR_HUB[g.hub] ?? Scale,
  tempo: g.tempo,
  audiences: g.audiencias,
  effectiveFrom: DE,
  // Que parâmetros de `fiscal-data.ts` este guia usa. Nasceu vazio — os 112
  // guias entraram sem uma única ligação ao motor, e os números que
  // mostravam eram texto do pacote. Passou a derivar da tabela de dados:
  // declarar o que se usa e usar o que se declara é a mesma linha de código.
  engineBindings: bindingsDoGuia(g.slug),
  relatedGuideIds: g.relacionados,
  relatedToolIds: g.ferramentas,
  // Sem ação FIZ: o pacote não acordou nenhuma capacidade para estes guias,
  // e inventar uma seria prometer ao leitor um destino que não existe.
  // `GUIAS_SEM_ACAO_FIZ` documenta a ausência, como o contrato exige.
  seo: {
    description: g.metaDescription,
    aliases: g.palavrasChave,
    schema:
      g.arquetipo === "procedure" && CONTEUDO_EXPANSAO[g.slug]?.oQuePreparar.length
        ? ["Article", "HowTo"]
        : ["Article"],
  },
  owner: EQUIPA,
  reviewer: g.exigeRevisaoEspecializada ? REVISOR_PENDENTE : EQUIPA,
  lastReviewedAt: DATA_EXPANSAO,
  status: estadoDoGuia(g),
}));

// ─── Afirmações legais ─────────────────────────────────────────────────

const SEVERIDADE: Record<GuiaExpansao["risco"], ReviewSeverity> = {
  alta: "high",
  media: "normal",
  baixa: "normal",
};

/**
 * Uma afirmação por guia: a resposta curta, ancorada na base legal do
 * pacote.
 *
 * É deliberadamente UMA. A resposta curta é a única frase normativa que o
 * pacote entrega já redigida e verificada — o resto do corpo é trabalho
 * editorial, e cada parágrafo que venha a ser escrito traz consigo a sua
 * própria afirmação. Registar aqui frases que ninguém escreveu seria
 * fabricar rastreabilidade.
 *
 * `confidence` sai diretamente de `exige_revisao_especializada`: os 102
 * guias marcados pelo pacote ficam `review_required` — e é isso que faz o
 * cabeçalho de confiança dizer «em revisão» em vez de «verificado».
 */
export const CLAIMS_EXPANSAO: LegalClaim[] = GUIAS_EXPANSAO.flatMap((g) => {
  const fontes = g.baseLegal.length > 0 ? g.baseLegal : g.fontesOficiais;
  if (fontes.length === 0) return [];
  return [{
    id: `${g.slug}.resposta-curta`,
    guideId: g.slug,
    statement: g.respostaCurta,
    sourceIds: fontes as LegalClaim["sourceIds"],
    appliesFrom: DE,
    appliesTo: g.audiencias,
    confidence: g.exigeRevisaoEspecializada ? "review_required" : "verified",
    reviewSeverity: SEVERIDADE[g.risco],
    nota: `Resposta curta do pacote de expansão de ${DATA_EXPANSAO}, fundamentada em ${fontes.length} fonte(s) verificada(s) por HTTP nessa data.`,
  }];
});

// ─── Aplicabilidade ────────────────────────────────────────────────────

export const APLICABILIDADE_EXPANSAO: Record<string, AplicabilidadeGuia> =
  Object.fromEntries(
    GUIAS_EXPANSAO.map((g) => {
      const c = CONTEUDO_EXPANSAO[g.slug];
      return [g.slug, {
        respostaCurta: g.respostaCurta,
        aplicaSe: c.aplicaSe,
        naoAplicaSe: c.naoAplicaSe,
        checklist: c.oQuePreparar,
      } satisfies AplicabilidadeGuia];
    }),
  );

// ─── Histórico editorial ───────────────────────────────────────────────

export const HISTORICO_EXPANSAO: AlteracaoGuia[] = GUIAS_EXPANSAO.filter(guiaIndexavel).map((g) => ({
  guideId: g.slug,
  data: DATA_EXPANSAO,
  tipo: "novo_conteudo",
  descricao: `Guia novo: ${g.dek}`,
  origem: "Expansão editorial dos Guias de 6 de agosto de 2026",
}));

// ─── Leitura complementar ──────────────────────────────────────────────

export const LEITURAS_POR_GUIA_EXPANSAO: Record<string, string[]> = Object.fromEntries(
  GUIAS_EXPANSAO.map((g) => [g.slug, g.leituraComplementar]),
);
