import type { Metadata } from "next";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { ComparadorCAE } from "@/components/guias/ComparadorCAE";
import InfoTip from "@/components/ui/InfoTip";
import { RETENCAO, DISPENSA_RETENCAO_LIMITE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Retenção na fonte recibos verdes 2026",
  description: "Quando aplicar retenção na fonte, quando dispensar e quais as taxas. Clientes particulares, empresas e estrangeiros.",
  keywords: ["retenção na fonte recibos verdes", "dispensa retenção", "art 101 CIRS"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/retencao-na-fonte" },
  openGraph: {
    title: "Retenção na fonte recibos verdes 2026 | ReciboCerto",
    description: "Quando aplicar e quando dispensar a retenção na fonte.",
    url: "https://www.recibocerto.pt/guias/retencao-na-fonte",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 101.º CIRS — Portal das Finanças", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs101.aspx", tipo: "oficial" as const },
  { titulo: "Art. 101.º-B CIRS — Portal das Finanças", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs101b.aspx", tipo: "oficial" as const },
  { titulo: "DECO — Retenção na fonte para recibos verdes", url: "https://www.deco.proteste.pt/dinheiro/impostos/dicas/retencao-fonte-recibos-verdes", tipo: "referencia" as const },
  { titulo: "Doutor Finanças — Dispensa de retenção (Art. 101.º-B)", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/trabalhadores-independentes/2-artigos-de-isencao-irs-para-recibos-verdes/", tipo: "referencia" as const },
  { titulo: "CRN Contabilidade — Retenção na fonte 2026", url: "https://crncontabilidade.pt/blog/retencao-na-fonte-nos-recibos-verdes-quando-aplicar-taxas-mais-comuns-e-como-evitar-pagar-a-mais-2026/", tipo: "referencia" as const },
];

const TAXAS = [
  { tipo: "Art. 151.º (médico, advogado, engenheiro, programador cód. 1332…)", taxa: RETENCAO.art151.value, base: RETENCAO.art151.legalBasis },
  { tipo: "Outros serviços com CAE", taxa: RETENCAO.outros.value, base: RETENCAO.outros.legalBasis },
  { tipo: "Direitos de autor", taxa: RETENCAO.diretosAutor.value, base: RETENCAO.diretosAutor.legalBasis },
  { tipo: "Vendas de bens / produtos", taxa: 0, base: "Art. 101.º CIRS" },
];

export default function RetencaoNaFontePage() {
  return (
    <>
      <GuiaHero
        titulo="Retenção na fonte: quando aplicar e quando dispensar"
        descricao="É o adiantamento de IRS que o cliente retém e entrega à AT. No fim do ano, esse valor desconta no imposto que deves."
        tempoLeitura={4}
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Taxas de retenção
          <InfoTip label="Base legal">Art. 101.º CIRS</InfoTip>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Tipo de atividade</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Taxa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {TAXAS.map((t) => (
                <tr key={t.tipo}>
                  <td className="py-3 text-stone-600 dark:text-stone-400 pr-4">{t.tipo}</td>
                  <td className="py-3 text-right">
                    {t.taxa > 0 ? (
                      <span className="font-semibold text-brand">{pct(t.taxa)}</span>
                    ) : (
                      <span className="text-stone-400">Sem retenção</span>
                    )}
                    {" "}<InfoTip label="Base legal">{t.base}</InfoTip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Quando NÃO há retenção
        </h2>
        <div className="space-y-3">
          <div className="flex gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <Badge tone="brand">1</Badge>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">Clientes particulares</span> — nunca têm obrigação de fazer retenção.
            </p>
          </div>
          <div className="flex gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <Badge tone="brand">2</Badge>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">Clientes estrangeiros</span> — não estão sujeitos à retenção de IRS português.
            </p>
          </div>
          <div className="flex gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <Badge tone="brand">3</Badge>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">Faturação estimada abaixo de {fmt(DISPENSA_RETENCAO_LIMITE.value)}/ano</span>{" "}
              — dispensa ao abrigo do Art. 101.º-B CIRS.
              <InfoTip label="Art. 101.º-B CIRS">{DISPENSA_RETENCAO_LIMITE.legalBasis}</InfoTip>
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Como aplicar a dispensa no Portal das Finanças
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-xs font-semibold text-stone-400 mb-2">Campo "Base de incidência em IRS"</p>
          <p className="font-mono text-xs bg-stone-50 dark:bg-stone-800 rounded-lg px-3 py-2 text-stone-700 dark:text-stone-300">
            Dispensa de retenção — Art. 101.º-B, n.º 1, al. a) e b), do CIRS
          </p>
          <p className="text-xs text-stone-400 mt-3">
            A dispensa cessa no mês seguinte ao de ultrapassagem dos {fmt(DISPENSA_RETENCAO_LIMITE.value)}.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Retenção sempre sobre o valor sem IVA
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-xs font-semibold text-stone-400 mb-3">Exemplo: recibo de 1 000 € + 230 € IVA</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-3">
              <p className="text-xs text-stone-400">Base (sem IVA)</p>
              <p className="font-semibold text-stone-800 dark:text-stone-100">{fmt(1000)}</p>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-3">
              <p className="text-xs text-stone-400">Retenção 23%</p>
              <p className="font-semibold text-brand">{fmt(230)}</p>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-3">
              <p className="text-xs text-stone-400">Recebido na conta</p>
              <p className="font-semibold text-stone-800 dark:text-stone-100">{fmt(1000)}</p>
              <p className="text-xs text-stone-400">(1 000 − 230 + 230 IVA)</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Acerto anual no IRS
        </h2>
        <div className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
          <p>O valor retido durante o ano é contabilizado no apuramento do IRS. Se retiveste mais do que o imposto calculado, recebes reembolso. Se retiveste menos, podes ter pagamentos por conta no ano seguinte.</p>
        </div>
      </section>

      <ComparadorCAE />
      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
