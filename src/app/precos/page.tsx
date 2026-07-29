import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Precos from "@/components/Precos";
import FAQ from "@/components/FAQ";

import Footer from "@/components/Footer";
import AnuncioSlot from "@/components/parcerias/AnuncioSlot";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { faqs } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Planos e Preços — Calculadora Grátis ou Plus",
  description:
    "Calculadora de recibos verdes grátis para sempre. O plano Plus traz conta na nuvem, cenários guardados e exportação para o contabilista. Começa grátis, sem cartão.",
  keywords: [
    "ReciboCerto preços",
    "calculadora recibos verdes grátis",
    "plano pro trabalhador independente",
    "gestão recibos verdes Portugal",
    "alertas prazos fiscais freelancer",
    "exportar recibos para contabilista",
  ],
  alternates: { canonical: "/precos" },
  openGraph: {
    title: "Planos ReciboCerto — Calculadora Grátis + Plus",
    description:
      "Calculadora grátis para sempre. Plus com conta na nuvem, cenários guardados e exportação. Começa grátis.",
    url: "https://www.recibocerto.pt/precos",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planos ReciboCerto — Calculadora Grátis + Plus",
    description:
      "Calculadora de recibos verdes grátis. Plus com alertas e nuvem.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://www.recibocerto.pt/precos#webpage",
      url: "https://www.recibocerto.pt/precos",
      name: "Planos e Preços — ReciboCerto",
      description:
        "Calculadora de recibos verdes grátis para sempre. Plano Plus com alertas, conta na nuvem e exportação para o contabilista.",
      inLanguage: "pt-PT",
      isPartOf: { "@id": "https://www.recibocerto.pt/#website" },
    },
    generateBreadcrumbSchema([
      { name: "Início", url: "/" },
      { name: "Planos e Preços", url: "/precos" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function PrecosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div id="top">
        <Nav />
        <main className="pt-8">
          <Precos />
          {/* O slot público que faltava: a tabela `anuncios` tinha CRUD e
              pré-visualização no admin desde a migração 004 e NADA no site a
              consumia. Os anúncios existiam e não apareciam. */}
          <div className="mx-auto max-w-4xl px-6 py-4">
            <AnuncioSlot superficie="anuncio.landing_pricing" />
          </div>
          <FAQ />
        </main>
        <Footer />
      </div>
    </>
  );
}
