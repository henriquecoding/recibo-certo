import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import Link from "next/link";
import InfoTip from "@/components/ui/InfoTip";
import { SS_DEPENDENTE, RETENCAO_DEP_ISENCAO } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = metadataDoGuia("subsidios-ferias-natal");

export default function SubsidiosFeriasNatalPage() {
  return (
    <GuiaLayout slug="subsidios-ferias-natal">

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
              <p className="text-lg font-semibold text-brand">{pctExato(SS_DEPENDENTE.trabalhador.value)}</p>
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

      {/* Duodécimos — reescrito na sequência da auditoria de 26/07/2026.
          A versão anterior invocava um "Art. 264.º-A CT" que NÃO existe na
          versão consolidada do Código do Trabalho, e apresentava os
          duodécimos como uma opção unilateral do trabalhador até 100 %.
          A regra vigente está no próprio Art. 264.º: depende de acordo
          escrito e está limitada a metade do subsídio de férias. */}
      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Pagamento em duodécimos
          <InfoTip label="Art. 264.º CT">
            Art. 264.º do Código do Trabalho — o pagamento do subsídio de férias em duodécimos
            depende de acordo escrito entre empregador e trabalhador.
          </InfoTip>
        </h2>
        <div className="rounded-2xl border border-stone-100 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            Duodécimos significa diluir o subsídio pelos meses do ano, em vez de o receber de uma
            só vez. Não é um direito que o trabalhador exerça sozinho nem uma prática automática da
            empresa: <strong>depende de acordo escrito entre as duas partes</strong>.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800">
              <p className="mb-1 text-xs font-semibold text-brand">Subsídio de férias</p>
              <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                Havendo acordo escrito, até <strong>50 %</strong> pode ser pago em duodécimos. O
                remanescente tem de ser pago antes do início do gozo das férias.
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800">
              <p className="mb-1 text-xs font-semibold text-brand">Subsídio de Natal</p>
              <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                A regra legal é o pagamento até 15 de dezembro. Qualquer diluição depende do que
                estiver previsto no contrato ou no instrumento de regulamentação coletiva aplicável.
              </p>
            </div>
          </div>

          <p className="mt-3 rounded-xl bg-alert-bg px-3 py-2 text-xs leading-relaxed text-alert-text">
            Confirma sempre o teu contrato e o instrumento de regulamentação coletiva do setor:
            podem prever regras diferentes das supletivas do Código do Trabalho.
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

    </GuiaLayout>
  );
}
