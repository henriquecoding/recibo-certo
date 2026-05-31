"use client";

// Simulador interativo "vale a pena abrir empresa?" para a landing.
// Um slider de faturação anual responde, em tempo real, qual modelo deixa
// mais dinheiro: recibos verdes (cat. B) vs sociedade (IRC + dividendos).
// Usa o motor verificado `compararRegimes`. Sem inputs a mais — a interação
// é o slider; as restantes premissas ficam fixas e documentadas na nota.

import { useState, useRef, useCallback, useMemo, type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from "react";
import { m, AnimatePresence } from "motion/react";
import { compararRegimes } from "@/lib/fiscal";
import { fmt } from "@/lib/format";
import { Check, Warning } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";

const MIN = 0;
const MAX = 120000;
const STEP = 1000;
const CUSTOS_EMPRESA = 2000; // custo extra típico de uma sociedade (contabilista, etc.)

const comparar = (bruto: number) =>
  compararRegimes({ brutoAnual: bruto, tipo: "art151", despesas: 0, custosEmpresa: CUSTOS_EMPRESA });

export default function SimuladorEmpresa() {
  const [bruto, setBruto] = useState(40000);
  const [dragging, setDragging] = useState(false);
  const [interagiu, setInteragiu] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const r = useMemo(() => comparar(bruto), [bruto]);
  const empresaVence = r.diferenca > 0;
  const pct = ((bruto - MIN) / (MAX - MIN)) * 100;

  // Ponto de viragem: primeiro rendimento (na gama) onde a empresa passa à frente.
  const breakEven = useMemo(() => {
    for (let v = MIN; v <= MAX; v += STEP) if (comparar(v).diferenca > 0) return v;
    return null;
  }, []);
  const bePct = breakEven != null ? ((breakEven - MIN) / (MAX - MIN)) * 100 : null;

  const valorDe = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return bruto;
    const rect = el.getBoundingClientRect();
    const c = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round((c * (MAX - MIN) + MIN) / STEP) * STEP;
  }, [bruto]);

  const onDown = (e: RPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setInteragiu(true);
    setBruto(valorDe(e.clientX));
  };
  const onMove = (e: RPointerEvent) => { if (dragging) setBruto(valorDe(e.clientX)); };
  const onUp = () => setDragging(false);
  const onKey = (e: RKeyboardEvent) => {
    setInteragiu(true);
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setBruto((v) => Math.min(MAX, v + STEP)); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setBruto((v) => Math.max(MIN, v - STEP)); }
    else if (e.key === "Home") setBruto(MIN);
    else if (e.key === "End") setBruto(MAX);
    else if (e.key === "PageUp") { e.preventDefault(); setBruto((v) => Math.min(MAX, v + 10000)); }
    else if (e.key === "PageDown") { e.preventDefault(); setBruto((v) => Math.max(MIN, v - 10000)); }
  };

  return (
    <section id="empresa" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal className="mb-8 text-center">
          <div className="eyebrow mb-3 text-brand">Recibos verdes vs empresa</div>
          <h2 className="font-display display-2 font-semibold text-ink">Será que vale a pena abrir uma empresa?</h2>
          <p className="mx-auto mt-3 max-w-md text-stone-500">
            Arrasta o teu rendimento anual e vê, na hora, qual modelo te deixa com mais dinheiro no bolso.
          </p>
        </Reveal>

        <Reveal>
          <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card sm:p-8">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-sm font-medium text-stone-500">Faturação anual</span>
              <div className="font-display text-3xl font-semibold text-ink tabular-nums">{fmt(bruto)}</div>
            </div>

            <AnimatePresence>
              {!interagiu && (
                <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-1 text-center text-xs font-medium text-brand">
                  Arrasta para ajustar
                </m.div>
              )}
            </AnimatePresence>

            {/* Balão sobre o thumb */}
            <div className="pointer-events-none relative h-8">
              <div className="absolute bottom-0 -translate-x-1/2" style={{ left: `${pct}%` }}>
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition-colors ${dragging ? "bg-brand-dark" : "bg-brand"}`}>
                  {fmt(bruto)}
                </span>
              </div>
            </div>

            {/* Pista + thumb */}
            <div
              ref={trackRef}
              role="slider"
              aria-valuemin={MIN}
              aria-valuemax={MAX}
              aria-valuenow={bruto}
              aria-label="Faturação anual"
              tabIndex={0}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onKeyDown={onKey}
              className={`relative h-3 select-none rounded-full bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              {bePct != null && (
                <div className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-alert-text" style={{ left: `${bePct}%` }} aria-hidden />
              )}
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct}%` }}>
                <div className={`h-6 w-6 rounded-full border-2 bg-white shadow transition-colors ${dragging ? "border-brand-dark" : "border-brand"}`} />
              </div>
            </div>

            {/* Rótulos */}
            <div className="relative mt-3 h-4 text-xs text-stone-400">
              <span className="absolute left-0">{fmt(MIN)}</span>
              {bePct != null && (
                <span className="absolute -translate-x-1/2 whitespace-nowrap font-semibold text-alert-text" style={{ left: `${Math.min(85, Math.max(15, bePct))}%` }}>
                  Vira aqui · {fmt(breakEven!)}
                </span>
              )}
              <span className="absolute right-0">{fmt(MAX)}+</span>
            </div>

            {/* Presets */}
            <div className="mt-7 flex flex-wrap gap-1.5">
              {[15000, 25000, 40000, 60000, 80000, 100000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setBruto(v); setInteragiu(true); }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${bruto === v ? "border-brand bg-brand-light text-brand-dark" : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"}`}
                >
                  {fmt(v)}
                </button>
              ))}
            </div>

            {/* Dois modelos */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <ResultCard titulo="Recibos verdes" sub="Categoria B" liquido={r.freelancer.liquido} vence={!empresaVence} />
              <ResultCard titulo="Empresa" sub="IRC + dividendos" liquido={r.empresa.liquido} vence={empresaVence} />
            </div>

            {/* Veredicto */}
            <div className={`mt-3 flex items-center gap-2.5 rounded-2xl p-3.5 text-sm font-semibold ${empresaVence ? "bg-brand-light text-brand-dark" : "bg-cream text-stone-700"}`}>
              <span className="flex-shrink-0 text-brand"><Check size={16} /></span>
              {empresaVence
                ? <span>Com {fmt(bruto)}/ano, a empresa deixa-te com mais <strong>{fmt(Math.abs(r.diferenca))}</strong>/ano.</span>
                : <span>Com {fmt(bruto)}/ano, os recibos verdes deixam-te com mais <strong>{fmt(Math.abs(r.diferenca))}</strong>/ano.</span>}
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-6">
          <div className="flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-4">
            <span className="mt-0.5 flex-shrink-0 text-alert-text"><Warning size={14} /></span>
            <p className="text-xs leading-relaxed text-alert-text">
              Estimativa de ordem de grandeza: atividade do Art. 151.º, cerca de {fmt(CUSTOS_EMPRESA)}/ano de custos extra
              da empresa e distribuição de todo o lucro como dividendos. Não considera salário/Segurança Social do gerente,
              tributação autónoma, englobamento de dividendos nem custos de constituição. A decisão de abrir uma sociedade
              deve ser sempre validada com um contabilista certificado.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ResultCard({ titulo, sub, liquido, vence }: { titulo: string; sub: string; liquido: number; vence: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 transition-all ${vence ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-semibold ${vence ? "text-brand-dark" : "text-stone-700"}`}>{titulo}</span>
        {vence && <span className="flex-shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">Melhor</span>}
      </div>
      <div className="mt-0.5 text-[11px] text-stone-400">{sub}</div>
      <div className={`mt-2 font-display text-2xl font-semibold tabular-nums ${vence ? "text-brand-dark" : "text-stone-800"}`}>{fmt(liquido)}</div>
      <div className="text-[11px] text-stone-400">líquido para ti / ano</div>
    </div>
  );
}
