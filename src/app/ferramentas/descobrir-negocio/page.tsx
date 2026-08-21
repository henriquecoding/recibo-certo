import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import DescobrirNegocioLazy from "./lazy";

const TOOL = porId("descobrir-negocio")!;

export const metadata: Metadata = {
  title: "Que negócio abrir em Portugal? Motor de oportunidades | ReciboCerto",
  description:
    "Cruza o que sabes fazer com sinais oficiais atuais de Portugal. Separa compatibilidade pessoal, evidência de mercado, preço sustentável e validação paga.",
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
};

export default function DescobrirNegocioPage() {
  return (
    <ToolShell
      tool={TOOL}
      subtitulo="Não é uma lista de ideias nem um ranking inventado. Cruza o que cabe na tua vida com evidência oficial datada — e diz claramente o que ainda falta provar."
      contexto={
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-display text-xl font-semibold text-ink">Como o motor evita falsas oportunidades</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              Uma observação precisa de fonte, licença, geografia, período de referência, recolha, validade, unidade e checksum. Sinais com a mesma origem estatística não contam duas vezes. Quando a fonte falha ou muda de schema, o cartão perde o número em vez de receber um fallback plausível.
            </p>
          </section>
          <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-display text-xl font-semibold text-ink">O que veio do relatório das 72 ideias</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              Aproveitámos as melhores ferramentas de decisão: problema, cliente, modelo de receita, localização, riscos, primeiros clientes e teste de falsificação. As notas, rankings e faturações do relatório não foram reutilizados, porque eram premissas editoriais sem proveniência.
            </p>
          </section>
        </div>
      }
    >
      <DescobrirNegocioLazy />
    </ToolShell>
  );
}
