"use client";

import { m, AnimatePresence } from "motion/react";
import { Close } from "@/components/ui/Icons";
import { resolveQuizIcon } from "./icon-map";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal";
import type { QuizCategoria } from "@/lib/quiz-fiscal";

const CATEGORIAS = Object.entries(META_CATEGORIA_QUIZ) as [
  QuizCategoria,
  (typeof META_CATEGORIA_QUIZ)[QuizCategoria],
][];

interface QuizMenuLateralProps {
  aberto: boolean;
  onFechar: () => void;
  categoriaAtiva?: QuizCategoria;
  onSair: () => void;
}

export default function QuizMenuLateral({
  aberto,
  onFechar,
  categoriaAtiva,
  onSair,
}: QuizMenuLateralProps) {
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
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onFechar}
            aria-hidden
          />

          {/* Drawer desliza da esquerda */}
          <m.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col"
            style={{ backgroundColor: "#f0e8d8", borderRight: "1px solid #d4c4b0" }}
            role="dialog"
            aria-modal
            aria-label="Menu de categorias"
          >
            {/* Cabeçalho */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: "#d4c4b0" }}
            >
              <h2 className="font-display text-[16px] font-bold" style={{ color: "#1a1a17" }}>
                Categorias
              </h2>
              <button
                type="button"
                onClick={onFechar}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a5232]"
                style={{ color: "#6b5240" }}
                aria-label="Fechar menu"
              >
                <Close size={18} />
              </button>
            </div>

            {/* Lista de categorias */}
            <nav className="flex-1 overflow-y-auto py-2">
              {CATEGORIAS.map(([key, meta]) => {
                const Icon = resolveQuizIcon(meta.icon);
                const ativo = key === categoriaAtiva;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={onFechar}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#e8dcc8] focus-visible:outline-none focus-visible:bg-[#e8dcc8]"
                    style={{
                      backgroundColor: ativo ? "#deeade" : "transparent",
                      borderLeft: `3px solid ${ativo ? "#3a5232" : "transparent"}`,
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: ativo ? "#3a5232" : "#d4c4b0",
                        color: ativo ? "#fff" : "#6b5240",
                      }}
                    >
                      {Icon && <Icon size={17} />}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[13px] font-semibold truncate"
                        style={{ color: ativo ? "#145532" : "#1a1a17" }}
                      >
                        {meta.label}
                      </div>
                      <div
                        className="text-[11px] leading-snug mt-0.5 line-clamp-1"
                        style={{ color: "#6b5240" }}
                      >
                        {meta.descricao}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Rodapé */}
            <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "#d4c4b0" }}>
              <button
                type="button"
                onClick={() => { onFechar(); onSair(); }}
                className="w-full rounded-xl py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
                style={{ backgroundColor: "#3a5232" }}
              >
                Nova sessão
              </button>
            </div>
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}
