import type { Metadata } from "next";
import QuizFiscalApp from "@/components/quiz-fiscal/QuizFiscalApp";
import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";
import { FISCAL_YEAR } from "@/lib/fiscal-year";

// Metadata em pt-PT COM acentuação: os textos anteriores («Seguranca Social»,
// «referencias», «cronometro», «sessoes») apareciam sem acentos nos resultados
// de pesquisa em português. O título aproveita os ~60 caracteres úteis para
// captar intenção, em vez de repetir o nome do produto, e o número de
// perguntas por sessão passa a ser o que a interface realmente oferece.
const PERGUNTAS_FMT = TOTAL_PERGUNTAS_META.toLocaleString("pt-PT");

export const metadata: Metadata = {
  title: `Quiz Fiscal ${FISCAL_YEAR} — ${PERGUNTAS_FMT} perguntas de IRS, IVA e Segurança Social`,
  description:
    `Testa os teus conhecimentos sobre IRS, IVA, Segurança Social e o regime de trabalhador independente em Portugal. ` +
    `${PERGUNTAS_FMT} perguntas com base legal e ligação à fonte oficial, em sessões de 5, 10, 15 ou 20.`,
  keywords: [
    "quiz fiscal",
    "perguntas IRS",
    "teste conhecimentos fiscais",
    "IVA Portugal",
    "Segurança Social trabalhador independente",
    "recibos verdes",
    `fiscalidade ${FISCAL_YEAR}`,
  ],
  alternates: { canonical: "https://www.recibocerto.pt/quiz-fiscal" },
  openGraph: {
    title: `Quiz Fiscal ${FISCAL_YEAR} — ${PERGUNTAS_FMT} perguntas com base legal`,
    description:
      `Banco de ${PERGUNTAS_FMT} perguntas sobre fiscalidade portuguesa, cada uma com base legal e fonte oficial. ` +
      `Sessões de 5 a 20 perguntas, em dois modos: Normal (com cronómetro) e Guiado (com explicações).`,
    url: "https://www.recibocerto.pt/quiz-fiscal",
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "website",
  },
};

export default function QuizFiscalPage() {
  return <QuizFiscalApp />;
}
