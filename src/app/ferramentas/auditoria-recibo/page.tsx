import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import AuditoriaReciboLazy from "./lazy";

const TOOL = porId("auditoria-recibo")!;

export const metadata: Metadata = {
  title: "Auditoria do recibo de vencimento 2026 — o teu salário está correto?",
  description:
    "Confere se a tua entidade patronal aplicou bem as tabelas de 2026: introduz o IRS retido e a Segurança Social do teu recibo de vencimento e deteta divergências. Gratuito.",
  keywords: [
    "verificar recibo de vencimento",
    "o meu salário está correto",
    "erros no recibo de vencimento",
    "auditar retenção IRS 2026",
    "segurança social mal descontada",
  ],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Auditoria do recibo de vencimento 2026 | Recibo Certo",
    description: "Deteta erros de IRS e Segurança Social no teu recibo de vencimento, face às tabelas oficiais de 2026.",
    url: "https://www.recibocerto.pt/ferramentas/auditoria-recibo",
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

export default function AuditoriaReciboPage() {
  return (
    <ToolShell
      tool={TOOL}
      subtitulo="Introduz os valores que constam no teu recibo. Comparamos com as tabelas oficiais de 2026 e dizemos-te o que não bate certo — e porquê."
      contexto={
          <section className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50 sm:p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Como funciona</p>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              A Segurança Social do trabalhador é 11% sobre o bruto. A retenção de IRS segue a tabela de
              retenção na fonte de 2026 (Despacho 233-A/2026), em função do salário e dos dependentes.
              Confrontamos esses valores com os do teu recibo e assinalamos divergências acima de uma
              pequena tolerância de arredondamento. Uma divergência assinalada é um ponto a confirmar
              com quem processa o teu salário — não é, por si só, prova de erro.
            </p>
          </section>
      }
    >
      <AuditoriaReciboLazy />
    </ToolShell>
  );
}
