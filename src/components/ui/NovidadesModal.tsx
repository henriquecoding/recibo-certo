"use client";

import { useEffect, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { Close, Sparkle, Calendar } from "@/components/ui/Icons";
import { APP_VERSION, VERSAO_STORAGE_KEY, CHANGELOG } from "@/lib/version";

export default function NovidadesModal() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    try {
      const visto = localStorage.getItem(VERSAO_STORAGE_KEY);
      if (visto !== APP_VERSION) {
        setAberto(true);
        // ⚠️ REGRA IMUTÁVEL do popup de Novidades (não alterar sem autorização):
        // o popup só pode aparecer (1) na primeira visita de sempre e (2) quando
        // surge uma NOVA versão (APP_VERSION muda no changelog). Para isso,
        // marcamos a versão como vista NO INSTANTE em que é mostrado — não apenas
        // ao fechar. Assim, se o utilizador atualizar a página com o popup aberto,
        // nunca reaparece para a mesma versão. Voltar a abrir só com nova versão.
        localStorage.setItem(VERSAO_STORAGE_KEY, APP_VERSION);
      }
    } catch {
      // ignore
    }
  }, []);

  function fechar() {
    // Redundante (já marcado ao mostrar), mas mantém a garantia se algo falhar.
    try {
      localStorage.setItem(VERSAO_STORAGE_KEY, APP_VERSION);
    } catch {
      // ignore
    }
    setAberto(false);
  }

  return (
    <AnimatePresence>
      {aberto && (
        <>
          <m.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9000] bg-black/50 backdrop-blur-sm"
            onClick={fechar}
            aria-hidden
          />
          {/* Contentor de posição — folha inferior no telemóvel, centrado no desktop.
              Centramos por flex (não por transform) para não colidir com a animação. */}
          <div className="pointer-events-none fixed inset-0 z-[9001] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <m.div
              key="modal"
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              role="dialog"
              aria-modal
              aria-labelledby="novidades-titulo"
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-4xl bg-white shadow-float dark:bg-stone-900 sm:max-h-[680px] sm:rounded-4xl"
            >
            {/* Puxador (folha inferior, só no telemóvel) */}
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-stone-200 dark:bg-stone-700 sm:hidden" aria-hidden />

            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4 px-6 pt-4 pb-4 border-b border-stone-100 dark:border-stone-800 shrink-0 sm:pt-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <Sparkle size={16} />
                </span>
                <div>
                  <h2 id="novidades-titulo" className="font-display text-[16px] font-semibold text-stone-800 dark:text-stone-100">
                    Novidades & Atualizações
                  </h2>
                  <p className="text-[12px] text-stone-400 dark:text-stone-500 mt-0.5">
                    Fique a par das últimas melhorias no ReciboCerto.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800 dark:text-stone-500"
              >
                <Close size={16} />
              </button>
            </div>

            {/* Corpo scrollável — min-h-0 é essencial para o overflow funcionar dentro do flex column */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-6 overscroll-contain">
              {CHANGELOG.map((entrada, i) => {
                const isNova = entrada.version === APP_VERSION;
                return (
                  <div key={entrada.version} className="flex gap-4">
                    {/* Linha temporal */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`mt-1 h-3 w-3 rounded-full shrink-0 ${isNova ? "ring-2 ring-brand ring-offset-2 ring-offset-white dark:ring-offset-stone-900" : "border-2 border-stone-300 dark:border-stone-600"}`}
                        style={{
                          backgroundColor: isNova ? "#1D9E75" : "transparent",
                        }}
                        aria-hidden
                      />
                      {i < CHANGELOG.length - 1 && (
                        <div className="mt-1 flex-1 w-px bg-stone-100 dark:bg-stone-800" aria-hidden />
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="pb-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[13px] font-bold text-stone-700 dark:text-stone-200">
                          v{entrada.version}
                        </span>
                        {isNova && (
                          <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white leading-none">
                            Novo
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500">
                          <Calendar size={11} />
                          {formatarData(entrada.data)}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-100 mb-2">
                        {entrada.titulo}
                      </p>
                      <ul className="space-y-1.5">
                        {entrada.itens.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-[12px] text-stone-600 dark:text-stone-400 leading-snug">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 bg-brand" aria-hidden />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé */}
            <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 border-t border-stone-100 dark:border-stone-800 shrink-0">
              <button
                type="button"
                onClick={fechar}
                className="btn-shine flex w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Fechar
              </button>
            </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
