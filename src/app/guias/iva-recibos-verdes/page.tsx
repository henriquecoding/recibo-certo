import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import InfoTip from "@/components/ui/InfoTip";
import { Check, Close } from "@/components/ui/Icons";
import {
  IVA_ISENCAO_LIMITE,
  IVA_ISENCAO_EXCESSO,
  IVA_TAXAS,
} from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = metadataDoGuia("iva-recibos-verdes");

const cont = IVA_TAXAS.continente.value;
const mad = IVA_TAXAS.madeira.value;
const aço = IVA_TAXAS.acores.value;

export default function IvaRecibosVerdesPage() {
  return (
    <GuiaLayout slug="iva-recibos-verdes">

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
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Não cobras IVA nas faturas</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Não entregas declarações periódicas de IVA</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Menção obrigatória: "IVA — regime de isenção [Art.º 53.º do CIVA]" (código M10)</li>
            <li className="flex items-start gap-2"><Close size={14} className="mt-0.5 shrink-0 text-stone-400" /> Não podes recuperar IVA das tuas compras profissionais</li>
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
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Cobras IVA: 23% (normal), 13% (intermédia) ou 6% (reduzida)</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Declarações periódicas trimestrais: até ao dia 20 de fev/mai/ago/nov</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Podes deduzir o IVA das despesas profissionais</li>
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

    </GuiaLayout>
  );
}
