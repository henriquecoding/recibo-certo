import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import Link from "next/link";
import InfoTip from "@/components/ui/InfoTip";
import { fmt, pct } from "@/lib/format";
import { IRC_TAXA_PME, IRC_LIMITE_PME } from "@/lib/fiscal-data";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = metadataDoGuia("unipessoal-vs-eni");

export default function UnipessoalVsEniPage() {
  return (
    <GuiaLayout slug="unipessoal-vs-eni">

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          As duas estruturas
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">ENI — recibos verdes</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Tributação em <strong className="text-stone-700 dark:text-stone-200">IRS</strong> (categoria
              B). Simples e barato de abrir e manter. A responsabilidade é, em regra, ilimitada — o teu
              património pessoal pode responder por dívidas da atividade.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Unipessoal por quotas</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Pessoa coletiva tributada em <strong className="text-stone-700 dark:text-stone-200">IRC</strong>.
              Responsabilidade limitada ao capital social. Mais obrigações (contabilista certificado,
              IES) e custos fixos, mas separa o património pessoal do da empresa.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O lado dos impostos
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          No ENI, o lucro é tributado pelas taxas progressivas do IRS, que sobem com o rendimento. Numa
          sociedade, o lucro é tributado em IRC — a taxa reduzida de PME é de{" "}
          <strong className="text-stone-700 dark:text-stone-200">{pct(IRC_TAXA_PME.value)}</strong>{" "}
          <InfoTip label="IRC PME">{IRC_TAXA_PME.legalBasis}</InfoTip> até{" "}
          {fmt(IRC_LIMITE_PME.value)} de matéria coletável (taxa geral acima disso), mais derrama. Quando
          retiras o lucro como dividendos ou salário de gerência, há tributação adicional em IRS. Por
          isso, a comparação real depende de quanto faturas e de quanto precisas de levantar para ti.
        </p>
      </section>

      <section className="mb-10">
        <div className="rounded-2xl border border-brand/20 bg-brand-light/50 px-4 py-3 text-sm text-brand-dark">
          Regra geral: o ENI compensa em faturações mais baixas e quando queres simplicidade; a sociedade
          começa a fazer sentido com lucros mais altos, necessidade de responsabilidade limitada ou de
          investir/reter lucros na empresa. Simula os dois cenários antes de decidir.
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/ferramentas/simulador-empresa" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Simular empresa vs. recibos verdes <ArrowRight size={13} />
          </Link>
          <Link href="/guias/irc" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            IRC para PME <ArrowRight size={13} />
          </Link>
        </div>
      </section>

    </GuiaLayout>
  );
}
