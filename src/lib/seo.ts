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

export const SITE_URL = "https://www.recibocerto.pt";
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

/** Slugs dos guias em `src/app/guias/<slug>`. */
export const GUIA_SLUGS = [
  "abrir-atividade",
  "ato-isolado",
  "regime-simplificado",
  "retencao-na-fonte",
  "iva-recibos-verdes",
  "seguranca-social",
  "irs-jovem",
  "escaloes-irs",
  "acumulacao-emprego",
  "clientes-estrangeiros",
  "cessar-atividade",
  "deducoes-coleta",
  "merchant-of-record",
  "fatura-vs-recibo",
] as const;

/** Slugs das ferramentas em `src/app/ferramentas/<slug>`. */
export const FERRAMENTA_SLUGS = [
  "ato-isolado",
  "regime-simplificado",
  "classificar-atividade",
  "payout-mor",
  "recibo-vencimento",
  "auditoria-recibo",
  "simulador-empresa",
  "mapa-contabilistas",
] as const;

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/",            changeFrequency: "weekly",  priority: 1.0 },
  { path: "/precos",      changeFrequency: "monthly", priority: 0.8 },
  { path: "/quiz-fiscal", changeFrequency: "monthly", priority: 0.7 },
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
      "Quiz Fiscal com gamificação e cupões Pro",
      "15 guias fiscais detalhados para trabalhadores independentes",
      "Mapa de contabilistas em Portugal",
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
