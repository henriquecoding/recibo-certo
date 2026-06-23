"use client";

import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { Export, Sparkle, Check, Close } from "@/components/ui/Icons";

// Upsell partilhado, mostrado quando a exportação grátis (1 experimentação por
// simulador) já foi usada. Folha inferior no telemóvel, cartão centrado no resto.
export default function UpsellExportacao({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Exportar com o Pro">
          <m.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-stone-900/45 backdrop-blur-md" onClick={onClose} aria-hidden
          />
          <m.div
            initial={{ y: 24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl border border-stone-200/80 bg-white shadow-float ring-1 ring-black/5 dark:border-stone-800 dark:bg-stone-900 sm:rounded-3xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <Close size={18} />
            </button>

            <div className="p-6 sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                <Export size={22} />
              </span>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-dark dark:bg-brand/10 dark:text-brand">
                <Sparkle size={12} /> Funcionalidade Pro
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
                Exportar é uma funcionalidade Pro
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                Já usaste a tua exportação de experimentação neste dispositivo. Passa a Pro para
                exportares e guardares sem limites — em PDF e CSV, sincronizado na nuvem.
              </p>

              <ul className="mt-4 space-y-2">
                {[
                  "Exportação ilimitada em PDF e CSV",
                  "Cenários guardados e sincronizados na nuvem",
                  "Acesso entre todos os teus dispositivos",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                    <Check size={15} className="flex-shrink-0 text-brand" /> {t}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/dashboard/upgrade"
                  onClick={onClose}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:bg-brand-dark"
                >
                  <Sparkle size={16} /> Conhecer o Pro
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-300"
                >
                  Agora não
                </button>
              </div>
            </div>
            <div className="h-[env(safe-area-inset-bottom)] sm:hidden" aria-hidden />
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
