"use client";

import { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { Check, Close, History } from "@/components/ui/Icons";

interface GuardarCenarioDialogProps {
  aberto: boolean;
  nomePadrao: string;
  onGuardar: (nome: string) => void;
  onFechar: () => void;
  titulo?: string;
  descricao?: string;
}

// Modal para nomear e guardar um cenário — substitui o window.prompt nativo.
// Folha inferior no telemóvel, centrado no desktop; foco automático no input,
// Enter confirma, Esc/clique fora cancela.
export default function GuardarCenarioDialog({
  aberto,
  nomePadrao,
  onGuardar,
  onFechar,
  titulo = "Guardar cenário",
  descricao = "Dá-lhe um nome para o reabrires mais tarde em «Os meus cenários».",
}: GuardarCenarioDialogProps) {
  const [nome, setNome] = useState(nomePadrao);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ao abrir, repõe o nome padrão e seleciona o texto para edição rápida.
  useEffect(() => {
    if (!aberto) return;
    setNome(nomePadrao);
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto, nomePadrao, onFechar]);

  function confirmar() {
    const limpo = nome.trim();
    onGuardar(limpo || nomePadrao);
  }

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[9000]" role="dialog" aria-modal="true" aria-labelledby="guardar-cenario-titulo">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
            onClick={onFechar}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <m.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-t-4xl border border-stone-200/80 bg-white shadow-float dark:border-stone-800 dark:bg-stone-900 sm:rounded-4xl"
            >
              {/* Puxador (folha inferior, só telemóvel) */}
              <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-stone-200 dark:bg-stone-700 sm:hidden" aria-hidden />

              <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-4 sm:pt-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">
                    <History size={16} />
                  </span>
                  <div>
                    <h2 id="guardar-cenario-titulo" className="font-display text-base font-semibold text-ink">
                      {titulo}
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{descricao}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onFechar}
                  aria-label="Cancelar"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                >
                  <Close size={16} />
                </button>
              </div>

              <div className="px-6 pb-2">
                <label htmlFor="guardar-cenario-input" className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">
                  Nome do cenário
                </label>
                <input
                  id="guardar-cenario-input"
                  ref={inputRef}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmar();
                    }
                  }}
                  maxLength={80}
                  placeholder={nomePadrao}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition-shadow placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
                <button
                  type="button"
                  onClick={onFechar}
                  className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  className="btn-shine inline-flex items-center gap-1.5 rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:bg-brand-dark hover:shadow-float"
                >
                  <Check size={15} /> Guardar
                </button>
              </div>
            </m.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
