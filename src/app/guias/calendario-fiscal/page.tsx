import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Calendário fiscal 2026 — prazos de IRS, IVA, SS e IRC",
  description:
    "As principais datas fiscais de 2026 em Portugal: entrega do IRS, IVA trimestral, declaração da Segurança Social e obrigações de IRC, num só calendário.",
  keywords: ["calendário fiscal 2026", "prazos IRS", "prazos IVA", "prazos segurança social"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/calendario-fiscal" },
  openGraph: {
    title: "Calendário fiscal 2026 | ReciboCerto",
    description: "Todas as datas que interessam — IRS, IVA, Segurança Social e IRC — sem surpresas.",
    url: "https://www.recibocerto.pt/guias/calendario-fiscal",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Portal das Finanças — Agenda Fiscal", url: "https://www.portaldasfinancas.gov.pt", tipo: "oficial" as const },
  { titulo: "Segurança Social Direta", url: "https://www.seg-social.pt", tipo: "oficial" as const },
];

const BLOCOS = [
  {
    titulo: "IRS",
    cor: "text-brand",
    itens: [
      "Entrega da declaração Modelo 3: de 1 de abril a 30 de junho",
      "Pagamentos por conta (categoria B): 20 de julho, 20 de setembro e 20 de dezembro",
      "Pagamento/reembolso do acerto: após a liquidação (reembolsos, em regra, até 31 de julho)",
    ],
  },
  {
    titulo: "IVA",
    cor: "text-brand",
    itens: [
      "Regime trimestral: declaração periódica até dia 20 do 2.º mês seguinte ao trimestre",
      "Regime mensal: declaração até dia 20 do 2.º mês seguinte",
      "Isentos pelo Art. 53.º não entregam declaração periódica de IVA",
    ],
  },
  {
    titulo: "Segurança Social (independentes)",
    cor: "text-brand",
    itens: [
      "Declaração trimestral: em janeiro, abril, julho e outubro",
      "Pagamento da contribuição: até dia 20 do mês seguinte ao trimestre",
    ],
  },
  {
    titulo: "IRC (empresas)",
    cor: "text-brand",
    itens: [
      "Modelo 22: até 31 de maio",
      "Pagamentos por conta: julho, setembro e 15 de dezembro",
      "IES/declaração anual: até 15 de julho",
    ],
  },
];

export default function CalendarioFiscalPage() {
  return (
    <>
      <GuiaHero
        titulo="Calendário fiscal 2026"
        descricao="As datas que não podes falhar, organizadas por imposto. Confirma sempre a agenda oficial — alguns prazos deslizam para o dia útil seguinte quando caem em fim de semana ou feriado."
        tempoLeitura={5}
        badge="Prazos"
      />

      <div className="space-y-6">
        {BLOCOS.map((b) => (
          <section key={b.titulo}>
            <h2 className={`font-display text-xl font-semibold ${b.cor} mb-3`}>{b.titulo}</h2>
            <div className="space-y-2">
              {b.itens.map((i) => (
                <div key={i} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                  {i}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 mb-4">
        <div className="rounded-2xl border border-brand/20 bg-brand-light/50 px-4 py-3 text-sm text-brand-dark">
          Configura alertas para nunca mais perderes uma data — recebes o aviso antes de cada prazo.
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard/prazos" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Configurar alertas de prazos <ArrowRight size={13} />
          </Link>
          <Link href="/guias/pagamentos-por-conta" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Pagamentos por conta <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
