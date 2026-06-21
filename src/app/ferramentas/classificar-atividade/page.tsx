import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ComparadorCAE } from "@/components/guias/ComparadorCAE";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Classificar atividade fiscal — Art. 151.º ou Categoria B 2026 | ReciboCerto",
  description: "Pesquisa a tua profissão e descobre a retenção na fonte, o coeficiente IRS e a base de Segurança Social. Baseado na tabela do Art. 151.º CIRS 2026.",
  keywords: ["art 151 CIRS", "classificar atividade", "retenção na fonte", "coeficiente IRS", "recibos verdes"],
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas/classificar-atividade" },
  openGraph: {
    title: "Classificar atividade fiscal 2026 | ReciboCerto",
    description: "Pesquisa a tua profissão. Vê retenção, coeficiente e base SS aplicável.",
    url: "https://www.recibocerto.pt/ferramentas/classificar-atividade",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

export default function FerramentaClassificarAtividadePage() {
  return (
    <>
      <div className="mb-8">
        <div className="eyebrow mb-3 text-brand">Comparador</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Classificar atividade — Art. 151.º ou Categoria B?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          A classificação da tua atividade define a retenção na fonte, o coeficiente no regime simplificado e a base de cálculo da Segurança Social. Pesquisa abaixo.
        </p>
      </div>

      <Suspense>
        <ComparadorCAE />
      </Suspense>

      <div className="mt-2 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Nota importante</p>
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          A classificação aqui apresentada baseia-se na tabela do Art. 151.º do CIRS e nas categorias do regime simplificado. Em caso de dúvida sobre a classificação da tua atividade específica, consulta um contabilista certificado ou a AT.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/guias/retencao-na-fonte"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
          >
            Guia de retenção na fonte
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/guias/regime-simplificado"
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
          >
            Guia do regime simplificado
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </>
  );
}
