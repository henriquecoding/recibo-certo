"use client";

import type { EmploymentOfferResult } from "../../../ReciboCerto-Fiscal-Engine/src";
import {
  ArrowRight,
  Building,
  Clock,
  ExternalLink,
  ShieldCheck,
  User,
  Warning,
} from "@/components/ui/Icons";
import { registar } from "@/lib/analytics/cliente";
import { contextoContratacao } from "@/lib/analytics/contratacao";
import { MESES, MESES_CURTOS, eur, eurRedondo, horas } from "./estado";

export type ResultTab =
  | "package"
  | "costs"
  | "calendar"
  | "capacity"
  | "supports"
  | "proposal"
  | "memory";

export const TABS: Array<{ value: ResultTab; label: string }> = [
  { value: "package", label: "Os três dinheiros" },
  { value: "costs", label: "Composição do custo" },
  { value: "calendar", label: "Calendário e caixa" },
  { value: "capacity", label: "Viabilidade" },
  { value: "supports", label: "Apoios" },
  { value: "proposal", label: "Proposta" },
  { value: "memory", label: "Memória de cálculo" },
];

function AmountLine({
  label,
  value,
  strong = false,
  nota,
}: {
  label: string;
  value: string;
  strong?: boolean;
  nota?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 ${strong ? "font-semibold text-stone-900 dark:text-white" : "text-stone-600 dark:text-stone-300"}`}>
      <span className="min-w-0 text-sm">
        {label}
        {nota ? <span className="mt-0.5 block text-xs font-normal text-stone-500">{nota}</span> : null}
      </span>
      <span className="flex-none text-sm tabular-nums">{value}</span>
    </div>
  );
}

function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900 sm:p-5">
      <h3 className="font-display text-lg font-semibold text-ink">{titulo}</h3>
      {children}
    </section>
  );
}

function textoLiquidoMensal(result: EmploymentOfferResult): string {
  const worker = result.workerOutcome;
  return worker.kind === "personalized_projection"
    ? eur(worker.monthlyReference.cents)
    : `${eur(worker.monthlyReference.min.cents)} – ${eur(worker.monthlyReference.max.cents)}`;
}

function TresDinheiros({ result }: { result: EmploymentOfferResult }) {
  const { breakdown } = result.employerCost;
  const worker = result.workerOutcome;
  const charges = result.publicCharges;
  const totalEstado = "min" in charges.total
    ? `${eur(charges.total.min.cents)} – ${eur(charges.total.max.cents)}`
    : eur(charges.total.cents);
  const irs = "min" in charges.irsWithheld
    ? `${eur(charges.irsWithheld.min.cents)} – ${eur(charges.irsWithheld.max.cents)}`
    : eur(charges.irsWithheld.cents);
  const liquidoAnual = worker.kind === "personalized_projection"
    ? eur(worker.annualNet.cents)
    : `${eur(worker.annualNet.min.cents)} – ${eur(worker.annualNet.max.cents)}`;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-stone-100">
          <Building size={17} className="text-brand" /> Sai da empresa
        </div>
        <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
          <AmountLine label="Remuneração em dinheiro" value={eur(breakdown.cashCompensation.cents)} />
          <AmountLine label="Subsídio de refeição" value={eur(breakdown.mealAllowance.cents)} />
          <AmountLine
            label="Segurança Social da empresa"
            value={eur(breakdown.employerSocialSecurity.cents)}
            nota="encargo da entidade, não desconto do trabalhador"
          />
          <AmountLine
            label="Custos do posto"
            value={eur(
              breakdown.accidentInsurance.cents
              + breakdown.healthAndSafety.cents
              + breakdown.training.cents
              + breakdown.software.cents
              + breakdown.remoteWork.cents
              + breakdown.other.cents,
            )}
            nota="seguro, SST, formação, software e outros"
          />
          <AmountLine label="Custo anual recorrente" value={eur(result.employerCost.annualStabilized.cents)} strong />
        </div>
      </section>

      <section className="rounded-2xl border border-brand/30 bg-brand-light/70 p-5 dark:bg-brand/15">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-dark dark:text-brand-mint">
          <User size={17} /> Chega ao trabalhador
        </div>
        <p className="mt-5 break-words font-display text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
          {textoLiquidoMensal(result)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          líquido mensal de referência
        </p>
        <div className="mt-5 space-y-2 border-t border-brand/20 pt-4 text-sm text-stone-600 dark:text-stone-300">
          <p>Bruto anual: <strong className="tabular-nums text-stone-900 dark:text-white">{eur(worker.annualGross.cents)}</strong></p>
          <p>Líquido anual: <strong className="tabular-nums text-stone-900 dark:text-white">{liquidoAnual}</strong></p>
        </div>
        {worker.kind === "reference_scenarios" ? (
          <div className="mt-4 rounded-xl bg-white/70 p-3 text-xs leading-relaxed text-stone-600 dark:bg-stone-900/60 dark:text-stone-300">
            <p className="font-semibold text-stone-800 dark:text-stone-100">
              Cenários comparados ({worker.profilesEvaluated})
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {worker.scenarioLabels.map((label) => <li key={label}>{label}</li>)}
            </ul>
            <p className="mt-2">
              Não é um envelope universal: incapacidade e IRS Jovem exigem factos e invocação própria.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-brand-dark bg-brand-dark p-5 text-white">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck size={17} className="text-brand-mint" /> Segue para o Estado
        </div>
        <p className="mt-5 break-words font-display text-2xl font-semibold tabular-nums sm:text-3xl">{totalEstado}</p>
        <p className="mt-2 text-sm leading-relaxed text-brand-light">por ano, no cenário estabilizado</p>
        <div className="mt-5 space-y-2 border-t border-white/15 pt-4 text-sm text-brand-light">
          <p>Contribuição da empresa: <strong className="tabular-nums text-white">{eur(charges.employerSocialSecurity.cents)}</strong></p>
          <p>Retido ao trabalhador (SS): <strong className="tabular-nums text-white">{eur(charges.employeeSocialSecurity.cents)}</strong></p>
          <p>Retido ao trabalhador (IRS): <strong className="tabular-nums text-white">{irs}</strong></p>
          <p className="pt-1 text-xs">A retenção não é o IRS anual final: é adiantamento por conta.</p>
        </div>
      </section>
    </div>
  );
}

const ROTULO_CONHECIMENTO: Record<string, string> = {
  "accident-insurance": "Seguro de acidentes de trabalho",
  "health-and-safety": "Saúde e segurança no trabalho",
  training: "Formação externa",
  equipment: "Equipamento e EPI",
  recruitment: "Recrutamento",
  software: "Software e licenças",
  "remote-work": "Trabalho remoto",
  other: "Outros custos do posto",
};

function ComposicaoCusto({ result }: { result: EmploymentOfferResult }) {
  const cost = result.employerCost;
  const resumo = cost.postCostSummary;
  const temIntervalo = cost.annualRange.high.cents > cost.annualRange.low.cents;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Painel titulo="Totais por nível de conhecimento">
        <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          O que já está confirmado, o que ainda é estimativa e o que continua por preencher — para o
          total não parecer mais firme do que é.
        </p>
        <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
          <AmountLine label="Total confirmado" value={eur(cost.annualConfirmed.cents)} strong />
          <AmountLine
            label="Total com estimativas"
            value={temIntervalo
              ? `${eur(cost.annualRange.low.cents)} – ${eur(cost.annualRange.high.cents)}`
              : eur(cost.annualRange.low.cents)}
          />
          <AmountLine
            label="Parcelas por confirmar"
            value={String(resumo.unknownIds.length)}
            nota={resumo.unknownIds.map((id) => ROTULO_CONHECIMENTO[id] ?? id).join(", ") || "nenhuma"}
          />
          <AmountLine
            label="Parcelas fora do cálculo"
            value={String(resumo.notApplicableIds.length)}
            nota={resumo.notApplicableIds.map((id) => ROTULO_CONHECIMENTO[id] ?? id).join(", ") || "nenhuma"}
          />
        </div>
      </Painel>

      <Painel titulo="Parcela a parcela, no ano recorrente">
        <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
          <AmountLine label="Seguro de acidentes" value={eur(cost.breakdown.accidentInsurance.cents)} />
          <AmountLine label="Saúde e segurança" value={eur(cost.breakdown.healthAndSafety.cents)} />
          <AmountLine label="Formação externa" value={eur(cost.breakdown.training.cents)} />
          <AmountLine label="Software e licenças" value={eur(cost.breakdown.software.cents)} />
          <AmountLine label="Trabalho remoto" value={eur(cost.breakdown.remoteWork.cents)} />
          <AmountLine label="Outros custos" value={eur(cost.breakdown.other.cents)} />
          <AmountLine label="Benefícios" value={eur(cost.breakdown.benefits.cents)} />
        </div>
        <div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-600 dark:bg-stone-800/60 dark:text-stone-300">
          <p className="font-semibold text-stone-800 dark:text-stone-100">Só no arranque</p>
          <p className="mt-1">
            Equipamento {eur(cost.breakdown.equipment.cents)} · Recrutamento {eur(cost.breakdown.recruitment.cents)}.
            Não entram no ano recorrente; entram no mês em que pesam na tesouraria.
          </p>
        </div>
      </Painel>
    </div>
  );
}

function Calendario({ result }: { result: EmploymentOfferResult }) {
  const cost = result.employerCost;
  const anos = [...new Set(result.calendar.map((month) => month.year))];
  const pico = cost.peakMonth;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <p className="texto-micro font-bold uppercase tracking-[.12em] text-stone-500">Ano civil de entrada</p>
          <p className="mt-1.5 font-display text-xl font-semibold tabular-nums text-ink">{eur(cost.firstCalendarYear.cents)}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">{cost.monthsWorkedFirstYear} meses ativos, com os custos de arranque</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <p className="texto-micro font-bold uppercase tracking-[.12em] text-stone-500">Primeiros 12 meses</p>
          <p className="mt-1.5 font-display text-xl font-semibold tabular-nums text-ink">{eur(cost.firstTwelveMonths.cents)}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">o que a tesouraria aguenta desde a entrada</p>
        </div>
        <div className="rounded-2xl border border-brand/30 bg-brand-light/60 p-4 dark:bg-brand/10">
          <p className="texto-micro font-bold uppercase tracking-[.12em] text-brand-dark dark:text-brand-mint">Ano estabilizado</p>
          <p className="mt-1.5 font-display text-xl font-semibold tabular-nums text-ink">{eur(cost.annualStabilized.cents)}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300">recorrente, sem custos únicos</p>
        </div>
      </div>

      {pico ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-alert-border bg-alert-bg p-3 text-sm leading-relaxed text-alert-text">
          <Warning size={15} className="mt-0.5 flex-none" />
          <span>
            O mês mais pesado é {MESES[pico.month - 1]} de {pico.year}, com {eur(pico.amount.cents)}.
            Causa: {pico.labels.filter((label) => label !== "Vencimento e pacote mensal").join("; ").toLowerCase() || "vencimento e pacote mensal"}.
          </span>
        </p>
      ) : null}

      {anos.map((ano) => (
        <div key={ano} className="mt-5">
          <h3 className="font-display text-lg font-semibold text-ink">{ano}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {result.calendar.filter((month) => month.year === ano).map((month) => {
              const destaque = pico && pico.year === month.year && pico.month === month.month;
              // Um mês inativo distingue-se pelo fundo e pela borda, não por
              // `opacity`: baixar a opacidade do cartão inteiro dilui a tinta
              // contra o papel e leva o contraste do texto com ela — três
              // textos por cartão caíam abaixo de 4,5:1.
              return (
                <div
                  key={`${month.year}-${month.month}`}
                  className={`rounded-xl border p-3 ${
                    destaque
                      ? "border-alert-border bg-alert-bg"
                      : month.active
                        ? "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
                        : "border-dashed border-stone-300 bg-stone-100 dark:border-stone-700 dark:bg-stone-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-bold ${month.active ? "text-stone-700 dark:text-stone-200" : "text-stone-600 dark:text-stone-400"}`}>
                      {MESES_CURTOS[month.month - 1]}
                    </span>
                    {month.active && month.labels.length > 1 ? (
                      <span className="h-2 w-2 flex-none rounded-full bg-brand" aria-hidden />
                    ) : null}
                  </div>
                  <p className={`mt-3 text-sm font-semibold tabular-nums ${month.active ? "text-stone-900 dark:text-white" : "text-stone-600 dark:text-stone-400"}`}>
                    {eurRedondo(month.employerCost.cents)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                    {month.active
                      ? month.labels.filter((label) => label !== "Vencimento e pacote mensal").join(" · ").toLowerCase() || "mês normal"
                      : month.labels[0]?.toLowerCase()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="mt-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        O subsídio de férias é pago no mês do gozo declarado e o de Natal em dezembro. Os custos
        recorrentes são rateados pelos meses ativos; os de arranque aparecem uma vez, no mês em que
        saem da conta.
      </p>
    </div>
  );
}

function Viabilidade({ result }: { result: EmploymentOfferResult }) {
  const capacity = result.capacity;
  if (!capacity) {
    return (
      <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Marcaste este posto como não produtivo. A contratação continua calculada, mas não é
        convertida em horas nem em receita.
      </p>
    );
  }
  const falta = capacity.capacityGapDirection === "shortfall";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Painel titulo="De horas pagas a horas produtivas">
        <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
          <AmountLine label="Horas pagas no ano" value={horas(capacity.paidHoursHundredths)} />
          <AmountLine label="menos feriados em dia de trabalho" value={`− ${horas(capacity.holidayHoursHundredths)}`} />
          <AmountLine label="menos férias" value={`− ${horas(capacity.vacationHoursHundredths)}`} />
          <AmountLine label="menos formação contínua" value={`− ${horas(capacity.trainingHoursHundredths)}`} nota="Código do Trabalho, artigo 131.º: mínimo de 40 horas por ano" />
          {capacity.onboardingHoursHundredths > 0 ? (
            <AmountLine label="menos integração" value={`− ${horas(capacity.onboardingHoursHundredths)}`} />
          ) : null}
          <AmountLine label="Horas disponíveis" value={horas(capacity.annualAvailableHoursHundredths)} strong />
          <AmountLine label="Horas produtivas" value={horas(capacity.annualProductiveHoursHundredths)} strong nota="depois da fração faturável" />
          <AmountLine
            label="Custo por hora produtiva"
            value={capacity.costPerProductiveHour ? eur(capacity.costPerProductiveHour.cents) : "—"}
            strong
          />
        </div>
      </Painel>

      <div className="space-y-4">
        <div className={`rounded-2xl border p-5 ${falta ? "border-alert-border bg-alert-bg" : "border-brand/30 bg-brand-light dark:bg-brand/15"}`}>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Clock size={17} className="text-brand" /> O que o posto tem de gerar
          </h3>
          <p className="mt-3 break-words font-display text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
            {capacity.billableHoursRequired !== null
              ? `${capacity.billableHoursRequired.toLocaleString("pt-PT")} h`
              : "—"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {capacity.contributionPerBillableHour
              ? `Cada hora vendida deixa ${eur(capacity.contributionPerBillableHour.cents)} de contribuição — é essa margem que paga o posto, não o preço.`
              : "Indica preço por hora e margem de contribuição para converter o custo em horas."}
          </p>
          {capacity.revenueRequired ? (
            <p className="mt-3 border-t border-brand/20 pt-3 text-sm text-stone-600 dark:text-stone-300">
              Receita anual necessária: <strong className="tabular-nums text-stone-900 dark:text-white">{eur(capacity.revenueRequired.cents)}</strong>
            </p>
          ) : null}
          {capacity.capacityGapHours !== null ? (
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {capacity.capacityGapDirection === "surplus"
                ? `Folga estimada de ${capacity.capacityGapHours.toLocaleString("pt-PT")} horas por ano face à expectativa.`
                : `Faltam ${Math.abs(capacity.capacityGapHours).toLocaleString("pt-PT")} horas por ano para o posto se pagar.`}
            </p>
          ) : null}
        </div>

        {capacity.notes.length > 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">O que ainda não fecha</p>
            <ul className="mt-2 space-y-2">
              {capacity.notes.map((nota) => (
                <li key={nota} className="flex gap-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  <Warning size={14} className="mt-1 flex-none text-clay-text" />
                  <span>{nota}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Apoios({ result }: { result: EmploymentOfferResult }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-clay-border bg-clay-bg p-4 text-sm leading-relaxed text-clay-text">
        Nenhum apoio é abatido ao custo. A ferramenta apenas faz triagem; aprovação, dotação e
        candidatura continuam a depender do IEFP.
      </div>
      {result.supports.map((support) => (
        <article key={support.id} className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-ink">{support.name}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${support.status === "potential" ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"}`}>
              {support.status === "potential"
                ? "Compatibilidade potencial"
                : support.status === "needs_input"
                  ? "Faltam respostas"
                  : support.status === "window_closed"
                    ? "Janela conhecida fechada"
                    : "Não aplicável"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{support.explanation}</p>
          {support.missingFacts.length > 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              Falta confirmar: {support.missingFacts.join(", ")}.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-stone-500">Verificado em {support.verifiedAt}.</p>
          <a
            href={support.sourceUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => registar("hiring_support_opened", {
              ...contextoContratacao("ferramenta"),
              support_id: support.id,
            })}
            className="mt-3 inline-flex min-h-[40px] items-center text-sm font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
          >
            Confirmar no IEFP <ArrowRight size={13} className="ml-1" />
          </a>
        </article>
      ))}
    </div>
  );
}

function Proposta({ result }: { result: EmploymentOfferResult }) {
  const permitido = result.status.verdictAllowed;
  return (
    <div className="rounded-2xl border border-brand/30 bg-brand-light/60 p-5 dark:bg-brand/10 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-brand">Resumo para conversar com o candidato</p>
      <h3 className="mt-3 font-display text-2xl font-semibold text-ink">
        Proposta-base de {eur(result.resolvedBaseSalaryMonthly.cents)} por mês
      </h3>
      {!permitido ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-alert-border bg-alert-bg p-3 text-sm leading-relaxed text-alert-text">
          <Warning size={15} className="mt-0.5 flex-none" />
          Este resumo ainda não é uma proposta defensável: há custos obrigatórios por confirmar. O
          valor pode subir depois de os fechares.
        </p>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <p className="texto-micro font-bold uppercase tracking-[.12em] text-stone-500">Líquido provável</p>
          <p className="mt-1.5 break-words font-display text-lg font-semibold tabular-nums text-ink">{textoLiquidoMensal(result)}</p>
          <p className="mt-1 text-xs text-stone-500">
            {result.projection === "personalized_projection" ? "com factos autorizados" : "cenários de referência"}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <p className="texto-micro font-bold uppercase tracking-[.12em] text-stone-500">Refeição</p>
          <p className="mt-1.5 break-words font-display text-lg font-semibold tabular-nums text-ink">
            {eur(result.employerCost.breakdown.mealAllowance.cents)}
          </p>
          <p className="mt-1 text-xs text-stone-500">{result.workCalendar.mealEligibleDays} dias elegíveis por ano</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <p className="texto-micro font-bold uppercase tracking-[.12em] text-stone-500">Subsídios</p>
          <p className="mt-1.5 break-words font-display text-lg font-semibold tabular-nums text-ink">14 pagamentos</p>
          <p className="mt-1 text-xs text-stone-500">férias e Natal incluídos no ano</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        Apresenta bruto, subsídio de refeição e componentes variáveis em separado. O líquido é uma
        projeção fiscal e deve ser afinado com os factos que o candidato autorizar a usar. Este
        resumo não inclui o teu orçamento interno nem a margem.
      </p>
    </div>
  );
}

const UNIDADES: Record<string, (valor: number) => string> = {
  EUR_CENTS: (valor) => eur(valor),
  PPM: (valor) => `${(valor / 10_000).toLocaleString("pt-PT", { maximumFractionDigits: 2 })} %`,
  COUNT: (valor) => valor.toLocaleString("pt-PT"),
};

function valorDoOperando(valor: string | number | boolean, unidade?: string): string {
  if (typeof valor !== "number") return String(valor);
  const formatador = unidade ? UNIDADES[unidade] : undefined;
  return formatador ? formatador(valor) : valor.toLocaleString("pt-PT");
}

/** Nem todos os passos devolvem dinheiro: dias e horas não levam o símbolo €. */
const PASSOS_EM_CONTAGEM = ["days", "vacation", "hours"];

function resultadoDoPasso(id: string, resultado: string | number | boolean): string {
  if (typeof resultado !== "number") return String(resultado);
  return PASSOS_EM_CONTAGEM.some((marca) => id.includes(marca))
    ? resultado.toLocaleString("pt-PT")
    : eur(resultado);
}

function Memoria({ result }: { result: EmploymentOfferResult }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Cada total abaixo tem fórmula, operandos, regra de arredondamento e fonte. É o mesmo registo
        que o motor produz para o simulador de vencimento — nada aqui é recalculado no browser.
      </p>
      <ol className="space-y-3">
        {result.trace.map((step) => (
          <li key={step.id} className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{step.label}</p>
            {step.formula ? (
              <p className="mt-1.5 break-words rounded-lg bg-stone-50 px-3 py-2 font-mono text-xs leading-relaxed text-stone-600 dark:bg-stone-800/60 dark:text-stone-300">
                {step.formula}
              </p>
            ) : null}
            {step.operands && step.operands.length > 0 ? (
              <dl className="mt-2.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {step.operands.map((operand) => (
                  <div key={operand.name} className="flex items-baseline justify-between gap-3 text-xs">
                    <dt className="min-w-0 text-stone-500">{operand.name.replace(/_/g, " ")}</dt>
                    <dd className="flex-none font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                      {valorDoOperando(operand.value, operand.unit)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-100 pt-2.5 text-xs text-stone-500 dark:border-stone-800">
              {step.result !== undefined ? (
                <span>
                  Resultado:{" "}
                  <strong className="tabular-nums text-stone-700 dark:text-stone-200">
                    {resultadoDoPasso(step.id, step.result)}
                  </strong>
                </span>
              ) : null}
              {step.rounding ? <span>Arredondamento: {step.rounding.replace(/_/g, " ")}</span> : null}
            </p>
          </li>
        ))}
      </ol>

      <Painel titulo="Fontes e versão">
        <ul className="mt-3 space-y-1.5">
          {result.citations.map((citation) => (
            <li key={citation} className="break-words text-sm text-stone-600 dark:text-stone-300">
              {citation.startsWith("http") ? (
                <a
                  href={citation}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1 font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
                >
                  {citation} <ExternalLink size={12} />
                </a>
              ) : (
                citation
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800">
          Motor {result.engineVersion} · política verificada em {result.policyDate}
        </p>
      </Painel>
    </div>
  );
}

export default function ResultadoContratacao({
  result,
  tab,
}: {
  result: EmploymentOfferResult;
  tab: ResultTab;
}) {
  switch (tab) {
    case "costs":
      return <ComposicaoCusto result={result} />;
    case "calendar":
      return <Calendario result={result} />;
    case "capacity":
      return <Viabilidade result={result} />;
    case "supports":
      return <Apoios result={result} />;
    case "proposal":
      return <Proposta result={result} />;
    case "memory":
      return <Memoria result={result} />;
    default:
      return <TresDinheiros result={result} />;
  }
}
