import type { Metadata } from "next";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { CalculadoraSSTrimestral } from "@/components/guias/CalculadoraSSTrimestral";
import InfoTip from "@/components/ui/InfoTip";
import { SS_TAXA, SS_COEFICIENTE, SS_BASE_MAX_MENSAL, SS_MIN_MENSAL, IAS_VALUE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "Segurança Social trabalhador independente 2026",
  description: "Como calcular as contribuições SS para recibos verdes. Fórmula, prazos, isenção do 1.º ano e direitos sociais.",
  keywords: ["segurança social trabalhador independente", "SS recibos verdes 2026", "contribuições segurança social freelancer"],
  alternates: { canonical: "https://recibocerto.pt/guias/seguranca-social" },
  openGraph: {
    title: "Segurança Social trabalhador independente 2026 | ReciboCerto",
    description: "Fórmula, prazos e isenção do 1.º ano explicados.",
    url: "https://recibocerto.pt/guias/seguranca-social",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Segurança Social — Trabalhadores independentes", url: "https://www.seg-social.pt/trabalhadores-independentes", tipo: "oficial" as const },
  { titulo: "Segurança Social Direta (declaração trimestral)", url: "https://app.seg-social.pt", tipo: "oficial" as const },
  { titulo: "PwC Guia Fiscal 2026 — Segurança Social", url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/seguranca-social.html", tipo: "referencia" as const },
  { titulo: "Montepio — Trabalhador independente: obrigações SS", url: "https://www.montepio.org/ei/mais-recentes/trabalhador-independente-obrigacoes-para-com-a-seguranca-social/", tipo: "referencia" as const },
  { titulo: "SimuladorNeto — SS trabalhadores independentes 2026", url: "https://simuladorneto.pt/seguranca-social-trabalhadores-independentes", tipo: "referencia" as const },
  { titulo: "CRN — SS para trabalhadores independentes 2026", url: "https://crncontabilidade.pt/blog/seguranca-social-para-trabalhadores-independentes-em-2026-quanto-pagar-e-como-calcular/", tipo: "referencia" as const },
  { titulo: "DECO — Recibos verdes: obrigações SS", url: "https://www.deco.proteste.pt/dinheiro/impostos/noticias/recibos-verdes-obrigacoes-trabalhadores-independentes-seguranca-social", tipo: "referencia" as const },
];

const iasVal = IAS_VALUE;

export default function SegurancaSocialPage() {
  return (
    <>
      <GuiaHero
        titulo="Segurança Social para recibos verdes: tudo o que precisas saber"
        descricao="A fórmula, os prazos, a isenção do 1.º ano e os teus direitos sociais enquanto trabalhador independente."
        tempoLeitura={5}
      />

      <section className="mb-6">
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5 mb-4">
          <p className="text-sm font-semibold text-brand-dark dark:text-brand mb-2">A fórmula</p>
          <p className="font-mono text-sm text-stone-700 dark:text-stone-300">
            (Faturação trimestre ÷ 3) × {pct(SS_COEFICIENTE.servicos.value)}
            <InfoTip label="Coeficiente SS">{SS_COEFICIENTE.servicos.legalBasis}</InfoTip>
            {" "}× {pct(SS_TAXA.value)}
            <InfoTip label="Taxa SS">{SS_TAXA.legalBasis}</InfoTip>
            {" "}= Contribuição mensal
          </p>
          <p className="text-xs text-stone-500 mt-2">
            Para vendas/hotelaria/restauração: {pct(SS_COEFICIENTE.bens.value)} em vez de {pct(SS_COEFICIENTE.servicos.value)}.
          </p>
        </div>
        <CalculadoraSSTrimestral />
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Isenção do 1.º ano
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            12 meses sem pagar SS, a contar da data de abertura de atividade nas Finanças.
          </p>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-2.5 text-xs text-stone-500">
            Atenção: sem contribuições = sem direito a prestações sociais nesse período (doença, parentalidade, desemprego).
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-3">
            No 13.º mês, as contribuições começam automaticamente com base na faturação do trimestre anterior.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Isenção por acumulação com emprego
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Estás isento de pagar SS pelos recibos verdes se:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-400">
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5 flex-shrink-0">✓</span> As entidades são diferentes (cliente ≠ empregador)</li>
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5 flex-shrink-0">✓</span> Média mensal dos recibos {"<"} 4 × IAS ({fmt(4 * iasVal)})</li>
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5 flex-shrink-0">✓</span> Rendimento do emprego ≥ 1 × IAS ({fmt(iasVal)})</li>
          </ul>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Declaração trimestral — datas
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { prazo: "31 de janeiro", descricao: "4.º trimestre do ano anterior" },
            { prazo: "30 de abril", descricao: "1.º trimestre" },
            { prazo: "31 de julho", descricao: "2.º trimestre" },
            { prazo: "31 de outubro", descricao: "3.º trimestre" },
          ].map((d) => (
            <div key={d.prazo} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
              <p className="text-sm font-semibold text-brand">{d.prazo}</p>
              <p className="text-xs text-stone-500 mt-0.5">{d.descricao}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 px-4 py-3 text-sm text-stone-700 dark:text-stone-300">
          Mesmo com rendimentos zero: a declaração é obrigatória. Coima por incumprimento: 50–250 €.
        </div>
        <p className="mt-3 text-sm text-stone-500">
          Plataforma: <a href="https://app.seg-social.pt" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">app.seg-social.pt</a>
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Pagamento mensal
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Prazo</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Dias 10–20 do mês</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Mínimo mensal</p>
            <p className="text-sm font-semibold text-brand">{fmt(SS_MIN_MENSAL.value)}</p>
            <p className="text-xs text-stone-400">{SS_MIN_MENSAL.legalBasis}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Máximo mensal</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{fmt(SS_BASE_MAX_MENSAL.value * SS_TAXA.value)}</p>
            <p className="text-xs text-stone-400">teto: {fmt(SS_BASE_MAX_MENSAL.value)}</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Direitos sociais
        </h2>
        <div className="space-y-2">
          {[
            { prazo: "≥ 6 meses contribuindo", direito: "Subsídio de doença" },
            { prazo: "≥ 12 meses", direito: "Proteção na parentalidade" },
            { prazo: "≥ 24 meses", direito: "Subsídio por cessação de atividade" },
          ].map((d) => (
            <div key={d.direito} className="flex items-center justify-between rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{d.direito}</p>
              <p className="text-xs text-stone-400">{d.prazo}</p>
            </div>
          ))}
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
