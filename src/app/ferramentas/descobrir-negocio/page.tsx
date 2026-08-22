import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import { MARKET_PILOTS, OPPORTUNITY_TEMPLATES } from "@/lib/negocio/market";
import DescobrirNegocioLazy from "./lazy";

const TOOL = porId("descobrir-negocio")!;

// Os números da copy vêm dos dados, nunca escritos à mão: um catálogo que
// cresce e uma frase que diz «cinco hipóteses» é a maneira mais fácil de
// uma página verdadeira passar a mentir sem ninguém dar por isso.
const TOTAL_HIPOTESES = OPPORTUNITY_TEMPLATES.length;
const COM_INGESTAO = new Set(MARKET_PILOTS.map((pilot) => pilot.templateId)).size;

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
      subtitulo={`Não é uma lista de ideias nem um ranking inventado. ${TOTAL_HIPOTESES} hipóteses curadas, ordenadas pelo que cabe na tua vida e separadas da evidência oficial datada — com o que ainda falta provar dito à cara.`}
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
          <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 lg:col-span-2">
            <h2 className="font-display text-xl font-semibold text-ink">
              {TOTAL_HIPOTESES} hipóteses, {COM_INGESTAO} com dados oficiais a serem lidos
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              As restantes {TOTAL_HIPOTESES - COM_INGESTAO} entram como estão: dossier completo — cliente,
              problema, modelo de receita, requisitos críticos e um teste que as pode contrariar — e uma nota
              a dizer que fonte falta ligar e porquê. Enquanto essa fonte não existir, a hipótese fica em
              «ideia por investigar» e não abre passo comercial nenhum. Preferimos um catálogo que diz o que
              não sabe a cinco hipóteses que parecem todas igualmente prováveis.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              A compatibilidade é calculada no teu dispositivo a partir de seis respostas, e cada hipótese diz
              de que competências precisa <em>por ordem</em> — a primeira pesa mais do que a última. Quando
              duas hipóteses empatam, o cartão diz que empataram em vez de as numerar como se não tivessem.
            </p>
          </section>
        </div>
      }
    >
      <DescobrirNegocioLazy />
    </ToolShell>
  );
}
