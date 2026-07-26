import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { SimuladorIRSJovem } from "@/components/guias/SimuladorIRSJovem";
import InfoTip from "@/components/ui/InfoTip";
import { Check } from "@/components/ui/Icons";
import { IRS_JOVEM, IAS_VALUE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = metadataDoGuia("irs-jovem");

const ias = IAS_VALUE;
// Art. 12.º-B n.º 3 CIRS: o teto dos rendimentos excluídos é 55 × IAS em todos os anos.
const tetoIAS = IRS_JOVEM.tetoIAS.value; // 55

const ISENCOES = [
  { anos: "1.º ano", pct: 1.0, tetoIAS },
  { anos: "2.º a 4.º ano", pct: 0.75, tetoIAS },
  { anos: "5.º a 7.º ano", pct: 0.5, tetoIAS },
  { anos: "8.º a 10.º ano", pct: 0.25, tetoIAS },
];

export default function IRSJovemPage() {
  return (
    <GuiaLayout slug="irs-jovem">

      <section className="mb-6">
        <SimuladorIRSJovem />
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Isenções por ano de carreira
          <InfoTip label="Art. 12.º-B CIRS">{IRS_JOVEM.isencaoPorAno.legalBasis}</InfoTip>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Período</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Isenção</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Teto (IAS)</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Teto (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {ISENCOES.map((i) => (
                <tr key={i.anos}>
                  <td className="py-3 text-stone-700 dark:text-stone-300 font-medium">{i.anos}</td>
                  <td className="py-3 text-right font-semibold text-brand">{pct(i.pct)}</td>
                  <td className="py-3 text-right text-stone-500">{i.tetoIAS} × IAS</td>
                  <td className="py-3 text-right text-stone-700 dark:text-stone-300">{fmt(i.tetoIAS * ias)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Quem tem direito
        </h2>
        <div className="space-y-2">
          {[
            "Até 35 anos (inclusive) a 31 de dezembro do ano a que respeita o IRS",
            "Rendimentos de Categoria A (trabalho dependente) ou Categoria B (recibos verdes)",
            "Não ser dependente no agregado familiar de outra pessoa no IRS",
            "Sem dívidas à Autoridade Tributária",
            "Sem requisito de diploma académico (alteração introduzida em 2025)",
          ].map((crit) => (
            <div key={crit} className="flex items-start gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <Check size={14} className="mt-0.5 shrink-0 text-brand" />
              <p className="text-sm text-stone-600 dark:text-stone-400">{crit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Como contar os anos
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Contam-se os anos em que entregaste declaração de IRS fora do agregado familiar. Anos sem rendimentos de Cat. A ou B <strong>suspendem</strong> a contagem (não eliminam os anos já contados).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Incompatibilidades
        </h2>
        <div className="rounded-2xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 px-4 py-3 text-sm text-stone-700 dark:text-stone-300">
          <span className="font-semibold">IRS Jovem é incompatível com IFICI (ex-RNH 2.0).</span>{" "}
          Se tens o estatuto IFICI aprovado pela AT, não podes usar o IRS Jovem simultaneamente.
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Como pedir
        </h2>
        <div className="space-y-3 text-sm text-stone-600 dark:text-stone-400">
          <p>O benefício é aplicado automaticamente pela AT na declaração de IRS (Modelo 3) — não precisas de requerer separadamente.</p>
          <p>Para reduzir as retenções mensais ao longo do ano, podes comunicar o benefício ao teu cliente/empregador para que ajuste a retenção.</p>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-2 text-xs text-stone-500">
            Novidade 2026: o IRS Jovem é compatível com o IRS Automático.
          </div>
        </div>
      </section>

    </GuiaLayout>
  );
}
