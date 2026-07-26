import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import Link from "next/link";
import InfoTip from "@/components/ui/InfoTip";
import { fmt, pct } from "@/lib/format";
import {
  DEDUCAO_ESPECIFICA_CATB, REGIME_15PCT, IAS, COEFICIENTE_POR_TIPO,
} from "@/lib/fiscal-data";
import { ArrowRight, Check } from "@/components/ui/Icons";

export const metadata: Metadata = metadataDoGuia("despesas-dedutiveis");

const DESPESAS = [
  "Contribuições obrigatórias para a Segurança Social",
  "Despesas com pessoal e rendas de imóveis afetos à atividade",
  "Outras despesas com a atividade (materiais, eletricidade, água, transportes, comunicações), com fatura e NIF",
  "Importações/aquisições de bens e serviços relacionados com a atividade",
];

export default function DespesasDedutiveisPage() {
  return (
    <GuiaLayout slug="despesas-dedutiveis">

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Como o regime simplificado trata as despesas
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400 mb-4">
          No regime simplificado, o IRS não incide sobre toda a tua faturação. Aplica-se um{" "}
          <strong className="text-stone-700 dark:text-stone-200">coeficiente</strong> ao rendimento bruto
          (Art. 31.º CIRS) que já presume as tuas despesas. Por exemplo, em prestações de serviços do
          Art. 151.º o coeficiente é de {pct(COEFICIENTE_POR_TIPO.art151)} — ou seja, só{" "}
          {pct(COEFICIENTE_POR_TIPO.art151)} do que faturas é considerado rendimento tributável; os
          restantes {pct(1 - COEFICIENTE_POR_TIPO.art151)} presumem-se gastos com a atividade.
        </p>
        <div className="rounded-2xl border border-brand/20 bg-brand-light/50 px-4 py-3 text-sm text-brand-dark">
          Por isso, no simplificado <strong>não somas todas as faturas</strong> — a maior parte da dedução
          já está embutida no coeficiente. O que tens de justificar é apenas a parte da{" "}
          <strong>regra dos 15%</strong>.
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          A regra dos 15% (Art. 31.º n.º 13)
        </h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400 mb-4">
          Para os coeficientes de {pct(COEFICIENTE_POR_TIPO.art151)} e {pct(COEFICIENTE_POR_TIPO.outros)}, a
          lei exige que justifiques despesas equivalentes a{" "}
          <strong className="text-stone-700 dark:text-stone-200">{pct(REGIME_15PCT.value)} do rendimento bruto</strong>{" "}
          <InfoTip label="Regra dos 15%">{REGIME_15PCT.legalBasis ?? "Art. 31.º n.º 13 CIRS"}</InfoTip>. Se
          não justificares essa parte, a diferença é acrescentada ao rendimento tributável.
        </p>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400 mb-4">
          A boa notícia: parte desse limite é preenchido automaticamente. Conta como justificação a{" "}
          <strong className="text-stone-700 dark:text-stone-200">dedução específica</strong> de{" "}
          {fmt(DEDUCAO_ESPECIFICA_CATB.value)} (8,54 × IAS, com o IAS de 2026 a {fmt(IAS.value)}) ou as
          contribuições obrigatórias para a Segurança Social, conforme o que for maior. Só precisas de
          faturas para cobrir o que faltar até aos {pct(REGIME_15PCT.value)}.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Que despesas contam (com fatura e NIF)
        </h2>
        <div className="space-y-2">
          {DESPESAS.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <span className="mt-0.5 text-brand flex-shrink-0"><Check size={14} /></span>
              <p className="text-sm text-stone-600 dark:text-stone-400">{item}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Confirma sempre, no portal e-Fatura, que cada fatura ficou associada à tua atividade
          profissional (e não às despesas pessoais). Faturas sem o teu NIF não contam.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/regime-simplificado" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Regime simplificado e coeficientes <ArrowRight size={13} />
          </Link>
          <Link href="/guias/contabilidade-organizada" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Vale a pena a contabilidade organizada? <ArrowRight size={13} />
          </Link>
        </div>
      </section>

    </GuiaLayout>
  );
}
