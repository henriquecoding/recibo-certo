import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Tributação conjunta vs. separada no IRS 2026",
  description:
    "Casados e unidos de facto podem escolher tributação conjunta ou separada no IRS. Como funciona o quociente conjugal e quando cada opção compensa — Portugal 2026.",
  keywords: ["tributação conjunta", "tributação separada", "quociente conjugal", "IRS casados", "Art. 69 CIRS"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/tributacao-conjunta" },
  openGraph: {
    title: "Tributação conjunta vs. separada | ReciboCerto",
    description: "Quociente conjugal explicado e quando vale a pena juntar (ou separar) a declaração.",
    url: "https://www.recibocerto.pt/guias/tributacao-conjunta",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "CIRS — Art. 13.º (sujeito passivo)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs13.aspx", tipo: "oficial" as const },
  { titulo: "CIRS — Art. 69.º (quociente conjugal)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs69.aspx", tipo: "oficial" as const },
];

export default function TributacaoConjuntaPage() {
  return (
    <>
      <GuiaHero
        titulo="Tributação conjunta vs. separada"
        descricao="Se és casado ou unido de facto, podes escolher como entregas o IRS. A opção certa pode valer centenas de euros — depende da diferença de rendimentos do casal."
        tempoLeitura={5}
        badge="Agregado familiar"
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O que é o quociente conjugal
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Na tributação conjunta, somam-se os rendimentos coletáveis dos dois sujeitos passivos, divide-se
          o total por 2, aplicam-se os escalões de IRS a esse valor e o imposto resultante é depois
          multiplicado por 2 (Art. 69.º CIRS). É o chamado{" "}
          <strong className="text-stone-700 dark:text-stone-200">quociente conjugal</strong>: como os
          escalões são progressivos, dividir o rendimento por dois pode baixar a taxa média aplicada.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Quando cada opção compensa
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Conjunta tende a compensar</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Quando há grande diferença de rendimentos entre os cônjuges (ex.: um ganha bem e o outro
              pouco ou nada). A divisão por 2 «empurra» o rendimento para escalões mais baixos.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Separada pode ser melhor</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Quando ambos têm rendimentos semelhantes, a vantagem do quociente é pequena e, em certos
              casos, a separada simplifica e até favorece. Convém simular as duas hipóteses.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <div className="rounded-2xl border border-brand/20 bg-brand-light/50 px-4 py-3 text-sm text-brand-dark">
          A escolha é anual e reversível — podes optar por conjunta num ano e separada no seguinte. O
          simulador de IRS compara automaticamente os dois cenários por ti.
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/ferramentas/simulador-irs" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Comparar conjunta vs. separada <ArrowRight size={13} />
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
