"use client";

import Link from "next/link";
import { m } from "motion/react";
import { Check, ArrowRight, BellAlert, ShieldCheck, Export } from "@/components/ui/Icons";
import { fadeUp, staggerContainer, staggerItem, inViewOnce } from "@/lib/motion";

const beneficios = [
  { icon: BellAlert, texto: "Alertas de prazos antes de cada entrega fiscal" },
  { icon: ShieldCheck, texto: "Histórico seguro na nuvem, acessível em qualquer dispositivo" },
  { icon: Export, texto: "Exportação direta para o teu contabilista" },
];

export default function EmailCapture({ fonte = "landing" }: { fonte?: string }) {
  return (
    <section
      id="lista"
      data-fonte={fonte}
      className="grain relative scroll-mt-24 overflow-hidden px-6 py-28"
      style={{
        background:
          "linear-gradient(135deg, #0A4A39 0%, #0F6E56 45%, #1D9E75 100%)",
      }}
    >
      {/* Decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
      />

      <m.div
        className="relative mx-auto max-w-xl text-center"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={inViewOnce}
      >
        {/* Eyebrow */}
        <m.div
          variants={fadeUp}
          className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-green-200"
        >
          Plano Pro
        </m.div>

        {/* Heading */}
        <m.h2
          variants={fadeUp}
          className="font-display mb-4 text-3xl font-semibold text-white"
        >
          Deixa de te preocupar com prazos
        </m.h2>

        {/* Description */}
        <m.p
          variants={fadeUp}
          className="mb-8 text-sm leading-relaxed text-green-100"
        >
          Com o Pro tens alertas automáticos antes de cada entrega, histórico na
          nuvem e exportação para contabilista — tudo o que precisas para nunca
          falhares um prazo.
        </m.p>

        {/* Benefits list */}
        <m.ul
          variants={staggerContainer}
          className="mx-auto mb-10 max-w-sm space-y-3 text-left"
        >
          {beneficios.map(({ icon: Icon, texto }) => (
            <m.li
              key={texto}
              variants={staggerItem}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                <Check size={14} />
              </span>
              <span className="flex items-center gap-2 text-sm leading-snug text-white/90">
                <Icon size={16} className="shrink-0 text-green-200" />
                {texto}
              </span>
            </m.li>
          ))}
        </m.ul>

        {/* CTA */}
        <m.div variants={fadeUp}>
          <Link href="/dashboard/upgrade">
            <m.span
              role="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="btn-shine inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-brand-dark shadow-lift transition-colors hover:bg-green-50"
            >
              Subscrever o Pro
              <ArrowRight size={14} />
            </m.span>
          </Link>
        </m.div>

        {/* Secondary link */}
        <m.div variants={fadeUp} className="mt-4">
          <Link
            href="/precos"
            className="inline-flex items-center gap-1 text-sm font-medium text-green-200 transition-colors hover:text-white"
          >
            Ver todos os planos
            <ArrowRight size={12} />
          </Link>
        </m.div>

        {/* Reassurance */}
        <m.p
          variants={fadeUp}
          className="mt-6 text-xs text-green-200/70"
        >
          Sem compromisso · cancela quando quiseres
        </m.p>
      </m.div>
    </section>
  );
}
