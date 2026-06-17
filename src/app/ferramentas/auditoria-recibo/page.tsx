import type { Metadata } from "next";
import { AuditoriaRecibo } from "@/components/dependente/AuditoriaRecibo";

export const metadata: Metadata = {
  title: "Auditoria do recibo de vencimento 2026 — o teu salário está correto?",
  description:
    "Confere se a tua entidade patronal aplicou bem as tabelas de 2026: introduz o IRS retido e a Segurança Social do teu recibo de vencimento e deteta divergências. Funcionalidade Pro.",
  keywords: [
    "verificar recibo de vencimento",
    "o meu salário está correto",
    "erros no recibo de vencimento",
    "auditar retenção IRS 2026",
    "segurança social mal descontada",
  ],
  alternates: { canonical: "https://recibocerto.pt/ferramentas/auditoria-recibo" },
  openGraph: {
    title: "Auditoria do recibo de vencimento 2026 | ReciboCerto",
    description: "Deteta erros de IRS e Segurança Social no teu recibo de vencimento, face às tabelas oficiais de 2026.",
    url: "https://recibocerto.pt/ferramentas/auditoria-recibo",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

export default function AuditoriaReciboPage() {
  return (
    <>
      <div className="mb-8">
        <div className="eyebrow mb-3 text-brand">Por conta de outrem · Pro</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          O teu recibo está certo?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Introduz o salário bruto e os valores que constam no teu recibo de vencimento — a retenção
          de IRS e o desconto da Segurança Social. Comparamos com as tabelas oficiais de 2026 e
          dizemos-te se algo não bate certo.
        </p>
      </div>

      <AuditoriaRecibo />

      <div className="mt-2 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Como funciona</p>
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          A Segurança Social do trabalhador é 11% sobre o bruto. A retenção de IRS segue a tabela de
          retenção na fonte de 2026 (Despacho 233-A/2026), em função do salário e dos dependentes.
          Confrontamos esses valores com os do teu recibo e assinalamos divergências acima de uma
          pequena tolerância de arredondamento.
        </p>
      </div>
    </>
  );
}
