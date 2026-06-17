import type { Metadata } from "next";
import { ComparadorCategorias } from "@/components/dependente/ComparadorCategorias";

export const metadata: Metadata = {
  title: "Comparador 2026: trabalho dependente vs. recibos verdes vs. empresa",
  description:
    "Para o mesmo rendimento anual, vê quanto fica líquido como trabalhador por conta de outrem (Categoria A), como independente em recibos verdes (Categoria B) ou através de uma empresa (IRC + dividendos). Grátis.",
  keywords: [
    "recibos verdes ou contrato de trabalho",
    "abrir empresa ou recibos verdes",
    "trabalho dependente vs independente líquido 2026",
    "comparar IRS categoria A e B",
    "criar sociedade vs recibos verdes",
  ],
  alternates: { canonical: "https://recibocerto.pt/ferramentas/comparador" },
  openGraph: {
    title: "Trabalho dependente vs. recibos verdes vs. empresa | ReciboCerto",
    description: "Para o mesmo rendimento anual, qual deixa mais líquido? Categoria A, recibos verdes ou empresa, com os números de 2026.",
    url: "https://recibocerto.pt/ferramentas/comparador",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

export default function ComparadorPage() {
  return (
    <>
      <div className="mb-8">
        <div className="eyebrow mb-3 text-brand">Decisão de carreira</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Recibos verdes, contrato ou empresa?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Para o mesmo rendimento anual, compara o que te fica no bolso em cada caminho: trabalhador
          por conta de outrem (Categoria A), independente em recibos verdes (Categoria B) ou através
          de uma sociedade. Com os escalões e taxas de 2026.
        </p>
      </div>

      <ComparadorCategorias />

      <div className="mt-2 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Como ler</p>
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          Cada coluna parte do mesmo rendimento anual ilíquido. Na Categoria A, esse valor é o salário
          (em 14 meses) e descontam-se Segurança Social (11%) e a retenção de IRS. Nos recibos verdes,
          aplica-se o coeficiente do regime simplificado, a Segurança Social e o IRS anual. Na empresa,
          o lucro paga IRC (PME) e a distribuição paga imposto sobre dividendos. É uma estimativa de
          ordem de grandeza — a decisão real depende de despesas, estabilidade e proteção social.
        </p>
      </div>
    </>
  );
}
