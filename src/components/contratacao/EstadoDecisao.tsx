"use client";

import type {
  EmploymentDecisionReadiness,
  EmploymentOfferResult,
} from "../../../ReciboCerto-Fiscal-Engine/src";
import { Check, Sparkle, Warning } from "@/components/ui/Icons";
import { eur } from "./estado";

interface Tom {
  eyebrow: string;
  fundo: string;
  texto: string;
  cartao: string;
  detalhe: string;
  /** Rótulo e legenda do cartão. Cores explícitas, nunca opacidade. */
  cartaoRotulo: string;
  cartaoLegenda: string;
}

// Uma nota que custou uma medição: `opacity-*` num texto dilui a tinta contra
// o fundo e leva o contraste com ela. Sobre o verde escuro isso é indiferente
// (branco a 75% ainda está muito acima de 4,5:1); sobre o amarelo do estado
// incompleto punha nove textos entre 3,5 e 4,3. As cores destes cartões são
// tokens explícitos, e é por isso que são quatro campos em vez de dois.
const TOM: Record<EmploymentDecisionReadiness, Tom> = {
  incomplete: {
    eyebrow: "Decisão incompleta",
    fundo: "bg-alert-bg",
    texto: "text-alert-text",
    cartao: "border-alert-border bg-white/70 text-alert-text dark:bg-stone-900/60",
    detalhe: "text-alert-text",
    cartaoRotulo: "text-alert-text",
    cartaoLegenda: "text-alert-text",
  },
  estimated: {
    eyebrow: "Estimativa · regras 2026",
    fundo: "bg-brand-deep",
    texto: "text-white",
    cartao: "border-white/15 bg-white/10 text-white",
    detalhe: "text-brand-light",
    cartaoRotulo: "text-brand-mint",
    cartaoLegenda: "text-brand-light",
  },
  personalized: {
    eyebrow: "Projeção personalizada · regras 2026",
    fundo: "bg-brand-dark",
    texto: "text-white",
    cartao: "border-white/15 bg-white/10 text-white",
    detalhe: "text-brand-light",
    cartaoRotulo: "text-brand-mint",
    cartaoLegenda: "text-brand-light",
  },
  validated: {
    eyebrow: "Cenário validado · regras 2026",
    fundo: "bg-brand-dark",
    texto: "text-white",
    cartao: "border-white/15 bg-white/10 text-white",
    detalhe: "text-brand-light",
    cartaoRotulo: "text-brand-mint",
    cartaoLegenda: "text-brand-light",
  },
};

const SUBTITULO: Record<EmploymentDecisionReadiness, string> = {
  incomplete:
    "Falta pelo menos um custo obrigatório. Os números abaixo são o que já se sabe — não são um veredicto.",
  estimated:
    "Custo, líquido e capacidade continuam a ser três números diferentes. Há valores estimados: a conclusão vale o que valem eles.",
  personalized:
    "Os custos críticos estão confirmados e os factos do candidato foram autorizados. Continua a ser uma simulação, não uma folha de vencimento.",
  validated:
    "Revisto por ti, com esta versão do motor e esta política. Se algum dado mudar, a revisão cai.",
};

function Cartao({
  label,
  value,
  detail,
  tom,
  incompleto,
}: {
  label: string;
  value: string;
  detail: string;
  tom: Tom;
  incompleto?: boolean;
}) {
  // Duas correções que só se veem com os quatro cartões lado a lado:
  //
  // · `flex-col` + `mt-auto` na legenda — os cartões esticam à altura do mais
  //   alto, e sem isto as legendas ficavam a meio, cada uma a uma altura.
  // · O tamanho do valor desce quando ele é um INTERVALO («1777,56 € –
  //   1969,08 €»). A 24px isso quebrava em duas linhas e empurrava os outros
  //   três cartões 40px para baixo por causa de um só.
  const valorLongo = value.length > 15;
  return (
    <div className={`flex min-w-0 flex-col rounded-2xl border p-4 ${tom.cartao}`}>
      <p className={`texto-micro font-bold uppercase tracking-[.12em] ${tom.cartaoRotulo}`}>{label}</p>
      <p
        className={`mt-2 break-words font-display font-semibold leading-tight tabular-nums ${
          valorLongo ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
        }`}
      >
        {value}
        {incompleto ? <span aria-hidden className="align-super text-sm"> +</span> : null}
      </p>
      <p className={`mt-auto pt-2 text-xs leading-relaxed ${tom.cartaoLegenda}`}>{detail}</p>
    </div>
  );
}

function textoLiquido(result: EmploymentOfferResult): string {
  const worker = result.workerOutcome;
  return worker.kind === "personalized_projection"
    ? eur(worker.monthlyReference.cents)
    : `${eur(worker.monthlyReference.min.cents)} – ${eur(worker.monthlyReference.max.cents)}`;
}

/**
 * Cabeçalho da decisão. A cor, o ícone e a frase vêm todos do mesmo estado do
 * domínio: não há caminho para a copy dizer «cabe» enquanto o motor disser que
 * falta um custo obrigatório (relatório, CON-P0-20).
 */
export default function EstadoDecisao({
  result,
  acoes,
}: {
  result: EmploymentOfferResult;
  acoes?: React.ReactNode;
}) {
  const { status } = result;
  const tom = TOM[status.readiness];
  const incompleto = status.readiness === "incomplete";
  const Icone = incompleto ? Warning : status.readiness === "validated" ? Check : Sparkle;
  const cost = result.employerCost;
  const temIntervalo = cost.annualRange.high.cents > cost.annualRange.low.cents;

  return (
    <div className={`${tom.fundo} ${tom.texto} p-5 sm:p-7`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] ${incompleto ? "text-alert-text" : "text-brand-mint"}`}>
            <Icone size={14} className="flex-none" /> {tom.eyebrow}
          </p>
          <h2 className="mt-2 text-balance font-display text-2xl font-semibold leading-tight sm:text-3xl">
            {status.headline}
          </h2>
          <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${tom.detalhe}`}>
            {SUBTITULO[status.readiness]}
          </p>
        </div>
        {acoes ? (
          <div className="flex w-full flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap lg:w-auto lg:flex-none lg:justify-end">
            {acoes}
          </div>
        ) : null}
      </div>

      {status.blockingFacts.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-alert-border bg-white/70 p-4 dark:bg-stone-900/70">
          <p className="text-sm font-bold text-alert-text">
            {status.blockingFacts.length === 1
              ? "Falta resolver isto antes de haver conclusão:"
              : `Faltam resolver ${status.blockingFacts.length} pontos antes de haver conclusão:`}
          </p>
          <ul className="mt-2 space-y-1.5">
            {status.blockingFacts.map((facto) => (
              <li key={`${facto.path}-${facto.reason}`} className="flex gap-2 text-sm leading-relaxed text-alert-text">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-alert-text" />
                <span>{facto.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao
          label="Custo anual recorrente"
          value={eur(cost.annualStabilized.cents)}
          detail={
            temIntervalo
              ? `pode chegar a ${eur(cost.annualRange.high.cents)} com as estimativas no topo`
              : incompleto
                ? "só com as parcelas já conhecidas"
                : "ano estabilizado, sem custos de arranque"
          }
          tom={tom}
          incompleto={incompleto || temIntervalo}
        />
        <Cartao
          label="Vencimento base"
          value={eur(result.resolvedBaseSalaryMonthly.cents)}
          detail="mensal, em catorze pagamentos por ano"
          tom={tom}
        />
        <Cartao
          label="Líquido do trabalhador"
          value={textoLiquido(result)}
          detail={
            result.projection === "personalized_projection"
              ? "projeção com factos autorizados"
              : "quatro cenários de referência, sem dados pessoais"
          }
          tom={tom}
        />
        <Cartao
          label="Primeiros 12 meses"
          value={eur(cost.firstTwelveMonths.cents)}
          detail={`ano civil de entrada: ${eur(cost.firstCalendarYear.cents)} em ${cost.monthsWorkedFirstYear} meses`}
          tom={tom}
        />
      </div>
    </div>
  );
}
