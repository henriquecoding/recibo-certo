import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import MotorReciboVencimentoLazy from "./lazy";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";
import { pct } from "@/lib/format";

const TOOL = porId("recibo-vencimento")!;

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
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
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
    <ToolShell
      tool={TOOL}
      subtitulo="Reconstrói o recibo rubrica a rubrica e vê o efeito de cada valor no IRS, na Segurança Social, no líquido e no custo da empresa."
      contexto={
          <section className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50 sm:p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Como funciona</p>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              Cada rubrica é classificada antes do cálculo. Sobre a remuneração contributiva incide a tua
              contribuição para a Segurança Social ({pct(SS_DEPENDENTE.trabalhador.value)}) e a retenção na fonte de IRS é
              calculada pela fórmula oficial <span className="text-stone-700 dark:text-stone-300">remuneração × taxa
              marginal − parcela a abater − parcela por dependente</span> (Despacho 233-A/2026). O subsídio
              de refeição fica isento até ao limite diário; o excesso integra as bases. Os subsídios
              de férias e de Natal são tributados em separado (retenção autónoma, Art. 99.º-C CIRS), seja
              recebidos por inteiro ou em duodécimos. A entidade empregadora suporta ainda a Taxa Social
              Única ({pct(SS_DEPENDENTE.entidade.value)}) sobre a base contributiva, além dos valores pagos ao trabalhador.
            </p>
          </section>
      }
    >
      <MotorReciboVencimentoLazy />
    </ToolShell>
  );
}
