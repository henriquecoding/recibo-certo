import type { Metadata } from "next";
import QuizFiscalApp from "@/components/quiz-fiscal/QuizFiscalApp";
import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";

export const metadata: Metadata = {
  title: "Quiz Fiscal — ReciboCerto",
  description:
    "Testa os teus conhecimentos sobre IRS, IVA, Seguranca Social e o regime de trabalhador independente em Portugal, com referencias legais reais.",
  alternates: { canonical: "https://www.recibocerto.pt/quiz-fiscal" },
  openGraph: {
    title: "Quiz Fiscal — ReciboCerto",
    description: `Banco de ${TOTAL_PERGUNTAS_META.toLocaleString("pt-PT")} perguntas sobre fiscalidade portuguesa com base legal e fontes oficiais, em sessoes de 60. Dois modos: Normal (com cronometro) e Guiado (com explicacoes).`,
    url: "https://www.recibocerto.pt/quiz-fiscal",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "website",
  },
};

export default function QuizFiscalPage() {
  return <QuizFiscalApp />;
}
