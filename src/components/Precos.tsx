"use client";

import Link from "next/link";
import { m } from "motion/react";
import { Check, Lock, ShieldCheck, Flag, Sparkle } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import { PLUS } from "@/lib/entitlements";
import { fizAtiva } from "@/lib/fiz/flag";
import FizLogo from "@/components/fiz/FizLogo";

// ═══════════════════════════════════════════════════════════════════════
//  Preços — reestruturado segundo o ponto 11 da arquitetura da parceria.
//
//  Antes existiam três subscrições (Grátis, Pro, Quiz Master). Passa a
//  existir uma só: o Recibo Certo Plus, a 1,99 €/mês, que inclui tudo o que
//  pertencia ao Pro E ao Quiz Master.
//
//  O Quiz Master deixa de ser uma compra: XP, níveis e a conquista "Guru do
//  IRS" continuam a ganhar-se por mérito, e o nível 10 deixa de ser
//  requisito de compra (ponto 11.4).
//
//  A FIZ aparece como uma TERCEIRA COLUNA, não como um plano nosso: é um
//  contrato do utilizador com a FIZ, e nada no Plus depende dela nem ela
//  depende do Plus (ponto 8.4 da auditoria).
// ═══════════════════════════════════════════════════════════════════════

const GRATIS = [
  "Calculadora de recibos verdes (Cat. B)",
  "Simulador de recibo de vencimento (Cat. A)",
  "Simulador de IRS anual",
  "Comparador: dependente vs. recibos verdes vs. empresa",
  "Todos os guias, com fontes oficiais",
  "Calendário de prazos fiscais",
  "Quiz Fiscal",
  "Histórico neste dispositivo",
];

const PLUS_FEATURES = [
  "O teu histórico seguro e em todos os dispositivos",
  "Cenários ilimitados, guardados e comparáveis",
  "Um clique e fica pronto para o contabilista (CSV e PDF)",
  "Auditoria do teu recibo de vencimento — deteta erros de IRS e SS",
  "Mealheiro fiscal: quanto reservar este mês, automático",
  "Energia ilimitada e estatísticas avançadas no Quiz Fiscal",
  "Acesso antecipado a novas funcionalidades",
];

const FIZ_FEATURES = [
  "Faturação certificada e comunicação à AT",
  "IVA, Segurança Social e IRS tratados por quem executa",
  "Lembretes operacionais das tuas obrigações reais",
  "Revisão por contabilistas",
];

const MATRIZ: { f: string; gratis: boolean | string; plus: boolean | string }[] = [
  { f: "Calculadora de recibos verdes (Cat. B)", gratis: true, plus: true },
  { f: "Simulador de recibo de vencimento (Cat. A)", gratis: true, plus: true },
  { f: "Simulador de IRS anual", gratis: true, plus: true },
  { f: "Comparador A vs B vs empresa", gratis: true, plus: true },
  { f: "Guias com fontes oficiais", gratis: true, plus: true },
  { f: "Calendário de prazos fiscais", gratis: true, plus: true },
  { f: "Histórico", gratis: "Neste dispositivo", plus: "Na nuvem, em todos" },
  { f: "Cenários guardados", gratis: "Até 3", plus: "Ilimitados" },
  { f: "Auditoria de recibo de vencimento", gratis: false, plus: true },
  { f: "Exportação CSV e PDF", gratis: false, plus: true },
  { f: "Dossiê para o contabilista", gratis: false, plus: true },
  { f: "Mealheiro fiscal automático", gratis: false, plus: true },
  { f: "Energia ilimitada no Quiz", gratis: false, plus: true },
  { f: "Estatísticas avançadas do Quiz", gratis: false, plus: true },
  { f: "Distintivo «Guru do IRS»", gratis: "Por mérito", plus: "Por mérito" },
  { f: "Suporte", gratis: "—", plus: "Por email" },
];

const GARANTIAS = [
  { icon: <Lock size={14} />, texto: "Pagamento seguro via Stripe" },
  { icon: <ShieldCheck size={14} />, texto: "Cancela quando quiseres" },
  { icon: <Flag size={14} />, texto: "Dados em servidores na UE" },
];

const precoFormatado = PLUS.precoMensal.toLocaleString("pt-PT", {
  style: "currency",
  currency: PLUS.moeda,
});

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
  const mostrarFiz = fizAtiva();

  return (
    <section id="precos" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mb-8 text-center">
          <div className="eyebrow mb-3 text-brand">Planos</div>
          <h2 className="font-display display-2 font-semibold text-ink">Um plano só. Sem escadaria.</h2>
          <p className="mx-auto mt-3 max-w-md text-stone-500">
            Calcular, simular e ler os guias é grátis para sempre. O Plus é para quem quer guardar,
            comparar e exportar.
          </p>
        </Reveal>

        <div className={`grid items-start gap-4 ${mostrarFiz ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {/* ── Grátis ── */}
          <Reveal>
            <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-6 shadow-card sm:p-7">
              <h3 className="text-sm font-semibold text-stone-500">Grátis</h3>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-semibold text-ink tabular-nums">0 €</span>
                <span className="text-xs text-stone-400">para sempre</span>
              </div>
              <p className="mt-3 text-sm text-stone-500">Compreender, calcular e decidir.</p>

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
                className="mt-7 inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-200 dark:hover:border-stone-600"
              >
                Começar grátis
              </Link>
            </div>
          </Reveal>

          {/* ── Plus ── */}
          <Reveal delay={0.08}>
            <m.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex h-full flex-col rounded-4xl border border-brand bg-white p-6 shadow-glow sm:-mt-3 sm:p-7 sm:pb-9"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-500">{PLUS.nome}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                  <Sparkle size={12} />
                  Tudo incluído
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-semibold text-ink tabular-nums">{precoFormatado}</span>
                <span className="text-xs text-stone-400">por mês</span>
              </div>
              <p className="mt-1 text-xs text-stone-400">Inclui tudo o que pertencia ao Pro e ao Quiz Master.</p>

              <p className="mt-4 text-sm font-semibold text-stone-700">Tudo do Grátis, mais:</p>
              <ul className="mt-3 flex-1 space-y-2.5">
                {PLUS_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 text-brand"><Check size={16} /></span>
                    <span className="text-sm text-stone-600">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard/upgrade"
                className="btn-shine mt-7 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
              >
                Subscrever o Plus
              </Link>
              <p className="mt-2 text-center text-xs text-stone-400">Cancela quando quiseres · sem compromisso</p>
            </m.div>
          </Reveal>

          {/* ── FIZ ──
              Não é um plano nosso. É um contrato do utilizador com a FIZ,
              apresentado aqui para que a fronteira fique explícita. */}
          {mostrarFiz && (
            <Reveal delay={0.16}>
              <div className="flex h-full flex-col rounded-4xl border border-fiz-200 bg-fiz-50 p-6 shadow-card sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500">
                    <FizLogo size={18} className="rounded-md" decorativo />
                    Execução com a FIZ
                  </h3>
                </div>
                <div className="mt-2">
                  <span className="font-display text-2xl font-semibold text-ink">
                    Contratado com a FIZ
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  O ReciboCerto explica e prepara. Quando é preciso executar — emitir, declarar,
                  submeter — quem o faz é a FIZ, ao abrigo de um contrato teu com ela.
                </p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {FIZ_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex-shrink-0 text-fiz-700"><Check size={16} /></span>
                      <span className="text-sm text-stone-600 dark:text-stone-400">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-2xl border border-fiz-200 bg-white p-3 dark:bg-stone-900">
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                    O que o Plus não é
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {PLUS.naoInclui.map((n) => (
                      <li key={n} className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          )}
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
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-sm font-semibold text-stone-700">
              Ver comparação completa de funcionalidades
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-stone-400 transition-transform group-open:rotate-180">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-100">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-400">Funcionalidade</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-stone-400">Grátis</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-brand-dark">Plus</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIZ.map((r) => (
                    <tr key={r.f} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2.5 text-sm text-stone-600">{r.f}</td>
                      <td className="px-3 py-2.5 text-center"><MatrizCelula valor={r.gratis} /></td>
                      <td className="px-3 py-2.5 text-center"><MatrizCelula valor={r.plus} /></td>
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
