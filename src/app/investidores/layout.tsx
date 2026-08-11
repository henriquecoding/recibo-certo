import type { Metadata } from "next";
import type { ReactNode } from "react";

// ── Descoberta: decisão consciente, e ainda não tomada ─────────────────────
//
// O relatório põe a escolha em cima da mesa: uma página pública e indexável
// (que capta procura externa e vale como reputação) ou uma página privada (para
// uma ronda só por apresentações). Recomenda a primeira.
//
// Mantém-se `index: false` por instrução expressa do próprio relatório (§17,
// Fase 5 e §21.12): não remover o noindex antes de a comunicação jurídica e os
// dados da ronda estarem validados. O aviso de investimento desta página está
// por rever por advogado e a ficha da ronda está por divulgar — as duas
// condições que faltam.
//
// `follow: true` (e não o `nofollow` anterior) porque não há razão nenhuma para
// desperdiçar as ligações internas desta página para o produto, para as fontes
// e para /estado-dos-dados. O que se quer é que a página não apareça nos
// resultados, não que os motores parem à porta.
//
// PARA PUBLICAR: rever o aviso legal, fechar os dados da ronda, e trocar para
// `index: true`. Nada mais neste ficheiro precisa de mudar.

export const metadata: Metadata = {
  title: "Investir no ReciboCerto — a camada de decisão fiscal em Portugal",
  description:
    "O que o ReciboCerto é hoje, para quem, como ganha dinheiro e o que a ronda compra. " +
    "Com definição, fonte e data em cada número — e o que ainda não medimos identificado como tal.",
  alternates: { canonical: "/investidores" },
  openGraph: {
    title: "Investir no ReciboCerto — a camada de decisão fiscal em Portugal",
    description:
      "Produto, mercado bottom-up, modelo e riscos, com evidência em cada afirmação.",
    url: "https://www.recibocerto.pt/investidores",
    type: "website",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function InvestidoresLayout({ children }: { children: ReactNode }) {
  return children;
}
