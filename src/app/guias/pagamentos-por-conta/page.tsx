import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Pagamentos por conta do IRS (recibos verdes) 2026",
  description:
    "O que são os pagamentos por conta do IRS para trabalhadores independentes, quando se pagam (julho, setembro, dezembro) e como funcionam — Portugal 2026.",
  keywords: ["pagamentos por conta", "IRS independentes", "categoria B", "Art. 102 CIRS"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/pagamentos-por-conta" },
  openGraph: {
    title: "Pagamentos por conta do IRS | ReciboCerto",
    description: "Adiantamentos de IRS da categoria B: prazos, cálculo e o que acontece no acerto final.",
    url: "https://www.recibocerto.pt/guias/pagamentos-por-conta",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "CIRS — Art. 102.º (pagamentos por conta)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs102.aspx", tipo: "oficial" as const },
  { titulo: "Portal das Finanças", url: "https://www.portaldasfinancas.gov.pt", tipo: "oficial" as const },
];

const PRAZOS = [
  { mes: "Julho", txt: "1.ª prestação — até 20 de julho" },
  { mes: "Setembro", txt: "2.ª prestação — até 20 de setembro" },
  { mes: "Dezembro", txt: "3.ª prestação — até 20 de dezembro" },
];

export default function PagamentosPorContaPage() {
  return (
    <>
      <GuiaHero
        titulo="Pagamentos por conta do IRS"
        descricao="Se tens rendimentos da categoria B com retenção, podes ter de adiantar IRS três vezes ao ano. Não é um imposto extra — é um adiantamento que abate ao acerto final."
        tempoLeitura={4}
        badge="Categoria B"
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O que são (e o que não são)
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400 mb-3">
          Os pagamentos por conta são <strong className="text-stone-700 dark:text-stone-200">adiantamentos
          do IRS</strong> do ano em curso (Art. 102.º CIRS). Tal como as retenções na fonte, não são
          imposto adicional: são descontados ao IRS apurado na declaração do ano seguinte. Se no acerto
          final tiveres pago a mais, recebes reembolso.
        </p>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          São calculados pela Autoridade Tributária com base no IRS da categoria B de anos anteriores e
          comunicados na nota de liquidação. Quem tem rendimentos baixos ou está nos primeiros anos de
          atividade muitas vezes não tem pagamentos por conta.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Quando se pagam
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {PRAZOS.map((p) => (
            <div key={p.mes} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
              <p className="text-xs font-semibold text-brand mb-1">{p.mes}</p>
              <p className="text-sm text-stone-600 dark:text-stone-400">{p.txt}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Podes <strong className="text-stone-700 dark:text-stone-200">reduzir ou suspender</strong> um
          pagamento por conta se previres que o imposto já retido chega para cobrir o IRS do ano — mas se
          a redução for excessiva, podem ser devidos juros. Em caso de dúvida, confirma com o teu
          contabilista certificado.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/retencao-na-fonte" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Retenção na fonte <ArrowRight size={13} />
          </Link>
          <Link href="/dashboard/prazos" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Configurar alertas de prazos <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
