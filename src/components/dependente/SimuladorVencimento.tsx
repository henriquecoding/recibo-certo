"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { calcularVencimento, calcularVencimentoAnual, mealheiroDependente } from "@/lib/fiscal-dependente";
import { SS_DEPENDENTE, SUBSIDIO_REFEICAO, type EstadoCivilRet } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import ProGate from "@/components/ui/ProGate";
import { printRelatorioVencimento } from "@/lib/export-vencimento";
import { useVencimentos, gerarCSVCenarios, type CenarioVencimento } from "@/lib/store/vencimentos";
import { History, Trash, Plus, ShieldCheck, Export, FileSign, Wallet, Gauge, Building, Coin } from "@/components/ui/Icons";

const DEPENDENTES = [0, 1, 2, 3, 4];

const SITUACAO_LABEL: Record<EstadoCivilRet, string> = {
  naoCasado: "Não casado",
  casadoDois: "Casado, 2 titulares",
  casadoUnico: "Casado, 1 titular",
};

// Aceita vírgula ou ponto como separador decimal (pt-PT); nunca devolve NaN.
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");
const soInteiro = (s: string) => s.replace(/\D/g, "").slice(0, 2);

// Escala monocromática de verdes da marca: líquido = verde da marca (brand),
// IRS = mint claro, Seg. Social / descontos = verde profundo. `cls` →
// currentColor + classe que adapta ao modo escuro; `color` → hex fixo.
type Seg = { label: string; value: number; color?: string; brand?: boolean; cls?: string };
const COR_IRS = "#9FE1CB"; // brand-mint (segmento do IRS)
const CLS_SS = "text-brand-deep"; // Seg. Social / descontos — verde profundo, elegante (claro e escuro)

// ── Donut genérico (SVG, sem dependências; igual à técnica do DistribuicaoDonut) ──
function Donut({ segs, centro, centroSub }: { segs: Seg[]; centro: string; centroSub: string }) {
  const total = segs.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const r = 52;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const arcs = segs.map((s) => {
    const len = (Math.max(0, s.value) / total) * C;
    const a = { ...s, len, offset: -acc };
    acc += len;
    return a;
  });
  return (
    <div className="relative flex-shrink-0">
      <svg width="128" height="128" viewBox="0 0 132 132" aria-hidden>
        <circle cx="66" cy="66" r={r} fill="none" stroke="currentColor" className="text-stone-100 dark:text-stone-800" strokeWidth="15" />
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="66"
            cy="66"
            r={r}
            fill="none"
            className={a.brand ? "text-brand" : a.cls}
            stroke={a.brand || a.cls ? "currentColor" : a.color}
            strokeWidth="15"
            strokeDasharray={`${a.len} ${C - a.len}`}
            strokeDashoffset={a.offset}
            transform="rotate(-90 66 66)"
            style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)" }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-brand tabular-nums">{centro}</span>
        <span className="text-[11px] text-stone-400">{centroSub}</span>
      </div>
    </div>
  );
}

// ── Barra segmentada (para onde vai o bruto / o ano) ──
function SegBar({ segs }: { segs: Seg[] }) {
  const total = segs.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  return (
    <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
      {segs.map((s, i) => (
        <div
          key={s.label}
          className={`${i === 0 ? "rounded-l-full" : ""} ${i === segs.length - 1 ? "rounded-r-full" : ""} ${s.brand ? "bg-brand" : s.cls ?? ""}`}
          style={{
            width: `${(Math.max(0, s.value) / total) * 100}%`,
            background: s.brand ? undefined : s.cls ? "currentColor" : s.color,
            transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      ))}
    </div>
  );
}

// ── Cartão de métrica ──
function Metric({ icon, label, value, sub, tip }: { icon: ReactNode; label: ReactNode; value: string; sub?: string; tip?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">{icon}</span>
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
          {label}
          {tip}
        </span>
      </div>
      <p className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-stone-400">{sub}</p>}
    </div>
  );
}

export function SimuladorVencimento() {
  const [brutoStr, setBrutoStr] = useState("1500");
  const [dependentes, setDependentes] = useState(0);
  const [temSubsidio, setTemSubsidio] = useState(true);
  const [subsidioDiaStr, setSubsidioDiaStr] = useState("6");
  const [cartao, setCartao] = useState(true);
  const [diasUteisStr, setDiasUteisStr] = useState("22");
  const [duodecimos, setDuodecimos] = useState(false);
  const [variavelStr, setVariavelStr] = useState("");
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivilRet>("naoCasado");
  const [deficiencia, setDeficiencia] = useState(false);

  const bruto = num(brutoStr);
  const subsidioDia = num(subsidioDiaStr);
  const diasUteis = Math.min(31, Math.round(num(diasUteisStr)));

  const r = useMemo(
    () =>
      calcularVencimento({
        salarioBruto: bruto,
        dependentes,
        subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
        subsidioRefeicaoCartao: cartao,
        diasUteis,
        estadoCivil,
        deficiencia,
      }),
    [bruto, dependentes, temSubsidio, subsidioDia, cartao, diasUteis, estadoCivil, deficiencia]
  );
  const ra = useMemo(
    () =>
      calcularVencimentoAnual({
        salarioBruto: bruto,
        dependentes,
        subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
        subsidioRefeicaoCartao: cartao,
        diasUteis,
        estadoCivil,
        deficiencia,
      }),
    [bruto, dependentes, temSubsidio, subsidioDia, cartao, diasUteis, estadoCivil, deficiencia]
  );

  const variavelAnual = num(variavelStr);
  const meal = useMemo(
    () => mealheiroDependente({ salarioBruto: bruto, dependentes, variavelAnual, estadoCivil, deficiencia }),
    [bruto, dependentes, variavelAnual, estadoCivil, deficiencia]
  );

  const limiteSubsidio = cartao ? SUBSIDIO_REFEICAO.cartao.value : SUBSIDIO_REFEICAO.dinheiro.value;
  const subsidioExcede = temSubsidio && subsidioDia > limiteSubsidio;
  const liquidoMostrado = duodecimos ? ra.liquidoMedioMes : r.liquido;

  // Para onde vai o salário bruto: fica contigo, retenção de IRS, Segurança Social.
  const fica = Math.max(0, r.bruto - r.ssTrabalhador - r.irsRetido);
  const ficaPct = r.bruto > 0 ? fica / r.bruto : 0;
  const segBruto: Seg[] = [
    { label: "Fica contigo", value: fica, color: "", brand: true },
    { label: "Retenção IRS", value: r.irsRetido, color: COR_IRS },
    { label: "Segurança Social", value: r.ssTrabalhador, cls: CLS_SS },
  ];
  const descontosAnuais = ra.irsAnual + ra.ssAnual;
  const segAno: Seg[] = [
    { label: "Líquido", value: ra.liquidoAnual, color: "", brand: true },
    { label: "IRS + SS", value: descontosAnuais, cls: CLS_SS },
  ];

  const { cenarios, carregado: cenariosProntos, naNuvem, plano, limite, limiteAtingido, guardar, remover } = useVencimentos();
  const [avisoGuardar, setAvisoGuardar] = useState<string | null>(null);

  function exportarCSV() {
    const csv = gerarCSVCenarios(cenarios);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recibocerto-cenarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function descarregarRelatorio() {
    printRelatorioVencimento({
      situacao: SITUACAO_LABEL[estadoCivil],
      dependentes,
      deficiencia,
      subsidioDia: temSubsidio ? subsidioDia : 0,
      subsidioForma: temSubsidio ? (cartao ? "Cartão" : "Dinheiro") : "—",
      diasUteis,
      duodecimos,
      bruto: r.bruto,
      ssTrabalhador: r.ssTrabalhador,
      irsRetido: r.irsRetido,
      subsidioRefeicaoTotal: r.subsidioRefeicaoTotal,
      subsidioRefeicaoIsento: r.subsidioRefeicaoIsento,
      subsidioRefeicaoTributado: r.subsidioRefeicaoTributado,
      liquido: r.liquido,
      liquidoMostrado,
      taxaEfetiva: r.taxaEfetiva,
      custoEmpresa: r.custoEmpresa,
      ssTaxaTrab: SS_DEPENDENTE.trabalhador.value,
      tsuTaxa: SS_DEPENDENTE.entidade.value,
      brutoAnual: ra.brutoAnual,
      subsidioFerias: ra.subsidioFerias,
      subsidioNatal: ra.subsidioNatal,
      irsFerias: ra.irsFerias,
      irsNatal: ra.irsNatal,
      irsAnual: ra.irsAnual,
      ssAnual: ra.ssAnual,
      liquidoAnual: ra.liquidoAnual,
      liquidoMedioMes: ra.liquidoMedioMes,
    });
  }

  function guardarCenario() {
    const res = guardar({
      salarioBruto: bruto,
      dependentes,
      subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
      subsidioRefeicaoCartao: cartao,
      diasUteis,
      duodecimos,
    });
    setAvisoGuardar(res.erro ?? null);
  }

  function carregarCenario(c: CenarioVencimento) {
    setBrutoStr(String(c.salarioBruto));
    setDependentes(c.dependentes);
    setTemSubsidio(c.subsidioRefeicaoDia > 0);
    setSubsidioDiaStr(String(c.subsidioRefeicaoDia || 6));
    setCartao(c.subsidioRefeicaoCartao);
    setDiasUteisStr(String(c.diasUteis));
    setDuodecimos(c.duodecimos);
    setAvisoGuardar(null);
  }

  // Estilos partilhados
  const subCard = "rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/40 p-4";
  const eyebrow = "text-[11px] font-semibold uppercase tracking-wide text-stone-400";
  const seg = (ativo: boolean) =>
    `rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
      ativo
        ? "border-brand bg-brand text-white shadow-glow"
        : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
    }`;

  return (
    <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-card sm:p-6 my-8">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Wallet size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Recibo de vencimento 2026</p>
          <p className="text-[11px] text-stone-400">Tabelas oficiais · Continente · estimativa</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ── Controlos ── */}
        <div className="space-y-5 lg:col-span-2">
          <div>
            <label htmlFor="bruto" className="mb-2 block text-xs font-semibold text-stone-600 dark:text-stone-400">
              Salário bruto mensal
            </label>
            <div className="relative">
              <input
                id="bruto"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={brutoStr}
                onChange={(e) => setBrutoStr(soDecimal(e.target.value))}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
            <input
              type="range"
              aria-label="Salário bruto mensal"
              min={0}
              max={6000}
              step={50}
              value={Math.min(bruto, 6000)}
              onChange={(e) => setBrutoStr(e.target.value)}
              className="mt-2 w-full accent-brand"
            />
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold text-stone-600 dark:text-stone-400">Dependentes</span>
            <div className="flex gap-2" role="group" aria-label="Número de dependentes">
              {DEPENDENTES.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dependentes === d}
                  onClick={() => setDependentes(d)}
                  className={`flex-1 ${seg(dependentes === d)}`}
                >
                  {d === 4 ? "4+" : d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold text-stone-600 dark:text-stone-400">
              Situação{" "}
              <InfoTip label="Tabela de retenção">
                &quot;Casado, único titular&quot; aplica-se quando o cônjuge não tem rendimentos (ou tem menos de 5%).
                Define a tabela de retenção do Despacho 233-A/2026.
              </InfoTip>
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação familiar">
              {(
                [
                  ["naoCasado", "Não casado"],
                  ["casadoDois", "Casado, 2 titulares"],
                  ["casadoUnico", "Casado, 1 titular"],
                ] as [EstadoCivilRet, string][]
              ).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={estadoCivil === k} onClick={() => setEstadoCivil(k)} className={seg(estadoCivil === k)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5">
            <input type="checkbox" checked={deficiencia} onChange={(e) => setDeficiencia(e.target.checked)} className="h-4 w-4 accent-brand" />
            <span className="text-sm text-stone-700 dark:text-stone-300">Grau de incapacidade ≥ 60%</span>
            <InfoTip label="Tabelas IV a VII">
              Titular com grau de incapacidade permanente igual ou superior a 60% — usa as tabelas IV a VII.
            </InfoTip>
          </label>

          {/* Subsídio de refeição */}
          <div className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50 p-4">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={temSubsidio} onChange={(e) => setTemSubsidio(e.target.checked)} className="h-4 w-4 accent-brand" />
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Subsídio de refeição</span>
              <InfoTip label="Limites de isenção 2026">
                Isento até {fmt(SUBSIDIO_REFEICAO.dinheiro.value)}/dia em dinheiro e {fmt(SUBSIDIO_REFEICAO.cartao.value)}/dia em cartão.
              </InfoTip>
            </label>
            {temSubsidio && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="subdia" className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Valor por dia
                    </label>
                    <div className="relative">
                      <input
                        id="subdia"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={subsidioDiaStr}
                        onChange={(e) => setSubsidioDiaStr(soDecimal(e.target.value))}
                        className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="dias" className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Dias úteis
                    </label>
                    <input
                      id="dias"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={diasUteisStr}
                      onChange={(e) => setDiasUteisStr(soInteiro(e.target.value))}
                      className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Forma de pagamento</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" aria-pressed={cartao} onClick={() => setCartao(true)} className={seg(cartao)}>
                      Cartão
                    </button>
                    <button type="button" aria-pressed={!cartao} onClick={() => setCartao(false)} className={seg(!cartao)}>
                      Dinheiro
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Painel de resultados ── */}
        <div className="space-y-4 lg:col-span-3">
          {/* Hero — líquido */}
          <div className="rounded-3xl border border-brand/15 bg-brand/8 dark:bg-brand/10 p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Vencimento líquido estimado</p>
                <p className="mt-1 font-display text-4xl font-semibold text-brand tabular-nums sm:text-5xl">{fmt(liquidoMostrado)}</p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  {duodecimos ? "por mês, em média (subsídios em duodécimos)" : "num mês normal · compara com o teu recibo"}
                </p>
              </div>
              <div className="flex gap-1.5" role="group" aria-label="Pagamento dos subsídios">
                <button type="button" aria-pressed={!duodecimos} onClick={() => setDuodecimos(false)} className={seg(!duodecimos)}>
                  Por inteiro
                </button>
                <button type="button" aria-pressed={duodecimos} onClick={() => setDuodecimos(true)} className={seg(duodecimos)}>
                  Duodécimos
                </button>
              </div>
            </div>
            <SegBar segs={segBruto} />
          </div>

          {/* Para onde vai o bruto — donut + legenda com espaço (sem cortes) */}
          <div className={subCard}>
            <p className={eyebrow}>Para onde vai o bruto</p>
            <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <Donut
                segs={segBruto}
                centro={r.bruto > 0 ? pct(ficaPct) : "—"}
                centroSub={r.bruto > 0 ? "é teu" : "sem dados"}
              />
              <ul className="w-full space-y-2.5 sm:flex-1">
                {segBruto.map((s) => (
                  <li key={s.label} className="flex items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${s.brand ? "bg-brand" : s.cls ?? ""}`}
                      style={{ background: s.brand ? undefined : s.cls ? "currentColor" : s.color }}
                    />
                    <span className="flex-1 text-sm text-stone-600 dark:text-stone-400">{s.label}</span>
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">{fmt(s.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric icon={<Gauge size={15} />} label="Taxa efetiva" value={pct(r.taxaEfetiva)} sub="IRS + Segurança Social / bruto" />
            <Metric
              icon={<Building size={15} />}
              label={
                <>
                  Custo para a empresa{" "}
                  <InfoTip label="TSU">Bruto + {pct(SS_DEPENDENTE.entidade.value)} de contribuição da entidade.</InfoTip>
                </>
              }
              value={fmt(r.custoEmpresa)}
              sub="por mês, com a Taxa Social Única"
            />
          </div>

          {/* Subsídio de refeição (quando aplicável) */}
          {temSubsidio && (
            <div className={subCard}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={eyebrow}>Subsídio de refeição</p>
                <p className="text-sm text-stone-700 dark:text-stone-300 tabular-nums">
                  {fmt(r.subsidioRefeicaoTotal)} <span className="text-stone-400">· {fmt(r.subsidioRefeicaoIsento)} isento</span>
                </p>
              </div>
              {subsidioExcede && (
                <p className="mt-1.5 rounded-lg border border-alert-border bg-alert-bg px-3 py-1.5 text-xs text-alert-text">
                  {fmt(r.subsidioRefeicaoTributado)} acima do limite ({fmt(limiteSubsidio)}/dia) — sujeito a IRS e Segurança Social.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Ano + mealheiro ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Visão anual */}
        <div className={subCard}>
          <div className="mb-3 flex items-center justify-between">
            <p className={`${eyebrow} flex items-center gap-1.5`}>
              Ao ano (14 meses)
              <InfoTip label="Retenção autónoma">
                Os subsídios de férias e de Natal são tributados em separado do salário (Art. 99.º-C CIRS): a fórmula da
                tabela aplica-se ao valor de cada um.
              </InfoTip>
            </p>
            <span className="text-xs font-semibold text-brand tabular-nums">{fmt(ra.liquidoAnual)}/ano</span>
          </div>
          <SegBar segs={segAno} />
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-stone-400">Bruto anual</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(ra.brutoAnual)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">IRS + SS no ano</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">−{fmt(descontosAnuais)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Subsídio de férias</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">
                {fmt(ra.subsidioFerias)} <span className="text-xs text-stone-400">· −{fmt(ra.irsFerias)} IRS</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Subsídio de Natal</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">
                {fmt(ra.subsidioNatal)} <span className="text-xs text-stone-400">· −{fmt(ra.irsNatal)} IRS</span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Mealheiro fiscal */}
        <div className={subCard}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className={`${eyebrow} flex items-center gap-1.5`}>
              <Coin size={14} className="text-brand" /> Mealheiro · acerto anual
              <InfoTip label="Rendimentos variáveis">
                Comissões, prémios e horas extra são muitas vezes sub-retidos: a retenção mensal segue o salário base,
                mas o IRS anual incide sobre o total. Mostramos quanto reservar.
              </InfoTip>
            </p>
            <div className="relative w-32">
              <input
                id="variavel"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={variavelStr}
                onChange={(e) => setVariavelStr(soDecimal(e.target.value))}
                placeholder="Variável/ano"
                aria-label="Rendimentos variáveis anuais"
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-stone-400">IRS apurado/ano</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(meal.irsApurado)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">IRS retido/ano</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(meal.irsRetido)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">{meal.acerto > 0 ? "A reservar/mês" : "Reembolso est."}</dt>
              <dd className={`font-semibold tabular-nums ${meal.acerto > 0 ? "text-alert-text dark:text-amber-400" : "text-brand"}`}>
                {meal.acerto > 0 ? fmt(meal.reservaMensal) : fmt(Math.abs(meal.acerto))}
              </dd>
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-400">
            {meal.acerto > 0
              ? `Reserva ${fmt(meal.reservaMensal)}/mês (${fmt(meal.acerto)} no ano) para o acerto de IRS.`
              : "Pela estimativa, não deverás IRS adicional no acerto anual."}
          </p>
        </div>
      </div>

      {/* Relatório PDF — extra Pro (bloqueio misto) */}
      <div className="mt-4">
        <ProGate
          title="Relatório financeiro em PDF"
          description="Descarrega um relatório completo desta simulação — estrutura de custos e visão anual — pronto a apresentar numa negociação salarial."
        >
          <div className={subCard}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <FileSign size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Relatório financeiro</p>
                  <p className="text-xs text-stone-400 tabular-nums">
                    Líquido {fmt(liquidoMostrado)}/mês · {fmt(ra.liquidoAnual)}/ano · empresa {fmt(r.custoEmpresa)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={descarregarRelatorio}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-glow transition-all hover:shadow-float"
              >
                <Export size={14} /> Descarregar PDF
              </button>
            </div>
          </div>
        </ProGate>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        Estimativa para o Continente (Tabelas I a VII do Despacho 233-A/2026, conforme a situação e a deficiência), ano
        completo de trabalho e ambos os subsídios iguais ao salário base. Não cobre as Regiões Autónomas (Açores/Madeira)
        nem o excesso do subsídio de refeição. Não substitui o teu recibo oficial nem aconselhamento de um contabilista.
      </p>

      {/* ── Cenários guardados (modo duplo + tiering) ── */}
      <div className="mt-5 border-t border-stone-100 dark:border-stone-800 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400">
            <History size={14} /> Cenários guardados
            <span className="font-normal text-stone-400">
              {naNuvem ? "· sincronizados (Pro)" : `· ${cenarios.length}/${limite} grátis`}
            </span>
          </span>
          <button
            type="button"
            onClick={guardarCenario}
            disabled={limiteAtingido}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark transition-all hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} /> Guardar este cenário
          </button>
        </div>

        {avisoGuardar && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand-light p-3">
            <span className="mt-0.5 text-brand-dark">
              <ShieldCheck size={14} />
            </span>
            <p className="text-xs text-brand-dark">
              {avisoGuardar}{" "}
              <Link href="/precos" className="font-semibold underline underline-offset-2">
                Ver o plano Pro
              </Link>
            </p>
          </div>
        )}

        {cenariosProntos && cenarios.length > 0 && (
          <ul className="mt-3 space-y-2">
            {cenarios.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2">
                <button type="button" onClick={() => carregarCenario(c)} className="flex-1 text-left">
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(c.salarioBruto)}/mês</span>
                  <span className="text-xs text-stone-400">
                    {" "}
                    · {c.dependentes} dep.{c.duodecimos ? " · duodécimos" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => remover(c.id)}
                  aria-label="Remover cenário"
                  className="flex-shrink-0 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-alert-text"
                >
                  <Trash size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {cenariosProntos && cenarios.length > 0 && (
          <div className="mt-3 flex justify-end">
            {plano === "pro" ? (
              <button
                type="button"
                onClick={exportarCSV}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 transition-colors hover:text-brand"
              >
                <Export size={14} /> Exportar CSV
              </button>
            ) : (
              <Link href="/precos" className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 transition-colors hover:text-brand">
                <Export size={14} /> Exportar CSV (Pro)
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
