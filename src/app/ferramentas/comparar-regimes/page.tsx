// ═══════════════════════════════════════════════════════════════════════
//  P0-02 — O comparador passa a ter destino próprio.
//
//  O cartão do hub apontava para `/?modo=comparar`. Sem `#calculadora`, a
//  pessoa aterrava no TOPO da homepage, perdia o contexto e tinha de
//  descobrir sozinha onde estava a ferramenta que pediu. Uma query da
//  homepage não é a URL canónica de um produto: não se partilha, não se
//  indexa como ferramenta e não sobrevive a uma mudança de landing.
//
//  `/?modo=comparar` continua a existir para a seleção contextual da
//  homepage — deixa é de ser o único caminho.
// ═══════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import { generateFAQSchema, generateSoftwareApplicationSchema } from "@/lib/seo";
import { ArrowRight } from "@/components/ui/Icons";
import ComparadorLazy from "./lazy";
import { jsonLd } from "@/lib/jsonld";

const TOOL = porId("comparar-regimes")!;

export const metadata: Metadata = {
  title: "Recibos verdes, contrato ou empresa? Comparador 2026",
  description:
    "Para o mesmo rendimento anual, compara o líquido como trabalhador por conta de outrem, em recibos verdes ou através de uma empresa. Ponto de viragem, obrigações, proteção social e custo de contabilista — com as regras de 2026.",
  keywords: [
    "recibos verdes vs contrato",
    "recibos verdes ou empresa",
    "compensa abrir empresa",
    "comparador regimes fiscais 2026",
    "ponto de viragem empresa",
    "trabalhador independente vs dependente",
  ],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Recibos verdes, contrato ou empresa? O comparador 2026 | Recibo Certo",
    description:
      "Os três cenários lado a lado, com as mesmas premissas — líquido, obrigações, proteção social e a partir de que rendimento compensa mudar.",
    url: `https://www.recibocerto.pt${TOOL.canonicalHref}`,
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

const FAQS = [
  {
    q: "A partir de que rendimento compensa abrir empresa?",
    a: "Não há um número único: depende dos custos fixos que consegues justificar, do salário que retiras como gerente, da região e de quanto queres distribuir em dividendos. O comparador calcula o teu ponto de viragem em vez de repetir um valor de referência que raramente se aplica ao caso concreto.",
  },
  {
    q: "O líquido é tudo o que interessa na comparação?",
    a: "Não, e é por isso que a comparação separa quatro eixos: líquido, proteção social, custos administrativos e previsibilidade. Recibos verdes podem deixar mais líquido e menos rede de segurança; uma empresa pode deixar mais líquido acima de certo rendimento e obrigar a contabilidade organizada, IES e Modelo 22.",
  },
  {
    q: "As premissas são as mesmas nos três cenários?",
    a: "Sim — é o que torna a comparação honesta. O rendimento anual, o período e a situação familiar são comuns e ficam visíveis no topo. Se as premissas fossem diferentes em cada coluna, a comparação não significava nada.",
  },
  {
    q: "O comparador diz-me qual devo escolher?",
    a: "Destaca um vencedor apenas quando a diferença é material. Quando os cenários ficam próximos, mostra-os como equivalentes em líquido e remete a decisão para os outros eixos — porque uma diferença de dezenas de euros por ano não justifica mudar de regime.",
  },
];

export default function FerramentaCompararRegimesPage() {
  const faqSchema = generateFAQSchema(FAQS);
  const appSchema = generateSoftwareApplicationSchema();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(appSchema) }} />

      <ToolShell
        tool={TOOL}
        subtitulo="Para o mesmo rendimento anual, os três cenários lado a lado e com as mesmas premissas — líquido, obrigações, proteção social e o ponto a partir do qual a resposta muda."
        contexto={
          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100">
              Perguntas frequentes
            </h2>
            <div className="space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-stone-800 dark:text-stone-100">
                    {f.q}
                    <ArrowRight size={16} className="flex-shrink-0 text-stone-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        }
      >
        <ComparadorLazy />
      </ToolShell>
    </>
  );
}
