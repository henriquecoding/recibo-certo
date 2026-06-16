"use client";

import { m, AnimatePresence } from "motion/react";
import { Close, Settings } from "@/components/ui/Icons";

interface QuizConfigModalProps {
  aberto: boolean;
  onFechar: () => void;
  onReiniciar: () => void;
  onSair: () => void;
}

export default function QuizConfigModal({
  aberto,
  onFechar,
  onReiniciar,
  onSair,
}: QuizConfigModalProps) {
  return (
    <AnimatePresence>
      {aberto && (
        <>
          {/* Overlay */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onFechar}
            aria-hidden
          />

          {/* Modal */}
          <m.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: "#f0e8d8", border: "1px solid #d4c4b0" }}
            role="dialog"
            aria-modal
            aria-labelledby="config-titulo"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span style={{ color: "#3a5232" }}><Settings size={20} /></span>
                <h2
                  id="config-titulo"
                  className="font-display text-[17px] font-bold"
                  style={{ color: "#1a1a17" }}
                >
                  Configurações
                </h2>
              </div>
              <button
                type="button"
                onClick={onFechar}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a5232]"
                style={{ color: "#6b5240" }}
                aria-label="Fechar configurações"
              >
                <Close size={18} />
              </button>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => { onFechar(); onReiniciar(); }}
                className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
                style={{ backgroundColor: "#3a5232" }}
              >
                Reiniciar quiz
              </button>

              <button
                type="button"
                onClick={() => { onFechar(); onSair(); }}
                className="w-full rounded-xl border py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2745a]"
                style={{ color: "#7a3c28", borderColor: "#c2745a", backgroundColor: "#faf6ef" }}
              >
                Sair do quiz
              </button>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
