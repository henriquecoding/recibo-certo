import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import Link from "next/link";
import { CalculadoraRegimeSimplificado } from "@/components/guias/CalculadoraRegimeSimplificado";
import { ArrowRight } from "@/components/ui/Icons";
import { REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

const TOOL = porId("regime-simplificado")!;

export const metadata: Metadata = {
  title: "Calculadora regime simplificado IRS 2026 | Recibo Certo",
  description: "Calcula o teu IRS como trabalhador independente em regime simplificado: coeficiente, rendimento tributável, imposto estimado e taxa efetiva. Atualizado para 2026.",
  keywords: ["regime simplificado IRS", "coeficiente IRS", "recibos verdes imposto", "calculadora IRS 2026"],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Calculadora regime simplificado IRS 2026 | Recibo Certo",
    description: "Insere a tua faturação e atividade. Calcula coeficiente, IRS e taxa efetiva para 2026.",
    url: "https://www.recibocerto.pt/ferramentas/regime-simplificado",
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

export default function FerramentaRegimeSimplificadoPage() {
  return (
    <ToolShell
      tool={TOOL}
      subtitulo="Seleciona a tua atividade e faturação. O resultado mostra o rendimento tributável, o IRS estimado e a taxa efetiva sobre o bruto."
      contexto={
          <section className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50 sm:p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Como funciona</p>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              No regime simplificado, o IRS não incide sobre toda a faturação. A AT aplica um{" "}
              <strong className="text-stone-700 dark:text-stone-300">coeficiente</strong> que depende do tipo
              de atividade para determinar o rendimento tributável. A esta base aplicam-se depois os
              escalões progressivos de IRS 2026. O limite do regime simplificado é{" "}
              {fmt(REGIME_SIMPLIFICADO.limite.value)}/ano.
            </p>
          </section>
      }
    >
      <CalculadoraRegimeSimplificado comPlanoFiz />
    </ToolShell>
  );
}
