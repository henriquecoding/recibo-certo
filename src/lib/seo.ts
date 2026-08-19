/**
 * ReciboCerto — SEO v1.0
 *
 * Geradores de schema JSON-LD e constantes partilhadas por todas as páginas.
 *
 * Princípios aplicados:
 *  • Keyword primária no início do título (≤ 60 chars)
 *  • Meta description com CTA e prova de rigor (130–160 chars)
 *  • Keywords de cauda longa orientadas à intenção de pesquisa (PT)
 *  • Schema.org rico: SoftwareApplication, Organization, WebSite, FAQPage
 *  • E-E-A-T: fonte legal verificada, atualização anual, grátis
 */

import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal/types";
import { GUIDE_MANIFESTS } from "@/lib/guias/manifests";
import { guiaSemCorpo } from "@/lib/guias/expansao/derivar";
import { ORIGEM_CANONICA } from "@/lib/origem";
import { SLUGS_PUBLICOS } from "@/lib/ferramentas/selecionar";

// RC-CFG-001: a origem vive em `origem.ts` e sai daqui com o nome que o resto
// do site já usa. Duas declarações da mesma origem foi exatamente como o
// canónico e os `redirect_uri` de OAuth acabaram em hosts diferentes.
export const SITE_URL = ORIGEM_CANONICA;
export const SITE_NAME = "ReciboCerto";

// ─── Registo central de rotas públicas indexáveis ────────────────────────────
// Fonte única para o sitemap. Ao criar uma página pública nova, adicioná-la aqui
// (o `scripts/seo-audit.mjs` deteta páginas em falta no registo).

export type ChangeFrequency = "weekly" | "monthly" | "yearly";

export interface PublicRoute {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
}

/** Slugs dos guias em `src/app/guias/<slug>`, DERIVADOS dos manifestos
    (`src/lib/guias/manifests.ts`) — que são a fonte única. Registar um
    manifesto novo passa a chegar ao sitemap, ao índice, à navegação e ao
    seo-audit de uma só vez; era esta duplicação manual que a auditoria
    identificou no ponto 4.5. Ordenado para o sitemap ser estável. */
/** Categorias do Quiz Fiscal com página própria. */
export const QUIZ_CATEGORIA_SLUGS: readonly string[] = Object.keys(META_CATEGORIA_QUIZ).sort();

/**
 * Um guia entra no sitemap quando tem corpo redigido.
 *
 * O filtro era só `status !== "archived"`, e chegava enquanto todos os
 * guias nasciam escritos. A expansão de 2026 trouxe 112 andaimes — base
 * legal completa, fontes verificadas, corpo por escrever — e submeter ao
 * Google uma página cujo corpo ainda não existe é pedir para ser avaliado
 * por ela. O pacote é explícito: «não indexar guias com corpo vazio».
 *
 * `draft` é exatamente esse estado. A página continua a existir e a
 * responder — quem tiver o link vê as fontes e vê que está em preparação —
 * mas não se anuncia. Ver `expansao/derivar.ts`.
 */
export const GUIA_SLUGS: readonly string[] = GUIDE_MANIFESTS
  .filter((m) => m.status !== "archived" && !guiaSemCorpo(m.slug))
  .map((m) => m.slug)
  .sort();

/** Slugs das ferramentas em `src/app/ferramentas/<slug>`. */
/**
 * Os slugs públicos das ferramentas — DERIVADOS do catálogo (§7.3).
 *
 * Era uma lista literal, mantida à mão em paralelo com `FERRAMENTAS`. Havia
 * um teste a provar que as duas coincidiam — o que impedia uma gralha entre
 * elas, mas não detetava a falha real: uma ferramenta que existisse no
 * produto e nunca tivesse sido acrescentada a NENHUMA das duas. Foi assim
 * que a calculadora de Segurança Social trimestral e o simulador de IRS
 * Jovem viveram meses fora do sitemap, da pesquisa e do hub.
 *
 * Agora o sitemap não pode ficar para trás do catálogo, porque é o catálogo.
 */
export const FERRAMENTA_SLUGS: readonly string[] = SLUGS_PUBLICOS;

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/",            changeFrequency: "weekly",  priority: 1.0 },
  { path: "/precos",      changeFrequency: "monthly", priority: 0.8 },
  { path: "/investidores", changeFrequency: "monthly", priority: 0.6 },
  { path: "/quiz-fiscal", changeFrequency: "monthly", priority: 0.7 },
  // As 16 categorias do quiz são rotas estáticas com conteúdo real e JSON-LD
  // (ver `app/quiz-fiscal/[categoria]`). Derivam do catálogo para nunca
  // divergirem dele.
  ...QUIZ_CATEGORIA_SLUGS.map((slug) => ({
    path: `/quiz-fiscal/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  })),
  { path: "/guias",       changeFrequency: "monthly", priority: 0.8 },
  ...GUIA_SLUGS.map((slug) => ({
    path: `/guias/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  })),
  { path: "/ferramentas", changeFrequency: "monthly", priority: 0.8 },
  ...FERRAMENTA_SLUGS.map((slug) => ({
    path: `/ferramentas/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  })),
  // Páginas de autoridade (§10.3 do relatório estratégico): metodologia,
  // cobertura dos dados e histórico de correções fiscais. Prioridade alta
  // porque são o que sustenta a confiança em tudo o resto — e o que um
  // motor de resposta precisa de encontrar para nos poder citar.
  // A plataforma de contabilistas. Esteve fora desta lista até ao dia da
  // publicação, e o comentário que aqui estava explicava porquê: as duas
  // invariantes de `crescimento.test.ts` — «toda a rota pública tem data
  // material» e «nenhuma data é a do build» — só se cumprem as duas com a
  // data verdadeira, e anunciar no sitemap uma página que ainda não está
  // no ar seria mentir duas vezes para não falhar uma.
  //
  // Publicadas a 19-08-2026 (versão 2.83.0); a data está em
  // `REVISOES_MANUAIS`, que é onde ela é lida.
  //
  // O diretório leva `weekly` e prioridade alta porque muda com cada
  // contabilista aprovado. A candidatura leva `monthly` e prioridade mais
  // baixa: é uma página de conversão, não de descoberta — quem a procura
  // chega-lhe pelo diretório ou por uma ligação direta.
  { path: "/contabilistas",             changeFrequency: "weekly",  priority: 0.8 },
  { path: "/contabilistas/candidatura", changeFrequency: "monthly", priority: 0.5 },
  //
  // Os PERFIS individuais (`/contabilistas/[slug]`) nunca entram: dependem
  // de quem está aprovado num dado momento, e um sitemap estático a
  // prometer URLs que podem desaparecer é pior do que não os listar.
  { path: "/metodologia",      changeFrequency: "monthly", priority: 0.7 },
  { path: "/estado-dos-dados", changeFrequency: "weekly",  priority: 0.7 },
  { path: "/changelog-fiscal", changeFrequency: "weekly",  priority: 0.7 },
  { path: "/privacidade", changeFrequency: "yearly", priority: 0.3 },
  { path: "/termos",      changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookies",     changeFrequency: "yearly", priority: 0.3 },
];

// ─── Schema: WebSite ─────────────────────────────────────────────────────────

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: "Recibo Certo",
    url: SITE_URL,
    description:
      "Copiloto financeiro em Portugal: calculadora de recibos verdes, simulador de salário líquido, comparador empresa vs. independente, guias fiscais e ferramentas. IRS, Segurança Social e IVA com taxas de 2026 verificadas com fonte legal.",
    inLanguage: "pt-PT",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─── Schema: Organization ────────────────────────────────────────────────────

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.svg`,
      width: 220,
      height: 48,
    },
    description:
      "Copiloto financeiro em Portugal: calculadora de recibos verdes, simulador de salário líquido, comparador empresa vs. independente, guias fiscais e ferramentas. IRS, Segurança Social, IVA e recibo de vencimento com taxas de 2026 verificadas com fonte legal.",
    foundingDate: "2025",
    address: {
      "@type": "PostalAddress",
      addressCountry: "PT",
    },
    areaServed: {
      "@type": "Country",
      name: "Portugal",
    },
    knowsAbout: [
      "Recibos verdes Portugal",
      "Trabalhadores independentes Portugal",
      "Trabalho por conta de outrem Portugal",
      "Recibo de vencimento e salário líquido 2026",
      "Simulador de empresa unipessoal Portugal",
      "IRS Portugal 2026",
      "Segurança Social Portugal",
      "IVA isenção artigo 53.º do CIVA",
      "IRS Jovem Portugal",
      "Classificação de atividades CIRS",
      "Regime simplificado vs contabilidade organizada",
    ],
  };
}

// ─── Schema: SoftwareApplication ─────────────────────────────────────────────

export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#app`,
    name: SITE_NAME,
    applicationCategory: "FinanceApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",
    url: SITE_URL,
    inLanguage: "pt-PT",
    description:
      "Copiloto financeiro em Portugal com calculadora de recibos verdes, simulador de salário líquido, simulador de empresa, comparador de regimes, guias fiscais, quiz fiscal e ferramentas para trabalhadores independentes, por conta de outrem e futuros empresários. IRS, Segurança Social e IVA com taxas verificadas de 2026. Grátis, sem registo.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Calculadoras, simuladores, guias e ferramentas — grátis para sempre",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Calculadora de recibos verdes (IRS, Segurança Social e IVA)",
      "Simulador de recibo de vencimento e salário líquido (trabalho por conta de outrem)",
      "Simulador de empresa unipessoal vs. trabalhador independente",
      "Comparador: trabalho dependente vs. recibos verdes vs. empresa",
      "Classificador de atividades CIRS com regime fiscal automático",
      "Auditoria do recibo de vencimento face às tabelas de 2026",
      "IRS Jovem 2026 com isenção crescente por anos",
      "Calendário de prazos fiscais com alertas antecipados",
      `Quiz Fiscal com ${TOTAL_PERGUNTAS_META.toLocaleString("pt-PT")} perguntas, gamificação e cupões Plus`,
      `${GUIA_SLUGS.length} guias fiscais detalhados para independentes, trabalhadores por conta de outrem e empresas`,
      "Mapa de preços por região: contabilistas, notários e advogados",
      "Dashboard com guardião de SS, retenção e estimativa de IRS anual",
      "Exportação de dados para o contabilista",
    ],
    softwareVersion: "2026",
    releaseNotes:
      "Atualizado para o Orçamento do Estado 2025/2026. Simulador de empresa, classificador de atividades, quiz fiscal, guias detalhados, dashboard inteligente, taxas de retenção 23%, limite de isenção de IVA 15.000 €, IRS Jovem revisto.",
  };
}

// ─── Schema: BreadcrumbList ──────────────────────────────────────────────────

export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

// ─── Schema: HowTo ───────────────────────────────────────────────────────────

/**
 * Passos de uma ferramenta guiada, para rich results de instruções.
 * `totalTime` em duração ISO 8601 (ex.: "PT5M").
 */
export function generateHowToSchema(args: {
  name: string;
  description: string;
  url: string;
  totalTime?: string;
  steps: { name: string; text: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: args.name,
    description: args.description,
    inLanguage: "pt-PT",
    url: `${SITE_URL}${args.url}`,
    ...(args.totalTime ? { totalTime: args.totalTime } : {}),
    estimatedCost: { "@type": "MonetaryAmount", currency: "EUR", value: "0" },
    step: args.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${SITE_URL}${args.url}#simulador`,
    })),
  };
}

// ─── Schema: FAQPage ─────────────────────────────────────────────────────────

export function generateFAQSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

// ─── Schema: Quiz (schema.org/Quiz + Question + Answer) ──────────────────────

/**
 * Schema de um conjunto de perguntas com resposta e explicação.
 *
 * O quiz é a maior peça de conteúdo do site — 1.614 perguntas, cada uma com
 * base legal e ligação à fonte oficial — e não tinha uma linha de JSON-LD.
 * `Quiz`, `Question` e `Answer` são tipos reconhecidos e elegíveis para
 * resultados enriquecidos.
 */
export function generateQuizSchema(opts: {
  nome: string;
  descricao: string;
  url: string;
  perguntas: {
    pergunta: string;
    respostaCerta: string;
    explicacao: string;
    respostasErradas: string[];
  }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: opts.nome,
    description: opts.descricao,
    url: `${SITE_URL}${opts.url}`,
    inLanguage: "pt-PT",
    educationalLevel: "beginner",
    about: { "@type": "Thing", name: "Fiscalidade portuguesa" },
    hasPart: opts.perguntas.map((p) => ({
      "@type": "Question",
      eduQuestionType: "Multiple choice",
      name: p.pergunta,
      acceptedAnswer: {
        "@type": "Answer",
        text: p.respostaCerta,
        explanation: p.explicacao,
      },
      suggestedAnswer: p.respostasErradas.map((t) => ({
        "@type": "Answer",
        text: t,
      })),
    })),
  };
}

// ─── Schema: Article (guias) ─────────────────────────────────────────────────

export function generateArticleSchema(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    inLanguage: "pt-PT",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}${opts.path}`,
    },
    url: `${SITE_URL}${opts.path}`,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    dateModified: opts.dateModified ?? opts.datePublished,
  };
}
