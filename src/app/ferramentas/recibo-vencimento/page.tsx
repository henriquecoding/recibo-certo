import type { Metadata } from "next";
import MotorReciboVencimentoLazy from "./lazy";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";
import { pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "Simulador de recibo de vencimento 2026 — salário líquido",
  description:
    "Constrói e verifica o recibo de vencimento rubrica a rubrica: salário, subsídios, horas extra, prémios, IRS, Segurança Social e custo da empresa.",
  keywords: [
    "calcular salário líquido 2026",
    "simulador recibo de vencimento",
    "retenção na fonte IRS 2026 trabalho dependente",
    "verificar recibo de vencimento",
    "salário líquido por conta de outrem",
  ],
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas/recibo-vencimento" },
  openGraph: {
    title: "Simulador de recibo de vencimento 2026 | ReciboCerto",
    description: "Do salário bruto ao líquido, rubrica a rubrica: IRS, Segurança Social, subsídios, horas extra e custo da empresa.",
    url: "https://www.recibocerto.pt/ferramentas/recibo-vencimento",
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
          Reconstrói o recibo rubrica a rubrica e vê o efeito de cada valor no IRS, na Segurança
          Social, no líquido e no custo da empresa. Depois, compara o resultado com o documento real.
        </p>
      </div>

      <MotorReciboVencimentoLazy />

      <div className="mt-2 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Como funciona</p>
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          Cada rubrica é classificada antes do cálculo. Sobre a remuneração contributiva incide a tua
          contribuição para a Segurança Social ({pct(SS_DEPENDENTE.trabalhador.value)}) e a retenção na fonte de IRS é
          calculada pela fórmula oficial <span className="text-stone-700 dark:text-stone-300">remuneração × taxa
          marginal − parcela a abater − parcela por dependente</span> (Despacho 233-A/2026). O subsídio
          de refeição fica isento até ao limite diário; o excesso integra as bases. Os subsídios
          de férias e de Natal são tributados em separado (retenção autónoma, Art. 99.º-C CIRS), seja
          recebidos por inteiro ou em duodécimos. A entidade empregadora suporta ainda a Taxa Social
          Única ({pct(SS_DEPENDENTE.entidade.value)}) sobre a base contributiva, além dos valores pagos ao trabalhador.
        </p>
      </div>
    </>
  );
}
