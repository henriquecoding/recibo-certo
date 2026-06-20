"use client";

import { useState, useMemo } from "react";
import { m, AnimatePresence } from "motion/react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import InfoTip from "@/components/ui/InfoTip";
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
} from "@/components/ui/Icons";
import { pct, fmt } from "@/lib/format";
import {
  ESCALOES_IRS,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  DERRAMA_MAX,
  DIVIDENDOS_TAXA,
} from "@/lib/fiscal-data";

// ─── Constantes fiscais 2026 ─────────────────────────────────────────────────

const IRC_PME = {
  taxa1: IRC_TAXA_PME.value,
  limite: IRC_LIMITE_PME.value,
  taxa2: IRC_TAXA_GERAL.value,
};
const DERRAMA_MUNI = DERRAMA_MAX.value;
const IRS_DIVIDENDOS = DIVIDENDOS_TAXA.value;
const DIV_INCLUSAO_ENGLOBAMENTO = 0.5;
const SS_EMP_TAXA = 0.2375;
const SS_TRAB_TAXA = 0.11;
const CUSTO_CONTABILIDADE_ANUAL = 2_400;
const CUSTO_SOFTWARE_ANUAL = 300;
const CUSTO_CONSTITUICAO_DEFAULT = 360;
const SMN_2026 = 870;

type Passo = 0 | 1 | 2 | 3 | "resultado";

type TipoSociedade = "unipessoal" | "quotas";

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
  derrama: number;
  ircTotal: number;
  lucroLiquido: number;
  dividendos: number;
  irsDividendos: number;
  liquidoGerente: number;
  taxaEfetiva: number;
}

function simularEmpresaGuiado(
  faturacao: number,
  despesasOper: number,
  custosEstrutura: number,
  salGerenteMensal: number,
  distribuirDividendos: boolean,
  opcaoEnglobamento: boolean,
  incluirConstituicao: boolean,
): ResultadoEmpresaGuiado {
  const salGerente = salGerenteMensal * 14;
  const ssSalGerente = salGerenteMensal * 12 * (SS_EMP_TAXA + SS_TRAB_TAXA);
  const custoConstituicao = incluirConstituicao
    ? Math.round(CUSTO_CONSTITUICAO_DEFAULT / 3)
    : 0;
  const totalCustos =
    despesasOper + custosEstrutura + salGerente + ssSalGerente + custoConstituicao;
  const lucroTributavel = Math.max(0, faturacao - totalCustos);

  let coleta = 0;
  if (lucroTributavel <= IRC_PME.limite) {
    coleta = lucroTributavel * IRC_PME.taxa1;
  } else {
    coleta =
      IRC_PME.limite * IRC_PME.taxa1 +
      (lucroTributavel - IRC_PME.limite) * IRC_PME.taxa2;
  }

  const derrama = lucroTributavel * DERRAMA_MUNI;
  const ircTotal = coleta + derrama;
  const lucroLiquido = Math.max(0, lucroTributavel - ircTotal);

  let dividendos = 0;
  let irsDividendos = 0;

  if (distribuirDividendos && lucroLiquido > 0) {
    dividendos = lucroLiquido;
    if (opcaoEnglobamento) {
      const salarioTrib = salGerenteMensal * 12 * (1 - SS_TRAB_TAXA);
      const irsComDiv = calcularIRS(
        salarioTrib + dividendos * DIV_INCLUSAO_ENGLOBAMENTO,
      );
      const irsSoSal = calcularIRS(salarioTrib);
      irsDividendos = Math.max(0, irsComDiv - irsSoSal);
    } else {
      irsDividendos = dividendos * IRS_DIVIDENDOS;
    }
  }

  const salarioLiq = salGerenteMensal * 12 * (1 - SS_TRAB_TAXA);
  const liquidoGerente = salarioLiq + (dividendos - irsDividendos);

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
    derrama,
    ircTotal,
    lucroLiquido,
    dividendos,
    irsDividendos,
    liquidoGerente,
    taxaEfetiva: faturacao > 0 ? 1 - liquidoGerente / faturacao : 0,
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

// ─── Componente auxiliar: Slider simples ─────────────────────────────────────

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  presets,
  suffix = "",
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  presets?: number[];
  suffix?: string;
  tooltip?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
          {label}
        </span>
        {tooltip && <InfoTip>{tooltip}</InfoTip>}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-brand"
        />
        <span className="min-w-[72px] text-right text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">
          {fmt(value)}{suffix}
        </span>
      </div>
      {presets && presets.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-all ${
                value === p
                  ? "bg-brand text-white"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
              }`}
            >
              {fmt(p)}
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

  // Passo 1: tipo de empresa
  const [tipoSociedade, setTipoSociedade] =
    useState<TipoSociedade>("unipessoal");
  const [tipoSelecionado, setTipoSelecionado] = useState(false);

  // Passo 2: faturação e custos
  const [faturacaoAnual, setFaturacaoAnual] = useState(60_000);
  const [despesasOper, setDespesasOper] = useState(2_000);
  const [salGerenteMensal, setSalGerenteMensal] = useState(SMN_2026);
  const [incluirConstituicao, setIncluirConstituicao] = useState(true);

  // Passo 3: dividendos e otimização
  const [distribuirDividendos, setDistribuirDividendos] = useState(true);
  const [opcaoEnglobamento, setOpcaoEnglobamento] = useState(false);

  // Custos de estrutura calculados
  const custosEstrutura = CUSTO_CONTABILIDADE_ANUAL + CUSTO_SOFTWARE_ANUAL;

  // Simulação
  const resultado = useMemo(
    () =>
      simularEmpresaGuiado(
        faturacaoAnual,
        despesasOper,
        custosEstrutura,
        salGerenteMensal,
        distribuirDividendos,
        opcaoEnglobamento,
        incluirConstituicao,
      ),
    [
      faturacaoAnual,
      despesasOper,
      custosEstrutura,
      salGerenteMensal,
      distribuirDividendos,
      opcaoEnglobamento,
      incluirConstituicao,
    ],
  );

  // Englobamento mais favorável?
  const resultLib = useMemo(
    () =>
      simularEmpresaGuiado(
        faturacaoAnual,
        despesasOper,
        custosEstrutura,
        salGerenteMensal,
        true,
        false,
        incluirConstituicao,
      ),
    [faturacaoAnual, despesasOper, custosEstrutura, salGerenteMensal, incluirConstituicao],
  );
  const resultEng = useMemo(
    () =>
      simularEmpresaGuiado(
        faturacaoAnual,
        despesasOper,
        custosEstrutura,
        salGerenteMensal,
        true,
        true,
        incluirConstituicao,
      ),
    [faturacaoAnual, despesasOper, custosEstrutura, salGerenteMensal, incluirConstituicao],
  );
  const englobamentoMelhor =
    resultEng.liquidoGerente > resultLib.liquidoGerente;
  const poupancaEnglobamento = Math.abs(
    resultEng.liquidoGerente - resultLib.liquidoGerente,
  );

  function avancar() {
    if (passo === 1) setPasso(2);
    else if (passo === 2) setPasso(3);
    else if (passo === 3) setPasso("resultado");
  }

  function recuar() {
    if (passo === 1) setPasso(0);
    else if (passo === 2) setPasso(1);
    else if (passo === 3) setPasso(2);
    else if (passo === "resultado") setPasso(3);
  }

  const progressLabels = ["Empresa", "Receita e custos", "Dividendos", "Resultado"];
  const passoNum = passo === "resultado" ? 4 : passo;

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
                    },
                    {
                      titulo: "Capital social mínimo: 1€",
                      desc: "Desde 2011 não é necessário um capital elevado. 1€ para Unipessoal, 2€ para Sociedade por Quotas (1€/sócio).",
                    },
                    {
                      titulo: "Contabilidade obrigatória",
                      desc: "Toda a sociedade tem de ter contabilidade organizada com TOC inscrito na OCC. Custo médio: ~200€/mês.",
                    },
                    {
                      titulo: "Responsabilidade limitada",
                      desc: "O teu património pessoal fica separado do empresarial. Dívidas da empresa não recaem sobre bens pessoais (salvo fraude).",
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
                    Tudo é dedutível ao lucro tributável (paga IRC só sobre o que sobra).
                  </p>

                  <div className="space-y-5">
                    <SliderInput
                      label="Faturação anual (€)"
                      value={faturacaoAnual}
                      min={0}
                      max={300_000}
                      step={5_000}
                      onChange={setFaturacaoAnual}
                      presets={[30_000, 60_000, 100_000, 150_000]}
                      tooltip={
                        <>Volume de negócios anual previsto (sem IVA).</>
                      }
                    />

                    <SliderInput
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

                    <SliderInput
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
                          Custo dedutível ao IRC. 14 meses (inclui subsídios).
                        </>
                      }
                    />

                    {/* Custos fixos (informativos) */}
                    <Collapsible title="Custos fixos obrigatórios" defaultOpen>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500 dark:text-stone-400">
                            Contabilidade (TOC inscrito OCC)
                          </span>
                          <span className="font-semibold text-stone-700 dark:text-stone-200 tabular-nums">
                            ~{fmt(CUSTO_CONTABILIDADE_ANUAL)}/ano
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500 dark:text-stone-400">
                            Software de faturação
                          </span>
                          <span className="font-semibold text-stone-700 dark:text-stone-200 tabular-nums">
                            ~{fmt(CUSTO_SOFTWARE_ANUAL)}/ano
                          </span>
                        </div>
                        {incluirConstituicao && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500 dark:text-stone-400">
                              Constituição (Empresa na Hora)
                            </span>
                            <span className="font-semibold text-stone-700 dark:text-stone-200 tabular-nums">
                              ~{fmt(CUSTO_CONSTITUICAO_DEFAULT)} (amort. 3 anos)
                            </span>
                          </div>
                        )}
                        <div className="border-t border-stone-100 dark:border-stone-800 pt-2 flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-600 dark:text-stone-300">
                            Total estrutura/ano
                          </span>
                          <span className="font-bold text-stone-800 dark:text-stone-100 tabular-nums">
                            {fmt(custosEstrutura + (incluirConstituicao ? Math.round(CUSTO_CONSTITUICAO_DEFAULT / 3) : 0))}
                          </span>
                        </div>
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
                    dividendos — mas há um IRS adicional. Podes escolher entre
                    taxa liberatória (28%) ou englobamento (50% no rendimento).
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
                    {distribuirDividendos && (
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
                      : "Sociedade por Quotas"}{" "}
                    com faturação de {fmt(faturacaoAnual)}/ano.
                  </p>

                  {/* Breakdown cascata */}
                  <div className="space-y-1.5">
                    {[
                      {
                        label: "Faturação anual",
                        value: resultado.faturacao,
                        cor: "text-stone-700 dark:text-stone-200",
                      },
                      resultado.despesasOper > 0
                        ? {
                            label: "Despesas operacionais",
                            value: -resultado.despesasOper,
                            cor: "text-stone-500",
                          }
                        : null,
                      {
                        label: "Custos estrutura (contabilidade, software)",
                        value: -resultado.custosEstrutura,
                        cor: "text-stone-500",
                      },
                      resultado.custoConstituicao > 0
                        ? {
                            label: "Constituição (amortizada 3 anos)",
                            value: -resultado.custoConstituicao,
                            cor: "text-stone-500",
                          }
                        : null,
                      resultado.salGerente > 0
                        ? {
                            label: `Salário gerente (${fmt(salGerenteMensal)}/mês × 14)`,
                            value: -resultado.salGerente,
                            cor: "text-stone-500",
                          }
                        : null,
                      resultado.ssSalGerente > 0
                        ? {
                            label: "SS empresa + trabalhador (34,75%)",
                            value: -resultado.ssSalGerente,
                            cor: "text-amber-600 dark:text-amber-400",
                          }
                        : null,
                      {
                        label: "Lucro tributável",
                        value: resultado.lucroTributavel,
                        cor: "text-stone-700 dark:text-stone-200 font-semibold",
                        sep: true,
                      },
                      {
                        label: `IRC (PME ${pct(IRC_PME.taxa1)}/${fmt(IRC_PME.limite)} + ${pct(IRC_PME.taxa2)})`,
                        value: -resultado.coleta,
                        cor: "text-red-500 dark:text-red-400",
                      },
                      {
                        label: `Derrama municipal (~${pct(DERRAMA_MUNI)})`,
                        value: -resultado.derrama,
                        cor: "text-red-400",
                      },
                      {
                        label: "Lucro líquido (disponível)",
                        value: resultado.lucroLiquido,
                        cor: "text-stone-700 dark:text-stone-200 font-semibold",
                        sep: true,
                      },
                      distribuirDividendos
                        ? {
                            label: opcaoEnglobamento
                              ? `IRS dividendos (englobamento 50% × taxa marginal)`
                              : "IRS dividendos (28% taxa liberatória)",
                            value: -resultado.irsDividendos,
                            cor: "text-red-500 dark:text-red-400",
                          }
                        : null,
                    ]
                      .filter(Boolean)
                      .map((item) => {
                        const i = item!;
                        return (
                          <div
                            key={i.label}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                              i.sep
                                ? "border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 mt-1"
                                : ""
                            }`}
                          >
                            <span className="text-[11px] text-stone-500 dark:text-stone-400">
                              {i.label}
                            </span>
                            <span
                              className={`text-[11px] tabular-nums ${i.cor}`}
                            >
                              {i.value < 0 ? "−" : ""}
                              {fmt(Math.abs(i.value))}
                            </span>
                          </div>
                        );
                      })}

                    {/* Total líquido para o dono */}
                    <div className="mt-3 rounded-3xl border-2 border-brand bg-white p-5 shadow-card dark:bg-stone-950">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                            Líquido para o dono
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            {distribuirDividendos
                              ? "Salário líquido + dividendos líquidos"
                              : "Apenas salário líquido (lucro retido)"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-2xl font-semibold text-brand tabular-nums">
                            <AnimatedNumber value={resultado.liquidoGerente} />
                          </div>
                          <div className="text-xs text-stone-400">
                            ~{fmt(Math.round(resultado.liquidoGerente / 12))}/mês
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calendário fiscal resumo */}
                  <Collapsible title="Obrigações fiscais da empresa" defaultOpen={false}>
                    <div className="space-y-2">
                      {[
                        {
                          quando: "Mensal (até dia 20)",
                          obrigacoes: [
                            "SS gerente + empresa",
                            "Retenção IRS s/ salário",
                            ...(faturacaoAnual >= 650_000
                              ? ["IVA mensal (Mod. Periódica)"]
                              : []),
                          ],
                        },
                        ...(faturacaoAnual < 650_000
                          ? [
                              {
                                quando: "Trimestral (Jan, Abr, Jul, Out)",
                                obrigacoes: ["IVA trimestral (Mod. Periódica)"],
                              },
                            ]
                          : []),
                        {
                          quando: "Jul + Set + Dez (15 de cada mês)",
                          obrigacoes: [
                            "Pagamento por conta (PPC) — 3 prestações de IRC adiantado",
                          ],
                        },
                        {
                          quando: "Maio (até dia 31)",
                          obrigacoes: ["Modelo 22 (declaração anual de IRC)"],
                        },
                        {
                          quando: "Jun–Jul",
                          obrigacoes: [
                            "IES — Informação Empresarial Simplificada",
                          ],
                        },
                        {
                          quando: "Anual (novembro)",
                          obrigacoes: ["IMI (se aplicável, em 1-3 prestações)"],
                        },
                      ].map((item) => (
                        <div
                          key={item.quando}
                          className="flex items-start gap-3 py-2"
                        >
                          <Calendar
                            size={14}
                            className="mt-0.5 flex-shrink-0 text-brand"
                          />
                          <div>
                            <div className="text-xs font-bold text-stone-700 dark:text-stone-200">
                              {item.quando}
                            </div>
                            {item.obrigacoes.map((o) => (
                              <div
                                key={o}
                                className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed"
                              >
                                {o}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Collapsible>

                  {/* Como abrir */}
                  {jaTemEmpresa === "nao" && (
                    <Collapsible title="Como abrir a empresa (passo a passo)" defaultOpen={false}>
                      <div className="space-y-3">
                        {[
                          {
                            num: 1,
                            titulo: "Escolher firma e CAE",
                            desc: "Escolhe o nome (firma) e o código CAE que define a atividade. Podes reservar o nome online no Portal da Empresa.",
                          },
                          {
                            num: 2,
                            titulo: "Empresa na Hora (balcão ou online)",
                            desc: "Num balcão do IRN constituis a sociedade em menos de 1 hora: pacto social, registo e NIF empresarial ficam prontos. Online demora 1–2 dias úteis. Custo: ~360€.",
                          },
                          {
                            num: 3,
                            titulo: "Abrir conta bancária da empresa",
                            desc: "Depositar o capital social (mínimo 1€) e abrir a conta bancária em nome da sociedade.",
                          },
                          {
                            num: 4,
                            titulo: "Início de atividade nas Finanças",
                            desc: "Entregar a declaração de início de atividade no Portal das Finanças com o regime de IVA (geralmente trimestral) e o CAE.",
                          },
                          {
                            num: 5,
                            titulo: "Inscrever na Segurança Social",
                            desc: "Inscrever a empresa e o gerente como MOE (membro de órgão estatutário). SS patronal: 23,75%, gerente: 11%.",
                          },
                          {
                            num: 6,
                            titulo: "Contratar contabilista (TOC)",
                            desc: "Obrigatório ter um TOC inscrito na OCC para manter a contabilidade organizada. Custo: ~200€/mês.",
                          },
                        ].map((step) => (
                          <div key={step.num} className="flex gap-3">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold">
                              {step.num}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-stone-700 dark:text-stone-200">
                                {step.titulo}
                              </div>
                              <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                                {step.desc}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Collapsible>
                  )}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={recuar}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-400"
                    >
                      <ArrowLeft size={14} /> Ajustar valores
                    </button>
                    {onIrParaSimuladorCompleto && (
                      <button
                        type="button"
                        onClick={onIrParaSimuladorCompleto}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-dark"
                      >
                        Simulador completo (TA, RFAI, SIFIDE)
                        <ArrowRight size={14} />
                      </button>
                    )}
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
            {
              label: "Custos + SS gerente",
              val: -(resultado.totalCustos),
              cor: "text-stone-500",
            },
            {
              label: "IRC + derrama",
              val: -(resultado.ircTotal),
              cor: "text-red-500 dark:text-red-400",
            },
            ...(distribuirDividendos && resultado.irsDividendos > 0
              ? [
                  {
                    label: "IRS dividendos",
                    val: -(resultado.irsDividendos),
                    cor: "text-red-400",
                  },
                ]
              : []),
            {
              label: "Líquido",
              val: resultado.liquidoGerente,
              cor: "text-brand font-bold",
              sep: true,
            },
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
