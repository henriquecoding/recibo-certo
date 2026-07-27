import Link from "next/link";
import { Check, ArrowRight, Lock, ShieldCheck } from "@/components/ui/Icons";
import FizLogo from "./FizLogo";
import { PLUS } from "@/lib/entitlements";

// ═══════════════════════════════════════════════════════════════════════
//  FAIXA DA PARCERIA — depois dos planos, fora da grelha
//  ---------------------------------------------------------------------
//  A primeira versão era a terceira coluna da grelha de planos. O comentário
//  dizia "nunca finge ser uma terceira subscrição" e o layout dizia o
//  contrário: três cartões lado a lado, com listas de itens iguais às dos
//  planos, lidos de uma vez como "Grátis · Plus · FIZ". Quem olha de relance
//  conclui que há um terceiro escalão a pagar.
//
//  Agora é uma FAIXA, e a diferença é estrutural, não decorativa:
//
//  1. Está fora da grelha e depois dela. Sai da comparação de preços porque
//     não é um preço — é o que acontece a seguir a escolheres.
//  2. Não tem preço nem botão de subscrição. O único destino é explicativo.
//     Nada aqui compete com o "Subscrever o Plus".
//  3. A primeira frase diz o que isto NÃO é. É a dúvida mais provável de
//     quem vem de uma página de planos, por isso é respondida antes de
//     qualquer benefício.
//  4. A cor faz o resto: os passos que são nossos ficam verdes, o da FIZ
//     fica amarelo. A fronteira vê-se sem se ler.
// ═══════════════════════════════════════════════════════════════════════

const JORNADA = [
  { rotulo: "Compreender", desc: "Guias com fonte oficial por afirmação.", nosso: true },
  { rotulo: "Simular", desc: "O teu líquido, com memória de cálculo.", nosso: true },
  { rotulo: "Preparar", desc: "Checklist, documentos e decisões.", nosso: true },
  { rotulo: "Executar", desc: "Emitir, declarar e cumprir prazos.", nosso: false },
];

const O_QUE_A_FIZ_FAZ = [
  "Faturação certificada e comunicação à Autoridade Tributária",
  "IVA, Segurança Social e IRS tratados por quem executa",
  "Lembretes das tuas obrigações reais, não de um calendário genérico",
  "Revisão por contabilistas certificados",
];

export default function FizParceriaCard({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="fiz-parceria"
      className={`overflow-hidden rounded-4xl border border-fiz-200 bg-fiz-50 ${className}`}
    >
      {/* ── Cabeçalho: o que isto não é, antes do que é ────────────── */}
      <div className="border-b border-fiz-200 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center gap-3">
          <FizLogo size={40} className="flex-shrink-0 rounded-xl shadow-card" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fiz-700">
              Parceria · não é um plano
            </p>
            <h3 id="fiz-parceria" className="font-display text-xl font-semibold leading-tight text-ink">
              Depois de decidires, quem executa
            </h3>
          </div>
        </div>

        {/* A frase que evita a confusão desta página, dita primeiro. */}
        <p className="mt-4 max-w-3xl rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed text-stone-700 dark:bg-stone-900 dark:text-stone-300">
          <strong className="text-stone-900 dark:text-stone-100">Não tens de subscrever nada disto aqui.</strong>{" "}
          A FIZ é um parceiro independente, com preços e contrato próprios — não faz parte dos
          planos do ReciboCerto nem do Plus. Isto está nesta página só para saberes onde
          acabamos nós e onde começa quem emite e declara.
        </p>
      </div>

      {/* ── Corpo: duas colunas em ecrã largo, empilhadas no telemóvel ── */}
      <div className="grid gap-6 px-6 py-6 sm:px-8 sm:py-7 lg:grid-cols-2 lg:gap-10">
        {/* Jornada — onde acaba um e começa o outro */}
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Do que precisas de saber ao que fica feito
          </p>
          <ol className="space-y-2.5">
            {JORNADA.map((passo, i) => (
              <li key={passo.rotulo} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ${
                    passo.nosso ? "bg-brand-light text-brand-dark" : "bg-fiz text-fiz-ink shadow-card"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {passo.rotulo}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        passo.nosso ? "text-brand-dark" : "text-fiz-700"
                      }`}
                    >
                      {passo.nosso ? "ReciboCerto" : "FIZ"}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    {passo.desc}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-white px-3 py-2.5 text-xs leading-relaxed text-stone-600 dark:bg-stone-900 dark:text-stone-400">
            <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-brand" />
            <span>
              Ligar a conta e enviar uma simulação é <strong>gratuito</strong> e não exige o Plus.
              Vês sempre os campos exatos antes de autorizar, e podes desligar quando quiseres.
            </span>
          </p>
        </div>

        {/* O que a FIZ trata + a fronteira comercial */}
        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            O que a FIZ trata, se e quando quiseres
          </p>
          <ul className="space-y-2">
            {O_QUE_A_FIZ_FAZ.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 text-fiz-700">
                  <Check size={15} />
                </span>
                <span className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-2xl border border-fiz-200 bg-white/70 px-4 py-3.5 dark:bg-stone-900/40">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200">
              <Lock size={13} className="text-fiz-700" />
              Sobre o Plus, para não haver dúvidas
            </p>
            <ul className="space-y-1.5">
              {PLUS.naoInclui.map((n) => (
                <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-fiz-400" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Rodapé: um só destino, e é explicativo ─────────────────── */}
      <div className="flex flex-col gap-3 border-t border-fiz-200 bg-white/60 px-6 py-5 dark:bg-stone-900/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="max-w-xl text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          A FIZ é um parceiro independente. A parceria é remunerada e o ReciboCerto mantém
          liberdade editorial sobre o que escreve.
        </p>
        <Link
          href="/integracoes/fiz"
          className="inline-flex min-h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-2xl border border-fiz-300 bg-white px-5 py-2.5 text-sm font-semibold text-fiz-900 transition-colors hover:bg-fiz-50 dark:bg-stone-900"
        >
          Como funciona a parceria
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
