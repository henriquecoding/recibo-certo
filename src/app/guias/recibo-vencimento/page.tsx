import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import {
  SS_DEPENDENTE,
  SUBSIDIO_REFEICAO,
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  RETENCAO_DEP_ISENCAO,
} from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Como ler o recibo de vencimento 2026 | ReciboCerto",
  description: "Guia completo para perceber o teu recibo de vencimento: salário bruto, descontos de IRS e Segurança Social, subsídio de refeição e líquido a receber.",
  keywords: ["recibo de vencimento", "perceber recibo de vencimento", "descontos salário 2026", "IRS trabalho dependente"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/recibo-vencimento" },
  openGraph: {
    title: "Como ler o recibo de vencimento 2026 | ReciboCerto",
    description: "Percebe cada linha do teu recibo: bruto, SS, IRS e líquido.",
    url: "https://www.recibocerto.pt/guias/recibo-vencimento",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Despacho n.º 233-A/2026 — Tabelas de retenção na fonte IRS 2026", url: "https://www.montepio.org/ei/pessoal/impostos/tabelas-do-irs-conheca-as-taxas-de-retencao-na-fonte/", tipo: "oficial" as const },
  { titulo: "Art. 25.º CIRS — Dedução específica do trabalho dependente", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs25.aspx", tipo: "oficial" as const },
  { titulo: "Seg. Social — Taxas contributivas dos trabalhadores por conta de outrem", url: "https://www.seg-social.pt/trabalhadores-por-conta-de-outrem", tipo: "oficial" as const },
  { titulo: "Doutor Finanças — Recibo de vencimento: como ler e perceber", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/rendimentos/recibo-de-vencimento-como-ler-e-perceber/", tipo: "referencia" as const },
  { titulo: "Coverflex — Subsídio de refeição 2026", url: "https://www.coverflex.com/pt/blog/subsidio-de-refeicao-2026", tipo: "referencia" as const },
];

const LINHAS = [
  {
    titulo: "Salário base (bruto)",
    desc: "A remuneração acordada no contrato de trabalho, antes de qualquer desconto. Serve de base para calcular o IRS e a Segurança Social.",
    cor: "brand",
  },
  {
    titulo: "Segurança Social (11%)",
    desc: `Contribuição obrigatória do trabalhador: ${pct(SS_DEPENDENTE.trabalhador.value)} sobre o salário bruto. A entidade empregadora paga adicionalmente ${pct(SS_DEPENDENTE.entidade.value)} (não aparece no teu recibo).`,
    cor: "stone",
  },
  {
    titulo: "Retenção na fonte de IRS",
    desc: "Adiantamento mensal de IRS calculado a partir das tabelas oficiais. Depende do salário, estado civil e número de dependentes. Acertado na declaração anual.",
    cor: "stone",
  },
  {
    titulo: "Subsídio de refeição",
    desc: `Isento até ${fmt(SUBSIDIO_REFEICAO.dinheiro.value)}/dia em dinheiro ou ${fmt(SUBSIDIO_REFEICAO.cartao.value)}/dia em cartão refeição. O excedente é tributado em IRS e SS.`,
    cor: "brand",
  },
  {
    titulo: "Salário líquido",
    desc: "O valor que recebes na conta: bruto menos SS menos IRS, mais subsídio de refeição e eventuais outros abonos isentos.",
    cor: "brand",
  },
];

export default function ReciboVencimentoPage() {
  return (
    <>
      <GuiaHero
        eyebrow="Guia · Conta de outrem"
        titulo="Como ler o teu recibo de vencimento"
        descricao="Cada linha do recibo tem um significado. Percebe de onde vem cada desconto e quanto realmente é teu."
        tempoLeitura={5}
      />

      <section className="mb-10">
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5 mb-6">
          <p className="text-sm font-semibold text-brand-dark dark:text-brand mb-2">A fórmula do vencimento líquido</p>
          <p className="font-mono text-sm text-stone-700 dark:text-stone-300">
            Bruto - SS ({pct(SS_DEPENDENTE.trabalhador.value)}) - IRS (tabela) + Sub. refeição = Líquido
          </p>
          <p className="text-xs text-stone-500 mt-2">
            A Segurança Social incide sobre o bruto. O IRS incide sobre o bruto menos a SS.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Linha a linha do recibo
        </h2>
        <div className="space-y-3">
          {LINHAS.map((l) => (
            <div key={l.titulo} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
              <p className={`text-xs font-semibold mb-1 ${l.cor === "brand" ? "text-brand" : "text-stone-400"}`}>{l.titulo}</p>
              <p className="text-sm text-stone-600 dark:text-stone-400">{l.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Segurança Social: quem paga o quê
          <InfoTip label="Taxas SS">{SS_DEPENDENTE.trabalhador.legalBasis}</InfoTip>
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Tu (trabalhador)</p>
            <p className="font-display text-xl font-semibold text-brand">{pct(SS_DEPENDENTE.trabalhador.value)}</p>
            <p className="text-xs text-stone-500 mt-1">Descontado no recibo</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Entidade empregadora</p>
            <p className="font-display text-xl font-semibold text-stone-700 dark:text-stone-300">{pct(SS_DEPENDENTE.entidade.value)}</p>
            <p className="text-xs text-stone-500 mt-1">Custo adicional da empresa</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Taxa Social Unica (TSU) total: {pct(SS_DEPENDENTE.trabalhador.value + SS_DEPENDENTE.entidade.value)}. IPSS: {pct(SS_DEPENDENTE.ipss.value)} (entidade).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Retenção na fonte de IRS
        </h2>
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
              A retenção mensal é um adiantamento do imposto anual. As tabelas oficiais (Despacho 233-A/2026) definem a taxa consoante o:
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Remuneração bruta", desc: "Escalão da tabela de retenção" },
                { label: "Estado civil", desc: "Não casado, casado 1 ou 2 titulares" },
                { label: "N.º de dependentes", desc: "Parcela adicional a abater" },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-stone-50 dark:bg-stone-800 p-3">
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{f.label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-brand-light/40 dark:bg-brand/5 px-4 py-3">
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Remunerações até <span className="font-semibold">{fmt(RETENCAO_DEP_ISENCAO.value)}</span> (SMN 2026) estão isentas de retenção na fonte.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Subsídio de refeição: limites de isenção 2026
          <InfoTip label="Art. 2.º CIRS">{SUBSIDIO_REFEICAO.dinheiro.legalBasis}</InfoTip>
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Em dinheiro</p>
            <p className="font-display text-xl font-semibold text-brand">{fmt(SUBSIDIO_REFEICAO.dinheiro.value)}/dia</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Em cartão/vale refeição</p>
            <p className="font-display text-xl font-semibold text-brand">{fmt(SUBSIDIO_REFEICAO.cartao.value)}/dia</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Valores acima destes limites são tributados em IRS e sujeitos a contribuições para a Segurança Social.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Dedução específica no IRS anual
          <InfoTip label="Art. 25.º CIRS">{DEDUCAO_ESPECIFICA_DEPENDENTE.legalBasis}</InfoTip>
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Na declaração anual de IRS, o rendimento bruto da Categoria A é reduzido pela dedução específica de{" "}
            <span className="font-semibold text-stone-800 dark:text-stone-100">{fmt(DEDUCAO_ESPECIFICA_DEPENDENTE.value)}</span>{" "}
            (ou o total das contribuições para a SS, se superior). Só o rendimento acima deste valor é tributado.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/subsidios-ferias-natal" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Subsídios de férias e Natal <ArrowRight size={13} />
          </Link>
          <Link href="/ferramentas/recibo-vencimento" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Simular recibo de vencimento <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
