import type { Metadata } from "next";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import {
  DEDUCAO_SAUDE,
  DEDUCAO_EDUCACAO,
  DEDUCAO_DESP_GERAIS,
  DEDUCAO_RENDAS,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_BEBE,
  DEDUCAO_DEPENDENTE_3MAIS,
  LIMITE_GLOBAL_DEDUCOES,
} from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "Deduções à coleta do IRS 2026 | ReciboCerto",
  description: "Todas as deduções à coleta do IRS: saúde, educação, rendas, dependentes e limite global. Aplicável a independentes e conta de outrem.",
  keywords: ["deduções coleta IRS 2026", "deduções IRS", "saúde educação rendas IRS", "despesas gerais familiares"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/deducoes-coleta" },
  openGraph: {
    title: "Deduções à coleta do IRS 2026 | ReciboCerto",
    description: "Saúde, educação, rendas e dependentes — tudo o que podes deduzir no IRS.",
    url: "https://www.recibocerto.pt/guias/deducoes-coleta",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 78.º-A a 78.º-E CIRS — Portal das Finanças", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs87.aspx", tipo: "oficial" as const },
  { titulo: "Montepio — Deduções à coleta: quanto podes descontar", url: "https://www.montepio.org/ei/pessoal/impostos/deducoes-a-coleta-saiba-quanto-pode-descontar-no-irs/", tipo: "referencia" as const },
  { titulo: "PwC Guia Fiscal 2026 — IRS deduções", url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html", tipo: "referencia" as const },
];

const DEDUCOES = [
  {
    titulo: "Despesas de saúde",
    base: DEDUCAO_SAUDE.legalBasis,
    taxa: DEDUCAO_SAUDE.value.taxa,
    limite: DEDUCAO_SAUDE.value.limite,
    nota: "Incluem consultas, medicamentos, óculos, ortopedia e outros com fatura e NIF.",
  },
  {
    titulo: "Educação e formação",
    base: DEDUCAO_EDUCACAO.legalBasis,
    taxa: DEDUCAO_EDUCACAO.value.taxa,
    limite: DEDUCAO_EDUCACAO.value.limite,
    nota: "Mensalidades, propinas, material escolar — do sujeito passivo ou dos dependentes.",
  },
  {
    titulo: "Despesas gerais familiares",
    base: DEDUCAO_DESP_GERAIS.legalBasis,
    taxa: DEDUCAO_DESP_GERAIS.value.taxa,
    limite: DEDUCAO_DESP_GERAIS.value.limite,
    nota: "Qualquer despesa com NIF (supermercado, restaurantes, serviços domésticos, etc.).",
  },
  {
    titulo: "Rendas de habitação permanente",
    base: DEDUCAO_RENDAS.legalBasis,
    taxa: DEDUCAO_RENDAS.value.taxa,
    limite: DEDUCAO_RENDAS.value.limite,
    nota: "Apenas para arrendamento de habitação permanente. Não se aplica em simultâneo com dedução de juros de crédito habitação.",
  },
];

export default function DeducoesColetaPage() {
  return (
    <>
      <GuiaHero
        titulo="Deduções à coleta do IRS 2026"
        descricao="As deduções à coleta reduzem diretamente o imposto a pagar — não o rendimento tributável. Cada euro de dedução poupa um euro de IRS."
        tempoLeitura={5}
      />

      <section className="mb-10">
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5 mb-6">
          <p className="text-sm font-semibold text-brand-dark dark:text-brand mb-1">Como funcionam</p>
          <p className="text-sm text-stone-700 dark:text-stone-300">
            As deduções à coleta subtraem-se ao imposto calculado. Diferente das deduções ao rendimento (como o coeficiente), que reduzem a base sobre a qual o imposto é calculado.
          </p>
        </div>

        <div className="space-y-4">
          {DEDUCOES.map((d) => (
            <div key={d.titulo} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">{d.titulo}</h3>
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-lg font-semibold text-brand">{pct(d.taxa)}</p>
                  <p className="text-xs text-stone-400">máx {fmt(d.limite)}</p>
                </div>
              </div>
              <p className="text-xs text-stone-500 mb-1">{d.nota}</p>
              <p className="text-xs text-stone-400">
                <InfoTip label="Base legal">{d.base}</InfoTip>{" "}
                {d.base}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Deduções por dependentes
          <InfoTip label="Art. 78.º-A CIRS">{DEDUCAO_DEPENDENTE.legalBasis}</InfoTip>
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Por dependente {">"} 3 anos</p>
            <p className="font-display text-xl font-semibold text-brand">{fmt(DEDUCAO_DEPENDENTE.value)}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Por dependente até 3 anos</p>
            <p className="font-display text-xl font-semibold text-brand">{fmt(DEDUCAO_DEPENDENTE_BEBE.value)}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">3.º dependente e seguintes</p>
            <p className="font-display text-xl font-semibold text-brand">{fmt(DEDUCAO_DEPENDENTE_3MAIS.value)}</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Limite global das deduções
          <InfoTip label="Art. 78.º, n.º 7 CIRS">{LIMITE_GLOBAL_DEDUCOES.legalBasis}</InfoTip>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Rendimento coletável</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Limite global</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              <tr>
                <td className="py-3 text-stone-600 dark:text-stone-400">
                  Até {fmt(LIMITE_GLOBAL_DEDUCOES.value.semLimiteAte)}
                </td>
                <td className="py-3 text-right font-semibold text-brand">Sem limite</td>
              </tr>
              <tr>
                <td className="py-3 text-stone-600 dark:text-stone-400">
                  Entre {fmt(LIMITE_GLOBAL_DEDUCOES.value.semLimiteAte)} e {fmt(LIMITE_GLOBAL_DEDUCOES.value.escalaoSuperior)}
                </td>
                <td className="py-3 text-right text-stone-700 dark:text-stone-300">
                  Entre {fmt(LIMITE_GLOBAL_DEDUCOES.value.limiteBaixo)} e {fmt(LIMITE_GLOBAL_DEDUCOES.value.limiteAlto)} (interpolado)
                </td>
              </tr>
              <tr>
                <td className="py-3 text-stone-600 dark:text-stone-400">
                  Acima de {fmt(LIMITE_GLOBAL_DEDUCOES.value.escalaoSuperior)}
                </td>
                <td className="py-3 text-right font-semibold text-stone-800 dark:text-stone-100">
                  {fmt(LIMITE_GLOBAL_DEDUCOES.value.limiteBaixo)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Como maximizar as deduções
        </h2>
        <div className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
          <p>Pede sempre fatura com NIF nas despesas elegíveis — saúde, educação, restaurantes, supermercados. As despesas são comunicadas automaticamente à AT pelos emitentes, mas verificar o teu e-fatura antes de entregar o IRS é essencial para garantir que está tudo registado.</p>
          <p>Para rendimentos abaixo de {fmt(LIMITE_GLOBAL_DEDUCOES.value.semLimiteAte)}, não existe limite global — podes deduzir o máximo de cada categoria sem preocupações com o teto.</p>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
