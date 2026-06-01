"use client";

/**
 * BetaPopup — Aviso de acesso antecipado ReciboCerto
 * ═══════════════════════════════════════════════════════════════════
 * Aparece em cada visita à landing page (sem sessionStorage).
 * Incentiva o utilizador a explorar a plataforma já disponível
 * em vez de o redirecionar para fora.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { Close, Sparkle, Calculator, ArrowRight, Check } from "@/components/ui/Icons";

// Cor de fundo do popup (verde profundo, on-brand)
const BG = "#0D211A";
const BRAND = "#1D9E75";
const BRAND_LIGHT = "#E1F5EE";
const BRAND_DARK = "#0F6E56";

export default function BetaPopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setTimeout(() => setVisible(false), 280);
  }, []);

  const handleCalculadora = useCallback(() => {
    dismiss();
    setTimeout(() => {
      document.getElementById("calculadora")?.scrollIntoView({ behavior: "smooth" });
    }, 320);
  }, [dismiss]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {!dismissed && (
        <>
          {/* ── Overlay ── */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="fixed inset-0 z-[9998]"
            style={{ background: "rgba(10,10,8,0.72)", backdropFilter: "blur(6px)" }}
            onClick={dismiss}
          />

          {/* ── Popup ── */}
          <m.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-sm overflow-hidden pointer-events-auto"
              style={{
                background: BG,
                border: `1px solid rgba(29,158,117,0.30)`,
                borderRadius: 28,
                boxShadow: `0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(29,158,117,0.08)`,
              }}
            >
              {/* Linha de destaque no topo */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #1D9E75, #6DD9B8, #1D9E75, transparent)",
                }}
              />

              {/* Glow decorativo */}
              <div
                className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36"
                style={{
                  background:
                    "radial-gradient(ellipse at top, rgba(29,158,117,0.14), transparent 70%)",
                }}
              />

              {/* Botão fechar */}
              <button
                type="button"
                onClick={dismiss}
                aria-label="Fechar"
                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:text-white/80"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Close size={14} />
              </button>

              {/* Conteúdo */}
              <div className="relative z-10 px-7 pb-7 pt-8">
                {/* Ícone central */}
                <div className="mb-6 flex justify-center">
                  <div
                    className="relative flex h-20 w-20 items-center justify-center rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, rgba(29,158,117,0.20), rgba(29,158,117,0.06))`,
                      border: `1px solid rgba(29,158,117,0.35)`,
                    }}
                  >
                    <Calculator size={38} className="text-white" />
                    {/* Badge animado */}
                    <m.div
                      animate={{ rotate: [0, 10, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                      className="absolute -top-2 -right-2 flex items-center justify-center rounded-lg p-1"
                      style={{
                        background: "#122E23",
                        border: `1px solid rgba(29,158,117,0.45)`,
                      }}
                    >
                      <Sparkle size={14} className="text-[#6DD9B8]" />
                    </m.div>
                  </div>
                </div>

                {/* Badge de estado */}
                <div className="mb-4 flex justify-center">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{
                      background: "rgba(29,158,117,0.10)",
                      border: "1px solid rgba(29,158,117,0.22)",
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: BRAND }}
                    />
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.16em]"
                      style={{ color: "#6DD9B8" }}
                    >
                      Acesso antecipado
                    </span>
                  </div>
                </div>

                {/* Título */}
                <h2
                  className="mb-3 text-center font-display text-xl font-semibold leading-snug text-white"
                >
                  Experimenta o ReciboCerto
                </h2>

                {/* Descrição */}
                <p
                  className="mb-5 px-1 text-center text-sm leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.50)" }}
                >
                  A plataforma cresce todos os dias. A calculadora, o simulador
                  de IRS e o comparador já funcionam com dados reais e
                  verificados — experimenta agora, é grátis e sem registo.
                </p>

                {/* Lista do que já está disponível */}
                <ul className="mb-6 space-y-2">
                  {[
                    "Calculadora por recibo e anual",
                    "Simulador de IRS com particularidades",
                    "Comparador recibos verdes vs empresa",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <span
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: "rgba(29,158,117,0.15)",
                          border: "1px solid rgba(29,158,117,0.30)",
                        }}
                      >
                        <Check size={11} className="text-[#6DD9B8]" />
                      </span>
                      <span
                        className="text-xs leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.60)" }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Separador */}
                <div
                  className="mb-5 h-px"
                  style={{ background: "rgba(29,158,117,0.12)" }}
                />

                {/* Botões de ação */}
                <div className="flex flex-col gap-2.5">
                  {/* CTA primário — scroll para a calculadora */}
                  <button
                    type="button"
                    onClick={handleCalculadora}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-semibold transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
                      color: "white",
                      boxShadow: `0 4px 20px rgba(29,158,117,0.30)`,
                    }}
                  >
                    <Calculator size={16} />
                    Calcular agora
                    <ArrowRight size={14} />
                  </button>

                  {/* CTA secundário — dashboard */}
                  <Link
                    href="/dashboard/simulador"
                    onClick={dismiss}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-medium transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.65)",
                    }}
                  >
                    Abrir o simulador de IRS
                  </Link>
                </div>

                {/* Nota de dismiss */}
                <p
                  className="mt-5 text-center text-[10px]"
                  style={{ color: "rgba(255,255,255,0.20)" }}
                >
                  Clica fora para continuar a explorar o site
                </p>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
