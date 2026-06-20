import type { Metadata } from "next";
import QuizFiscalApp from "@/components/quiz-fiscal/QuizFiscalApp";

export const metadata: Metadata = {
  title: "Quiz Fiscal — ReciboCerto",
  description:
    "Testa os teus conhecimentos sobre IRS, IVA, Seguranca Social e o regime de trabalhador independente em Portugal, com referencias legais reais.",
  alternates: { canonical: "https://www.recibocerto.pt/quiz-fiscal" },
  openGraph: {
    title: "Quiz Fiscal — ReciboCerto",
    description:
      "60 perguntas sobre fiscalidade portuguesa com base legal e fontes oficiais. Dois modos: Normal (com cronometro) e Guiado (com explicacoes).",
    url: "https://www.recibocerto.pt/quiz-fiscal",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "website",
  },
};

export default function QuizFiscalPage() {
  return <QuizFiscalApp />;
}
