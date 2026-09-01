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

/**
 * A régua das etapas.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ PORQUE É QUE O RÓTULO DA RÉGUA NÃO PODE QUEBRAR LINHA                 │
 * │                                                                      │
 * │ A primeira versão punha duas linhas dentro do separador — o rótulo    │
 * │ curto («CUSTOS») por cima do título longo («O posto inteiro»). Num    │
 * │ ecrã largo, «05 · CAPACIDADE» e «Privacidade e cálculo» quebravam:    │
 * │ dois separadores ficavam com três linhas, os outros quatro com duas,  │
 * │ e as bases do texto deixavam de assentar na mesma linha. A 360px era  │
 * │ pior — «A proposta» partia-se em «A» / «proposta», quatro linhas num  │
 * │ botão de 70px.                                                       │
 * │                                                                      │
 * │ Não se resolve com `truncate` sobre a mesma composição: cortar o      │
 * │ título a meio é o mesmo defeito com outro nome. Resolve-se tirando o  │
 * │ título da régua. A régua ORIENTA — número e nome curto, uma linha,    │
 * │ sempre —, e o título passa a viver onde tem espaço: na linha do       │
 * │ progresso («Etapa 4 de 6 · O posto inteiro») e no cabeçalho do painel.│
 * │                                                                      │
 * │ O separador ativo também deixou de flutuar: a lista vive dentro de    │
 * │ uma calha `bg-stone-50`, e por isso a pastilha preenchida parece      │
 * │ encaixada em vez de pousada por cima do cartão.                       │
 * └──────────────────────────────────────────────────────────────────────┘
 */
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
  const etapaAtiva = ETAPAS_CONTRATACAO[ativa];

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
      className="rounded-4xl border border-stone-200 bg-white p-2 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-2.5"
    >
      <div
        role="tablist"
        aria-label="Etapas do planeador"
        className="flex snap-x snap-mandatory gap-1 overflow-x-auto rounded-3xl border border-stone-200 bg-stone-50 p-1.5 dark:border-stone-700/70 dark:bg-stone-800/50 sm:grid sm:grid-cols-3 sm:gap-1.5 sm:overflow-visible lg:grid-cols-6"
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
              title={`${etapa.label} — ${etapa.title}`}
              className={`group flex min-h-[46px] flex-none snap-start items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 sm:min-w-0 sm:flex-auto ${
                active
                  ? "bg-brand-deep text-white shadow-card"
                  : "text-stone-600 hover:bg-white hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-xl transition-colors ${
                active
                  ? "bg-white/15 text-brand-mint"
                  : visited
                    ? "bg-brand-light text-brand-dark dark:bg-brand/20 dark:text-brand-mint"
                    : "bg-white text-stone-400 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)] dark:bg-stone-900 dark:text-stone-500 dark:shadow-none"
              }`}>
                {visited ? <Check size={13} /> : <Icon size={14} />}
              </span>
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span
                  aria-hidden
                  className={`texto-mini flex-none font-bold tabular-nums tracking-[.08em] ${
                    active ? "text-brand-mint" : "text-stone-400 dark:text-stone-500"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-[0.8125rem] font-semibold leading-tight">
                  {etapa.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 flex items-center gap-3 px-1.5 pb-0.5 sm:mt-3 sm:px-2">
        <span
          role="progressbar"
          aria-label="Progresso no planeador"
          aria-valuemin={1}
          aria-valuemax={ETAPAS_CONTRATACAO.length}
          aria-valuenow={ativa + 1}
          className="block h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
        >
          <span
            className="block h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-[width] duration-500 ease-out"
            style={{ width: `${progresso}%` }}
          />
        </span>
        <span className="texto-mini flex-none font-semibold text-stone-500 dark:text-stone-400">
          <span className="tabular-nums">Etapa {ativa + 1} de {ETAPAS_CONTRATACAO.length}</span>
          <span aria-hidden className="hidden sm:inline"> · </span>
          <span className="hidden font-normal sm:inline">{etapaAtiva?.title}</span>
        </span>
      </p>
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
    // ┌────────────────────────────────────────────────────────────────┐
    // │ O NÚMERO NUNCA PODE SER CORTADO                                 │
    // │                                                                │
    // │ Este resumo era duas colunas lado a lado com `truncate` nas     │
    // │ duas. A 360px o valor principal saía «42 000,0…»: o único       │
    // │ número que a pessoa está a acompanhar, ilegível. Passa a ocupar │
    // │ a largura toda numa linha própria, com o rótulo por cima.       │
    // └────────────────────────────────────────────────────────────────┘
    return (
      <section
        aria-label="Resumo vivo da contratação"
        className="rounded-3xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 lg:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="texto-micro font-bold uppercase tracking-[.12em] text-brand-dark dark:text-brand-mint">
            {result ? (resultadoIncompleto ? "Resultado incompleto" : "Resultado disponível") : "Decisão em construção"}
          </p>
          <p className="texto-mini font-semibold text-stone-500 dark:text-stone-400">{objetivo.label}</p>
        </div>

        <p className="mt-2.5 texto-mini font-semibold uppercase tracking-[.1em] text-stone-500 dark:text-stone-400">
          {rotuloPrincipal}
        </p>
        <p className="mt-0.5 break-words font-display text-2xl font-semibold leading-tight tabular-nums text-ink">
          {valorPrincipal}
        </p>

        <dl className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-stone-200 pt-3 dark:border-stone-800">
          <div className="flex items-center gap-1">
            <dt className="sr-only">Período semanal</dt>
            <dd className="texto-mini rounded-lg bg-stone-50 px-2 py-1 font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {state.normalWeeklyHours.toLocaleString("pt-PT")} h/semana
            </dd>
          </div>
          <div className="flex items-center gap-1">
            <dt className="sr-only">Região</dt>
            <dd className="texto-mini rounded-lg bg-stone-50 px-2 py-1 font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {REGIAO[state.jurisdiction]}
            </dd>
          </div>
          <div className="flex items-center gap-1">
            <dt className="sr-only">Estado dos custos</dt>
            <dd
              className={`texto-mini rounded-lg px-2 py-1 font-semibold ${
                custos.bloqueios > 0
                  ? "bg-alert-bg text-alert-text"
                  : "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
              }`}
            >
              {custos.bloqueios > 0
                ? `${custos.bloqueios} ${custos.bloqueios === 1 ? "bloqueio" : "bloqueios"} por resolver`
                : `${custos.conhecidos} de ${META_CUSTOS.length} custos conhecidos`}
            </dd>
          </div>
        </dl>

        {result && onShowResult ? (
          <button
            type="button"
            onClick={onShowResult}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Ver o resultado <ArrowRight size={14} />
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-label="Resumo vivo da contratação"
      className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-lift dark:border-stone-800 dark:bg-stone-900"
    >
      <div className={resultadoIncompleto ? "bg-alert-bg p-5 text-alert-text" : "bg-brand-deep p-5 text-white"}>
        <p className={`texto-micro font-bold uppercase tracking-[.14em] ${resultadoIncompleto ? "text-alert-text" : "text-brand-mint"}`}>
          {result ? (resultadoIncompleto ? "Resultado incompleto" : "Resultado disponível") : "Decisão em construção"}
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold leading-snug">{objetivo.label}</h3>
        <p className={`mt-4 texto-micro font-semibold uppercase tracking-[.1em] ${resultadoIncompleto ? "text-alert-text" : "text-brand-light"}`}>
          {rotuloPrincipal}
        </p>
        <p className="mt-1 break-words font-display text-[1.75rem] font-semibold leading-tight tabular-nums xl:text-3xl">
          {valorPrincipal}
        </p>
        {resultadoIncompleto ? (
          <p className="mt-2 text-xs leading-relaxed text-alert-text">Ainda faltam parcelas; este total não é um veredicto.</p>
        ) : result ? (
          <p className="mt-2 text-xs leading-relaxed text-brand-light">Ano estabilizado, antes dos custos únicos de arranque.</p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-brand-light">É o valor que introduziste, ainda sem cálculo do motor.</p>
        )}
      </div>

      <div className="p-5">
        <dl className="divide-y divide-stone-200 dark:divide-stone-800">
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

/**
 * Rodapé de navegação. A barra tinha os dois botões encostados às pontas e
 * uma faixa branca vazia de 400px no meio; agora o meio diz o que vem a
 * seguir — a informação que a pessoa precisa antes de carregar no botão.
 */
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
    <div className="mt-4 rounded-3xl border border-stone-200 bg-white p-3 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-4">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={ativa === 0}
          className="inline-flex min-h-[44px] w-full flex-none items-center justify-center gap-2 rounded-2xl border border-stone-200 px-4 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 sm:w-auto"
        >
          <ArrowLeft size={14} /> Anterior
        </button>

        <p className="hidden min-w-0 flex-1 sm:block">
          <span className="texto-micro block font-bold uppercase tracking-[.12em] text-stone-400 dark:text-stone-500">
            {ultima ? "Último passo" : "A seguir"}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-stone-700 dark:text-stone-200">
            {ultima ? "O motor calcula com o que confirmaste" : `${proxima?.label} — ${proxima?.title}`}
          </span>
        </p>

        {ultima ? (
          <button
            type="button"
            onClick={onCalculate}
            className="btn-shine inline-flex min-h-[48px] w-full flex-none items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-center text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto"
          >
            <Calculator size={15} /> {calculated ? "Voltar a calcular" : "Calcular a contratação"} <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-[48px] w-full flex-none items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-center text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto"
          >
            Continuar para {proxima?.label.toLocaleLowerCase("pt-PT")} <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
