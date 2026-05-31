"use client";

import { useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { Check, Lock, ShieldCheck, Flag } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import { scrollToId } from "@/lib/scroll";

// ─── Estrutura de planos (Cenário C — crescimento sustentável) ──────────
// Dois planos: o Grátis resolve a dor aguda (calcular, simular, comparar) e
// o Pro vende tranquilidade contínua (alertas, nuvem, handoff ao contabilista).

const GRATIS = [
  "Calculadora completa de recibo verde",
  "Simulador de IRS anual",
  "Calendário de prazos fiscais",
  "Histórico neste dispositivo",
  "Comparador: vale a pena abrir empresa?",
];

// Benefícios do Pro descritos pelo resultado, não pela funcionalidade.
const PRO = [
  "Avisamos-te antes de cada prazo — nunca mais uma coima",
  "O teu histórico seguro e em todos os dispositivos",
  "Um clique e fica pronto para o teu contabilista (CSV e PDF)",
  "Mealheiro fiscal: quanto reservar este mês, automático",
  "Cenários do simulador guardados e comparáveis",
];

// Matriz de comparação (divulgação progressiva — fica num acordeão).
const MATRIZ: { f: string; gratis: boolean | string; pro: boolean | string }[] = [
  { f: "Calculadora de recibo verde", gratis: true, pro: true },
  { f: "Simulador de IRS anual", gratis: true, pro: true },
  { f: "Calendário de prazos fiscais", gratis: true, pro: true },
  { f: "Comparador recibos vs empresa", gratis: true, pro: true },
  { f: "Histórico", gratis: "Neste dispositivo", pro: "Na nuvem, em todos" },
  { f: "Alertas de prazos por email", gratis: false, pro: true },
  { f: "Exportação CSV e PDF", gratis: false, pro: true },
  { f: "Mealheiro fiscal automático", gratis: false, pro: true },
  { f: "Cenários do simulador guardados", gratis: false, pro: true },
  { f: "Suporte", gratis: "—", pro: "Por email" },
];

const GARANTIAS = [
  { icon: <Lock size={14} />, texto: "Sem cartão para experimentar" },
  { icon: <ShieldCheck size={14} />, texto: "Cancela quando quiseres" },
  { icon: <Flag size={14} />, texto: "Dados em servidores na UE" },
];

function MatrizCelula({ valor }: { valor: boolean | string }) {
  if (valor === true) return <span className="inline-flex text-brand"><Check size={16} /></span>;
  if (valor === false)
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="inline-block text-stone-300">
        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  return <span className="text-xs text-stone-500">{valor}</span>;
}

export default function Precos() {
  const [anual, setAnual] = useState(true);

  const precoGrande = anual ? "4,00 €" : "5,99 €";
  const subPreco = anual ? "faturado 47,99 € por ano · poupa 33%" : "faturado mensalmente";

  return (
    <section id="precos" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal className="mb-8 text-center">
          <div className="eyebrow mb-3 text-brand">Planos</div>
          <h2 className="font-display display-2 font-semibold text-ink">Começa grátis. Cresce quando precisares.</h2>
          <p className="mx-auto mt-3 max-w-md text-stone-500">
            Calcular e simular é grátis para sempre. Pagas só quando quiseres deixar de te preocupar com prazos.
          </p>
        </Reveal>

        {/* Toggle mensal/anual */}
        <Reveal className="mb-8 flex justify-center">
          <div role="group" aria-label="Período de faturação" className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 p-1">
            <button
              type="button"
              aria-pressed={!anual}
              onClick={() => setAnual(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${!anual ? "bg-white text-brand-dark shadow-card" : "text-stone-500 hover:text-stone-700"}`}
            >
              Mensal
            </button>
            <button
              type="button"
              aria-pressed={anual}
              onClick={() => setAnual(true)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${anual ? "bg-white text-brand-dark shadow-card" : "text-stone-500 hover:text-stone-700"}`}
            >
              Anual
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand-dark">−33%</span>
            </button>
          </div>
        </Reveal>

        <div className="grid items-start gap-4 sm:grid-cols-2">
          {/* ── Grátis ── */}
          <Reveal>
            <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-7 shadow-card">
              <h3 className="text-sm font-semibold text-stone-500">Grátis</h3>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-semibold text-ink tabular-nums">0 €</span>
                <span className="text-xs text-stone-400">para sempre</span>
              </div>
              <p className="mt-3 text-sm text-stone-500">Tudo o que precisas para saber o que é teu.</p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {GRATIS.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 text-brand"><Check size={16} /></span>
                    <span className="text-sm text-stone-600">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                className="mt-7 inline-flex justify-center rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300"
              >
                Começar grátis
              </Link>
            </div>
          </Reveal>

          {/* ── Pro ── */}
          <Reveal delay={0.08}>
            <m.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex h-full flex-col rounded-4xl border border-brand bg-white p-7 shadow-glow sm:-mt-3 sm:pb-9"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-500">Pro</h3>
                <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                  Recomendado
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-semibold text-ink tabular-nums">{precoGrande}</span>
                <span className="text-xs text-stone-400">por mês</span>
              </div>
              <p className="mt-1 text-xs text-stone-400">{subPreco}</p>

              <p className="mt-4 text-sm font-semibold text-stone-700">Tudo do Grátis, mais:</p>
              <ul className="mt-3 flex-1 space-y-2.5">
                {PRO.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 text-brand"><Check size={16} /></span>
                    <span className="text-sm text-stone-600">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => scrollToId("lista")}
                className="btn-shine mt-7 inline-flex justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
              >
                Quero o preço de fundador
              </button>
              <p className="mt-2 text-center text-xs text-stone-400">Acesso antecipado · sem compromisso</p>
            </m.div>
          </Reveal>
        </div>

        {/* Garantias */}
        <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {GARANTIAS.map((g) => (
            <span key={g.texto} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <span className="text-brand">{g.icon}</span>
              {g.texto}
            </span>
          ))}
        </Reveal>

        {/* Comparação completa (acordeão) */}
        <Reveal className="mt-8">
          <details className="group mx-auto max-w-2xl rounded-3xl border border-stone-100 bg-white px-5 py-4 shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-stone-700">
              Ver comparação completa de funcionalidades
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-stone-400 transition-transform group-open:rotate-180">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="mt-4 overflow-hidden rounded-2xl border border-stone-100">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-400">Funcionalidade</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-stone-400">Grátis</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-brand-dark">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIZ.map((r) => (
                    <tr key={r.f} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2.5 text-sm text-stone-600">{r.f}</td>
                      <td className="px-3 py-2.5 text-center"><MatrizCelula valor={r.gratis} /></td>
                      <td className="px-3 py-2.5 text-center"><MatrizCelula valor={r.pro} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Reveal>

        <p className="mt-8 text-center text-xs text-stone-400">
          O Pro chega em breve. Entra na lista e garante o preço de fundador — e acesso antecipado.
        </p>
      </div>
    </section>
  );
}
