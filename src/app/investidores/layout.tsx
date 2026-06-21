import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Investidores — Oportunidade de investimento em Fintech SaaS",
  description:
    "A ReciboCerto transforma a obrigação fiscal da faturação numa plataforma de pagamentos integrados e otimização de tesouraria para PMEs em Portugal. Conheça a tese de investimento.",
  keywords: [
    "ReciboCerto investimento",
    "fintech Portugal",
    "SaaS faturação",
    "PME automação financeira",
    "venture capital Portugal",
    "startup fintech",
  ],
  alternates: { canonical: "/investidores" },
  openGraph: {
    title: "ReciboCerto — Oportunidade de investimento em Fintech SaaS",
    description:
      "Infraestrutura de automação financeira para PMEs em Portugal. Faturação regulada, pagamentos integrados e reconciliação bancária.",
    url: "https://www.recibocerto.pt/investidores",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function InvestidoresLayout({ children }: { children: ReactNode }) {
  return children;
}
