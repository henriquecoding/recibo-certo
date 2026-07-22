"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "motion/react";
import {
  Close,
  ArrowRight,
  LayoutGrid,
  Coin,
  ShieldCheck,
  Scale,
  Gift,
} from "@/components/ui/Icons";
import { useModalA11y } from "@/hooks/useModalA11y";
import { scrollToId } from "@/lib/scroll";
import { EASE } from "@/lib/motion";

interface ComoFuncionaModalProps {
  aberto: boolean;
  onFechar: () => void;
}

// Passos do "como funciona" — a promessa da marca: dás poucos dados, nós fazemos
// as contas. Nada inventado, tudo com base legal e taxas oficiais de 2026.
const PASSOS = [
  {
    Icon: LayoutGrid,
    titulo: "Escolhe o que fazes",
    texto:
      "Recibos verdes, salário por conta de outrem ou empresa. Dizes a atividade e a região — sem formulários intermináveis.",
  },
  {
    Icon: Coin,
    titulo: "Diz-nos só o valor",
    texto:
      "A tua faturação, e mais nada. Tratamos do IRS, da Segurança Social e do IVA com as taxas oficiais de 2026.",
  },
  {
    Icon: ShieldCheck,
    titulo: "Vê o que fica para ti",
    texto:
      "Quanto é mesmo teu, quanto reservar todos os meses e o calendário fiscal — para nunca seres apanhado de surpresa.",
  },
] as const;

const CONFIANCA = [
  { Icon: ShieldCheck, texto: "Taxas de 2026 verificadas" },
  { Icon: Scale, texto: "Base legal em cada cálculo" },
  { Icon: Gift, texto: "Grátis, sem registo" },
] as const;

export default function ComoFuncionaModal({ aberto, onFechar }: ComoFuncionaModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(aberto, onFechar, dialogRef);

  // Portal para o <body>: o Hero vive dentro de secções animadas (transform/
  // opacity) que criam contexto de empilhamento e prendem o `z-index` — sem o
  // portal, a barra de navegação inferior do telemóvel tapava o CTA do modal.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const conteudo = (
    <AnimatePresence>
      {aberto && (
        <>
          <m.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[8000] bg-black/50 backdrop-blur-sm"
            onClick={onFechar}
            aria-hidden
          />

          {/* Folha inferior no telemóvel, centrado no desktop. */}
          <div className="pointer-events-none fixed inset-0 z-[8001] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <m.div
              key="modal"
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal
              aria-labelledby="como-funciona-titulo"
              className="pointer-events-auto flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-4xl bg-white shadow-float outline-none dark:bg-stone-900 sm:rounded-4xl"
            >
              {/* Puxador (folha inferior, só no telemóvel) */}
              <div
                className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-stone-200 dark:bg-stone-700 sm:hidden"
                aria-hidden
              />

              {/* Cabeçalho */}
              <div className="relative shrink-0 border-b border-stone-100 px-7 pb-5 pt-5 dark:border-stone-800 sm:pt-7">
                <div className="eyebrow mb-2 text-brand">Simples e sem contabilês</div>
                <h2
                  id="como-funciona-titulo"
                  className="font-display text-2xl font-semibold text-ink"
                >
                  Como funciona
                </h2>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  Dás uns poucos dados e mostramos-te tudo. As contas são por nossa conta.
                </p>
                <button
                  type="button"
                  onClick={onFechar}
                  aria-label="Fechar"
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800"
                >
                  <Close size={16} />
                </button>
              </div>

              {/* Corpo scrollável — min-h-0 essencial para o overflow no flex column */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6">
                <ol className="space-y-5">
                  {PASSOS.map(({ Icon, titulo, texto }, i) => (
                    <li key={titulo} className="flex gap-4">
                      <div className="relative flex-shrink-0">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                          <Icon size={20} />
                        </span>
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white shadow-glow">
                          {i + 1}
                        </span>
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <h3 className="font-display text-base font-semibold text-ink">
                          {titulo}
                        </h3>
                        <p className="mt-0.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                          {texto}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>

                {/* Faixa de confiança */}
                <div className="mt-6 grid grid-cols-1 gap-2 rounded-2xl border border-stone-100 bg-cream/60 p-4 dark:border-stone-800 dark:bg-stone-800/40 sm:grid-cols-3 sm:gap-3">
                  {CONFIANCA.map(({ Icon, texto }) => (
                    <div key={texto} className="flex items-center gap-2">
                      <Icon size={14} className="flex-shrink-0 text-brand" />
                      <span className="text-[11px] font-medium leading-tight text-stone-500 dark:text-stone-400">
                        {texto}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rodapé — CTA */}
              <div className="shrink-0 border-t border-stone-100 px-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    onFechar();
                    scrollToId("calculadora");
                  }}
                  className="btn-shine flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  Calcular grátis
                  <ArrowRight size={14} />
                </button>
              </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (!montado) return null;
  return createPortal(conteudo, document.body);
}
