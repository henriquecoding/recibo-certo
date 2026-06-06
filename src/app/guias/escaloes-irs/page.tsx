import type { Metadata } from "next";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import { ESCALOES_IRS, MINIMO_EXISTENCIA } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "Escalões de IRS 2026 explicados para recibos verdes",
  description: "Tabela de escalões de IRS 2026 com taxas marginais e efetivas. Como funciona a tributação progressiva e o mínimo de existência.",
  keywords: ["escalões IRS 2026", "tabela IRS 2026", "taxas IRS recibos verdes"],
  alternates: { canonical: "https://recibocerto.pt/guias/escaloes-irs" },
  openGraph: {
    title: "Escalões de IRS 2026 para recibos verdes | ReciboCerto",
    description: "Tabela atualizada e o mito do 'subir de escalão' desmistificado.",
    url: "https://recibocerto.pt/guias/escaloes-irs",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 68.º CIRS — Escalões e taxas gerais de IRS", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx", tipo: "oficial" as const },
  { titulo: "Art. 70.º CIRS — Mínimo de existência", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs70.aspx", tipo: "oficial" as const },
  { titulo: "Lei 73-A/2025 — Orçamento do Estado 2026", url: "https://diariodarepublica.pt/dr/detalhe/lei/73-a-2025", tipo: "oficial" as const },
  { titulo: "Especialista do IRS — Escalões IRS 2026 tabela atualizada", url: "https://www.especialistadoirs.pt/blog/escaloes-irs-2026-tabela-atualizada", tipo: "referencia" as const },
  { titulo: "PwC Guia Fiscal 2026 — IRS", url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html", tipo: "referencia" as const },
];

// Calcula parcela abater para cada escalão (para apresentação)
function calcParcelaAbater(escaloes: typeof ESCALOES_IRS.value) {
  let acumulado = 0;
  return escaloes.map((e, i) => {
    if (i === 0) {
      const p = 0;
      acumulado = (e.ate ?? 0) * e.taxa;
      return p;
    }
    const anterior = escaloes[i - 1];
    const limAnterior = anterior.ate ?? 0;
    const p = acumulado - limAnterior * e.taxa;
    acumulado += ((e.ate ?? 250000) - limAnterior) * e.taxa;
    return Math.round(p * 100) / 100;
  });
}

const escaloes = ESCALOES_IRS.value;
const parcelasAbater = calcParcelaAbater(escaloes);

export default function EscaloesIRSPage() {
  return (
    <>
      <GuiaHero
        titulo="Escalões de IRS 2026 explicados para recibos verdes"
        descricao="O rendimento coletável não é a tua faturação — e subir de escalão não significa pagar mais em tudo."
        tempoLeitura={5}
      />

      <section className="mb-10">
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5 mb-6">
          <p className="text-sm font-semibold text-brand-dark dark:text-brand mb-2">A fórmula para recibos verdes</p>
          <p className="font-mono text-sm text-stone-700 dark:text-stone-300">
            Faturação × Coeficiente − Deduções SS = Rendimento coletável
          </p>
          <p className="text-xs text-stone-500 mt-2">
            O escalão é determinado pelo rendimento coletável, não pela faturação bruta.
          </p>
        </div>

        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Tabela de escalões 2026
          <InfoTip label="Base legal">{ESCALOES_IRS.legalBasis}</InfoTip>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Escalão</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Até</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Taxa marginal</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide hidden sm:table-cell">Parcela a abater</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {escaloes.map((e, i) => (
                <tr key={i}>
                  <td className="py-3 text-stone-500 text-xs">{i + 1}.º</td>
                  <td className="py-3 text-right text-stone-700 dark:text-stone-300">
                    {e.ate ? fmt(e.ate) : "Sem limite"}
                  </td>
                  <td className="py-3 text-right font-semibold text-brand">{pct(e.taxa)}</td>
                  <td className="py-3 text-right text-stone-500 text-xs hidden sm:table-cell">
                    {parcelasAbater[i] > 0 ? fmt(parcelasAbater[i]) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Fonte: Lei 73-A/2025 (OE 2026) — Art. 68.º CIRS (Portugal continental)
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O mito do "subir de escalão"
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Subir de escalão nunca é prejudicial.</span>{" "}
            A nova taxa aplica-se apenas à parte do rendimento que <em>excede</em> o limite anterior — não ao rendimento total.
          </p>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-4 py-3 text-xs text-stone-500">
            Exemplo: rendimento coletável de 25 000 €. Os primeiros 8 342 € pagam 12,5%, os seguintes até 12 587 € pagam 15,7%, e assim sucessivamente. Nunca recuas por ganhar mais.
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Taxa efetiva vs. taxa marginal
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Taxa marginal</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">A taxa do último euro ganho. É a taxa do escalão em que te encontras.</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Taxa efetiva</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">A percentagem real que pagas sobre o rendimento total. Sempre inferior à taxa marginal.</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Taxa adicional de solidariedade
        </h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">Rendimento coletável {">"} 80 000 €</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">+2,5% sobre o excedente</p>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">Rendimento coletável {">"} 250 000 €</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">+5% sobre o excedente</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Mínimo de existência
          <InfoTip label="Art. 70.º CIRS">Art. 70.º CIRS — rendimento protegido de IRS</InfoTip>
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Quem tem rendimento coletável igual ou inferior a{" "}
            <span className="font-semibold text-stone-800 dark:text-stone-100">{fmt(MINIMO_EXISTENCIA.value)}</span>{" "}
            pode não pagar IRS. Aplica-se a Categoria A e a profissões do Art. 151.º em Categoria B.
          </p>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
