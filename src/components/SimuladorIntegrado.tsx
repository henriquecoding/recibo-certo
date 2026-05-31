"use client";

/**
 * SimuladorIntegrado.tsx — Simulador Fiscal Portugal 2026
 * ═══════════════════════════════════════════════════════════════════
 *
 * FONTES LEGAIS UTILIZADAS (todos os valores são 2026):
 *
 * IRS:
 *  · Art. 31.º CIRS — coeficientes regime simplificado
 *    - 0,75 → prestações de serviços / profissões liberais (Art. 151.º)
 *    - 0,15 → vendas de mercadorias
 *    - 0,35 → alojamento local / hotelaria / outras prestações
 *    - 0,75 → propriedade intelectual / direitos de autor
 *  · Art. 68.º CIRS — escalões IRS 2026 (atualizados 3,51% OE2026)
 *    Mínimo de existência: 12 880€ (OE2026, SMN 920€/mês)
 *  · Art. 101.º e 101.º-B CIRS — retenção na fonte
 *    - 23% profissões liberais Art. 151.º (desceu de 25% no OE2025)
 *    - 16,5% propriedade intelectual
 *    - 11,5% outras prestações não Art. 151.º
 *    - 0% vendas / hotelaria / alojamento local
 *    Dispensa: faturação < 15 000€/ano OU 1.º ano atividade
 *  · Art. 12.º-B CIRS — IRS Jovem (OE2025, em vigor a partir 2025)
 *    Isenção: 100%/75%/75%/75%/50%/50%/50%/25%/25%/25% (anos 1–10)
 *    Limite: 55×IAS = 29 542,15€/ano (IAS 2026 = 537,13€)
 *    Idade máxima: 35 anos. Aplica-se a Cat. A e Cat. B.
 *    Conta anos desde 1.º rendimento como não-dependente.
 *  · Solidariedade adicional: 2,5% (80 000€–250 000€), 5% (> 250 000€)
 *
 * Segurança Social (trabalhadores independentes):
 *  · Código Regimes Contributivos (CRC) — Dec. Lei 110/2009
 *    - Taxa: 21,4% sobre 70% do rendimento relevante
 *    - Rendimento relevante: faturação trimestre anterior × 70% ÷ 3
 *    - Mínimo: 20€/mês
 *    - Máximo: 12 × IAS × 21,4% = 12 × 537,13 × 0,214 ≈ 1 379,37€/mês
 *    - IAS 2026: 537,13€
 *  · Isenção 1.º ano: automática (12 meses desde abertura de atividade)
 *  · Isenção acumulação: rendimento SS do emprego ≥ 1×IAS E
 *    rendimento médio mensal relevante de TI < 4×IAS (2 148,52€)
 *  · SS dedutível ao rendimento tributável IRS (art. 31.º n.º 2 CIRS)
 *
 * IVA (CIVA):
 *  · Art. 53.º CIVA — isenção até 15 000€/ano (2026)
 *    Se ultrapassar 25% → transição imediata aos 18 750€
 *    Se terminar o ano entre 15 001€–18 750€ → troca em 1-jan do ano seguinte
 *  · Art. 9.º CIVA — isenção por natureza (médicos, enfermeiros, psicólogos,
 *    professores, formadores, músicos — sem limite de faturação)
 *  · Taxas continente: reduzida 6%, intermédia 13%, normal 23%
 *  · Taxas Açores: reduzida 4%, intermédia 9%, normal 16%
 *  · Taxas Madeira: reduzida 5%, intermédia 12%, normal 22%
 *
 * IRC (sociedades):
 *  · Lei n.º 73-A/2025 (OE2026):
 *    - Taxa geral: 19% (desceu de 20% em 2025)
 *    - PME + Small Mid Cap: 15% sobre primeiros 50 000€
 *    - PME: excedente a 50 000€ → 19%
 *  · Derrama municipal: até 1,5% (Lisboa, Porto e maioria dos concelhos)
 *  · Derrama estadual: só acima de 1 500 000€ de lucro (irrelevante para PME)
 *  · IRS dividendos: 28% (taxa liberatória, Art. 71.º CIRS)
 *  · SS gerente: empresa 23,75% + trabalhador 11% sobre salário bruto
 *
 * Correções aplicadas:
 *  · [BUG1] Thumb slider: contentor agora tem h-8, visual bar absoluta em
 *    top-1/2 -translate-y-1/2. Thumb 100% dentro do hit area — sem deslocamento.
 *  · [BUG2] IVA: removido toggle "Com IVA incluído / IVA à parte" que entrava
 *    em conflito com o seletor de regime IVA. Input sempre em base pré-IVA.
 *  · [BUG3] Inputs: adicionado clampFree (só min/max, sem step) para inputs de
 *    texto — permite qualquer valor decimal. clamp com step mantido apenas para
 *    arrastar slider e botões ±.
 */

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  ChangeEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { m, AnimatePresence } from "motion/react";
import Link from "next/link";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Check, Warning } from "@/components/ui/Icons";
import { pct, fmt } from "@/lib/format";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import InfoTip from "@/components/ui/InfoTip";
import {
  IVA_TAXAS,
  ATIVIDADES,
  META_REGIAO,
  META_BASE_SS,
  IRS_JOVEM,
  DISPENSA_RETENCAO_LIMITE,
  type Atividade,
  type Regiao,
  type BaseSS,
  type EscalaoIVA,
} from "@/lib/fiscal-data";
import { calcular, taxaIVAEfetiva, type RegimeIVA } from "@/lib/fiscal";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES FISCAIS 2026
// ─────────────────────────────────────────────────────────────────────────────

const IAS_2026 = 537.13;
const MINIMO_EXISTENCIA_2026 = 12_880;
const SS_TAXA_TI = 0.214;
const SS_BASE_PCT = 0.7;
const SS_MAX_MENSAL = 12 * IAS_2026 * SS_TAXA_TI;
const SS_MIN_MENSAL = 20;
const IVA_ISENCAO_LIMITE = 15_000;
const IVA_ISENCAO_LIMITE_IMEDIATO = 18_750;
const IRS_JOVEM_LIMITE_2026 = 55 * IAS_2026;

const IRS_JOVEM_ISENCAO: Record<number, number> = {
  1: 1.0,
  2: 0.75,
  3: 0.75,
  4: 0.75,
  5: 0.5,
  6: 0.5,
  7: 0.5,
  8: 0.25,
  9: 0.25,
  10: 0.25,
};

const IRS_JOVEM_IDADE_MAX = 35;

const ESCALOES_IRS_2026 = [
  { ate: 8_342, taxa: 0.125 },
  { ate: 12_587, taxa: 0.167 },
  { ate: 17_838, taxa: 0.212 },
  { ate: 23_089, taxa: 0.241 },
  { ate: 29_400, taxa: 0.311 },
  { ate: 43_092, taxa: 0.364 },
  { ate: 80_000, taxa: 0.45 },
  { ate: 250_000, taxa: 0.48 },
  { ate: Infinity, taxa: 0.48 },
] as const;

const TIPO_ATIVIDADE_PARAMS = {
  art151: {
    coef: 0.75,
    ret: 0.23,
    label: "Profissão liberal — Art. 151.º CIRS",
  },
  vendas: { coef: 0.15, ret: 0.0, label: "Vendas / mercadorias" },
  hosped: { coef: 0.35, ret: 0.0, label: "Alojamento local / hotelaria" },
  outras: { coef: 0.35, ret: 0.115, label: "Outras prestações de serviços" },
  prop_int: {
    coef: 0.75,
    ret: 0.165,
    label: "Propriedade intelectual / direitos de autor",
  },
} as const;

type TipoAtividade = keyof typeof TIPO_ATIVIDADE_PARAMS;

const DERRAMA_MUNI = 0.015;
const IRS_DIVIDENDOS = 0.28;
const SS_EMP_TAXA = 0.2375;
const SS_TRAB_TAXA = 0.11;

// ─────────────────────────────────────────────────────────────────────────────
// TRIBUTAÇÃO AUTÓNOMA (Art. 88.º CIRC 2026)
// Taxas incidem sobre os ENCARGOS anuais; os limiares referem-se ao CUSTO DE
// AQUISIÇÃO da viatura.
// Combustão: revistas pelo OE2025, em vigor desde 1-jan-2025 (Art. 88.º n.º 3)
//   – OCC: "taxas em vigor desde 1 de janeiro de 2025: 8%, 25%, 32%"
// PHEV: OE2026 alargou a norma Euro 6e-bis com emissões <80 gCO₂/km
//   – Os limiares são os mesmos que combustão (€37 500 e €45 000)
// Elétrica: isenta (excluída explicitamente do Art. 88.º n.º 3)
// ─────────────────────────────────────────────────────────────────────────────

type TipoViatura =
  | "eletrica" // 0% — excluída do Art. 88.º n.º 3
  | "phev_baixo" // PHEV custo aquisição ≤ €37 500 → 2,5%
  | "phev_medio" // PHEV custo aquisição €37 500–€45 000 → 7,5%
  | "phev_alto" // PHEV custo aquisição > €45 000 → 15%
  | "comb_baixo" // Combustão custo aquisição < €37 500 → 8%
  | "comb_medio" // Combustão custo aquisição €37 500–€45 000 → 25%
  | "comb_alto"; // Combustão custo aquisição ≥ €45 000 → 32%

const TA_VIATURAS: Record<TipoViatura, number> = {
  eletrica: 0.0,
  phev_baixo: 0.025,
  phev_medio: 0.075,
  phev_alto: 0.15,
  comb_baixo: 0.08, // Art. 88.º n.º 3 al. a) — OE2025
  comb_medio: 0.25, // Art. 88.º n.º 3 al. b) — OE2025
  comb_alto: 0.32, // Art. 88.º n.º 3 al. c) — OE2025
};

const TIPO_VIATURA_META: Record<TipoViatura, string> = {
  eletrica: "Elétrica — isenta (0%)",
  phev_baixo: "PHEV / Plug-in ≤ 37 500€ aquisição — 2,5%",
  phev_medio: "PHEV / Plug-in 37 500–45 000€ aquisição — 7,5%",
  phev_alto: "PHEV / Plug-in > 45 000€ aquisição — 15%",
  comb_baixo: "Combustão < 37 500€ aquisição — 8%",
  comb_medio: "Combustão 37 500–45 000€ aquisição — 25%",
  comb_alto: "Combustão ≥ 45 000€ aquisição — 32%",
};

const TA_TAXA_REPRESENTACAO = 0.1; // Art. 88.º n.º 7 CIRC
const TA_TAXA_AJUDAS_CUSTO = 0.05; // Art. 88.º n.º 9 CIRC
const TA_TAXA_NAO_DOC = 0.5; // Art. 88.º n.º 1 CIRC
const TA_AGRAVAMENTO = 0.1; // Art. 88.º n.º 14 (OE2026 — renovou excl.)

// ─────────────────────────────────────────────────────────────────────────────
// RFAI — Regime Fiscal de Apoio ao Investimento (Art. 22.º–26.º CFI)
// Vigora até 31-dez-2027 (Lei nº 12/2022, prolongamento do CFI).
// Norte/Centro/Alentejo/Açores/Madeira: 30% (≤ €15M) + 10% (excedente)
// Lisboa/Algarve: 10% flat
// Limite anual: 50% da coleta IRC; 100% nos primeiros 3 períodos de atividade
// Reportável: até ao 10.º período seguinte
// Fontes: estrategor.pt jan-2026, santander.pt abr-2026, start-pme.pt jan-2026
// ─────────────────────────────────────────────────────────────────────────────

type RegiaoRFAI = "interior" | "litoral";

const RFAI_TAXA_INTERIOR = 0.3; // Norte, Centro, Alentejo, Açores, Madeira
const RFAI_TAXA_EXCEDENTE = 0.1; // Parcela > €15M
const RFAI_TAXA_LITORAL = 0.1; // Lisboa, Algarve
const RFAI_LIMITE_INVEST = 15_000_000; // Limiar entre taxa 30% e 10%
const RFAI_LIMITE_COLETA = 0.5; // 50% da coleta (100% nos primeiros 3 anos)

// ─────────────────────────────────────────────────────────────────────────────
// DLRR — Dedução por Lucros Retidos e Reinvestidos (Art. 27.º-A CFI)
// Só PME/Small Mid Cap.
// 10% dos lucros retidos reinvestidos em ativos elegíveis (≤ 4 anos)
// Limite: 25% da coleta IRC
// Lucros elegíveis máximos: €5 000 000
// ─────────────────────────────────────────────────────────────────────────────

const DLRR_TAXA = 0.1;
const DLRR_LIMITE_COLETA = 0.25;
const DLRR_MAX_LUCROS = 5_000_000;

// ─────────────────────────────────────────────────────────────────────────────
// SIFIDE II — Sistema de Incentivos Fiscais I&D (Art. 37.º–40.º CFI/EBF)
//
// Taxa base: 32,5% das despesas elegíveis do exercício (todas as empresas)
// Taxa incremental: 50% do acréscimo vs. média dos 2 anos anteriores (max €1,5M)
// PME < 2 exercícios sem histórico incremental: majoração +15% → taxa = 47,5%
// Startup sem I&D nos 2 anos anteriores: base 32,5% + incremental 50% = 82,5%
// Reportável: até ao 12.º exercício seguinte (ANI, Ayming, Zabala 2026)
//
// Fonte OCC: "32,5% x aplicações + 50% x aplicações = 82,5%" (sem histórico)
// ─────────────────────────────────────────────────────────────────────────────

type TipoEmpresaSifide = "startup" | "pme_jovem" | "pme_normal" | "grande";

const SIFIDE_TAXA_BASE = 0.325; // 32,5% — base obrigatória
const SIFIDE_TAXA_INCREMENTAL = 0.5; // 50% sobre acréscimo (max €1,5M)
const SIFIDE_MAJORACAO_PME = 0.15; // +15% para PME <2 exercícios sem increm.
const SIFIDE_MAX_INCREMENTAL = 1_500_000;

// ─────────────────────────────────────────────────────────────────────────────
// ENGLOBAMENTO DE DIVIDENDOS (Art. 40.º-A CIRS)
// Só 50% dos dividendos de entidades nacionais incluído no rendimento coletável
// Tributado às taxas progressivas do IRS (vs. 28% liberatória do Art. 71.º)
// ─────────────────────────────────────────────────────────────────────────────

const DIV_INCLUSAO_ENGLOBAMENTO = 0.5;

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOS TÍPICOS (estimativas 2026 para o simulador)
// ─────────────────────────────────────────────────────────────────────────────

const CUSTO_CONSTITUICAO_DEFAULT = 1_200; // registo (~€360) + setup OCC (~€800)
const CONTAB_ORG_CUSTO_MENSAL = 200; // OCC: €150–300/mês; média conservadora

const IRC_PME = {
  taxa1: 0.15,
  limite: 50_000,
  taxa2: 0.19,
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE CÁLCULO FISCAL
// ─────────────────────────────────────────────────────────────────────────────

function calcularIRS(rendTributavel: number): number {
  if (rendTributavel <= 0) return 0;
  if (rendTributavel <= MINIMO_EXISTENCIA_2026) return 0;

  let imposto = 0;
  let base = rendTributavel;

  for (let i = ESCALOES_IRS_2026.length - 1; i >= 0; i--) {
    const escalao = ESCALOES_IRS_2026[i];
    const prevMax = i > 0 ? ESCALOES_IRS_2026[i - 1].ate : 0;

    if (base > prevMax) {
      const parcelaEscalao = base - prevMax;
      imposto += parcelaEscalao * escalao.taxa;
      base = prevMax;
    }
  }

  return Math.max(0, imposto);
}

/** Taxa marginal do último euro de rendimento tributável — para calcular
 *  o IRS incremental no englobamento de dividendos. */
function calcularTaxaMarginal(rendTributavel: number): number {
  if (rendTributavel <= MINIMO_EXISTENCIA_2026) return 0;
  for (const escalao of ESCALOES_IRS_2026) {
    if (rendTributavel <= escalao.ate) return escalao.taxa;
  }
  return 0.48;
}

function calcularSSAnual(faturacaoAnual: number): number {
  const rendRelevMensal = (faturacaoAnual * SS_BASE_PCT) / 12;
  const contribuicaoMensal = Math.min(
    SS_MAX_MENSAL,
    Math.max(SS_MIN_MENSAL, rendRelevMensal * SS_TAXA_TI),
  );
  return contribuicaoMensal * 12;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIBUTAÇÃO AUTÓNOMA
// ─────────────────────────────────────────────────────────────────────────────

interface ResultadoTA {
  viatura: number;
  representacao: number;
  ajudasCusto: number;
  naoDocumentadas: number;
  total: number;
}

/**
 * Calcula a tributação autónoma (Art. 88.º CIRC).
 * @param encargosViatura  Total de encargos anuais com a viatura (combustível,
 *                         manutenção, seguros, portagens, leasing, etc.)
 * @param tipoViatura      Categoria da viatura (determina a taxa)
 * @param despRepresentacao Despesas de representação (refeições, eventos, ofertas)
 * @param ajudasCusto      Ajudas de custo / compensação por viatura própria
 * @param naoDocumentadas  Despesas sem documento fiscal válido
 * @param emPrejuizo       A empresa está em prejuízo fiscal?
 * @param excecaoPrejuizo  Exclui o agravamento: lucro em ≥1 dos 3 anos ant.
 *                         OU primeiros 3 anos de atividade (OE2026)
 */
function calcularTributacaoAutonoma(
  encargosViatura: number,
  tipoViatura: TipoViatura,
  despRepresentacao: number,
  ajudasCusto: number,
  naoDocumentadas: number,
  emPrejuizo: boolean,
  excecaoPrejuizo: boolean,
): ResultadoTA {
  const agrav = emPrejuizo && !excecaoPrejuizo ? TA_AGRAVAMENTO : 0;
  const taxaViat = TA_VIATURAS[tipoViatura];

  // Elétricas: sempre 0%, sem possibilidade de agravamento
  const viatura =
    tipoViatura === "eletrica" ? 0 : encargosViatura * (taxaViat + agrav);

  const representacao = despRepresentacao * (TA_TAXA_REPRESENTACAO + agrav);
  const ajudas = ajudasCusto * (TA_TAXA_AJUDAS_CUSTO + agrav);
  const naoDoc = naoDocumentadas * (TA_TAXA_NAO_DOC + agrav);

  return {
    viatura,
    representacao,
    ajudasCusto: ajudas,
    naoDocumentadas: naoDoc,
    total: viatura + representacao + ajudas + naoDoc,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BENEFÍCIOS FISCAIS IRC
// ─────────────────────────────────────────────────────────────────────────────

interface ResultadoBeneficios {
  rfai: number; // RFAI efetivo (limitado à coleta)
  rfaiBruto: number; // RFAI antes do limite de coleta
  dlrr: number;
  dlrrBruto: number;
  sifide: number;
  sifideBruto: number;
  total: number;
}

function calcularBeneficios(
  coleta: number,
  rfaiInvest: number,
  regiaoRFAI: RegiaoRFAI,
  dlrrLucros: number,
  sifideDespesas: number,
  tipoSifide: TipoEmpresaSifide,
  primeirosAnos: boolean,
): ResultadoBeneficios {
  // ── RFAI ──────────────────────────────────────────────────────────────────
  let rfaiBruto: number;
  if (regiaoRFAI === "interior") {
    const base = Math.min(rfaiInvest, RFAI_LIMITE_INVEST);
    const excedente = Math.max(0, rfaiInvest - RFAI_LIMITE_INVEST);
    rfaiBruto = base * RFAI_TAXA_INTERIOR + excedente * RFAI_TAXA_EXCEDENTE;
  } else {
    rfaiBruto = rfaiInvest * RFAI_TAXA_LITORAL;
  }
  const maxRFAI = coleta * (primeirosAnos ? 1.0 : RFAI_LIMITE_COLETA);
  const rfai = Math.min(rfaiBruto, Math.max(0, maxRFAI));

  // ── DLRR (só PME) ─────────────────────────────────────────────────────────
  const dlrrBase = Math.min(dlrrLucros, DLRR_MAX_LUCROS);
  const dlrrBruto = dlrrBase * DLRR_TAXA;
  const maxDLRR = Math.max(0, coleta - rfai) * DLRR_LIMITE_COLETA;
  const dlrr = Math.min(dlrrBruto, maxDLRR);

  // ── SIFIDE II ─────────────────────────────────────────────────────────────
  // Simplificação conservadora para o simulador (sem dados de 2 anos anteriores):
  //  startup   → 82,5% (base 32,5% + incremental 50% × tudo, pois média=0)
  //  pme_jovem → 47,5% (base 32,5% + majoração 15% para PME <2 exercícios)
  //  pme_normal→ 32,5% (só base; incremental requer dados históricos reais)
  //  grande    → 32,5% (base conservadora)
  const taxaSifide =
    tipoSifide === "startup"
      ? SIFIDE_TAXA_BASE + SIFIDE_TAXA_INCREMENTAL // 82,5%
      : tipoSifide === "pme_jovem"
        ? SIFIDE_TAXA_BASE + SIFIDE_MAJORACAO_PME // 47,5%
        : SIFIDE_TAXA_BASE; // 32,5%

  const sifideBruto = sifideDespesas * taxaSifide;
  const maxSifide = Math.max(0, coleta - rfai - dlrr);
  const sifide = Math.min(sifideBruto, maxSifide);

  return {
    rfai,
    rfaiBruto,
    dlrr,
    dlrrBruto,
    sifide,
    sifideBruto,
    total: rfai + dlrr + sifide,
  };
}

interface ResultadoAnualRV {
  faturacao: number;
  coeficiente: number;
  rendColetavel: number;
  ssAnual: number;
  isencaoJovemValor: number;
  isencaoJovemPct: number;
  rendTributavel: number;
  irs: number;
  retencaoAnual: number;
  acertoIRS: number;
  liquido: number;
  taxaEfetiva: number;
}

function simularAnualRV(
  faturacao: number,
  tipo: TipoAtividade,
  irsJovemAno: number,
  isencaoSS: boolean,
): ResultadoAnualRV {
  const { coef, ret } = TIPO_ATIVIDADE_PARAMS[tipo];
  const rendColetavel = faturacao * coef;

  const ssAnual = isencaoSS ? 0 : calcularSSAnual(faturacao);

  const isencaoPct =
    irsJovemAno > 0 ? (IRS_JOVEM_ISENCAO[irsJovemAno] ?? 0) : 0;
  const baseJovem = Math.min(rendColetavel, IRS_JOVEM_LIMITE_2026);
  const isencaoJovemValor = baseJovem * isencaoPct;

  const rendTributavel = Math.max(
    0,
    rendColetavel - ssAnual - isencaoJovemValor,
  );

  const irs = calcularIRS(rendTributavel);
  const retencaoAnual = faturacao * ret;
  const acertoIRS = retencaoAnual - irs;

  const liquido = faturacao - irs - ssAnual;

  return {
    faturacao,
    coeficiente: coef,
    rendColetavel,
    ssAnual,
    isencaoJovemValor,
    isencaoJovemPct: isencaoPct,
    rendTributavel,
    irs,
    retencaoAnual,
    acertoIRS,
    liquido,
    taxaEfetiva: faturacao > 0 ? (irs + ssAnual) / faturacao : 0,
  };
}

interface ResultadoEmpresa {
  faturacao: number;
  despesasOper: number;
  custosExtra: number;
  salGerente: number;
  ssSalGerente: number;
  custoConstituicao: number;
  totalCustos: number;
  lucroTributavel: number;
  coleta: number; // IRC base antes de benefícios e TA
  beneficios: ResultadoBeneficios;
  ircAposBeneficios: number;
  ta: ResultadoTA;
  derramaMuni: number;
  ircTotal: number; // ircAposBeneficios + ta.total + derrama
  lucroLiquido: number;
  dividendos: number;
  irsDividendosLiberatoria: number; // 28%
  irsDividendosEnglobamento: number; // 50% inclusão × taxa marginal
  taxaMarginalGerente: number;
  liquidoGerenteLiberatoria: number;
  liquidoGerenteEnglobamento: number;
  liquidoGerente: number; // conforme opcaoEnglobamento
  taxaEfetiva: number;
}

function simularEmpresa(
  faturacao: number,
  despesasOper: number,
  custosExtra: number,
  salGerenteMensal: number,
  distribuirDividendos: boolean,
  opcaoEnglobamento: boolean,
  // Tributação Autónoma
  encargosViatura: number,
  tipoViatura: TipoViatura,
  despRepresentacao: number,
  ajudasCusto: number,
  naoDocumentadas: number,
  emPrejuizo: boolean,
  excecaoPrejuizo: boolean,
  // Benefícios Fiscais
  rfaiInvest: number,
  regiaoRFAI: RegiaoRFAI,
  dlrrLucros: number,
  sifideDespesas: number,
  tipoSifide: TipoEmpresaSifide,
  primeirosAnos: boolean,
  // Custos de constituição (já anualizados)
  custoConstituicao: number,
): ResultadoEmpresa {
  const salGerente = salGerenteMensal * 12;
  const ssSalGerente = salGerente * (SS_EMP_TAXA + SS_TRAB_TAXA);
  const totalCustos =
    despesasOper + custosExtra + salGerente + ssSalGerente + custoConstituicao;
  const lucroTributavel = Math.max(0, faturacao - totalCustos);

  // ── IRC base (coleta) ──────────────────────────────────────────────────────
  let coleta = 0;
  if (lucroTributavel <= IRC_PME.limite) {
    coleta = lucroTributavel * IRC_PME.taxa1;
  } else {
    coleta =
      IRC_PME.limite * IRC_PME.taxa1 +
      (lucroTributavel - IRC_PME.limite) * IRC_PME.taxa2;
  }

  // ── Benefícios fiscais (reduzem coleta) ───────────────────────────────────
  const beneficios = calcularBeneficios(
    coleta,
    rfaiInvest,
    regiaoRFAI,
    dlrrLucros,
    sifideDespesas,
    tipoSifide,
    primeirosAnos,
  );
  const ircAposBeneficios = Math.max(0, coleta - beneficios.total);

  // ── Tributação Autónoma (soma-se ao IRC, não é compensada por benefícios) ─
  const ta = calcularTributacaoAutonoma(
    encargosViatura,
    tipoViatura,
    despRepresentacao,
    ajudasCusto,
    naoDocumentadas,
    emPrejuizo,
    excecaoPrejuizo,
  );

  // ── Derrama municipal ─────────────────────────────────────────────────────
  const derramaMuni = lucroTributavel * DERRAMA_MUNI;

  // ── IRC total ─────────────────────────────────────────────────────────────
  const ircTotal = ircAposBeneficios + ta.total + derramaMuni;

  // ── Lucro líquido disponível para distribuição ────────────────────────────
  const lucroLiquido = Math.max(0, lucroTributavel - ircTotal);

  // ── Dividendos e IRS sobre dividendos ─────────────────────────────────────
  let dividendos = 0;
  let irsDividendosLiberatoria = 0;
  let irsDividendosEnglobamento = 0;
  let taxaMarginalGerente = 0;

  if (distribuirDividendos) {
    dividendos = lucroLiquido;

    // Opção A — taxa liberatória 28% (Art. 71.º CIRS)
    irsDividendosLiberatoria = dividendos * IRS_DIVIDENDOS;

    // Opção B — englobamento (Art. 40.º-A CIRS)
    // Apenas 50% dos dividendos de entidades nacionais incluído no rendimento
    const salarioTributavel = salGerente * (1 - SS_TRAB_TAXA);
    taxaMarginalGerente = calcularTaxaMarginal(salarioTributavel);
    const irsComDividendos = calcularIRS(
      salarioTributavel + dividendos * DIV_INCLUSAO_ENGLOBAMENTO,
    );
    const irsSoSalario = calcularIRS(salarioTributavel);
    irsDividendosEnglobamento = Math.max(0, irsComDividendos - irsSoSalario);
  }

  const salarioLiqGerente = salGerente * (1 - SS_TRAB_TAXA);
  const liquidoGerenteLiberatoria =
    salarioLiqGerente + (dividendos - irsDividendosLiberatoria);
  const liquidoGerenteEnglobamento =
    salarioLiqGerente + (dividendos - irsDividendosEnglobamento);
  const liquidoGerente = opcaoEnglobamento
    ? liquidoGerenteEnglobamento
    : liquidoGerenteLiberatoria;

  return {
    faturacao,
    despesasOper,
    custosExtra,
    salGerente,
    ssSalGerente,
    custoConstituicao,
    totalCustos,
    lucroTributavel,
    coleta,
    beneficios,
    ircAposBeneficios,
    ta,
    derramaMuni,
    ircTotal,
    lucroLiquido,
    dividendos,
    irsDividendosLiberatoria,
    irsDividendosEnglobamento,
    taxaMarginalGerente,
    liquidoGerenteLiberatoria,
    liquidoGerenteEnglobamento,
    liquidoGerente,
    taxaEfetiva: faturacao > 0 ? 1 - liquidoGerente / faturacao : 0,
  };
}

function calcularBreakEven(
  tipo: TipoAtividade,
  custosExtra: number,
  despesasOper: number,
  salGerenteMensal: number,
  custoConstAnual: number,
): number | null {
  for (let v = 0; v <= 200_000; v += 2_000) {
    const rv = simularAnualRV(v, tipo, 0, false);
    const em = simularEmpresa(
      v,
      despesasOper,
      custosExtra,
      salGerenteMensal,
      true,
      false,
      0,
      "comb_baixo",
      0,
      0,
      0,
      false,
      true,
      0,
      "interior",
      0,
      0,
      "pme_normal",
      false,
      custoConstAnual,
    );
    if (em.liquidoGerente > rv.liquido) return v;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E CONSTANTES DE UI
// ─────────────────────────────────────────────────────────────────────────────

type ModoInput = "recibo" | "anual";
type CenarioAtivo = "rv" | "empresa";

const ATIVIDADE_DEFAULT =
  ATIVIDADES.find((a) => a.label.includes("Programador")) ?? ATIVIDADES[0];

const REGIOES = Object.keys(META_REGIAO) as Regiao[];
const BASES_SS = Object.keys(META_BASE_SS) as BaseSS[];
const ESCALOES_IVA: EscalaoIVA[] = ["reduzida", "intermedia", "normal"];
const ESCALAO_LABEL: Record<EscalaoIVA, string> = {
  reduzida: "Reduzida",
  intermedia: "Intermédia",
  normal: "Normal",
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: NumericSlider
// ─────────────────────────────────────────────────────────────────────────────
// CORREÇÕES APLICADAS:
//  [BUG1] Hit area: trackRef agora tem h-8, visual bar é div absoluta centrada.
//         Thumb (h-6) fica 100% dentro do contentor de eventos — sem gap.
//  [BUG3] clampFree: inputs de texto usam clampFree (só min/max, sem step).
//         Slider e botões ± continuam a usar clamp com step.
// ─────────────────────────────────────────────────────────────────────────────

interface NumericSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  presets?: number[];
  formatPreset?: (v: number) => string;
  tooltip?: React.ReactNode;
  breakPoint?: number;
  breakPointLabel?: string;
}

function NumericSlider({
  label,
  value,
  min,
  max,
  step,
  unit = "€",
  onChange,
  presets,
  formatPreset,
  tooltip,
  breakPoint,
  breakPointLabel,
}: NumericSliderProps) {
  const [inputStr, setInputStr] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused) setInputStr(String(value));
  }, [value, focused]);

  // [BUG3 FIX] clamp com step — para slider e botões ±
  const clamp = useCallback(
    (v: number) => Math.round(Math.min(max, Math.max(min, v)) / step) * step,
    [min, max, step],
  );

  // [BUG3 FIX] clampFree sem step — para inputs de texto (aceita qualquer decimal)
  const clampFree = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max],
  );

  const pctVal = ((value - min) / (max - min)) * 100;
  const bePct =
    breakPoint != null ? ((breakPoint - min) / (max - min)) * 100 : null;

  const getFromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const { left, width } = el.getBoundingClientRect();
      return clamp(
        Math.max(0, Math.min(1, (clientX - left) / width)) * (max - min) + min,
      );
    },
    [value, min, max, clamp],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      onChange(getFromPointer(e.clientX));
    },
    [getFromPointer, onChange],
  );
  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (dragging) onChange(getFromPointer(e.clientX));
    },
    [dragging, getFromPointer, onChange],
  );
  const onPointerUp = useCallback(() => setDragging(false), []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const map: Record<string, number> = {
        ArrowRight: step,
        ArrowUp: step,
        ArrowLeft: -step,
        ArrowDown: -step,
        PageUp: step * 10,
        PageDown: -(step * 10),
      };
      const delta = map[e.key];
      if (delta !== undefined) {
        e.preventDefault();
        onChange(clamp(value + delta));
      } else if (e.key === "Home") onChange(min);
      else if (e.key === "End") onChange(max);
    },
    [value, step, min, max, clamp, onChange],
  );

  // [BUG3 FIX] handleInputChange usa clampFree → permite qualquer valor decimal
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,\.]/g, "");
    setInputStr(raw);
    const n = parseFloat(raw.replace(",", "."));
    if (!isNaN(n)) onChange(clampFree(n));
  };

  // [BUG3 FIX] handleInputBlur usa clampFree → não arredonda ao step
  const handleInputBlur = () => {
    setFocused(false);
    const n = parseFloat(inputStr.replace(",", "."));
    const v = isNaN(n) ? value : clampFree(n);
    onChange(v);
    setInputStr(String(v));
  };

  return (
    <div className="space-y-3">
      {/* Linha: label + steppers + input */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {label && (
            <span className="text-sm font-medium uppercase tracking-wider text-stone-500">
              {label}
            </span>
          )}
          {tooltip && <InfoTip>{tooltip}</InfoTip>}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botão − usa clamp com step */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onChange(clamp(value - step));
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition-all hover:border-brand hover:bg-brand-light hover:text-brand-dark active:scale-95 dark:border-stone-700 dark:bg-stone-800"
            aria-label={`Diminuir ${label}`}
          >
            <span className="text-base font-semibold leading-none select-none">
              −
            </span>
          </button>

          <div className="relative">
            {unit === "€" && (
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">
                €
              </span>
            )}
            <input
              type="text"
              inputMode="decimal"
              value={focused ? inputStr : value.toLocaleString("pt-PT")}
              onFocus={() => {
                setFocused(true);
                setInputStr(String(value));
              }}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`h-8 rounded-xl border bg-white text-right text-sm font-semibold text-stone-800 tabular-nums outline-none transition-all dark:bg-stone-900 dark:text-stone-200 ${
                unit === "€" ? "w-28 pl-6 pr-2" : "w-20 px-2"
              } ${
                focused
                  ? "border-brand ring-2 ring-brand/20"
                  : "border-stone-200 hover:border-stone-300 dark:border-stone-700"
              }`}
              aria-label={label}
            />
          </div>

          {/* Botão + usa clamp com step */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onChange(clamp(value + step));
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition-all hover:border-brand hover:bg-brand-light hover:text-brand-dark active:scale-95 dark:border-stone-700 dark:bg-stone-800"
            aria-label={`Aumentar ${label}`}
          >
            <span className="text-base font-semibold leading-none select-none">
              +
            </span>
          </button>
        </div>
      </div>

      {/*
       * [BUG1 FIX] Slider restructured:
       * Antes: balloon (h-7 separado) + track (h-3, ref aqui, thumb absoluto com top-1/2 -translate-y-1/2)
       *        → thumb (h-6=24px) estendia fora do track (h-3=12px), lower half sem eventos
       *
       * Agora: balloon (h-6 separado) + trackRef div (h-8=32px, hit area grande)
       *        → visual bar é absoluta centrada dentro do h-8
       *        → thumb (h-6=24px) centrado via top-1/2/-translate-y-1/2 dentro do h-8
       *        → thumb fica totalmente dentro do hit area: (32-24)/2=4px de margem em cima e baixo
       */}

      {/* Balão flutuante — separado mas sem eventos */}
      <div className="pointer-events-none relative h-6">
        <div
          className="absolute bottom-0 -translate-x-1/2"
          style={{ left: `${Math.min(96, Math.max(4, pctVal))}%` }}
        >
          <span
            className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-semibold text-white transition-colors ${
              dragging ? "bg-brand-dark" : "bg-brand"
            }`}
          >
            {value.toLocaleString("pt-PT")} {unit}
          </span>
        </div>
      </div>

      {/* Hit area (h-8) — ref aqui, capta eventos em toda a altura */}
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`relative h-8 select-none focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* Visual track bar — absoluta e centrada verticalmente dentro do h-8 */}
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-stone-100 dark:bg-stone-800">
          {/* Faixa preenchida */}
          <div
            className="h-full rounded-full bg-brand transition-none"
            style={{ width: `${pctVal}%` }}
          />

          {/* Marcador break-even */}
          {bePct != null && (
            <div
              className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-alert-text"
              style={{ left: `${bePct}%` }}
              aria-hidden
            />
          )}
        </div>

        {/* Thumb — centrado dentro do h-8 (4px de margem top e bottom) */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${pctVal}%` }}
        >
          <m.div
            animate={{ scale: dragging ? 1.15 : 1 }}
            transition={{ duration: 0.1 }}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white shadow-md transition-all dark:bg-stone-900 ${
                dragging
                  ? "border-brand-dark shadow-[0_0_0_4px_rgba(29,158,117,0.2)]"
                  : "border-brand shadow-[0_2px_8px_rgba(29,158,117,0.2)]"
              }`}
            >
              <div className="flex gap-0.5">
                <span className="block h-1.5 w-0.5 rounded-full bg-brand opacity-70" />
                <span className="block h-1.5 w-0.5 rounded-full bg-brand opacity-70" />
                <span className="block h-1.5 w-0.5 rounded-full bg-brand opacity-70" />
              </div>
            </div>
          </m.div>
        </div>
      </div>

      {/* Rótulos min / break-even / max */}
      <div className="relative h-4 text-[11px] text-stone-400 dark:text-stone-600">
        <span className="absolute left-0">
          {min.toLocaleString("pt-PT")} {unit}
        </span>
        {bePct != null && breakPointLabel && (
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap font-semibold text-alert-text"
            style={{ left: `${Math.min(85, Math.max(15, bePct))}%` }}
          >
            {breakPointLabel}
          </span>
        )}
        <span className="absolute right-0">
          {max.toLocaleString("pt-PT")} {unit}+
        </span>
      </div>

      {/* Pré-sets */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                value === p
                  ? "border-brand bg-brand text-white shadow-sm"
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
              }`}
            >
              {formatPreset
                ? formatPreset(p)
                : `${p.toLocaleString("pt-PT")} ${unit}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: DetalheRow
// ─────────────────────────────────────────────────────────────────────────────

type RowType = "neutral" | "deducao" | "warning" | "subtotal" | "beneficio";

function DetalheRow({
  label,
  value,
  type,
  note,
  hideValue = false,
}: {
  label: string;
  value: number;
  type: RowType;
  note?: string;
  hideValue?: boolean;
}) {
  const styles: Record<RowType, string> = {
    neutral: "bg-white border-stone-100 text-stone-700",
    deducao: "bg-clay-bg border-clay-border text-clay-text",
    warning: "bg-alert-bg border-alert-border text-alert-text",
    subtotal: "bg-stone-100 border-stone-200 text-stone-800 font-semibold",
    beneficio: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${styles[type]}`}
    >
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        {note && <span className="text-[11px] opacity-60 mt-0.5">{note}</span>}
      </div>
      {!hideValue && (
        <span className="text-sm font-semibold tabular-nums">
          <AnimatedNumber value={value} />
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: CollapsibleSection — acordeão genérico para seções avançadas
// ─────────────────────────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  badge,
  badgeColor = "stone",
  children,
  defaultOpen = false,
}: {
  title: string;
  badge?: string;
  badgeColor?: "stone" | "brand" | "amber" | "emerald";
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const badgeStyles: Record<string, string> = {
    stone: "bg-stone-100 text-stone-600",
    brand: "bg-brand-light text-brand-dark",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  };
  return (
    <div className="border border-stone-100 rounded-2xl overflow-hidden dark:border-stone-800">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors dark:bg-stone-900 dark:hover:bg-stone-800"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-600 dark:text-stone-400">
            {title}
          </span>
          {badge && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeStyles[badgeColor]}`}
            >
              {badge}
            </span>
          )}
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className={`transition-transform text-stone-400 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 bg-white dark:bg-stone-950">
              {children}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: EmpresaInputs
// ─────────────────────────────────────────────────────────────────────────────

interface EmpresaInputsProps {
  // Parâmetros base
  despesasOper: number;
  custosExtra: number;
  salGerenteMensal: number;
  distribuirDividendos: boolean;
  opcaoEnglobamento: boolean;
  // Tributação Autónoma
  encargosViatura: number;
  tipoViatura: TipoViatura;
  despRepresentacao: number;
  ajudasCusto: number;
  naoDocumentadas: number;
  emPrejuizo: boolean;
  excecaoPrejuizo: boolean;
  // Benefícios Fiscais
  rfaiInvest: number;
  regiaoRFAI: RegiaoRFAI;
  dlrrLucros: number;
  sifideDespesas: number;
  tipoSifide: TipoEmpresaSifide;
  primeirosAnos: boolean;
  // Custos de constituição
  incluirConstituicao: boolean;
  custoConstituicao: number;
  anosAmortizacao: number;
  // Resultados para exibir nos badges
  resultBeneficios: ResultadoBeneficios;
  totalTA: number;
  // Callbacks
  onDespChange: (v: number) => void;
  onCustosChange: (v: number) => void;
  onSalChange: (v: number) => void;
  onDividendosChange: (v: boolean) => void;
  onEnglobamentoChange: (v: boolean) => void;
  onEncargosViaturaChange: (v: number) => void;
  onTipoViaturaChange: (v: TipoViatura) => void;
  onDespRepresentacaoChange: (v: number) => void;
  onAjudasCustoChange: (v: number) => void;
  onNaoDocumentadasChange: (v: number) => void;
  onEmPrejuizoChange: (v: boolean) => void;
  onExcecaoPrejuizoChange: (v: boolean) => void;
  onRfaiInvestChange: (v: number) => void;
  onRegiaoRFAIChange: (v: RegiaoRFAI) => void;
  onDlrrLucrosChange: (v: number) => void;
  onSifideDespesasChange: (v: number) => void;
  onTipoSifideChange: (v: TipoEmpresaSifide) => void;
  onPrimeirosAnosChange: (v: boolean) => void;
  onIncluirConstituicaoChange: (v: boolean) => void;
  onCustoConstituicaoChange: (v: number) => void;
  onAnosAmortizacaoChange: (v: number) => void;
}

function EmpresaInputs({
  despesasOper,
  custosExtra,
  salGerenteMensal,
  distribuirDividendos,
  opcaoEnglobamento,
  encargosViatura,
  tipoViatura,
  despRepresentacao,
  ajudasCusto,
  naoDocumentadas,
  emPrejuizo,
  excecaoPrejuizo,
  rfaiInvest,
  regiaoRFAI,
  dlrrLucros,
  sifideDespesas,
  tipoSifide,
  primeirosAnos,
  incluirConstituicao,
  custoConstituicao,
  anosAmortizacao,
  resultBeneficios,
  totalTA,
  onDespChange,
  onCustosChange,
  onSalChange,
  onDividendosChange,
  onEnglobamentoChange,
  onEncargosViaturaChange,
  onTipoViaturaChange,
  onDespRepresentacaoChange,
  onAjudasCustoChange,
  onNaoDocumentadasChange,
  onEmPrejuizoChange,
  onExcecaoPrejuizoChange,
  onRfaiInvestChange,
  onRegiaoRFAIChange,
  onDlrrLucrosChange,
  onSifideDespesasChange,
  onTipoSifideChange,
  onPrimeirosAnosChange,
  onIncluirConstituicaoChange,
  onCustoConstituicaoChange,
  onAnosAmortizacaoChange,
}: EmpresaInputsProps) {
  const custAnual = incluirConstituicao
    ? Math.round(custoConstituicao / Math.max(1, anosAmortizacao))
    : 0;

  const sifideTaxaLabel: Record<TipoEmpresaSifide, string> = {
    startup: "82,5%",
    pme_jovem: "47,5%",
    pme_normal: "32,5%",
    grande: "32,5%",
  };

  return (
    <div className="mt-5 pt-5 border-t border-stone-100 dark:border-stone-800 space-y-5">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
        Parâmetros da empresa
      </div>

      {/* ── Base ─────────────────────────────────────────────────────────── */}
      <NumericSlider
        label="Despesas operacionais (€/ano)"
        value={despesasOper}
        min={0}
        max={50_000}
        step={500}
        onChange={onDespChange}
        presets={[0, 2000, 5000, 10000]}
        tooltip={
          <>
            Material, viagens, subcontratação, rendas, publicidade. Deduzidas ao
            lucro tributável antes de IRC.
          </>
        }
      />

      <NumericSlider
        label="Custos estrutura (€/ano)"
        value={custosExtra}
        min={0}
        max={10_000}
        step={200}
        onChange={onCustosChange}
        presets={[1000, 2000, 3000, 5000]}
        tooltip={
          <>
            Contabilidade (~1 200€/ano), software de faturação (~300€),
            secretariado, seguro. Estimativa 2026: ~2 000€/ano.
          </>
        }
      />

      <NumericSlider
        label="Salário gerente (€/mês bruto)"
        value={salGerenteMensal}
        min={0}
        max={5_000}
        step={100}
        onChange={onSalChange}
        presets={[0, 920, 1500, 2500]}
        tooltip={
          <>
            Salário bruto mensal do gerente-sócio. SS patronal 23,75% e SS
            trabalhador 11%. Custo dedutível ao IRC. Mínimo legal 2026: 820€
            (tempo inteiro).
          </>
        }
      />

      {/* ── Dividendos + Englobamento ─────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-sm font-medium uppercase tracking-wider text-stone-500">
            Lucro como dividendos
          </span>
          <InfoTip>
            Opção A — Liberatória 28% (Art. 71.º CIRS): direto e simples. Opção
            B — Englobamento (Art. 40.º-A CIRS): só 50% dos dividendos nacionais
            entra no rendimento coletável, tributado à taxa marginal
            progressiva. Quase sempre mais favorável para rendimentos abaixo de
            €80 000.
          </InfoTip>
        </div>
        <div className="flex gap-2">
          {(
            [
              { v: true as boolean, l: "Sim — distribui" },
              { v: false as boolean, l: "Não — retém" },
            ] as const
          ).map(({ v, l }) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={distribuirDividendos === v}
              onClick={() => onDividendosChange(v)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition-all ${
                distribuirDividendos === v
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {distribuirDividendos && (
          <div className="mt-2 flex gap-2">
            {(
              [
                { v: false, l: "28% Liberatória", sub: "Art. 71.º CIRS" },
                { v: true, l: "Englobamento 50%", sub: "Art. 40.º-A CIRS" },
              ] as const
            ).map(({ v, l, sub }) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={opcaoEnglobamento === v}
                onClick={() => onEnglobamentoChange(v)}
                className={`flex-1 rounded-xl border px-2.5 py-2 text-center transition-all ${
                  opcaoEnglobamento === v
                    ? "border-brand bg-brand-light"
                    : "border-stone-200 bg-stone-50 hover:border-stone-300"
                }`}
              >
                <div
                  className={`text-xs font-bold ${opcaoEnglobamento === v ? "text-brand-dark" : "text-stone-600"}`}
                >
                  {l}
                </div>
                <div
                  className={`text-[10px] ${opcaoEnglobamento === v ? "text-brand" : "text-stone-400"}`}
                >
                  {sub}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Custos de Constituição ─────────────────────────────────────────── */}
      <CollapsibleSection
        title="Custos de Constituição"
        badgeColor="brand"
        badge={incluirConstituicao ? `−${fmt(custAnual)}/ano` : "~1 200€"}
      >
        <div className="space-y-4">
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Empresa na hora (balcão/online): ~360–400€ (registo + publicações
            DRE). Setup contabilista OCC: ~500–800€. Capital social mínimo: 1€
            (simbólico).
          </p>
          <button
            type="button"
            role="checkbox"
            aria-checked={incluirConstituicao}
            onClick={() => onIncluirConstituicaoChange(!incluirConstituicao)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              incluirConstituicao
                ? "border-brand bg-brand-light"
                : "border-stone-200 bg-stone-50"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${incluirConstituicao ? "bg-brand border-brand text-white" : "border-stone-300 text-transparent"}`}
            >
              <Check size={12} />
            </div>
            <div>
              <div
                className={`text-sm font-semibold ${incluirConstituicao ? "text-brand-dark" : "text-stone-700"}`}
              >
                Incluir custos de constituição
              </div>
              <div
                className={`text-xs ${incluirConstituicao ? "text-brand" : "text-stone-400"}`}
              >
                Amortizado ao longo dos primeiros anos
              </div>
            </div>
          </button>

          {incluirConstituicao && (
            <>
              <NumericSlider
                label="Custo total de constituição (€)"
                value={custoConstituicao}
                min={360}
                max={3_000}
                step={50}
                onChange={onCustoConstituicaoChange}
                presets={[360, 800, 1200, 1500]}
              />
              <div>
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block mb-2">
                  Amortizar em
                </span>
                <div className="flex gap-2">
                  {[1, 2, 3, 5].map((a) => (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={anosAmortizacao === a}
                      onClick={() => onAnosAmortizacaoChange(a)}
                      className={`flex-1 rounded-xl border py-2 text-center text-xs font-semibold transition-all ${
                        anosAmortizacao === a
                          ? "border-brand bg-brand-light text-brand-dark"
                          : "border-stone-200 bg-stone-50 text-stone-500"
                      }`}
                    >
                      {a} {a === 1 ? "ano" : "anos"}
                      <div
                        className={`text-[10px] mt-0.5 ${anosAmortizacao === a ? "text-brand" : "text-stone-400"}`}
                      >
                        {fmt(Math.round(custoConstituicao / a))}/ano
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* ── Tributação Autónoma ────────────────────────────────────────────── */}
      <CollapsibleSection
        title="Tributação Autónoma"
        badge={totalTA > 0 ? `+${fmt(Math.round(totalTA))}` : "Art. 88.º CIRC"}
        badgeColor={totalTA > 0 ? "amber" : "stone"}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <Warning
              size={13}
              className="flex-shrink-0 mt-0.5 text-amber-600"
            />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Incide sobre os <strong>encargos anuais</strong> da viatura
              (combustível, manutenção, seguros, portagens, leasing),
              independentemente de haver lucro. Os limiares indicados referem-se
              ao <strong>custo de aquisição</strong> da viatura.
            </p>
          </div>

          {/* Tipo de viatura */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-2">
              Tipo de viatura (custo de aquisição)
            </span>
            <div className="space-y-1">
              {(Object.keys(TA_VIATURAS) as TipoViatura[]).map((tv) => (
                <button
                  key={tv}
                  type="button"
                  aria-pressed={tipoViatura === tv}
                  onClick={() => onTipoViaturaChange(tv)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-left ${
                    tipoViatura === tv
                      ? "border-brand bg-brand-light text-brand-dark"
                      : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <span>{TIPO_VIATURA_META[tv]}</span>
                  <span
                    className={`text-[11px] font-bold ${tipoViatura === tv ? "text-brand" : "text-stone-400"}`}
                  >
                    {pct(TA_VIATURAS[tv])}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <NumericSlider
            label="Encargos anuais c/ viatura (€)"
            value={encargosViatura}
            min={0}
            max={20_000}
            step={200}
            onChange={onEncargosViaturaChange}
            presets={[0, 1500, 3000, 6000]}
          />
          <NumericSlider
            label="Despesas de representação (€/ano)"
            value={despRepresentacao}
            min={0}
            max={10_000}
            step={100}
            onChange={onDespRepresentacaoChange}
            presets={[0, 500, 1000, 2000]}
            tooltip={
              <>
                Refeições com clientes, eventos, ofertas. Taxa: 10% (n.º 7).
                Publicidade/marketing não incluída.
              </>
            }
          />
          <NumericSlider
            label="Ajudas de custo / viatura própria (€/ano)"
            value={ajudasCusto}
            min={0}
            max={5_000}
            step={50}
            onChange={onAjudasCustoChange}
            presets={[0, 300, 600, 1200]}
            tooltip={
              <>
                Ajudas de custo sem comprovativos + compensação por viatura
                própria. Taxa: 5% (n.º 9).
              </>
            }
          />
          <NumericSlider
            label="Despesas não documentadas (€/ano)"
            value={naoDocumentadas}
            min={0}
            max={2_000}
            step={50}
            onChange={onNaoDocumentadasChange}
            presets={[0]}
            tooltip={
              <>
                Sem fatura ou documento válido. Taxa: 50% (n.º 1). Fortemente
                penalizadoras — a evitar.
              </>
            }
          />

          {/* Situação de prejuízo */}
          <button
            type="button"
            role="checkbox"
            aria-checked={emPrejuizo}
            onClick={() => onEmPrejuizoChange(!emPrejuizo)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              emPrejuizo
                ? "border-amber-300 bg-amber-50"
                : "border-stone-200 bg-stone-50"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${emPrejuizo ? "bg-amber-500 border-amber-500 text-white" : "border-stone-300 text-transparent"}`}
            >
              <Check size={12} />
            </div>
            <div>
              <div
                className={`text-sm font-semibold ${emPrejuizo ? "text-amber-800" : "text-stone-700"}`}
              >
                Empresa em prejuízo fiscal
              </div>
              <div
                className={`text-xs ${emPrejuizo ? "text-amber-600" : "text-stone-400"}`}
              >
                Agravamento +10 pp nas taxas de TA (Art. 88.º n.º 14)
              </div>
            </div>
          </button>

          {emPrejuizo && (
            <button
              type="button"
              role="checkbox"
              aria-checked={excecaoPrejuizo}
              onClick={() => onExcecaoPrejuizoChange(!excecaoPrejuizo)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                excecaoPrejuizo
                  ? "border-brand bg-brand-light"
                  : "border-stone-200 bg-stone-50"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${excecaoPrejuizo ? "bg-brand border-brand text-white" : "border-stone-300 text-transparent"}`}
              >
                <Check size={12} />
              </div>
              <div>
                <div
                  className={`text-xs font-semibold ${excecaoPrejuizo ? "text-brand-dark" : "text-stone-600"}`}
                >
                  Exceção ao agravamento (OE2026)
                </div>
                <div
                  className={`text-[11px] ${excecaoPrejuizo ? "text-brand" : "text-stone-400"}`}
                >
                  Lucro em ≥1 dos 3 anos anteriores OU primeiros 3 anos de
                  atividade
                </div>
              </div>
            </button>
          )}

          {totalTA > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-100 border border-amber-300">
              <span className="text-xs font-bold text-amber-800">
                Total tributação autónoma
              </span>
              <span className="text-sm font-bold text-amber-900">
                +{fmt(Math.round(totalTA))}
              </span>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ── Benefícios Fiscais ────────────────────────────────────────────── */}
      <CollapsibleSection
        title="Benefícios Fiscais"
        badge={
          resultBeneficios.total > 0
            ? `−${fmt(Math.round(resultBeneficios.total))}`
            : "RFAI · DLRR · SIFIDE"
        }
        badgeColor={resultBeneficios.total > 0 ? "emerald" : "stone"}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <Check
              size={13}
              className="flex-shrink-0 mt-0.5 text-emerald-600"
            />
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Reduzem diretamente a coleta de IRC (imposto base). RFAI vigora
              até 31-dez-2027. SIFIDE II: candidatura à ANI obrigatória.
              Poupança máxima teórica: RFAI 30% + SIFIDE 82,5% sobre
              investimento/I&D.
            </p>
          </div>

          {/* Primeiros 3 anos */}
          <button
            type="button"
            role="checkbox"
            aria-checked={primeirosAnos}
            onClick={() => onPrimeirosAnosChange(!primeirosAnos)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              primeirosAnos
                ? "border-brand bg-brand-light"
                : "border-stone-200 bg-stone-50"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${primeirosAnos ? "bg-brand border-brand text-white" : "border-stone-300 text-transparent"}`}
            >
              <Check size={12} />
            </div>
            <div>
              <div
                className={`text-sm font-semibold ${primeirosAnos ? "text-brand-dark" : "text-stone-700"}`}
              >
                Primeiros 3 períodos de atividade
              </div>
              <div
                className={`text-xs ${primeirosAnos ? "text-brand" : "text-stone-400"}`}
              >
                RFAI sem limite de 50% — pode deduzir até 100% da coleta IRC
              </div>
            </div>
          </button>

          {/* RFAI */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                RFAI — Regime Fiscal Apoio ao Investimento
              </span>
              <InfoTip label="RFAI 2026">
                Norte/Centro/Alentejo/Açores/Madeira: 30% (≤€15M) + 10%
                (excedente). Lisboa/Algarve: 10%. Limite: 50% da coleta (100%
                primeiros 3 anos). Reportável 10 anos.
              </InfoTip>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["interior", "litoral"] as RegiaoRFAI[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={regiaoRFAI === r}
                  onClick={() => onRegiaoRFAIChange(r)}
                  className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                    regiaoRFAI === r
                      ? "border-brand bg-brand-light text-brand-dark"
                      : "border-stone-200 bg-stone-50 text-stone-600"
                  }`}
                >
                  {r === "interior"
                    ? "Norte/Centro/Alentejo/Açores/Madeira"
                    : "Lisboa / Algarve"}
                  <div
                    className={`text-[10px] mt-0.5 ${regiaoRFAI === r ? "text-brand" : "text-stone-400"}`}
                  >
                    {r === "interior" ? "30% até €15M" : "10% flat"}
                  </div>
                </button>
              ))}
            </div>
            <NumericSlider
              label="Investimento elegível RFAI (€/ano)"
              value={rfaiInvest}
              min={0}
              max={200_000}
              step={1_000}
              onChange={onRfaiInvestChange}
              presets={[0, 10000, 25000, 50000, 100000]}
              formatPreset={fmt}
              tooltip={
                <>
                  Ativos fixos tangíveis/intangíveis elegíveis: máquinas,
                  equipamento, software. Não elegível: imóveis de habitação,
                  viaturas ligeiras de passageiros.
                </>
              }
            />
            {resultBeneficios.rfaiBruto > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-xs text-emerald-700">
                  RFAI bruto: {fmt(Math.round(resultBeneficios.rfaiBruto))}
                  {resultBeneficios.rfai < resultBeneficios.rfaiBruto && (
                    <span className="ml-1 opacity-60">
                      (limitado pela coleta)
                    </span>
                  )}
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  −{fmt(Math.round(resultBeneficios.rfai))}
                </span>
              </div>
            )}
          </div>

          {/* DLRR */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                DLRR — Lucros Retidos e Reinvestidos
              </span>
              <InfoTip label="DLRR 2026">
                Só PME/Small Mid Cap. 10% dos lucros retidos reinvestidos em
                ativos elegíveis (prazo ≤4 anos). Limite: 25% da coleta IRC.
                Máx. €5M de lucros elegíveis. Cumulável com RFAI (em períodos
                diferentes).
              </InfoTip>
            </div>
            <NumericSlider
              label="Lucros a reter e reinvestir (€/ano)"
              value={dlrrLucros}
              min={0}
              max={200_000}
              step={1_000}
              onChange={onDlrrLucrosChange}
              presets={[0, 10000, 25000, 50000, 100000]}
              formatPreset={fmt}
            />
            {resultBeneficios.dlrrBruto > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-xs text-emerald-700">
                  DLRR (10% de {fmt(Math.round(dlrrLucros))})
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  −{fmt(Math.round(resultBeneficios.dlrr))}
                </span>
              </div>
            )}
          </div>

          {/* SIFIDE II */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                SIFIDE II — Incentivos Fiscais I&D
              </span>
              <InfoTip label="SIFIDE II 2026">
                Base 32,5% + incremental 50% do acréscimo vs. média 2 anos ant.
                (max €1,5M). Startup sem histórico I&D: 82,5%. PME &lt;2
                exercícios sem incremental: 47,5% (majoração +15%). Candidatura
                à ANI obrigatória. Reportável 12 anos.
              </InfoTip>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    v: "startup" as TipoEmpresaSifide,
                    l: "Startup",
                    sub: "82,5% — sem I&D anterior",
                  },
                  {
                    v: "pme_jovem" as TipoEmpresaSifide,
                    l: "PME < 2 exercícios",
                    sub: "47,5% — majoração 15%",
                  },
                  {
                    v: "pme_normal" as TipoEmpresaSifide,
                    l: "PME com histórico I&D",
                    sub: "32,5% base (conservador)",
                  },
                  {
                    v: "grande" as TipoEmpresaSifide,
                    l: "Grande empresa",
                    sub: "32,5% base",
                  },
                ] as const
              ).map(({ v, l, sub }) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={tipoSifide === v}
                  onClick={() => onTipoSifideChange(v)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                    tipoSifide === v
                      ? "border-brand bg-brand-light text-brand-dark"
                      : "border-stone-200 bg-stone-50 text-stone-600"
                  }`}
                >
                  {l}
                  <div
                    className={`text-[10px] mt-0.5 ${tipoSifide === v ? "text-brand" : "text-stone-400"}`}
                  >
                    {sub}
                  </div>
                </button>
              ))}
            </div>
            <NumericSlider
              label="Despesas elegíveis I&D (€/ano)"
              value={sifideDespesas}
              min={0}
              max={200_000}
              step={1_000}
              onChange={onSifideDespesasChange}
              presets={[0, 10000, 25000, 50000, 100000]}
              formatPreset={fmt}
              tooltip={
                <>
                  Pessoal de I&D, materiais, equipamento dedicado, contratos com
                  entidades de I&D. Exige certificação pela ANI (submissão até
                  maio do ano seguinte).
                </>
              }
            />
            {resultBeneficios.sifideBruto > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-xs text-emerald-700">
                  SIFIDE ({sifideTaxaLabel[tipoSifide]} de{" "}
                  {fmt(Math.round(sifideDespesas))})
                  {resultBeneficios.sifide < resultBeneficios.sifideBruto && (
                    <span className="ml-1 opacity-60">
                      (limitado pela coleta)
                    </span>
                  )}
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  −{fmt(Math.round(resultBeneficios.sifide))}
                </span>
              </div>
            )}
          </div>

          {/* Total benefícios */}
          {resultBeneficios.total > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-100 border border-emerald-300">
              <span className="text-sm font-bold text-emerald-800">
                Total benefícios fiscais
              </span>
              <span className="text-sm font-bold text-emerald-900">
                −{fmt(Math.round(resultBeneficios.total))}
              </span>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function SimuladorIntegrado() {
  // ── Modo e cenário ───────────────────────────────────────────────────────
  const [modoInput, setModoInput] = useState<ModoInput>("recibo");
  const [cenario, setCenario] = useState<CenarioAtivo>("rv");

  // ── Valores de entrada ───────────────────────────────────────────────────
  const [bruto, setBruto] = useState(1_500);
  const [brutoAnual, setBrutoAnual] = useState(18_000);

  const [atividade, setAtividade] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [regimeIVA, setRegimeIVA] = useState<RegimeIVA>("isento");

  // [BUG2 FIX] Removido estado ivaIncluido — o input é sempre a base pré-IVA.
  // O toggle "Com IVA incluído / IVA à parte" entrava em conflito com o
  // seletor de regime IVA já existente. Agora o fluxo é simples:
  //   → utilizador introduz o valor do serviço (sem IVA)
  //   → seletor de regime IVA determina a taxa aplicada
  //   → IVA calculado e apresentado no breakdown

  const [dispensaRetencao, setDispensaRetencao] = useState(false);
  const [isencaoSSPrimeiroAno, setIsencaoSSPrimeiroAno] = useState(false);
  const [acumulaEmprego, setAcumulaEmprego] = useState(false);

  const [irsJovemAno, setIrsJovemAno] = useState(0);
  const [tipoAtiv, setTipoAtiv] = useState<TipoAtividade>("art151");

  // ── Inputs Empresa ───────────────────────────────────────────────────────
  const [despesasOper, setDespesasOper] = useState(0);
  const [custosExtra, setCustosExtra] = useState(2_000);
  const [salGerenteMensal, setSalGerenteMensal] = useState(0);
  const [distribuirDividendos, setDistribuirDividendos] = useState(true);

  // ── Englobamento ──────────────────────────────────────────────────────────
  const [opcaoEnglobamento, setOpcaoEnglobamento] = useState(false);

  // ── Empresa — Tributação Autónoma ────────────────────────────────────────
  const [encargosViatura, setEncargosViatura] = useState(0);
  const [tipoViatura, setTipoViatura] = useState<TipoViatura>("comb_baixo");
  const [despRepresentacao, setDespRepresentacao] = useState(0);
  const [ajudasCusto, setAjudasCusto] = useState(0);
  const [naoDocumentadas, setNaoDocumentadas] = useState(0);
  const [emPrejuizo, setEmPrejuizo] = useState(false);
  const [excecaoPrejuizo, setExcecaoPrejuizo] = useState(true);

  // ── Empresa — Benefícios Fiscais ─────────────────────────────────────────
  const [rfaiInvest, setRfaiInvest] = useState(0);
  const [regiaoRFAI, setRegiaoRFAI] = useState<RegiaoRFAI>("interior");
  const [dlrrLucros, setDlrrLucros] = useState(0);
  const [sifideDespesas, setSifideDespesas] = useState(0);
  const [tipoSifide, setTipoSifide] = useState<TipoEmpresaSifide>("pme_normal");
  const [primeirosAnos, setPrimeirosAnos] = useState(false);

  // ── Empresa — Custos de Constituição ─────────────────────────────────────
  const [incluirConstituicao, setIncluirConstituicao] = useState(false);
  const [custoConstituicao, setCustoConstituicao] = useState(
    CUSTO_CONSTITUICAO_DEFAULT,
  );
  const [anosAmortizacao, setAnosAmortizacao] = useState(3);

  // ── Advanced ─────────────────────────────────────────────────────────────
  const [advanced, setAdvanced] = useState(false);

  // ── Sincronização bruto ↔ brutoAnual ────────────────────────────────────
  const handleBrutoChange = useCallback(
    (v: number) => {
      setBruto(v);
      // brutoAnual armazena a base anual (sem IVA) para simulações IRS/SS
      const t = taxaIVAEfetiva(regiao, regimeIVA);
      const baseV = t > 0 ? v / (1 + t) : v;
      setBrutoAnual(Math.round(baseV * 12));
    },
    [regiao, regimeIVA],
  );

  const handleBrutoAnualChange = useCallback(
    (v: number) => {
      setBrutoAnual(v);
      // bruto (slider por recibo) mostra o total com IVA
      const t = taxaIVAEfetiva(regiao, regimeIVA);
      const totalMensal = t > 0 ? (v / 12) * (1 + t) : v / 12;
      setBruto(Math.round(totalMensal / 50) * 50);
    },
    [regiao, regimeIVA],
  );

  // ── IVA ──────────────────────────────────────────────────────────────────
  const taxaIva = taxaIVAEfetiva(regiao, regimeIVA);
  const temIva = taxaIva > 0;

  // O input é o total que a pessoa cobra ao cliente (já com IVA incluído quando aplicável).
  // Extraímos a base pré-IVA para passar ao motor de cálculo.
  const base = temIva ? bruto / (1 + taxaIva) : bruto;
  const labelValor = temIva
    ? `Total a cobrar ao cliente (€) — IVA ${pct(taxaIva)} incluído`
    : "Valor do recibo (€)";

  // ── Resultado por recibo ─────────────────────────────────────────────────
  const isencaoSS = isencaoSSPrimeiroAno || acumulaEmprego;

  const resultRecibo = useMemo(
    () =>
      calcular({
        bruto: base,
        tipo: atividade.tipo,
        regiao,
        regimeIVA,
        baseSS: "servicos",
        dispensaRetencao,
        isencaoSSPrimeiroAno: isencaoSS,
        acumulaEmprego,
        irsJovemAno,
        retencaoOverride: TIPO_ATIVIDADE_PARAMS[tipoAtiv]?.ret,
      }),
    [
      base,
      atividade.tipo,
      regiao,
      regimeIVA,
      dispensaRetencao,
      isencaoSS,
      acumulaEmprego,
      irsJovemAno,
      tipoAtiv,
    ],
  );

  // ── Resultado anual RV ────────────────────────────────────────────────────
  const resultAnualRV = useMemo(
    () => simularAnualRV(brutoAnual, tipoAtiv, irsJovemAno, isencaoSS),
    [brutoAnual, tipoAtiv, irsJovemAno, isencaoSS],
  );

  // ── Resultado empresa ─────────────────────────────────────────────────────
  const custoConstituicaoAnual = incluirConstituicao
    ? Math.round(custoConstituicao / Math.max(1, anosAmortizacao))
    : 0;

  const resultEmpresa = useMemo(
    () =>
      simularEmpresa(
        brutoAnual,
        despesasOper,
        custosExtra,
        salGerenteMensal,
        distribuirDividendos,
        opcaoEnglobamento,
        encargosViatura,
        tipoViatura,
        despRepresentacao,
        ajudasCusto,
        naoDocumentadas,
        emPrejuizo,
        excecaoPrejuizo,
        rfaiInvest,
        regiaoRFAI,
        dlrrLucros,
        sifideDespesas,
        tipoSifide,
        primeirosAnos,
        custoConstituicaoAnual,
      ),
    [
      brutoAnual,
      despesasOper,
      custosExtra,
      salGerenteMensal,
      distribuirDividendos,
      opcaoEnglobamento,
      encargosViatura,
      tipoViatura,
      despRepresentacao,
      ajudasCusto,
      naoDocumentadas,
      emPrejuizo,
      excecaoPrejuizo,
      rfaiInvest,
      regiaoRFAI,
      dlrrLucros,
      sifideDespesas,
      tipoSifide,
      primeirosAnos,
      custoConstituicaoAnual,
    ],
  );

  const empresaVence = resultEmpresa.liquidoGerente > resultAnualRV.liquido;
  const diferenca = Math.abs(
    resultEmpresa.liquidoGerente - resultAnualRV.liquido,
  );

  // ── Break-even ────────────────────────────────────────────────────────────
  const breakEven = useMemo(
    () =>
      calcularBreakEven(
        tipoAtiv,
        custosExtra,
        despesasOper,
        salGerenteMensal,
        custoConstituicaoAnual,
      ),
    [
      tipoAtiv,
      custosExtra,
      despesasOper,
      salGerenteMensal,
      custoConstituicaoAnual,
    ],
  );

  // ── Barra visual RV ───────────────────────────────────────────────────────
  const barsTotal =
    resultRecibo.retencaoIRS +
      resultRecibo.iva +
      resultRecibo.segSocial +
      resultRecibo.liquido || 1;
  const barW = (v: number) =>
    `${Math.max(0, (v / barsTotal) * 100).toFixed(1)}%`;

  // ── IVA options ───────────────────────────────────────────────────────────
  const ivaOptions: { id: RegimeIVA; label: string; sub: string }[] = [
    { id: "isento", label: "Isento", sub: "Art. 53.º" },
    ...ESCALOES_IVA.map((e) => ({
      id: e as RegimeIVA,
      label: pct(IVA_TAXAS[regiao].value[e]),
      sub: ESCALAO_LABEL[e],
    })),
  ];

  // ── Checkboxes ────────────────────────────────────────────────────────────
  const checkboxes = [
    {
      id: "dispensa",
      label: "Dispensa de retenção na fonte",
      sub: `1.º ano ou faturação < ${DISPENSA_RETENCAO_LIMITE.value.toLocaleString("pt-PT")} €/ano (Art. 101.º-B)`,
      val: dispensaRetencao,
      set: setDispensaRetencao,
    },
    {
      id: "ss1ano",
      label: "1.º ano de atividade — isenção SS",
      sub: "Isenção automática de contribuições nos primeiros 12 meses (CRC)",
      val: isencaoSSPrimeiroAno,
      set: setIsencaoSSPrimeiroAno,
    },
    {
      id: "acumula",
      label: "Acumulo com trabalho dependente",
      sub: `Isento SS se emprego ≥ ${IAS_2026}€/mês e RR independente < ${(4 * IAS_2026).toLocaleString("pt-PT", { maximumFractionDigits: 0 })}€/mês`,
      val: acumulaEmprego,
      set: setAcumulaEmprego,
    },
  ];

  // ── IRS Jovem opções ──────────────────────────────────────────────────────
  const irsJovemOpts = [
    { ano: 0, label: "Não aplicável", isencao: 0 },
    ...Array.from({ length: 10 }, (_, i) => {
      const ano = i + 1;
      return {
        ano,
        label: `${ano}.º ano — isenção ${(IRS_JOVEM_ISENCAO[ano] * 100).toFixed(0)}%`,
        isencao: IRS_JOVEM_ISENCAO[ano],
      };
    }),
  ];

  // ── Aviso de IVA Art. 53.º ────────────────────────────────────────────────
  const avisoIVALimite =
    regimeIVA === "isento" && brutoAnual > IVA_ISENCAO_LIMITE ? (
      <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl border bg-alert-bg border-alert-border">
        <span className="text-alert-text mt-0.5 flex-shrink-0">
          <Warning size={14} />
        </span>
        <span className="text-xs leading-relaxed text-alert-text">
          {brutoAnual > IVA_ISENCAO_LIMITE_IMEDIATO
            ? `Faturação > ${IVA_ISENCAO_LIMITE_IMEDIATO.toLocaleString("pt-PT")}€ — transição para IVA normal imediata ao ultrapassar este limite. Deves cobrar IVA a partir dessa fatura.`
            : `Faturação prevista > ${IVA_ISENCAO_LIMITE.toLocaleString("pt-PT")}€ — perdes a isenção Art. 53.º no ano seguinte. Se ultrapassares ${IVA_ISENCAO_LIMITE_IMEDIATO.toLocaleString("pt-PT")}€, a mudança é imediata.`}
        </span>
      </div>
    ) : null;

  return (
    <div id="calculadora" className="relative scroll-mt-24">
      {/* Halo decorativo */}
      <div
        className="absolute inset-0 rounded-3xl opacity-30 pointer-events-none dark:opacity-0"
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, #E1F5EE 0%, transparent 60%)",
        }}
      />

      <div className="relative overflow-hidden rounded-3xl border border-stone-200 shadow-lift">
        {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50 px-8 py-4 dark:border-stone-800 dark:bg-stone-900">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
              Calculadora 2026
            </div>
            <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-200">
              O teu líquido real
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle Por recibo / Anual */}
            <div
              role="group"
              aria-label="Modo de cálculo"
              className="flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900"
            >
              {(
                [
                  { v: "recibo" as ModoInput, l: "Por recibo" },
                  { v: "anual" as ModoInput, l: "Anual" },
                ] as const
              ).map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={modoInput === v}
                  onClick={() => setModoInput(v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    modoInput === v
                      ? "bg-brand text-white shadow-glow"
                      : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Toggle Recibos Verdes / Empresa */}
            <div
              role="tablist"
              aria-label="Cenário"
              className="flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900"
            >
              {(
                [
                  { v: "rv" as CenarioAtivo, l: "Recibos Verdes" },
                  { v: "empresa" as CenarioAtivo, l: "Empresa" },
                ] as const
              ).map(({ v, l }) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={cenario === v}
                  type="button"
                  onClick={() => setCenario(v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    cenario === v
                      ? "bg-brand text-white shadow-glow"
                      : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Corpo ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* ════ Coluna esquerda: Inputs ════ */}
          <div className="bg-white p-8 lg:p-10 lg:border-r lg:border-stone-100 dark:bg-stone-950 dark:border-stone-800">
            {/* ── Valor ────────────────────────────────────────────────────── */}
            <div className="mb-5">
              <AnimatePresence mode="wait">
                {modoInput === "recibo" ? (
                  <m.div
                    key="recibo"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* O input é o total a cobrar ao cliente (com IVA incluído
                        se aplicável). A base pré-IVA é extraída internamente. */}
                    <NumericSlider
                      label={labelValor}
                      value={bruto}
                      min={0}
                      max={10_000}
                      step={50}
                      unit="€"
                      onChange={handleBrutoChange}
                      presets={[500, 1000, 1500, 2500, 5000]}
                      tooltip={
                        <>
                          Valor total que vais cobrar ao cliente (já com IVA
                          incluído, se aplicável). O ReciboCerto extrai
                          automaticamente a base pré-IVA e calcula IRS, SS e
                          quanto podes gastar.
                        </>
                      }
                    />
                  </m.div>
                ) : (
                  <m.div
                    key="anual"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <NumericSlider
                      label="Faturação anual (€)"
                      value={brutoAnual}
                      min={0}
                      max={200_000}
                      step={1_000}
                      unit="€"
                      onChange={handleBrutoAnualChange}
                      presets={[15000, 25000, 40000, 60000, 80000, 120000]}
                      formatPreset={(v) => fmt(v)}
                      tooltip={
                        <>
                          Volume de negócios anual, antes de qualquer imposto.
                          Limite regime simplificado: 200 000€/ano.
                        </>
                      }
                      breakPoint={breakEven ?? undefined}
                      breakPointLabel={
                        breakEven ? `Vira aqui · ${fmt(breakEven)}` : undefined
                      }
                    />
                    {avisoIVALimite}
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Regime IVA — logo abaixo do valor (afecta a interpretação do input) ── */}
            <fieldset className="mb-6">
              <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-stone-500">
                Regime de IVA · {META_REGIAO[regiao]}
                <InfoTip label="IVA 2026">
                  Isento Art. 53.º até{" "}
                  {IVA_ISENCAO_LIMITE.toLocaleString("pt-PT")}€/ano. Se
                  ultrapassares{" "}
                  {IVA_ISENCAO_LIMITE_IMEDIATO.toLocaleString("pt-PT")}€ durante
                  o ano, passas de imediato para o regime normal. Certas
                  profissões (médicos, professores...) têm isenção Art. 9.º sem
                  limite de faturação.
                </InfoTip>
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ivaOptions.map((op) => {
                  const active = regimeIVA === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRegimeIVA(op.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        active
                          ? "border-brand bg-brand-light"
                          : "border-stone-200 hover:border-stone-300 bg-stone-50"
                      }`}
                    >
                      <div
                        className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700"}`}
                      >
                        {op.label}
                      </div>
                      <div
                        className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}
                      >
                        {op.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* ── Tipo de atividade ─────────────────────────────────────── */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-sm font-medium uppercase tracking-wider text-stone-500">
                  Tipo de atividade
                </span>
                <InfoTip label="Tipos de atividade e coeficientes">
                  <p>
                    Coeficientes do regime simplificado (Art. 31.º CIRS) e taxas
                    de retenção 2026:
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    <li>
                      <strong>Art. 151.º:</strong> coef. 0,75 · ret. 23%
                    </li>
                    <li>
                      <strong>Vendas:</strong> coef. 0,15 · ret. 0%
                    </li>
                    <li>
                      <strong>Alojamento local:</strong> coef. 0,35 · ret. 0%
                    </li>
                    <li>
                      <strong>Outras prestações:</strong> coef. 0,35 · ret.
                      11,5%
                    </li>
                    <li>
                      <strong>Prop. intelectual:</strong> coef. 0,75 · ret.
                      16,5%
                    </li>
                  </ul>
                  <p className="mt-1">
                    25% do rendimento = presumida como despesa (sem comprovar).
                  </p>
                </InfoTip>
              </div>
              <ActivityCombobox value={atividade} onChange={setAtividade} />

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  Object.entries(TIPO_ATIVIDADE_PARAMS) as [
                    TipoAtividade,
                    (typeof TIPO_ATIVIDADE_PARAMS)[TipoAtividade],
                  ][]
                ).map(([k, p]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={tipoAtiv === k}
                    onClick={() => setTipoAtiv(k)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      tipoAtiv === k
                        ? "border-brand bg-brand-light"
                        : "border-stone-200 hover:border-stone-300 bg-stone-50"
                    }`}
                  >
                    <div
                      className={`font-semibold ${tipoAtiv === k ? "text-brand-dark" : "text-stone-700"}`}
                    >
                      {p.label}
                    </div>
                    <div
                      className={`mt-0.5 ${tipoAtiv === k ? "text-brand" : "text-stone-400"}`}
                    >
                      Coef. {pct(p.coef)} · Ret. {pct(p.ret)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Situação fiscal ──────────────────────────────────────── */}
            <div className="space-y-3">
              {checkboxes.map((cb) => (
                <button
                  key={cb.id}
                  type="button"
                  role="checkbox"
                  aria-checked={cb.val}
                  onClick={() => cb.set(!cb.val)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    cb.val
                      ? "border-brand bg-brand-light"
                      : "border-stone-200 hover:border-stone-300 bg-stone-50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      cb.val
                        ? "bg-brand border-brand text-white"
                        : "border-stone-300 text-transparent"
                    }`}
                  >
                    <Check size={12} />
                  </div>
                  <div>
                    <div
                      className={`text-sm font-semibold ${cb.val ? "text-brand-dark" : "text-stone-700"}`}
                    >
                      {cb.label}
                    </div>
                    <div
                      className={`text-xs ${cb.val ? "text-brand" : "text-stone-400"}`}
                    >
                      {cb.sub}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* ── Opções avançadas ─────────────────────────────────────── */}
            <div className="mt-5 pt-5 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                aria-expanded={advanced}
                onClick={() => setAdvanced((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-700 transition-colors"
              >
                <span>Opções avançadas</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`transition-transform ${advanced ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <AnimatePresence>
                {advanced && (
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-5">
                      {/* Região */}
                      <div>
                        <span className="text-sm font-medium text-stone-500 uppercase tracking-wider block mb-2">
                          Região
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {REGIOES.map((r) => {
                            const active = regiao === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setRegiao(r)}
                                className={`p-2.5 rounded-xl border text-center text-sm font-semibold transition-all ${
                                  active
                                    ? "border-brand bg-brand-light text-brand-dark"
                                    : "border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-600"
                                }`}
                              >
                                {META_REGIAO[r]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* IRS Jovem */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <label
                            htmlFor="irs-jovem-sel"
                            className="text-sm font-medium text-stone-500 uppercase tracking-wider"
                          >
                            IRS Jovem (até {IRS_JOVEM_IDADE_MAX} anos)
                          </label>
                          <InfoTip label="IRS Jovem 2026">
                            Isenção parcial do IRS durante 10 anos para jovens
                            até 35 anos (Art. 12.º-B CIRS, OE2025). Aplica-se a
                            Cat. A e Cat. B. Limite: 55×IAS ={" "}
                            {IRS_JOVEM_LIMITE_2026.toLocaleString("pt-PT")}
                            €/ano. Conta anos desde 1.º rendimento como
                            não-dependente.
                          </InfoTip>
                        </div>
                        <select
                          id="irs-jovem-sel"
                          value={irsJovemAno}
                          onChange={(e) =>
                            setIrsJovemAno(Number(e.target.value))
                          }
                          className="w-full px-4 py-3 text-sm font-semibold text-stone-700 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700"
                        >
                          {irsJovemOpts.map(({ ano, label }) => (
                            <option key={ano} value={ano}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-xs text-stone-400">
                          Limite de isenção:{" "}
                          {IRS_JOVEM_LIMITE_2026.toLocaleString("pt-PT")}€/ano
                          (55×IAS 2026). Aplica-se ao rendimento coletável, não
                          ao bruto.
                        </p>
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Inputs Empresa (visíveis quando cenário = empresa) ─────── */}
            {cenario === "empresa" && (
              <EmpresaInputs
                despesasOper={despesasOper}
                custosExtra={custosExtra}
                salGerenteMensal={salGerenteMensal}
                distribuirDividendos={distribuirDividendos}
                opcaoEnglobamento={opcaoEnglobamento}
                encargosViatura={encargosViatura}
                tipoViatura={tipoViatura}
                despRepresentacao={despRepresentacao}
                ajudasCusto={ajudasCusto}
                naoDocumentadas={naoDocumentadas}
                emPrejuizo={emPrejuizo}
                excecaoPrejuizo={excecaoPrejuizo}
                rfaiInvest={rfaiInvest}
                regiaoRFAI={regiaoRFAI}
                dlrrLucros={dlrrLucros}
                sifideDespesas={sifideDespesas}
                tipoSifide={tipoSifide}
                primeirosAnos={primeirosAnos}
                incluirConstituicao={incluirConstituicao}
                custoConstituicao={custoConstituicao}
                anosAmortizacao={anosAmortizacao}
                resultBeneficios={resultEmpresa.beneficios}
                totalTA={resultEmpresa.ta.total}
                onDespChange={setDespesasOper}
                onCustosChange={setCustosExtra}
                onSalChange={setSalGerenteMensal}
                onDividendosChange={setDistribuirDividendos}
                onEnglobamentoChange={setOpcaoEnglobamento}
                onEncargosViaturaChange={setEncargosViatura}
                onTipoViaturaChange={setTipoViatura}
                onDespRepresentacaoChange={setDespRepresentacao}
                onAjudasCustoChange={setAjudasCusto}
                onNaoDocumentadasChange={setNaoDocumentadas}
                onEmPrejuizoChange={setEmPrejuizo}
                onExcecaoPrejuizoChange={setExcecaoPrejuizo}
                onRfaiInvestChange={setRfaiInvest}
                onRegiaoRFAIChange={setRegiaoRFAI}
                onDlrrLucrosChange={setDlrrLucros}
                onSifideDespesasChange={setSifideDespesas}
                onTipoSifideChange={setTipoSifide}
                onPrimeirosAnosChange={setPrimeirosAnos}
                onIncluirConstituicaoChange={setIncluirConstituicao}
                onCustoConstituicaoChange={setCustoConstituicao}
                onAnosAmortizacaoChange={setAnosAmortizacao}
              />
            )}
          </div>

          {/* ════ Coluna direita: Resultado ════ */}
          <div className="bg-cream p-8 lg:p-10 flex flex-col dark:bg-stone-900">
            <AnimatePresence mode="wait">
              {cenario === "rv" ? (
                /* ── Painel Recibos Verdes ── */
                <m.div
                  key="rv"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col flex-1"
                >
                  <div className="mb-8">
                    <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">
                      {modoInput === "recibo"
                        ? "Disponível para gastar · por recibo"
                        : "Líquido anual estimado"}
                    </div>
                    <div className="font-display text-5xl font-semibold leading-none mb-1 text-brand">
                      <AnimatedNumber
                        value={
                          modoInput === "recibo"
                            ? resultRecibo.liquido
                            : resultAnualRV.liquido
                        }
                      />
                    </div>
                    <div className="text-sm text-stone-400 mt-1">
                      de{" "}
                      <AnimatedNumber
                        value={
                          modoInput === "recibo"
                            ? resultRecibo.bruto + resultRecibo.iva
                            : brutoAnual
                        }
                      />{" "}
                      faturados
                      {modoInput === "anual" && (
                        <span>
                          {" "}
                          · IRS {fmt(resultAnualRV.irs)} · SS{" "}
                          {fmt(resultAnualRV.ssAnual)}
                        </span>
                      )}
                    </div>
                  </div>

                  {modoInput === "recibo" && (
                    <>
                      {/* Barra visual */}
                      <div className="mb-6">
                        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
                          <div
                            className="transition-all duration-500 rounded-l-full"
                            style={{
                              width: barW(resultRecibo.liquido),
                              background: "#1D9E75",
                            }}
                          />
                          {resultRecibo.retencaoIRS > 0 && (
                            <div
                              className="transition-all duration-500"
                              style={{
                                width: barW(resultRecibo.retencaoIRS),
                                background: "#9FE1CB",
                              }}
                            />
                          )}
                          {resultRecibo.iva > 0 && (
                            <div
                              className="transition-all duration-500"
                              style={{
                                width: barW(resultRecibo.iva),
                                background: "#FFF8A0",
                              }}
                            />
                          )}
                          {resultRecibo.segSocial > 0 && (
                            <div
                              className="transition-all duration-500 rounded-r-full"
                              style={{
                                width: barW(resultRecibo.segSocial),
                                background: "#D3D1C7",
                              }}
                            />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { label: "Teu", color: "#1D9E75", show: true },
                            {
                              label: "Retenção IRS",
                              color: "#9FE1CB",
                              show: resultRecibo.retencaoIRS > 0,
                            },
                            {
                              label: "IVA",
                              color: "#E8D97A",
                              show: resultRecibo.iva > 0,
                            },
                            {
                              label: "Seg. Social",
                              color: "#B4B2A9",
                              show: resultRecibo.segSocial > 0,
                            },
                          ]
                            .filter((l) => l.show)
                            .map((l) => (
                              <div
                                key={l.label}
                                className="flex items-center gap-1.5"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ background: l.color }}
                                />
                                <span className="text-xs text-stone-500">
                                  {l.label}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Breakdown por recibo */}
                      <div className="space-y-1 flex-1">
                        <DetalheRow
                          label={
                            resultRecibo.taxaIVA > 0
                              ? "Base do serviço (sem IVA)"
                              : "Valor do recibo"
                          }
                          value={resultRecibo.bruto}
                          type="neutral"
                          note={
                            resultRecibo.taxaIVA > 0
                              ? `Total ÷ (1 + ${pct(resultRecibo.taxaIVA)})`
                              : "O que faturaste"
                          }
                        />
                        {resultRecibo.taxaIVA > 0 && (
                          <DetalheRow
                            label={`IVA (${pct(resultRecibo.taxaIVA)}) — do Estado`}
                            value={resultRecibo.iva}
                            type="warning"
                            note="Pertence ao Estado — não é teu"
                          />
                        )}
                        {resultRecibo.taxaIVA > 0 && (
                          <DetalheRow
                            label="O cliente paga"
                            value={resultRecibo.bruto + resultRecibo.iva}
                            type="neutral"
                            note="Valor base + IVA"
                          />
                        )}
                        {resultRecibo.retencaoIRS > 0 && (
                          <DetalheRow
                            label={`Retenção na fonte (${pct(resultRecibo.taxaRetencao)})`}
                            value={-resultRecibo.retencaoIRS}
                            type="deducao"
                            note="Adiantamento de IRS ao Estado"
                          />
                        )}
                        <DetalheRow
                          label="Entra na tua conta"
                          value={resultRecibo.entradaConta}
                          type="subtotal"
                          note={
                            resultRecibo.taxaIVA > 0
                              ? "Bruto + IVA − Retenção"
                              : "Após retenção"
                          }
                        />
                        {resultRecibo.taxaIVA > 0 && (
                          <DetalheRow
                            label="Reservar para IVA (entrega trimestral)"
                            value={-resultRecibo.iva}
                            type="warning"
                          />
                        )}
                        {resultRecibo.segSocial > 0 && (
                          <DetalheRow
                            label={`Reservar SS (21,4%×70% de ${fmt(resultRecibo.bruto)})`}
                            value={-resultRecibo.segSocial}
                            type="deducao"
                            note="Pagamento mensal até dia 20"
                          />
                        )}

                        {/* Resultado final */}
                        <div className="mt-4 p-4 rounded-2xl border-2 border-brand bg-white dark:bg-stone-950">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                                  Disponível para gastar
                                </div>
                                <InfoTip>
                                  O que podes gastar sem medo: o que entra na
                                  tua conta, já com IVA e Segurança Social
                                  reservados. A retenção foi adiantada pelo
                                  cliente — será acertada no IRS anual.
                                </InfoTip>
                              </div>
                              <div className="text-xs text-stone-400 mt-0.5">
                                {resultRecibo.taxaIVA > 0
                                  ? "Depois de IVA e SS reservados"
                                  : "Depois de SS reservada"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-display text-2xl font-semibold text-brand">
                                <AnimatedNumber value={resultRecibo.liquido} />
                              </div>
                              <div className="text-xs text-stone-400">
                                {pct(resultRecibo.liquido / (bruto || 1))} do
                                total
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ── Alertas fiscais contextuais ─────────────────── */}
                        <div className="mt-3 space-y-2">
                          {/* Avisos do motor fiscal (dispensa retenção, limites) */}
                          {resultRecibo.avisos?.map((a: string, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-2.5 p-3 rounded-xl border bg-alert-bg border-alert-border"
                            >
                              <span className="text-alert-text mt-0.5 flex-shrink-0">
                                <Warning size={14} />
                              </span>
                              <span className="text-xs leading-relaxed text-alert-text">
                                {a}
                              </span>
                            </div>
                          ))}

                          {/* Alerta: IVA cobrado mas faturação estimada abaixo do limite Art. 53.º */}
                          {temIva && base * 12 < IVA_ISENCAO_LIMITE && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl border bg-alert-bg border-alert-border">
                              <span className="text-alert-text mt-0.5 flex-shrink-0">
                                <Warning size={14} />
                              </span>
                              <span className="text-xs leading-relaxed text-alert-text">
                                Com esta faturação estimada (
                                {fmt(Math.round(base * 12))}/ano), provavelmente
                                qualificavas para{" "}
                                <strong>isenção de IVA (Art. 53.º CIVA)</strong>{" "}
                                — limite{" "}
                                {IVA_ISENCAO_LIMITE.toLocaleString("pt-PT")}{" "}
                                €/ano. Sendo isento, não cobras IVA e o teu
                                disponível sobe para{" "}
                                <strong>
                                  {fmt(
                                    Math.round(
                                      bruto -
                                        bruto *
                                          TIPO_ATIVIDADE_PARAMS[tipoAtiv].ret -
                                        base * 0.7 * SS_TAXA_TI,
                                    ),
                                  )}
                                </strong>
                                .
                              </span>
                            </div>
                          )}

                          {/* Info: retenção possivelmente reembolsada (abaixo do mínimo de existência) */}
                          {resultRecibo.retencaoIRS > 0 &&
                            base * 12 < MINIMO_EXISTENCIA_2026 && (
                              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-brand/30 bg-brand-light">
                                <span className="text-brand mt-0.5 flex-shrink-0">
                                  <Check size={14} />
                                </span>
                                <span className="text-xs leading-relaxed text-brand-dark">
                                  Com faturação anual estimada de{" "}
                                  {fmt(Math.round(base * 12))} €, o teu
                                  rendimento coletável fica abaixo do{" "}
                                  <strong>
                                    mínimo de existência (
                                    {MINIMO_EXISTENCIA_2026.toLocaleString(
                                      "pt-PT",
                                    )}{" "}
                                    €)
                                  </strong>{" "}
                                  — IRS = 0 €. A retenção na fonte (
                                  {fmt(
                                    Math.round(resultRecibo.retencaoIRS * 12),
                                  )}
                                  /ano) deve ser totalmente{" "}
                                  <strong>reembolsada</strong> na declaração de
                                  IRS anual.
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    </>
                  )}

                  {modoInput === "anual" && (
                    /* Breakdown anual RV */
                    <div className="space-y-1 flex-1">
                      <DetalheRow
                        label="Faturação bruta anual"
                        value={resultAnualRV.faturacao}
                        type="neutral"
                      />
                      <DetalheRow
                        label={`Rendimento coletável (coef. ${pct(resultAnualRV.coeficiente)})`}
                        value={resultAnualRV.rendColetavel}
                        type="neutral"
                        note="Regime simplificado — 25% presumido como despesa"
                      />
                      {resultAnualRV.ssAnual > 0 && (
                        <DetalheRow
                          label="Dedução SS paga (Art. 31.º n.º 2 CIRS)"
                          value={-resultAnualRV.ssAnual}
                          type="deducao"
                          note="SS dedutível ao rendimento coletável"
                        />
                      )}
                      {resultAnualRV.isencaoJovemValor > 0 && (
                        <DetalheRow
                          label={`IRS Jovem — isenção ${pct(resultAnualRV.isencaoJovemPct)} (Art. 12.º-B)`}
                          value={-resultAnualRV.isencaoJovemValor}
                          type="deducao"
                          note={`Limite ${IRS_JOVEM_LIMITE_2026.toLocaleString("pt-PT")}€ (55×IAS)`}
                        />
                      )}
                      <DetalheRow
                        label="Rendimento tributável"
                        value={resultAnualRV.rendTributavel}
                        type="subtotal"
                        note={
                          resultAnualRV.rendTributavel <= MINIMO_EXISTENCIA_2026
                            ? "Abaixo do mínimo de existência — IRS = 0€"
                            : ""
                        }
                      />
                      <DetalheRow
                        label="IRS liquidado (escalões progressivos)"
                        value={-resultAnualRV.irs}
                        type="warning"
                        note={`Taxa efetiva ${pct(resultAnualRV.taxaEfetiva)}`}
                      />
                      {resultAnualRV.ssAnual > 0 && (
                        <DetalheRow
                          label="Segurança Social (21,4% × 70%)"
                          value={-resultAnualRV.ssAnual}
                          type="deducao"
                          note="IAS 2026: 537,13€ · máx. 12×IAS/mês"
                        />
                      )}

                      <div className="mt-4 p-4 rounded-2xl border-2 border-brand bg-white dark:bg-stone-950">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                              Líquido anual
                            </div>
                            <div className="text-xs text-stone-400 mt-0.5">
                              ≈ {fmt(resultAnualRV.liquido / 12)}/mês
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-2xl font-semibold text-brand">
                              <AnimatedNumber value={resultAnualRV.liquido} />
                            </div>
                            <div className="text-xs text-stone-400">
                              {pct(resultAnualRV.liquido / (brutoAnual || 1))}{" "}
                              do bruto
                            </div>
                          </div>
                        </div>
                      </div>

                      {resultAnualRV.acertoIRS > 0 && (
                        <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl border bg-brand-light border-brand/30">
                          <span className="text-brand mt-0.5 flex-shrink-0">
                            <Check size={14} />
                          </span>
                          <span className="text-xs leading-relaxed text-brand-dark">
                            Reembolso estimado IRS:{" "}
                            {fmt(resultAnualRV.acertoIRS)} (retiveste{" "}
                            {fmt(resultAnualRV.retencaoAnual)} · IRS real{" "}
                            {fmt(resultAnualRV.irs)})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-stone-400 mt-5 leading-relaxed">
                    Estimativa fiscal 2026. Escalões IRS atualizados 3,51% pelo
                    OE2026. Mínimo de existência:{" "}
                    {MINIMO_EXISTENCIA_2026.toLocaleString("pt-PT")}€. Não
                    substitui aconselhamento de contabilista certificado.
                  </p>
                  <Link
                    href="/dashboard/simulador"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
                  >
                    Ver apuramento IRS anual detalhado por escalões
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M5 12h13M13 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </m.div>
              ) : (
                /* ── Painel Empresa ── */
                <m.div
                  key="empresa"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col flex-1"
                >
                  {modoInput === "recibo" && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-800">
                      <Warning
                        size={13}
                        className="flex-shrink-0 mt-0.5 text-stone-400"
                      />
                      <span>
                        Comparação baseada em {fmt(bruto)} × 12 ={" "}
                        {fmt(brutoAnual)}/ano. Muda para o modo Anual para
                        valores mais precisos.
                      </span>
                    </div>
                  )}

                  <div className="mb-8">
                    <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">
                      Líquido estimado — empresa (Lda)
                    </div>
                    <div className="font-display text-5xl font-semibold leading-none mb-1 text-brand">
                      <AnimatedNumber value={resultEmpresa.liquidoGerente} />
                    </div>
                    <div className="text-sm text-stone-400 mt-1">
                      de <AnimatedNumber value={brutoAnual} /> faturados/ano
                    </div>
                  </div>

                  {/* Barra empresa — atualizada com TA e benefícios */}
                  <div className="mb-6">
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
                      {(() => {
                        const total = brutoAnual || 1;
                        const irsDiv = opcaoEnglobamento
                          ? resultEmpresa.irsDividendosEnglobamento
                          : resultEmpresa.irsDividendosLiberatoria;
                        return (
                          <>
                            <div
                              style={{
                                width: `${(resultEmpresa.liquidoGerente / total) * 100}%`,
                                background: "#1D9E75",
                              }}
                              className="transition-all duration-500 rounded-l-full"
                            />
                            <div
                              style={{
                                width: `${(resultEmpresa.ircAposBeneficios / total) * 100}%`,
                                background: "#9FE1CB",
                              }}
                              className="transition-all duration-500"
                            />
                            {resultEmpresa.ta.total > 0 && (
                              <div
                                style={{
                                  width: `${(resultEmpresa.ta.total / total) * 100}%`,
                                  background: "#FCD34D",
                                }}
                                className="transition-all duration-500"
                              />
                            )}
                            {irsDiv > 0 && (
                              <div
                                style={{
                                  width: `${(irsDiv / total) * 100}%`,
                                  background: "#FBBF24",
                                }}
                                className="transition-all duration-500"
                              />
                            )}
                            <div
                              style={{
                                width: `${(resultEmpresa.totalCustos / total) * 100}%`,
                                background: "#D3D1C7",
                              }}
                              className="transition-all duration-500 rounded-r-full"
                            />
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "Teu", color: "#1D9E75", show: true },
                        {
                          label: "IRC após benefícios",
                          color: "#9FE1CB",
                          show: true,
                        },
                        {
                          label: "Tributação Autónoma",
                          color: "#FCD34D",
                          show: resultEmpresa.ta.total > 0,
                        },
                        {
                          label: `IRS Div. (${opcaoEnglobamento ? "englobamento" : "28%"})`,
                          color: "#FBBF24",
                          show: distribuirDividendos,
                        },
                        {
                          label: "Custos + salário",
                          color: "#B4B2A9",
                          show: true,
                        },
                      ]
                        .filter((l) => l.show)
                        .map((l) => (
                          <div
                            key={l.label}
                            className="flex items-center gap-1.5"
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: l.color }}
                            />
                            <span className="text-xs text-stone-500">
                              {l.label}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Breakdown empresa — detalhado */}
                  <div className="space-y-1 flex-1">
                    <DetalheRow
                      label="Faturação"
                      value={brutoAnual}
                      type="neutral"
                      note="Volume de negócios anual"
                    />

                    {resultEmpresa.despesasOper > 0 && (
                      <DetalheRow
                        label="Despesas operacionais"
                        value={-resultEmpresa.despesasOper}
                        type="deducao"
                        note="Dedutíveis ao lucro tributável"
                      />
                    )}
                    {resultEmpresa.custosExtra > 0 && (
                      <DetalheRow
                        label="Custos estrutura empresa"
                        value={-resultEmpresa.custosExtra}
                        type="deducao"
                        note="Contabilidade, software, etc."
                      />
                    )}
                    {resultEmpresa.custoConstituicao > 0 && (
                      <DetalheRow
                        label="Custo constituição (amortizado)"
                        value={-resultEmpresa.custoConstituicao}
                        type="deducao"
                        note={`${custoConstituicao}€ ÷ ${anosAmortizacao} anos`}
                      />
                    )}
                    {resultEmpresa.salGerente > 0 && (
                      <>
                        <DetalheRow
                          label="Salário gerente (bruto anual)"
                          value={-resultEmpresa.salGerente}
                          type="deducao"
                          note="Custo dedutível da empresa"
                        />
                        <DetalheRow
                          label="SS empresa + trabalhador"
                          value={-resultEmpresa.ssSalGerente}
                          type="deducao"
                          note="23,75% (empresa) + 11% (trabalhador)"
                        />
                      </>
                    )}

                    <DetalheRow
                      label="Lucro tributável"
                      value={resultEmpresa.lucroTributavel}
                      type="subtotal"
                      note="Antes de IRC"
                    />
                    <DetalheRow
                      label="IRC base — coleta (PME 15%/50k€ + 19%)"
                      value={-resultEmpresa.coleta}
                      type="deducao"
                      note="OE2026: taxa geral 19% (era 20% em 2025)"
                    />

                    {/* Benefícios fiscais */}
                    {resultEmpresa.beneficios.rfai > 0 && (
                      <DetalheRow
                        label={`RFAI — ${regiaoRFAI === "interior" ? "Norte/Centro/Alentejo/Açores/Madeira (30%)" : "Lisboa/Algarve (10%)"}`}
                        value={resultEmpresa.beneficios.rfai}
                        type="beneficio"
                        note={
                          resultEmpresa.beneficios.rfai <
                          resultEmpresa.beneficios.rfaiBruto
                            ? `Bruto: ${fmt(Math.round(resultEmpresa.beneficios.rfaiBruto))} — limitado à coleta`
                            : "Dedução à coleta IRC (Art. 22.º CFI)"
                        }
                      />
                    )}
                    {resultEmpresa.beneficios.dlrr > 0 && (
                      <DetalheRow
                        label="DLRR — 10% dos lucros retidos reinvestidos"
                        value={resultEmpresa.beneficios.dlrr}
                        type="beneficio"
                        note="Limite 25% da coleta IRC (Art. 27.º-A CFI)"
                      />
                    )}
                    {resultEmpresa.beneficios.sifide > 0 && (
                      <DetalheRow
                        label={`SIFIDE II — I&D (${tipoSifide === "startup" ? "82,5%" : tipoSifide === "pme_jovem" ? "47,5%" : "32,5%"})`}
                        value={resultEmpresa.beneficios.sifide}
                        type="beneficio"
                        note="Certificação ANI. Reportável 12 anos."
                      />
                    )}
                    {resultEmpresa.beneficios.total > 0 && (
                      <DetalheRow
                        label="IRC após benefícios fiscais"
                        value={-resultEmpresa.ircAposBeneficios}
                        type="deducao"
                        note={`Poupança RFAI+DLRR+SIFIDE: ${fmt(Math.round(resultEmpresa.beneficios.total))}`}
                      />
                    )}

                    {/* Tributação Autónoma */}
                    {resultEmpresa.ta.total > 0 && (
                      <>
                        {resultEmpresa.ta.viatura > 0 && (
                          <DetalheRow
                            label={`TA — Viaturas (${pct(TA_VIATURAS[tipoViatura])}${emPrejuizo && !excecaoPrejuizo ? " +10pp" : ""})`}
                            value={-resultEmpresa.ta.viatura}
                            type="warning"
                            note="Art. 88.º n.º 3/18 CIRC — sobre encargos anuais"
                          />
                        )}
                        {resultEmpresa.ta.representacao > 0 && (
                          <DetalheRow
                            label="TA — Despesas de representação (10%)"
                            value={-resultEmpresa.ta.representacao}
                            type="warning"
                            note="Art. 88.º n.º 7 CIRC"
                          />
                        )}
                        {resultEmpresa.ta.ajudasCusto > 0 && (
                          <DetalheRow
                            label="TA — Ajudas de custo (5%)"
                            value={-resultEmpresa.ta.ajudasCusto}
                            type="warning"
                            note="Art. 88.º n.º 9 CIRC"
                          />
                        )}
                        {resultEmpresa.ta.naoDocumentadas > 0 && (
                          <DetalheRow
                            label="TA — Despesas não documentadas (50%)"
                            value={-resultEmpresa.ta.naoDocumentadas}
                            type="warning"
                            note="Art. 88.º n.º 1 CIRC"
                          />
                        )}
                      </>
                    )}

                    <DetalheRow
                      label="Derrama municipal (~1,5%)"
                      value={-resultEmpresa.derramaMuni}
                      type="deducao"
                      note="Estimativa Lisboa/Porto — varia por município"
                    />

                    {/* Dividendos */}
                    {distribuirDividendos ? (
                      <>
                        {resultEmpresa.irsDividendosEnglobamento <
                          resultEmpresa.irsDividendosLiberatoria && (
                          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                            <Check
                              size={12}
                              className="flex-shrink-0 mt-0.5 text-emerald-600"
                            />
                            <span className="text-[11px] text-emerald-700">
                              Englobamento poupa{" "}
                              {fmt(
                                Math.round(
                                  resultEmpresa.irsDividendosLiberatoria -
                                    resultEmpresa.irsDividendosEnglobamento,
                                ),
                              )}
                              /ano vs. taxa liberatória 28%
                              {opcaoEnglobamento
                                ? " — já aplicado ✓"
                                : " — activa acima"}
                              .
                            </span>
                          </div>
                        )}
                        <DetalheRow
                          label={
                            opcaoEnglobamento
                              ? `IRS dividendos (englobamento 50% × ${pct(resultEmpresa.taxaMarginalGerente)} marg.)`
                              : "IRS dividendos (28% taxa liberatória)"
                          }
                          value={
                            -(opcaoEnglobamento
                              ? resultEmpresa.irsDividendosEnglobamento
                              : resultEmpresa.irsDividendosLiberatoria)
                          }
                          type="warning"
                          note={
                            opcaoEnglobamento
                              ? "Art. 40.º-A CIRS — 50% incluído no rendimento coletável"
                              : "Art. 71.º CIRS — taxa liberatória final"
                          }
                        />
                      </>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border bg-white border-stone-100">
                        <span className="text-xs text-stone-500">
                          Lucro retido na empresa (não distribuído)
                        </span>
                        <span className="text-xs font-semibold text-stone-600">
                          {fmt(resultEmpresa.lucroLiquido)}
                        </span>
                      </div>
                    )}

                    <div className="mt-4 p-4 rounded-2xl border-2 border-brand bg-white dark:bg-stone-950">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                            Líquido para o dono
                          </div>
                          <div className="text-xs text-stone-400 mt-0.5">
                            {resultEmpresa.salGerente > 0
                              ? "Salário líquido + dividendos líquidos"
                              : "Após IRC, TA, derrama e IRS dividendos"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-2xl font-semibold text-brand">
                            <AnimatedNumber
                              value={resultEmpresa.liquidoGerente}
                            />
                          </div>
                          <div className="text-xs text-stone-400">
                            {pct(
                              resultEmpresa.liquidoGerente / (brutoAnual || 1),
                            )}{" "}
                            do bruto
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-stone-400 mt-5 leading-relaxed">
                    IRC PME 2026: 15%/50k€ + 19% (OE2026). TA viaturas:
                    8%/25%/32% (OE2025); PHEV: 2,5%/7,5%/15%. RFAI: 30% interior
                    + 10% litoral. SIFIDE II: 32,5%–82,5% (certificação ANI).
                    Derrama ~1,5%. Não considera tributação autónoma
                    personalizada, englobamento com outros rendimentos, RFAI por
                    contrato, nem custos de constituição individuais. Validar
                    com contabilista certificado (OCC).
                  </p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Rodapé: comparação integrada ──────────────────────────────────── */}
        <div className="border-t border-stone-100 bg-stone-50 px-8 py-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-600">
            Comparação — mesmos inputs, dois cenários
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
            {/* Card Recibos Verdes */}
            <div
              className={`relative rounded-2xl p-4 transition-all ${
                !empresaVence
                  ? "border-2 border-brand bg-brand-light dark:bg-brand/10"
                  : "border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
              }`}
            >
              {!empresaVence && (
                <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Melhor
                </span>
              )}
              <div
                className={`text-sm font-semibold ${!empresaVence ? "text-brand-dark" : "text-stone-700"}`}
              >
                Recibos Verdes
              </div>
              <div className="mt-0.5 text-[11px] text-stone-400">
                Categoria B · Regime simplificado
              </div>
              <div
                className={`mt-2 font-display text-2xl font-semibold tabular-nums ${!empresaVence ? "text-brand-dark" : "text-stone-800 dark:text-stone-200"}`}
              >
                <AnimatedNumber value={resultAnualRV.liquido} />
              </div>
              <div className="text-[11px] text-stone-400">líquido/ano</div>
              <div className="mt-2 text-[11px] text-stone-400 space-y-0.5">
                <div>IRS: −{fmt(resultAnualRV.irs)}</div>
                <div>SS: −{fmt(resultAnualRV.ssAnual)}</div>
              </div>
            </div>

            {/* Card Empresa */}
            <div
              className={`relative rounded-2xl p-4 transition-all ${
                empresaVence
                  ? "border-2 border-brand bg-brand-light dark:bg-brand/10"
                  : "border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
              }`}
            >
              {empresaVence && (
                <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Melhor
                </span>
              )}
              <div
                className={`text-sm font-semibold ${empresaVence ? "text-brand-dark" : "text-stone-700"}`}
              >
                Empresa (Lda)
              </div>
              <div className="mt-0.5 text-[11px] text-stone-400">
                IRC PME +{" "}
                {distribuirDividendos ? "dividendos 28%" : "lucro retido"}
              </div>
              <div
                className={`mt-2 font-display text-2xl font-semibold tabular-nums ${empresaVence ? "text-brand-dark" : "text-stone-800 dark:text-stone-200"}`}
              >
                <AnimatedNumber value={resultEmpresa.liquidoGerente} />
              </div>
              <div className="text-[11px] text-stone-400">líquido/ano</div>
              <div className="mt-2 text-[11px] text-stone-400 space-y-0.5">
                <div>IRC: −{fmt(resultEmpresa.ircAposBeneficios)}</div>
                {resultEmpresa.ta.total > 0 && (
                  <div>TA: +{fmt(Math.round(resultEmpresa.ta.total))}</div>
                )}
                <div>Derrama: −{fmt(resultEmpresa.derramaMuni)}</div>
                {distribuirDividendos && (
                  <div>
                    IRS div: −
                    {fmt(
                      Math.round(
                        opcaoEnglobamento
                          ? resultEmpresa.irsDividendosEnglobamento
                          : resultEmpresa.irsDividendosLiberatoria,
                      ),
                    )}
                  </div>
                )}
                <div>Custos: −{fmt(resultEmpresa.totalCustos)}</div>
              </div>
            </div>
          </div>

          {/* Veredicto */}
          <div
            className={`flex items-center gap-2.5 rounded-2xl p-3.5 text-sm font-semibold ${
              empresaVence
                ? "bg-brand-light text-brand-dark"
                : "bg-cream text-stone-700"
            }`}
          >
            <span className="flex-shrink-0 text-brand">
              <Check size={16} />
            </span>
            {empresaVence ? (
              <span>
                Com {fmt(brutoAnual)}/ano, a empresa deixa-te com mais{" "}
                <strong>{fmt(diferenca)}/ano</strong> (
                {pct(diferenca / (brutoAnual || 1))}).
                {breakEven && ` Ponto de viragem: ${fmt(breakEven)}/ano.`}
              </span>
            ) : (
              <span>
                Com {fmt(brutoAnual)}/ano, recibos verdes deixam-te com mais{" "}
                <strong>{fmt(diferenca)}/ano</strong> (
                {pct(diferenca / (brutoAnual || 1))}).
                {breakEven &&
                  ` A empresa compensa acima de ${fmt(breakEven)}/ano.`}
              </span>
            )}
          </div>

          {/* Nota legal */}
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-4">
            <span className="mt-0.5 flex-shrink-0 text-alert-text">
              <Warning size={14} />
            </span>
            <p className="text-xs leading-relaxed text-alert-text">
              <strong>Fontes:</strong> Art. 31.º, 68.º, 101.º, 101.º-B e 12.º-B
              CIRS | CIVA Art. 53.º e 9.º | CRC (SS independentes) | OE2026 (Lei
              n.º 73-A/2025) | IAS 2026: 537,13€. Estimativa de ordem de
              grandeza. Inclui Tributação Autónoma (Art. 88.º CIRC),
              Englobamento (Art. 40.º-A CIRS), RFAI/DLRR/SIFIDE II e custos de
              constituição. Não considera regime de contabilidade organizada
              para TI, RFAI contratual, benefícios municipais (IMI/IMT) nem
              particularidades individuais. Decisão de constituir sociedade deve
              ser validada com contabilista certificado (OCC).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
