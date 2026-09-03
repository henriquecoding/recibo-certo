import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import ModoGuiadoEmpresaLazy from "./lazy";

const TOOL = porId("simulador-empresa")!;

export const metadata: Metadata = {
  title: "Simulador de empresa (Lda) 2026 — IRC, dividendos e custos",
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
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Simulador de empresa (Lda) 2026 | Recibo Certo",
    description: "IRC, dividendos, custos e passo a passo para abrir empresa em Portugal — com as taxas oficiais de 2026.",
    url: "https://www.recibocerto.pt/ferramentas/simulador-empresa",
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

export default function SimuladorEmpresaPage() {
  return (
    <ToolShell
      tool={TOOL}
      subtitulo="Simula o resultado líquido de uma sociedade por quotas — IRC, dividendos, custos obrigatórios e os passos para constituir."
    >
      <ModoGuiadoEmpresaLazy />
    </ToolShell>
  );
}
