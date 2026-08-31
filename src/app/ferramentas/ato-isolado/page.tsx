import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import { generateSoftwareApplicationSchema } from "@/lib/seo";
import { DecisorAtoVsAtividade } from "@/components/guias/DecisorAtoVsAtividade";

const TOOL = porId("ato-isolado")!;

export const metadata: Metadata = {
  title: "Ato isolado ou abrir atividade? Decisor interativo 2026 | Recibo Certo",
  description:
    "Responde a 4 perguntas e fica a saber se deves emitir um ato isolado ou abrir atividade nas Finanças — com o raciocínio explicado e os próximos passos. Gratuito e imediato.",
  keywords: ["ato isolado", "abrir atividade", "recibos verdes", "trabalhador independente"],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Ato isolado ou abrir atividade? | Recibo Certo",
    description: "Decisor interativo: 4 perguntas para saber a resposta certa para a tua situação.",
    url: `https://www.recibocerto.pt${TOOL.canonicalHref}`,
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

export default function FerramentaAtoIsoladoPage() {
  const appSchema = generateSoftwareApplicationSchema();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <ToolShell
        tool={TOOL}
        subtitulo="Responde às perguntas abaixo. Em menos de um minuto sabes qual é a opção certa para a tua situação — e porquê."
      >
        <DecisorAtoVsAtividade comPlanoFiz />
      </ToolShell>
    </>
  );
}
