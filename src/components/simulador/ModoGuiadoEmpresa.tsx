"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  ChangeEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { m, AnimatePresence } from "motion/react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import InfoTip from "@/components/ui/InfoTip";
import Link from "next/link";
import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import {
  Check,
  Warning,
  ArrowRight,
  ArrowLeft,
  Building,
  Briefcase,
  ChevronDown,
  Sparkle,
  Calendar,
  ChartProjection,
  MapPin,
  Rocket,
  Shield,
  FileSign,
  Scale,
  Target,
  Search,
  Crosshair,
  Globe,
  Laptop,
  Plane,
} from "@/components/ui/Icons";

const MapaCarregar = () => (
  <div className="h-64 w-full animate-pulse rounded-3xl border border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50" />
);
const MapaBeneficiosRegioes = dynamic(
  () => import("@/components/comparar/MapaBeneficiosRegioes"),
  { ssr: false, loading: MapaCarregar },
);
import { pct, fmt } from "@/lib/format";
import {
  ESCALOES_IRS,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  DIVIDENDOS_TAXA,
  IFICI_TAXA,
  IFICI_PRAZO_ANOS,
  IVA_TAXAS,
  SOURCES,
  SS_DEPENDENTE,
  DERRAMA_MAX,
  DIV_INCLUSAO_ENGLOBAMENTO as DIV_INCLUSAO_ENGLOBAMENTO_SRC,
  SMN as SMN_SRC,
  TA_VIATURAS_COMBUSTAO,
  TA_VIATURAS_PHEV,
  TA_VIATURAS_ELETRICA,
  TA_REPRESENTACAO,
  TA_AJUDAS_CUSTO,
  TA_NAO_DOCUMENTADAS,
  TA_AGRAVAMENTO_PREJUIZO,
  RFAI_TAXA_INTERIOR as RFAI_TAXA_INTERIOR_SRC,
  RFAI_TAXA_INTERIOR_EXCEDENTE,
  RFAI_TAXA_LITORAL as RFAI_TAXA_LITORAL_SRC,
  RFAI_LIMITE_INVESTIMENTO_INTERIOR,
  RFAI_LIMITE_COLETA as RFAI_LIMITE_COLETA_SRC,
  DLRR_TAXA as DLRR_TAXA_SRC,
  DLRR_LIMITE_COLETA as DLRR_LIMITE_COLETA_SRC,
  DLRR_LIMITE_LUCROS,
  SIFIDE_TAXA_BASE as SIFIDE_TAXA_BASE_SRC,
  SIFIDE_TAXA_INCREMENTAL as SIFIDE_TAXA_INCREMENTAL_SRC,
  SIFIDE_MAJORACAO_PME_JOVEM,
  IMI_TAXA_PADRAO as IMI_TAXA_PADRAO_SRC,
  IMT_TAXA_COMERCIAL as IMT_TAXA_COMERCIAL_SRC,
  IS_TAXA_AQUISICAO as IS_TAXA_AQUISICAO_SRC,
} from "@/lib/fiscal-data";
import {
  TODAS_LOCALIZACOES,
  parametrosFiscaisPorRegiao,
  parametrosPorCoords,
  type ParametrosFiscaisRegiao,
} from "@/lib/incentivos-regioes";

// ─── Constantes fiscais — derivadas de fiscal-data.ts ────────────────────────

const IRC_LIMITE = IRC_LIMITE_PME.value;
const IRS_DIVIDENDOS = DIVIDENDOS_TAXA.value;
const DIV_INCLUSAO_ENGLOBAMENTO = DIV_INCLUSAO_ENGLOBAMENTO_SRC.value;
const SS_EMP_TAXA = SS_DEPENDENTE.entidade.value;
const SS_TRAB_TAXA = SS_DEPENDENTE.trabalhador.value;
const CUSTO_CONTABILIDADE_DEFAULT = 2_400;
const CUSTO_SOFTWARE_DEFAULT = 300;
const CUSTO_CONSTITUICAO_DEFAULT = 360;
const SMN_2026 = SMN_SRC.value;

// TA (Art. 88.º CIRC 2026)
type TipoViaturaGuiado =
  | "nenhuma"
  | "eletrica"
  | "phev_baixo"
  | "phev_medio"
  | "phev_alto"
  | "comb_baixo"
  | "comb_medio"
  | "comb_alto";

const TA_TAXAS_GUIADO: Record<TipoViaturaGuiado, number> = {
  nenhuma: 0,
  eletrica: TA_VIATURAS_ELETRICA.value,
  phev_baixo: TA_VIATURAS_PHEV.value.ate37500,
  phev_medio: TA_VIATURAS_PHEV.value.ate45000,
  phev_alto: TA_VIATURAS_PHEV.value.acima45000,
  comb_baixo: TA_VIATURAS_COMBUSTAO.value.ate37500,
  comb_medio: TA_VIATURAS_COMBUSTAO.value.ate45000,
  comb_alto: TA_VIATURAS_COMBUSTAO.value.acima45000,
};

const TIPO_VIATURA_META: Record<TipoViaturaGuiado, { label: string; sub: string }> = {
  nenhuma: { label: "Sem viatura", sub: "0%" },
  eletrica: { label: "Elétrica", sub: "Isenta (0%)" },
  phev_baixo: { label: "PHEV ≤ 37.500€", sub: "2,5%" },
  phev_medio: { label: "PHEV 37.500–45.000€", sub: "7,5%" },
  phev_alto: { label: "PHEV > 45.000€", sub: "15%" },
  comb_baixo: { label: "Combustão < 37.500€", sub: "8%" },
  comb_medio: { label: "Combustão 37.500–45.000€", sub: "25%" },
  comb_alto: { label: "Combustão ≥ 45.000€", sub: "32%" },
};

const TA_TAXA_REPRESENTACAO = TA_REPRESENTACAO.value;
const TA_TAXA_AJUDAS_CUSTO = TA_AJUDAS_CUSTO.value;
const TA_TAXA_NAO_DOC = TA_NAO_DOCUMENTADAS.value;
const TA_AGRAVAMENTO = TA_AGRAVAMENTO_PREJUIZO.value;

// RFAI (Art. 22.º–26.º CFI)
type RegiaoRFAIGuiado = "interior" | "litoral";
const RFAI_TAXA: Record<RegiaoRFAIGuiado, number> = { interior: RFAI_TAXA_INTERIOR_SRC.value, litoral: RFAI_TAXA_LITORAL_SRC.value };
const RFAI_TAXA_EXCEDENTE = RFAI_TAXA_INTERIOR_EXCEDENTE.value;
const RFAI_LIMITE_INVEST = RFAI_LIMITE_INVESTIMENTO_INTERIOR.value;
const RFAI_LIMITE_COLETA = RFAI_LIMITE_COLETA_SRC.value;

// DLRR (Art. 27.º–34.º CFI)
const DLRR_TAXA = DLRR_TAXA_SRC.value;
const DLRR_LIMITE_COLETA = DLRR_LIMITE_COLETA_SRC.value;
const DLRR_MAX_LUCROS = DLRR_LIMITE_LUCROS.value;

// SIFIDE II (Art. 35.º–42.º CFI)
type TipoEmpresaSifide = "startup" | "pme_jovem" | "pme_normal" | "grande";
const SIFIDE_TAXA_BASE = SIFIDE_TAXA_BASE_SRC.value;
const SIFIDE_TAXA_INCREMENTAL = SIFIDE_TAXA_INCREMENTAL_SRC.value;
const SIFIDE_MAJORACAO_PME = SIFIDE_MAJORACAO_PME_JOVEM.value;

const SIFIDE_META: Record<TipoEmpresaSifide, { label: string; taxa: number; sub: string }> = {
  startup: { label: "Startup", taxa: SIFIDE_TAXA_BASE + SIFIDE_TAXA_INCREMENTAL, sub: "82,5% — sem histórico I&D" },
  pme_jovem: { label: "PME jovem", taxa: SIFIDE_TAXA_BASE + SIFIDE_MAJORACAO_PME, sub: "47,5% — < 2 exercícios" },
  pme_normal: { label: "PME", taxa: SIFIDE_TAXA_BASE, sub: "32,5% — taxa base" },
  grande: { label: "Grande empresa", taxa: SIFIDE_TAXA_BASE, sub: "32,5% — taxa base" },
};

// IMI/IMT
const IMI_TAXA_PADRAO = IMI_TAXA_PADRAO_SRC.value;
const IMT_TAXA_COMERCIAL = IMT_TAXA_COMERCIAL_SRC.value;
const IS_TAXA_AQUISICAO = IS_TAXA_AQUISICAO_SRC.value;

// Empresa digital / sede virtual
const CUSTO_SEDE_VIRTUAL_MIN = 50;
const CUSTO_SEDE_VIRTUAL_MAX = 150;
const CUSTO_SEDE_VIRTUAL_DEFAULT = 100;

// Representante fiscal (não residentes)
const CUSTO_REPRESENTANTE_FISCAL_MIN = 250;
const CUSTO_REPRESENTANTE_FISCAL_MAX = 500;
const CUSTO_REPRESENTANTE_FISCAL_DEFAULT = 350;

// IFICI (Art. 58.º-A EBF)
const IFICI_TAXA_FLAT = IFICI_TAXA.value;

type TipoSede = "fisica" | "virtual" | "coworking";
type PerfilFundador = "residente" | "estrangeiro_ue" | "estrangeiro_extra_ue";

type Passo = 0 | 1 | "local" | 2 | 3 | 4 | "resultado" | "aseguir";

type TipoSociedade = "unipessoal" | "quotas";

// URLs legais para citação inline
const LEI = {
  art87circ: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/irc87.aspx",
  art88circ: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/irc88.aspx",
  art71cirs: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs71.aspx",
  art40aCirs: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs40a.aspx",
  art41bEBF: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf-artigo-41-b.aspx",
  art58aEBF: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf-artigo-58-a.aspx",
  cfi: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2014-128418757",
  csc: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1986-34443375",
  empresaOnline: "https://www2.gov.pt/espaco-empresa/empresa-online",
  representanteFiscal: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Servicos_Mais_Utilizados/representacao-fiscal/Pages/default.aspx",
  portaria208: "https://diariodarepublica.pt/dr/detalhe/portaria/208-2017-107695600",
  lgt: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/lgt/Pages/default.aspx",
};

function LeiRef({ artigo, url }: { artigo: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 rounded bg-stone-100 px-1 py-0.5 text-[9px] font-semibold text-stone-500 transition-colors hover:bg-brand-light hover:text-brand dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-brand/10 dark:hover:text-brand"
      title={`Ver legislação: ${artigo}`}
    >
      {artigo}
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>
    </a>
  );
}

// ─── IRS progressivo (englobamento dividendos) ──────────────────────────────

function calcularIRS(coletavel: number): number {
  const escaloes = ESCALOES_IRS.value;
  let imposto = 0;
  let restante = Math.max(0, coletavel);
  for (let i = 0; i < escaloes.length; i++) {
    const lim = escaloes[i].ate ?? Infinity;
    const piso = i === 0 ? 0 : (escaloes[i - 1].ate ?? 0);
    const faixa = lim - piso;
    const nesta = Math.min(restante, faixa);
    imposto += nesta * escaloes[i].taxa;
    restante -= nesta;
    if (restante <= 0) break;
  }
  return imposto;
}

// ─── Simulação empresa simplificada ──────────────────────────────────────────

interface ResultadoTA {
  viatura: number;
  representacao: number;
  ajudasCusto: number;
  naoDocumentadas: number;
  total: number;
}

interface ResultadoBeneficios {
  rfai: number;
  rfaiBruto: number;
  dlrr: number;
  dlrrBruto: number;
  sifide: number;
  sifideBruto: number;
  rfaiContratual: number;
  total: number;
}

interface ResultadoEmpresaGuiado {
  faturacao: number;
  despesasOper: number;
  custosEstrutura: number;
  salGerente: number;
  ssSalGerente: number;
  custoConstituicao: number;
  totalCustos: number;
  lucroTributavel: number;
  coleta: number;
  ta: ResultadoTA;
  beneficios: ResultadoBeneficios;
  ircAposBeneficios: number;
  derrama: number;
  ircTotal: number;
  lucroLiquido: number;
  dividendos: number;
  irsDividendosLiberatoria: number;
  irsDividendosEnglobamento: number;
  irsDividendos: number;
  taxaMarginalGerente: number;
  liquidoGerente: number;
  taxaEfetiva: number;
  imiAnual: number;
  poupancaIMI: number;
  imtOneTime: number;
  poupancaIMT: number;
  custoMunicipalAnual: number;
  custoRepresentanteFiscal: number;
  custoSedeVirtual: number;
  irsDividendosIFICI: number;
  poupancaIFICI: number;
}

function calcularTaxaMarginal(coletavel: number): number {
  const escaloes = ESCALOES_IRS.value;
  for (let i = escaloes.length - 1; i >= 0; i--) {
    const piso = i === 0 ? 0 : (escaloes[i - 1].ate ?? 0);
    if (coletavel > piso) return escaloes[i].taxa;
  }
  return escaloes[0].taxa;
}

function simularEmpresaGuiado(
  faturacao: number,
  despesasOper: number,
  custosEstrutura: number,
  salGerenteMensal: number,
  distribuirDividendos: boolean,
  opcaoEnglobamento: boolean,
  incluirConstituicao: boolean,
  custoConstituicaoVal: number,
  anosAmortizacao: number,
  // TA
  tipoViatura: TipoViaturaGuiado,
  encargosViatura: number,
  despRepresentacao: number,
  ajudasCusto: number,
  naoDocumentadas: number,
  emPrejuizo: boolean,
  excecaoPrejuizo: boolean,
  // Benefícios
  rfaiRegiao: RegiaoRFAIGuiado,
  rfaiInvest: number,
  primeirosAnos: boolean,
  dlrrLucros: number,
  sifideDespesas: number,
  tipoSifide: TipoEmpresaSifide,
  rfaiContratualValor: number,
  // Municipal
  temImovel: boolean,
  vptImovel: number,
  taxaIMI: number,
  isencaoIMI: boolean,
  valorAquisicao: number,
  isencaoIMT: boolean,
  anosAmortIMT: number,
  // Localização
  paramLocal?: ParametrosFiscaisRegiao,
  // Novo: sede virtual e estrangeiro
  sedeVirtualCusto?: number,
  isEstrangeiro?: boolean,
  custoRepFiscal?: number,
  ifici?: boolean,
): ResultadoEmpresaGuiado {
  const ircPME = paramLocal?.ircPME ?? IRC_TAXA_PME.value;
  const ircGeral = paramLocal?.ircGeral ?? IRC_TAXA_GERAL.value;
  const derramaTaxa = paramLocal?.derramaEstimada ?? DERRAMA_MAX.value;

  const custoSedeVirtualAnual = sedeVirtualCusto ? sedeVirtualCusto * 12 : 0;
  const custoRepresentante = isEstrangeiro && custoRepFiscal ? custoRepFiscal : 0;

  const salGerente = salGerenteMensal * 12;
  const ssSalGerente = salGerente * (SS_EMP_TAXA + SS_TRAB_TAXA);
  const custoConstituicao = incluirConstituicao
    ? Math.round(custoConstituicaoVal / anosAmortizacao)
    : 0;
  const totalCustos =
    despesasOper + custosEstrutura + salGerente + ssSalGerente + custoConstituicao
    + custoSedeVirtualAnual + custoRepresentante;
  const lucroTributavel = Math.max(0, faturacao - totalCustos);

  // IRC coleta
  let coleta = 0;
  if (lucroTributavel <= IRC_LIMITE) {
    coleta = lucroTributavel * ircPME;
  } else {
    coleta =
      IRC_LIMITE * ircPME +
      (lucroTributavel - IRC_LIMITE) * ircGeral;
  }

  // Benefícios fiscais (cascading coleta caps)
  let rfaiBruto: number;
  if (rfaiRegiao === "interior") {
    const base = Math.min(rfaiInvest, RFAI_LIMITE_INVEST);
    const excedente = Math.max(0, rfaiInvest - RFAI_LIMITE_INVEST);
    rfaiBruto = base * RFAI_TAXA.interior + excedente * RFAI_TAXA_EXCEDENTE;
  } else {
    rfaiBruto = rfaiInvest * RFAI_TAXA.litoral;
  }
  const maxRFAI = coleta * (primeirosAnos ? 1.0 : RFAI_LIMITE_COLETA);
  const rfai = Math.min(rfaiBruto, Math.max(0, maxRFAI));

  const dlrrBase = Math.min(dlrrLucros, DLRR_MAX_LUCROS);
  const dlrrBruto = dlrrBase * DLRR_TAXA;
  const maxDLRR = Math.max(0, coleta - rfai) * DLRR_LIMITE_COLETA;
  const dlrr = Math.min(dlrrBruto, maxDLRR);

  const taxaSifide = SIFIDE_META[tipoSifide].taxa;
  const sifideBruto = sifideDespesas * taxaSifide;
  const maxSifide = Math.max(0, coleta - rfai - dlrr);
  const sifide = Math.min(sifideBruto, maxSifide);

  const benefTotal = rfai + dlrr + sifide;
  const ircAposBase = Math.max(0, coleta - benefTotal);
  const rfaiContratualEfetivo = Math.min(rfaiContratualValor, ircAposBase);
  const ircAposBeneficios = Math.max(0, ircAposBase - rfaiContratualEfetivo);

  const beneficios: ResultadoBeneficios = {
    rfai, rfaiBruto, dlrr, dlrrBruto, sifide, sifideBruto,
    rfaiContratual: rfaiContratualEfetivo,
    total: benefTotal + rfaiContratualEfetivo,
  };

  // TA (Art. 88.º CIRC)
  const agrav = emPrejuizo && !excecaoPrejuizo ? TA_AGRAVAMENTO : 0;
  const taViatura =
    tipoViatura === "eletrica" || tipoViatura === "nenhuma"
      ? 0
      : encargosViatura * (TA_TAXAS_GUIADO[tipoViatura] + agrav);
  const taRepr = despRepresentacao * (TA_TAXA_REPRESENTACAO + agrav);
  const taAjudas = ajudasCusto * (TA_TAXA_AJUDAS_CUSTO + agrav);
  const taNaoDoc = naoDocumentadas * (TA_TAXA_NAO_DOC + agrav);
  const ta: ResultadoTA = {
    viatura: taViatura,
    representacao: taRepr,
    ajudasCusto: taAjudas,
    naoDocumentadas: taNaoDoc,
    total: taViatura + taRepr + taAjudas + taNaoDoc,
  };

  const derrama = lucroTributavel * derramaTaxa;
  const ircTotal = ircAposBeneficios + ta.total + derrama;
  const lucroLiquido = Math.max(0, lucroTributavel - ircTotal);

  // Dividendos
  let dividendos = 0;
  let irsDividendosLiberatoria = 0;
  let irsDividendosEnglobamento = 0;
  let taxaMarginalGerente = 0;

  let irsDividendosIFICI = 0;
  if (distribuirDividendos && lucroLiquido > 0) {
    dividendos = lucroLiquido;
    irsDividendosLiberatoria = dividendos * IRS_DIVIDENDOS;

    const salarioTrib = salGerente * (1 - SS_TRAB_TAXA);
    taxaMarginalGerente = calcularTaxaMarginal(salarioTrib);
    const irsComDiv = calcularIRS(
      salarioTrib + dividendos * DIV_INCLUSAO_ENGLOBAMENTO,
    );
    const irsSoSal = calcularIRS(salarioTrib);
    irsDividendosEnglobamento = Math.max(0, irsComDiv - irsSoSal);

    // IFICI (Art. 58.º-A EBF): dividendos de fonte PT tributados a 20% flat
    if (ifici) {
      irsDividendosIFICI = dividendos * IFICI_TAXA_FLAT;
    }
  }

  const irsDividendos = ifici
    ? irsDividendosIFICI
    : opcaoEnglobamento
      ? irsDividendosEnglobamento
      : irsDividendosLiberatoria;

  const salarioLiq = salGerente * (1 - SS_TRAB_TAXA);
  const liquidoGerente = salarioLiq + (dividendos - irsDividendos);
  const poupancaIFICI = ifici
    ? irsDividendosLiberatoria - irsDividendosIFICI
    : 0;

  // Municipal (IMI/IMT)
  const imiAnual = temImovel ? vptImovel * taxaIMI : 0;
  const poupancaIMI = temImovel && isencaoIMI ? imiAnual : 0;
  const imtOneTime = temImovel ? valorAquisicao * (IMT_TAXA_COMERCIAL + IS_TAXA_AQUISICAO) : 0;
  const poupancaIMT = temImovel && isencaoIMT ? imtOneTime : 0;
  const custoMunicipalAnual = temImovel
    ? (imiAnual - poupancaIMI) + ((imtOneTime - poupancaIMT) / anosAmortIMT)
    : 0;

  return {
    faturacao,
    despesasOper,
    custosEstrutura,
    salGerente,
    ssSalGerente,
    custoConstituicao,
    totalCustos,
    lucroTributavel,
    coleta,
    ta,
    beneficios,
    ircAposBeneficios,
    derrama,
    ircTotal,
    lucroLiquido,
    dividendos,
    irsDividendosLiberatoria,
    irsDividendosEnglobamento,
    irsDividendos,
    taxaMarginalGerente,
    liquidoGerente,
    taxaEfetiva: faturacao > 0 ? 1 - liquidoGerente / faturacao : 0,
    imiAnual,
    poupancaIMI,
    imtOneTime,
    poupancaIMT,
    custoMunicipalAnual,
    custoRepresentanteFiscal: custoRepresentante,
    custoSedeVirtual: custoSedeVirtualAnual,
    irsDividendosIFICI,
    poupancaIFICI,
  };
}

// ─── Tipos de sociedade ──────────────────────────────────────────────────────

const TIPOS_SOCIEDADE: {
  id: TipoSociedade;
  titulo: string;
  sub: string;
  detalhe: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    id: "unipessoal",
    titulo: "Sociedade Unipessoal por Quotas",
    sub: "1 sócio-gerente · responsabilidade limitada",
    detalhe:
      "A forma mais comum para quem trabalha sozinho. Capital social mínimo de 1€, responsabilidade limitada ao capital investido. Ideal para freelancers que querem separar património pessoal do empresarial.",
    Icon: Briefcase,
  },
  {
    id: "quotas",
    titulo: "Sociedade por Quotas (Lda)",
    sub: "2+ sócios · responsabilidade limitada",
    detalhe:
      "Exige pelo menos dois sócios com quotas definidas. Capital social mínimo de 2€ (1€ por sócio). Mais adequada para projetos partilhados ou quando se pretende captar sócios investidores.",
    Icon: Building,
  },
];

// ─── Componente auxiliar: NumericSlider (inputs ricos) ───────────────────────

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
}: NumericSliderProps) {
  const [inputStr, setInputStr] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused) setInputStr(String(value));
  }, [value, focused]);

  const clamp = useCallback(
    (v: number) => Math.round(Math.min(max, Math.max(min, v)) / step) * step,
    [min, max, step],
  );

  const clampFree = useCallback((v: number) => Math.max(min, v), [min]);

  const pctVal = Math.min(
    100,
    Math.max(0, ((value - min) / (max - min)) * 100),
  );

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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,\.]/g, "");
    setInputStr(raw);
    const n = parseFloat(raw.replace(",", "."));
    if (!isNaN(n)) onChange(clampFree(n));
  };

  const handleInputBlur = () => {
    setFocused(false);
    const n = parseFloat(inputStr.replace(",", "."));
    const v = isNaN(n) ? value : clampFree(n);
    onChange(v);
    setInputStr(String(v));
  };

  return (
    <div className="space-y-2.5">
      {/* Linha: label + steppers + input */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {label}
          </span>
          {tooltip && <InfoTip>{tooltip}</InfoTip>}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onChange(clamp(value - step));
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition-all hover:border-brand hover:bg-brand-light hover:text-brand-dark active:scale-95 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            aria-label={`Diminuir ${label}`}
          >
            <span className="text-base font-semibold leading-none select-none">
              −
            </span>
          </button>

          <div className="relative">
            {unit === "€" && (
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">
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
              className={`h-9 rounded-xl border bg-white text-right text-sm font-semibold text-stone-800 tabular-nums outline-none transition-all dark:bg-stone-900 dark:text-stone-200 ${
                unit === "€" ? "w-24 pl-5 pr-2" : "w-16 px-2"
              } ${
                focused
                  ? "border-brand ring-2 ring-brand/20"
                  : "border-stone-200 hover:border-stone-300 dark:border-stone-700"
              }`}
              aria-label={label}
            />
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onChange(clamp(value + step));
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition-all hover:border-brand hover:bg-brand-light hover:text-brand-dark active:scale-95 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            aria-label={`Aumentar ${label}`}
          >
            <span className="text-base font-semibold leading-none select-none">
              +
            </span>
          </button>
        </div>
      </div>

      {/* Balão flutuante */}
      <div className="pointer-events-none relative h-5">
        <div
          className="absolute bottom-0 -translate-x-1/2"
          style={{ left: `${Math.min(96, Math.max(4, pctVal))}%` }}
        >
          <span
            className={`inline-block rounded-lg px-1.5 py-0.5 text-[10px] font-semibold text-white transition-colors ${
              dragging ? "bg-brand-dark" : "bg-brand"
            }`}
          >
            {value.toLocaleString("pt-PT")} {unit}
          </span>
        </div>
      </div>

      {/* Slider track (hit area) */}
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
        className={`relative h-8 touch-none select-none focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className="h-full rounded-full bg-brand transition-none"
            style={{ width: `${pctVal}%` }}
          />
        </div>
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

      {/* Min / Max labels */}
      <div className="relative h-3.5 text-[10px] text-stone-400 dark:text-stone-600">
        <span className="absolute left-0">
          {min.toLocaleString("pt-PT")} {unit}
        </span>
        <span className="absolute right-0">
          {max.toLocaleString("pt-PT")} {unit}+
        </span>
      </div>

      {/* Presets */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all min-h-[36px] ${
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

// ─── Secção colapsável ───────────────────────────────────────────────────────

function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors"
      >
        {title}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
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
            <div className="px-4 pb-4 space-y-4">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

interface ModoGuiadoEmpresaProps {
  onIrParaSimuladorCompleto?: () => void;
}

export default function ModoGuiadoEmpresa({
  onIrParaSimuladorCompleto,
}: ModoGuiadoEmpresaProps) {
  const [passo, setPasso] = useState<Passo>(0);

  // Passo 0: situação
  const [jaTemEmpresa, setJaTemEmpresa] = useState<null | "sim" | "nao">(null);

  // Passo 1: tipo de empresa + perfil do fundador
  const [tipoSociedade, setTipoSociedade] =
    useState<TipoSociedade>("unipessoal");
  const [tipoSelecionado, setTipoSelecionado] = useState(false);
  const [perfilFundador, setPerfilFundador] = useState<PerfilFundador>("residente");
  const [aplicarIFICI, setAplicarIFICI] = useState(false);

  // Passo "local": localização e tipo de sede
  const [tipoSede, setTipoSede] = useState<TipoSede>("fisica");
  const [custoSedeVirtual, setCustoSedeVirtual] = useState(CUSTO_SEDE_VIRTUAL_DEFAULT);
  const [localizacao, setLocalizacao] = useState<ParametrosFiscaisRegiao | null>(null);
  const [localNome, setLocalNome] = useState("");

  // Pesquisa de localização (Nominatim)
  const [queryLocal, setQueryLocal] = useState("");
  const [resultadosGeo, setResultadosGeo] = useState<Array<{ lat: number; lng: number; nome: string; detalhe: string }>>([]);
  const [aPesquisarGeo, setAPesquisarGeo] = useState(false);
  const [erroGeo, setErroGeo] = useState<string | null>(null);
  const [dropdownGeoAberto, setDropdownGeoAberto] = useState(false);
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoWrapperRef = useRef<HTMLDivElement>(null);

  const geocodificarLocal = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResultadosGeo([]);
      setDropdownGeoAberto(false);
      return;
    }
    setAPesquisarGeo(true);
    setErroGeo(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=pt-PT&countrycodes=pt`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("geo");
      const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json();
      const mapped = data.map((d) => {
        const partes = d.display_name.split(",").map((s) => s.trim());
        return {
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          nome: partes[0],
          detalhe: partes.slice(1, 3).join(", "),
        };
      });
      setResultadosGeo(mapped);
      setDropdownGeoAberto(true);
      if (mapped.length === 0) setErroGeo(`Sem resultados para «${q}».`);
    } catch {
      setResultadosGeo([]);
      setErroGeo("Não foi possível pesquisar agora. Tenta de novo.");
      setDropdownGeoAberto(true);
    } finally {
      setAPesquisarGeo(false);
    }
  }, []);

  const onQueryLocalChange = (v: string) => {
    setQueryLocal(v);
    if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
    geoDebounceRef.current = setTimeout(() => geocodificarLocal(v), 450);
  };

  const escolherResultadoGeo = (r: { lat: number; lng: number; nome: string; detalhe: string }) => {
    const params = parametrosPorCoords(r.lat, r.lng);
    setLocalizacao(params);
    setLocalNome(`${r.nome}, ${r.detalhe}`);
    setRfaiRegiao(params.rfaiTipo);
    setQueryLocal("");
    setResultadosGeo([]);
    setDropdownGeoAberto(false);
  };

  const usarGPS = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setAPesquisarGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = parametrosPorCoords(pos.coords.latitude, pos.coords.longitude);
        setLocalizacao(params);
        setLocalNome("Localização GPS");
        setRfaiRegiao(params.rfaiTipo);
        setAPesquisarGeo(false);
      },
      () => {
        setErroGeo("Não foi possível obter a localização GPS.");
        setAPesquisarGeo(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (geoWrapperRef.current && !geoWrapperRef.current.contains(e.target as Node)) {
        setDropdownGeoAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Passo 2: faturação e custos
  const [faturacaoAnual, setFaturacaoAnual] = useState(60_000);
  const [faturacaoComIva, setFaturacaoComIva] = useState(false);
  const [despesasOper, setDespesasOper] = useState(2_000);
  const [salGerenteMensal, setSalGerenteMensal] = useState(SMN_2026);
  const [incluirConstituicao, setIncluirConstituicao] = useState(true);
  const [custoConstituicao, setCustoConstituicao] = useState(CUSTO_CONSTITUICAO_DEFAULT);
  const [anosAmortizacao, setAnosAmortizacao] = useState(3);
  const [custosEstrutura, setCustosEstrutura] = useState(CUSTO_CONTABILIDADE_DEFAULT + CUSTO_SOFTWARE_DEFAULT);

  // Passo 3: dividendos e otimização
  const [distribuirDividendos, setDistribuirDividendos] = useState(true);
  const [opcaoEnglobamento, setOpcaoEnglobamento] = useState(false);

  // Passo 4: otimização fiscal
  // TA
  const [tipoViatura, setTipoViatura] = useState<TipoViaturaGuiado>("nenhuma");
  const [encargosViatura, setEncargosViatura] = useState(0);
  const [despRepresentacao, setDespRepresentacao] = useState(0);
  const [ajudasCusto, setAjudasCusto] = useState(0);
  const [naoDocumentadas, setNaoDocumentadas] = useState(0);
  const [emPrejuizo, setEmPrejuizo] = useState(false);
  const [excecaoPrejuizo, setExcecaoPrejuizo] = useState(true);
  // Benefícios
  const [rfaiRegiao, setRfaiRegiao] = useState<RegiaoRFAIGuiado>("interior");
  const [rfaiInvest, setRfaiInvest] = useState(0);
  const [primeirosAnos, setPrimeirosAnos] = useState(false);
  const [dlrrLucros, setDlrrLucros] = useState(0);
  const [sifideDespesas, setSifideDespesas] = useState(0);
  const [tipoSifide, setTipoSifide] = useState<TipoEmpresaSifide>("pme_normal");
  const [rfaiContratualValor, setRfaiContratualValor] = useState(0);
  // Municipal
  const [temImovelEmpresa, setTemImovelEmpresa] = useState(false);
  const [vptImovel, setVptImovel] = useState(0);
  const [taxaIMI, setTaxaIMI] = useState(IMI_TAXA_PADRAO);
  const [isencaoIMI_RFAI, setIsencaoIMI_RFAI] = useState(false);
  const [valorAquisicaoImovel, setValorAquisicaoImovel] = useState(0);
  const [isencaoIMT_RFAI, setIsencaoIMT_RFAI] = useState(false);
  const [anosAmortizacaoIMT, setAnosAmortizacaoIMT] = useState(10);

  // RFAI auto-set pela localização
  const rfaiRegiaoEfetiva = localizacao
    ? localizacao.rfaiTipo
    : rfaiRegiao;

  const sedeVirtualEfetivo = tipoSede === "virtual" ? custoSedeVirtual : tipoSede === "coworking" ? custoSedeVirtual : 0;
  const isEstrangeiro = perfilFundador !== "residente";
  const custoRepFiscalEfetivo = isEstrangeiro ? CUSTO_REPRESENTANTE_FISCAL_DEFAULT : 0;

  // IVA: taxa normal da região derivada da localização
  const regiaoIva = localizacao?.regiaoId === "acores" ? "acores" as const
    : localizacao?.regiaoId === "madeira" ? "madeira" as const
    : "continente" as const;
  const taxaIvaEmpresa = IVA_TAXAS[regiaoIva].value.normal;
  const faturacaoBase = faturacaoComIva
    ? Math.round(faturacaoAnual / (1 + taxaIvaEmpresa))
    : faturacaoAnual;

  // Args comuns para simulação
  const simArgs = [
    faturacaoBase, despesasOper, custosEstrutura, salGerenteMensal,
    distribuirDividendos, opcaoEnglobamento, incluirConstituicao,
    custoConstituicao, anosAmortizacao,
    tipoViatura, encargosViatura, despRepresentacao, ajudasCusto,
    naoDocumentadas, emPrejuizo, excecaoPrejuizo,
    rfaiRegiaoEfetiva, rfaiInvest, primeirosAnos,
    dlrrLucros, sifideDespesas, tipoSifide, rfaiContratualValor,
    temImovelEmpresa, vptImovel, taxaIMI, isencaoIMI_RFAI,
    valorAquisicaoImovel, isencaoIMT_RFAI, anosAmortizacaoIMT,
    localizacao,
    sedeVirtualEfetivo, isEstrangeiro, custoRepFiscalEfetivo, aplicarIFICI,
  ] as const;

  // Simulação principal (location-aware)
  const resultado = useMemo(
    () =>
      simularEmpresaGuiado(
        faturacaoBase, despesasOper, custosEstrutura, salGerenteMensal,
        distribuirDividendos, opcaoEnglobamento, incluirConstituicao,
        custoConstituicao, anosAmortizacao,
        tipoViatura, encargosViatura, despRepresentacao, ajudasCusto,
        naoDocumentadas, emPrejuizo, excecaoPrejuizo,
        rfaiRegiaoEfetiva, rfaiInvest, primeirosAnos,
        dlrrLucros, sifideDespesas, tipoSifide, rfaiContratualValor,
        temImovelEmpresa, vptImovel, taxaIMI, isencaoIMI_RFAI,
        valorAquisicaoImovel, isencaoIMT_RFAI, anosAmortizacaoIMT,
        localizacao ?? undefined,
        sedeVirtualEfetivo || undefined, isEstrangeiro || undefined,
        custoRepFiscalEfetivo || undefined, aplicarIFICI || undefined,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    simArgs,
  );

  // Englobamento mais favorável?
  const resultLib = useMemo(
    () =>
      simularEmpresaGuiado(
        faturacaoBase, despesasOper, custosEstrutura, salGerenteMensal,
        true, false, incluirConstituicao,
        custoConstituicao, anosAmortizacao,
        tipoViatura, encargosViatura, despRepresentacao, ajudasCusto,
        naoDocumentadas, emPrejuizo, excecaoPrejuizo,
        rfaiRegiaoEfetiva, rfaiInvest, primeirosAnos,
        dlrrLucros, sifideDespesas, tipoSifide, rfaiContratualValor,
        temImovelEmpresa, vptImovel, taxaIMI, isencaoIMI_RFAI,
        valorAquisicaoImovel, isencaoIMT_RFAI, anosAmortizacaoIMT,
        localizacao ?? undefined,
        sedeVirtualEfetivo || undefined, isEstrangeiro || undefined,
        custoRepFiscalEfetivo || undefined, aplicarIFICI || undefined,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    simArgs,
  );
  const resultEng = useMemo(
    () =>
      simularEmpresaGuiado(
        faturacaoBase, despesasOper, custosEstrutura, salGerenteMensal,
        true, true, incluirConstituicao,
        custoConstituicao, anosAmortizacao,
        tipoViatura, encargosViatura, despRepresentacao, ajudasCusto,
        naoDocumentadas, emPrejuizo, excecaoPrejuizo,
        rfaiRegiaoEfetiva, rfaiInvest, primeirosAnos,
        dlrrLucros, sifideDespesas, tipoSifide, rfaiContratualValor,
        temImovelEmpresa, vptImovel, taxaIMI, isencaoIMI_RFAI,
        valorAquisicaoImovel, isencaoIMT_RFAI, anosAmortizacaoIMT,
        localizacao ?? undefined,
        sedeVirtualEfetivo || undefined, isEstrangeiro || undefined,
        custoRepFiscalEfetivo || undefined, aplicarIFICI || undefined,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    simArgs,
  );
  const englobamentoMelhor =
    resultEng.liquidoGerente > resultLib.liquidoGerente;
  const poupancaEnglobamento = Math.abs(
    resultEng.liquidoGerente - resultLib.liquidoGerente,
  );

  function avancar() {
    if (passo === 1) setPasso("local");
    else if (passo === "local") setPasso(2);
    else if (passo === 2) setPasso(3);
    else if (passo === 3) setPasso(4);
    else if (passo === 4) setPasso("resultado");
    else if (passo === "resultado") setPasso("aseguir");
  }

  function recuar() {
    if (passo === 1) setPasso(0);
    else if (passo === "local") setPasso(1);
    else if (passo === 2) setPasso("local");
    else if (passo === 3) setPasso(2);
    else if (passo === 4) setPasso(3);
    else if (passo === "resultado") setPasso(4);
    else if (passo === "aseguir") setPasso("resultado");
  }

  const progressLabels = ["Empresa", "Localização", "Receita", "Dividendos", "Otimização", "Resultado", "A seguir"];
  const passoNum = passo === "local" ? 2 : passo === 2 ? 3 : passo === 3 ? 4 : passo === 4 ? 5 : passo === "resultado" ? 6 : passo === "aseguir" ? 7 : (passo as number);

  // ─── Passo 0: pergunta inicial ─────────────────────────────────────────────

  if (passo === 0) {
    return (
      <div className="min-h-0 bg-white dark:bg-stone-950">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-light/60 px-3 py-1 text-xs font-semibold text-brand-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Simulador empresa guiado
            </span>

            {jaTemEmpresa === null && (
              <>
                <h2 className="font-display mb-2 text-3xl font-semibold text-stone-800 sm:text-4xl dark:text-stone-100">
                  Já tens empresa ou estás a avaliar?
                </h2>
                <p className="mb-8 text-sm text-stone-500 dark:text-stone-400">
                  Simula o resultado líquido de uma sociedade (Lda) — IRC,
                  dividendos e custos reais de operação.
                </p>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setJaTemEmpresa("sim");
                      setIncluirConstituicao(false);
                      setPasso(1);
                    }}
                    className="group flex w-full items-center gap-3 rounded-3xl border-2 border-stone-100 bg-white p-4 text-left shadow-card transition-all hover:border-brand hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-800 dark:bg-stone-900"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                      <Building size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
                        Já tenho empresa constituída
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                        Quero simular os resultados deste ano
                      </span>
                    </span>
                    <ArrowRight
                      size={16}
                      className="flex-shrink-0 text-stone-300 transition-colors group-hover:text-brand"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setJaTemEmpresa("nao");
                      setIncluirConstituicao(true);
                    }}
                    className="group flex w-full items-center gap-3 rounded-3xl border-2 border-stone-100 bg-white p-4 text-left shadow-card transition-all hover:border-brand hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-800 dark:bg-stone-900"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand group-hover:text-white dark:bg-stone-800">
                      <Sparkle size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
                        Estou a avaliar abrir empresa
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                        Quero perceber custos e impostos antes de decidir
                      </span>
                    </span>
                    <ArrowRight
                      size={16}
                      className="flex-shrink-0 text-stone-300 transition-colors group-hover:text-brand"
                    />
                  </button>
                </div>
              </>
            )}

            {jaTemEmpresa === "nao" && (
              <>
                <h2 className="font-display mb-3 text-2xl font-semibold text-stone-800 dark:text-stone-100">
                  O que precisas de saber
                </h2>
                <div className="mb-6 space-y-3">
                  {[
                    {
                      titulo: "Empresa na Hora",
                      desc: "Constituis uma sociedade Lda num balcão do IRN em menos de 1 hora — ou online no Portal da Empresa. Custo: ~360–400€.",
                      base: { artigo: "Portal da Empresa", url: LEI.empresaOnline },
                    },
                    {
                      titulo: "Capital social mínimo: 1€",
                      desc: "Desde 2011 não é necessário um capital elevado. 1€ para Unipessoal, 2€ para Sociedade por Quotas (1€/sócio).",
                      base: { artigo: "Art. 270.º-A ss. CSC", url: LEI.csc },
                    },
                    {
                      titulo: "Contabilidade obrigatória",
                      desc: "Toda a sociedade tem de ter contabilidade organizada com Contabilista Certificado (CC) inscrito na OCC. Custo médio: ~200€/mês.",
                      base: { artigo: "Art. 123.º CIRC", url: LEI.art87circ },
                    },
                    {
                      titulo: "Responsabilidade limitada",
                      desc: "O teu património pessoal fica separado do empresarial. Dívidas da empresa não recaem sobre bens pessoais (salvo fraude).",
                      base: { artigo: "Art. 197.º CSC", url: LEI.csc },
                    },
                  ].map((item) => (
                    <div
                      key={item.titulo}
                      className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
                    >
                      <Check
                        size={14}
                        className="mt-0.5 flex-shrink-0 text-brand"
                      />
                      <div>
                        <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                          {item.titulo}
                        </div>
                        <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                          {item.desc}
                          {item.base && <span className="ml-1"><LeiRef artigo={item.base.artigo} url={item.base.url} /></span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPasso(1)}
                  className="w-full rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Simular a minha empresa
                </button>
                <button
                  type="button"
                  onClick={() => setJaTemEmpresa(null)}
                  className="mt-2 w-full py-2 text-xs font-semibold text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Voltar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Layout dos passos 1–resultado ─────────────────────────────────────────

  return (
    <div className="min-h-0 bg-white dark:bg-stone-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Barra de progresso */}
        <div className="mb-8">
          <div className="flex items-center gap-1 mb-2">
            {progressLabels.map((l, i) => (
              <div key={l} className="flex-1 flex flex-col items-center">
                <div
                  className={`h-1 w-full rounded-full transition-all duration-300 ${
                    i < passoNum
                      ? "bg-brand"
                      : i === passoNum
                        ? "bg-brand/40"
                        : "bg-stone-200 dark:bg-stone-800"
                  }`}
                />
                <span
                  className={`mt-1 text-[9px] font-semibold uppercase tracking-wider ${
                    i <= passoNum
                      ? "text-brand"
                      : "text-stone-300 dark:text-stone-600"
                  }`}
                >
                  {l}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Coluna de inputs */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {/* ── Passo 1: Tipo de empresa ─────────────────────────────────── */}
              {passo === 1 && (
                <m.div
                  key="passo1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="font-display mb-2 text-2xl font-semibold text-stone-800 dark:text-stone-100">
                    Que tipo de empresa?
                  </h2>
                  <p className="mb-6 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    Ambos os tipos têm responsabilidade limitada e IRC idêntico.
                    A diferença principal é o número de sócios.
                  </p>

                  <div className="space-y-3">
                    {TIPOS_SOCIEDADE.map((tipo) => (
                      <button
                        key={tipo.id}
                        type="button"
                        aria-pressed={tipoSociedade === tipo.id && tipoSelecionado}
                        onClick={() => {
                          setTipoSociedade(tipo.id);
                          setTipoSelecionado(true);
                        }}
                        className={`group w-full rounded-3xl border-2 p-5 text-left transition-all ${
                          tipoSociedade === tipo.id && tipoSelecionado
                            ? "border-brand bg-brand-light/30 shadow-card dark:bg-brand/5"
                            : "border-stone-100 bg-white hover:border-brand/30 hover:shadow-card dark:border-stone-800 dark:bg-stone-900"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <span
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl transition-colors ${
                              tipoSociedade === tipo.id && tipoSelecionado
                                ? "bg-brand text-white"
                                : "bg-stone-100 text-stone-500 group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800"
                            }`}
                          >
                            <tipo.Icon size={18} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-stone-800 dark:text-stone-100">
                              {tipo.titulo}
                            </div>
                            <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                              {tipo.sub}
                            </div>
                            {tipoSociedade === tipo.id && tipoSelecionado && (
                              <m.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-2 text-xs text-stone-600 dark:text-stone-300 leading-relaxed"
                              >
                                {tipo.detalhe}
                              </m.p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* ── Perfil do fundador ──────────────────────── */}
                  <div className="mt-8">
                    <h3 className="mb-1 text-lg font-semibold text-stone-800 dark:text-stone-100">
                      Perfil do fundador
                    </h3>
                    <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
                      A tua residência fiscal influencia obrigações e benefícios disponíveis.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {([
                        { id: "residente" as PerfilFundador, label: "Residente em Portugal", sub: "Regime fiscal geral", icon: Building },
                        { id: "estrangeiro_ue" as PerfilFundador, label: "Cidadão UE / EEE", sub: "Sem representante fiscal", icon: Globe },
                        { id: "estrangeiro_extra_ue" as PerfilFundador, label: "Fora da UE", sub: "Precisa de representante fiscal", icon: Plane },
                      ]).map((p) => {
                        const ativo = perfilFundador === p.id;
                        const Icon = p.icon;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={ativo}
                            onClick={() => {
                              setPerfilFundador(p.id);
                              if (p.id === "residente") setAplicarIFICI(false);
                            }}
                            className={`group rounded-2xl border-2 p-3.5 text-left transition-all ${
                              ativo
                                ? "border-brand bg-brand-light/30 shadow-card dark:bg-brand/5"
                                : "border-stone-100 bg-white hover:border-brand/30 hover:shadow-card dark:border-stone-800 dark:bg-stone-900"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${ativo ? "bg-brand text-white" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`}>
                                <Icon size={14} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className={`text-xs font-bold ${ativo ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"}`}>
                                  {p.label}
                                </div>
                                <div className="text-[10px] text-stone-400">{p.sub}</div>
                              </div>
                              {ativo && <Check size={12} className="text-brand" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Representante fiscal — obrigatório extra-UE */}
                    {perfilFundador === "estrangeiro_extra_ue" && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800/30 dark:bg-amber-900/10">
                        <div className="flex items-start gap-2">
                          <Warning size={13} className="mt-0.5 flex-shrink-0 text-amber-500" />
                          <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                            <span className="font-semibold">Representante fiscal obrigatório.</span>{" "}
                            Não residentes de fora da UE/EEE devem nomear um representante fiscal em Portugal para efeitos de cumprimento das obrigações tributárias.
                            Custo estimado: {CUSTO_REPRESENTANTE_FISCAL_MIN}–{CUSTO_REPRESENTANTE_FISCAL_MAX}€/ano.
                            <span className="ml-1"><LeiRef artigo="Art. 130.º CIRS / Art. 19.º LGT" url={LEI.representanteFiscal} /></span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nota UE — sem representante */}
                    {perfilFundador === "estrangeiro_ue" && (
                      <div className="mt-3 rounded-xl border border-brand/20 bg-brand-light/10 p-3 dark:bg-brand/5">
                        <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                          Cidadãos da UE/EEE e da Suíça não precisam de representante fiscal desde 2022, mas devem obter NIF português (presencialmente num serviço de Finanças ou via e-balcão).
                        </div>
                      </div>
                    )}

                    {/* IFICI toggle — estrangeiros elegíveis */}
                    {perfilFundador !== "residente" && (
                      <div className="mt-4 rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={aplicarIFICI}
                            onChange={(e) => setAplicarIFICI(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand"
                          />
                          <div>
                            <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                              Regime IFICI (ex-NHR 2.0) — IRS {pct(IFICI_TAXA_FLAT)} flat
                            </div>
                            <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                              Taxa de {pct(IFICI_TAXA_FLAT)} sobre rendimentos elegíveis (vs até 48% nos escalões progressivos), válido por {IFICI_PRAZO_ANOS.value} anos.
                              Aplicável a investigadores, I&D, startups tecnológicas e atividades de elevado valor acrescentado aprovadas pela AT.
                              No simulador, aplica-se aos dividendos ({pct(IFICI_TAXA_FLAT)} em vez de {pct(0.28)} de taxa liberatória).
                              <span className="ml-1"><LeiRef artigo="Art. 58.º-A EBF" url={LEI.art58aEBF} /></span>
                            </div>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={recuar}
                      className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-400"
                    >
                      <ArrowLeft size={14} /> Voltar
                    </button>
                    <button
                      type="button"
                      onClick={avancar}
                      disabled={!tipoSelecionado}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Seguinte <ArrowRight size={14} />
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── Passo Localização: onde fica a empresa ─────────────────── */}
              {passo === "local" && (
                <m.div
                  key="passoLocal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="font-display mb-2 text-2xl font-semibold text-stone-800 dark:text-stone-100">
                    Onde {jaTemEmpresa === "sim" ? "está" : "pretendes instalar"} a empresa?
                  </h2>
                  <p className="mb-5 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    A localização influencia o IRC (<LeiRef artigo="Art. 41.º-B EBF" url={LEI.art41bEBF} /> 12,5% no interior vs 15% no litoral),
                    a derrama municipal, o RFAI (<LeiRef artigo="Art. 22.º–26.º CFI" url={LEI.cfi} />) e o custo de contabilista.
                  </p>

                  {/* Tipo de sede */}
                  <div className="mb-5">
                    <div className="mb-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
                      Tipo de sede
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: "fisica" as TipoSede, label: "Física", sub: "Escritório ou loja própria", icon: Building },
                        { id: "virtual" as TipoSede, label: "Sede virtual", sub: "Morada fiscal sem espaço", icon: Laptop },
                        { id: "coworking" as TipoSede, label: "Coworking", sub: "Espaço partilhado", icon: Globe },
                      ]).map((s) => {
                        const ativo = tipoSede === s.id;
                        const Icon = s.icon;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={ativo}
                            onClick={() => setTipoSede(s.id)}
                            className={`rounded-2xl border-2 p-3 text-left transition-all ${
                              ativo
                                ? "border-brand bg-brand-light/30 dark:bg-brand/5"
                                : "border-stone-100 bg-white hover:border-stone-200 dark:border-stone-800 dark:bg-stone-900"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon size={14} className={ativo ? "text-brand" : "text-stone-400"} />
                              <div>
                                <div className={`text-[11px] font-bold ${ativo ? "text-brand-dark dark:text-brand" : "text-stone-600 dark:text-stone-300"}`}>{s.label}</div>
                                <div className={`text-[9px] ${ativo ? "text-brand/70" : "text-stone-400"}`}>{s.sub}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {tipoSede !== "fisica" && (
                      <div className="mt-3 space-y-3">
                        <div className="rounded-xl border border-brand/20 bg-brand-light/10 p-3 dark:bg-brand/5">
                          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                            Toda a sociedade necessita de uma morada fiscal (sede)
                            registada na Conservatória do Registo Comercial (<LeiRef artigo="Art. 12.º CSC" url={LEI.csc} />),
                            mesmo que a atividade seja 100% digital.
                            {tipoSede === "virtual"
                              ? " A sede virtual fornece apenas uma morada fiscal — sem espaço físico. Aceite pela AT para empresas digitais."
                              : " O coworking funciona como espaço de trabalho e morada fiscal."}
                          </p>
                        </div>
                        <NumericSlider
                          label={tipoSede === "virtual" ? "Custo sede virtual (€/mês)" : "Custo coworking (€/mês)"}
                          value={custoSedeVirtual}
                          min={CUSTO_SEDE_VIRTUAL_MIN}
                          max={tipoSede === "coworking" ? 300 : CUSTO_SEDE_VIRTUAL_MAX}
                          step={10}
                          onChange={setCustoSedeVirtual}
                          presets={tipoSede === "virtual" ? [50, 80, 100, 150] : [100, 150, 200, 300]}
                          tooltip={
                            tipoSede === "virtual"
                              ? <>Custo mensal da morada fiscal virtual. Inclui receção de correspondência e uso da morada nos documentos legais.</>
                              : <>Custo mensal do espaço de coworking, que serve simultaneamente como morada fiscal e local de trabalho.</>
                          }
                        />
                        <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400">
                          <span>Custo anual</span>
                          <span className="font-semibold tabular-nums">{fmt(custoSedeVirtual * 12)}/ano</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="mb-3 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                    {tipoSede === "fisica"
                      ? "Pesquisa a tua cidade ou concelho para resultados fiscais precisos."
                      : "Mesmo com sede virtual, a morada determina a jurisdição fiscal — pesquisa o concelho."}
                  </p>

                  {/* Pesquisa por cidade/concelho */}
                  <div ref={geoWrapperRef} className="relative mb-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={queryLocal}
                          onChange={(e) => onQueryLocalChange(e.target.value)}
                          onFocus={() => { if (resultadosGeo.length > 0) setDropdownGeoAberto(true); }}
                          placeholder="Pesquisar cidade, concelho ou morada…"
                          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
                          aria-label="Pesquisar localização"
                          autoComplete="off"
                        />
                        {aPesquisarGeo && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-brand" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={usarGPS}
                        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
                        aria-label="Usar a minha localização GPS"
                        title="Usar GPS"
                      >
                        <Crosshair size={16} />
                      </button>
                    </div>

                    {/* Dropdown de resultados */}
                    {dropdownGeoAberto && (resultadosGeo.length > 0 || erroGeo) && (
                      <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
                        {erroGeo ? (
                          <div className="flex items-center gap-2 px-4 py-3 text-xs text-stone-500">
                            <Warning size={13} className="text-amber-500" />
                            {erroGeo}
                          </div>
                        ) : (
                          <ul role="listbox" aria-label="Resultados de pesquisa">
                            {resultadosGeo.map((r, i) => (
                              <li key={i}>
                                <button
                                  type="button"
                                  onClick={() => escolherResultadoGeo(r)}
                                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-light/30 dark:hover:bg-brand/10"
                                  role="option"
                                  aria-selected={false}
                                >
                                  <MapPin size={14} className="flex-shrink-0 text-brand" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{r.nome}</div>
                                    <div className="text-[11px] text-stone-400 truncate">{r.detalhe}</div>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Localização selecionada via pesquisa */}
                  {localizacao && localNome && (
                    <div className="mb-4 rounded-2xl border-2 border-brand bg-brand-light/20 p-4 dark:bg-brand/5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
                            <MapPin size={15} />
                          </span>
                          <div>
                            <div className="text-sm font-bold text-brand-dark dark:text-brand">{localNome}</div>
                            <div className="text-[11px] text-stone-500 dark:text-stone-400">
                              Região fiscal: {localizacao.nome}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setLocalizacao(null); setLocalNome(""); }}
                          className="rounded-lg px-2 py-1 text-[10px] font-semibold text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                        >
                          Alterar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "IRC PME", value: pct(localizacao.ircPME), nota: localizacao.interior ? "até 50.000€ (interior)" : `até ${fmt(IRC_LIMITE)}` },
                          { label: "IRC geral", value: pct(localizacao.ircGeral), nota: localizacao.interior ? "Art. 41.º-B EBF" : "acima do limite PME" },
                          { label: "Derrama estimada", value: `~${pct(localizacao.derramaEstimada)}`, nota: "varia por município" },
                          { label: "RFAI", value: pct(localizacao.rfaiTaxa), nota: localizacao.rfaiTipo === "interior" ? "Art. 23.º CFI (interior)" : "Art. 23.º CFI (litoral)" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl bg-white/80 p-2.5 dark:bg-stone-900/50">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{item.label}</div>
                            <div className="text-sm font-bold text-stone-800 dark:text-stone-100">{item.value}</div>
                            <div className="text-[10px] text-stone-400">{item.nota}</div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-stone-400 leading-relaxed">
                        {localizacao.interior
                          ? <>Concelho do interior (<LeiRef artigo="Portaria 208/2017" url={LEI.portaria208} />) — IRC PME 12,5% (<LeiRef artigo="Art. 41.º-B EBF" url={LEI.art41bEBF} />). A derrama municipal varia — confirma a taxa do teu concelho.</>
                          : <>A derrama municipal varia por município (0%–1,5%) — confirma a taxa do teu concelho. <LeiRef artigo="Art. 87.º CIRC" url={LEI.art87circ} /></>}
                      </p>
                    </div>
                  )}

                  {/* Separador "ou escolhe uma região" */}
                  {!localizacao && (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">ou escolhe a região</span>
                        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                      </div>

                      {/* Grid de regiões */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {TODAS_LOCALIZACOES.map((loc) => {
                          const ativa = localizacao !== null && (localizacao as ParametrosFiscaisRegiao).nome === loc.nome && !localNome;
                          return (
                            <button
                              key={loc.nome}
                              type="button"
                              aria-pressed={ativa}
                              onClick={() => {
                                setLocalizacao(loc);
                                setLocalNome("");
                                setRfaiRegiao(loc.rfaiTipo);
                              }}
                              className={`group rounded-2xl border-2 p-3.5 text-left transition-all ${
                                ativa
                                  ? "border-brand bg-brand-light/30 shadow-card dark:bg-brand/5"
                                  : "border-stone-100 bg-white hover:border-brand/30 hover:shadow-card dark:border-stone-800 dark:bg-stone-900"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                                    ativa
                                      ? "bg-brand text-white"
                                      : "bg-stone-100 text-stone-500 group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800"
                                  }`}
                                >
                                  <MapPin size={14} />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-bold ${ativa ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"}`}>
                                      {loc.nome}
                                    </span>
                                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold leading-none ${
                                      loc.interior
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                                    }`}>
                                      {loc.selo}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-stone-400">
                                    <span>IRC {pct(loc.ircPME)}</span>
                                    <span>RFAI {pct(loc.rfaiTaxa)}</span>
                                  </div>
                                </div>
                                {ativa && <Check size={14} className="flex-shrink-0 text-brand" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Detalhes da localização selecionada (via grid) */}
                  {localizacao && !localNome && (
                    <div className="mt-4 rounded-2xl border border-brand/20 bg-brand-light/20 p-4 dark:bg-brand/5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-brand" />
                          <span className="text-xs font-bold text-brand-dark dark:text-brand">{localizacao.nome}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLocalizacao(null)}
                          className="rounded-lg px-2 py-1 text-[10px] font-semibold text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                        >
                          Alterar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "IRC PME", value: pct(localizacao.ircPME), nota: localizacao.interior ? "até 50.000€ (interior)" : `até ${fmt(IRC_LIMITE)}` },
                          { label: "IRC geral", value: pct(localizacao.ircGeral), nota: localizacao.interior ? "Art. 41.º-B EBF" : "acima do limite PME" },
                          { label: "Derrama estimada", value: `~${pct(localizacao.derramaEstimada)}`, nota: "varia por município" },
                          { label: "RFAI", value: pct(localizacao.rfaiTaxa), nota: localizacao.rfaiTipo === "interior" ? "Art. 23.º CFI (interior)" : "Art. 23.º CFI (litoral)" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl bg-white/80 p-2.5 dark:bg-stone-900/50">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{item.label}</div>
                            <div className="text-sm font-bold text-stone-800 dark:text-stone-100">{item.value}</div>
                            <div className="text-[10px] text-stone-400">{item.nota}</div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-stone-400 leading-relaxed">
                        {localizacao.interior
                          ? <>Concelho do interior (<LeiRef artigo="Portaria 208/2017" url={LEI.portaria208} />) — IRC PME 12,5% (<LeiRef artigo="Art. 41.º-B EBF" url={LEI.art41bEBF} />). A derrama municipal varia — confirma a taxa do teu concelho.</>
                          : <>A derrama municipal varia por município (0%–1,5%) — confirma a taxa do teu concelho. <LeiRef artigo="Art. 87.º CIRC" url={LEI.art87circ} /></>}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={recuar}
                      className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-400"
                    >
                      <ArrowLeft size={14} /> Voltar
                    </button>
                    <button
                      type="button"
                      onClick={avancar}
                      disabled={!localizacao}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Seguinte <ArrowRight size={14} />
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── Passo 2: Faturação e custos ──────────────────────────────── */}
              {passo === 2 && (
                <m.div
                  key="passo2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="font-display mb-2 text-2xl font-semibold text-stone-800 dark:text-stone-100">
                    Receita e custos
                  </h2>
                  <p className="mb-6 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    Insere o volume de negócios esperado e os custos da empresa.
                    Todos os custos são dedutíveis ao lucro tributável — pagas IRC (<LeiRef artigo="Art. 87.º CIRC" url={LEI.art87circ} />) apenas sobre o que sobra.
                    {tipoSede !== "fisica" && <> O custo da sede {tipoSede === "virtual" ? "virtual" : "coworking"} ({fmt(custoSedeVirtual)}/mês = {fmt(custoSedeVirtual * 12)}/ano) já está incluído nos custos.</>}
                  </p>

                  <div className="space-y-6">
                    <div>
                      <NumericSlider
                        label={faturacaoComIva ? "Faturação anual com IVA (€)" : "Faturação anual (€)"}
                        value={faturacaoAnual}
                        min={0}
                        max={faturacaoComIva ? 370_000 : 300_000}
                        step={5_000}
                        onChange={setFaturacaoAnual}
                        presets={faturacaoComIva ? [36_900, 73_800, 123_000, 184_500] : [30_000, 60_000, 100_000, 150_000]}
                        tooltip={
                          faturacaoComIva
                            ? <>Volume de negócios anual incluindo IVA ({pct(taxaIvaEmpresa)}). A base tributável ({fmt(faturacaoBase)}) é calculada automaticamente.</>
                            : <>Volume de negócios anual previsto (sem IVA).</>
                        }
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <label className="flex cursor-pointer items-center gap-2.5">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={faturacaoComIva}
                              onChange={(e) => setFaturacaoComIva(e.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="h-5 w-9 rounded-full bg-stone-200 transition-colors peer-checked:bg-brand dark:bg-stone-700 peer-checked:dark:bg-brand" />
                            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                          </div>
                          <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                            Valor inclui IVA ({pct(taxaIvaEmpresa)})
                          </span>
                        </label>
                        {faturacaoComIva && faturacaoAnual > 0 && (
                          <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">
                            Base sem IVA: <strong className="text-stone-600 dark:text-stone-300">{fmt(faturacaoBase)}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <NumericSlider
                      label="Despesas operacionais (€/ano)"
                      value={despesasOper}
                      min={0}
                      max={50_000}
                      step={500}
                      onChange={setDespesasOper}
                      presets={[0, 2_000, 5_000, 10_000]}
                      tooltip={
                        <>
                          Material, viagens, subcontratação, rendas,
                          publicidade. Deduzidas ao lucro tributável antes de
                          IRC.
                        </>
                      }
                    />

                    <NumericSlider
                      label="Salário gerente (€/mês bruto)"
                      value={salGerenteMensal}
                      min={0}
                      max={5_000}
                      step={50}
                      onChange={setSalGerenteMensal}
                      presets={[0, SMN_2026, 1_200, 2_000]}
                      tooltip={
                        <>
                          Salário bruto mensal do gerente-sócio. A empresa paga
                          SS patronal (23,75%) e o trabalhador desconta 11%.
                          Custo dedutível ao IRC (12 meses).
                        </>
                      }
                    />

                    <Collapsible title="Custos de estrutura" defaultOpen>
                      <NumericSlider
                        label="Contabilidade + software (€/ano)"
                        value={custosEstrutura}
                        min={1_000}
                        max={10_000}
                        step={200}
                        onChange={setCustosEstrutura}
                        presets={[1_500, 2_700, 4_000, 6_000]}
                        tooltip={<>Contabilista Certificado (OCC) + software de faturação. Obrigatório para sociedades.</>}
                      />
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={incluirConstituicao}
                            onClick={() => setIncluirConstituicao(!incluirConstituicao)}
                            className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${incluirConstituicao ? "bg-brand" : "bg-stone-300 dark:bg-stone-700"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${incluirConstituicao ? "translate-x-4" : ""}`} />
                          </button>
                          <span className="text-xs text-stone-600 dark:text-stone-300">Incluir custos de constituição</span>
                        </div>
                        {incluirConstituicao && (
                          <>
                            <NumericSlider
                              label="Custo de constituição (€)"
                              value={custoConstituicao}
                              min={360}
                              max={3_000}
                              step={100}
                              onChange={setCustoConstituicao}
                              presets={[360, 800, 1_200, 2_000]}
                              tooltip={<>Empresa na Hora (~360€). Com marca registada, advogado e capital social pode chegar a 2.000€+.</>}
                            />
                            <div>
                              <div className="mb-1.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">Amortizar em:</div>
                              <div className="flex flex-wrap gap-1.5">
                                {([1, 2, 3, 5] as const).map((a) => (
                                  <button
                                    key={a}
                                    type="button"
                                    aria-pressed={anosAmortizacao === a}
                                    onClick={() => setAnosAmortizacao(a)}
                                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                      anosAmortizacao === a
                                        ? "bg-brand text-white"
                                        : "bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400"
                                    }`}
                                  >
                                    {a} ano{a > 1 ? "s" : ""} ({fmt(Math.round(custoConstituicao / a))}/ano)
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </Collapsible>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={recuar}
                      className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-400"
                    >
                      <ArrowLeft size={14} /> Voltar
                    </button>
                    <button
                      type="button"
                      onClick={avancar}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-dark"
                    >
                      Seguinte <ArrowRight size={14} />
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── Passo 3: Dividendos e otimização ─────────────────────────── */}
              {passo === 3 && (
                <m.div
                  key="passo3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="font-display mb-2 text-2xl font-semibold text-stone-800 dark:text-stone-100">
                    Dividendos e otimização
                  </h2>
                  <p className="mb-6 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    O lucro que sobra após o IRC pode ser distribuído como
                    dividendos — mas há um IRS adicional.{" "}
                    {aplicarIFICI
                      ? <>Com o IFICI (<LeiRef artigo="Art. 58.º-A EBF" url={LEI.art58aEBF} />), os dividendos de fonte portuguesa são tributados a {pct(IFICI_TAXA_FLAT)} flat (em vez de 28%).</>
                      : <>Podes escolher entre taxa liberatória de 28% (<LeiRef artigo="Art. 71.º CIRS" url={LEI.art71cirs} />) ou englobamento de 50% do valor (<LeiRef artigo="Art. 40.º-A CIRS" url={LEI.art40aCirs} />).</>}
                  </p>

                  <div className="space-y-5">
                    {/* Distribuir dividendos */}
                    <div>
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                          Distribuir lucro como dividendos?
                        </span>
                        <InfoTip>
                          Se não distribuíres, o lucro fica retido na empresa
                          para reinvestimento. Só pagas IRC (sem IRS adicional).
                        </InfoTip>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { v: true as boolean, l: "Sim — distribui", sub: "Salário + dividendos" },
                          { v: false as boolean, l: "Não — retém", sub: "Só salário (lucro fica)" },
                        ].map(({ v, l, sub }) => (
                          <button
                            key={String(v)}
                            type="button"
                            aria-pressed={distribuirDividendos === v}
                            onClick={() => setDistribuirDividendos(v)}
                            className={`rounded-2xl border-2 p-3 text-left transition-all ${
                              distribuirDividendos === v
                                ? "border-brand bg-brand-light/30 dark:bg-brand/5"
                                : "border-stone-100 bg-white hover:border-stone-200 dark:border-stone-800 dark:bg-stone-900"
                            }`}
                          >
                            <div
                              className={`text-xs font-bold ${
                                distribuirDividendos === v
                                  ? "text-brand-dark dark:text-brand"
                                  : "text-stone-600 dark:text-stone-300"
                              }`}
                            >
                              {l}
                            </div>
                            <div
                              className={`text-[10px] mt-0.5 ${
                                distribuirDividendos === v
                                  ? "text-brand/70"
                                  : "text-stone-400"
                              }`}
                            >
                              {sub}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tipo de tributação de dividendos */}
                    {distribuirDividendos && !aplicarIFICI && (
                      <div>
                        <div className="mb-2 flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                            Como tributar os dividendos?
                          </span>
                          <InfoTip label="Tributação de dividendos">
                            Liberatória 28% (Art. 71.º CIRS): retenção definitiva
                            e simples. Englobamento (Art. 40.º-A CIRS): só 50%
                            dos dividendos nacionais entram no rendimento
                            coletável, tributados à taxa progressiva. Quase
                            sempre mais favorável até ~80.000€ de rendimento
                            total.
                          </InfoTip>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { v: false, l: "28% Liberatória", sub: "Art. 71.º CIRS" },
                            { v: true, l: "Englobamento 50%", sub: "Art. 40.º-A CIRS" },
                          ].map(({ v, l, sub }) => (
                            <button
                              key={String(v)}
                              type="button"
                              aria-pressed={opcaoEnglobamento === v}
                              onClick={() => setOpcaoEnglobamento(v)}
                              className={`rounded-2xl border-2 p-3 text-left transition-all ${
                                opcaoEnglobamento === v
                                  ? "border-brand bg-brand-light/30 dark:bg-brand/5"
                                  : "border-stone-100 bg-white hover:border-stone-200 dark:border-stone-800 dark:bg-stone-900"
                              }`}
                            >
                              <div
                                className={`text-xs font-bold ${
                                  opcaoEnglobamento === v
                                    ? "text-brand-dark dark:text-brand"
                                    : "text-stone-600 dark:text-stone-300"
                                }`}
                              >
                                {l}
                              </div>
                              <div
                                className={`text-[10px] mt-0.5 ${
                                  opcaoEnglobamento === v
                                    ? "text-brand/70"
                                    : "text-stone-400"
                                }`}
                              >
                                {sub}
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Dica de otimização */}
                        {englobamentoMelhor && !opcaoEnglobamento && (
                          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-brand/20 bg-brand-light/20 p-3">
                            <Sparkle
                              size={14}
                              className="mt-0.5 flex-shrink-0 text-brand"
                            />
                            <p className="text-xs text-brand-dark leading-relaxed dark:text-brand">
                              O englobamento pouparia{" "}
                              <strong>{fmt(Math.round(poupancaEnglobamento))}/ano</strong>{" "}
                              neste cenário. Compensa quase sempre quando o
                              rendimento total fica abaixo dos escalões mais
                              altos.
                            </p>
                          </div>
                        )}
                        {!englobamentoMelhor && opcaoEnglobamento && (
                          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-alert-border bg-alert-bg p-3">
                            <Warning
                              size={14}
                              className="mt-0.5 flex-shrink-0 text-alert-text"
                            />
                            <p className="text-xs text-alert-text leading-relaxed">
                              Neste cenário, a taxa liberatória de 28% é mais
                              favorável — poupas{" "}
                              <strong>{fmt(Math.round(poupancaEnglobamento))}/ano</strong>.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* IFICI — taxa flat aplicada automaticamente */}
                    {distribuirDividendos && aplicarIFICI && (
                      <div className="mt-3 rounded-2xl border border-brand/20 bg-brand-light/20 p-3 dark:bg-brand/5">
                        <div className="flex items-start gap-2">
                          <Sparkle size={14} className="mt-0.5 flex-shrink-0 text-brand" />
                          <div className="text-xs text-brand-dark dark:text-brand leading-relaxed">
                            <strong>IFICI ativo</strong> (<LeiRef artigo="Art. 58.º-A EBF" url={LEI.art58aEBF} />) — dividendos de fonte portuguesa tributados a {pct(IFICI_TAXA_FLAT)} flat durante {IFICI_PRAZO_ANOS.value} anos.
                            Poupança face à liberatória de 28%: <strong>{fmt(Math.round(resultado.poupancaIFICI))}/ano</strong>.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={recuar}
                      className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-400"
                    >
                      <ArrowLeft size={14} /> Voltar
                    </button>
                    <button
                      type="button"
                      onClick={avancar}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-dark"
                    >
                      Seguinte <ArrowRight size={14} />
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── Passo 4: Otimização fiscal ──────────────────────────────── */}
              {passo === 4 && (
                <m.div
                  key="passo4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="font-display mb-2 text-2xl font-semibold text-stone-800 dark:text-stone-100">
                    Otimização fiscal
                  </h2>
                  <p className="mb-6 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    Ajusta conforme a tua situação. Tributação autónoma (<LeiRef artigo="Art. 88.º CIRC" url={LEI.art88circ} />),
                    benefícios ao investimento (<LeiRef artigo="DL 162/2014 (CFI)" url={LEI.cfi} />) e impostos municipais.
                    Se nada se aplica, avança — o resultado já está calculado.
                  </p>

                  <div className="space-y-5">
                    {/* ── Tributação Autónoma ─────────────────────────────── */}
                    <Collapsible title="Tributação Autónoma (Art. 88.º CIRC)" defaultOpen={tipoViatura !== "nenhuma"}>
                      <div className="mb-3">
                        <div className="mb-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
                          Viatura da empresa
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {(Object.keys(TIPO_VIATURA_META) as TipoViaturaGuiado[]).map((v) => {
                            const m = TIPO_VIATURA_META[v];
                            return (
                              <button
                                key={v}
                                type="button"
                                aria-pressed={tipoViatura === v}
                                onClick={() => {
                                  setTipoViatura(v);
                                  if (v === "nenhuma" || v === "eletrica") setEncargosViatura(0);
                                }}
                                className={`rounded-xl border-2 p-2 text-left transition-all ${
                                  tipoViatura === v
                                    ? "border-brand bg-brand-light/30 dark:bg-brand/5"
                                    : "border-stone-100 bg-white hover:border-stone-200 dark:border-stone-800 dark:bg-stone-900"
                                }`}
                              >
                                <div className={`text-[10px] font-bold leading-tight ${tipoViatura === v ? "text-brand-dark dark:text-brand" : "text-stone-600 dark:text-stone-300"}`}>{m.label}</div>
                                <div className={`text-[9px] mt-0.5 ${tipoViatura === v ? "text-brand/70" : "text-stone-400"}`}>{m.sub}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {tipoViatura !== "nenhuma" && tipoViatura !== "eletrica" && (
                        <NumericSlider
                          label="Encargos anuais viatura (€)"
                          value={encargosViatura}
                          min={0}
                          max={15_000}
                          step={200}
                          onChange={setEncargosViatura}
                          presets={[0, 1_500, 3_000, 6_000]}
                          tooltip={<>Combustível, manutenção, seguro, portagens, depreciação. Art. 88.º n.º 3 CIRC.</>}
                        />
                      )}

                      <NumericSlider
                        label="Despesas de representação (€/ano)"
                        value={despRepresentacao}
                        min={0}
                        max={10_000}
                        step={100}
                        onChange={setDespRepresentacao}
                        presets={[0, 500, 1_000, 2_000]}
                        tooltip={<>Refeições com clientes, viagens de representação. TA 10% (Art. 88.º n.º 7 CIRC).</>}
                      />

                      <NumericSlider
                        label="Ajudas de custo / km em viatura própria (€/ano)"
                        value={ajudasCusto}
                        min={0}
                        max={5_000}
                        step={100}
                        onChange={setAjudasCusto}
                        presets={[0, 500, 1_000, 2_000]}
                        tooltip={<>Compensação por deslocações em viatura própria do sócio/colaborador. TA 5% (Art. 88.º n.º 9 CIRC).</>}
                      />

                      <NumericSlider
                        label="Despesas não documentadas (€/ano)"
                        value={naoDocumentadas}
                        min={0}
                        max={2_000}
                        step={50}
                        onChange={setNaoDocumentadas}
                        presets={[0, 200, 500, 1_000]}
                        tooltip={<>Despesas sem documento fiscal válido. TA 50% (Art. 88.º n.º 1 CIRC). Evitar ao máximo.</>}
                      />

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="emPrejuizo" checked={emPrejuizo} onChange={(e) => setEmPrejuizo(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand" />
                          <label htmlFor="emPrejuizo" className="text-xs text-stone-600 dark:text-stone-300">
                            Empresa em prejuízo fiscal (agravamento +10pp)
                          </label>
                          <InfoTip>Art. 88.º n.º 14 CIRC — todas as taxas de TA sobem 10 pontos percentuais quando a empresa apresenta prejuízo fiscal.</InfoTip>
                        </div>
                        {emPrejuizo && (
                          <div className="ml-6 flex items-center gap-2">
                            <input type="checkbox" id="excecaoPrejuizo" checked={excecaoPrejuizo} onChange={(e) => setExcecaoPrejuizo(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand" />
                            <label htmlFor="excecaoPrejuizo" className="text-xs text-stone-500 dark:text-stone-400">
                              Lucro em pelo menos 1 dos 3 anos anteriores OU primeiros 3 anos de atividade
                            </label>
                            <InfoTip>Art. 88.º n.º 14 CIRC (OE2026) — exceção ao agravamento. Se aplica, as taxas de TA mantêm-se normais mesmo em prejuízo.</InfoTip>
                          </div>
                        )}
                      </div>

                      {resultado.ta.total > 0 && (
                        <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-900/20 dark:border-amber-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Tributação Autónoma total</span>
                            <span className="text-[11px] font-bold tabular-nums text-amber-700 dark:text-amber-300">{fmt(Math.round(resultado.ta.total))}</span>
                          </div>
                          <div className="space-y-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                            {resultado.ta.viatura > 0 && <div className="flex justify-between"><span>Viatura ({pct(TA_TAXAS_GUIADO[tipoViatura])})</span><span>{fmt(Math.round(resultado.ta.viatura))}</span></div>}
                            {resultado.ta.representacao > 0 && <div className="flex justify-between"><span>Representação (10%)</span><span>{fmt(Math.round(resultado.ta.representacao))}</span></div>}
                            {resultado.ta.ajudasCusto > 0 && <div className="flex justify-between"><span>Ajudas de custo (5%)</span><span>{fmt(Math.round(resultado.ta.ajudasCusto))}</span></div>}
                            {resultado.ta.naoDocumentadas > 0 && <div className="flex justify-between"><span>Não documentadas (50%)</span><span>{fmt(Math.round(resultado.ta.naoDocumentadas))}</span></div>}
                          </div>
                        </div>
                      )}
                    </Collapsible>

                    {/* ── RFAI ────────────────────────────────────────── */}
                    <Collapsible title="RFAI — Regime Fiscal de Apoio ao Investimento" defaultOpen={rfaiInvest > 0}>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
                        <LeiRef artigo="Art. 22.º–26.º CFI" url={LEI.cfi} /> — deduz ao IRC uma percentagem do investimento
                        elegível (equipamentos, ativos intangíveis). Interior/Ilhas: 30%
                        (até 15M) + 10% (excedente). Lisboa/Algarve: 10% flat.
                      </p>
                      {localizacao && (
                        <div className="mb-3 flex items-center gap-2 rounded-xl bg-brand-light/30 border border-brand/20 px-3 py-2">
                          <MapPin size={12} className="flex-shrink-0 text-brand" />
                          <span className="text-[11px] text-brand-dark dark:text-brand">
                            RFAI ajustado para <strong>{localizacao.nome}</strong>: {pct(localizacao.rfaiTaxa)} ({localizacao.rfaiTipo})
                          </span>
                        </div>
                      )}
                      {!localizacao && (
                        <div className="mb-3">
                          <div className="mb-2 text-xs font-semibold text-stone-600 dark:text-stone-300">Região do investimento</div>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { v: "interior" as const, l: "Interior", sub: "Norte, Centro, Alentejo, Ilhas — 30%" },
                              { v: "litoral" as const, l: "Litoral", sub: "Lisboa, Algarve — 10%" },
                            ]).map(({ v, l, sub }) => (
                              <button key={v} type="button" aria-pressed={rfaiRegiao === v} onClick={() => setRfaiRegiao(v)}
                                className={`rounded-2xl border-2 p-3 text-left transition-all ${rfaiRegiao === v ? "border-brand bg-brand-light/30 dark:bg-brand/5" : "border-stone-100 bg-white hover:border-stone-200 dark:border-stone-800 dark:bg-stone-900"}`}>
                                <div className={`text-xs font-bold ${rfaiRegiao === v ? "text-brand-dark dark:text-brand" : "text-stone-600 dark:text-stone-300"}`}>{l}</div>
                                <div className={`text-[10px] mt-0.5 ${rfaiRegiao === v ? "text-brand/70" : "text-stone-400"}`}>{sub}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <NumericSlider label="Investimento elegível RFAI (€)" value={rfaiInvest} min={0} max={500_000} step={5_000} onChange={setRfaiInvest} presets={[0, 25_000, 50_000, 100_000]}
                        tooltip={<>Equipamentos, ativos intangíveis elegíveis. O benefício abate ao IRC (coleta).</>}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" id="primeirosAnos" checked={primeirosAnos} onChange={(e) => setPrimeirosAnos(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand" />
                        <label htmlFor="primeirosAnos" className="text-xs text-stone-600 dark:text-stone-300">Primeiros 3 períodos de atividade (limite RFAI sobe de 50% para 100% da coleta)</label>
                      </div>
                      {rfaiInvest > 0 && resultado.beneficios.rfai > 0 && (
                        <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 dark:bg-emerald-900/20 dark:border-emerald-800">
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Poupança RFAI ({pct(RFAI_TAXA[rfaiRegiaoEfetiva])} de {fmt(rfaiInvest)})</span>
                          <span className="text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">-{fmt(Math.round(resultado.beneficios.rfai))}</span>
                        </div>
                      )}
                    </Collapsible>

                    {/* ── DLRR ────────────────────────────────────────── */}
                    <Collapsible title="DLRR — Lucros Retidos e Reinvestidos" defaultOpen={dlrrLucros > 0}>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
                        <LeiRef artigo="Art. 27.º–34.º CFI" url={LEI.cfi} /> — PME e Small Mid Cap podem deduzir 10% dos
                        lucros retidos e reinvestidos em ativos elegíveis (máx. 5M€).
                        Limite: 25% da coleta IRC. Reportável 12 exercícios.
                      </p>
                      <NumericSlider label="Lucros retidos reinvestidos (€)" value={dlrrLucros} min={0} max={200_000} step={5_000} onChange={setDlrrLucros} presets={[0, 20_000, 50_000, 100_000]}
                        tooltip={<>Lucros do exercício anterior retidos e reinvestidos em ativos elegíveis nos 4 anos seguintes.</>}
                      />
                      {dlrrLucros > 0 && resultado.beneficios.dlrr > 0 && (
                        <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 dark:bg-emerald-900/20 dark:border-emerald-800">
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Poupança DLRR (10% de {fmt(dlrrLucros)}, máx 25% coleta)</span>
                          <span className="text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">-{fmt(Math.round(resultado.beneficios.dlrr))}</span>
                        </div>
                      )}
                    </Collapsible>

                    {/* ── SIFIDE II ───────────────────────────────────── */}
                    <Collapsible title="SIFIDE II — Incentivos à I&D" defaultOpen={sifideDespesas > 0}>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
                        <LeiRef artigo="Art. 35.º–42.º CFI" url={LEI.cfi} /> — dedução à coleta de IRC de 32,5% a 82,5%
                        das despesas elegíveis com Investigação e Desenvolvimento.
                        Certificação ANI necessária. Reportável 12 exercícios.
                      </p>
                      <div className="mb-3">
                        <div className="mb-2 text-xs font-semibold text-stone-600 dark:text-stone-300">Tipo de empresa</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(Object.keys(SIFIDE_META) as TipoEmpresaSifide[]).map((t) => {
                            const meta = SIFIDE_META[t];
                            return (
                              <button key={t} type="button" aria-pressed={tipoSifide === t} onClick={() => setTipoSifide(t)}
                                className={`rounded-xl border-2 p-2 text-left transition-all ${tipoSifide === t ? "border-brand bg-brand-light/30 dark:bg-brand/5" : "border-stone-100 bg-white hover:border-stone-200 dark:border-stone-800 dark:bg-stone-900"}`}>
                                <div className={`text-[10px] font-bold ${tipoSifide === t ? "text-brand-dark dark:text-brand" : "text-stone-600 dark:text-stone-300"}`}>{meta.label}</div>
                                <div className={`text-[9px] mt-0.5 ${tipoSifide === t ? "text-brand/70" : "text-stone-400"}`}>{meta.sub}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <NumericSlider label="Despesas I&D elegíveis (€/ano)" value={sifideDespesas} min={0} max={200_000} step={5_000} onChange={setSifideDespesas} presets={[0, 10_000, 30_000, 50_000]}
                        tooltip={<>Pessoal investigador, aquisição de equipamento I&D, patentes, subcontratação. Certificação ANI obrigatória.</>}
                      />
                      {sifideDespesas > 0 && resultado.beneficios.sifide > 0 && (
                        <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 dark:bg-emerald-900/20 dark:border-emerald-800">
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Poupança SIFIDE ({pct(SIFIDE_META[tipoSifide].taxa)} de {fmt(sifideDespesas)})</span>
                          <span className="text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">-{fmt(Math.round(resultado.beneficios.sifide))}</span>
                        </div>
                      )}
                    </Collapsible>

                    {/* ── RFAI Contratual ─────────────────────────────── */}
                    <Collapsible title="RFAI Contratual (investimento >= 3M)" defaultOpen={rfaiContratualValor > 0}>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
                        <LeiRef artigo="Art. 8.º–22.º CFI" url={LEI.cfi} /> — para investimentos de grande dimensão,
                        negociado com IAPMEI/AICEP. Crédito fiscal adicional que
                        se aplica após RFAI + DLRR + SIFIDE. O valor é acordado caso a caso.
                      </p>
                      <NumericSlider label="Crédito fiscal contratual (€/ano)" value={rfaiContratualValor} min={0} max={500_000} step={10_000} onChange={setRfaiContratualValor} presets={[0, 50_000, 100_000, 250_000]}
                        tooltip={<>Valor anual do benefício negociado. Aplica-se após os restantes benefícios, limitado ao IRC remanescente.</>}
                      />
                    </Collapsible>

                    {/* ── Impostos Municipais (IMI/IMT) ───────────────── */}
                    <Collapsible title="Imóvel da empresa (IMI/IMT)" defaultOpen={temImovelEmpresa}>
                      {tipoSede !== "fisica" && (
                        <div className="mb-3 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand-light/10 p-3 dark:bg-brand/5">
                          <Laptop size={14} className="mt-0.5 flex-shrink-0 text-brand" />
                          <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                            A tua empresa tem sede {tipoSede === "virtual" ? "virtual" : "em coworking"} — IMI e IMT não se aplicam (sem imóvel próprio).
                            Se adquirires imóvel futuramente, ativa abaixo.
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <button type="button" role="switch" aria-checked={temImovelEmpresa} onClick={() => setTemImovelEmpresa(!temImovelEmpresa)}
                          className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${temImovelEmpresa ? "bg-brand" : "bg-stone-300 dark:bg-stone-700"}`}>
                          <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${temImovelEmpresa ? "translate-x-4" : ""}`} />
                        </button>
                        <span className="text-xs text-stone-600 dark:text-stone-300">A empresa tem ou vai adquirir imóvel próprio</span>
                      </div>
                      {temImovelEmpresa && (
                        <div className="space-y-4">
                          <NumericSlider label="Valor Patrimonial Tributário — VPT (€)" value={vptImovel} min={0} max={2_000_000} step={10_000} onChange={setVptImovel} presets={[50_000, 150_000, 300_000, 500_000]}
                            tooltip={<>Consta na caderneta predial. O IMI incide sobre este valor.</>}
                          />
                          <div>
                            <div className="mb-1.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">Taxa IMI municipal</div>
                            <div className="flex flex-wrap gap-1.5">
                              {([0.003, 0.0035, 0.004, 0.0045]).map((t) => (
                                <button key={t} type="button" aria-pressed={taxaIMI === t} onClick={() => setTaxaIMI(t)}
                                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${taxaIMI === t ? "bg-brand text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400"}`}>
                                  {pct(t)}
                                </button>
                              ))}
                            </div>
                          </div>
                          {vptImovel > 0 && (
                            <div className="flex justify-between text-xs text-stone-500">
                              <span>IMI anual estimado</span>
                              <span className="font-semibold tabular-nums">{fmt(Math.round(vptImovel * taxaIMI))}/ano</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="isencaoIMI" checked={isencaoIMI_RFAI} onChange={(e) => setIsencaoIMI_RFAI(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-emerald-500" />
                            <label htmlFor="isencaoIMI" className="text-xs text-stone-600 dark:text-stone-300">Isenção IMI via RFAI (até 10 anos, aprovação municipal)</label>
                          </div>

                          <div className="border-t border-stone-100 dark:border-stone-800 pt-3">
                            <NumericSlider label="Valor de aquisição do imóvel (€)" value={valorAquisicaoImovel} min={0} max={5_000_000} step={25_000} onChange={setValorAquisicaoImovel} presets={[0, 100_000, 250_000, 500_000]}
                              tooltip={<>IMT (6,5%) + Imposto de Selo (0,8%) incidem sobre este valor na transmissão.</>}
                            />
                            {valorAquisicaoImovel > 0 && (
                              <div className="mt-1 flex justify-between text-xs text-stone-500">
                                <span>IMT + IS one-time</span>
                                <span className="font-semibold tabular-nums">{fmt(Math.round(valorAquisicaoImovel * (IMT_TAXA_COMERCIAL + IS_TAXA_AQUISICAO)))}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <input type="checkbox" id="isencaoIMT" checked={isencaoIMT_RFAI} onChange={(e) => setIsencaoIMT_RFAI(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-emerald-500" />
                              <label htmlFor="isencaoIMT" className="text-xs text-stone-600 dark:text-stone-300">Isenção IMT + IS via RFAI (projeto reconhecido)</label>
                            </div>
                            {valorAquisicaoImovel > 0 && (
                              <div className="mt-2">
                                <div className="mb-1.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">Amortizar IMT em:</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {([5, 10, 15, 20]).map((a) => (
                                    <button key={a} type="button" aria-pressed={anosAmortizacaoIMT === a} onClick={() => setAnosAmortizacaoIMT(a)}
                                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${anosAmortizacaoIMT === a ? "bg-brand text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400"}`}>
                                      {a} anos
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Collapsible>

                    {/* Resumo benefícios */}
                    {resultado.beneficios.total > 0 && (
                      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-900/20 dark:border-emerald-800">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Total de benefícios fiscais</span>
                          <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">-{fmt(Math.round(resultado.beneficios.total))}</span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                          {resultado.beneficios.rfai > 0 && <div className="flex justify-between"><span>RFAI</span><span>-{fmt(Math.round(resultado.beneficios.rfai))}{resultado.beneficios.rfaiBruto > resultado.beneficios.rfai ? ` (bruto ${fmt(Math.round(resultado.beneficios.rfaiBruto))}, limitado à coleta)` : ""}</span></div>}
                          {resultado.beneficios.dlrr > 0 && <div className="flex justify-between"><span>DLRR</span><span>-{fmt(Math.round(resultado.beneficios.dlrr))}{resultado.beneficios.dlrrBruto > resultado.beneficios.dlrr ? ` (bruto ${fmt(Math.round(resultado.beneficios.dlrrBruto))})` : ""}</span></div>}
                          {resultado.beneficios.sifide > 0 && <div className="flex justify-between"><span>SIFIDE II</span><span>-{fmt(Math.round(resultado.beneficios.sifide))}{resultado.beneficios.sifideBruto > resultado.beneficios.sifide ? ` (bruto ${fmt(Math.round(resultado.beneficios.sifideBruto))})` : ""}</span></div>}
                          {resultado.beneficios.rfaiContratual > 0 && <div className="flex justify-between"><span>RFAI Contratual</span><span>-{fmt(Math.round(resultado.beneficios.rfaiContratual))}</span></div>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button type="button" onClick={recuar}
                      className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-400">
                      <ArrowLeft size={14} /> Voltar
                    </button>
                    <button type="button" onClick={avancar}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-dark">
                      Ver resultado <ArrowRight size={14} />
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── Resultado ────────────────────────────────────────────────── */}
              {passo === "resultado" && (
                <m.div
                  key="resultado"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="font-display mb-2 text-2xl font-semibold text-stone-800 dark:text-stone-100">
                    Resultado da simulação
                  </h2>
                  <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
                    Estimativa anual para{" "}
                    {tipoSociedade === "unipessoal"
                      ? "Sociedade Unipessoal"
                      : "Sociedade por Quotas"}
                    {localizacao
                      ? ` em ${localNome ? `${localNome} (${localizacao.nome})` : localizacao.nome}`
                      : ""}
                    {tipoSede !== "fisica" && ` (sede ${tipoSede === "virtual" ? "virtual" : "coworking"})`}
                    {aplicarIFICI && " · IFICI ativo"}
                    {perfilFundador !== "residente" && ` · ${perfilFundador === "estrangeiro_ue" ? "residente UE" : "residente extra-UE"}`}
                    {" "}com faturação de {fmt(faturacaoBase)}/ano
                    {faturacaoComIva && faturacaoAnual > 0 && ` (${fmt(faturacaoAnual)} com IVA)`}.
                  </p>

                  {/* Breakdown cascata */}
                  <div className="space-y-1.5">
                    {[
                      { label: faturacaoComIva ? `Faturação anual (base s/ IVA de ${fmt(faturacaoAnual)})` : "Faturação anual", value: resultado.faturacao, cor: "text-stone-700 dark:text-stone-200" },
                      resultado.despesasOper > 0 ? { label: "Despesas operacionais", value: -resultado.despesasOper, cor: "text-stone-500" } : null,
                      { label: "Custos estrutura (contabilidade + software)", value: -resultado.custosEstrutura, cor: "text-stone-500" },
                      resultado.custoConstituicao > 0 ? { label: `Constituição (amortizada ${anosAmortizacao} ano${anosAmortizacao > 1 ? "s" : ""})`, value: -resultado.custoConstituicao, cor: "text-stone-500" } : null,
                      resultado.salGerente > 0 ? { label: `Salário gerente (${fmt(salGerenteMensal)}/mês × 12)`, value: -resultado.salGerente, cor: "text-stone-500" } : null,
                      resultado.ssSalGerente > 0 ? { label: "SS empresa + trabalhador (34,75%)", value: -resultado.ssSalGerente, cor: "text-amber-600 dark:text-amber-400" } : null,
                      resultado.custoSedeVirtual > 0 ? { label: `Sede ${tipoSede === "virtual" ? "virtual" : "coworking"} (${fmt(custoSedeVirtual)}/mês × 12)`, value: -resultado.custoSedeVirtual, cor: "text-stone-500" } : null,
                      resultado.custoRepresentanteFiscal > 0 ? { label: "Representante fiscal (Art. 19.º LGT)", value: -resultado.custoRepresentanteFiscal, cor: "text-amber-600 dark:text-amber-400" } : null,
                      { label: "Lucro tributável", value: resultado.lucroTributavel, cor: "text-stone-700 dark:text-stone-200 font-semibold", sep: true },
                      { label: `IRC coleta (${pct(localizacao?.ircPME ?? IRC_TAXA_PME.value)}/${fmt(IRC_LIMITE)} + ${pct(localizacao?.ircGeral ?? IRC_TAXA_GERAL.value)}${localizacao?.interior ? " · interior" : ""})`, value: -resultado.coleta, cor: "text-red-500 dark:text-red-400" },
                      resultado.beneficios.rfai > 0 ? { label: `RFAI (${pct(RFAI_TAXA[rfaiRegiaoEfetiva])} × ${fmt(rfaiInvest)})`, value: resultado.beneficios.rfai, cor: "text-emerald-600 dark:text-emerald-400", plus: true } : null,
                      resultado.beneficios.dlrr > 0 ? { label: `DLRR (10% × ${fmt(dlrrLucros)})`, value: resultado.beneficios.dlrr, cor: "text-emerald-600 dark:text-emerald-400", plus: true } : null,
                      resultado.beneficios.sifide > 0 ? { label: `SIFIDE II (${pct(SIFIDE_META[tipoSifide].taxa)} × ${fmt(sifideDespesas)})`, value: resultado.beneficios.sifide, cor: "text-emerald-600 dark:text-emerald-400", plus: true } : null,
                      resultado.beneficios.rfaiContratual > 0 ? { label: "RFAI Contratual", value: resultado.beneficios.rfaiContratual, cor: "text-emerald-600 dark:text-emerald-400", plus: true } : null,
                      resultado.beneficios.total > 0 ? { label: "IRC após benefícios", value: resultado.ircAposBeneficios, cor: "text-stone-600 dark:text-stone-300", sep: true } : null,
                      resultado.ta.viatura > 0 ? { label: `TA viatura (${pct(TA_TAXAS_GUIADO[tipoViatura])})`, value: -resultado.ta.viatura, cor: "text-amber-600 dark:text-amber-400" } : null,
                      resultado.ta.representacao > 0 ? { label: "TA representação (10%)", value: -resultado.ta.representacao, cor: "text-amber-600 dark:text-amber-400" } : null,
                      resultado.ta.ajudasCusto > 0 ? { label: "TA ajudas de custo (5%)", value: -resultado.ta.ajudasCusto, cor: "text-amber-600 dark:text-amber-400" } : null,
                      resultado.ta.naoDocumentadas > 0 ? { label: "TA não documentadas (50%)", value: -resultado.ta.naoDocumentadas, cor: "text-amber-600 dark:text-amber-400" } : null,
                      { label: `Derrama municipal (~${pct(localizacao?.derramaEstimada ?? DERRAMA_MAX.value)}${localizacao ? " · " + localizacao.nome : ""})`, value: -resultado.derrama, cor: "text-red-400" },
                      resultado.custoMunicipalAnual > 0 ? { label: "IMI + IMT/IS (amortizado)", value: -resultado.custoMunicipalAnual, cor: "text-red-400" } : null,
                      resultado.poupancaIMI > 0 || resultado.poupancaIMT > 0 ? { label: "Poupança municipal (isenções RFAI)", value: resultado.poupancaIMI + (resultado.poupancaIMT / anosAmortizacaoIMT), cor: "text-emerald-600 dark:text-emerald-400", plus: true } : null,
                      { label: "Lucro líquido (disponível)", value: resultado.lucroLiquido, cor: "text-stone-700 dark:text-stone-200 font-semibold", sep: true },
                      distribuirDividendos ? {
                        label: aplicarIFICI
                          ? `IRS dividendos (IFICI ${pct(IFICI_TAXA_FLAT)} flat)`
                          : opcaoEnglobamento
                            ? `IRS dividendos (englobamento 50% × ${pct(resultado.taxaMarginalGerente)} marginal)`
                            : "IRS dividendos (28% taxa liberatória)",
                        value: -resultado.irsDividendos, cor: "text-red-500 dark:text-red-400",
                      } : null,
                      distribuirDividendos && aplicarIFICI && resultado.poupancaIFICI > 0 ? {
                        label: `Poupança IFICI (vs 28% liberatória)`,
                        value: resultado.poupancaIFICI, cor: "text-emerald-600 dark:text-emerald-400", plus: true,
                      } : null,
                    ]
                      .filter(Boolean)
                      .map((item) => {
                        const i = item as { label: string; value: number; cor: string; sep?: boolean; plus?: boolean };
                        return (
                          <div key={i.label} className={`flex items-center justify-between px-3 py-2 rounded-xl ${i.sep ? "border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 mt-1" : ""}`}>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400">{i.label}</span>
                            <span className={`text-[11px] tabular-nums ${i.cor}`}>{i.value < 0 ? "−" : i.plus ? "+" : ""}{fmt(Math.abs(Math.round(i.value)))}</span>
                          </div>
                        );
                      })}

                    {/* Total líquido para o dono */}
                    <div className="mt-3 rounded-3xl border-2 border-brand bg-white p-5 shadow-card dark:bg-stone-950">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">Líquido para o dono</div>
                          <div className="text-[11px] text-stone-400 mt-0.5">{distribuirDividendos ? "Salário líquido + dividendos líquidos" : "Apenas salário líquido (lucro retido)"}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-2xl font-semibold text-brand tabular-nums"><AnimatedNumber value={resultado.liquidoGerente} /></div>
                          <div className="text-xs text-stone-400">~{fmt(Math.round(resultado.liquidoGerente / 12))}/mês</div>
                        </div>
                      </div>
                    </div>

                    {/* Dica de englobamento */}
                    {distribuirDividendos && (
                      <div className={`mt-2 rounded-xl border px-3 py-2 ${englobamentoMelhor ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800" : "border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50"}`}>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {englobamentoMelhor
                            ? `O englobamento pouparia ${fmt(Math.round(poupancaEnglobamento))} face à taxa liberatória (taxa marginal ${pct(resultado.taxaMarginalGerente)}).`
                            : `A taxa liberatória (28%) é mais vantajosa que o englobamento para o teu perfil (marginal ${pct(resultado.taxaMarginalGerente)}).`}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 px-1 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
                    Estimativa anual com as taxas oficiais de 2026
                    {localizacao ? ` para ${localizacao.nome}` : ""}.
                    IRC {localizacao ? pct(localizacao.ircPME) : "PME"} (<LeiRef artigo="Art. 87.º CIRC" url={LEI.art87circ} />),
                    derrama ~{pct(localizacao?.derramaEstimada ?? DERRAMA_MAX.value)},
                    TA (<LeiRef artigo="Art. 88.º CIRC" url={LEI.art88circ} />),
                    benefícios (<LeiRef artigo="CFI" url={LEI.cfi} />) e IMI/IMT conforme configurado.
                    {aplicarIFICI && <> IFICI (<LeiRef artigo="Art. 58.º-A EBF" url={LEI.art58aEBF} />) aplicado aos dividendos.</>}
                    {" "}Salário antes de IRS na fonte.
                    Não substitui aconselhamento de um contabilista certificado (OCC).
                  </p>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={recuar}
                      className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-400"
                    >
                      <ArrowLeft size={14} /> Voltar
                    </button>
                    <button
                      type="button"
                      onClick={avancar}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-dark"
                    >
                      Seguinte <ArrowRight size={14} />
                    </button>
                  </div>
                </m.div>
              )}

              {/* ── Passo 6: A seguir ─────────────────────────────────────── */}
              {passo === "aseguir" && (
                <m.div
                  key="aseguir"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-light/60 px-3 py-1 text-xs font-semibold text-brand-dark">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    Próximos passos
                  </span>
                  <h2 className="font-display mb-2 text-2xl font-semibold text-stone-800 dark:text-stone-100">
                    O que fazer a seguir
                  </h2>
                  <p className="mb-5 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    A tua simulação está pronta. Abaixo tens o plano de ação para
                    avançar com confiança.
                  </p>

                  {/* ── Resumo da simulação (métricas-chave) ──────────────── */}
                  <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Faturação", valor: fmt(faturacaoBase), sub: faturacaoComIva ? `s/ IVA (${fmt(faturacaoAnual)} c/)` : "/ano" },
                      { label: "Líquido", valor: fmt(Math.round(resultado.liquidoGerente)), sub: "/ano" },
                      { label: "Mensal", valor: `~${fmt(Math.round(resultado.liquidoGerente / 12))}`, sub: "/mês" },
                      { label: "Taxa efetiva", valor: `${Math.round(resultado.taxaEfetiva * 100)}%`, sub: "carga fiscal" },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-2xl border border-stone-100 bg-stone-50/60 px-3 py-2.5 dark:border-stone-800 dark:bg-stone-900/50"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{m.label}</div>
                        <div className="mt-0.5 text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">{m.valor}</div>
                        <div className="text-[10px] text-stone-400">{m.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── Plano de ação ─────────────────────────────────────── */}
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Plano de ação
                  </h3>
                  <div className="space-y-3">
                    {/* 1. Mapa de onde instalar (só para quem está a avaliar) */}
                    {jaTemEmpresa === "nao" && (
                      <a
                        href="#mapa-regioes-empresa"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById("mapa-regioes-empresa")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="group flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand-light/30 p-4 text-left transition-all hover:shadow-card dark:bg-brand/5"
                      >
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
                          <MapPin size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-brand-dark dark:text-brand">Onde instalar a empresa</span>
                            <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold text-brand">Mapa</span>
                          </span>
                          <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                            IRC reduzido no interior, Zona Franca da Madeira, RFAI por
                            região, derrama e custo de contabilista — tudo no mapa abaixo.
                          </span>
                        </span>
                        <ArrowRight size={16} className="flex-shrink-0 text-brand/50 transition-colors group-hover:text-brand" />
                      </a>
                    )}

                    {/* 2. Comparar com recibos verdes */}
                    <Link
                      href="/dashboard/comparar"
                      className="group flex items-center gap-3 rounded-2xl border-2 border-brand/40 bg-white p-4 text-left transition-all hover:border-brand hover:shadow-card dark:border-brand/20 dark:bg-stone-900"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                        <Scale size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                          Comparar com recibos verdes
                        </span>
                        <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                          Ponto de viragem, mapa por região, custo de contabilista e
                          calendário fiscal lado a lado.
                        </span>
                      </span>
                      <ArrowRight size={16} className="flex-shrink-0 text-stone-300 transition-colors group-hover:text-brand" />
                    </Link>

                    {/* 3. Simulador completo */}
                    {onIrParaSimuladorCompleto && (
                      <button
                        type="button"
                        onClick={onIrParaSimuladorCompleto}
                        className="group flex w-full items-center gap-3 rounded-2xl border-2 border-stone-100 bg-white p-4 text-left transition-all hover:border-stone-200 hover:shadow-card dark:border-stone-800 dark:bg-stone-900"
                      >
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800">
                          <Target size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                            Simulador completo
                          </span>
                          <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                            DLRR, SIFIDE, IMI/IMT, tributação autónoma
                            detalhada e mais benefícios fiscais.
                          </span>
                        </span>
                        <ArrowRight size={16} className="flex-shrink-0 text-stone-300 transition-colors group-hover:text-brand" />
                      </button>
                    )}

                    {/* 4. Encontrar contabilista */}
                    <Link
                      href="/ferramentas/mapa-contabilistas"
                      className="group flex w-full items-center gap-3 rounded-2xl border-2 border-stone-100 bg-white p-4 text-left transition-all hover:border-stone-200 hover:shadow-card dark:border-stone-800 dark:bg-stone-900"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800">
                        <Briefcase size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                          Encontrar contabilista na tua zona
                        </span>
                        <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                          Toda a empresa precisa de TOC inscrito na OCC.
                          Vê o mapa de preços por região.
                        </span>
                      </span>
                      <ArrowRight size={16} className="flex-shrink-0 text-stone-300 transition-colors group-hover:text-brand" />
                    </Link>
                  </div>

                  {/* ── Checklist rápida ──────────────────────────────────── */}
                  {jaTemEmpresa === "nao" && (
                    <div className="mt-6">
                      <Collapsible title="Checklist — como abrir a empresa" defaultOpen>
                        <div className="space-y-2.5">
                          {[
                            ...(perfilFundador !== "residente" ? [
                              { Icon: Globe, titulo: "Obter NIF português", desc: "Estrangeiros devem obter o Número de Identificação Fiscal (NIF) na AT ou num consulado." },
                              ...(perfilFundador === "estrangeiro_extra_ue" ? [
                                { Icon: Plane, titulo: "Nomear representante fiscal", desc: `Obrigatório para residentes fora da UE/EEE (Art. 19.º LGT). Custo estimado: ${fmt(CUSTO_REPRESENTANTE_FISCAL_DEFAULT)}/mês.` },
                              ] : []),
                            ] : []),
                            { Icon: FileSign, titulo: "Escolher firma e CAE", desc: "Reservar o nome online no Portal da Empresa e definir o código CAE da atividade." },
                            { Icon: Building, titulo: "Empresa na Hora (balcão ou online)", desc: "Constituir a sociedade num balcão do IRN (<1h) ou online (1–2 dias úteis). Custo: ~360–400€." },
                            { Icon: Shield, titulo: "Abrir conta bancária da empresa", desc: "Depositar o capital social (mínimo 1€ para Unipessoal, 2€ para Quotas) e abrir a conta em nome da sociedade." },
                            { Icon: Rocket, titulo: "Início de atividade nas Finanças", desc: "Declaração de início de atividade no Portal das Finanças: regime de IVA (geralmente trimestral), CAE e sede." },
                            { Icon: Calendar, titulo: "Inscrever na Segurança Social", desc: "Inscrever a empresa e o gerente como MOE (membro de órgão estatutário). SS patronal: 23,75%, gerente: 11%." },
                            { Icon: Briefcase, titulo: "Contratar contabilista certificado (TOC)", desc: "Obrigatório ter um TOC inscrito na OCC. Custo médio: ~200€/mês. Trata da contabilidade organizada, IRC, IES e IVA." },
                            ...(aplicarIFICI ? [
                              { Icon: Sparkle, titulo: "Requerer estatuto IFICI na AT", desc: "Inscrição no regime IFICI (Art. 58.º-A EBF) junto da AT. Taxa IRS flat 20% durante 10 anos. Requer atividade elegível." },
                            ] : []),
                          ].map((step, i) => (
                            <div
                              key={step.titulo}
                              className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-white p-3.5 dark:border-stone-800 dark:bg-stone-900"
                            >
                              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white text-[10px] font-bold">{i + 1}</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <step.Icon size={13} className="flex-shrink-0 text-brand" />
                                  <span className="text-xs font-bold text-stone-700 dark:text-stone-200">{step.titulo}</span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">{step.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Collapsible>
                    </div>
                  )}

                  {/* ── Obrigações fiscais ────────────────────────────────── */}
                  <div className="mt-4">
                    <Collapsible title="Calendário de obrigações fiscais" defaultOpen={false}>
                      <div className="space-y-2">
                        {[
                          { quando: "Mensal (até dia 20)", obrigacoes: ["SS gerente + empresa", "Retenção IRS s/ salário", ...(faturacaoAnual >= 650_000 ? ["IVA mensal (Mod. Periódica)"] : [])] },
                          ...(faturacaoAnual < 650_000 ? [{ quando: "Trimestral (Jan, Abr, Jul, Out)", obrigacoes: ["IVA trimestral (Mod. Periódica)"] }] : []),
                          { quando: "Jul + Set + Dez (15 de cada mês)", obrigacoes: ["Pagamento por conta (PPC) — 3 prestações de IRC adiantado"] },
                          { quando: "Maio (até dia 31)", obrigacoes: ["Modelo 22 (declaração anual de IRC)"] },
                          { quando: "Jun–Jul", obrigacoes: ["IES — Informação Empresarial Simplificada"] },
                          { quando: "Anual (novembro)", obrigacoes: ["IMI (se aplicável, em 1-3 prestações)"] },
                        ].map((item) => (
                          <div key={item.quando} className="flex items-start gap-3 py-2">
                            <Calendar size={14} className="mt-0.5 flex-shrink-0 text-brand" />
                            <div>
                              <div className="text-xs font-bold text-stone-700 dark:text-stone-200">{item.quando}</div>
                              {item.obrigacoes.map((o) => (<div key={o} className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">{o}</div>))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Collapsible>
                  </div>

                  {/* ── Benefícios e vantagens fiscais ────────────────────── */}
                  <div className="mt-4">
                    <Collapsible title="Benefícios fiscais disponíveis para empresas" defaultOpen={false}>
                      <div className="space-y-2">
                        {[
                          { titulo: "IRC PME 15% nos primeiros 50.000€", desc: "Taxa reduzida para micro/PME. O restante a 19%.", badge: "Nacional", lei: "Art. 87.º CIRC", url: LEI.art87circ },
                          { titulo: "IRC 12,5% nos territórios do interior", desc: "PME com direção efetiva em concelho do interior. Acumula com PME.", badge: "Interior", lei: "Art. 41.º-B EBF", url: LEI.art41bEBF },
                          { titulo: "RFAI — 10% a 30% do investimento", desc: "Crédito de IRC sobre equipamentos e ativos. 30% fora de Lisboa/Algarve, 10% litoral.", badge: "Nacional", lei: "Art. 22.º–26.º CFI", url: LEI.cfi },
                          { titulo: "DLRR — 10% dos lucros reinvestidos", desc: "Dedução de 10% dos lucros retidos e reinvestidos em ativos elegíveis.", badge: "PME", lei: "Art. 27.º–34.º CFI", url: LEI.cfi },
                          { titulo: "SIFIDE II — até 82,5% de I&D", desc: "32,5% (base) + 50% incremental das despesas de investigação e desenvolvimento.", badge: "I&D", lei: "Art. 35.º–42.º CFI", url: LEI.cfi },
                          { titulo: "Zona Franca da Madeira — IRC 5%", desc: "Empresas licenciadas no CINM até 2033. Requer criação de emprego e investimento mínimo de 75.000€.", badge: "Madeira" },
                          ...(aplicarIFICI ? [{ titulo: `IFICI — IRS ${pct(IFICI_TAXA_FLAT)} flat (${IFICI_PRAZO_ANOS.value} anos)`, desc: "Incentivo fiscal para investigação científica e inovação. Taxa flat de 20% sobre rendimentos e dividendos de fonte portuguesa.", badge: "Estrangeiro", lei: "Art. 58.º-A EBF", url: LEI.art58aEBF }] : []),
                        ].map((b) => (
                          <div key={b.titulo} className="flex items-start gap-2.5 rounded-xl border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-950">
                            <Check size={14} className="mt-0.5 flex-shrink-0 text-brand" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-bold text-stone-700 dark:text-stone-200">{b.titulo}</span>
                                <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">{b.badge}</span>
                                {"lei" in b && b.lei && "url" in b && b.url && <LeiRef artigo={b.lei as string} url={b.url as string} />}
                              </div>
                              <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">{b.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Collapsible>
                  </div>

                  {/* ── Mapa de regiões (só para quem está a avaliar) ─────── */}
                  {jaTemEmpresa === "nao" && (
                    <div id="mapa-regioes-empresa" className="mt-8 scroll-mt-6">
                      <div className="mb-4">
                        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-light/60 px-3 py-1 text-xs font-semibold text-brand-dark">
                          <MapPin size={12} />
                          Mapa interativo
                        </span>
                        <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
                          Onde vale a pena instalar a empresa
                        </h3>
                        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                          Benefícios fiscais por região: IRC reduzido no interior,
                          RFAI, derrama municipal, IVA nas ilhas e custo de contabilista.
                          Toca numa região ou procura a tua zona.
                        </p>
                      </div>
                      <ErrorBoundary etiqueta="o mapa de benefícios por região">
                        <MapaBeneficiosRegioes />
                      </ErrorBoundary>
                    </div>
                  )}

                  {/* ── Nota final ────────────────────────────────────────── */}
                  <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50">
                    <Sparkle size={14} className="mt-0.5 flex-shrink-0 text-brand" />
                    <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                      <strong className="text-stone-600 dark:text-stone-300">Estimativa com taxas oficiais de 2026.</strong>{" "}
                      Baseada no CIRC (<LeiRef artigo="Art. 87.º–88.º" url={LEI.art87circ} />),
                      CIRS (<LeiRef artigo="Art. 71.º" url={LEI.art71cirs} />) e
                      CFI (<LeiRef artigo="DL 162/2014" url={LEI.cfi} />).
                      Não substitui o aconselhamento de um Contabilista Certificado
                      (OCC).
                    </p>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={recuar}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-400"
                    >
                      <ArrowLeft size={14} /> Voltar ao resultado
                    </button>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Painel lateral (live preview) ──────────────────────────────── */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky top-6 space-y-4">
              <PainelResumoEmpresa resultado={resultado} distribuirDividendos={distribuirDividendos} />
            </div>
          </div>
        </div>

        {/* Painel mobile (abaixo do wizard em mobile) */}
        <div className="mt-6 lg:hidden">
          <PainelResumoEmpresa resultado={resultado} distribuirDividendos={distribuirDividendos} />
        </div>
      </div>
    </div>
  );
}

// ─── Painel de resumo ao vivo ────────────────────────────────────────────────

function PainelResumoEmpresa({
  resultado,
  distribuirDividendos,
}: {
  resultado: ResultadoEmpresaGuiado;
  distribuirDividendos: boolean;
}) {
  if (resultado.faturacao <= 0) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6 text-center dark:border-stone-800 dark:bg-stone-900">
        <Building size={24} className="mx-auto mb-2 text-stone-300 dark:text-stone-600" />
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Insere a faturação para ver o resultado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-3xl border border-brand bg-brand p-5 text-white shadow-glow">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-green-100/60">
            Líquido para o dono · {distribuirDividendos ? "com dividendos" : "só salário"}
          </div>
          <div className="mt-1 font-display text-3xl font-semibold leading-none tabular-nums">
            <AnimatedNumber value={resultado.liquidoGerente} />
          </div>
          <div className="mt-0.5 text-[11px] text-green-100/50">
            ~<AnimatedNumber value={Math.round(resultado.liquidoGerente / 12)} />/mês
          </div>
          {resultado.faturacao > 0 && (
            <div className="mt-3">
              <div className="flex h-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="rounded-full bg-white/70 transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (resultado.liquidoGerente /
                        Math.max(1, resultado.faturacao)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-[10px] text-green-100/40">
                {Math.round(
                  (resultado.liquidoGerente /
                    Math.max(1, resultado.faturacao)) *
                    100,
                )}
                % de {fmt(resultado.faturacao)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mini breakdown */}
      <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-900">
        <div className="space-y-1.5">
          {[
            { label: "Custos + SS gerente", val: -(resultado.totalCustos), cor: "text-stone-500" },
            { label: "IRC + derrama", val: -(resultado.ircAposBeneficios + resultado.derrama), cor: "text-red-500 dark:text-red-400" },
            ...(resultado.ta.total > 0 ? [{ label: "Trib. Autónoma", val: -(resultado.ta.total), cor: "text-amber-500" }] : []),
            ...(resultado.beneficios.total > 0 ? [{ label: "Benefícios fiscais", val: resultado.beneficios.total, cor: "text-emerald-500" }] : []),
            ...(distribuirDividendos && resultado.irsDividendos > 0 ? [{ label: "IRS dividendos", val: -(resultado.irsDividendos), cor: "text-red-400" }] : []),
            { label: "Líquido", val: resultado.liquidoGerente, cor: "text-brand font-bold", sep: true },
          ].map(({ label, val, cor, sep }) => (
            <div
              key={label}
              className={`flex items-center justify-between ${
                sep ? "border-t border-stone-100 pt-1.5 dark:border-stone-800" : ""
              }`}
            >
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                {label}
              </span>
              <span className={`text-[11px] tabular-nums ${cor}`}>
                {val < 0 ? "−" : ""}
                {fmt(Math.abs(val))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dica contextual */}
      <div className="rounded-2xl border border-brand/15 bg-brand-light/20 p-3.5">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-brand-dark/60">
          Dica
        </p>
        <p className="text-[11px] font-semibold text-brand-dark dark:text-brand leading-relaxed">
          {resultado.taxaEfetiva > 0.45
            ? "A carga fiscal é elevada. Considera aumentar despesas operacionais dedutíveis ou o salário do gerente para reduzir o lucro tributável."
            : resultado.coleta > 7_500
              ? "Com esta coleta, benefícios fiscais como RFAI ou SIFIDE poderiam ter impacto significativo. Usa o simulador completo para os testar."
              : "A taxa efetiva está dentro do normal para uma PME. Lembra-te que a contabilidade organizada permite deduzir todas as despesas reais da atividade."}
        </p>
      </div>
    </div>
  );
}
