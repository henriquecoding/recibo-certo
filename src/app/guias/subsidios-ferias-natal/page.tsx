import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import { SS_DEPENDENTE, RETENCAO_DEP_ISENCAO } from "@/lib/fiscal-data";
import { pct, fmt } from "@/lib/format";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Subsídio de férias e de Natal 2026 | ReciboCerto",
  description: "Quando se recebe, como se calcula e quais os descontos do subsídio de férias e do subsídio de Natal em Portugal. Guia com base legal atualizada.",
  keywords: ["subsídio de férias 2026", "subsídio de Natal 2026", "duodécimos subsídio", "descontos subsídio férias"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/subsidios-ferias-natal" },
  openGraph: {
    title: "Subsídio de férias e de Natal 2026 | ReciboCerto",
    description: "Cálculo, descontos e opção de duodécimos explicados.",
    url: "https://www.recibocerto.pt/guias/subsidios-ferias-natal",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 263.º Código do Trabalho — Subsídio de Natal", url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0263&nid=1047&tabela=leis", tipo: "oficial" as const },
  { titulo: "Art. 264.º Código do Trabalho — Subsídio de férias", url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0264&nid=1047&tabela=leis", tipo: "oficial" as const },
  { titulo: "Art. 264.º-A CT — Pagamento em duodécimos", url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0264A&nid=1047&tabela=leis", tipo: "oficial" as const },
  { titulo: "Doutor Finanças — Subsídio de Natal: tudo o que precisa saber", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/rendimentos/subsidio-de-natal-tudo-o-que-precisa-saber/", tipo: "referencia" as const },
  { titulo: "Montepio — Subsídio de férias: regras e cálculos", url: "https://www.montepio.org/ei/pessoal/impostos/subsidio-de-ferias-regras-e-calculos/", tipo: "referencia" as const },
];

export default function SubsidiosFeriasNatalPage() {
  return (
    <>
      <GuiaHero
        eyebrow="Guia · Conta de outrem"
        titulo="Subsídio de férias e de Natal: cálculo e descontos"
        descricao="Duas prestações anuais obrigatórias com valor igual ao salário base. Percebe quando recebes, que descontos incidem e a opção de duodécimos."
        tempoLeitura={5}
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O que são e quando se recebem
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
            <p className="text-xs font-semibold text-brand mb-2">Subsídio de férias</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">
              Valor igual ao salário base (ou proporcional ao tempo de serviço no 1.º ano).
            </p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              Pago antes do início do período de férias
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Art. 264.º do Código do Trabalho
              <InfoTip label="Art. 264.º CT">Art. 264.º CT — o subsídio de férias é pago antes do início do período de férias, salvo acordo em contrário.</InfoTip>
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
            <p className="text-xs font-semibold text-brand mb-2">Subsídio de Natal</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">
              Valor igual ao salário base (ou proporcional ao tempo de serviço no 1.º ano).
            </p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              Pago até 15 de dezembro
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Art. 263.º do Código do Trabalho
              <InfoTip label="Art. 263.º CT">Art. 263.º CT — o subsídio de Natal é pago até 15 de dezembro de cada ano.</InfoTip>
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Descontos aplicáveis
        </h2>
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Segurança Social</p>
                <p className="text-xs text-stone-500 mt-0.5">Incide sobre ambos os subsídios.</p>
              </div>
              <p className="text-lg font-semibold text-brand">{pct(SS_DEPENDENTE.trabalhador.value)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Retenção na fonte de IRS</p>
                <p className="text-xs text-stone-500 mt-0.5">Ambos os subsídios são tributados autonomamente a uma taxa própria (geralmente a taxa correspondente ao salário base).</p>
              </div>
              <p className="text-sm font-semibold text-stone-400">Tabela aplicável</p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-stone-50 dark:bg-stone-800 px-4 py-3 text-xs text-stone-500">
          Os subsídios não incluem subsídio de refeição, ajudas de custo ou trabalho suplementar.
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Cálculo proporcional (1.º ano ou cessação)
        </h2>
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5">
          <p className="text-sm font-semibold text-brand-dark dark:text-brand mb-2">Fórmula</p>
          <p className="font-mono text-sm text-stone-700 dark:text-stone-300">
            (Salário base / 12) x meses trabalhados = Subsídio proporcional
          </p>
          <p className="text-xs text-stone-500 mt-2">
            Aplica-se no ano de admissão, no ano de saída e em contratos inferiores a 12 meses.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Pagamento em duodécimos
          <InfoTip label="Art. 264.º-A CT">Art. 264.º-A CT — o trabalhador pode optar pelo pagamento dos subsídios em duodécimos, por escrito.</InfoTip>
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            Desde 2023, o trabalhador pode optar por receber os subsídios de férias e de Natal em 12 prestações mensais (duodécimos), em vez de uma prestação única.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-3">
              <p className="text-xs font-semibold text-brand mb-1">50% em duodécimos</p>
              <p className="text-xs text-stone-500">Metade do subsídio é paga mensalmente; a outra metade na data normal.</p>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-3">
              <p className="text-xs font-semibold text-brand mb-1">100% em duodécimos</p>
              <p className="text-xs text-stone-500">Totalidade do subsídio é diluída ao longo dos 12 meses.</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-stone-400">
            A opção é feita por escrito pelo trabalhador e vigora durante o ano civil.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Duodécimos: efeito no IRS
        </h2>
        <div className="rounded-2xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 px-5 py-4">
          <p className="text-sm text-stone-700 dark:text-stone-300">
            <strong>Atenção:</strong> receber os subsídios em duodécimos aumenta a remuneração mensal aparente, o que pode elevar a taxa de retenção mensal de IRS. O imposto anual final é o mesmo, mas a retenção mensal pode ser maior.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/recibo-vencimento" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Como ler o recibo de vencimento <ArrowRight size={13} />
          </Link>
          <Link href="/guias/trabalho-suplementar" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Trabalho suplementar (horas extra) <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
