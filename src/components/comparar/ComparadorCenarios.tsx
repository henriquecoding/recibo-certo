"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { m, AnimatePresence } from "motion/react";
import { EASE } from "@/lib/motion";
import { compararCategorias } from "@/lib/fiscal-dependente";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import {
  Briefcase, Receipt, Building, Check, Calendar, Scale,
  ChartProjection, ChevronLeft, ChevronRight, GripHorizontal,
} from "@/components/ui/Icons";
import ComparadorFAQ from "@/components/comparar/ComparadorFAQ";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const SeccaoCarregar = () => (
  <div className="h-64 w-full animate-pulse rounded-3xl border border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50" />
);
const PassoContabilista = dynamic(
  () => import("@/components/simulador/PassoContabilista").then((m) => m.PassoContabilista),
  { ssr: false, loading: SeccaoCarregar }
);
const MapaBeneficiosRegioes = dynamic(() => import("@/components/comparar/MapaBeneficiosRegioes"), {
  ssr: false,
  loading: SeccaoCarregar,
});

const DEPENDENTES = [0, 1, 2, 3, 4];
const PRESETS = [15_000, 30_000, 50_000, 80_000, 150_000, 200_000];
const SLIDER_MAX = 200_000;
const INPUT_MAX = 2_000_000;
const STEP = 1_000;

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
  const [dragging, setDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const despesas = num(despesasStr);
  const trackRef = useRef<HTMLDivElement>(null);

  const sincronizarSlider = useCallback((v: number) => {
    const c = Math.max(0, Math.min(SLIDER_MAX, Math.round(v / STEP) * STEP));
    setBruto(c);
    setBrutoStr(String(c));
  }, []);

  const pctDe = useCallback((v: number) => Math.min(100, Math.max(0, (v / SLIDER_MAX) * 100)), []);

  const valorDoPonteiro = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const { left, width } = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round((frac * SLIDER_MAX) / STEP) * STEP;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setHasInteracted(true);
    sincronizarSlider(valorDoPonteiro(e.clientX));
  }, [valorDoPonteiro, sincronizarSlider]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging) sincronizarSlider(valorDoPonteiro(e.clientX));
  }, [dragging, valorDoPonteiro, sincronizarSlider]);

  const onPointerUp = useCallback(() => setDragging(false), []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    setHasInteracted(true);
    const passo = e.shiftKey ? 10_000 : STEP;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); sincronizarSlider(bruto + passo); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); sincronizarSlider(bruto - passo); }
    else if (e.key === "Home") { e.preventDefault(); sincronizarSlider(0); }
    else if (e.key === "End") { e.preventDefault(); sincronizarSlider(SLIDER_MAX); }
  }, [bruto, sincronizarSlider]);

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

  const { rvEstavel, rvOscila, empEstavel, empOscila } = useMemo(() => {
    const amostras: { x: number; rvGanha: boolean; empGanha: boolean }[] = [];
    for (let x = 5_000; x <= 500_000; x += 2_500) {
      const c = compararCategorias({ brutoAnual: x, dependentes, despesas });
      amostras.push({
        x,
        rvGanha: c.freelancer.liquido > c.dependente.liquido + 1,
        empGanha: c.empresa.liquido > c.freelancer.liquido + 1,
      });
    }

    const analisar = (campo: "rvGanha" | "empGanha") => {
      let primeira: number | null = null;
      let ultimaDerrota = -1;
      for (let i = 0; i < amostras.length; i++) {
        if (amostras[i][campo]) {
          if (primeira === null) primeira = amostras[i].x;
        } else {
          ultimaDerrota = i;
        }
      }
      let estavel: number | null = null;
      if (ultimaDerrota < amostras.length - 1) {
        estavel = ultimaDerrota === -1
          ? amostras[0]?.x ?? null
          : amostras[ultimaDerrota + 1]?.x ?? null;
      }
      const oscila = primeira !== null && estavel !== null && primeira < estavel;
      return { estavel, oscila, desde: primeira, ate: estavel };
    };

    const rv = analisar("rvGanha");
    const emp = analisar("empGanha");
    return {
      rvEstavel: rv.estavel,
      rvOscila: rv.oscila ? { desde: rv.desde!, ate: rv.estavel! } : null,
      empEstavel: emp.estavel,
      empOscila: emp.oscila ? { desde: emp.desde!, ate: emp.estavel! } : null,
    };
  }, [dependentes, despesas]);

  const diffMelhor = (() => {
    const ord = (Object.keys(liquidos) as Chave[]).sort((a, b) => liquidos[b] - liquidos[a]);
    return liquidos[ord[0]] - liquidos[ord[1]];
  })();
  const tituloMelhor = CARTOES.find((c) => c.chave === r.melhor)?.titulo ?? "";

  const COR = {
    liquido: "bg-brand",
    impostoForte: "bg-brand-deep",
    imposto: "bg-brand-dark",
    impostoLeve: "bg-[#5DBA98]",
    custo: "bg-brand-mint",
  };
  type Seg = { label: string; valor: number; cls: string };
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

  const sliderPct = pctDe(bruto);

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

      {/* ── Painel de rendimento ── */}
      <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 sm:p-6">
        {/* Valor + label */}
        <div className="flex items-end justify-between gap-2 mb-1">
          <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Rendimento anual ilíquido
          </p>
          <div className="flex items-baseline gap-1">
            <input
              aria-label="Rendimento anual ilíquido"
              value={brutoStr}
              onBlur={() => setBrutoStr(String(bruto))}
              onChange={(e) => {
                const s = soDecimal(e.target.value);
                setBrutoStr(s);
                setBruto(Math.max(0, Math.min(INPUT_MAX, num(s))));
                setHasInteracted(true);
              }}
              className="w-40 bg-transparent text-right font-display text-3xl font-semibold tabular-nums text-ink dark:text-stone-100 focus:outline-none"
            />
            <span className="font-display text-lg font-semibold text-stone-400">€</span>
          </div>
        </div>
        <p className="text-right text-[11px] text-stone-400 mb-5">/ano · arrasta o slider ou edita o valor</p>

        {/* Dica — desaparece após 1.ª interação */}
        <AnimatePresence>
          {!hasInteracted && (
            <m.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center justify-center mb-3"
            >
              <m.span
                animate={{ x: [-3, 3, -3] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                className="flex items-center gap-1 text-brand/60 dark:text-brand/50 text-xs font-semibold"
              >
                <ChevronLeft size={11} />
                Arraste para ajustar
                <ChevronRight size={11} />
              </m.span>
            </m.div>
          )}
        </AnimatePresence>

        {/* Slider — área de clique h-10, barra visual h-2.5 centrada */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Rendimento anual ilíquido"
          aria-valuemin={0}
          aria-valuemax={SLIDER_MAX}
          aria-valuenow={bruto}
          aria-valuetext={`${fmt(bruto)} por ano`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className={`relative h-10 select-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-offset-stone-900 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ touchAction: "none" }}
        >
          {/* Barra visual */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-none"
              style={{ width: `${sliderPct}%` }}
            />
          </div>

          {/* Marcadores de ponto de viragem */}
          {rvEstavel != null && rvEstavel <= SLIDER_MAX && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-px rounded-full bg-brand-dark/50 z-10 pointer-events-none"
              style={{ left: `${pctDe(rvEstavel)}%` }}
            />
          )}
          {empEstavel != null && empEstavel <= SLIDER_MAX && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-px rounded-full bg-amber-500/50 z-10 pointer-events-none"
              style={{ left: `${pctDe(empEstavel)}%` }}
            />
          )}

          {/* Puxador — wrapper posiciona, inner anima */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
            style={{ left: `${sliderPct}%` }}
          >
            <m.div
              animate={{ scale: dragging ? 1.15 : 1 }}
              transition={{ duration: 0.1 }}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 transition-all duration-100 ${
                dragging
                  ? "border-brand-dark shadow-[0_0_0_5px_rgba(29,158,117,0.15)]"
                  : "border-brand shadow-[0_2px_10px_rgba(29,158,117,0.3)]"
              }`}>
                <GripHorizontal size={13} className="text-brand" />
              </div>
            </m.div>
          </div>
        </div>

        {/* Escala */}
        <div className="flex justify-between text-[10px] font-medium tabular-nums text-stone-400 dark:text-stone-500 mt-1">
          <span>0€</span>
          <span>{fmtK(SLIDER_MAX)}</span>
        </div>

        {/* Legenda de pontos de viragem */}
        {(rvEstavel != null || empEstavel != null) && (
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium">
            {rvEstavel != null && (
              <span className="flex items-center gap-1.5 text-brand-dark dark:text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-dark dark:bg-brand" />
                {rvOscila
                  ? `RV alterna com salário até ~${fmtK(rvOscila.ate)}`
                  : `RV compensa acima de ~${fmtK(rvEstavel)}`}
              </span>
            )}
            {empEstavel != null && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {empOscila
                  ? `Empresa alterna com RV até ~${fmtK(empOscila.ate)}`
                  : `Empresa compensa acima de ~${fmtK(empEstavel)}`}
              </span>
            )}
          </div>
        )}

        {/* Presets rápidos */}
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={bruto === p}
              onClick={() => { setBruto(p); setBrutoStr(String(p)); setHasInteracted(true); }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                bruto === p
                  ? "border-brand bg-brand text-white shadow-glow"
                  : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:border-brand hover:text-brand"
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

      {/* ── Cartões de resultado — 3 vias ── */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {CARTOES.map((c) => {
          const liquido = liquidos[c.chave];
          const melhor = r.melhor === c.chave;
          return (
            <m.div
              key={c.chave}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`relative rounded-2xl border p-5 transition-all ${
                melhor
                  ? "border-brand/40 bg-gradient-to-b from-brand/8 to-transparent dark:from-brand/12 dark:to-transparent shadow-glow ring-1 ring-brand/20"
                  : "border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800"
              }`}
            >
              {melhor && (
                <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                  <Check size={10} /> Mais líquido
                </span>
              )}
              <div className="mb-3 flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${melhor ? "bg-brand/15 text-brand" : "bg-stone-100 dark:bg-stone-700 text-stone-400"}`}>
                  <c.Icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{c.titulo}</p>
                  <p className="text-[11px] text-stone-400">{c.sub}</p>
                </div>
              </div>
              <m.p
                key={liquido}
                initial={{ y: -4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className={`font-display tabular-nums ${melhor ? "text-[1.75rem] font-bold text-brand" : "text-2xl font-semibold text-stone-800 dark:text-stone-100"}`}
              >
                {fmt(liquido)}
              </m.p>
              <p className="mt-1 text-xs text-stone-400">líquido/ano · {pct(cargas[c.chave])} de carga fiscal</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                <m.div
                  className={`h-full rounded-full ${melhor ? "bg-gradient-to-r from-brand to-brand-dark" : "bg-stone-300 dark:bg-stone-600"}`}
                  initial={false}
                  animate={{ width: `${Math.max(0, Math.min(100, (liquido / maxLiquido) * 100))}%` }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
              </div>
            </m.div>
          );
        })}
      </div>

      {/* ── Veredicto + pontos de viragem ── */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-light to-brand-light/60 dark:from-brand/10 dark:to-brand/5 dark:border-brand/15">
        <div className="flex items-start gap-3 p-5">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <Scale size={16} />
          </span>
          <div className="text-sm text-brand-dark dark:text-brand">
            <p className="font-bold leading-snug">
              Com {fmt(bruto)}/ano, <strong>{tituloMelhor.toLowerCase()}</strong> deixa-te com mais {fmt(diffMelhor)}/ano.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-brand-dark/75 dark:text-brand/65">
              {rvOscila
                ? `Entre ~${fmt(rvOscila.desde)}/ano e ~${fmt(rvOscila.ate)}/ano, recibos verdes e salário alternam consoante o escalão de IRS. Acima de ~${fmt(rvOscila.ate)}/ano, os recibos verdes compensam sempre. `
                : rvEstavel
                  ? `Acima de ~${fmt(rvEstavel)}/ano, os recibos verdes compensam face ao salário. `
                  : "Para estes parâmetros, o salário por conta de outrem mantém-se competitivo em toda a gama testada. "}
              {empEstavel
                ? `A empresa torna-se o cenário mais vantajoso acima de ~${fmt(empEstavel)}/ano.`
                : "A empresa só compensa em rendimentos mais altos do que os testados."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Gráfico de colunas — para onde vai cada euro ── */}
      {bruto > 0 && (
        <div className="mt-6 rounded-2xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 p-5 sm:p-6">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ChartProjection size={14} />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Para onde vai cada euro</h3>
          </div>
          <p className="mb-5 text-xs text-stone-400">Mesma altura porque parte do mesmo ilíquido — o verde vivo é o que te fica; os tons mais escuros são imposto.</p>

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
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-dark" /> IRS / dividendos</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-deep" /> Segurança Social / IRC</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#5DBA98" }} /> Derrama</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-mint" /> Despesas / estrutura</span>
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
                        <dd className="font-medium tabular-nums text-stone-500 dark:text-stone-400">−{fmt(s.valor)}</dd>
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

      {/* ── Calendário fiscal por cenário ── */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Calendar size={14} />
          </span>
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

    {/* ── Próximos passos: precisas de um contabilista? ── */}
    <ErrorBoundary etiqueta="o diagnóstico de contabilista">
      <PassoContabilista faturacaoAnual={bruto} despesasEstimadas={despesas} mostrarMapa={false} />
    </ErrorBoundary>

    {/* ── Onde vale a pena instalar-te: benefícios fiscais por região ── */}
    <ErrorBoundary etiqueta="o mapa de benefícios por região">
      <MapaBeneficiosRegioes />
    </ErrorBoundary>

    {/* Dúvidas separadas por cenário */}
    <ComparadorFAQ />
    </div>
  );
}
