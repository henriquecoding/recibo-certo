import type { Metadata } from "next";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { CalculadoraRegimeSimplificado } from "@/components/guias/CalculadoraRegimeSimplificado";
import { ComparadorCAE } from "@/components/guias/ComparadorCAE";
import InfoTip from "@/components/ui/InfoTip";
import {
  COEFICIENTE_POR_TIPO,
  DEDUCAO_ESPECIFICA_CATB,
  REDUCAO_COEFICIENTE_ANO,
  REGIME_SIMPLIFICADO,
  RETENCAO,
} from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "Regime simplificado e coeficientes IRS 2026",
  description: "Percebe como funcionam os coeficientes do regime simplificado e quanto pagas realmente em IRS. Calculadora interativa com todos os coeficientes 2026.",
  keywords: ["regime simplificado IRS 2026", "coeficientes regime simplificado", "IRS recibos verdes"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/regime-simplificado" },
  openGraph: {
    title: "Regime simplificado e coeficientes IRS 2026 | ReciboCerto",
    description: "Como funcionam os coeficientes e quanto pagas realmente em IRS no regime simplificado.",
    url: "https://www.recibocerto.pt/guias/regime-simplificado",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 31.º CIRS — Portal das Finanças", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs31.aspx", tipo: "oficial" as const },
  { titulo: "OCC — Regime simplificado (coeficientes e regra dos 15%)", url: "https://www.occ.pt/pt-pt/noticias/irs-regime-simplificado-1", tipo: "referencia" as const },
  { titulo: "PwC Guia Fiscal 2026 — IRS regime simplificado", url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html", tipo: "referencia" as const },
  { titulo: "CRN Contabilidade — Regime simplificado 2026", url: "https://crncontabilidade.pt/blog/regime-simplificado-irs-2026/", tipo: "referencia" as const },
];

const COEFICIENTES = [
  { tipo: "Art. 151.º (médico, advogado, engenheiro…)", coef: COEFICIENTE_POR_TIPO.art151, retencao: RETENCAO.art151.value, base: "Art. 31.º, n.º 1, al. b) CIRS" },
  { tipo: "Outros serviços com CAE", coef: COEFICIENTE_POR_TIPO.outros, retencao: RETENCAO.outros.value, base: "Art. 31.º, n.º 1, al. c) CIRS" },
  { tipo: "Vendas de bens / hotelaria / restauração", coef: COEFICIENTE_POR_TIPO.vendas, retencao: 0, base: "Art. 31.º, n.º 1, al. a) CIRS" },
  { tipo: "Direitos de autor", coef: COEFICIENTE_POR_TIPO.diretosAutor, retencao: RETENCAO.diretosAutor.value, base: "Art. 31.º, n.º 1, al. d) CIRS" },
];

export default function RegimeSimplificadoPage() {
  return (
    <>
      <GuiaHero
        titulo="Regime simplificado e coeficientes: o que realmente pagas em IRS"
        descricao="Não pagas IRS sobre toda a tua faturação. O regime simplificado aplica um coeficiente que determina qual a parte tributável."
        tempoLeitura={6}
      />

      <section className="mb-6">
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5 mb-8">
          <p className="text-sm font-semibold text-brand-dark dark:text-brand mb-1">A fórmula essencial</p>
          <p className="text-stone-700 dark:text-stone-300 font-mono text-sm">
            Faturação × Coeficiente = Rendimento tributável
          </p>
          <p className="text-xs text-stone-500 mt-2">
            O IRS é calculado sobre o rendimento tributável, não sobre a faturação total.
          </p>
        </div>
        <CalculadoraRegimeSimplificado />
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Tabela de coeficientes
          <InfoTip label="Base legal dos coeficientes">Art. 31.º CIRS — aprovado pela Lei 73-A/2025 (OE 2026)</InfoTip>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Tipo</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Coef.</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">% Tributável</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Retenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {COEFICIENTES.map((c) => (
                <tr key={c.tipo}>
                  <td className="py-3 text-stone-600 dark:text-stone-400 pr-4">{c.tipo}</td>
                  <td className="py-3 text-right font-semibold text-brand">{pct(c.coef)}</td>
                  <td className="py-3 text-right text-stone-700 dark:text-stone-300">{pct(c.coef * 100 / 100)}</td>
                  <td className="py-3 text-right text-stone-700 dark:text-stone-300">
                    {c.retencao > 0 ? pct(c.retencao) : "Sem retenção"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          A regra dos 15% de despesas
        </h2>
        <div className="space-y-3 text-sm text-stone-600 dark:text-stone-400">
          <p>Para coeficientes 0,75 e 0,35, é obrigatório justificar 15% da faturação em despesas de atividade (e-fatura, rendas, pessoal, etc.).</p>
          <p>Exceção: se o rendimento bruto for igual ou inferior a {fmt(Math.floor(DEDUCAO_ESPECIFICA_CATB.value / 0.15))} €, é aplicada automaticamente uma dedução de {fmt(DEDUCAO_ESPECIFICA_CATB.value)} € — não precisas de justificar despesas nesse caso.</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Redução no início de atividade
          <InfoTip label="Base legal redução">{REDUCAO_COEFICIENTE_ANO.legalBasis}</InfoTip>
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">1.º ano de atividade</p>
            <p className="text-2xl font-display font-semibold text-stone-800 dark:text-stone-100">−50%</p>
            <p className="text-xs text-stone-400 mt-1">sobre o coeficiente base</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">2.º ano de atividade</p>
            <p className="text-2xl font-display font-semibold text-stone-800 dark:text-stone-100">−25%</p>
            <p className="text-xs text-stone-400 mt-1">sobre o coeficiente base</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          CAE vs Art. 151.º — o impacto real
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Exemplo: programador com 30 000 €/ano</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-1">Código Art. 151.º (1332)</p>
              <p className="text-sm text-stone-700 dark:text-stone-300">Coeficiente 0,75 → 22 500 € tributáveis</p>
              <p className="text-sm text-stone-700 dark:text-stone-300">Retenção 23%</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-1">CAE 62010</p>
              <p className="text-sm text-stone-700 dark:text-stone-300">Coeficiente 0,35 → 10 500 € tributáveis</p>
              <p className="text-sm text-stone-700 dark:text-stone-300">Retenção 11,5%</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-stone-50 dark:bg-stone-800 px-4 py-2.5">
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Diferença estimada: ~2 250 € de IRS por ano
            </p>
          </div>
        </div>
      </section>

      <ComparadorCAE />
      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
