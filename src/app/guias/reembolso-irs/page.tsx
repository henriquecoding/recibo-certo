import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import Link from "next/link";
import { ArrowRight, Check } from "@/components/ui/Icons";

export const metadata: Metadata = metadataDoGuia("reembolso-irs");

const ACELERAR = [
  "Entrega cedo, logo no início do período (1 de abril a 30 de junho)",
  "Confirma o IBAN correto no Portal das Finanças",
  "Valida as faturas no e-Fatura antes de entregar",
  "Sempre que possível, aceita a declaração automática (IRS automático) sem erros",
  "Garante que não tens dívidas fiscais ou à Segurança Social (podem gerar compensação)",
];

export default function ReembolsoIrsPage() {
  return (
    <GuiaLayout slug="reembolso-irs">

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Quando recebes
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Depois de entregares a declaração (entre 1 de abril e 30 de junho), a Autoridade Tributária
          liquida o imposto e processa o reembolso. Em regra, quem entrega cedo e sem inconsistências
          recebe ao longo das semanas seguintes — historicamente, a maioria dos reembolsos é paga até{" "}
          <strong className="text-stone-700 dark:text-stone-200">31 de julho</strong>. Declarações com
          erros, validações manuais ou pendências demoram mais.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Como aumentar a probabilidade de receber depressa
        </h2>
        <div className="space-y-2">
          {ACELERAR.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <span className="mt-0.5 text-brand flex-shrink-0"><Check size={14} /></span>
              <p className="text-sm text-stone-600 dark:text-stone-400">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="rounded-2xl border border-brand/20 bg-brand-light/50 px-4 py-3 text-sm text-brand-dark">
          Queres saber se vais receber ou pagar? Simula o teu IRS anual antes de entregar — vês logo o
          reembolso (ou imposto a pagar) estimado e a memória de cálculo.
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/ferramentas/simulador-irs" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Simular o meu IRS anual <ArrowRight size={13} />
          </Link>
          <Link href="/guias/deducoes-coleta" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Deduções à coleta <ArrowRight size={13} />
          </Link>
        </div>
      </section>

    </GuiaLayout>
  );
}
