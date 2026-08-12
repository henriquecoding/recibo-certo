import type { Metadata } from "next";
import Link from "next/link";
import DiretorioCliente from "./DiretorioCliente";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Contabilistas certificados | ReciboCerto",
  description:
    "Encontra um contabilista certificado, envia-lhe as tuas simulações e marca consulta. Gratuito e sem plano pago.",
  alternates: { canonical: "/contabilistas" },
};

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
