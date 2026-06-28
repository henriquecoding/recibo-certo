import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import { pct } from "@/lib/format";
import { IFICI_TAXA, IFICI_PRAZO_ANOS } from "@/lib/fiscal-data";
import { ArrowRight, Check } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "IFICI (NHR 2.0) 2026 — taxa de IRS de 20%",
  description:
    "O IFICI, sucessor do Residente Não Habitual, aplica uma taxa de IRS de 20% a rendimentos elegíveis. Condições, duração e quem pode beneficiar — Portugal 2026.",
  keywords: ["IFICI", "NHR 2.0", "residente não habitual", "taxa 20% IRS", "Art. 58.º-A EBF"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/ifici-nhr" },
  openGraph: {
    title: "IFICI (NHR 2.0): taxa de IRS de 20% | ReciboCerto",
    description: "O incentivo fiscal à investigação e inovação que substituiu o NHR — condições e duração.",
    url: "https://www.recibocerto.pt/guias/ifici-nhr",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "EBF — Art. 58.º-A (IFICI)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf58-a.aspx", tipo: "oficial" as const },
  { titulo: "Portal das Finanças", url: "https://www.portaldasfinancas.gov.pt", tipo: "oficial" as const },
];

const CONDICOES = [
  "Tornar-te residente fiscal em Portugal no ano em causa",
  "Não teres sido residente fiscal em Portugal nos 5 anos anteriores",
  "Exerceres uma atividade elegível (investigação, ensino superior, I&D, ou funções de elevado valor acrescentado reconhecidas)",
  "Não beneficiares (em simultâneo) do IRS Jovem nem do anterior regime NHR",
];

export default function IficiNhrPage() {
  return (
    <>
      <GuiaHero
        titulo="IFICI (NHR 2.0): taxa de IRS de 20%"
        descricao="O Incentivo Fiscal à Investigação Científica e Inovação substituiu o Residente Não Habitual. Para quem reúne as condições, aplica uma taxa especial de IRS aos rendimentos elegíveis."
        tempoLeitura={5}
        badge="Benefício fiscal"
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O que é
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          O IFICI (Art. 58.º-A do Estatuto dos Benefícios Fiscais), informalmente «NHR 2.0», aplica uma
          taxa de IRS de{" "}
          <strong className="text-stone-700 dark:text-stone-200">{pct(IFICI_TAXA.value)}</strong>{" "}
          <InfoTip label="IFICI">{IFICI_TAXA.legalBasis}</InfoTip> aos rendimentos do trabalho elegíveis,
          durante{" "}
          <strong className="text-stone-700 dark:text-stone-200">{IFICI_PRAZO_ANOS.value} anos</strong>{" "}
          consecutivos. Destina-se a atrair e fixar talento em áreas de investigação, inovação e
          atividades de elevado valor acrescentado.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Condições (em síntese)
        </h2>
        <div className="space-y-2">
          {CONDICOES.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <span className="mt-0.5 text-brand flex-shrink-0"><Check size={14} /></span>
              <p className="text-sm text-stone-600 dark:text-stone-400">{item}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          O enquadramento concreto (atividades elegíveis e entidades reconhecidas) é definido por lei e
          depende de inscrição junto da Autoridade Tributária e das entidades competentes. Confirma a
          tua elegibilidade antes de contar com o benefício.
        </p>
      </section>

      <section className="mb-10">
        <div className="rounded-2xl border border-alert-border bg-alert-bg px-4 py-3 text-sm text-alert-text">
          O IFICI é <strong>incompatível</strong> com o IRS Jovem e com o anterior regime de Residente
          Não Habitual no mesmo período. Tens de escolher o regime que mais te favorece.
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/irs-jovem" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            IRS Jovem 2026 <ArrowRight size={13} />
          </Link>
          <Link href="/guias/escaloes-irs" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Escalões de IRS 2026 <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
