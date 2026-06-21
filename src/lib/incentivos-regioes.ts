// ─────────────────────────────────────────────────────────────────────
//  Incentivos e benefícios fiscais por região (NUTS II) — para o mapa
//  "Onde vale a pena instalar a atividade/empresa".
//  ---------------------------------------------------------------------
//  IMPORTANTE: ao contrário das estimativas de preços de contabilistas, estes
//  são DADOS FISCAIS reais (taxas e benefícios legais). Cada item traz a base
//  legal. As taxas-chave (IRC PME, RFAI, DLRR, SIFIDE, IFICI, derrama) vivem na
//  fonte de verdade `fiscal-data.ts`; aqui acrescentam-se os regimes regionais
//  verificados em fontes oficiais (ver `INCENTIVOS_FONTES`).
//
//  CAVEAT DE EXATIDÃO: a "interioridade" (IRC 12,5% — Art. 41.º-B EBF) aplica-se
//  a CONCELHOS específicos classificados como territórios do interior / baixa
//  densidade (Portaria n.º 208/2017), e não a uma região NUTS II inteira. Por
//  isso o texto fala sempre nos "concelhos do interior" de cada região, e o
//  utilizador é remetido para confirmar o seu concelho. As Regiões Autónomas
//  (Madeira/Açores) têm regimes próprios que se aplicam a toda a região.
// ─────────────────────────────────────────────────────────────────────

import {
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  RFAI_TAXA_INTERIOR,
  RFAI_TAXA_LITORAL,
} from "@/lib/fiscal-data";
import { REGIOES_PRECO, regiaoMaisProxima } from "@/lib/contabilista-regioes";

/** Data da última verificação dos regimes regionais (fontes oficiais). */
export const INCENTIVOS_VERIFICADO = "2026-06-19";

/** Taxa de IRC reduzida para territórios do interior — Art. 41.º-B EBF. */
export const IRC_INTERIOR = 0.125;
/** IRC geral nos Açores (redução regional de 30% sobre a taxa nacional). */
export const IRC_ACORES_GERAL = 0.133;
/** IRC PME nos Açores (taxa especial regional). */
export const IRC_ACORES_PME = 0.0875;
/** IRC no Centro Internacional de Negócios da Madeira (Zona Franca). */
export const IRC_MADEIRA_ZF = 0.05;

export interface BeneficioRegiao {
  titulo: string;
  detalhe: string;
  /** Base legal / fonte (sempre presente — nada inventado). */
  base: string;
}

export interface RegiaoIncentivo {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  referencia: string;
  /** Nível de incentivo 0–1 (mais alto = mais benefícios → cor mais profunda). */
  nivel: number;
  /** Selo curto para o pin do mapa (tem de caber num pill estreito). */
  selo: string;
  /** Frase-resumo do destaque da região. */
  headline: string;
  beneficios: BeneficioRegiao[];
}

const ref = (id: string) => REGIOES_PRECO.find((r) => r.id === id)!;

// Texto reutilizado (interioridade) — mesmo regime nos concelhos do interior
// de Norte, Centro e Alentejo.
const BENEFICIO_INTERIOR: BeneficioRegiao = {
  titulo: `IRC reduzido a ${(IRC_INTERIOR * 100).toLocaleString("pt-PT")}% no interior`,
  detalhe: `PME com direção efetiva num concelho do interior pagam ${(IRC_INTERIOR * 100).toLocaleString(
    "pt-PT"
  )}% sobre os primeiros ${IRC_LIMITE_PME.value.toLocaleString("pt-PT")} € de matéria coletável (em vez de ${(
    IRC_TAXA_PME.value * 100
  ).toLocaleString("pt-PT")}%). Verifica se o teu concelho é território do interior.`,
  base: "Art. 41.º-B EBF · Portaria n.º 208/2017 (territórios do interior)",
};
const BENEFICIO_RFAI_30: BeneficioRegiao = {
  titulo: `RFAI: ${(RFAI_TAXA_INTERIOR.value * 100).toLocaleString("pt-PT")}% do investimento`,
  detalhe: `Crédito de IRC de ${(RFAI_TAXA_INTERIOR.value * 100).toLocaleString(
    "pt-PT"
  )}% sobre o investimento elegível (até 15 M€), por estar fora de Lisboa e Algarve. Abate à coleta de IRC.`,
  base: "Art. 23.º CFI (DL 162/2014)",
};
const BENEFICIO_RFAI_10: BeneficioRegiao = {
  titulo: `RFAI: ${(RFAI_TAXA_LITORAL.value * 100).toLocaleString("pt-PT")}% do investimento`,
  detalhe: `Crédito de IRC de ${(RFAI_TAXA_LITORAL.value * 100).toLocaleString(
    "pt-PT"
  )}% sobre o investimento elegível — taxa do litoral (Lisboa e Algarve).`,
  base: "Art. 23.º CFI (DL 162/2014)",
};

export const REGIOES_INCENTIVO: RegiaoIncentivo[] = [
  {
    ...pick(ref("madeira")),
    nivel: 1.0,
    selo: "IRC 5% (ZF)",
    headline: "Zona Franca: IRC de 5% com criação de emprego",
    beneficios: [
      {
        titulo: "IRC de 5% no Centro Internacional de Negócios",
        detalhe:
          "Empresas licenciadas na Zona Franca da Madeira pagam IRC de 5% até 2033, com requisitos de substância (criação de postos de trabalho e investimento mínimo de 75 000 €). Novas licenças até final de 2026.",
        base: "Regime CINM/ZFM (prorrogado pelo OE2026 até 2033)",
      },
      BENEFICIO_RFAI_30,
      {
        titulo: "IVA reduzido (4% / 5% / 12%)",
        detalhe: "A Madeira aplica taxas de IVA próprias, mais baixas do que no Continente (reduzida de 4% desde out/2024).",
        base: "Art. 18.º CIVA · DLR 6/2024/M",
      },
    ],
  },
  {
    ...pick(ref("acores")),
    nivel: 0.95,
    selo: "IRC −30%",
    headline: "Redução regional de 30% no IRC e no IVA",
    beneficios: [
      {
        titulo: `IRC geral ${(IRC_ACORES_GERAL * 100).toLocaleString("pt-PT")}% · PME ${(IRC_ACORES_PME * 100).toLocaleString("pt-PT")}%`,
        detalhe: `Empresas com sede fiscal nos Açores beneficiam de uma redução de 30% sobre as taxas nacionais: ${(
          IRC_ACORES_GERAL * 100
        ).toLocaleString("pt-PT")}% de taxa geral e ${(IRC_ACORES_PME * 100).toLocaleString(
          "pt-PT"
        )}% para micro/PME (vs ${(IRC_TAXA_GERAL.value * 100).toLocaleString("pt-PT")}% / ${(
          IRC_TAXA_PME.value * 100
        ).toLocaleString("pt-PT")}% no Continente).`,
        base: "DLR 27/2025/A · Lei das Finanças das Regiões Autónomas",
      },
      BENEFICIO_RFAI_30,
      {
        titulo: "IVA reduzido",
        detalhe: "Os Açores aplicam taxas de IVA próprias, inferiores às do Continente.",
        base: "Art. 18.º CIVA",
      },
    ],
  },
  {
    ...pick(ref("alentejo")),
    nivel: 0.9,
    selo: "Interior 12,5%",
    headline: "Grande parte é interior: IRC 12,5% + RFAI 30%",
    beneficios: [BENEFICIO_INTERIOR, BENEFICIO_RFAI_30],
  },
  {
    ...pick(ref("centro")),
    nivel: 0.85,
    selo: "Interior 12,5%",
    headline: "Vasto interior (Beira, Guarda): IRC 12,5% + RFAI 30%",
    beneficios: [BENEFICIO_INTERIOR, BENEFICIO_RFAI_30],
  },
  {
    ...pick(ref("norte")),
    nivel: 0.8,
    selo: "Interior 12,5%",
    headline: "Interior (Trás-os-Montes, Douro): IRC 12,5% + RFAI 30%",
    beneficios: [BENEFICIO_INTERIOR, BENEFICIO_RFAI_30],
  },
  {
    ...pick(ref("algarve")),
    nivel: 0.4,
    selo: "RFAI 10%",
    headline: "Litoral (RFAI 10%); baixa densidade pontual a 12,5%",
    beneficios: [
      BENEFICIO_RFAI_10,
      {
        titulo: "Interior 12,5% só em concelhos de baixa densidade",
        detalhe:
          "A maior parte do Algarve é litoral, mas concelhos de baixa densidade (ex.: Alcoutim, Monchique) podem qualificar-se como território do interior, com IRC de 12,5%.",
        base: "Art. 41.º-B EBF · Portaria n.º 208/2017",
      },
    ],
  },
  {
    ...pick(ref("aml")),
    nivel: 0.2,
    selo: "Padrão",
    headline: "Regime-padrão: sem interioridade, derrama mais alta",
    beneficios: [
      BENEFICIO_RFAI_10,
      {
        titulo: "IRC PME 15% nos primeiros 50 000 €",
        detalhe: `Aplica-se o regime geral: ${(IRC_TAXA_PME.value * 100).toLocaleString(
          "pt-PT"
        )}% até ${IRC_LIMITE_PME.value.toLocaleString("pt-PT")} € e ${(IRC_TAXA_GERAL.value * 100).toLocaleString(
          "pt-PT"
        )}% acima. Sem benefício de interioridade.`,
        base: "Art. 87.º CIRC",
      },
      {
        titulo: "Derrama municipal tende a ser a máxima",
        detalhe:
          "Os municípios da Área Metropolitana de Lisboa costumam aplicar a derrama perto do máximo legal (1,5% do lucro tributável). Confirma a taxa do teu município.",
        base: "Derrama municipal — Art. 18.º Lei das Finanças Locais",
      },
    ],
  },
];

/** Incentivos disponíveis em TODO o país (independentes da região). */
export const INCENTIVOS_NACIONAIS: BeneficioRegiao[] = [
  {
    titulo: `IRC PME ${(IRC_TAXA_PME.value * 100).toLocaleString("pt-PT")}% nos primeiros ${IRC_LIMITE_PME.value.toLocaleString("pt-PT")} €`,
    detalhe: `Taxa reduzida para micro/PME sobre os primeiros ${IRC_LIMITE_PME.value.toLocaleString(
      "pt-PT"
    )} € de matéria coletável; o restante a ${(IRC_TAXA_GERAL.value * 100).toLocaleString("pt-PT")}%.`,
    base: "Art. 87.º CIRC",
  },
  {
    titulo: "DLRR — 10% dos lucros reinvestidos",
    detalhe: "Dedução à coleta de 10% dos lucros retidos e reinvestidos em ativos elegíveis (PME).",
    base: "Art. 27.º–34.º CFI",
  },
  {
    titulo: "SIFIDE II — até 82,5% de I&D",
    detalhe: "Crédito fiscal de 32,5% (base) + 50% incremental das despesas de investigação e desenvolvimento.",
    base: "Art. 35.º–42.º CFI",
  },
  {
    titulo: "IFICI — 20% para quadros qualificados",
    detalhe: "Taxa de IRS de 20% sobre rendimentos de atividades qualificadas (ex-RNH), por 10 anos.",
    base: "Art. 58.º-A EBF",
  },
];

/** Fontes oficiais consultadas para os regimes regionais. */
export const INCENTIVOS_FONTES: { label: string; url: string }[] = [
  { label: "OCC — IRC nas regiões do interior (12,5%)", url: "https://www.occ.pt/pt-pt/noticias/irc-beneficios-fiscais-para-empresas-sediadas-no-interior" },
  { label: "PwC — Guia Fiscal 2026 (IRC)", url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irc.html" },
  { label: "PwC — RA Açores, Orçamento 2026", url: "https://www.pwc.pt/pt/pwcinforfisco/flash/outros/regiao-autonoma-acores-orcamento-2026.html" },
  { label: "IBC Madeira — Benefícios fiscais (CINM)", url: "https://www.ibc-madeira.com/pt/tax-benefits.html" },
];

export function pick(r: { id: string; nome: string; lat: number; lng: number; referencia: string }) {
  return { id: r.id, nome: r.nome, lat: r.lat, lng: r.lng, referencia: r.referencia };
}

/** Região de incentivo cujo centro está mais próximo (reutiliza a haversine). */
export function regiaoIncentivoMaisProxima(lat: number, lng: number): RegiaoIncentivo {
  const id = regiaoMaisProxima(lat, lng).id;
  return REGIOES_INCENTIVO.find((r) => r.id === id) ?? REGIOES_INCENTIVO[0];
}
