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
    titulo: "Ligares-te a um contabilista",
    texto: "Escolhes um do diretório e pedes para seres cliente. Ele aceita — ou não — e a partir daí ficam ligados.",
  },
  {
    Icon: Calendar,
    titulo: "Marcares consulta",
    texto: "Vês os horários livres dele, escolhes o dia e a hora, e dizes o assunto. Online ou presencial, conforme atender.",
  },
  {
    Icon: PaperClip,
    titulo: "Enviares as tuas simulações",
    texto: "Das ferramentas do site, com um clique. Vês campo a campo o que segue antes de confirmar, e podes revogar depois.",
  },
  {
    Icon: Gift,
    titulo: "Juntares carimbos",
    texto: "Cada consulta realizada carimba o cartão dele. Ao completá-lo ganhas um desconto na consulta seguinte, entre 10% e 50%.",
  },
] as const;

export default function DiretorioPage() {
  return (
    <main className="min-h-[100dvh] bg-cream">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <header className="max-w-2xl">
          <p className="eyebrow">Diretório</p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">
            Contabilistas certificados
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stone-600">
            Liga-te a um contabilista, envia-lhe as simulações que fizeste aqui e marca
            consulta — sem precisares de nenhum plano pago. A cada consulta realizada
            carimbas o cartão de fidelidade dele.
          </p>
        </header>

        {/* Para quem já tem contabilista, pedido por aceitar ou painel de
            gestão, o próximo passo não é «escolher» — e é esse que aparece. */}
        <AtalhosDoVisitante />

        {/* O que se pode fazer daqui, dito antes de a pessoa escolher alguém:
            escolher é mais fácil quando se sabe para quê. */}
        <section aria-labelledby="podes-titulo" className="mt-10">
          <h2 id="podes-titulo" className="font-display text-2xl text-ink">
            O que podes fazer aqui
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {POSSIBILIDADES.map(({ Icon, titulo, texto }) => (
              <li key={titulo} className="flex gap-3.5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
                  <Icon size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-stone-800">{titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-stone-500">
            <Lock size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
            Ligares-te a alguém não lhe dá acesso aos teus dados. O contabilista vê o que
            lhe enviares, um envio de cada vez, e podes revogar o acesso quando quiseres.
          </p>
        </section>

        <h2 className="mt-12 font-display text-2xl text-ink">Escolher um contabilista</h2>
        <DiretorioCliente />

        <aside className="mt-12 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
          <h2 className="font-display text-xl text-ink">És contabilista?</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600">
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
