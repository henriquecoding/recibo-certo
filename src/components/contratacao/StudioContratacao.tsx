"use client";

import type {
  EmploymentOfferResult,
  PlannerGoal,
  ReleaseStatus,
} from "../../../ReciboCerto-Fiscal-Engine/src";
import { fmt } from "@/lib/format";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calculator,
  Check,
  Gauge,
  Gift,
  Lock,
  ShieldCheck,
  Target,
  Wallet,
  Warning,
} from "@/components/ui/Icons";
import {
  META_CUSTOS,
  MESES,
  eur,
  type PlannerState,
} from "./estado";

export const ETAPAS_CONTRATACAO = [
  {
    id: "objetivo",
    label: "Objetivo",
    title: "A decisão",
    description: "O ponto de partida da conta.",
    Icon: Target,
  },
  {
    id: "posto",
    label: "Posto",
    title: "O vínculo",
    description: "Datas, tempo e enquadramento.",
    Icon: Briefcase,
  },
  {
    id: "pacote",
    label: "Pacote",
    title: "A proposta",
    description: "Remuneração e benefícios.",
    Icon: Gift,
  },
  {
    id: "custos",
    label: "Custos",
    title: "O posto inteiro",
    description: "Cada parcela com o seu estado.",
    Icon: Wallet,
  },
  {
    id: "capacidade",
    label: "Capacidade",
    title: "O que tem de gerar",
    description: "Tempo, receita e folga.",
    Icon: Gauge,
  },
  {
    id: "revisao",
    label: "Revisão",
    title: "Privacidade e cálculo",
    description: "Confirma o que entra na projeção.",
    Icon: ShieldCheck,
  },
] as const;

const RELEASE: Record<
  ReleaseStatus,
  { label: string; className: string; Icon: typeof ShieldCheck }
> = {
  approved: {
    label: "Release aprovado",
    className: "border-brand/25 bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint",
    Icon: ShieldCheck,
  },
  reviewed: {
    label: "Release em revisão",
    className: "border-alert-border bg-alert-bg text-alert-text",
    Icon: Warning,
  },
  draft: {
    label: "Release em rascunho",
    className: "border-alert-border bg-alert-bg text-alert-text",
    Icon: Warning,
  },
  retired: {
    label: "Release retirado",
    className: "border-alert-border bg-alert-bg text-alert-text",
    Icon: Warning,
  },
};

const META_OBJETIVO: Record<PlannerGoal, { label: string; valueLabel: string }> = {
  employer_budget: { label: "Cabe no orçamento", valueLabel: "Orçamento anual" },
  target_net: { label: "Garantir um líquido", valueLabel: "Líquido pretendido" },
  known_offer: { label: "Avaliar uma proposta", valueLabel: "Vencimento base" },
  required_capacity: { label: "Pagar o próprio posto", valueLabel: "Vencimento base" },
};

const REGIAO: Record<PlannerState["jurisdiction"], string> = {
  "PT-CONTINENTE": "Continente",
  "PT-MADEIRA": "Madeira",
  "PT-ACORES": "Açores",
};

const CONTRATO: Record<PlannerState["contractKind"], string> = {
  permanent: "Sem termo",
  fixed_term: "A termo",
  unknown: "Contrato por decidir",
};

function valorDePartida(state: PlannerState): number {
  if (state.goal === "employer_budget") return state.annualBudget;
  if (state.goal === "target_net") return state.targetNet;
  return state.baseSalary;
}

function custosDoEstado(state: PlannerState) {
  let conhecidos = 0;
  let porConfirmar = 0;
  let fora = 0;
  let bloqueios = 0;

  for (const meta of META_CUSTOS) {
    const campo = state.custos[meta.id];
    if (campo.estado === "confirmado" || campo.estado === "estimado" || campo.estado === "intervalo") {
      conhecidos += 1;
    } else if (campo.estado === "nao_aplicavel") {
      fora += 1;
    } else {
      porConfirmar += 1;
    }

    if (
      meta.obrigatorio
      && (campo.estado === "nao_sei"
        || campo.estado === "nao_aplicavel"
        || (campo.estado === "confirmado" && campo.valor <= 0))
    ) {
      bloqueios += 1;
    }
  }

  return { conhecidos, porConfirmar, fora, bloqueios };
}

function liquidoDoResultado(result: EmploymentOfferResult): string {
  const worker = result.workerOutcome;
  return worker.kind === "personalized_projection"
    ? eur(worker.monthlyReference.cents)
    : `${eur(worker.monthlyReference.min.cents)} – ${eur(worker.monthlyReference.max.cents)}`;
}

export function NavegacaoEtapas({
  ativa,
  visitadas,
  onSelect,
}: {
  ativa: number;
  visitadas: ReadonlySet<number>;
  onSelect: (index: number) => void;
}) {
  const progresso = ((ativa + 1) / ETAPAS_CONTRATACAO.length) * 100;

  const navegarComTeclado = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const ultimo = ETAPAS_CONTRATACAO.length - 1;
    let destino: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") destino = index === ultimo ? 0 : index + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") destino = index === 0 ? ultimo : index - 1;
    if (event.key === "Home") destino = 0;
    if (event.key === "End") destino = ultimo;
    if (destino === null) return;

    event.preventDefault();
    onSelect(destino);
    document.getElementById(`tab-etapa-contratacao-${ETAPAS_CONTRATACAO[destino].id}`)?.focus();
  };

  return (
    <nav
      aria-label="Percurso da contratação"
      className="rounded-4xl border border-stone-100 bg-white p-2 shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <div
        role="tablist"
        aria-label="Etapas do planeador"
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
      >
        {ETAPAS_CONTRATACAO.map((etapa, index) => {
          const active = index === ativa;
          const visited = visitadas.has(index) && !active;
          const Icon = etapa.Icon;
          return (
            <button
              key={etapa.id}
              id={`tab-etapa-contratacao-${etapa.id}`}
              type="button"
              role="tab"
              aria-label={etapa.label}
              aria-selected={active}
              aria-controls={`etapa-contratacao-${etapa.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => navegarComTeclado(event, index)}
              className={`group min-h-[70px] min-w-[138px] flex-1 snap-start rounded-3xl px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                active
                  ? "bg-brand-deep text-white shadow-card"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-xl ${
                  active
                    ? "bg-white/15 text-brand-mint"
                    : visited
                      ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                }`}>
                  {visited ? <Check size={14} /> : <Icon size={15} />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[0.6875rem] font-bold uppercase tracking-[.12em] ${
                    active ? "text-brand-mint" : "text-stone-500 dark:text-stone-400"
                  }`}>
                    {String(index + 1).padStart(2, "0")} · {etapa.label}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold">{etapa.title}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 px-2 pb-1 pt-2">
        <div
          role="progressbar"
          aria-label="Progresso no planeador"
          aria-valuemin={1}
          aria-valuemax={ETAPAS_CONTRATACAO.length}
          aria-valuenow={ativa + 1}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-[width] duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <span className="texto-micro flex-none font-semibold tabular-nums text-stone-500 dark:text-stone-400">
          Etapa {ativa + 1} de {ETAPAS_CONTRATACAO.length}
        </span>
      </div>
    </nav>
  );
}

export function PainelEtapa({
  index,
  ativa,
  children,
}: {
  index: number;
  ativa: number;
  children: React.ReactNode;
}) {
  const etapa = ETAPAS_CONTRATACAO[index];
  return (
    <div
      id={`etapa-contratacao-${etapa.id}`}
      role="tabpanel"
      aria-labelledby={`tab-etapa-contratacao-${etapa.id}`}
      tabIndex={-1}
      hidden={index !== ativa}
      className="scroll-mt-28 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-cream dark:focus-visible:ring-offset-stone-950"
    >
      {children}
    </div>
  );
}

export function ResumoPlaneador({
  state,
  result,
  releaseStatus,
  compacto = false,
  onShowResult,
}: {
  state: PlannerState;
  result?: EmploymentOfferResult;
  releaseStatus: ReleaseStatus;
  compacto?: boolean;
  onShowResult?: () => void;
}) {
  const objetivo = META_OBJETIVO[state.goal];
  const custos = custosDoEstado(state);
  const release = RELEASE[releaseStatus];
  const ReleaseIcon = release.Icon;
  const resultadoIncompleto = result?.status.readiness === "incomplete";
  const valorPrincipal = result
    ? eur(result.employerCost.annualStabilized.cents)
    : fmt(valorDePartida(state));
  const rotuloPrincipal = result
    ? resultadoIncompleto
      ? "Custo já conhecido"
      : "Custo anual projetado"
    : objetivo.valueLabel;

  if (compacto) {
    return (
      <section
        aria-label="Resumo vivo da contratação"
        className="rounded-3xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 lg:hidden"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="texto-micro font-bold uppercase tracking-[.12em] text-brand-dark dark:text-brand-mint">
              {result ? "Resultado disponível" : "Decisão em construção"}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
              {objetivo.label}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="texto-micro text-stone-500 dark:text-stone-400">{rotuloPrincipal}</p>
            <p className="truncate font-display text-lg font-semibold tabular-nums text-ink">{valorPrincipal}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
          <span>{state.normalWeeklyHours.toLocaleString("pt-PT")} h/semana</span>
          <span>{REGIAO[state.jurisdiction]}</span>
          <span className={custos.bloqueios > 0 ? "font-semibold text-alert-text" : "font-semibold text-brand-dark dark:text-brand-mint"}>
            {custos.bloqueios > 0 ? `${custos.bloqueios} bloqueio por resolver` : `${custos.conhecidos} custos conhecidos`}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Resumo vivo da contratação"
      className="overflow-hidden rounded-4xl border border-stone-100 bg-white shadow-lift dark:border-stone-800 dark:bg-stone-900"
    >
      <div className={resultadoIncompleto ? "bg-alert-bg p-5 text-alert-text" : "bg-brand-deep p-5 text-white"}>
        <p className={`texto-micro font-bold uppercase tracking-[.14em] ${resultadoIncompleto ? "text-alert-text" : "text-brand-mint"}`}>
          {result ? (resultadoIncompleto ? "Resultado incompleto" : "Resultado disponível") : "Decisão em construção"}
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold">{objetivo.label}</h3>
        <p className={`mt-4 texto-micro font-semibold uppercase tracking-[.1em] ${resultadoIncompleto ? "text-alert-text" : "text-brand-light"}`}>
          {rotuloPrincipal}
        </p>
        <p className="mt-1 break-words font-display text-3xl font-semibold tabular-nums">{valorPrincipal}</p>
        {resultadoIncompleto ? (
          <p className="mt-2 text-xs leading-relaxed text-alert-text">Ainda faltam parcelas; este total não é um veredicto.</p>
        ) : result ? (
          <p className="mt-2 text-xs leading-relaxed text-brand-light">Ano estabilizado, antes dos custos únicos de arranque.</p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-brand-light">É o valor que introduziste, ainda sem cálculo do motor.</p>
        )}
      </div>

      <div className="p-5">
        <dl className="divide-y divide-stone-100 dark:divide-stone-800">
          <div className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
            <dt className="text-xs text-stone-500 dark:text-stone-400">Posto</dt>
            <dd className="text-right text-xs font-semibold text-stone-800 dark:text-stone-100">
              {CONTRATO[state.contractKind]} · {state.normalWeeklyHours.toLocaleString("pt-PT")} h<br />
              <span className="font-normal text-stone-500 dark:text-stone-400">{REGIAO[state.jurisdiction]}</span>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-xs text-stone-500 dark:text-stone-400">Pacote</dt>
            <dd className="text-right text-xs font-semibold text-stone-800 dark:text-stone-100">
              {state.subsidyPayment === "duodecimos" ? "Subsídios em duodécimos" : "Subsídios nos meses próprios"}<br />
              <span className="font-normal text-stone-500 dark:text-stone-400">
                {state.mealDaily > 0
                  ? `${fmt(state.mealDaily)}/dia · ${state.mealMethod === "cash" ? "dinheiro" : "cartão ou vale"}`
                  : "Sem refeição declarada"}
              </span>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-xs text-stone-500 dark:text-stone-400">Custos do posto</dt>
            <dd className="text-right text-xs font-semibold text-stone-800 dark:text-stone-100">
              {custos.conhecidos} de {META_CUSTOS.length} conhecidos<br />
              <span className={custos.bloqueios > 0 ? "font-semibold text-alert-text" : "font-normal text-stone-500 dark:text-stone-400"}>
                {custos.bloqueios > 0
                  ? `${custos.bloqueios} obrigatório por confirmar`
                  : custos.porConfirmar > 0
                    ? `${custos.porConfirmar} por confirmar · ${custos.fora} fora`
                    : "Sem bloqueios de custo"}
              </span>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-xs text-stone-500 dark:text-stone-400">Entrada</dt>
            <dd className="text-right text-xs font-semibold text-stone-800 dark:text-stone-100">
              {state.startDate || "Por indicar"}<br />
              <span className="font-normal text-stone-500 dark:text-stone-400">Férias principais em {MESES[state.mainVacationMonth - 1]}</span>
            </dd>
          </div>
          {result ? (
            <>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="text-xs text-stone-500 dark:text-stone-400">Vencimento base</dt>
                <dd className="text-right text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                  {eur(result.resolvedBaseSalaryMonthly.cents)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="text-xs text-stone-500 dark:text-stone-400">Líquido de referência</dt>
                <dd className="text-right text-xs font-semibold tabular-nums text-brand-dark dark:text-brand-mint">
                  {liquidoDoResultado(result)}
                </dd>
              </div>
            </>
          ) : null}
        </dl>

        {result && onShowResult ? (
          <button
            type="button"
            onClick={onShowResult}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Ver o resultado <ArrowRight size={14} />
          </button>
        ) : (
          <p className="mt-4 rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500 dark:bg-stone-800/60 dark:text-stone-400">
            Este resumo lê apenas o que introduziste. O motor só calcula quando pedires na revisão.
          </p>
        )}

        <div className={`mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold ${release.className}`}>
          <ReleaseIcon size={14} className="flex-none" />
          <span>{release.label}</span>
        </div>
      </div>
    </section>
  );
}

export function NavegacaoRodape({
  ativa,
  onBack,
  onNext,
  onCalculate,
  calculated,
}: {
  ativa: number;
  onBack: () => void;
  onNext: () => void;
  onCalculate: () => void;
  calculated: boolean;
}) {
  const ultima = ativa === ETAPAS_CONTRATACAO.length - 1;
  const proxima = ETAPAS_CONTRATACAO[ativa + 1];

  return (
    <div className="mt-4 rounded-3xl border border-stone-100 bg-white p-3 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-4">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={ativa === 0}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 px-4 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 sm:w-auto"
        >
          <ArrowLeft size={14} /> Anterior
        </button>

        {ultima ? (
          <button
            type="button"
            onClick={onCalculate}
            className="btn-shine inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-center text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto"
          >
            <Calculator size={15} /> {calculated ? "Voltar a calcular" : "Calcular a contratação"} <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-center text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto"
          >
            Continuar para {proxima?.label.toLocaleLowerCase("pt-PT")} <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
