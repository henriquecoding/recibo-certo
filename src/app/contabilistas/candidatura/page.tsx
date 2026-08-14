import type { Metadata } from "next";
import FormularioCandidatura from "./FormularioCandidatura";

export const metadata: Metadata = {
  title: "Pedir acesso de contabilista | ReciboCerto",
  description:
    "Candidata-te ao painel de gestão para contabilistas: agenda, clientes, partilhas e cartão de fidelidade.",
  alternates: { canonical: "/contabilistas/candidatura" },
  robots: { index: true, follow: true },
};

export default function Pagina() {
  return (
    <main className="min-h-[100dvh] bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <header>
          <p className="eyebrow">Contabilistas</p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">
            Pedir acesso ao painel
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stone-600">
            O painel de gestão dá-te agenda, clientes, partilhas de simulações e um cartão
            de fidelidade configurável. Qualquer conta se pode candidatar; a administração
            analisa cada pedido e responde.
          </p>
        </header>
        <FormularioCandidatura />
      </div>
    </main>
  );
}
