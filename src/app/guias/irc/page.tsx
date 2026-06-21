import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import {
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  DERRAMA_MAX,
  DIVIDENDOS_TAXA,
} from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "IRC para PME em 2026: taxas, obrigações e prazos | ReciboCerto",
  description: "Guia completo de IRC 2026 para PME: taxa reduzida de 15%, taxa geral de 19%, derrama municipal, pagamentos por conta e obrigações declarativas.",
  keywords: ["IRC 2026", "taxa IRC PME", "imposto sobre rendimento coletivo", "Modelo 22 IRC"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/irc" },
  openGraph: {
    title: "IRC para PME em 2026 | ReciboCerto",
    description: "Taxas, derrama, pagamentos por conta e obrigações declarativas do IRC.",
    url: "https://www.recibocerto.pt/guias/irc",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 87.º CIRC — Taxas de IRC", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/irc87.aspx", tipo: "oficial" as const },
  { titulo: "Art. 104.º CIRC — Pagamentos por conta", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/irc104.aspx", tipo: "oficial" as const },
  { titulo: "Art. 120.º CIRC — Declaração periódica de rendimentos (Modelo 22)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/irc120.aspx", tipo: "oficial" as const },
  { titulo: "Lei 73-A/2025 — Orçamento do Estado 2026 (alterações IRC)", url: "https://diariodarepublica.pt/dr/detalhe/lei/73-a-2025", tipo: "oficial" as const },
  { titulo: "OCC — IRC 2026: taxas, prazos e obrigações", url: "https://www.occ.pt/pt-pt/noticias/irc-2026", tipo: "referencia" as const },
];

export default function IRCPage() {
  return (
    <>
      <GuiaHero
        eyebrow="Guia · Empresas"
        titulo="IRC para PME: taxas e obrigações em 2026"
        descricao="O Imposto sobre o Rendimento das Pessoas Coletivas incide sobre o lucro tributável das empresas. Percebe as taxas, a derrama, os pagamentos por conta e os prazos."
        tempoLeitura={7}
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Taxas de IRC em 2026
          <InfoTip label="Art. 87.º CIRC">{IRC_TAXA_PME.legalBasis}</InfoTip>
        </h2>
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5 mb-4">
          <p className="text-sm font-semibold text-brand-dark dark:text-brand mb-2">OE 2026</p>
          <p className="text-sm text-stone-700 dark:text-stone-300">
            O Orçamento do Estado 2026 reduziu a taxa geral de IRC de 20% para {pct(IRC_TAXA_GERAL.value)} e a taxa PME de 16% para {pct(IRC_TAXA_PME.value)}.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Taxa PME</p>
            <p className="font-display text-xl font-semibold text-brand">
              {pct(IRC_TAXA_PME.value)}
            </p>
            <p className="text-xs text-stone-500 mt-1">Primeiros {fmt(IRC_LIMITE_PME.value)} de matéria coletável</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Taxa geral</p>
            <p className="font-display text-xl font-semibold text-stone-700 dark:text-stone-300">
              {pct(IRC_TAXA_GERAL.value)}
            </p>
            <p className="text-xs text-stone-500 mt-1">Excedente acima de {fmt(IRC_LIMITE_PME.value)}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Derrama municipal</p>
            <p className="font-display text-xl font-semibold text-stone-700 dark:text-stone-300">
              até {pct(DERRAMA_MAX.value)}
              <InfoTip label="Derrama">{DERRAMA_MAX.legalBasis}</InfoTip>
            </p>
            <p className="text-xs text-stone-500 mt-1">Definida pelo município da sede</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Quem beneficia da taxa PME
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            A taxa reduzida de {pct(IRC_TAXA_PME.value)} aplica-se a entidades que cumpram cumulativamente:
          </p>
          <div className="space-y-2">
            {[
              "Volume de negócios ≤ 50 milhões de euros",
              "Menos de 250 trabalhadores",
              "Não ser considerada grande empresa por vínculos de participação",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand flex-shrink-0" />
                <p className="text-sm text-stone-600 dark:text-stone-400">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-400">
            Definição de PME conforme Recomendação da Comissão Europeia 2003/361/CE.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Exemplo prático: lucro de 80 000 €
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600 dark:text-stone-400">Primeiros {fmt(IRC_LIMITE_PME.value)} × {pct(IRC_TAXA_PME.value)}</span>
              <span className="font-semibold text-stone-800 dark:text-stone-100">{fmt(IRC_LIMITE_PME.value * IRC_TAXA_PME.value)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600 dark:text-stone-400">Restantes {fmt(30000)} × {pct(IRC_TAXA_GERAL.value)}</span>
              <span className="font-semibold text-stone-800 dark:text-stone-100">{fmt(30000 * IRC_TAXA_GERAL.value)}</span>
            </div>
            <div className="border-t border-stone-100 dark:border-stone-800 pt-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-stone-800 dark:text-stone-100">Total de IRC</span>
              <span className="font-display text-lg font-semibold text-brand">{fmt(IRC_LIMITE_PME.value * IRC_TAXA_PME.value + 30000 * IRC_TAXA_GERAL.value)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500">Taxa efetiva sobre 80 000 €</span>
              <span className="text-stone-500">{pct((IRC_LIMITE_PME.value * IRC_TAXA_PME.value + 30000 * IRC_TAXA_GERAL.value) / 80000)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-stone-400">
            Acresce derrama municipal (até {pct(DERRAMA_MAX.value)}) e eventuais tributações autónomas.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Dividendos: tributação ao sócio
          <InfoTip label="Art. 71.º CIRS">{DIVIDENDOS_TAXA.legalBasis}</InfoTip>
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            Os lucros distribuídos como dividendos são tributados em IRS a taxa liberatória de{" "}
            <span className="font-semibold text-stone-800 dark:text-stone-100">{pct(DIVIDENDOS_TAXA.value)}</span>,
            retida pela empresa no momento do pagamento.
          </p>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-4 py-3">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 mb-1">Englobamento opcional</p>
            <p className="text-xs text-stone-500">
              O sócio pode optar por englobar os dividendos (50% do valor é tributado à taxa marginal de IRS). Compensa quando a taxa marginal efetiva sobre 50% dos dividendos é inferior a {pct(DIVIDENDOS_TAXA.value)}.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Pagamentos por conta
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            As empresas fazem adiantamentos de IRC ao longo do ano, calculados com base no imposto do exercício anterior.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            {[
              { mes: "Julho", parcela: "1.ª prestação" },
              { mes: "Setembro", parcela: "2.ª prestação" },
              { mes: "Dezembro", parcela: "3.ª prestação" },
            ].map((p) => (
              <div key={p.mes} className="rounded-xl bg-stone-50 dark:bg-stone-800 p-3 text-center">
                <p className="text-xs font-semibold text-brand">{p.mes}</p>
                <p className="text-xs text-stone-500 mt-0.5">{p.parcela}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
            <p><span className="font-semibold text-stone-700 dark:text-stone-200">Volume de negócios ≤ 500 000 €:</span> 80% do IRC do ano anterior, em 3 prestações iguais.</p>
            <p><span className="font-semibold text-stone-700 dark:text-stone-200">Volume de negócios &gt; 500 000 €:</span> 95% do IRC do ano anterior, em 3 prestações iguais.</p>
          </div>
          <p className="mt-3 text-xs text-stone-400">Art. 104.º e 105.º do CIRC.</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Obrigações declarativas
        </h2>
        <div className="space-y-2">
          {[
            { obrigacao: "Modelo 22 (declaração de IRC)", prazo: "Até 31 de maio do ano seguinte", detalhe: "Declaração anual de rendimentos e cálculo do imposto." },
            { obrigacao: "IES (Informação Empresarial Simplificada)", prazo: "Até 15 de julho do ano seguinte", detalhe: "Informação contabilística, fiscal e estatística." },
            { obrigacao: "Declaração periódica de IVA", prazo: "Mensal (até dia 10) ou trimestral (até dia 20)", detalhe: "Apuramento e entrega do IVA ao Estado." },
            { obrigacao: "SAF-T de faturação", prazo: "Mensal, até ao dia 5 do mês seguinte", detalhe: "Ficheiro eletrónico de toda a faturação emitida." },
            { obrigacao: "Pagamentos por conta de IRC", prazo: "Julho, setembro e dezembro", detalhe: "Adiantamentos baseados no IRC do exercício anterior." },
          ].map((o) => (
            <div key={o.obrigacao} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <div className="flex items-center justify-between gap-4 mb-1">
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{o.obrigacao}</p>
                <p className="text-xs text-brand font-semibold text-right flex-shrink-0">{o.prazo}</p>
              </div>
              <p className="text-xs text-stone-400">{o.detalhe}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Derrama municipal
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            A derrama é um imposto municipal que incide sobre o lucro tributável sujeito a IRC.
            A taxa máxima legal é de {pct(DERRAMA_MAX.value)}, mas cada município define a sua taxa (muitos aplicam entre 1% e 1,5%).
          </p>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-4 py-3">
            <p className="text-xs text-stone-500">
              Algumas câmaras municipais isentam total ou parcialmente as empresas nos primeiros anos de atividade. Verifica a deliberação do município da sede da tua empresa.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/tributacao-autonoma" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Tributação autónoma <ArrowRight size={13} />
          </Link>
          <Link href="/guias/abrir-empresa" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Como abrir uma empresa <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
