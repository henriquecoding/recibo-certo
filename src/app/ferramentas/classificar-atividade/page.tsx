import { Suspense } from "react";
import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import { generateSoftwareApplicationSchema } from "@/lib/seo";
import { ComparadorCAE } from "@/components/guias/ComparadorCAE";
import { jsonLd } from "@/lib/jsonld";

const TOOL = porId("classificar-atividade")!;

export const metadata: Metadata = {
  title: "Classificar atividade fiscal — Art. 151.º ou Categoria B 2026",
  description:
    "Pesquisa a tua profissão e descobre a retenção na fonte, o coeficiente IRS e a base de Segurança Social. Baseado na tabela do Art. 151.º CIRS 2026.",
  keywords: ["art 151 CIRS", "classificar atividade", "retenção na fonte", "coeficiente IRS", "recibos verdes"],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Classificar atividade fiscal 2026 | Recibo Certo",
    description: "Pesquisa a tua profissão. Vê retenção, coeficiente e base SS aplicável.",
    url: `https://www.recibocerto.pt${TOOL.canonicalHref}`,
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

export default function FerramentaClassificarAtividadePage() {
  const appSchema = generateSoftwareApplicationSchema();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(appSchema) }} />
      <ToolShell
        tool={TOOL}
        subtitulo="A classificação da tua atividade define a retenção na fonte, o coeficiente no regime simplificado e a base de cálculo da Segurança Social. Pesquisa pelo que fazes, em linguagem comum."
        contexto={
          <section className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50 sm:p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Nota importante
            </p>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              A classificação aqui apresentada baseia-se na tabela do Art. 151.º do CIRS e nas
              categorias do regime simplificado. Em caso de dúvida sobre a classificação da tua
              atividade específica, consulta um contabilista certificado ou a AT — a decisão final
              de enquadramento é da Autoridade Tributária.
            </p>
          </section>
        }
      >
        <Suspense>
          <ComparadorCAE comPlanoFiz />
        </Suspense>
      </ToolShell>
    </>
  );
}
