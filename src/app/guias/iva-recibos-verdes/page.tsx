import type { Metadata } from "next";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import {
  IVA_ISENCAO_LIMITE,
  IVA_ISENCAO_EXCESSO,
  IVA_TAXAS,
} from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "IVA nos recibos verdes 2026: a isenção de 15 000 €",
  description: "Como funciona o IVA para trabalhadores independentes. Isenção do Art. 53.º, quando sair da isenção e as taxas por região.",
  keywords: ["IVA recibos verdes 2026", "isenção IVA artigo 53", "limite IVA trabalhador independente"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/iva-recibos-verdes" },
  openGraph: {
    title: "IVA nos recibos verdes 2026 | ReciboCerto",
    description: `A isenção de ${fmt(IVA_ISENCAO_LIMITE.value)} do Art. 53.º CIVA explicada.`,
    url: "https://www.recibocerto.pt/guias/iva-recibos-verdes",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 53.º CIVA — Portal das Finanças", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx", tipo: "oficial" as const },
  { titulo: "Art. 9.º CIVA — Portal das Finanças", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-9-do-civa.aspx", tipo: "oficial" as const },
  { titulo: "Art. 18.º CIVA — taxas", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-18-do-civa.aspx", tipo: "oficial" as const },
  { titulo: "OCC — Taxas de IVA em Portugal e Regiões Autónomas", url: "https://www.occ.pt/pt-pt/noticias/iva-taxas-em-portugal-continental-e-acores", tipo: "referencia" as const },
  { titulo: "SimuladorNeto — IVA recibos verdes art. 53.º 2026", url: "https://simuladorneto.pt/blog/iva-recibos-verdes-isencao-artigo-53-2026", tipo: "referencia" as const },
  { titulo: "InvoiceXpress — Alterações regime isenção IVA art. 53.º", url: "https://invoicexpress.com/blog/alteracoes-regime-isencao-iva-artigo-53/", tipo: "referencia" as const },
];

const cont = IVA_TAXAS.continente.value;
const mad = IVA_TAXAS.madeira.value;
const aço = IVA_TAXAS.acores.value;

export default function IvaRecibosVerdesPage() {
  return (
    <>
      <GuiaHero
        titulo="IVA nos recibos verdes: a isenção de 15 000 €"
        descricao="Se faturares menos de 15 000 € por ano, podes estar isento de cobrar IVA. Saber quando e como."
        tempoLeitura={5}
      />

      <section className="mb-10 space-y-4">
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Badge tone="brand">Cenário 1</Badge>
            <p className="font-semibold text-brand-dark dark:text-brand">
              Faturação {"<"} {fmt(IVA_ISENCAO_LIMITE.value)}/ano → Isento
              <InfoTip label="Art. 53.º CIVA">{IVA_ISENCAO_LIMITE.legalBasis}</InfoTip>
            </p>
          </div>
          <ul className="text-sm text-stone-700 dark:text-stone-300 space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">✓</span> Não cobras IVA nas faturas</li>
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">✓</span> Não entregas declarações periódicas de IVA</li>
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">✓</span> Menção obrigatória: "IVA — regime de isenção [Art.º 53.º do CIVA]" (código M10)</li>
            <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">✗</span> Não podes recuperar IVA das tuas compras profissionais</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Badge tone="neutral">Cenário 2</Badge>
            <p className="font-semibold text-stone-700 dark:text-stone-300">
              Faturação {">"} {fmt(IVA_ISENCAO_LIMITE.value)}/ano → Regime normal
            </p>
          </div>
          <ul className="text-sm text-stone-600 dark:text-stone-400 space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">✓</span> Cobras IVA: 23% (normal), 13% (intermédia) ou 6% (reduzida)</li>
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">✓</span> Declarações periódicas trimestrais: até ao dia 20 de fev/mai/ago/nov</li>
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">✓</span> Podes deduzir o IVA das despesas profissionais</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Badge tone="danger">Cenário 3 — URGENTE</Badge>
            <p className="font-semibold text-clay-text">
              Excedeste {fmt(IVA_ISENCAO_EXCESSO.value)} durante o ano
              <InfoTip label="Art. 53.º CIVA — limite de 125%">{IVA_ISENCAO_EXCESSO.legalBasis}</InfoTip>
            </p>
          </div>
          <ul className="text-sm text-stone-700 dark:text-stone-300 space-y-1.5">
            <li>Mudança <strong>imediata</strong> na fatura seguinte ao mês de excesso</li>
            <li>Prazo: declaração de alterações nas Finanças em 15 dias úteis</li>
            <li>Penalização por não comunicar: 300 € a 7 500 €</li>
          </ul>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Taxas de IVA por região
          <InfoTip label="Art. 18.º CIVA">{IVA_TAXAS.continente.legalBasis}</InfoTip>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Região</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Normal</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Intermédia</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Reduzida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {[
                { regiao: "Continente", taxa: cont },
                { regiao: "Madeira", taxa: mad },
                { regiao: "Açores", taxa: aço },
              ].map((r) => (
                <tr key={r.regiao}>
                  <td className="py-3 text-stone-600 dark:text-stone-400">{r.regiao}</td>
                  <td className="py-3 text-right font-semibold text-stone-800 dark:text-stone-100">{pct(r.taxa.normal)}</td>
                  <td className="py-3 text-right text-stone-700 dark:text-stone-300">{pct(r.taxa.intermedia)}</td>
                  <td className="py-3 text-right text-stone-700 dark:text-stone-300">{pct(r.taxa.reduzida)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Atividades isentas pelo Art. 9.º
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            Saúde (médicos, enfermeiros, psicólogos), educação e ensino estão isentos de IVA pelo Art. 9.º CIVA, independentemente do volume de faturação. Usam o código M07 na fatura.
          </p>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-2 text-xs text-stone-500">
            M07 (Art. 9.º) ≠ M10 (Art. 53.º) — são isenções distintas com fundamentos diferentes.
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Renúncia à isenção
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Podes voluntariamente renunciar à isenção e passar ao regime normal mediante declaração de alterações nas Finanças. Obrigatório permanecer no regime normal durante pelo menos 5 anos antes de poder regressar à isenção.
        </p>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
