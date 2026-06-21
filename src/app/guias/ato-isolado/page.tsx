import type { Metadata } from "next";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { DecisorAtoVsAtividade } from "@/components/guias/DecisorAtoVsAtividade";
import InfoTip from "@/components/ui/InfoTip";
import { IVA_ISENCAO_LIMITE, RETENCAO, DISPENSA_RETENCAO_LIMITE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Ato isolado ou recibos verdes: qual escolher? 2026",
  description: "Compara ato isolado e recibos verdes. Decisor interativo para a tua situação: IVA, Segurança Social, retenção na fonte e obrigações fiscais.",
  keywords: ["ato isolado portugal", "ato isolado vs recibos verdes", "ato isolado IVA"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/ato-isolado" },
  openGraph: {
    title: "Ato isolado ou recibos verdes: qual escolher? 2026 | ReciboCerto",
    description: "Decisor interativo para perceber se precisas de abrir atividade ou podes usar o ato isolado.",
    url: "https://www.recibocerto.pt/guias/ato-isolado",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Gov.pt — Ato isolado", url: "https://www.gov.pt/guias/trabalhar-por-conta-propria-guia-para-trabalhadores-independentes/", tipo: "oficial" as const },
  { titulo: "Art. 53.º CIVA — Portal das Finanças", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx", tipo: "oficial" as const },
  { titulo: "CGD — Ato isolado: o que é", url: "https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/ato-isolado-o-que-e-vantagens-e-obrigacoes.aspx", tipo: "referencia" as const },
  { titulo: "SimuladorNeto — Ato isolado 2026", url: "https://simuladorneto.pt/blog/ato-isolado-ou-abertura-de-atividade-2026", tipo: "referencia" as const },
];

const COMPARATIVO = [
  { label: "Abertura de atividade", atoIsolado: "Não necessária", recibosVerdes: "Obrigatória" },
  { label: "Segurança Social", atoIsolado: "Sem contribuições", recibosVerdes: "Obrigatória (exceto 1.º ano)" },
  { label: "IVA", atoIsolado: `${pct(0.23)} (sem isenção art. 53.º)`, recibosVerdes: `Isento se < ${fmt(IVA_ISENCAO_LIMITE.value)}/ano` },
  { label: "Retenção na fonte", atoIsolado: "Facultativa", recibosVerdes: "Normal (23% ou 11,5%)" },
  { label: "Quantas vezes/ano", atoIsolado: "Máximo 1", recibosVerdes: "Ilimitadas" },
];

export default function AtoIsoladoPage() {
  return (
    <>
      <GuiaHero
        titulo="Ato isolado ou recibos verdes: qual escolher?"
        descricao="Ato isolado é para um único serviço pontual e não repetido. Recibos verdes são para quem fatura regularmente."
        tempoLeitura={4}
      />

      <section className="mb-10">
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400 mb-6">
          Em 30 segundos: o ato isolado permite emitir uma fatura sem abrir atividade nas Finanças. A diferença principal está no IVA (sempre 23% no ato isolado) e na Segurança Social (sem obrigações no ato isolado).
        </p>
        <DecisorAtoVsAtividade />
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Comparação direta
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide w-40"></th>
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Ato isolado</th>
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Recibos verdes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {COMPARATIVO.map((row) => (
                <tr key={row.label}>
                  <td className="py-3 text-xs font-semibold text-stone-500 dark:text-stone-400">{row.label}</td>
                  <td className="py-3 text-stone-700 dark:text-stone-300">{row.atoIsolado}</td>
                  <td className="py-3 text-stone-700 dark:text-stone-300">{row.recibosVerdes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Como emitir um ato isolado
        </h2>
        <div className="space-y-3 text-sm text-stone-600 dark:text-stone-400">
          <p>Portal das Finanças → Cidadãos → Faturas e Recibos → Emitir. O sistema assume ato isolado automaticamente se não tiveres atividade aberta.</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          IVA no ato isolado
        </h2>
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">Regra geral: 23%.</span>{" "}
              O ato isolado não beneficia da isenção do Art. 53.º CIVA
              <InfoTip label="Isenção art. 53.º">{`A isenção de ${fmt(IVA_ISENCAO_LIMITE.value)} apenas se aplica a quem tem atividade aberta nas Finanças.`}</InfoTip>
              {" "}— essa isenção é só para quem tem atividade aberta.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge tone="brand">Exceção Art. 9.º</Badge>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Serviços de saúde, educação e outros do Art. 9.º CIVA → isentos de IVA (código M07). Esta isenção é independente do volume de faturação.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Pagar o IVA do ato isolado
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Emites o Guia P2 no Portal das Finanças e pagas até ao fim do mês seguinte ao da emissão.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Declarar no IRS
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          No ano seguinte, declaras o rendimento no Anexo B do Modelo 3 (período: 1 de abril a 30 de junho).
        </p>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
