"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Plus, ArrowRight } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import { faqs, faqsPorCategoria, type FaqCategoria, type FaqItem } from "@/lib/faq";
import { usePerfil, type Perfil } from "@/lib/perfil";
import { EASE } from "@/lib/motion";

// Categoria de perguntas mais relevante para cada perfil selecionado — por
// defeito só se mostram ESSAS (a landing não despeja as 18 a toda a gente).
const CATEGORIA_PERFIL: Record<Perfil, FaqCategoria> = {
  independente: "Recibos Verdes",
  dependente: "Contratos de Trabalho",
  empresa: "Geral",
  comparar: "Geral",
};
const MAX_POR_PERFIL = 6;

function ItemFAQ({ faq, isOpen, onToggle }: { faq: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border bg-white transition-colors ${
        isOpen ? "border-brand shadow-card" : "border-stone-200"
      }`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className={`text-sm font-semibold ${isOpen ? "text-brand-dark" : "text-stone-700"}`}>{faq.q}</span>
        <m.div
          animate={{ rotate: isOpen ? 45 : 0, backgroundColor: isOpen ? "#1D9E75" : "#F5F5F4" }}
          transition={{ duration: 0.25, ease: EASE }}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
        >
          <Plus size={12} className={isOpen ? "text-white" : "text-stone-500"} />
        </m.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-stone-500">{faq.a}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const { perfil } = usePerfil();
  const [open, setOpen] = useState<string | null>(null);
  const [todas, setTodas] = useState(false);

  const cat = CATEGORIA_PERFIL[perfil] ?? "Geral";
  const doPerfil = faqs.filter((f) => f.categoria === cat).slice(0, MAX_POR_PERFIL);
  const toggle = (q: string) => setOpen((o) => (o === q ? null : q));

  return (
    <section id="faq" className="scroll-mt-24 px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <Reveal className="mb-10 text-center">
          <div className="eyebrow mb-3 text-brand">Dúvidas frequentes</div>
          <h2 className="font-display display-2 font-semibold text-ink">As tuas dúvidas, respondidas.</h2>
          <p className="mx-auto mt-3 max-w-md text-stone-500">
            As perguntas que mais importam ao teu caso — e todas as outras a um clique.
          </p>
        </Reveal>

        {/* Por defeito: só as perguntas do perfil ativo (transição suave na troca) */}
        {!todas && (
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={perfil}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="space-y-3"
            >
              {doPerfil.map((faq) => (
                <ItemFAQ key={faq.q} faq={faq} isOpen={open === faq.q} onToggle={() => toggle(faq.q)} />
              ))}
            </m.div>
          </AnimatePresence>
        )}

        {/* "Ver todas" revela as 18 perguntas agrupadas por categoria */}
        {todas && (
          <div className="space-y-10">
            {faqsPorCategoria.map((grupo) => (
              <div key={grupo.categoria}>
                <h3 className="mb-4 px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
                  {grupo.categoria}
                </h3>
                <div className="space-y-3">
                  {grupo.itens.map((faq) => (
                    <ItemFAQ key={faq.q} faq={faq} isOpen={open === faq.q} onToggle={() => toggle(faq.q)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!todas && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setTodas(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            >
              Ver todas as {faqs.length} perguntas <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
