import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import { fmt } from "@/lib/format";
import { REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Regime simplificado vs. contabilidade organizada 2026",
  description:
    "Quando compensa passar à contabilidade organizada? Limites, obrigações e como decidir entre o regime simplificado e o lucro real — Portugal 2026.",
  keywords: ["contabilidade organizada", "regime simplificado", "Art. 28 CIRS", "lucro real"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/contabilidade-organizada" },
  openGraph: {
    title: "Regime simplificado vs. contabilidade organizada | ReciboCerto",
    description: "Limites, obrigações e quando muda a conta — escolhe o regime certo para a tua atividade.",
    url: "https://www.recibocerto.pt/guias/contabilidade-organizada",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "CIRS — Art. 28.º (formas de determinação)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs28.aspx", tipo: "oficial" as const },
  { titulo: "CIRS — Art. 31.º (regime simplificado)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs31.aspx", tipo: "oficial" as const },
  { titulo: "Ordem dos Contabilistas Certificados", url: "https://www.occ.pt", tipo: "referencia" as const },
];

export default function ContabilidadeOrganizadaPage() {
  return (
    <>
      <GuiaHero
        titulo="Regime simplificado vs. contabilidade organizada"
        descricao="Dois caminhos para apurar o teu rendimento da categoria B. Um presume as despesas; o outro tributa o lucro real. Eis quando cada um compensa."
        tempoLeitura={6}
        badge="Decisão de regime"
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          A diferença essencial
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Regime simplificado</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Aplica um coeficiente ao rendimento bruto (Art. 31.º). Presume as despesas — não precisas
              de contabilista certificado obrigatório. Simples, mas se tens muitas despesas reais podes
              pagar mais do que pagarias pelo lucro efetivo.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Contabilidade organizada</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Tributa o <strong className="text-stone-700 dark:text-stone-200">lucro real</strong>{" "}
              (receitas − despesas documentadas). Exige contabilista certificado e mais obrigações, mas
              pode compensar quando as despesas são elevadas face à faturação.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Quando a contabilidade organizada é obrigatória
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          O regime simplificado aplica-se a quem fatura até{" "}
          <strong className="text-stone-700 dark:text-stone-200">{fmt(REGIME_SIMPLIFICADO.limite.value)}</strong>{" "}
          por ano{" "}
          <InfoTip label="Limite do regime simplificado">{REGIME_SIMPLIFICADO.limite.legalBasis}</InfoTip>. Acima
          desse valor (ou se ultrapassares o limite dois anos seguidos, ou num ano em mais de 25%), passas
          obrigatoriamente à contabilidade organizada (Art. 28.º CIRS). Podes também optar pela
          contabilidade organizada de forma voluntária, mesmo abaixo do limite.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Regra prática para decidir
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          A pergunta-chave: as tuas despesas reais com a atividade são maiores do que a parte que o
          coeficiente já presume? Se sim, a contabilidade organizada tende a compensar; se as tuas
          despesas são baixas (típico em serviços), o simplificado costuma ser mais vantajoso e bem mais
          simples. Como a opção tem implicações por vários anos, confirma a simulação com um contabilista
          certificado antes de mudar.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/despesas-dedutiveis" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Despesas dedutíveis e a regra dos 15% <ArrowRight size={13} />
          </Link>
          <Link href="/guias/regime-simplificado" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Regime simplificado e coeficientes <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
