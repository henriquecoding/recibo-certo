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
const BENEFICIO_DERRAMA_INTERIOR: BeneficioRegiao = {
  titulo: "Derrama municipal tipicamente mais baixa (0–1%)",
  detalhe:
    "Os municípios do interior e de baixa densidade tendem a fixar a derrama municipal abaixo do máximo legal de 1,5% — muitos a 0% ou a 0,5%. Confirma a taxa do teu município.",
  base: "Art. 18.º Lei das Finanças Locais · Portais municipais",
};
const BENEFICIO_DLRR: BeneficioRegiao = {
  titulo: "DLRR: 10% dos lucros reinvestidos",
  detalhe:
    "PME e Small Mid Cap podem deduzir ao IRC 10% dos lucros retidos e reinvestidos em ativos elegíveis, até 25% da coleta. Saldo reportável por 12 exercícios.",
  base: "Art. 27.º–34.º CFI",
};
const BENEFICIO_SIFIDE: BeneficioRegiao = {
  titulo: "SIFIDE II: até 82,5% de despesas de I&D",
  detalhe:
    "Crédito fiscal de 32,5% (base) + 50% incremental das despesas de investigação e desenvolvimento. Sem limite à coleta; saldo reportável por 12 exercícios.",
  base: "Art. 35.º–42.º CFI",
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
      BENEFICIO_DLRR,
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
      BENEFICIO_DLRR,
    ],
  },
  {
    ...pick(ref("alentejo")),
    nivel: 0.9,
    selo: "Interior 12,5%",
    headline: "Grande parte é interior: IRC 12,5% + RFAI 30%",
    beneficios: [BENEFICIO_INTERIOR, BENEFICIO_RFAI_30, BENEFICIO_DERRAMA_INTERIOR, BENEFICIO_DLRR],
  },
  {
    ...pick(ref("centro")),
    nivel: 0.85,
    selo: "Interior 12,5%",
    headline: "Vasto interior (Beira, Guarda): IRC 12,5% + RFAI 30%",
    beneficios: [BENEFICIO_INTERIOR, BENEFICIO_RFAI_30, BENEFICIO_DERRAMA_INTERIOR, BENEFICIO_DLRR],
  },
  {
    ...pick(ref("norte")),
    nivel: 0.8,
    selo: "Interior 12,5%",
    headline: "Interior (Trás-os-Montes, Douro): IRC 12,5% + RFAI 30%",
    beneficios: [BENEFICIO_INTERIOR, BENEFICIO_RFAI_30, BENEFICIO_DERRAMA_INTERIOR, BENEFICIO_DLRR],
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
      BENEFICIO_DLRR,
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

// ─── Parâmetros fiscais por região (para o simulador de empresa) ────────────

export interface ParametrosFiscaisRegiao {
  regiaoId: string;
  nome: string;
  interior: boolean;
  ircPME: number;
  ircGeral: number;
  derramaEstimada: number;
  rfaiTipo: "interior" | "litoral";
  rfaiTaxa: number;
  contabMin: number;
  contabMax: number;
  selo: string;
}

const contab = (id: string) => {
  const r = REGIOES_PRECO.find((p) => p.id === id);
  return r ? { contabMin: r.min, contabMax: r.max } : { contabMin: 60, contabMax: 130 };
};

const PARAMS_REGIAO: Record<string, ParametrosFiscaisRegiao> = {
  norte: {
    regiaoId: "norte", nome: "Norte (interior)", interior: true,
    ircPME: IRC_INTERIOR, ircGeral: IRC_INTERIOR,
    derramaEstimada: 0.005, rfaiTipo: "interior", rfaiTaxa: RFAI_TAXA_INTERIOR.value,
    ...contab("norte"), selo: "IRC 12,5%",
  },
  norte_litoral: {
    regiaoId: "norte", nome: "Norte (Porto, litoral)", interior: false,
    ircPME: IRC_TAXA_PME.value, ircGeral: IRC_TAXA_GERAL.value,
    derramaEstimada: 0.0125, rfaiTipo: "interior", rfaiTaxa: RFAI_TAXA_INTERIOR.value,
    ...contab("norte"), selo: "IRC 15%",
  },
  centro: {
    regiaoId: "centro", nome: "Centro (interior)", interior: true,
    ircPME: IRC_INTERIOR, ircGeral: IRC_INTERIOR,
    derramaEstimada: 0.005, rfaiTipo: "interior", rfaiTaxa: RFAI_TAXA_INTERIOR.value,
    ...contab("centro"), selo: "IRC 12,5%",
  },
  centro_litoral: {
    regiaoId: "centro", nome: "Centro (Coimbra, Leiria, litoral)", interior: false,
    ircPME: IRC_TAXA_PME.value, ircGeral: IRC_TAXA_GERAL.value,
    derramaEstimada: 0.01, rfaiTipo: "interior", rfaiTaxa: RFAI_TAXA_INTERIOR.value,
    ...contab("centro"), selo: "IRC 15%",
  },
  alentejo: {
    regiaoId: "alentejo", nome: "Alentejo", interior: true,
    ircPME: IRC_INTERIOR, ircGeral: IRC_INTERIOR,
    derramaEstimada: 0.005, rfaiTipo: "interior", rfaiTaxa: RFAI_TAXA_INTERIOR.value,
    ...contab("alentejo"), selo: "IRC 12,5%",
  },
  algarve: {
    regiaoId: "algarve", nome: "Algarve", interior: false,
    ircPME: IRC_TAXA_PME.value, ircGeral: IRC_TAXA_GERAL.value,
    derramaEstimada: 0.01, rfaiTipo: "litoral", rfaiTaxa: RFAI_TAXA_LITORAL.value,
    ...contab("algarve"), selo: "IRC 15%",
  },
  aml: {
    regiaoId: "aml", nome: "Área Metropolitana de Lisboa", interior: false,
    ircPME: IRC_TAXA_PME.value, ircGeral: IRC_TAXA_GERAL.value,
    derramaEstimada: 0.015, rfaiTipo: "litoral", rfaiTaxa: RFAI_TAXA_LITORAL.value,
    ...contab("aml"), selo: "IRC 15%",
  },
  acores: {
    regiaoId: "acores", nome: "Região Autónoma dos Açores", interior: false,
    ircPME: IRC_ACORES_PME, ircGeral: IRC_ACORES_GERAL,
    derramaEstimada: 0.0, rfaiTipo: "interior", rfaiTaxa: RFAI_TAXA_INTERIOR.value,
    ...contab("acores"), selo: "IRC 8,75%",
  },
  madeira: {
    regiaoId: "madeira", nome: "Região Autónoma da Madeira", interior: false,
    ircPME: IRC_TAXA_PME.value, ircGeral: IRC_TAXA_GERAL.value,
    derramaEstimada: 0.015, rfaiTipo: "interior", rfaiTaxa: RFAI_TAXA_INTERIOR.value,
    ...contab("madeira"), selo: "IRC 15%",
  },
};

export function parametrosFiscaisPorRegiao(regiaoId: string, isInterior?: boolean): ParametrosFiscaisRegiao {
  if (regiaoId === "norte" || regiaoId === "centro") {
    return isInterior === false
      ? PARAMS_REGIAO[`${regiaoId}_litoral`]
      : PARAMS_REGIAO[regiaoId];
  }
  return PARAMS_REGIAO[regiaoId] ?? PARAMS_REGIAO.aml;
}

export function parametrosPorCoords(lat: number, lng: number): ParametrosFiscaisRegiao {
  const regiao = regiaoIncentivoMaisProxima(lat, lng);
  return parametrosFiscaisPorRegiao(regiao.id);
}

export const TODAS_LOCALIZACOES: ParametrosFiscaisRegiao[] = [
  PARAMS_REGIAO.norte,
  PARAMS_REGIAO.norte_litoral,
  PARAMS_REGIAO.centro,
  PARAMS_REGIAO.centro_litoral,
  PARAMS_REGIAO.alentejo,
  PARAMS_REGIAO.aml,
  PARAMS_REGIAO.algarve,
  PARAMS_REGIAO.acores,
  PARAMS_REGIAO.madeira,
];
