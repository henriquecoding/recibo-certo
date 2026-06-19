"use client";

// Comparar Cenários — a ferramenta robusta da homepage que substitui o antigo
// comparador e a "calculadora de poupança". Para o mesmo rendimento anual,
// compara o líquido em três caminhos (por conta de outrem, recibos verdes,
// empresa), encontra o ponto de viragem e mostra o calendário fiscal de cada
// cenário. Tudo pelos motores verificados (compararCategorias). Estimativa.

import { useMemo, useState } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { compararCategorias } from "@/lib/fiscal-dependente";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { Briefcase, Receipt, Building, Check, Calendar, Scale } from "@/components/ui/Icons";

const DEPENDENTES = [0, 1, 2, 3, 4];
const PRESETS = [15_000, 25_000, 40_000, 60_000, 80_000, 120_000];
const MAX = 200_000;

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");

type Chave = "dependente" | "freelancer" | "empresa";

const CARTOES: { chave: Chave; titulo: string; sub: string; Icon: typeof Briefcase }[] = [
  { chave: "dependente", titulo: "Por conta de outrem", sub: "Categoria A · salário 14 meses", Icon: Briefcase },
  { chave: "freelancer", titulo: "Recibos verdes", sub: "Categoria B · regime simplificado", Icon: Receipt },
  { chave: "empresa", titulo: "Empresa", sub: "Sociedade · IRC + dividendos", Icon: Building },
];

const fmtK = (n: number) => `${Math.round(n / 1000)}k€`;

export default function ComparadorCenarios() {
  const [bruto, setBruto] = useState(40_000);
  const [brutoStr, setBrutoStr] = useState("40000");
  const [despesasStr, setDespesasStr] = useState("");
  const [dependentes, setDependentes] = useState(0);

  const despesas = num(despesasStr);

  const sincronizar = (v: number) => {
    const c = Math.max(0, Math.min(MAX, Math.round(v)));
    setBruto(c);
    setBrutoStr(String(c));
  };

  const r = useMemo(
    () => compararCategorias({ brutoAnual: bruto, dependentes, despesas }),
    [bruto, dependentes, despesas]
  );

  const liquidos: Record<Chave, number> = {
    dependente: r.dependente.liquido,
    freelancer: r.freelancer.liquido,
    empresa: r.empresa.liquido,
  };
  const cargas: Record<Chave, number> = {
    dependente: bruto > 0 ? (bruto - liquidos.dependente) / bruto : 0,
    freelancer: bruto > 0 ? (bruto - liquidos.freelancer) / bruto : 0,
    empresa: bruto > 0 ? (bruto - liquidos.empresa) / bruto : 0,
  };
  const maxLiquido = Math.max(...Object.values(liquidos), 1);

  // Pontos de viragem: percorre o rendimento e deteta onde a empresa passa a
  // bater os recibos verdes, e onde os recibos verdes passam a bater o salário.
  const { breakEvenEmpresa, breakEvenRV } = useMemo(() => {
    let bEmp: number | null = null;
    let bRV: number | null = null;
    for (let x = 5_000; x <= MAX; x += 2_500) {
      const c = compararCategorias({ brutoAnual: x, dependentes, despesas });
      if (bEmp === null && c.empresa.liquido > c.freelancer.liquido) bEmp = x;
      if (bRV === null && c.freelancer.liquido > c.dependente.liquido) bRV = x;
    }
    return { breakEvenEmpresa: bEmp, breakEvenRV: bRV };
  }, [dependentes, despesas]);

  const diffMelhor = (() => {
    const ord = (Object.keys(liquidos) as Chave[]).sort((a, b) => liquidos[b] - liquidos[a]);
    return liquidos[ord[0]] - liquidos[ord[1]];
  })();
  const tituloMelhor = CARTOES.find((c) => c.chave === r.melhor)?.titulo ?? "";

  // Calendário fiscal por cenário (factual, não inventado).
  const calendario: { chave: Chave; titulo: string; itens: { label: string; quando: string; valor: string }[] }[] = [
    {
      chave: "dependente",
      titulo: "Por conta de outrem",
      itens: [
        { label: "Segurança Social (11%)", quando: "retida todos os meses", valor: `${fmt(r.dependente.ss)}/ano` },
        { label: "IRS", quando: "retido na fonte todos os meses", valor: `${fmt(r.dependente.irs)}/ano` },
        { label: "IVA", quando: "não aplicável", valor: "—" },
      ],
    },
    {
      chave: "freelancer",
      titulo: "Recibos verdes",
      itens: [
        { label: "Segurança Social (21,4%)", quando: "mensal, até dia 20", valor: `${fmt(r.freelancer.ss)}/ano` },
        { label: "IRS", quando: "retenção + acerto em junho", valor: `${fmt(r.freelancer.irs)}/ano` },
        { label: "IVA", quando: "trimestral (se não isento)", valor: "conforme regime" },
      ],
    },
    {
      chave: "empresa",
      titulo: "Empresa (Lda)",
      itens: [
        { label: "IRC + derrama", quando: "anual (pagamentos por conta)", valor: `${fmt(r.empresa.irc + r.empresa.derrama)}/ano` },
        { label: "IRS dividendos (28%)", quando: "na distribuição de lucros", valor: r.empresa.dividendos > 0 ? `${fmt(r.empresa.dividendos)}/ano` : "—" },
        { label: "Contabilista (OCC)", quando: "mensal, obrigatório", valor: `${fmt(r.empresa.custosEmpresa)}/ano` },
      ],
    },
  ];

  const campo =
    "w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-card sm:p-6 my-8">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Scale size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Comparar cenários</p>
          <p className="text-[11px] text-stone-400">Descobre o melhor caminho para o teu rendimento · estimativa 2026</p>
        </div>
      </div>

      {/* Slider de rendimento + presets */}
      <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Rendimento anual ilíquido</p>
          <div className="relative mt-1 inline-flex items-center">
            <input
              aria-label="Rendimento anual ilíquido"
              value={brutoStr}
              onChange={(e) => {
                const s = soDecimal(e.target.value);
                setBrutoStr(s);
                setBruto(Math.max(0, Math.min(MAX, num(s))));
              }}
              className="w-44 bg-transparent text-center font-display text-4xl font-semibold tabular-nums text-ink focus:outline-none"
            />
            <span className="font-display text-2xl font-semibold text-stone-400">€</span>
          </div>
          <p className="text-[11px] text-stone-400">/ano · arrasta o slider ou edita o valor</p>
        </div>

        <input
          type="range"
          min={0}
          max={MAX}
          step={1000}
          value={bruto}
          onChange={(e) => sincronizar(Number(e.target.value))}
          aria-label="Rendimento anual"
          className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-brand dark:bg-stone-700"
        />
        <div className="flex justify-between text-[11px] text-stone-400">
          <span>0€</span>
          <span>{fmtK(MAX)}</span>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={bruto === p}
              onClick={() => sincronizar(p)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                bruto === p
                  ? "border-brand bg-brand text-white shadow-glow"
                  : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
              }`}
            >
              {fmtK(p)}
            </button>
          ))}
        </div>

        {/* Inputs secundários */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cmp-despesas" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400">
              Despesas de atividade{" "}
              <InfoTip label="Só recibos verdes e empresa">
                Despesas documentadas da atividade. Aplicam-se aos recibos verdes e à empresa; um
                trabalhador por conta de outrem não as deduz.
              </InfoTip>
            </label>
            <div className="relative">
              <input
                id="cmp-despesas"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={despesasStr}
                onChange={(e) => setDespesasStr(soDecimal(e.target.value))}
                placeholder="0"
                className={campo}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€/ano</span>
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400">
              Dependentes{" "}
              <InfoTip label="Categoria A">Afeta a retenção de IRS do cenário por conta de outrem.</InfoTip>
            </span>
            <div className="flex gap-1.5" role="group" aria-label="Número de dependentes">
              {DEPENDENTES.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dependentes === d}
                  onClick={() => setDependentes(d)}
                  className={`flex-1 rounded-xl border px-2 py-2 text-sm font-semibold transition-all ${
                    dependentes === d
                      ? "border-brand bg-brand text-white shadow-glow"
                      : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
                  }`}
                >
                  {d === 4 ? "4+" : d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cartões — 3 vias */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {CARTOES.map((c) => {
          const liquido = liquidos[c.chave];
          const melhor = r.melhor === c.chave;
          return (
            <m.div
              key={c.chave}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`relative rounded-2xl border p-5 ${
                melhor
                  ? "border-brand/40 bg-brand/8 dark:bg-brand/10"
                  : "border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800"
              }`}
            >
              {melhor && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Mais líquido
                </span>
              )}
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <c.Icon size={15} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{c.titulo}</p>
                  <p className="text-[11px] text-stone-400">{c.sub}</p>
                </div>
              </div>
              <p className={`font-display text-2xl font-semibold tabular-nums ${melhor ? "text-brand" : "text-stone-800 dark:text-stone-100"}`}>
                {fmt(liquido)}
              </p>
              <p className="mt-0.5 text-xs text-stone-400">líquido/ano · {pct(cargas[c.chave])} de carga</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${melhor ? "bg-brand" : "bg-stone-300 dark:bg-stone-600"}`}
                  style={{ width: `${Math.max(0, Math.min(100, (liquido / maxLiquido) * 100))}%` }}
                />
              </div>
            </m.div>
          );
        })}
      </div>

      {/* Veredicto + pontos de viragem */}
      <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-brand-light p-4 dark:bg-brand/10">
        <span className="mt-0.5 flex-shrink-0 text-brand"><Check size={16} /></span>
        <div className="text-sm text-brand-dark">
          <p className="font-semibold">
            Com {fmt(bruto)}/ano, <strong>{tituloMelhor.toLowerCase()}</strong> deixa-te com mais {fmt(diffMelhor)}/ano.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-brand-dark/80">
            {breakEvenRV
              ? `Os recibos verdes ultrapassam o salário acima de ~${fmt(breakEvenRV)}/ano. `
              : "Até aos valores testados, o salário por conta de outrem mantém-se competitivo. "}
            {breakEvenEmpresa
              ? `A empresa começa a compensar acima de ~${fmt(breakEvenEmpresa)}/ano.`
              : "A empresa só compensa em rendimentos mais altos do que os testados."}
          </p>
        </div>
      </div>

      {/* Calendário fiscal por cenário */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Calendar size={15} className="text-brand" />
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">
            Calendário fiscal por cenário
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {calendario.map((col) => (
            <div key={col.chave} className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 p-4">
              <p className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100">{col.titulo}</p>
              <ul className="space-y-3">
                {col.itens.map((it) => (
                  <li key={it.label}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{it.label}</span>
                      <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-100">{it.valor}</span>
                    </div>
                    <p className="text-[11px] text-stone-400">{it.quando}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-stone-400">
        Estimativa de ordem de grandeza para o mesmo rendimento anual ilíquido. A Categoria A assume salário em 14 meses
        (sem subsídio de refeição); os recibos verdes usam o regime simplificado (atividade de serviços, Art. 151.º); a
        empresa modela IRC PME, derrama e distribuição de dividendos. Não substitui o aconselhamento de um contabilista
        certificado (OCC).
      </p>
    </div>
  );
}
