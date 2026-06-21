import type { Metadata } from "next";
import Link from "next/link";
import { CalculadoraRegimeSimplificado } from "@/components/guias/CalculadoraRegimeSimplificado";
import { ArrowRight } from "@/components/ui/Icons";
import { REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Calculadora regime simplificado IRS 2026 | ReciboCerto",
  description: "Calcula o teu IRS como trabalhador independente em regime simplificado: coeficiente, rendimento tributável, imposto estimado e taxa efetiva. Atualizado para 2026.",
  keywords: ["regime simplificado IRS", "coeficiente IRS", "recibos verdes imposto", "calculadora IRS 2026"],
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas/regime-simplificado" },
  openGraph: {
    title: "Calculadora regime simplificado IRS 2026 | ReciboCerto",
    description: "Insere a tua faturação e atividade. Calcula coeficiente, IRS e taxa efetiva para 2026.",
    url: "https://www.recibocerto.pt/ferramentas/regime-simplificado",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

export default function FerramentaRegimeSimplificadoPage() {
  return (
    <>
      <div className="mb-8">
        <div className="eyebrow mb-3 text-brand">Calculadora</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Regime simplificado — quanto pagas de IRS?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Seleciona a tua atividade e faturação. O resultado mostra o rendimento tributável, o IRS estimado e a taxa efetiva sobre o bruto.
        </p>
      </div>

      <CalculadoraRegimeSimplificado />

      <div className="mt-2 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Como funciona</p>
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          No regime simplificado, o IRS não incide sobre toda a faturação. A AT aplica um <strong className="text-stone-700 dark:text-stone-300">coeficiente</strong> que depende do tipo de atividade para determinar o rendimento tributável. A esta base aplicam-se depois os escalões progressivos de IRS 2026. O limite do regime simplificado é {fmt(REGIME_SIMPLIFICADO.limite.value)}/ano.
        </p>
        <Link
          href="/guias/regime-simplificado"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
        >
          Guia completo sobre regime simplificado
          <ArrowRight size={14} />
        </Link>
      </div>
    </>
  );
}
