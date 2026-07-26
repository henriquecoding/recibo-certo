import Link from "next/link";
import { Check, ArrowRight, Lock, ShieldCheck } from "@/components/ui/Icons";
import FizLogo from "./FizLogo";
import { PLUS } from "@/lib/entitlements";

// ═══════════════════════════════════════════════════════════════════════
//  PAINEL DA PARCERIA — ao lado dos planos
//  ---------------------------------------------------------------------
//  Não é um terceiro plano. É a explicação da fronteira: onde acaba o
//  ReciboCerto e onde começa a FIZ.
//
//  Duas decisões de desenho:
//
//  1. A jornada em quatro passos é o coração do painel. É ela que responde
//     à pergunta que o utilizador realmente faz — "então e depois de eu
//     saber quanto pago, quem é que faz?" — e mostra visualmente que os
//     três primeiros passos são verdes (nossos) e só o último é amarelo
//     (da FIZ). A cor faz o trabalho que um parágrafo não faria.
//
//  2. O bloco "O que o Plus não é" fica no fim, e não escondido. A confusão
//     mais provável de quem lê esta página é achar que 1,99 € compra
//     faturação certificada. Dizê-lo de forma explícita vale mais do que
//     qualquer benefício adicional que pudéssemos listar.
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
      className={`flex h-full flex-col overflow-hidden rounded-4xl border border-fiz-200 bg-fiz-50 shadow-card ${className}`}
    >
      {/* Cabeçalho: a marca da FIZ com o espaço que uma marca de parceiro
          merece, sem competir com o cartão do Plus ao lado. */}
      <div className="border-b border-fiz-200 px-6 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <FizLogo size={44} className="flex-shrink-0 rounded-xl shadow-card" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fiz-700">
              Parceria
            </p>
            <h3 id="fiz-parceria" className="font-display text-lg font-semibold leading-tight text-ink">
              Execução fiscal com a FIZ
            </h3>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          O ReciboCerto nunca vai emitir faturas nem submeter declarações por ti — não é o que
          fazemos bem. Fazemos-te <strong className="text-stone-800 dark:text-stone-200">perceber</strong>{" "}
          e <strong className="text-stone-800 dark:text-stone-200">preparar</strong>. A execução
          fica com quem está certificado para a fazer.
        </p>
      </div>

      {/* Jornada — onde acaba um e começa o outro */}
      <div className="border-b border-fiz-200 px-6 py-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          Do que precisas de saber ao que fica feito
        </p>
        <ol className="space-y-2.5">
          {JORNADA.map((passo, i) => (
            <li key={passo.rotulo} className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ${
                  passo.nosso
                    ? "bg-brand-light text-brand-dark"
                    : "bg-fiz text-fiz-ink shadow-card"
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
      </div>

      {/* O que a FIZ trata */}
      <div className="flex-1 px-6 py-5">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          O que a FIZ trata
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

        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-white px-3 py-2.5 text-xs leading-relaxed text-stone-600 dark:bg-stone-900 dark:text-stone-400">
          <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-brand" />
          <span>
            Ligar a conta e enviar uma simulação é <strong>gratuito</strong> e não exige o Plus.
            Vês sempre os campos exatos antes de autorizar, e podes desligar quando quiseres.
          </span>
        </p>
      </div>

      {/* A fronteira comercial, dita sem rodeios */}
      <div className="border-t border-fiz-200 bg-white/60 px-6 py-5 dark:bg-stone-900/40">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200">
          <Lock size={13} className="text-fiz-700" />
          Para que não haja dúvidas
        </p>
        <ul className="space-y-1.5">
          {PLUS.naoInclui.map((n) => (
            <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-fiz-400" />
              {n}
            </li>
          ))}
        </ul>

        <Link
          href="/integracoes/fiz"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-fiz-300 bg-white px-4 py-2.5 text-sm font-semibold text-fiz-900 transition-colors hover:bg-fiz-50 dark:bg-stone-900"
        >
          Como funciona a parceria
          <ArrowRight size={15} />
        </Link>

        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-stone-400">
          A FIZ é um parceiro independente. A parceria é remunerada e o ReciboCerto mantém
          liberdade editorial sobre o que escreve.
        </p>
      </div>
    </section>
  );
}
