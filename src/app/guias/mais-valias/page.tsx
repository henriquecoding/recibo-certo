import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import { pct } from "@/lib/format";
import {
  MAIS_VALIAS_MOBILIARIAS_TAXA, CRIPTO_ISENCAO_DIAS, MAIS_VALIAS_IMOBILIARIO_INCLUSAO,
} from "@/lib/fiscal-data";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Mais-valias 2026 — ações, criptoativos e imóveis (IRS)",
  description:
    "Como são tributadas as mais-valias em Portugal: ações e ETF, criptoativos e venda de imóveis. Taxas, isenções e englobamento — categoria G do IRS, 2026.",
  keywords: ["mais-valias", "ações IRS", "criptoativos IRS", "venda de imóvel mais-valia", "categoria G"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/mais-valias" },
  openGraph: {
    title: "Mais-valias: ações, cripto e imóveis | ReciboCerto",
    description: "Taxas, isenções e quando vale a pena englobar — a categoria G explicada.",
    url: "https://www.recibocerto.pt/guias/mais-valias",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "CIRS — Art. 10.º (mais-valias)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs10.aspx", tipo: "oficial" as const },
  { titulo: "CIRS — Art. 43.º (saldo de mais-valias)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs43.aspx", tipo: "oficial" as const },
  { titulo: "CIRS — Art. 72.º (taxas especiais)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs72.aspx", tipo: "oficial" as const },
];

export default function MaisValiasPage() {
  return (
    <>
      <GuiaHero
        titulo="Mais-valias: ações, cripto e imóveis"
        descricao="Vendeste ações, criptoativos ou um imóvel com lucro? Esse ganho é mais-valia (categoria G). As regras mudam consoante o ativo — eis o essencial."
        tempoLeitura={6}
        badge="Categoria G"
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Ações, ETF e fundos
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Tributa-se o <strong className="text-stone-700 dark:text-stone-200">saldo anual</strong>{" "}
          (mais-valias menos menos-valias) à taxa autónoma de{" "}
          <strong className="text-stone-700 dark:text-stone-200">{pct(MAIS_VALIAS_MOBILIARIAS_TAXA.value)}</strong>{" "}
          <InfoTip label="Mais-valias mobiliárias">{MAIS_VALIAS_MOBILIARIAS_TAXA.legalBasis}</InfoTip>. Se o
          saldo for negativo, não há imposto e a menos-valia pode ser reportada nos anos seguintes. Atenção:
          se detiveste os ativos menos de 365 dias e o teu rendimento atinge o último escalão, o
          englobamento às taxas progressivas passa a ser obrigatório.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Criptoativos
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Os ganhos com criptoativos detidos há{" "}
          <strong className="text-stone-700 dark:text-stone-200">{CRIPTO_ISENCAO_DIAS.value} dias ou mais</strong>{" "}
          estão excluídos de tributação (Art. 10.º n.º 19 CIRS). Abaixo desse prazo, são tributados a{" "}
          {pct(MAIS_VALIAS_MOBILIARIAS_TAXA.value)}. A troca entre criptoativos não realiza ganho — só a
          venda para moeda com curso legal (ou a troca por bens/serviços) é que conta.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Venda de imóveis
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          A mais-valia é a diferença entre o valor de venda e o de aquisição (corrigido pela
          desvalorização da moeda), deduzidas as despesas com a compra, a venda e obras de valorização.
          Para residentes, só{" "}
          <strong className="text-stone-700 dark:text-stone-200">{pct(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)}</strong>{" "}
          do ganho é tributado, englobado às taxas progressivas (Art. 43.º n.º 2). O reinvestimento em
          habitação própria e permanente pode excluir a tributação, dentro das condições legais.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/ferramentas/simulador-irs" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Simular as mais-valias no IRS <ArrowRight size={13} />
          </Link>
          <Link href="/guias/escaloes-irs" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Escalões de IRS 2026 <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
