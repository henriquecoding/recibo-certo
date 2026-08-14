import type { Metadata } from "next";
import Link from "next/link";
import DiretorioCliente from "./DiretorioCliente";
import AtalhosDoVisitante from "./AtalhosDoVisitante";
import {
  ArrowRight, Calendar, Gift, Lock, PaperClip, User,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Contabilistas certificados | ReciboCerto",
  description:
    "Encontra um contabilista certificado, envia-lhe as tuas simulações e marca consulta. Gratuito e sem plano pago.",
  alternates: { canonical: "/contabilistas" },
};

/**
 * As quatro coisas que aqui se fazem — e nenhuma delas custa dinheiro.
 *
 * A frase «não precisa de plano» aparece porque é verdade e porque é a
 * pergunta que se faz a seguir: `PARTILHA_NUNCA_EXIGE_PLUS`, em
 * `contabilistas/vinculo.ts`, garante-o em código e está coberto por teste.
 */
const POSSIBILIDADES = [
  {
    Icon: User,
    titulo: "Ligar-te a um contabilista",
    texto: "Escolhes um da lista e pedes para seres cliente dele. Se aceitar, ficam ligados.",
  },
  {
    Icon: Calendar,
    titulo: "Marcar consulta",
    texto: "Vês os horários que ele tem livres, escolhes o dia e a hora e dizes do que se trata. Online ou presencial, conforme o que ele oferecer.",
  },
  {
    Icon: PaperClip,
    titulo: "Enviar as tuas simulações",
    texto: "A partir das ferramentas do site, com um clique. Antes de confirmares, vês campo a campo o que vai seguir — e podes retirar-lhe o acesso mais tarde.",
  },
  {
    Icon: Gift,
    titulo: "Juntar carimbos",
    texto: "Cada consulta que fizeres carimba o teu cartão. Quando o completares, ganhas um desconto na consulta seguinte — entre 10% e 50%, conforme o contabilista definir.",
  },
] as const;

export default function DiretorioPage() {
  return (
    <main className="min-h-[100dvh] bg-cream dark:bg-stone-950">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <header className="max-w-2xl">
          <p className="eyebrow">Diretório</p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink dark:text-stone-50 sm:text-5xl">
            Contabilistas certificados
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
            Liga-te a um contabilista, envia-lhe as simulações que fizeste aqui e marca
            consulta — sem precisares de nenhum plano pago. E cada consulta que fizeres
            carimba o teu cartão de fidelidade.
          </p>
        </header>

        {/* Para quem já tem contabilista, pedido por aceitar ou painel de
            gestão, o próximo passo não é «escolher» — e é esse que aparece. */}
        <AtalhosDoVisitante />

        {/* O que se pode fazer daqui, dito antes de a pessoa escolher alguém:
            escolher é mais fácil quando se sabe para quê. */}
        <section aria-labelledby="podes-titulo" className="mt-10">
          <h2 id="podes-titulo" className="font-display text-2xl text-ink dark:text-stone-50">
            O que podes fazer aqui
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {POSSIBILIDADES.map(({ Icon, titulo, texto }) => (
              <li key={titulo} className="flex gap-3.5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/20 dark:text-brand-mint">
                  <Icon size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-stone-800 dark:text-stone-100">{titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            <Lock size={15} className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500" aria-hidden />
            Ligares-te a alguém não lhe dá acesso aos teus dados. O contabilista vê o que
            lhe enviares, um envio de cada vez, e podes revogar o acesso quando quiseres.
          </p>
        </section>

        <h2 className="mt-12 font-display text-2xl text-ink dark:text-stone-50">Escolher um contabilista</h2>
        <DiretorioCliente />

        <aside className="mt-12 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-display text-xl text-ink dark:text-stone-50">És contabilista?</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Podes pedir acesso ao painel de gestão: agenda, clientes, partilhas e cartão
            de fidelidade. Qualquer conta se pode candidatar; a administração analisa
            cada pedido antes de aprovar.
          </p>
          <Link
            href="/contabilistas/candidatura"
            className="btn-shine mt-4 inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
          >
            Pedir acesso <ArrowRight size={16} aria-hidden />
          </Link>
        </aside>
      </div>
    </main>
  );
}
