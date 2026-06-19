"use client";

// Comparar Cenários — a ferramenta robusta da homepage que substitui o antigo
// comparador e a "calculadora de poupança". Para o mesmo rendimento anual,
// compara o líquido em três caminhos (por conta de outrem, recibos verdes,
// empresa), encontra o ponto de viragem e mostra o calendário fiscal de cada
// cenário. Tudo pelos motores verificados (compararCategorias). Estimativa.

import { useCallback, useMemo, useRef, useState } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { compararCategorias } from "@/lib/fiscal-dependente";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { Briefcase, Receipt, Building, Check, Calendar, Scale, ChartProjection } from "@/components/ui/Icons";
import ComparadorFAQ from "@/components/comparar/ComparadorFAQ";
import { PassoContabilista } from "@/components/simulador/PassoContabilista";
import MapaBeneficiosRegioes from "@/components/comparar/MapaBeneficiosRegioes";

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
    const c = Math.max(0, Math.min(MAX, Math.round(v / 1000) * 1000));
    setBruto(c);
    setBrutoStr(String(c));
  };

  // ── Slider personalizado (track + preenchimento + puxador) ────────────────
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pctDe = useCallback((v: number) => Math.min(100, Math.max(0, (v / MAX) * 100)), []);
  const valorDoPonteiro = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return bruto;
    const { left, width } = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round((frac * MAX) / 1000) * 1000;
  }, [bruto]);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    sincronizar(valorDoPonteiro(e.clientX));
  }, [valorDoPonteiro]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging) sincronizar(valorDoPonteiro(e.clientX));
  }, [dragging, valorDoPonteiro]);
  const onPointerUp = useCallback(() => setDragging(false), []);
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const passo = e.shiftKey ? 10_000 : 1_000;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); sincronizar(bruto + passo); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); sincronizar(bruto - passo); }
    else if (e.key === "Home") { e.preventDefault(); sincronizar(0); }
    else if (e.key === "End") { e.preventDefault(); sincronizar(MAX); }
  }, [bruto]);

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

  // Decomposição do ilíquido por cenário (gráfico de colunas "para onde vai
  // cada euro"). Cada pilha soma exatamente ao mesmo ilíquido — o verde é o que
  // fica. Paleta coerente: verde = líquido; família terracota (clay) = imposto,
  // do mais escuro (maior peso) ao mais claro; cinza neutro = custos/estrutura.
  const COR = {
    liquido: "bg-brand",
    impostoForte: "bg-clay-text", // IRS / SS — o desconto mais pesado
    imposto: "bg-clay", // IRS / dividendos
    impostoLeve: "bg-clay-border", // derrama e afins
    custo: "bg-stone-300 dark:bg-stone-600", // despesas / estrutura (não é imposto)
  };
  type Seg = { label: string; valor: number; cls: string };
  // Garante que a pilha soma ao ilíquido: o último segmento absorve o resto.
  const pilha = (liquido: number, perdas: Seg[]): Seg[] => {
    const somaPerdas = perdas.reduce((s, p) => s + Math.max(0, p.valor), 0);
    const resto = Math.round(bruto - liquido - somaPerdas);
    const base: Seg[] = [{ label: "Líquido", valor: liquido, cls: COR.liquido }, ...perdas.filter((p) => p.valor > 0.5)];
    if (resto > 0.5) base.push({ label: "Outros custos / estrutura", valor: resto, cls: COR.custo });
    return base;
  };
  const segmentos: Record<Chave, Seg[]> = {
    dependente: pilha(r.dependente.liquido, [
      { label: "IRS retido", valor: r.dependente.irs, cls: COR.imposto },
      { label: "Segurança Social (11%)", valor: r.dependente.ss, cls: COR.impostoForte },
    ]),
    freelancer: pilha(r.freelancer.liquido, [
      { label: "IRS", valor: r.freelancer.irs, cls: COR.imposto },
      { label: "Segurança Social (21,4%)", valor: r.freelancer.ss, cls: COR.impostoForte },
      { label: "Despesas de atividade", valor: r.freelancer.despesas, cls: COR.custo },
    ]),
    empresa: pilha(r.empresa.liquido, [
      { label: "Imposto sobre dividendos (28%)", valor: r.empresa.dividendos, cls: COR.imposto },
      { label: "IRC (15% / 19%)", valor: r.empresa.irc, cls: COR.impostoForte },
      { label: "Derrama municipal", valor: r.empresa.derrama, cls: COR.impostoLeve },
    ]),
  };

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
    <div className="my-8 space-y-10">
    <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-card sm:p-6">
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

        {/* Slider personalizado — puxador arrastável + pontos de viragem na própria barra */}
        <div className="mt-7 px-1">
          <div className="relative h-2.5" style={{ touchAction: "none" }}>
            {/* Marcadores dos pontos de viragem, ASSENTES na barra */}
            {breakEvenRV != null && breakEvenRV <= MAX && (
              <div className="pointer-events-none absolute -top-6 z-10 -translate-x-1/2 text-center" style={{ left: `${pctDe(breakEvenRV)}%` }}>
                <span className="block whitespace-nowrap rounded-md bg-brand-light px-1.5 py-0.5 text-[10px] font-bold text-brand-dark">{fmtK(breakEvenRV)} · recibos verdes</span>
                <span className="mx-auto mt-0.5 block h-3 w-px bg-brand" />
              </div>
            )}
            {breakEvenEmpresa != null && breakEvenEmpresa <= MAX && (
              <div className="pointer-events-none absolute -top-11 z-10 -translate-x-1/2 text-center" style={{ left: `${pctDe(breakEvenEmpresa)}%` }}>
                <span className="block whitespace-nowrap rounded-md bg-alert-bg px-1.5 py-0.5 text-[10px] font-bold text-alert-text">{fmtK(breakEvenEmpresa)} · empresa</span>
                <span className="mx-auto mt-0.5 block h-8 w-px bg-alert-border" />
              </div>
            )}

            {/* Trilho + preenchimento + puxador */}
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label="Rendimento anual ilíquido"
              aria-valuemin={0}
              aria-valuemax={MAX}
              aria-valuenow={bruto}
              aria-valuetext={`${fmt(bruto)} por ano`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onKeyDown={onKeyDown}
              className="group absolute inset-0 cursor-pointer rounded-full bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:bg-stone-700 dark:focus-visible:ring-offset-stone-900"
            >
              <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${pctDe(bruto)}%` }} />
              <div
                className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-white shadow-card transition-transform ${dragging ? "scale-110 shadow-glow" : "group-hover:scale-105"}`}
                style={{ left: `${pctDe(bruto)}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-medium text-stone-400">
            <span>0€</span>
            <span>{fmtK(MAX)}</span>
          </div>
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

      {/* Gráfico de colunas — para onde vai cada euro */}
      {bruto > 0 && (
        <div className="mt-6 rounded-2xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 p-5">
          <div className="mb-1 flex items-center gap-2">
            <ChartProjection size={15} className="text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Para onde vai cada euro</h3>
          </div>
          <p className="mb-4 text-xs text-stone-400">Mesma altura porque parte do mesmo ilíquido — o verde é o que te fica.</p>

          <div className="flex items-end justify-around gap-4 sm:gap-8" style={{ height: 230 }}>
            {CARTOES.map((c) => {
              const segs = segmentos[c.chave];
              const melhor = r.melhor === c.chave;
              const pctLiquido = bruto > 0 ? (segs[0].valor / bruto) * 100 : 0;
              return (
                <div key={c.chave} className="flex h-full min-w-0 flex-1 flex-col items-center">
                  <span className={`mb-1.5 inline-flex items-center gap-1 text-[11px] font-bold tabular-nums ${melhor ? "text-brand-dark dark:text-brand" : "text-stone-600 dark:text-stone-300"}`}>
                    {melhor && <Check size={11} />}{fmt(segs[0].valor)}
                  </span>
                  <div
                    className={`relative flex w-full max-w-[92px] flex-col-reverse overflow-hidden rounded-xl ring-1 ${melhor ? "ring-2 ring-brand/50" : "ring-stone-200/70 dark:ring-stone-700"}`}
                    style={{ height: "calc(100% - 44px)" }}
                    role="img"
                    aria-label={`${c.titulo}: líquido ${fmt(segs[0].valor)} (${Math.round(pctLiquido)}%) de ${fmt(bruto)} ilíquidos`}
                  >
                    {segs.map((s, i) => (
                      <div
                        key={s.label}
                        className={`${s.cls} relative w-full ${i > 0 ? "border-t border-white/50 dark:border-stone-900/40" : ""}`}
                        style={{ height: `${bruto > 0 ? (Math.max(0, s.valor) / bruto) * 100 : 0}%` }}
                        title={`${s.label}: ${fmt(s.valor)}`}
                      >
                        {i === 0 && pctLiquido >= 18 && (
                          <span className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-bold text-white/95">{Math.round(pctLiquido)}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className={`mt-2 flex items-center gap-1 text-center text-[10px] font-semibold leading-tight ${melhor ? "text-stone-700 dark:text-stone-200" : "text-stone-400"}`}>
                    <c.Icon size={11} /> {c.titulo}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-stone-100 dark:border-stone-700 pt-3 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Líquido (fica contigo)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-clay" /> IRS / dividendos</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-clay-text" /> Segurança Social / IRC</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-clay-border" /> Derrama</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-stone-300 dark:bg-stone-600" /> Despesas / estrutura</span>
          </div>

          {/* Decomposição detalhada por cenário */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {CARTOES.map((c) => {
              const segs = segmentos[c.chave];
              const melhor = r.melhor === c.chave;
              return (
                <div
                  key={c.chave}
                  className={`rounded-2xl border p-4 ${melhor ? "border-brand/40 bg-brand/5 dark:bg-brand/10" : "border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800"}`}
                >
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    <c.Icon size={13} className="text-stone-400" /> {c.titulo}
                  </p>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <dt className="text-stone-500 dark:text-stone-400">Ilíquido</dt>
                      <dd className="font-semibold tabular-nums text-stone-700 dark:text-stone-200">{fmt(bruto)}</dd>
                    </div>
                    {segs.slice(1).map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <dt className="text-stone-500 dark:text-stone-400">− {s.label}</dt>
                        <dd className="font-medium tabular-nums text-clay-text">−{fmt(s.valor)}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-700 pt-1.5">
                      <dt className="font-semibold text-stone-700 dark:text-stone-200">Líquido</dt>
                      <dd className={`font-bold tabular-nums ${melhor ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"}`}>{fmt(segs[0].valor)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

    {/* ── Próximos passos: precisas de um contabilista? (diagnóstico + mapa de preços) ── */}
    <PassoContabilista faturacaoAnual={bruto} despesasEstimadas={despesas} />

    {/* ── Onde vale a pena instalar-te: benefícios fiscais por região ── */}
    <MapaBeneficiosRegioes />

    {/* Dúvidas separadas por cenário */}
    <ComparadorFAQ />
    </div>
  );
}
