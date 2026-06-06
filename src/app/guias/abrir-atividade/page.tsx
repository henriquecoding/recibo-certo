import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import { DecisorAtoVsAtividade } from "@/components/guias/DecisorAtoVsAtividade";
import InfoTip from "@/components/ui/InfoTip";
import { IVA_ISENCAO_LIMITE, REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import { ArrowRight, Check } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Como abrir atividade nas Finanças 2026",
  description: "Guia passo a passo para abrir atividade nas Finanças em Portugal. Código de atividade, IVA, Segurança Social — em português simples.",
  keywords: ["abrir atividade finanças", "recibos verdes", "trabalhador independente"],
  alternates: { canonical: "https://recibocerto.pt/guias/abrir-atividade" },
  openGraph: {
    title: "Como abrir atividade nas Finanças 2026 | ReciboCerto",
    description: "Guia passo a passo para abrir atividade nas Finanças em Portugal.",
    url: "https://recibocerto.pt/guias/abrir-atividade",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Gov.pt — Trabalhador Independente", url: "https://www.gov.pt/guias/trabalhar-por-conta-propria-guia-para-trabalhadores-independentes/", tipo: "oficial" as const },
  { titulo: "Portal das Finanças — Início de Atividade", url: "https://www.portaldasfinancas.gov.pt", tipo: "oficial" as const },
  { titulo: "Doutor Finanças — Como abrir atividade", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/trabalhadores-independentes/como-abrir-atividade-nas-financas-2/", tipo: "referencia" as const },
  { titulo: "Montepio — Guia completo abertura de atividade", url: "https://www.montepio.org/ei/pessoal/impostos/abrir-atividade-no-portal-das-financas-saiba-tudo-neste-guia-completo/", tipo: "referencia" as const },
  { titulo: "Santander — Abrir atividade nas Finanças", url: "https://www.santander.pt/salto/abrir-atividade-nas-financas", tipo: "referencia" as const },
];

const PASSOS = [
  "Abre portaldasfinancas.gov.pt e inicia sessão",
  "Cidadãos → Serviços → Atividade → Declaração de Início de Atividade",
  "Preenche: código de atividade, data de início, volume de negócios estimado",
  "Valida e guarda o comprovativo",
];

export default function AbrirAtividadePage() {
  return (
    <>
      <GuiaHero
        titulo="Como abrir atividade nas Finanças em 2026"
        descricao="Gratuito, online e imediato. Precisas do NIF, acesso ao Portal e do código de atividade certo."
        tempoLeitura={5}
        badge="Passo a passo"
      />

      <section className="prose-like mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Precisas mesmo de abrir atividade?
        </h2>
        <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed mb-4">
          Se vais faturar uma única vez e de forma pontual, pode ser mais simples emitir um ato isolado. Usa o decisor abaixo para saber o que se aplica à tua situação.
        </p>
        <DecisorAtoVsAtividade />
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O que precisas ter pronto
        </h2>
        <div className="space-y-2">
          {[
            "NIF + acesso ao Portal das Finanças (senha ou CMD)",
            "Código de atividade (CAE ou Art. 151.º) — ver guia de regime simplificado",
            "Estimativa de faturação até 31 de dezembro",
            "IBAN (para eventuais reembolsos)",
            "Morada fiscal atualizada",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <span className="mt-0.5 text-brand flex-shrink-0"><Check size={14} /></span>
              <p className="text-sm text-stone-600 dark:text-stone-400">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Passo a passo online
        </h2>
        <div className="space-y-3">
          {PASSOS.map((passo, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-stone-600 dark:text-stone-400 pt-1">{passo}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O enquadramento automático
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">IRS</p>
            <p className="text-sm text-stone-700 dark:text-stone-300 font-medium">Categoria B</p>
            <p className="text-xs text-stone-500 mt-1">
              Regime simplificado{" "}
              <InfoTip label="Limite regime simplificado">Art. 28.º CIRS — limite de {fmt(REGIME_SIMPLIFICADO.limite.value)}/ano</InfoTip>
              {" "}se faturação {"<"} {fmt(REGIME_SIMPLIFICADO.limite.value)}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">IVA</p>
            <p className="text-sm text-stone-700 dark:text-stone-300 font-medium">Isento Art. 53.º</p>
            <p className="text-xs text-stone-500 mt-1">
              Se estimativa {"<"} {fmt(IVA_ISENCAO_LIMITE.value)}
              <InfoTip label="Isenção de IVA">{IVA_ISENCAO_LIMITE.legalBasis}</InfoTip>
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Segurança Social</p>
            <p className="text-sm text-stone-700 dark:text-stone-300 font-medium">Isenção 12 meses</p>
            <p className="text-xs text-stone-500 mt-1">A contar da data de abertura de atividade</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-3">
          Custo e duração
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Gratuito. Online: imediato. Presencial nas Finanças: no próprio dia.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/seguranca-social" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Segurança Social — o que muda no 13.º mês <ArrowRight size={13} />
          </Link>
          <Link href="/dashboard/prazos" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Configurar alertas de prazos <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
