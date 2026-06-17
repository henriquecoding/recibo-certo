"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Plus } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import { faqsPorCategoria } from "@/lib/faq";
import { EASE } from "@/lib/motion";

export default function FAQ() {
  // Identifica a pergunta aberta pela própria string (única entre categorias).
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="faq" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <Reveal className="mb-12 text-center">
          <div className="eyebrow mb-3 text-brand">Dúvidas frequentes</div>
          <h2 className="font-display display-2 font-semibold text-ink">As tuas dúvidas, respondidas.</h2>
          <p className="mx-auto mt-3 max-w-md text-stone-500">
            Recibos verdes ou contrato de trabalho — encontra a tua resposta por tema.
          </p>
        </Reveal>

        <div className="space-y-10">
          {faqsPorCategoria.map((grupo) => (
            <div key={grupo.categoria}>
              <h3 className="mb-4 px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {grupo.categoria}
              </h3>
              <div className="space-y-3">
                {grupo.itens.map((faq) => {
                  const isOpen = open === faq.q;
                  return (
                    <div
                      key={faq.q}
                      className={`overflow-hidden rounded-3xl border bg-white transition-colors ${
                        isOpen ? "border-brand shadow-card" : "border-stone-200"
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : faq.q)}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left"
                      >
                        <span className={`text-sm font-semibold ${isOpen ? "text-brand-dark" : "text-stone-700"}`}>
                          {faq.q}
                        </span>
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
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
