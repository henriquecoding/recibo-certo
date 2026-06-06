import type { MetadataRoute } from "next";

const SITE_URL = "https://recibocerto.pt";

const GUIAS = [
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
];

const FERRAMENTAS = [
  "ato-isolado",
  "regime-simplificado",
  "classificar-atividade",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/precos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guias`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...GUIAS.map((slug) => ({
      url: `${SITE_URL}/guias/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/ferramentas`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...FERRAMENTAS.map((slug) => ({
      url: `${SITE_URL}/ferramentas/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
