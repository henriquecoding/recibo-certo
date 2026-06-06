import type { Metadata } from "next";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import { IAS_VALUE, DISPENSA_RETENCAO_LIMITE, RETENCAO } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Recibos verdes e emprego ao mesmo tempo 2026",
  description: "Guia completo para quem acumula trabalho dependente com recibos verdes. IRS, Segurança Social, retenção na fonte e caso do cliente único.",
  keywords: ["recibos verdes e emprego ao mesmo tempo", "acumular trabalho dependente recibos verdes", "IRS acumulação"],
  alternates: { canonical: "https://recibocerto.pt/guias/acumulacao-emprego" },
  openGraph: {
    title: "Recibos verdes e emprego ao mesmo tempo 2026 | ReciboCerto",
    description: "IRS, SS e retenção quando tens salário e passas recibos verdes.",
    url: "https://recibocerto.pt/guias/acumulacao-emprego",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "SimuladorNeto — Acumular trabalho dependente e recibos verdes 2026", url: "https://simuladorneto.pt/blog/acumular-trabalho-dependente-recibos-verdes-2026", tipo: "referencia" as const },
  { titulo: "Doutor Finanças — Acúmulo trabalho por conta de outrem e recibos verdes", url: "https://www.doutorfinancas.pt/impostos/irs/acumulo-trabalho-por-conta-de-outrem-e-recibos-verdes-como-preencher-o-irs/", tipo: "referencia" as const },
  { titulo: "CGD — Trabalhador dependente acumula recibos verdes", url: "https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/trabalhador-dependente-acumula-recibos-verdes.aspx", tipo: "referencia" as const },
  { titulo: "Numericas — Acumular trabalho dependente e independente", url: "https://numericas.pt/acumular-trabalho-dependente-e-recibos-verdes/", tipo: "referencia" as const },
];

const ias = IAS_VALUE;

export default function AcumulacaoEmpregoPage() {
  return (
    <>
      <GuiaHero
        titulo="Tens emprego e passas recibos verdes? Guia completo"
        descricao="Os dois rendimentos somam-se no IRS. A Segurança Social pode ficar isenta. Aqui está o que precisas de saber."
        tempoLeitura={4}
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          IRS — dois rendimentos, uma declaração
        </h2>
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Anexo A</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">Trabalho dependente — Categoria A (salário)</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Anexo B</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">Recibos verdes — Categoria B</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-4">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Os dois rendimentos somam-se para determinar o escalão. Isso pode significar pagar mais IRS marginal sobre os rendimentos dos recibos verdes do que se fossem a única fonte.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Segurança Social — quando pagas e quando não pagas
        </h2>
        <div className="space-y-3">
          <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="brand">Isento dos recibos</Badge>
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-300 mb-3">Se cumprires <em>todas</em> estas condições:</p>
            <ul className="space-y-1.5 text-sm text-stone-600 dark:text-stone-400">
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">✓</span> Cliente dos recibos <strong>diferente</strong> do empregador</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">✓</span> Média mensal dos recibos {"<"} 4 × IAS ({fmt(4 * ias)})
                <InfoTip label="Base legal isenção SS">Art. 152.º Código Contributivo</InfoTip>
              </li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">✓</span> Salário do emprego ≥ 1 × IAS ({fmt(ias)})</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="neutral">Paga SS pelos recibos</Badge>
            </div>
            <ul className="space-y-1.5 text-sm text-stone-600 dark:text-stone-400">
              <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">→</span> Cliente dos recibos é a mesma entidade que o empregador</li>
              <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">→</span> Média mensal dos recibos ≥ {fmt(4 * ias)}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Retenção na fonte com acumulação
        </h2>
        <div className="space-y-3 text-sm text-stone-600 dark:text-stone-400">
          <p>As regras de retenção são as normais: {pct(RETENCAO.art151.value)} para atividades do Art. 151.º, {pct(RETENCAO.outros.value)} para outros serviços com CAE.</p>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p>
              <span className="font-semibold text-stone-700 dark:text-stone-300">Dispensa de retenção:</span> podes dispensar se a estimativa anual de rendimentos dos recibos for inferior a {fmt(DISPENSA_RETENCAO_LIMITE.value)}.
              Mas atenção — a estimativa anual considera <em>ambas</em> as fontes de rendimento, o que pode afetar o escalão aplicável.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Caso especial: recibos verdes a um único cliente
        </h2>
        <div className="rounded-2xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 px-5 py-4">
          <p className="text-sm text-stone-700 dark:text-stone-300">
            Se mais de 80% da tua faturação de recibos verdes for para um único cliente, a AT pode questionar se é trabalho dependente disfarçado (Categoria A). Esta situação é sinalizada no Anexo SS da declaração de IRS e pode originar pedidos de esclarecimento.
          </p>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
