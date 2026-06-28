import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { ArrowRight, Check } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Reembolso de IRS 2026 — prazos e como acelerar",
  description:
    "Quando recebes o reembolso de IRS, o que o atrasa e como aumentar a probabilidade de o receber depressa. Guia prático para Portugal, 2026.",
  keywords: ["reembolso IRS", "quando recebo o IRS", "IRS automático", "prazo reembolso IRS"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/reembolso-irs" },
  openGraph: {
    title: "Reembolso de IRS: prazos e como acelerar | ReciboCerto",
    description: "O que define a rapidez do reembolso e o que podes fazer para o receber mais cedo.",
    url: "https://www.recibocerto.pt/guias/reembolso-irs",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Portal das Finanças — IRS", url: "https://www.portaldasfinancas.gov.pt", tipo: "oficial" as const },
  { titulo: "CIRS — Art. 97.º (pagamento e reembolso)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs97.aspx", tipo: "oficial" as const },
];

const ACELERAR = [
  "Entrega cedo, logo no início do período (1 de abril a 30 de junho)",
  "Confirma o IBAN correto no Portal das Finanças",
  "Valida as faturas no e-Fatura antes de entregar",
  "Sempre que possível, aceita a declaração automática (IRS automático) sem erros",
  "Garante que não tens dívidas fiscais ou à Segurança Social (podem gerar compensação)",
];

export default function ReembolsoIrsPage() {
  return (
    <>
      <GuiaHero
        titulo="Reembolso de IRS: prazos e como acelerar"
        descricao="Pagaste IRS a mais durante o ano (retenções e pagamentos por conta)? O acerto devolve-te a diferença. Eis quando chega e como evitar atrasos."
        tempoLeitura={4}
        badge="IRS anual"
      />

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

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
