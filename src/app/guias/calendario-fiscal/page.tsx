import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = metadataDoGuia("calendario-fiscal");

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
    <GuiaLayout slug="calendario-fiscal">

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
          Vê todas as datas do ano num só sítio, com o que é preciso entregar em cada uma.
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard/prazos" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Ver o calendário fiscal <ArrowRight size={13} />
          </Link>
          <Link href="/guias/pagamentos-por-conta" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Pagamentos por conta <ArrowRight size={13} />
          </Link>
        </div>
      </section>

    </GuiaLayout>
  );
}
