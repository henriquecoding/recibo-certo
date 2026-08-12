import type { Metadata } from "next";
import Link from "next/link";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { CalculadoraSSTrimestral } from "@/components/guias/CalculadoraSSTrimestral";
import InfoTip from "@/components/ui/InfoTip";
import { Check, ArrowRight } from "@/components/ui/Icons";
import { SS_TAXA, SS_COEFICIENTE, SS_BASE_MAX_MENSAL, SS_MIN_MENSAL, IAS_VALUE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("seguranca-social");

const iasVal = IAS_VALUE;

export default function SegurancaSocialPage() {
  return (
    <GuiaLayout slug="seguranca-social">

      <section className="mb-6">
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5 mb-4">
          <p className="text-sm font-semibold text-brand-dark dark:text-brand mb-2">A fórmula</p>
          <p className="font-mono text-sm text-stone-700 dark:text-stone-300">
            (Faturação trimestre ÷ 3) × {pct(SS_COEFICIENTE.servicos.value)}
            <InfoTip label="Coeficiente SS">{SS_COEFICIENTE.servicos.legalBasis}</InfoTip>
            {" "}× {pct(SS_TAXA.value)}
            <InfoTip label="Taxa SS">{SS_TAXA.legalBasis}</InfoTip>
            {" "}= Contribuição mensal
          </p>
          <p className="text-xs text-stone-500 mt-2">
            Para vendas/hotelaria/restauração: {pct(SS_COEFICIENTE.bens.value)} em vez de {pct(SS_COEFICIENTE.servicos.value)}.
          </p>
        </div>
        <CalculadoraSSTrimestral />
      </section>

      <section className="mb-10">
        <div className="rounded-3xl border border-brand bg-brand-light p-5 dark:bg-brand/10">
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            Esta calculadora tem página própria, com o calendário de declaração e pagamento, os cenários de acumulação com trabalho dependente e a ligação ao simulador de recibos verdes.
          </p>
          <Link
            href="/ferramentas/seguranca-social"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-dark transition-colors hover:text-brand dark:text-brand"
          >
            Abrir a calculadora completa <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Isenção do 1.º ano
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            12 meses sem pagar SS, a contar da data de abertura de atividade nas Finanças.
          </p>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-2.5 text-xs text-stone-500">
            Atenção: sem contribuições = sem direito a prestações sociais nesse período (doença, parentalidade, desemprego).
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-3">
            No 13.º mês, as contribuições começam automaticamente com base na faturação do trimestre anterior.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Isenção por acumulação com emprego
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Estás isento de pagar SS pelos recibos verdes se:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-400">
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> As entidades são diferentes (cliente ≠ empregador)</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Média mensal dos recibos {"<"} 4 × IAS ({fmt(4 * iasVal)})</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Rendimento do emprego ≥ 1 × IAS ({fmt(iasVal)})</li>
          </ul>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Declaração trimestral — datas
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { prazo: "31 de janeiro", descricao: "4.º trimestre do ano anterior" },
            { prazo: "30 de abril", descricao: "1.º trimestre" },
            { prazo: "31 de julho", descricao: "2.º trimestre" },
            { prazo: "31 de outubro", descricao: "3.º trimestre" },
          ].map((d) => (
            <div key={d.prazo} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
              <p className="text-sm font-semibold text-brand">{d.prazo}</p>
              <p className="text-xs text-stone-500 mt-0.5">{d.descricao}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 px-4 py-3 text-sm text-stone-700 dark:text-stone-300">
          Mesmo com rendimentos zero: a declaração é obrigatória. Coima por incumprimento: 50–250 €.
        </div>
        <p className="mt-3 text-sm text-stone-500">
          Plataforma: <a href="https://app.seg-social.pt" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">app.seg-social.pt</a>
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Pagamento mensal
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Prazo</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Dias 10–20 do mês</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Mínimo mensal</p>
            <p className="text-sm font-semibold text-brand">{fmt(SS_MIN_MENSAL.value)}</p>
            <p className="text-xs text-stone-400">{SS_MIN_MENSAL.legalBasis}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Máximo mensal</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{fmt(SS_BASE_MAX_MENSAL.value * SS_TAXA.value)}</p>
            <p className="text-xs text-stone-400">teto: {fmt(SS_BASE_MAX_MENSAL.value)}</p>
          </div>
        </div>
      </section>

      {/* Elegibilidade — reescrita na sequência da auditoria de 26/07/2026.
          A versão anterior reduzia cada prestação a um "número mágico"
          ("12 meses", "24 meses"), o que levava o leitor a concluir que
          tinha (ou não tinha) direito apenas pelo decurso do tempo. As
          condições são cumulativas e o prazo de garantia é só uma delas. */}
      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
          Direitos sociais: o que é preciso para lá chegar
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Nenhuma destas prestações depende só do tempo de contribuições. Em todas há{" "}
          <strong>condições cumulativas</strong> — prazo de garantia, período de referência,
          natureza da atividade e situação contributiva regularizada. Confirma sempre o guia
          oficial da prestação antes de contar com ela.
        </p>

        <div className="space-y-3">
          {[
            {
              direito: "Subsídio de doença",
              garantia: "6 meses civis com registo de remunerações, seguidos ou interpolados.",
              condicoes: [
                "Situação contributiva regularizada.",
                "Incapacidade temporária certificada.",
              ],
            },
            {
              direito: "Proteção na parentalidade",
              garantia: "6 meses civis com registo de remunerações, seguidos ou interpolados.",
              condicoes: [
                "Não pode existir um intervalo igual ou superior a 6 meses sem contribuições — se existir, começa a contar um novo prazo de garantia.",
                "Situação contributiva regularizada.",
                "Durante o período de subsídio, o trabalhador independente está dispensado de contribuir.",
              ],
            },
            {
              direito: "Subsídio por cessação de atividade",
              garantia:
                "360 dias de exercício de atividade independente economicamente dependente, com pagamento efetivo de contribuições, nos 24 meses imediatamente anteriores à cessação.",
              condicoes: [
                "Cessação involuntária do contrato de prestação de serviços.",
                "Ser considerado economicamente dependente da entidade contratante no ano civil anterior e à data da cessação.",
                "Inscrição no centro de emprego da área de residência.",
                "Requerimento no prazo de 90 dias seguidos a contar da cessação.",
              ],
            },
          ].map((d) => (
            <div
              key={d.direito}
              className="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{d.direito}</p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Prazo de garantia
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{d.garantia}</p>
              <p className="mt-2.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                E ainda, cumulativamente
              </p>
              <ul className="mt-1 space-y-1">
                {d.condicoes.map((c) => (
                  <li
                    key={c}
                    className="flex items-start gap-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400"
                  >
                    <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-stone-300" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-4 rounded-2xl bg-alert-bg px-4 py-3 text-sm leading-relaxed text-alert-text">
          Não concluas que não tens direito só porque falhas um destes pontos, nem que tens direito
          só porque os cumpres. A decisão é da Segurança Social, caso a caso.
        </p>
      </section>

    </GuiaLayout>
  );
}
