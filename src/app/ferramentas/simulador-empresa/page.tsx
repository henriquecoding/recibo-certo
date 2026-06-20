import type { Metadata } from "next";
import ModoGuiadoEmpresa from "@/components/simulador/ModoGuiadoEmpresa";

export const metadata: Metadata = {
  title: "Simulador de empresa (Lda) 2026 — IRC, dividendos e custos | ReciboCerto",
  description:
    "Simula o resultado líquido de abrir uma empresa em Portugal: IRC (15%/19%), dividendos (28% ou englobamento), custos de constituição, obrigações fiscais e passo a passo. Guiado e gratuito.",
  keywords: [
    "simulador empresa 2026",
    "abrir empresa Portugal",
    "IRC PME 2026",
    "dividendos taxa liberatória",
    "constituir sociedade unipessoal",
    "custos abrir empresa",
  ],
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas/simulador-empresa" },
  openGraph: {
    title: "Simulador de empresa (Lda) 2026 | ReciboCerto",
    description: "IRC, dividendos, custos e passo a passo para abrir empresa em Portugal — com as taxas oficiais de 2026.",
    url: "https://www.recibocerto.pt/ferramentas/simulador-empresa",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

export default function SimuladorEmpresaPage() {
  return (
    <>
      <div className="mb-8">
        <div className="eyebrow mb-3 text-brand">Empresa (Lda)</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Quanto ficaria para ti com empresa?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Simula o resultado líquido de uma sociedade por quotas — IRC, dividendos,
          custos obrigatórios e os passos para constituir. Compara com recibos verdes
          no simulador completo.
        </p>
      </div>

      <ModoGuiadoEmpresa />
    </>
  );
}
