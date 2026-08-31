import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import DescobrirNegocioLazy from "./lazy";
import ExplorarMercado from "./ExplorarMercado";

const TOOL = porId("descobrir-negocio")!;

export const metadata: Metadata = {
  title: "Que negócio abrir em Portugal? Motor de oportunidades | Recibo Certo",
  description:
    "Cruza o que sabes fazer com sinais oficiais atuais de Portugal. Separa compatibilidade pessoal, evidência de mercado, preço sustentável e validação paga.",
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
};

export default function DescobrirNegocioPage() {
  return (
    <ToolShell
      tool={TOOL}
      subtitulo="Diz o que sabes fazer, o que tens e o que não queres. O motor compõe hipóteses a partir disso — não escolhe de uma lista — e diz o que descartou, com que evidência conta e o que ainda falta saber."
      contexto={
        <div className="space-y-10">
          <ExplorarMercado />
          <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-display text-xl font-semibold text-ink">Como o motor evita falsas oportunidades</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              Uma observação precisa de fonte, licença, geografia, período de referência, recolha, validade, unidade e checksum. Sinais com a mesma origem estatística não contam duas vezes. Quando a fonte falha ou muda de schema, o cartão perde o número em vez de receber um fallback plausível.
            </p>
          </section>
        </div>
      }
    >
      <DescobrirNegocioLazy />
    </ToolShell>
  );
}
