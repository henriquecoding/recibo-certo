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

export const SITE_URL = "https://recibocerto.pt";
export const SITE_NAME = "ReciboCerto";

// ─── Rotas públicas (para sitemap) ───────────────────────────────────────────

export const SITE_ROUTES = [
  { url: "/",            changeFrequency: "weekly"  as const, priority: 1.0 },
  { url: "/precos",      changeFrequency: "monthly" as const, priority: 0.8 },
  { url: "/privacidade", changeFrequency: "monthly" as const, priority: 0.5 },
  { url: "/termos",      changeFrequency: "monthly" as const, priority: 0.5 },
  { url: "/cookies",     changeFrequency: "monthly" as const, priority: 0.5 },
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
      "Calculadora de recibos verdes para trabalhadores independentes em Portugal. IRS, Segurança Social e IVA com as taxas de 2026, verificadas com fonte legal.",
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
      width: 120,
      height: 32,
    },
    description:
      "Copiloto financeiro para trabalhadores independentes em Portugal. Calculadora de recibos verdes com IRS, Segurança Social e IVA. Taxas de 2026 verificadas com fonte legal.",
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
      "IRS Portugal 2026",
      "Segurança Social Portugal",
      "IVA isenção artigo 53.º do CIVA",
      "IRS Jovem Portugal",
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
      "Calculadora gratuita de recibos verdes para trabalhadores independentes em Portugal. Calcula IRS, Segurança Social e IVA com taxas verificadas de 2026. Grátis, sem registo.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Calculadora de recibos verdes — grátis para sempre",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Cálculo de IRS com retenção na fonte (23%)",
      "Segurança Social para trabalhador independente (21,4%)",
      "Limite de IVA artigo 53.º do CIVA (15.000 € em 2026)",
      "IRS Jovem 2026 com isenção crescente por anos",
      "Simulador comparativo recibos verdes vs. empresa (IRC + dividendos)",
      "Calendário de prazos fiscais com alertas antecipados",
      "Exportação de dados para o contabilista",
    ],
    softwareVersion: "2026",
    releaseNotes:
      "Atualizado para o Orçamento do Estado 2025/2026. Taxa de retenção na fonte 23%, limite de isenção de IVA 15.000 €, IRS Jovem revisto.",
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
