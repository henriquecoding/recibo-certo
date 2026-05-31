"use client";

import { m } from "motion/react";
import { ArrowRight, Lock, ShieldCheck, Flag, Warning } from "@/components/ui/Icons";
import { scrollToId } from "@/lib/scroll";
import { staggerContainer, staggerItem, EASE } from "@/lib/motion";

const TRUST = [
  { icon: <Lock />, text: "Sem registo" },
  { icon: <ShieldCheck />, text: "Taxas 2026 verificadas" },
  { icon: <Flag />, text: "Feito para Portugal" },
];

// Exemplo ilustrativo (mesmos números do recibo-tipo de 2.000 €, Art. 151.º).
const EX_BRUTO = 2000;
const EX_TEU = 1241;
const EX_IRS = 460;
const EX_SS = 299;
const eur0 = (n: number) => `${Math.round(n).toLocaleString("pt-PT")} €`;

export default function Hero() {
  // Proporção do recibo que fica para o trabalhador (estável, sem datas).
  const pctTeu = Math.round((EX_TEU / EX_BRUTO) * 100);
  const seg = [
    { v: EX_TEU, color: "#1D9E75" },
    { v: EX_IRS, color: "#9FE1CB" },
    { v: EX_SS, color: "#D3D1C7" },
  ];
  const total = seg.reduce((s, p) => s + p.v, 0) || 1;

  return (
    <section className="grain relative overflow-hidden px-6 pt-20 pb-16">
      {/* Atmosfera: brilhos orgânicos da marca (não gradientes aleatórios). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute top-40 -left-32 h-[24rem] w-[24rem] rounded-full bg-brand-mint/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Texto */}
        <m.div initial="hidden" animate="visible" variants={staggerContainer}>
          <m.div
            variants={staggerItem}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-light px-3.5 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="text-xs font-semibold text-brand-dark">Atualizado para 2026 · Grátis</span>
          </m.div>

          <m.h1 variants={staggerItem} className="font-display display-1 text-balance font-semibold text-ink">
            De cada recibo,
            <br />
            sabe o que é <span className="text-brand">mesmo teu.</span>
          </m.h1>

          <m.p variants={staggerItem} className="mt-6 max-w-md text-lg leading-relaxed text-stone-500">
            Separamos, em segundos, o que fica para ti do que é do Estado — IRS, Segurança Social e IVA. E mostramos-te
            quanto podes gastar, sem sobressaltos no fim do trimestre.
          </m.p>

          <m.div variants={staggerItem} className="mt-9 flex flex-wrap gap-3">
            <m.button
              type="button"
              onClick={() => scrollToId("calculadora")}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
            >
              Calcular o meu recibo
              <ArrowRight />
            </m.button>
            <m.button
              type="button"
              onClick={() => scrollToId("features")}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Como funciona
            </m.button>
          </m.div>

          <m.ul variants={staggerItem} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            {TRUST.map((b) => (
              <li key={b.text} className="flex items-center gap-2">
                <span className="text-brand">{b.icon}</span>
                <span className="text-xs font-medium text-stone-500">{b.text}</span>
              </li>
            ))}
          </m.ul>
        </m.div>

        {/* Cartão-resposta: a pergunta nº1 respondida em concreto. */}
        <m.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          className="relative"
        >
          <div className="rounded-4xl border border-stone-200/80 bg-white p-6 shadow-float sm:p-7">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-400">Recibo de {eur0(EX_BRUTO)} · Art. 151.º</span>
              <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
                Exemplo
              </span>
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium uppercase tracking-wider text-stone-400">O que é mesmo teu</div>
              <div className="mt-1 font-display text-5xl font-semibold leading-none text-brand tabular-nums">
                {eur0(EX_TEU)}
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-cream px-3 py-1.5 text-xs text-stone-500">
                <span className="font-semibold text-stone-700 tabular-nums">{pctTeu}% deste recibo é mesmo teu</span>
                <span className="text-stone-300">·</span>
                <span>o resto é do Estado</span>
              </div>
            </div>

            {/* Barra: o teu dinheiro vs. o do Estado */}
            <div className="mt-5 flex h-2 gap-0.5 overflow-hidden rounded-full">
              {seg.map((p, i) => (
                <div
                  key={p.color}
                  className={i === 0 ? "rounded-l-full" : i === seg.length - 1 ? "rounded-r-full" : ""}
                  style={{ background: p.color, width: `${(p.v / total) * 100}%` }}
                />
              ))}
            </div>

            <div className="mt-4 space-y-1.5">
              {[
                { l: "Retenção IRS (23%)", v: `− ${eur0(EX_IRS)}` },
                { l: "Segurança Social", v: `− ${eur0(EX_SS)}` },
                { l: "Disponível para gastar", v: eur0(EX_TEU), strong: true },
              ].map((r) => (
                <div
                  key={r.l}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    r.strong ? "bg-brand-light" : "bg-stone-50"
                  }`}
                >
                  <span className={`text-xs ${r.strong ? "font-semibold text-brand-dark" : "text-stone-500"}`}>{r.l}</span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${r.strong ? "text-brand-dark" : "text-stone-700"}`}
                  >
                    {r.v}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-alert text-alert-text">
                <Warning size={12} />
              </div>
              <div>
                <div className="text-xs font-semibold text-alert-text">Prazo SS — 20 julho</div>
                <div className="text-xs text-alert-text/80">Reserva {eur0(EX_SS)} · avisamos a tempo</div>
              </div>
            </div>
          </div>
        </m.div>
      </div>
    </section>
  );
}
