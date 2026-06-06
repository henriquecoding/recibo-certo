import type { Metadata } from "next";
import Link from "next/link";
import { DecisorAtoVsAtividade } from "@/components/guias/DecisorAtoVsAtividade";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Ato isolado ou abrir atividade? Decisor interativo 2026 | ReciboCerto",
  description: "Responde a 4 perguntas e fica a saber se deves emitir um ato isolado ou abrir atividade nas Finanças. Gratuito e imediato.",
  keywords: ["ato isolado", "abrir atividade", "recibos verdes", "trabalhador independente"],
  alternates: { canonical: "https://recibocerto.pt/ferramentas/ato-isolado" },
  openGraph: {
    title: "Ato isolado ou abrir atividade? | ReciboCerto",
    description: "Decisor interativo: 4 perguntas para saber a resposta certa para a tua situação.",
    url: "https://recibocerto.pt/ferramentas/ato-isolado",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

export default function FerramentaAtoIsoladoPage() {
  return (
    <>
      <div className="mb-8">
        <div className="eyebrow mb-3 text-brand">Decisor interativo</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Ato isolado ou abrir atividade?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Responde às perguntas abaixo. Em menos de um minuto, sabes qual é a opção certa para a tua situação.
        </p>
      </div>

      <DecisorAtoVsAtividade />

      <div className="mt-6 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
          Queres perceber a fundo?
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/guias/ato-isolado"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
          >
            Guia completo sobre ato isolado
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/guias/abrir-atividade"
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
          >
            Como abrir atividade nas Finanças
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </>
  );
}
