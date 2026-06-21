import Nav from "@/components/Nav";

import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import CalculadoraSecao from "@/components/CalculadoraSecao";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import Fontes from "@/components/Fontes";

import CustoOmissao from "@/components/CustoOmissao";
import Precos from "@/components/Precos";
import Footer from "@/components/Footer";
import { faqs } from "@/lib/faq";
import {
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateSoftwareApplicationSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
} from "@/lib/seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    generateWebSiteSchema(),
    generateOrganizationSchema(),
    generateSoftwareApplicationSchema(),
    generateBreadcrumbSchema([{ name: "Início", url: "/" }]),
    generateFAQSchema(faqs),
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div id="top">
        <Nav />
        <main>
          <Hero />

          {/*
           * ── Simulador integrado ──────────────────────────────────────────
           * Substitui Calculadora.tsx + SimuladorEmpresa.tsx.
           * Uma única ferramenta com:
           *  · slider bidirecional + input manual para todos os campos numéricos
           *  · ActivityCombobox com catálogo completo Art. 151.º
           *  · toggle Por recibo / Anual (partilhado entre cenários)
           *  · toggle Recibos Verdes / Empresa (mesmos inputs, dois painéis)
           *  · comparação integrada no rodapé com ponto de viragem
           */}
          <section
            id="calculadora"
            className="grain border-y border-stone-100 bg-white px-6 py-24 scroll-mt-20"
          >
            <CalculadoraSecao />
          </section>

          <Stats />

          <Features />

          <div className="border-y border-stone-100 bg-white">
            <CustoOmissao />
          </div>

          <Precos />

          <Fontes />

          <FAQ />
        </main>
        <Footer />
      </div>
    </>
  );
}
