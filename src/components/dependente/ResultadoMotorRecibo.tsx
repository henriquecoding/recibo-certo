"use client";

import { useState } from "react";
import { Building, Calculator, Check, Heart, Receipt, ShieldCheck, Warning, Wallet } from "@/components/ui/Icons";
import { SegBar, SegLegend, type Seg } from "@/components/dependente/ui";
import { fmt, pct } from "@/lib/format";
import {
  SS_DEPENDENTE,
  SUBSIDIO_REFEICAO,
  DEDUCAO_DEPENDENTE_DEFICIENCIA,
  RETENCAO_CONJUGE_DEFICIENTE,
  RETENCAO_DEP_DEFICIENTE,
  parcelaIncapacidadeFamiliar,
  type EstadoCivilRet,
} from "@/lib/fiscal-data";
import type { ReciboMensalResult, VencimentoAnualResult } from "@/lib/fiscal-dependente";
import type { PayrollDisplayLine } from "@/lib/payroll-simulator-legacy-adapter";

type ResultTab = "month" | "year" | "employer" | "memory";

const COR_IRS = "#9FE1CB"; // brand-mint — segmento do IRS
const CLS_SS = "text-brand-deep"; // Segurança Social / descontos — verde profundo

const TREATMENT = {
  subject: { label: "Sujeito", cls: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300" },
  partial: { label: "Parcial", cls: "bg-alert-bg text-alert-text border border-alert-border" },
  exempt: { label: "Isento", cls: "bg-brand-light text-brand-dark dark:bg-brand/10 dark:text-brand-light" },
  deduction: { label: "Desconto", cls: "bg-clay-bg text-clay-text" },
} as const;

function Metric({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${accent ? "border-brand/20 bg-brand-light/60 dark:bg-brand/10" : "border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900/50"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold tabular-nums ${accent ? "text-brand-dark dark:text-brand-light" : "text-stone-800 dark:text-stone-100"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-stone-400">{hint}</p>}
    </div>
  );
}

function TreatmentBadge({ treatment }: { treatment: PayrollDisplayLine["treatment"] }) {
  const item = TREATMENT[treatment];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${item.cls}`}>{item.label}</span>;
}

function MonthlyBreakdown({ lines, result, incapacidade }: { lines: readonly PayrollDisplayLine[]; result: ReciboMensalResult; incapacidade: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Bruto / caixa" value={fmt(result.brutoTotal)} />
        <Metric label="IRS retido" value={`− ${fmt(result.irsTotal)}`} />
        <Metric label="Segurança Social" value={`− ${fmt(result.ssTrabalhador)}`} hint={`sobre ${fmt(result.baseSS)}`} />
        <Metric label="Taxa efetiva" value={pct(result.taxaEfetiva)} hint="IRS + SS / rendimento sujeito" />
      </div>

      {incapacidade}

      <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/80 px-3.5 py-3 dark:border-stone-800 dark:bg-stone-950/30">
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-200">Impacto por rubrica</h4>
            <p className="mt-0.5 text-[11px] text-stone-400">O IRS é alocado sem alterar o total do recibo.</p>
          </div>
          <span className="flex-none rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-stone-400 shadow-sm dark:bg-stone-900">{lines.length} {lines.length === 1 ? "linha" : "linhas"}</span>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {lines.map((line) => (
            <div key={line.id} className="px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{line.label}</p>
                    <TreatmentBadge treatment={line.treatment} />
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-400">{line.detail ? `${line.detail} · ` : ""}{line.source}</p>
                </div>
                <p className={`flex-none text-sm font-semibold tabular-nums ${line.amount < 0 ? "text-clay-text" : "text-stone-800 dark:text-stone-100"}`}>{line.amount >= 0 ? "+ " : "− "}{fmt(Math.abs(line.amount))}</p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-stone-50 p-2 dark:bg-stone-800/50">
                <div><p className="text-[10px] uppercase tracking-wide text-stone-400">IRS</p><p className="mt-0.5 text-[11px] font-semibold tabular-nums text-stone-600 dark:text-stone-300">{line.irsWithheld >= 0 ? "−" : "+"} {fmt(Math.abs(line.irsWithheld))}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-stone-400">SS</p><p className="mt-0.5 text-[11px] font-semibold tabular-nums text-stone-600 dark:text-stone-300">{line.employeeSocialSecurity >= 0 ? "−" : "+"} {fmt(Math.abs(line.employeeSocialSecurity))}</p></div>
                <div className="text-right"><p className="text-[10px] uppercase tracking-wide text-stone-400">Líquido</p><p className={`mt-0.5 text-[11px] font-semibold tabular-nums ${line.netImpact >= 0 ? "text-brand-dark dark:text-brand-light" : "text-clay-text"}`}>{line.netImpact >= 0 ? "+" : "−"} {fmt(Math.abs(line.netImpact))}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnnualBreakdown({ annual, hasMonthlyExtras, duodecimos, dependentesDeficientes }: { annual: VencimentoAnualResult; hasMonthlyExtras: boolean; duodecimos: boolean; dependentesDeficientes: number }) {
  const segs: Seg[] = [
    { label: "Líquido", value: annual.liquidoAnual, brand: true },
    { label: "IRS", value: annual.irsAnual, color: COR_IRS },
    { label: "Segurança Social", value: annual.ssAnual, cls: CLS_SS },
  ];
  const deducaoDefic = Math.round(dependentesDeficientes * DEDUCAO_DEPENDENTE_DEFICIENCIA.value * 100) / 100;
  const refeicaoTributada = annual.subsidioRefeicaoTributadoAnual;
  return (
    <div className="space-y-4">
      {hasMonthlyExtras && (
        <div className="flex gap-2 rounded-2xl border border-alert-border bg-alert-bg p-3 text-[11px] leading-relaxed text-alert-text">
          <Warning size={13} className="mt-0.5 flex-none" /> A visão anual usa o salário-base, os dois subsídios e a refeição. Rubricas deste mês não são repetidas sem saber a periodicidade.
        </div>
      )}
      <div className="rounded-2xl border border-brand/20 bg-brand-light/60 p-4 dark:bg-brand/10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark/70 dark:text-brand-light/70">Líquido anual estimado</p>
        <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-brand-dark dark:text-brand-light">{fmt(annual.liquidoAnual)}</p>
        <p className="mt-1 text-[11px] text-brand-dark/70 dark:text-brand-light/70">{duodecimos ? `${fmt(annual.liquidoMedioMes)} de média por mês em duodécimos` : "12 salários + subsídio de férias + subsídio de Natal"}</p>
        <div className="mt-4"><SegBar segs={segs} /></div>
        <div className="mt-3"><SegLegend segs={segs} format={fmt} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Bruto anual" value={fmt(annual.brutoAnual)} />
        <Metric label="Média líquida" value={fmt(annual.liquidoMedioMes)} />
        <Metric label="IRS anual retido" value={fmt(annual.irsAnual)} />
        <Metric label="SS anual" value={fmt(annual.ssAnual)} />
      </div>
      <div className="rounded-2xl border border-stone-100 p-3.5 dark:border-stone-800">
        <div className="flex items-center justify-between text-xs"><span className="text-stone-500 dark:text-stone-400">IRS sobre salários (12×)</span><strong className="tabular-nums text-stone-700 dark:text-stone-200">{fmt(annual.irsSalario)}</strong></div>
        <div className="mt-2 flex items-center justify-between text-xs"><span className="text-stone-500 dark:text-stone-400">IRS sobre férias</span><strong className="tabular-nums text-stone-700 dark:text-stone-200">{fmt(annual.irsFerias)}</strong></div>
        <div className="mt-2 flex items-center justify-between text-xs"><span className="text-stone-500 dark:text-stone-400">IRS sobre Natal</span><strong className="tabular-nums text-stone-700 dark:text-stone-200">{fmt(annual.irsNatal)}</strong></div>
        {annual.subsidioRefeicaoAnual > 0 && (
          <div className="mt-2 flex items-center justify-between text-xs"><span className="text-stone-500 dark:text-stone-400">Subsídio de refeição no ano</span><strong className="tabular-nums text-stone-700 dark:text-stone-200">{fmt(annual.subsidioRefeicaoAnual)}</strong></div>
        )}
        {refeicaoTributada > 0 && (
          <p className="mt-2 text-[11px] leading-relaxed text-stone-400">Inclui {fmt(refeicaoTributada)} acima do limite diário, que entram nas bases de IRS e Segurança Social do ano — como em cada mês.</p>
        )}
      </div>
      {dependentesDeficientes > 0 && (
        <div className="flex gap-2.5 rounded-2xl border border-brand/20 bg-brand-light/50 p-3.5 dark:bg-brand/10">
          <Heart size={15} className="mt-0.5 flex-none text-brand" />
          <div>
            <p className="text-xs font-semibold text-brand-dark dark:text-brand-light">
              {dependentesDeficientes} dependente{dependentesDeficientes > 1 ? "s" : ""} com incapacidade ≥ 60%
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-brand-dark/75 dark:text-brand-light/75">
              A retenção mensal acima já reflete a parcela do Despacho 233-A/2026. <strong>Além disso</strong>, no acerto anual de IRS acresce {fmt(deducaoDefic)} de dedução à coleta (2,5 × IAS por dependente, Art. 87.º CIRS), até ao limite da coleta — não está incluída nestes números, que são de retenção.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Onde a incapacidade do agregado entra na retenção deste mês. Separa
 * explicitamente o que é RETENÇÃO (aqui) do que é dedução à coleta no
 * apuramento anual — a interface anterior misturava as duas coisas e chegava a
 * afirmar que a incapacidade de um dependente não altera a retenção mensal.
 */
function IncapacidadeRetencao({ estadoCivil, dependentesDeficientes, fator, conjugeDeficiente }: {
  estadoCivil: EstadoCivilRet;
  dependentesDeficientes: number;
  fator: number;
  conjugeDeficiente: boolean;
}) {
  const porDependente = estadoCivil === "casadoDois"
    ? RETENCAO_DEP_DEFICIENTE.value.casadoDois
    : RETENCAO_DEP_DEFICIENTE.value.naoCasadoOuUnico;
  const total = parcelaIncapacidadeFamiliar(estadoCivil, {
    dependentesDeficientes,
    fatorDependenteDeficiente: fator,
    conjugeDeficiente,
  });
  if (total <= 0) return null;
  return (
    <div className="rounded-2xl border border-brand/20 bg-brand-light/50 p-3.5 dark:bg-brand/10">
      <div className="flex items-center gap-2"><Heart size={15} className="flex-none text-brand" /><p className="text-xs font-semibold text-brand-dark dark:text-brand-light">Incapacidade no agregado — menos {fmt(total)} de IRS este mês</p></div>
      <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-brand-dark/75 dark:text-brand-light/75">
        {dependentesDeficientes > 0 && (
          <li>{dependentesDeficientes} dependente{dependentesDeficientes > 1 ? "s" : ""} × {fmt(porDependente)}{fator > 1 ? ` × fator ${fator}` : ""} acresce à parcela a abater (n.º 5 al. a) e n.º 6).</li>
        )}
        {conjugeDeficiente && <li>Cônjuge sem rendimentos das categorias A ou H: mais {fmt(RETENCAO_CONJUGE_DEFICIENTE.value)} (n.º 5 al. b).</li>}
      </ul>
    </div>
  );
}

function EmployerBreakdown({ result, cost }: { result: ReciboMensalResult; cost: number }) {
  const employerSS = Math.round(result.baseSS * SS_DEPENDENTE.entidade.value * 100) / 100;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-ink p-5 text-white dark:bg-stone-800">
        {/* Chamar-lhe «custo total» prometia mais do que o número contém: fica
            de fora o seguro obrigatório de acidentes de trabalho (estimado à
            parte), formação e custos indiretos. O nome passa a dizer o que é. */}
        <div className="flex items-center gap-2 text-white/70"><Building size={15} /><span className="text-[11px] font-semibold uppercase tracking-wide">Custo salarial direto — regime geral</span></div>
        <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{fmt(cost)}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/60">Tudo o que recebes mais a contribuição patronal do regime geral. NÃO inclui o seguro obrigatório de acidentes de trabalho ({fmt(result.seguroAcidentesEstimado)} estimados), formação nem outros custos indiretos.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Remunerações e abonos" value={fmt(result.brutoTotal)} />
        <Metric label="SS da empresa" value={fmt(employerSS)} hint={`${pct(SS_DEPENDENTE.entidade.value)} sobre ${fmt(result.baseSS)}`} />
        <Metric label="Custo / líquido" value={result.liquido > 0 ? `${(cost / result.liquido).toFixed(2).replace(".", ",")}×` : "—"} />
        <Metric label="Com seguro estimado" value={fmt(result.custoEmpresaComSeguro)} hint="estimativa: o prémio depende da atividade e da seguradora" />
      </div>
    </div>
  );
}

function Memory({ result }: { result: ReciboMensalResult }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3 rounded-2xl border border-brand/20 bg-brand-light/50 p-3.5 dark:bg-brand/10">
        <ShieldCheck size={17} className="mt-0.5 flex-none text-brand" />
        <div><p className="text-xs font-semibold text-brand-dark dark:text-brand-light">Memória do cálculo</p><p className="mt-1 text-[11px] leading-relaxed text-brand-dark/70 dark:text-brand-light/70">Mostra as bases usadas; não transforma uma estimativa em recibo oficial.</p></div>
      </div>
      {[
        ["Retribuição horária", "(remuneração mensal × 12) ÷ (52 × horas semanais)", fmt(result.retribuicaoHoraria), "CT art. 271.º"],
        ["Base mensal de IRS", "base remunerada + remunerações + excessos sujeitos", fmt(Math.max(0, result.baseRemunerada + result.premio + result.outrosSujeitos + result.ajudasTributadas + result.subsidioRefeicaoTributado)), "CIRS arts. 2.º e 99.º-C"],
        ["Base da Segurança Social", "soma das rubricas contributivas", fmt(result.baseSS), "CRC arts. 44.º–48.º"],
        ["Retenção total", "mensal + suplementar autónomo + subsídios autónomos", fmt(result.irsTotal), "Despacho 233-A/2026"],
      ].map(([label, formula, value, source]) => (
        <div key={label} className="rounded-2xl border border-stone-100 p-3.5 dark:border-stone-800">
          <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{label}</p><strong className="text-xs tabular-nums text-stone-800 dark:text-stone-100">{value}</strong></div>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-stone-50 px-2.5 py-2 text-[10px] leading-relaxed text-stone-500 dark:bg-stone-800 dark:text-stone-400">{formula}</code>
          <p className="mt-1.5 text-[10px] text-stone-400">{source}</p>
        </div>
      ))}
      <div className="rounded-2xl border border-stone-100 p-3.5 text-[11px] leading-relaxed text-stone-400 dark:border-stone-800">
        Refeição: {fmt(SUBSIDIO_REFEICAO.dinheiro.value)}/dia em dinheiro ou {fmt(SUBSIDIO_REFEICAO.cartao.value)}/dia em cartão. O excesso integra IRS e SS.
      </div>
    </div>
  );
}

export function ResultadoMotorRecibo({ result, lines, annual, employerCost, hasMonthlyExtras, duodecimos, issues, targetGross, dependentesDeficientes = 0, fatorDependentesDeficientes = 1, conjugeDeficiente = false, estadoCivil = "naoCasado" }: {
  result: ReciboMensalResult;
  lines: readonly PayrollDisplayLine[];
  annual: VencimentoAnualResult;
  employerCost: number;
  hasMonthlyExtras: boolean;
  duodecimos: boolean;
  issues: readonly string[];
  targetGross?: number;
  dependentesDeficientes?: number;
  fatorDependentesDeficientes?: number;
  conjugeDeficiente?: boolean;
  estadoCivil?: EstadoCivilRet;
}) {
  const [tab, setTab] = useState<ResultTab>("month");
  const stay = Math.max(0, result.liquido);
  const ratio = result.brutoTotal > 0 ? result.liquido / result.brutoTotal : 0;
  const distribution: Seg[] = [
    { label: "Fica contigo", value: stay, brand: true },
    { label: "Retenção IRS", value: result.irsTotal, color: COR_IRS },
    { label: "Segurança Social", value: result.ssTrabalhador, cls: CLS_SS },
  ];
  const tabs: { id: ResultTab; label: string; icon: React.ReactNode }[] = [
    { id: "month", label: "Mês", icon: <Receipt size={13} /> },
    { id: "year", label: "Ano", icon: <Wallet size={13} /> },
    { id: "employer", label: "Empresa", icon: <Building size={13} /> },
    { id: "memory", label: "Cálculo", icon: <Calculator size={13} /> },
  ];

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900">
        {/* Hero — líquido estimado. Wash quente da marca com brilho difuso e
            donut prominente: premium por contenção, sem gradiente saturado. */}
        <div className="relative overflow-hidden border-b border-brand/15 bg-gradient-to-br from-brand-light via-brand-light/60 to-white p-5 dark:border-brand/20 dark:from-brand/15 dark:via-brand/8 dark:to-stone-900 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-brand/10 blur-3xl dark:bg-brand/25" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-44 w-44 rounded-full bg-brand-mint/20 blur-3xl dark:bg-brand/10" aria-hidden />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-dark dark:text-brand-light"><Check size={13} /> Líquido estimado</p>
            <p className="mt-2 font-display text-[2.6rem] font-semibold leading-none tabular-nums text-brand-dark dark:text-brand-light sm:text-5xl">{fmt(result.liquido)}</p>
            <p className="mt-2.5 text-xs text-stone-500 dark:text-stone-400">a receber neste mês</p>
            {targetGross !== undefined && (
              <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-brand-dark shadow-sm backdrop-blur-sm dark:bg-stone-900/70 dark:text-brand-light">
                <Wallet size={11} /> Bruto necessário: {fmt(targetGross)}
              </p>
            )}
            {/* Repartição: a percentagem que fica contigo passa a rotular a
                própria barra segmentada — sem gráfico circular. */}
            <div className="mt-6">
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold leading-none tabular-nums text-brand-dark dark:text-brand-light">{pct(ratio)}</span>
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">fica contigo</span>
              </div>
              <SegBar segs={distribution} />
              <div className="mt-3.5"><SegLegend segs={distribution} format={fmt} /></div>
            </div>
          </div>
        </div>

        {issues.length > 0 && (
          <div className="border-b border-alert-border bg-alert-bg px-4 py-3">
            <div className="flex gap-2"><Warning size={14} className="mt-0.5 flex-none text-alert-text" /><div><p className="text-[11px] font-semibold text-alert-text">Falta confirmar {issues.length === 1 ? "uma rubrica" : `${issues.length} campos`}</p><p className="mt-0.5 text-[11px] leading-relaxed text-alert-text/80">O total é provisório até preencher os campos destacados.</p></div></div>
          </div>
        )}

        <div className="border-b border-stone-100 p-2 dark:border-stone-800">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800" role="tablist" aria-label="Vistas do resultado">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-[11px] font-semibold transition ${tab === item.id ? "bg-white text-brand shadow-sm dark:bg-stone-700 dark:text-brand-light" : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"}`}
              >
                <span className="hidden sm:inline">{item.icon}</span><span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {tab === "month" && (
            <MonthlyBreakdown
              lines={lines}
              result={result}
              incapacidade={
                <IncapacidadeRetencao
                  estadoCivil={estadoCivil}
                  dependentesDeficientes={dependentesDeficientes}
                  fator={fatorDependentesDeficientes}
                  conjugeDeficiente={conjugeDeficiente}
                />
              }
            />
          )}
          {tab === "year" && <AnnualBreakdown annual={annual} hasMonthlyExtras={hasMonthlyExtras} duodecimos={duodecimos} dependentesDeficientes={dependentesDeficientes} />}
          {tab === "employer" && <EmployerBreakdown result={result} cost={employerCost} />}
          {tab === "memory" && <Memory result={result} />}
        </div>
      </div>
      <p className="mt-3 px-2 text-center text-[11px] leading-relaxed text-stone-400">Estimativa pelas tabelas de 2026. Confirma sempre o recibo emitido pela entidade empregadora.</p>
    </aside>
  );
}
