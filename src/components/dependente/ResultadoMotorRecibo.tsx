"use client";

import { useState } from "react";
import { Building, Calculator, Check, Receipt, ShieldCheck, Warning, Wallet } from "@/components/ui/Icons";
import { Donut, SegBar, type Seg } from "@/components/dependente/ui";
import { fmt, pct } from "@/lib/format";
import { SS_DEPENDENTE, SUBSIDIO_REFEICAO } from "@/lib/fiscal-data";
import type { ReciboMensalResult, VencimentoAnualResult } from "@/lib/fiscal-dependente";
import type { PayrollDisplayLine } from "@/lib/payroll-simulator-legacy-adapter";

type ResultTab = "month" | "year" | "employer" | "memory";

const TREATMENT = {
  subject: { label: "Sujeito", cls: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300" },
  partial: { label: "Parcial", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
  exempt: { label: "Isento", cls: "bg-brand-light text-brand-dark dark:bg-brand/10 dark:text-brand-light" },
  deduction: { label: "Desconto", cls: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300" },
} as const;

function Metric({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${accent ? "border-brand/20 bg-brand-light/60 dark:bg-brand/10" : "border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900/50"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold tabular-nums ${accent ? "text-brand-dark dark:text-brand-light" : "text-stone-800 dark:text-stone-100"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] leading-relaxed text-stone-400">{hint}</p>}
    </div>
  );
}

function TreatmentBadge({ treatment }: { treatment: PayrollDisplayLine["treatment"] }) {
  const item = TREATMENT[treatment];
  return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${item.cls}`}>{item.label}</span>;
}

function MonthlyBreakdown({ lines, result }: { lines: readonly PayrollDisplayLine[]; result: ReciboMensalResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Bruto / caixa" value={fmt(result.brutoTotal)} />
        <Metric label="IRS retido" value={`− ${fmt(result.irsTotal)}`} />
        <Metric label="Segurança Social" value={`− ${fmt(result.ssTrabalhador)}`} hint={`sobre ${fmt(result.baseSS)}`} />
        <Metric label="Taxa efetiva" value={pct(result.taxaEfetiva)} hint="IRS + SS / rendimento sujeito" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/80 px-3.5 py-3 dark:border-stone-800 dark:bg-stone-950/30">
          <div>
            <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-200">Impacto por rubrica</h4>
            <p className="mt-0.5 text-[9px] text-stone-400">O IRS é alocado sem alterar o total do recibo.</p>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-stone-400 shadow-sm dark:bg-stone-900">{lines.length} linhas</span>
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
                  <p className="mt-1 text-[9px] leading-relaxed text-stone-400">{line.detail ? `${line.detail} · ` : ""}{line.source}</p>
                </div>
                <p className={`flex-none text-sm font-semibold tabular-nums ${line.amount < 0 ? "text-red-500" : "text-stone-800 dark:text-stone-100"}`}>{line.amount >= 0 ? "+ " : "− "}{fmt(Math.abs(line.amount))}</p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-stone-50 p-2 dark:bg-stone-800/50">
                <div><p className="text-[8px] uppercase tracking-wide text-stone-400">IRS</p><p className="mt-0.5 text-[10px] font-semibold tabular-nums text-stone-600 dark:text-stone-300">{line.irsWithheld >= 0 ? "−" : "+"} {fmt(Math.abs(line.irsWithheld))}</p></div>
                <div><p className="text-[8px] uppercase tracking-wide text-stone-400">SS</p><p className="mt-0.5 text-[10px] font-semibold tabular-nums text-stone-600 dark:text-stone-300">{line.employeeSocialSecurity >= 0 ? "−" : "+"} {fmt(Math.abs(line.employeeSocialSecurity))}</p></div>
                <div className="text-right"><p className="text-[8px] uppercase tracking-wide text-stone-400">Líquido</p><p className={`mt-0.5 text-[10px] font-semibold tabular-nums ${line.netImpact >= 0 ? "text-brand-dark dark:text-brand-light" : "text-red-500"}`}>{line.netImpact >= 0 ? "+" : "−"} {fmt(Math.abs(line.netImpact))}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnnualBreakdown({ annual, hasMonthlyExtras, duodecimos }: { annual: VencimentoAnualResult; hasMonthlyExtras: boolean; duodecimos: boolean }) {
  const segs: Seg[] = [
    { label: "Líquido", value: annual.liquidoAnual, brand: true },
    { label: "IRS", value: annual.irsAnual, color: "#9FE1CB" },
    { label: "Segurança Social", value: annual.ssAnual, cls: "text-brand-deep" },
  ];
  return (
    <div className="space-y-4">
      {hasMonthlyExtras && (
        <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
          <Warning size={13} className="mt-0.5 flex-none" /> A visão anual usa o salário-base, os dois subsídios e a refeição. Rubricas deste mês não são repetidas sem saber a periodicidade.
        </div>
      )}
      <div className="rounded-2xl border border-brand/20 bg-brand-light/60 p-4 dark:bg-brand/10">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-dark/70 dark:text-brand-light/70">Líquido anual estimado</p>
        <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-brand-dark dark:text-brand-light">{fmt(annual.liquidoAnual)}</p>
        <p className="mt-1 text-[10px] text-brand-dark/70 dark:text-brand-light/70">{duodecimos ? `${fmt(annual.liquidoMedioMes)} de média por mês em duodécimos` : "12 salários + subsídio de férias + subsídio de Natal"}</p>
        <div className="mt-4"><SegBar segs={segs} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Bruto anual" value={fmt(annual.brutoAnual)} />
        <Metric label="Média líquida" value={fmt(annual.liquidoMedioMes)} />
        <Metric label="IRS anual retido" value={fmt(annual.irsAnual)} />
        <Metric label="SS anual" value={fmt(annual.ssAnual)} />
      </div>
      <div className="rounded-2xl border border-stone-100 p-3.5 dark:border-stone-800">
        <div className="flex items-center justify-between text-xs"><span className="text-stone-500">IRS sobre salários (12×)</span><strong className="tabular-nums text-stone-700 dark:text-stone-200">{fmt(annual.irsSalario)}</strong></div>
        <div className="mt-2 flex items-center justify-between text-xs"><span className="text-stone-500">IRS sobre férias</span><strong className="tabular-nums text-stone-700 dark:text-stone-200">{fmt(annual.irsFerias)}</strong></div>
        <div className="mt-2 flex items-center justify-between text-xs"><span className="text-stone-500">IRS sobre Natal</span><strong className="tabular-nums text-stone-700 dark:text-stone-200">{fmt(annual.irsNatal)}</strong></div>
      </div>
    </div>
  );
}

function EmployerBreakdown({ result, cost }: { result: ReciboMensalResult; cost: number }) {
  const employerSS = Math.round(result.baseSS * SS_DEPENDENTE.entidade.value * 100) / 100;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-stone-950 p-5 text-white dark:bg-stone-800">
        <div className="flex items-center gap-2 text-stone-300"><Building size={15} /><span className="text-[10px] font-semibold uppercase tracking-wide">Custo total deste mês</span></div>
        <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{fmt(cost)}</p>
        <p className="mt-1 text-[10px] leading-relaxed text-stone-400">Inclui tudo o que recebes e a contribuição patronal. Não inclui seguros, formação ou outros custos indiretos.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Remunerações e abonos" value={fmt(result.brutoTotal)} />
        <Metric label="SS da empresa" value={fmt(employerSS)} hint={`${pct(SS_DEPENDENTE.entidade.value)} sobre ${fmt(result.baseSS)}`} />
        <Metric label="Custo / líquido" value={result.liquido > 0 ? `${(cost / result.liquido).toFixed(2).replace(".", ",")}×` : "—"} />
        <Metric label="Custo não recebido" value={fmt(Math.max(0, cost - result.liquido))} />
      </div>
    </div>
  );
}

function Memory({ result }: { result: ReciboMensalResult }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3 rounded-2xl border border-brand/20 bg-brand-light/50 p-3.5 dark:bg-brand/10">
        <ShieldCheck size={17} className="mt-0.5 flex-none text-brand" />
        <div><p className="text-xs font-semibold text-brand-dark dark:text-brand-light">Memória do cálculo</p><p className="mt-1 text-[10px] leading-relaxed text-brand-dark/70 dark:text-brand-light/70">Mostra as bases usadas; não transforma uma estimativa em recibo oficial.</p></div>
      </div>
      {[
        ["Retribuição horária", "(remuneração mensal × 12) ÷ (52 × horas semanais)", fmt(result.retribuicaoHoraria), "CT art. 271.º"],
        ["Base mensal de IRS", "base remunerada + remunerações + excessos sujeitos", fmt(Math.max(0, result.baseRemunerada + result.premio + result.outrosSujeitos + result.ajudasTributadas + result.subsidioRefeicaoTributado)), "CIRS arts. 2.º e 99.º-C"],
        ["Base da Segurança Social", "soma das rubricas contributivas", fmt(result.baseSS), "CRC arts. 44.º–48.º"],
        ["Retenção total", "mensal + suplementar autónomo + subsídios autónomos", fmt(result.irsTotal), "Despacho 233-A/2026"],
      ].map(([label, formula, value, source]) => (
        <div key={label} className="rounded-2xl border border-stone-100 p-3.5 dark:border-stone-800">
          <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{label}</p><strong className="text-xs tabular-nums text-stone-800 dark:text-stone-100">{value}</strong></div>
          <code className="mt-2 block rounded-lg bg-stone-50 px-2.5 py-2 text-[9px] leading-relaxed text-stone-500 dark:bg-stone-800 dark:text-stone-400">{formula}</code>
          <p className="mt-1.5 text-[9px] text-stone-400">{source}</p>
        </div>
      ))}
      <div className="rounded-2xl border border-stone-100 p-3.5 text-[10px] leading-relaxed text-stone-400 dark:border-stone-800">
        Refeição: {fmt(SUBSIDIO_REFEICAO.dinheiro.value)}/dia em dinheiro ou {fmt(SUBSIDIO_REFEICAO.cartao.value)}/dia em cartão. O excesso integra IRS e SS.
      </div>
    </div>
  );
}

export function ResultadoMotorRecibo({ result, lines, annual, employerCost, hasMonthlyExtras, duodecimos, issues, targetGross }: {
  result: ReciboMensalResult;
  lines: readonly PayrollDisplayLine[];
  annual: VencimentoAnualResult;
  employerCost: number;
  hasMonthlyExtras: boolean;
  duodecimos: boolean;
  issues: readonly string[];
  targetGross?: number;
}) {
  const [tab, setTab] = useState<ResultTab>("month");
  const stay = Math.max(0, result.liquido);
  const distribution: Seg[] = [
    { label: "Líquido", value: stay, brand: true },
    { label: "IRS", value: result.irsTotal, color: "#9FE1CB" },
    { label: "SS", value: result.ssTrabalhador, cls: "text-brand-deep" },
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
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-emerald-400 p-5 text-white">
          <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full border border-white/10 bg-white/5" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-white/75"><Check size={12} /><span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Líquido estimado</span></div>
              <p className="mt-2 font-display text-4xl font-semibold tracking-tight tabular-nums">{fmt(result.liquido)}</p>
              <p className="mt-1 text-[11px] text-white/70">a receber neste mês</p>
              {targetGross !== undefined && <p className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold">Bruto necessário: {fmt(targetGross)}</p>}
            </div>
            <div className="hidden sm:block">
              <Donut segs={distribution} centro={pct(result.brutoTotal > 0 ? result.liquido / result.brutoTotal : 0)} centroSub="fica contigo" />
            </div>
          </div>
          <div className="relative mt-4"><SegBar segs={distribution} /></div>
        </div>

        {issues.length > 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex gap-2"><Warning size={14} className="mt-0.5 flex-none text-amber-600" /><div><p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Falta confirmar {issues.length === 1 ? "uma rubrica" : `${issues.length} campos`}</p><p className="mt-0.5 text-[9px] leading-relaxed text-amber-700 dark:text-amber-400">O total é provisório até preencher os campos destacados.</p></div></div>
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
                className={`flex items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[10px] font-semibold transition ${tab === item.id ? "bg-white text-brand shadow-sm dark:bg-stone-700 dark:text-brand-light" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"}`}
              >
                {item.icon}<span className="hidden sm:inline lg:hidden xl:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {tab === "month" && <MonthlyBreakdown lines={lines} result={result} />}
          {tab === "year" && <AnnualBreakdown annual={annual} hasMonthlyExtras={hasMonthlyExtras} duodecimos={duodecimos} />}
          {tab === "employer" && <EmployerBreakdown result={result} cost={employerCost} />}
          {tab === "memory" && <Memory result={result} />}
        </div>
      </div>
      <p className="mt-3 px-2 text-center text-[10px] leading-relaxed text-stone-400">Estimativa pelas tabelas de 2026. Confirma sempre o recibo emitido pela entidade empregadora.</p>
    </aside>
  );
}
