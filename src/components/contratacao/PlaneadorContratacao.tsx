"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  planEmploymentOffer,
  type EmploymentOfferResult,
  type PlannerGoal,
} from "../../../ReciboCerto-Fiscal-Engine/src";
import { explicarRecusa, resolverReleasePatronal } from "@/lib/motor/release";
import ContabilistasNoResultado from "@/components/diretorio/ContabilistasNoResultado";
import { registar } from "@/lib/analytics/cliente";
import { contextoContratacao } from "@/lib/analytics/contratacao";
// Módulo mínimo de propósito: `store/cenarios` arrastaria Supabase e Stripe
// para o chunk inicial do planeador. A persistência continua a entrar só na
// ação explícita de guardar.
import { consumirReabertura } from "@/lib/store/reabertura";
import {
  Briefcase,
  Building,
  Check,
  Clock,
  Download,
  FileSign,
  Lock,
  RotateCcw,
  Target,
  Warning,
} from "@/components/ui/Icons";
import {
  CampoCustoConhecido,
  DateField,
  DiasSemanaField,
  MoneyField,
  NumberField,
  SectionTitle,
  SelectField,
  Toggle,
} from "./campos";
import ComparadorPacotes, { type PacoteGuardado } from "./ComparadorPacotes";
import EstadoDecisao from "./EstadoDecisao";
import ResultadoContratacao, { TABS, type ResultTab } from "./ResultadoContratacao";
import {
  DIAS_SEMANA,
  META_CUSTOS,
  MESES,
  criarReducer,
  dataDePagamento,
  estadoDeCenario,
  estadoInicial,
  eur,
  inputFromState,
  montarSnapshot,
  periodoDeTrabalho,
  type CustoId,
  type PlannerState,
} from "./estado";
import CoberturaDoRelease from "./CoberturaDoRelease";
import {
  CabecalhoStudio,
  ETAPAS_CONTRATACAO,
  NavegacaoEtapas,
  NavegacaoRodape,
  PainelEtapa,
  ResumoPlaneador,
} from "./StudioContratacao";

const GuardarCenario = dynamic(() => import("./GuardarCenarioContratacao"), {
  ssr: false,
  loading: () => <p className="text-sm text-stone-500">A preparar a gravação…</p>,
});

const GOALS: Array<{
  value: PlannerGoal;
  title: string;
  description: string;
  Icon: typeof Building;
}> = [
  {
    value: "employer_budget",
    title: "Tenho um orçamento",
    description: "Descobrir o salário e o pacote que cabem no custo anual máximo.",
    Icon: Building,
  },
  {
    value: "target_net",
    title: "Quero garantir um líquido",
    description: "Estimar o bruto e o custo necessários para chegar ao líquido pretendido.",
    Icon: Target,
  },
  {
    value: "known_offer",
    title: "Já tenho uma proposta",
    description: "Ver o custo total, o líquido provável e os meses mais pesados.",
    Icon: FileSign,
  },
  {
    value: "required_capacity",
    title: "O posto tem de se pagar",
    description: "Traduzir o custo em horas, receita e capacidade comercial necessária.",
    Icon: Clock,
  },
];

const CHIP =
  "inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

function Bloco({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-7 lg:p-8">
      {children}
    </section>
  );
}

/**
 * Resumo persistente do estado dos custos. Existe para que nenhuma predefinição
 * ativa fique escondida dentro de uma secção fechada (relatório, INV-07).
 */
function ResumoCustos({ state }: { state: PlannerState }) {
  const contagem = META_CUSTOS.reduce(
    (acc, meta) => {
      const estado = state.custos[meta.id].estado;
      if (estado === "confirmado") acc.confirmados += 1;
      else if (estado === "estimado" || estado === "intervalo") acc.estimados += 1;
      else if (estado === "nao_aplicavel") acc.fora += 1;
      else acc.porConfirmar += 1;
      return acc;
    },
    { confirmados: 0, estimados: 0, porConfirmar: 0, fora: 0 },
  );
  const itens = [
    { label: "confirmados", valor: contagem.confirmados, tom: "text-brand-dark dark:text-brand-mint" },
    { label: "estimados", valor: contagem.estimados, tom: "text-alert-text" },
    { label: "por confirmar", valor: contagem.porConfirmar, tom: "text-clay-text" },
    { label: "fora do cálculo", valor: contagem.fora, tom: "text-stone-500" },
  ];
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1.5">
      {itens.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <dt className="sr-only">{item.label}</dt>
          <dd className={`text-sm font-bold tabular-nums ${item.tom}`}>{item.valor}</dd>
          <span aria-hidden className="text-xs text-stone-500 dark:text-stone-400">{item.label}</span>
        </div>
      ))}
    </dl>
  );
}

export default function PlaneadorContratacao({ hoje }: { hoje: string }) {
  // Release de arranque: resolvido com a data de hoje e a jurisdição por
  // omissão, só para obter o cenário de demonstração e os valores iniciais.
  // Nenhum número de negócio nasce no componente (MOT-P0-015).
  const arranque = useMemo(
    () =>
      resolverReleasePatronal({
        simulationAsOf: hoje as never,
        workPeriod: hoje.slice(0, 7) as never,
        payDate: hoje as never,
        jurisdiction: "PT-CONTINENTE",
      }),
    [hoje],
  );
  const demo = arranque.kind === "ready"
    ? arranque.bundle.release.demoScenarios[0]
    : undefined;
  const inicial = useMemo(
    () => (demo ? estadoInicial(demo) : undefined),
    [demo],
  );
  const reducer = useMemo(
    () => criarReducer(inicial ?? ({} as PlannerState)),
    [inicial],
  );
  const [state, dispatch] = useReducer(reducer, inicial ?? ({} as PlannerState));
  const [tab, setTab] = useState<ResultTab>("package");
  const [saveOpen, setSaveOpen] = useState(false);
  const [pacotes, setPacotes] = useState<PacoteGuardado[]>([]);
  const [etapa, setEtapa] = useState(0);
  const [etapasVisitadas, setEtapasVisitadas] = useState<ReadonlySet<number>>(
    () => new Set([0]),
  );
  const resultRef = useRef<HTMLDivElement>(null);
  const reidratado = useRef(false);
  const focarPainelAoMudar = useRef(false);

  const input = useMemo(() => inputFromState(state, hoje), [state, hoje]);

  /**
   * O release do CENÁRIO — resolvido com as datas e a jurisdição que a
   * pessoa indicou, não com as do arranque. É este que autoriza o cálculo:
   * sem bundle não há `planEmploymentOffer` que se chame, porque a
   * assinatura não aceita outra coisa (MOT-P0-001).
   */
  const selecao = useMemo(() => {
    const periodo = periodoDeTrabalho(state.startDate);
    const pagamento = dataDePagamento(state.startDate);
    if (!periodo || !pagamento) return null;
    return resolverReleasePatronal({
      simulationAsOf: hoje as never,
      workPeriod: periodo as never,
      payDate: pagamento as never,
      jurisdiction: state.jurisdiction,
    });
  }, [state.startDate, state.jurisdiction, hoje]);

  // O cálculo só corre depois de a pessoa o pedir: até lá, a etapa de revisão
  // é a que interessa e a thread principal fica livre (CON-P0-26).
  const preparation = useMemo(
    () => (state.calculated && selecao?.kind === "ready"
      ? planEmploymentOffer(input, selecao.bundle)
      : null),
    [input, state.calculated, selecao],
  );

  const set = <K extends keyof PlannerState>(key: K, value: PlannerState[K]) =>
    dispatch({ type: "set", key, value });
  const setCusto = (id: CustoId, patch: Partial<PlannerState["custos"][CustoId]>) => {
    const meta = META_CUSTOS.find((item) => item.id === id);
    const antes = state.custos[id].estado;
    dispatch({ type: "setCusto", id, patch });
    if (
      meta?.obrigatorio
      && patch.estado !== undefined
      && (antes === "nao_sei" || antes === "nao_aplicavel")
      && patch.estado !== "nao_sei"
      && patch.estado !== "nao_aplicavel"
    ) {
      registar("hiring_blocking_fact_resolved", {
        ...contextoContratacao("ferramenta"),
        fact_id: id,
      });
    }
  };

  useEffect(() => {
    registar("hiring_planner_started", contextoContratacao("ferramenta"));
  }, []);

  // Trocar de etapa substitui o conteúdo principal. O foco acompanha a
  // mudança quando ela nasce dos botões Anterior/Continuar. Ao escolher um
  // separador, o foco fica no próprio separador para as setas continuarem a
  // funcionar segundo o padrão ARIA.
  useEffect(() => {
    if (!focarPainelAoMudar.current) return;
    focarPainelAoMudar.current = false;
    requestAnimationFrame(() => {
      const id = ETAPAS_CONTRATACAO[etapa]?.id;
      if (id) document.getElementById(`etapa-contratacao-${id}`)?.focus();
    });
  }, [etapa]);

  // Reabertura de um cenário guardado: acontece uma única vez, mesmo que a
  // página volte a montar (relatório, CON-P0-22).
  useEffect(() => {
    if (reidratado.current) return;
    reidratado.current = true;
    if (!inicial) return;
    const guardado = estadoDeCenario(consumirReabertura("contratacao"), inicial);
    if (!guardado) return;
    dispatch({ type: "hydrate", state: guardado });
    registar("hiring_scenario_reopened", contextoContratacao("ferramenta"));
  }, [inicial]);

  const calcular = () => {
    dispatch({ type: "calculate" });
    if (selecao?.kind !== "ready") return;
    const resultado = planEmploymentOffer(input, selecao.bundle);
    registar("hiring_calculation_started", {
      ...contextoContratacao("ferramenta"),
      goal: state.goal,
    });
    if (resultado.kind === "ready") {
      registar("hiring_calculation_completed", {
        ...contextoContratacao("ferramenta"),
        goal: state.goal,
        readiness: resultado.result.status.readiness,
        projection: resultado.result.projection,
        completion_step: "resultado",
      });
      if (!resultado.result.status.verdictAllowed) {
        registar("hiring_result_incomplete", {
          ...contextoContratacao("ferramenta"),
          blocking_count: resultado.result.status.blockingFacts.length,
        });
      }
    }
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const fixarPacote = (result: EmploymentOfferResult) => {
    setPacotes((anteriores) => {
      if (anteriores.length >= 2) return anteriores;
      const nome = `Pacote ${String.fromCharCode(65 + anteriores.length)}`;
      registar("hiring_comparison_created", {
        ...contextoContratacao("ferramenta"),
        goal: state.goal,
      });
      return [...anteriores, { id: `${nome}-${anteriores.length}`, nome, result }];
    });
  };

  const irParaEtapa = (index: number, focarPainel = false) => {
    const destino = Math.max(0, Math.min(ETAPAS_CONTRATACAO.length - 1, index));
    focarPainelAoMudar.current = focarPainel;
    setEtapa(destino);
    setEtapasVisitadas((anteriores) => new Set(anteriores).add(destino));
  };

  const resultadoPronto = preparation?.kind === "ready" ? preparation.result : undefined;
  const releaseStatus = selecao?.kind === "ready"
    ? selecao.bundle.release.status
    : arranque.kind === "ready"
      ? arranque.bundle.release.status
      : "draft";

  return (
    <div className="space-y-6 print:space-y-3">
      <CabecalhoStudio releaseStatus={releaseStatus} />
      <NavegacaoEtapas ativa={etapa} visitadas={etapasVisitadas} onSelect={irParaEtapa} />
      <ResumoPlaneador
        compacto
        state={state}
        result={resultadoPronto}
        releaseStatus={releaseStatus}
        onShowResult={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0">
      <PainelEtapa index={0} ativa={etapa}>
      <Bloco>
        <SectionTitle
          step="01"
          title="O que precisas de decidir?"
          description="Escolhe o ponto de partida. A mesma conta adapta os campos e mantém os pressupostos visíveis."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Objetivo da contratação">
          {GOALS.map(({ value, title, description, Icon }) => {
            const ativo = state.goal === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => {
                  set("goal", value);
                  registar("hiring_goal_selected", {
                    ...contextoContratacao("ferramenta"),
                    goal: value,
                  });
                }}
                className={`group min-h-[148px] rounded-3xl border p-4 text-left transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${ativo ? "border-brand-deep bg-brand-deep text-white shadow-lift" : "border-stone-200 bg-stone-50 text-stone-900 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-white hover:shadow-card dark:border-stone-700 dark:bg-stone-800/60 dark:text-white dark:hover:bg-stone-800"}`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${ativo ? "bg-white/15 text-brand-mint" : "bg-brand-light text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white dark:bg-brand/15 dark:text-brand-mint"}`}>
                  <Icon size={18} />
                </span>
                <span className={`mt-3 block text-sm font-bold ${ativo ? "text-white" : "text-stone-900 dark:text-white"}`}>{title}</span>
                <span className={`mt-1.5 block text-xs leading-relaxed ${ativo ? "text-brand-light" : "text-stone-500 dark:text-stone-400"}`}>{description}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.goal === "employer_budget" ? (
            <>
              <MoneyField
                id="annual-budget"
                label="Orçamento anual máximo"
                value={state.annualBudget}
                onChange={(value) => set("annualBudget", value)}
                hint="Inclui remuneração, encargos e custos do posto."
              />
              <NumberField
                id="safety-margin"
                label="Margem que não queres gastar"
                value={state.safetyMarginPercent}
                onChange={(value) => set("safetyMarginPercent", value)}
                suffix="%"
                max={50}
                decimals={1}
              />
            </>
          ) : null}
          {state.goal === "target_net" ? (
            <MoneyField
              id="target-net"
              label="Líquido mensal pretendido"
              value={state.targetNet}
              onChange={(value) => set("targetNet", value)}
              hint="Sem dados pessoais, o motor usa o cenário mais conservador dos quatro de referência."
            />
          ) : null}
          {state.goal === "known_offer" || state.goal === "required_capacity" ? (
            <MoneyField
              id="base-salary"
              label="Vencimento base mensal"
              value={state.baseSalary}
              onChange={(value) => set("baseSalary", value)}
            />
          ) : null}
          <SelectField
            label="Enquadramento contributivo da entidade"
            value={state.contributionRegime}
            onChange={(value) => set("contributionRegime", value)}
            options={[
              { value: "regime_geral", label: "Regime geral" },
              { value: "outro", label: "Outro regime" },
              { value: "nao_sei", label: "Ainda não sei" },
            ]}
            info="A taxa contributiva da entidade nunca é inferida pelo nome da empresa. Se o regime não for o geral, o motor recusa em vez de aproximar."
          />
        </div>
      </Bloco>

      </PainelEtapa>
      <PainelEtapa index={1} ativa={etapa}>

      <Bloco>
        <SectionTitle
          step="02"
          title="Que posto é este?"
          description="A data de entrada, os dias contratados e a região decidem feriados, férias, refeição e o mês de cada subsídio."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DateField
            id="start-date"
            label="Data de entrada"
            value={state.startDate}
            onChange={(value) => set("startDate", value)}
            hint="O primeiro ano civil é contado a partir daqui."
          />
          <SelectField
            label="Tipo de contrato"
            value={state.contractKind}
            onChange={(value) => set("contractKind", value)}
            options={[
              { value: "permanent", label: "Sem termo" },
              { value: "fixed_term", label: "A termo" },
              { value: "unknown", label: "Ainda não sei" },
            ]}
          />
          {state.contractKind === "fixed_term" ? (
            <DateField
              id="contract-end"
              label="Fim do contrato"
              value={state.contractEndDate}
              onChange={(value) => set("contractEndDate", value)}
              hint="Depois desta data o calendário deixa de gerar caixa."
            />
          ) : null}
          <SelectField
            label="Região fiscal"
            value={state.jurisdiction}
            onChange={(value) => set("jurisdiction", value)}
            options={[
              { value: "PT-CONTINENTE", label: "Continente" },
              { value: "PT-MADEIRA", label: "Madeira" },
              { value: "PT-ACORES", label: "Açores" },
            ]}
            hint="Muda a retenção e também os feriados regionais."
          />
          <NumberField
            id="weekly-hours"
            label="Período normal por semana"
            value={state.normalWeeklyHours}
            onChange={(value) => set("normalWeeklyHours", value)}
            suffix="h"
            max={40}
            decimals={1}
            info="O período normal de trabalho não passa de 8 horas por dia nem de 40 por semana (Código do Trabalho, artigo 203.º). Uma semana de 50 ou 60 horas existe como acréscimo pontual num regime de adaptabilidade, compensado dentro do período de referência — não como horário permanente."
          />
          <SelectField
            label="Regime de tempo de trabalho"
            value={state.workingTimeRegime}
            onChange={(value) => set("workingTimeRegime", value)}
            options={[
              { value: "standard", label: "Normal — 40 h por semana, sem acréscimos" },
              { value: "adaptability_individual", label: "Adaptabilidade individual (artigo 205.º)" },
              { value: "adaptability_collective", label: "Adaptabilidade por IRCT (artigo 204.º)" },
            ]}
            hint="A adaptabilidade não muda o período normal: autoriza semanas mais longas, repostas por semanas mais curtas."
          />
          {state.workingTimeRegime !== "standard" ? (
            <>
              <SelectField
                label="Fundamento da adaptabilidade"
                value={state.workingTimeBasis}
                onChange={(value) => set("workingTimeBasis", value)}
                options={[
                  { value: "none", label: "Ainda não há" },
                  { value: "written_individual_agreement", label: "Acordo escrito com o trabalhador" },
                  { value: "collective_agreement", label: "Instrumento de regulamentação coletiva" },
                ]}
                hint="Sem fundamento admissível o regime não pode ser declarado."
              />
              <NumberField
                id="peak-weekly-hours"
                label="Semana de acréscimo"
                value={state.peakWeeklyHours}
                onChange={(value) => set("peakWeeklyHours", value)}
                suffix="h"
                max={60}
                decimals={1}
                info="Limite das semanas mais longas: 50 h na adaptabilidade individual (artigo 205.º) e 60 h na coletiva (artigo 204.º)."
              />
              <NumberField
                id="reference-period"
                label="Período de referência"
                value={state.referencePeriodMonths}
                onChange={(value) => set("referencePeriodMonths", value)}
                suffix="meses"
                max={12}
                info="Prazo dentro do qual a média volta ao período normal (artigo 207.º)."
              />
            </>
          ) : null}
          <NumberField
            id="overtime-weekly"
            label="Trabalho suplementar previsto"
            value={state.expectedOvertimeWeeklyHours}
            onChange={(value) => set("expectedOvertimeWeeklyHours", value)}
            suffix="h/semana"
            max={20}
            decimals={1}
            info="Conta para o limite de 48 horas de média semanal do artigo 211.º, n.º 1."
          />
          <SelectField
            label="Mês do gozo principal de férias"
            value={String(state.mainVacationMonth)}
            onChange={(value) => set("mainVacationMonth", Number(value))}
            options={MESES.map((label, index) => ({ value: String(index + 1), label }))}
            info="Comanda o mês do subsídio de férias, que a lei manda pagar antes do gozo, e a distribuição dos dias de férias pelo ano."
          />
          <SelectField
            label="IRCT aplicável"
            value={state.irctStatus}
            onChange={(value) => set("irctStatus", value)}
            options={[
              { value: "unknown", label: "Não sei se existe" },
              { value: "none", label: "Não se aplica nenhum" },
              { value: "declared", label: "Sim, sei qual é" },
            ]}
            hint="Desconhecido aparece como risco no resultado — não como inexistente."
          />
          {state.irctStatus === "declared" ? (
            <MoneyField
              id="irct-minimum"
              label="Mínimo da categoria no IRCT"
              value={state.irctMinimumMonthly}
              onChange={(value) => set("irctMinimumMonthly", value)}
              hint="Deixa em branco se ainda não confirmaste a tabela: o piso convencional fica por confirmar em vez de ser dado por cumprido."
            />
          ) : null}
          <DiasSemanaField
            dias={state.workingWeekdays}
            onChange={(dias) => set("workingWeekdays", dias)}
            opcoes={DIAS_SEMANA}
          />
        </div>
      </Bloco>

      </PainelEtapa>
      <PainelEtapa index={2} ativa={etapa}>

      <Bloco>
        <SectionTitle
          step="03"
          title="Compor o pacote"
          description="O salário é só uma parcela. Refeição, prémios e forma de pagar subsídios mudam o líquido e a tesouraria."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Subsídios de férias e Natal"
            value={state.subsidyPayment}
            onChange={(value) => set("subsidyPayment", value)}
            options={[
              { value: "normal", label: "Nos meses próprios" },
              { value: "duodecimos", label: "Em duodécimos" },
            ]}
          />
          <MoneyField
            id="fixed-bonus"
            label="Complemento fixo mensal"
            value={state.fixedMonthlyBonus}
            onChange={(value) => set("fixedMonthlyBonus", value)}
          />
          <MoneyField
            id="variable-bonus"
            label="Prémio variável anual"
            value={state.variableAnnualBonus}
            onChange={(value) => set("variableAnnualBonus", value)}
          />
          {state.variableAnnualBonus > 0 ? (
            <>
              <SelectField
                label="Regularidade do prémio"
                value={state.bonusRegularity}
                onChange={(value) => set("bonusRegularity", value)}
                options={[
                  { value: "unknown", label: "Ainda não sei" },
                  { value: "regular", label: "Pago de forma regular" },
                  { value: "not_regular", label: "Não regular e objetivo" },
                ]}
                info="Sem esta classificação o motor não presume incidência contributiva."
              />
              <SelectField
                label="Mês do prémio"
                value={String(state.bonusMonth)}
                onChange={(value) => set("bonusMonth", Number(value))}
                options={MESES.map((label, index) => ({ value: String(index + 1), label }))}
              />
            </>
          ) : null}
          <MoneyField
            id="meal-daily"
            label="Refeição por dia"
            value={state.mealDaily}
            onChange={(value) => set("mealDaily", value)}
          />
          <SelectField
            label="Como contar os dias de refeição"
            value={state.mealDaysMode}
            onChange={(value) => set("mealDaysMode", value)}
            options={[
              { value: "calendario", label: "Pelo calendário real" },
              { value: "declarado", label: "Número fixo por mês" },
            ]}
            info="Pelo calendário, os dias vêm dos dias contratados menos feriados e férias. Um número fixo é uma simplificação e fica assinalada como pressuposto."
          />
          {state.mealDaysMode === "declarado" ? (
            <NumberField
              id="meal-days"
              label="Dias de refeição por mês"
              value={state.mealDays}
              onChange={(value) => set("mealDays", value)}
              suffix="dias"
              max={31}
            />
          ) : null}
          <SelectField
            label="Forma do subsídio de refeição"
            value={state.mealMethod}
            onChange={(value) => set("mealMethod", value)}
            options={[
              { value: "card_or_voucher", label: "Cartão ou vale" },
              { value: "cash", label: "Dinheiro" },
            ]}
          />
        </div>
      </Bloco>

      </PainelEtapa>
      <PainelEtapa index={3} ativa={etapa}>

      <Bloco>
        <SectionTitle
          step="04"
          title="Contar o posto inteiro"
          description="Um custo desconhecido não é zero. Cada parcela declara o que se sabe dela — e o que ainda falta impede uma conclusão."
          acao={<div className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/60"><ResumoCustos state={state} /></div>}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {META_CUSTOS.map((meta) => (
            <CampoCustoConhecido
              key={meta.id}
              meta={meta}
              campo={state.custos[meta.id]}
              onChange={(patch) => setCusto(meta.id, patch)}
            />
          ))}
        </div>
      </Bloco>

      </PainelEtapa>
      <PainelEtapa index={4} ativa={etapa}>

      <Bloco>
        <SectionTitle
          step="05"
          title="O que o posto tem de gerar"
          description="Horas disponíveis não são horas pagas: feriados, férias e formação saem primeiro. Só depois entra a fração faturável."
        />
        <Toggle
          checked={state.productive}
          onChange={(value) => set("productive", value)}
          label="Este posto gera trabalho faturável"
          description="Ativa custo por hora produtiva, receita necessária e folga de capacidade."
        />
        {state.productive ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              id="productive-share"
              label="Tempo realmente produtivo"
              value={state.productiveSharePercent}
              onChange={(value) => set("productiveSharePercent", value)}
              suffix="%"
              max={100}
              decimals={1}
              hint="Já desconta coordenação, pausas e trabalho interno."
            />
            <MoneyField
              id="price-hour"
              label="Preço de venda por hora"
              value={state.pricePerHour}
              onChange={(value) => set("pricePerHour", value)}
            />
            <NumberField
              id="contribution-margin"
              label="Margem de contribuição"
              value={state.contributionMarginPercent}
              onChange={(value) => set("contributionMarginPercent", value)}
              suffix="%"
              max={100}
              decimals={1}
              info="Percentagem do preço que sobra depois dos custos variáveis da venda. É ela que paga o posto — não o preço."
            />
            <NumberField
              id="billable-hours"
              label="Horas faturáveis esperadas / mês"
              value={state.expectedBillableHoursMonthly}
              onChange={(value) => set("expectedBillableHoursMonthly", value)}
              suffix="h"
              max={400}
              decimals={1}
            />
            <NumberField
              id="training-hours"
              label="Horas de formação / ano"
              value={state.trainingHours}
              onChange={(value) => set("trainingHours", value)}
              suffix="h"
              max={400}
              hint="Mínimo legal de 40 horas. Reduzem capacidade mesmo sem custo externo."
            />
            <NumberField
              id="onboarding-hours"
              label="Horas de integração"
              value={state.onboardingHours}
              onChange={(value) => set("onboardingHours", value)}
              suffix="h"
              max={2_000}
            />
          </div>
        ) : null}
      </Bloco>

      </PainelEtapa>
      <PainelEtapa index={5} ativa={etapa}>

      <Bloco>
        <SectionTitle
          step="06"
          title="Afinar sem invadir"
          description="Podes calcular sem um único dado pessoal. Os factos do candidato só entram com autorização expressa."
        />
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Modo de projeção do líquido">
          <button
            type="button"
            role="radio"
            aria-checked={state.candidateMode === "range"}
            onClick={() => set("candidateMode", "range")}
            className={`min-h-[90px] rounded-2xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${state.candidateMode === "range" ? "border-brand bg-brand-light dark:bg-brand/15" : "border-stone-200 dark:border-stone-700"}`}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-white">
              <Lock size={16} className="text-brand" /> Sem dados pessoais
            </span>
            <span className="mt-2 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Devolve quatro cenários de referência nomeados, sem identificar ninguém.
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={state.candidateMode === "authorized"}
            onClick={() => set("candidateMode", "authorized")}
            className={`min-h-[90px] rounded-2xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${state.candidateMode === "authorized" ? "border-brand bg-brand-light dark:bg-brand/15" : "border-stone-200 dark:border-stone-700"}`}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-white">
              <Check size={16} className="text-brand" /> Tenho autorização
            </span>
            <span className="mt-2 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Usa estado civil, dependentes e deficiência para uma projeção personalizada.
            </span>
          </button>
        </div>

        {state.candidateMode === "authorized" ? (
          <div className="mt-4 space-y-4">
            <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/60">
              <input
                type="checkbox"
                checked={state.authorizationConfirmed}
                onChange={(event) => set("authorizationConfirmed", event.target.checked)}
                className="mt-0.5 h-5 w-5 flex-none rounded border-stone-300 text-brand focus:ring-brand"
              />
              <span className="min-w-0 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                <strong className="block text-stone-800 dark:text-stone-100">
                  Confirmo que o candidato autorizou o uso destes factos para esta simulação.
                </strong>
                Finalidade: estimar o líquido desta proposta. Duração: só enquanto esta página estiver
                aberta. Local: o cálculo corre neste dispositivo. Nada é guardado sem uma segunda ação
                tua, e nenhum destes factos entra em endereços, registos ou medição.
              </span>
            </label>
            {state.authorizationConfirmed ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <NumberField
                  id="dependants"
                  label="Dependentes"
                  value={state.candidateDependants}
                  onChange={(value) => set("candidateDependants", value)}
                  max={20}
                />
                <SelectField
                  label="Estado civil fiscal"
                  value={state.candidateMaritalStatus}
                  onChange={(value) => set("candidateMaritalStatus", value)}
                  options={[
                    { value: "not_married", label: "Não casado" },
                    { value: "married_single_holder", label: "Casado — único titular" },
                    { value: "married_two_holders", label: "Casado — dois titulares" },
                  ]}
                />
                <Toggle
                  checked={state.candidateDisability}
                  onChange={(value) => set("candidateDisability", value)}
                  label="Deficiência fiscalmente relevante"
                  description="Só ativa se este facto tiver sido autorizado."
                />
              </div>
            ) : (
              <p className="flex items-start gap-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                <Warning size={15} className="mt-0.5 flex-none text-clay-text" />
                Sem essa confirmação, o cálculo continua a usar os cenários de referência.
              </p>
            )}
          </div>
        ) : null}

        <details className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-stone-800 dark:text-stone-100">
            Triar apoios à contratação — opcional
          </summary>
          <div className="grid gap-4 border-t border-stone-200 p-4 dark:border-stone-700 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Inscrito no IEFP"
              value={state.registeredUnemployed}
              onChange={(value) => set("registeredUnemployed", value)}
              options={[
                { value: "unknown", label: "Ainda não sei" },
                { value: "yes", label: "Sim" },
                { value: "no", label: "Não" },
              ]}
            />
            <SelectField
              label="Contrato sem termo"
              value={state.permanentContract}
              onChange={(value) => set("permanentContract", value)}
              options={[
                { value: "unknown", label: "Ainda não sei" },
                { value: "yes", label: "Sim" },
                { value: "no", label: "Não" },
              ]}
            />
            <SelectField
              label="Tempo completo"
              value={state.fullTime}
              onChange={(value) => set("fullTime", value)}
              options={[
                { value: "unknown", label: "Ainda não sei" },
                { value: "yes", label: "Sim" },
                { value: "no", label: "Não" },
              ]}
            />
            <SelectField
              label="Oferta registada antes do contrato"
              value={state.jobOfferRegisteredBeforeContract}
              onChange={(value) => set("jobOfferRegisteredBeforeContract", value)}
              options={[
                { value: "unknown", label: "Ainda não sei" },
                { value: "yes", label: "Sim" },
                { value: "no", label: "Não" },
              ]}
              hint="O contrato pode ser assinado antes da candidatura, mas nunca antes do registo da oferta no iefponline."
            />
            <SelectField
              label="Candidatura dentro dos 30 dias da oferta"
              value={state.applicationWithinWindowOfOffer}
              onChange={(value) => set("applicationWithinWindowOfOffer", value)}
              options={[
                { value: "unknown", label: "Ainda não sei" },
                { value: "yes", label: "Sim" },
                { value: "no", label: "Não" },
              ]}
            />
            <SelectField
              label="Criação líquida de emprego"
              value={state.netJobCreation}
              onChange={(value) => set("netJobCreation", value)}
              options={[
                { value: "unknown", label: "Ainda não sei" },
                { value: "yes", label: "Sim" },
                { value: "no", label: "Não" },
              ]}
              hint="A admissão tem de aumentar o número de pessoas ao serviço, e o nível mantém-se pelo menos 24 meses."
            />
            <SelectField
              label="Situação regularizada"
              value={state.regularisedStanding}
              onChange={(value) => set("regularisedStanding", value)}
              options={[
                { value: "unknown", label: "Ainda não sei" },
                { value: "yes", label: "Sim" },
                { value: "no", label: "Não" },
              ]}
              hint="Perante as Finanças e a Segurança Social."
            />
            <SelectField
              label="Despedimentos recentes no posto equivalente"
              value={state.recentDismissals}
              onChange={(value) => set("recentDismissals", value)}
              options={[
                { value: "unknown", label: "Ainda não sei" },
                { value: "yes", label: "Sim" },
                { value: "no", label: "Não" },
              ]}
            />
            <NumberField
              id="candidate-age"
              label="Idade"
              value={state.candidateAge}
              onChange={(value) => set("candidateAge", value)}
              max={100}
            />
            <NumberField
              id="qualification"
              label="Nível de qualificação"
              value={state.qualificationLevel}
              onChange={(value) => set("qualificationLevel", value)}
              max={8}
            />
          </div>
        </details>

        <div className="mt-6 rounded-2xl border border-brand/20 bg-brand-light/45 p-4 dark:bg-brand/10">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <Lock size={15} className="mt-0.5 flex-none text-brand" />
            <span>
              <strong className="text-stone-800 dark:text-stone-100">Pronto para pedir a conta.</strong>{" "}
              O cálculo corre neste dispositivo e nada é guardado sem uma ação separada.
            </span>
          </p>
          <div className="mt-3 border-t border-brand/15 pt-3"><ResumoCustos state={state} /></div>
        </div>
      </Bloco>

      </PainelEtapa>

          <NavegacaoRodape
            ativa={etapa}
            calculated={state.calculated}
            onBack={() => irParaEtapa(etapa - 1, true)}
            onNext={() => irParaEtapa(etapa + 1, true)}
            onCalculate={calcular}
          />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <ResumoPlaneador
              state={state}
              result={resultadoPronto}
              releaseStatus={releaseStatus}
              onShowResult={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
          </div>
        </aside>
      </div>

      {state.calculated && selecao && selecao.kind !== "ready" ? (
        <section
          ref={resultRef}
          className="scroll-mt-24 rounded-3xl border border-alert-border bg-alert-bg p-5 sm:p-6"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <Warning size={19} className="mt-0.5 flex-none text-alert-text" />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-alert-text">
                {explicarRecusa(selecao).titulo}
              </h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-alert-text">
                {explicarRecusa(selecao).motivos.map((motivo) => (
                  <li key={motivo}>{motivo}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-alert-text/85">
                {explicarRecusa(selecao).detalhe}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {state.calculated && preparation ? (
        <div ref={resultRef} className="scroll-mt-24" aria-live="polite">
          {preparation.kind === "ready" ? (
            <section
              id="resultado-contratacao"
              className="overflow-hidden rounded-3xl border border-brand/25 bg-stone-50 shadow-lift dark:bg-stone-950 print:border-stone-300 print:shadow-none"
            >
              <EstadoDecisao
                result={preparation.result}
                acoes={
                  <>
                    <button
                      type="button"
                      onClick={() => fixarPacote(preparation.result)}
                      disabled={pacotes.length >= 2}
                      className={`${CHIP} disabled:cursor-not-allowed disabled:opacity-50 ${preparation.result.status.readiness === "incomplete" ? "border-alert-border bg-white/70 text-alert-text hover:bg-white" : ""}`}
                    >
                      <Briefcase size={15} /> {pacotes.length >= 2 ? "Comparação cheia" : "Fixar para comparar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveOpen(true)}
                      className={`${CHIP} ${preparation.result.status.readiness === "incomplete" ? "border-alert-border bg-white/70 text-alert-text hover:bg-white" : ""}`}
                    >
                      <Download size={15} /> Guardar cenário
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        registar("hiring_export_generated", {
                          ...contextoContratacao("ferramenta"),
                          export_format: "pdf",
                          readiness: preparation.result.status.readiness,
                        });
                        window.print();
                      }}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-dark hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <FileSign size={15} /> Guardar em PDF
                    </button>
                  </>
                }
              />

              <div className="border-b border-stone-200 bg-white px-3 py-3 dark:border-stone-800 dark:bg-stone-900 print:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Detalhes do resultado">
                  {TABS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      aria-selected={tab === item.value}
                      onClick={() => setTab(item.value)}
                      className={`min-h-[42px] flex-none rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === item.value ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:text-brand-dark dark:bg-stone-800 dark:text-stone-300"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-7">
                <CoberturaDoRelease provenance={preparation.result.provenance} />
                <ResultadoContratacao result={preparation.result} tab={tab} />

                {pacotes.length > 0 ? (
                  <ComparadorPacotes
                    pacotes={pacotes}
                    atual={preparation.result}
                    onRemover={(id) => setPacotes((anteriores) => anteriores.filter((pacote) => pacote.id !== id))}
                  />
                ) : null}

                {preparation.result.assumptions.length > 0 ? (
                  <details
                    className="mt-6 rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
                    open={preparation.result.status.readiness === "incomplete" || undefined}
                  >
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-stone-800 dark:text-stone-100">
                      Pressupostos e lacunas ({preparation.result.assumptions.length})
                    </summary>
                    <ul className="space-y-3 border-t border-stone-100 p-4 dark:border-stone-800">
                      {preparation.result.assumptions.map((assumption) => (
                        <li key={assumption.id} className="flex gap-2.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                          {assumption.severity === "blocking" ? (
                            <Warning size={15} className="mt-0.5 flex-none text-clay-text" />
                          ) : assumption.severity === "estimate" ? (
                            <Warning size={15} className="mt-0.5 flex-none text-alert-text" />
                          ) : (
                            <Check size={15} className="mt-0.5 flex-none text-brand" />
                          )}
                          <span>
                            <strong className="text-stone-800 dark:text-stone-100">{assumption.label}.</strong>{" "}
                            {assumption.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                {preparation.result.status.readiness !== "incomplete" ? (
                  <label className="mt-5 flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900 print:hidden">
                    <input
                      type="checkbox"
                      checked={state.revisto}
                      onChange={(event) => set("revisto", event.target.checked)}
                      className="mt-0.5 h-5 w-5 flex-none rounded border-stone-300 text-brand focus:ring-brand"
                    />
                    <span className="min-w-0 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                      <strong className="block text-stone-800 dark:text-stone-100">
                        Revi os dados que introduzi e assumo este cenário.
                      </strong>
                      Regista que os <em>teus</em> dados foram revistos, com data e versão do motor.
                      Não valida as regras fiscais nem substitui a aprovação da política. Mexer em
                      qualquer campo volta a tirar a marca.
                    </span>
                  </label>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: "reset" });
                      setTab("package");
                      setSaveOpen(false);
                      setPacotes([]);
                      setEtapa(0);
                      setEtapasVisitadas(new Set([0]));
                    }}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-stone-500 hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <RotateCcw size={15} /> Começar de novo
                  </button>
                  <span className="text-xs text-stone-500">
                    Motor {preparation.result.engineVersion} · release{" "}
                    {preparation.result.provenance.releaseId}
                  </span>
                </div>

                {saveOpen ? (
                  <GuardarCenario
                    snapshot={montarSnapshot(
                      state,
                      preparation.result.engineVersion,
                      preparation.result.provenance.releaseId,
                      hoje,
                    )}
                    result={preparation.result}
                    onClose={() => setSaveOpen(false)}
                  />
                ) : null}
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-alert-border bg-alert-bg p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <Warning size={19} className="mt-0.5 flex-none text-alert-text" />
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold text-alert-text">
                    {preparation.kind === "unsupported"
                      ? "Isto está fora do que o motor sabe calcular"
                      : "Falta confirmar antes de calcular"}
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-alert-text">
                    {preparation.kind === "needs_input"
                      ? preparation.missing.map((item) => (
                          <li key={`${item.path}-${item.reason}`}>{item.reason}</li>
                        ))
                      : preparation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                  <p className="mt-3 text-sm leading-relaxed text-alert-text/85">
                    Preferimos parar aqui a devolver um número aproximado que parecesse uma resposta.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : null}

      <ContabilistasNoResultado
        pronto={state.calculated && preparation?.kind === "ready"}
      />
      {state.calculated && preparation?.kind === "ready" ? (
        <p className="sr-only" aria-live="polite">
          {preparation.result.status.headline} Custo anual recorrente de{" "}
          {eur(preparation.result.employerCost.annualStabilized.cents)}.
        </p>
      ) : null}
    </div>
  );
}
