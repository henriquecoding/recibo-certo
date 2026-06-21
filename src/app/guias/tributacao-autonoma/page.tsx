import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import {
  TA_VIATURAS_COMBUSTAO,
  TA_VIATURAS_PHEV,
  TA_VIATURAS_ELETRICA,
  TA_THRESHOLDS,
  TA_REPRESENTACAO,
  TA_AJUDAS_CUSTO,
  TA_NAO_DOCUMENTADAS,
  TA_AGRAVAMENTO_PREJUIZO,
} from "@/lib/fiscal-data";
import { pct, fmt } from "@/lib/format";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Tributação autónoma em 2026: viaturas, representação e despesas | ReciboCerto",
  description: "Guia de tributação autónoma (Art. 88.º CIRC) para empresas em 2026: taxas sobre viaturas, despesas de representação, ajudas de custo e agravamento por prejuízo.",
  keywords: ["tributação autónoma 2026", "Art. 88 CIRC", "viaturas empresa", "despesas representação"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/tributacao-autonoma" },
  openGraph: {
    title: "Tributação autónoma em 2026 | ReciboCerto",
    description: "Taxas sobre viaturas, representação, ajudas de custo e agravamento por prejuízo.",
    url: "https://www.recibocerto.pt/guias/tributacao-autonoma",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 88.º CIRC — Taxas de tributação autónoma", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/irc88.aspx", tipo: "oficial" as const },
  { titulo: "Lei 73-A/2025 — Orçamento do Estado 2026 (alterações TA)", url: "https://diariodarepublica.pt/dr/detalhe/lei/73-a-2025", tipo: "oficial" as const },
  { titulo: "OCC — Tributação autónoma 2026: novas taxas e limiares", url: "https://www.occ.pt/pt-pt/noticias/tributacao-autonoma-2026", tipo: "referencia" as const },
  { titulo: "Santander — Tributação autónoma: o que muda em 2026", url: "https://www.santander.pt/salto/tributacao-autonoma", tipo: "referencia" as const },
];

const TABELA_VIATURAS = [
  {
    tipo: "Combustão interna (gasóleo/gasolina)",
    escaloes: [
      { limiar: `≤ ${fmt(TA_THRESHOLDS.value.t1)}`, taxa: TA_VIATURAS_COMBUSTAO.value.ate37500 },
      { limiar: `${fmt(TA_THRESHOLDS.value.t1)} – ${fmt(TA_THRESHOLDS.value.t2)}`, taxa: TA_VIATURAS_COMBUSTAO.value.ate45000 },
      { limiar: `> ${fmt(TA_THRESHOLDS.value.t2)}`, taxa: TA_VIATURAS_COMBUSTAO.value.acima45000 },
    ],
  },
  {
    tipo: "Híbridos plug-in (PHEV Euro 6e-bis)",
    escaloes: [
      { limiar: `≤ ${fmt(TA_THRESHOLDS.value.t1)}`, taxa: TA_VIATURAS_PHEV.value.ate37500 },
      { limiar: `${fmt(TA_THRESHOLDS.value.t1)} – ${fmt(TA_THRESHOLDS.value.t2)}`, taxa: TA_VIATURAS_PHEV.value.ate45000 },
      { limiar: `> ${fmt(TA_THRESHOLDS.value.t2)}`, taxa: TA_VIATURAS_PHEV.value.acima45000 },
    ],
  },
];

export default function TributacaoAutonomaPage() {
  return (
    <>
      <GuiaHero
        eyebrow="Guia · Empresas"
        titulo="Tributação autónoma: o custo oculto das despesas"
        descricao="A tributação autónoma (Art. 88.º CIRC) incide sobre certas despesas da empresa, independentemente de haver lucro ou prejuízo. Percebe as taxas e como minimizar o impacto."
        tempoLeitura={7}
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O que é a tributação autónoma
        </h2>
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5">
          <p className="text-sm text-stone-700 dark:text-stone-300 mb-2">
            Ao contrário do IRC (que incide sobre o lucro), a tributação autónoma incide sobre determinadas <strong>despesas</strong>, mesmo que a empresa tenha prejuízo no exercício.
          </p>
          <p className="text-sm text-stone-700 dark:text-stone-300">
            O objetivo é desincentivar despesas que possam ter uso pessoal misto (viaturas, representação) e penalizar a falta de documentação.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Viaturas ligeiras de passageiros
          <InfoTip label="Art. 88.º, n.os 3/11 CIRC">{TA_VIATURAS_COMBUSTAO.legalBasis}</InfoTip>
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          Limiares de custo de aquisição atualizados pelo OE 2025: {fmt(TA_THRESHOLDS.value.t1)} e {fmt(TA_THRESHOLDS.value.t2)} (anteriormente 27 500 € e 35 000 €).
        </p>
        <div className="space-y-4">
          {TABELA_VIATURAS.map((cat) => (
            <div key={cat.tipo} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3">{cat.tipo}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 dark:border-stone-800">
                      <th className="pb-2 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Custo de aquisição</th>
                      <th className="pb-2 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {cat.escaloes.map((e) => (
                      <tr key={e.limiar}>
                        <td className="py-2 text-stone-600 dark:text-stone-400">{e.limiar}</td>
                        <td className="py-2 text-right font-semibold text-brand">{pct(e.taxa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Viaturas 100% elétricas</p>
            <p className="font-display text-xl font-semibold text-brand">{pct(TA_VIATURAS_ELETRICA.value)}</p>
            <p className="text-xs text-stone-500 mt-1">Isentas de tributação autónoma</p>
          </div>
          <div className="rounded-2xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 p-4">
            <p className="text-xs font-semibold text-clay-text mb-1">PHEV não conformes</p>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Híbridos plug-in que não cumpram Euro 6e-bis ou emitam ≥ 80 g CO₂/km são tributados às taxas de combustão interna.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Outras despesas sujeitas
        </h2>
        <div className="space-y-2">
          {[
            {
              titulo: "Despesas de representação",
              taxa: TA_REPRESENTACAO.value,
              descricao: "Refeições com clientes, alojamento em viagem, eventos e ofertas a clientes.",
              base: TA_REPRESENTACAO.legalBasis,
            },
            {
              titulo: "Ajudas de custo e km em viatura própria",
              taxa: TA_AJUDAS_CUSTO.value,
              descricao: "Ajudas de custo e compensação por deslocação em viatura pessoal do trabalhador, quando não faturadas a clientes.",
              base: TA_AJUDAS_CUSTO.legalBasis,
            },
            {
              titulo: "Despesas não documentadas",
              taxa: TA_NAO_DOCUMENTADAS.value,
              descricao: "Despesas sem documento de suporte. Taxa dobrada (100%) para sujeitos passivos total ou parcialmente isentos.",
              base: TA_NAO_DOCUMENTADAS.legalBasis,
            },
          ].map((d) => (
            <div key={d.titulo} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <div className="flex items-center justify-between gap-4 mb-1">
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                  {d.titulo}
                  <InfoTip label="Art. 88.º CIRC">{d.base}</InfoTip>
                </p>
                <p className="font-display text-lg font-semibold text-brand flex-shrink-0">{pct(d.taxa)}</p>
              </div>
              <p className="text-xs text-stone-400">{d.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Agravamento por prejuízo fiscal
          <InfoTip label="Art. 88.º, n.º 14 CIRC">{TA_AGRAVAMENTO_PREJUIZO.legalBasis}</InfoTip>
        </h2>
        <div className="rounded-2xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 px-5 py-4">
          <p className="text-sm text-stone-700 dark:text-stone-300 mb-2">
            <strong>Atenção:</strong> quando a empresa apresenta prejuízo fiscal, todas as taxas de tributação autónoma são agravadas em{" "}
            <span className="font-semibold">{pct(TA_AGRAVAMENTO_PREJUIZO.value)}</span> (10 pontos percentuais).
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Exemplo: uma viatura a gasóleo com custo ≤ {fmt(TA_THRESHOLDS.value.t1)} passaria de {pct(TA_VIATURAS_COMBUSTAO.value.ate37500)} para{" "}
            {pct(TA_VIATURAS_COMBUSTAO.value.ate37500 + TA_AGRAVAMENTO_PREJUIZO.value)}.
          </p>
        </div>
        <div className="mt-3 rounded-xl bg-stone-50 dark:bg-stone-800 px-4 py-3">
          <p className="text-xs text-stone-500">
            <span className="font-semibold text-stone-600 dark:text-stone-400">Exceções:</span> o agravamento não se aplica nos primeiros 3 anos de atividade nem se a empresa teve lucro tributável em pelo menos 1 dos 3 exercícios anteriores.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Como minimizar a tributação autónoma
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <div className="space-y-3">
            {[
              { dica: "Optar por viaturas elétricas", detalhe: "Taxa zero de tributação autónoma, independentemente do custo de aquisição." },
              { dica: "Documentar todas as despesas", detalhe: "Evita a taxa de 50% sobre despesas não documentadas." },
              { dica: "Evitar prejuízo fiscal", detalhe: "O agravamento de 10 p.p. pode representar um custo significativo sobre o total de despesas sujeitas." },
              { dica: "Controlar despesas de representação", detalhe: "Classificar corretamente e separar de despesas operacionais normais." },
            ].map((d) => (
              <div key={d.dica} className="flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{d.dica}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{d.detalhe}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/irc" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            IRC para PME <ArrowRight size={13} />
          </Link>
          <Link href="/guias/abrir-empresa" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Como abrir uma empresa <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
