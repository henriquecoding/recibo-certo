import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { MOTIVO_LEGIVEL, type CodigoParceria } from "@/lib/parcerias/errors";

// Um beco sem saída que o utilizador atingiu por clicar num botão legítimo
// nosso. Não é um 404 — a página existe para explicar, não para culpar.
export const metadata: Metadata = {
  title: "Ligação de parceiro indisponível",
  robots: { index: false, follow: false },
};

export default async function ParceiroIndisponivelPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const explicacao =
    motivo && motivo in MOTIVO_LEGIVEL
      ? MOTIVO_LEGIVEL[motivo as CodigoParceria]
      : "Esta ligação de parceiro não está disponível de momento.";

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream dark:bg-stone-950">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="font-display display-2 mb-4 font-semibold text-ink">
            Esta ligação não está disponível
          </h1>
          <p className="text-lg leading-relaxed text-stone-500 dark:text-stone-400">{explicacao}</p>
          <p className="mt-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Não perdeste nada: o que estavas a ler ou a simular continua onde estava. Se isto se
            repetir, agradecemos que nos digas — é do nosso lado que se resolve.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/guias"
              className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Voltar aos Guias
            </Link>
            <Link
              href="/ferramentas"
              className="rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-200"
            >
              Ver as ferramentas
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
