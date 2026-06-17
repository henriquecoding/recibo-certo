import type { Metadata } from "next";
import { SimuladorVencimento } from "@/components/dependente/SimuladorVencimento";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";
import { pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "Simulador de recibo de vencimento 2026 — salário líquido",
  description:
    "Verifica se o teu salário está correto. Calcula o vencimento líquido a partir do bruto: IRS retido (tabelas 2026), Segurança Social e subsídio de refeição. Por conta de outrem, grátis.",
  keywords: [
    "calcular salário líquido 2026",
    "simulador recibo de vencimento",
    "retenção na fonte IRS 2026 trabalho dependente",
    "verificar recibo de vencimento",
    "salário líquido por conta de outrem",
  ],
  alternates: { canonical: "https://recibocerto.pt/ferramentas/recibo-vencimento" },
  openGraph: {
    title: "Simulador de recibo de vencimento 2026 | ReciboCerto",
    description: "Do salário bruto ao líquido: IRS, Segurança Social e subsídio de refeição, com as tabelas oficiais de 2026.",
    url: "https://recibocerto.pt/ferramentas/recibo-vencimento",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

export default function ReciboVencimentoPage() {
  return (
    <>
      <div className="mb-8">
        <div className="eyebrow mb-3 text-brand">Por conta de outrem</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          O teu salário está certo?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Insere o teu salário bruto e vê o líquido que devias receber — com a retenção de IRS das
          tabelas oficiais de 2026, a Segurança Social e o subsídio de refeição. Compara com o teu
          recibo de vencimento.
        </p>
      </div>

      <SimuladorVencimento />

      <div className="mt-2 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Como funciona</p>
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          Ao salário bruto descontam-se duas parcelas: a tua contribuição para a Segurança Social
          ({pct(SS_DEPENDENTE.trabalhador.value)} sobre o bruto) e a retenção na fonte de IRS,
          calculada pela fórmula oficial <span className="text-stone-700 dark:text-stone-300">remuneração × taxa
          marginal − parcela a abater − parcela por dependente</span> (Despacho 233-A/2026). O subsídio
          de refeição é somado e fica isento até ao limite diário; o excesso é tributado. Os subsídios
          de férias e de Natal são tributados em separado (retenção autónoma, Art. 99.º-C CIRS), seja
          recebidos por inteiro ou em duodécimos. A entidade empregadora suporta ainda a Taxa Social
          Única ({pct(SS_DEPENDENTE.entidade.value)}).
        </p>
      </div>
    </>
  );
}
