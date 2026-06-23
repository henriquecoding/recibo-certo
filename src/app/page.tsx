import Nav from "@/components/Nav";

import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import CalculadoraSecao from "@/components/CalculadoraSecao";
import Features, { type Breakeven } from "@/components/Features";
import FAQ from "@/components/FAQ";
import Fontes from "@/components/Fontes";
import { compararCategorias } from "@/lib/fiscal-dependente";

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

// Números de empresa/comparação da landing — calculados no servidor (build) com
// o motor fiscal verificado e passados como props ao Hero e às Features. Mantém
// `fiscal-dependente`/`fiscal`/`fiscal-data` FORA do bundle inicial do cliente,
// sem mudar nenhum valor (mesma função, mesmos pressupostos).
const HERO_FAT = 30_000;
const landingCmp = compararCategorias({ brutoAnual: HERO_FAT, dependentes: 0 });
const landingBreakeven: Breakeven = (() => {
  let bRV: number | null = null;
  let bEmp: number | null = null;
  for (let x = 5_000; x <= 200_000; x += 2_500) {
    const c = compararCategorias({ brutoAnual: x, dependentes: 0 });
    if (bRV === null && c.freelancer.liquido > c.dependente.liquido) bRV = x;
    if (bEmp === null && c.empresa.liquido > c.freelancer.liquido) bEmp = x;
  }
  return { bRV, bEmp };
})();

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
          <Hero cmp={landingCmp} />

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

          <Features cmp={landingCmp} breakeven={landingBreakeven} />

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
