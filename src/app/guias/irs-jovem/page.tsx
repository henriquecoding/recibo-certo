import type { Metadata } from "next";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { SimuladorIRSJovem } from "@/components/guias/SimuladorIRSJovem";
import InfoTip from "@/components/ui/InfoTip";
import { IRS_JOVEM, IAS_VALUE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "IRS Jovem 2026: isenção, anos e como pedir",
  description: "Tudo sobre o IRS Jovem em 2026. Percentagens de isenção por ano de carreira, quem tem direito e como pedir na declaração de IRS.",
  keywords: ["IRS jovem 2026", "isenção IRS jovem", "IRS jovem recibos verdes"],
  alternates: { canonical: "https://recibocerto.pt/guias/irs-jovem" },
  openGraph: {
    title: "IRS Jovem 2026: isenção, anos e como pedir | ReciboCerto",
    description: "Nos primeiros 10 anos de carreira, pagas menos IRS ou zero sobre parte do rendimento.",
    url: "https://recibocerto.pt/guias/irs-jovem",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 12.º-B CIRS — Portal das Finanças", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs12b.aspx", tipo: "oficial" as const },
  { titulo: "DECO — IRS Jovem: o que é e como funciona em 2026", url: "https://www.deco.proteste.pt/dinheiro/impostos/dicas/irs-jovem-como-funciona", tipo: "referencia" as const },
  { titulo: "Coverflex — IRS Jovem 2026", url: "https://www.coverflex.com/pt/blog/irs-jovem", tipo: "referencia" as const },
  { titulo: "Santander — IRS Jovem", url: "https://www.santander.pt/salto/irs-jovem", tipo: "referencia" as const },
  { titulo: "FedFinance — IRS Jovem 2026: regras e isenções", url: "https://www.fedfinance.pt/noticias-conselhos/irs-jovem-2026-regras-isencoes-e-como-pedir-o-seu-beneficio-fiscal", tipo: "referencia" as const },
];

const ias = IAS_VALUE;
const teto = IRS_JOVEM.tetoIAS.value * ias;

const ISENCOES = [
  { anos: "1.º ano", pct: 1.0, tetoIAS: 55 },
  { anos: "2.º a 4.º ano", pct: 0.75, tetoIAS: 41 },
  { anos: "5.º a 7.º ano", pct: 0.5, tetoIAS: 33 },
  { anos: "8.º a 10.º ano", pct: 0.25, tetoIAS: 20 },
];

export default function IRSJovemPage() {
  return (
    <>
      <GuiaHero
        titulo="IRS Jovem 2026: isenção, anos e como pedir"
        descricao="Nos primeiros 10 anos de carreira, pagas menos IRS (ou zero) sobre parte do rendimento. Aplica-se a trabalho dependente e recibos verdes."
        tempoLeitura={4}
        badge="Até 35 anos"
      />

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
              <span className="mt-0.5 text-brand flex-shrink-0 text-sm">✓</span>
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
          <span className="font-semibold">IRS Jovem é incompatível com IFICI (ex-NHR 2.0).</span>{" "}
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

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
