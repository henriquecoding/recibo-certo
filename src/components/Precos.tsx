"use client";

import { useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { Check, Lock, ShieldCheck, Flag, Trophy } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";

const GRATIS = [
  "Calculadora de recibos verdes (Cat. B)",
  "Simulador de recibo de vencimento (Cat. A)",
  "Simulador de IRS anual",
  "Comparador: dependente vs. recibos verdes vs. empresa",
  "Calendário de prazos fiscais",
  "Histórico neste dispositivo",
];

const PRO = [
  "Avisamos-te antes de cada prazo — nunca mais uma coima",
  "Auditoria do teu recibo de vencimento — deteta erros de IRS e SS",
  "O teu histórico seguro e em todos os dispositivos",
  "Um clique e fica pronto para o teu contabilista (CSV e PDF)",
  "Mealheiro fiscal: quanto reservar este mês, automático",
  "Cenários guardados e comparáveis (recibos verdes e vencimento)",
  "Energia ilimitada no Quiz Fiscal",
];

const QUIZ_MASTER = [
  "Tudo do plano Pro incluído",
  "Badge exclusivo de Guru do IRS no perfil",
  "Estatísticas avançadas de desempenho",
  "Acesso antecipado a novas funcionalidades",
];

const QUIZ_MASTER_DESC = "Criado para quem acredita que saber é poder. O Quiz Master reconhece quem domina a fiscalidade portuguesa e prova que um país mais informado começa por cada contribuinte. Chega ao topo, desbloqueia o plano e junta-te à comunidade que transforma conhecimento em confiança financeira.";

const MATRIZ: { f: string; gratis: boolean | string; pro: boolean | string; master: boolean | string }[] = [
  { f: "Calculadora de recibos verdes (Cat. B)", gratis: true, pro: true, master: true },
  { f: "Simulador de recibo de vencimento (Cat. A)", gratis: true, pro: true, master: true },
  { f: "Simulador de IRS anual", gratis: true, pro: true, master: true },
  { f: "Comparador A vs B vs empresa", gratis: true, pro: true, master: true },
  { f: "Calendário de prazos fiscais", gratis: true, pro: true, master: true },
  { f: "Histórico", gratis: "Neste dispositivo", pro: "Na nuvem, em todos", master: "Na nuvem, em todos" },
  { f: "Cenários guardados", gratis: "Até 3", pro: "Ilimitados", master: "Ilimitados" },
  { f: "Auditoria de recibo de vencimento", gratis: false, pro: true, master: true },
  { f: "Alertas de prazos e de erros por email", gratis: false, pro: true, master: true },
  { f: "Exportação CSV e PDF", gratis: false, pro: true, master: true },
  { f: "Mealheiro fiscal automático", gratis: false, pro: true, master: true },
  { f: "Energia ilimitada no Quiz", gratis: false, pro: true, master: true },
  { f: "Badge exclusivo e estatísticas avançadas", gratis: false, pro: false, master: true },
  { f: "Suporte", gratis: "—", pro: "Por email", master: "Por email" },
];

const GARANTIAS = [
  { icon: <Lock size={14} />, texto: "Pagamento seguro via Stripe" },
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
      <div className="mx-auto max-w-5xl">
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

        <div className="grid items-start gap-4 sm:grid-cols-3">
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

              <Link
                href="/dashboard/upgrade"
                className="btn-shine mt-7 inline-flex justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
              >
                Subscrever o Pro
              </Link>
              <p className="mt-2 text-center text-xs text-stone-400">Cancela quando quiseres · sem compromisso</p>
            </m.div>
          </Reveal>

          {/* ── Quiz Master ── */}
          <Reveal delay={0.16}>
            <m.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex h-full flex-col rounded-4xl border border-amber-400/60 bg-white p-7 shadow-card dark:border-amber-600/40 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-500">Quiz Master</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <Trophy size={12} />
                  Exclusivo
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-semibold text-ink tabular-nums">1,99 €</span>
                <span className="text-xs text-stone-400">por mês</span>
              </div>
              <p className="mt-1 text-xs text-stone-400">faturado mensalmente</p>

              <p className="mt-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{QUIZ_MASTER_DESC}</p>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-900/20">
                <Lock size={13} className="flex-shrink-0 text-amber-700 dark:text-amber-400" />
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Disponível apenas para quem atingir o nível máximo no Quiz Fiscal (Guru do IRS — 20.000 XP).
                </p>
              </div>

              <p className="mt-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Tudo do Pro, mais:</p>
              <ul className="mt-3 flex-1 space-y-2.5">
                {QUIZ_MASTER.slice(1).map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"><Check size={16} /></span>
                    <span className="text-sm text-stone-600 dark:text-stone-400">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/quiz-fiscal"
                className="mt-7 inline-flex justify-center gap-2 rounded-2xl border border-amber-400 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-600/50 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
              >
                <Trophy size={15} />
                Ir para o Quiz Fiscal
              </Link>
              <p className="mt-2 text-center text-xs text-stone-400">Atinge o nível 10 para desbloquear</p>
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
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-amber-700">Master</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIZ.map((r) => (
                    <tr key={r.f} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2.5 text-sm text-stone-600">{r.f}</td>
                      <td className="px-3 py-2.5 text-center"><MatrizCelula valor={r.gratis} /></td>
                      <td className="px-3 py-2.5 text-center"><MatrizCelula valor={r.pro} /></td>
                      <td className="px-3 py-2.5 text-center"><MatrizCelula valor={r.master} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Reveal>
      </div>
    </section>
  );
}
