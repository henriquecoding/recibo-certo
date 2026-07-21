import Nav from "@/components/Nav";

import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import CalculadoraSecao from "@/components/CalculadoraSecao";
import ExplorarSecao from "@/components/ExplorarSecao";
import FAQ from "@/components/FAQ";
import Fontes from "@/components/Fontes";
import { compararCategorias } from "@/lib/fiscal-dependente";
import { ATIVIDADES } from "@/lib/fiscal-data";

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
// o motor fiscal verificado e passados como props ao Hero. Mantém
// `fiscal-dependente`/`fiscal`/`fiscal-data` FORA do bundle inicial do cliente,
// sem mudar nenhum valor (mesma função, mesmos pressupostos).
const HERO_FAT = 30_000;
const landingCmp = compararCategorias({ brutoAnual: HERO_FAT, dependentes: 0 });

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
           * Uma única ferramenta interativa, adaptada ao perfil (recibos verdes,
           * vencimento, empresa ou comparador). É o produto — vive logo a seguir
           * ao Hero para o utilizador experimentar de imediato.
           */}
          <section
            id="calculadora"
            className="grain border-y border-stone-100 bg-white px-6 py-14 scroll-mt-20 sm:py-20"
          >
            <CalculadoraSecao />
          </section>

          {/*
           * ── #explorar — launchpad único, moldado ao perfil ────────────────
           * Substitui as antigas Features + Ferramentas + Simulador de IRS +
           * Aprender por UMA secção compacta que mostra só o essencial de cada
           * perfil: um destaque (a demo do IRS ao vivo onde é protagonista, ou o
           * cartão-chave), a fila de ferramentas relevantes e a de guias + Quiz.
           * `nAtividades` é calculado no servidor para o chip nunca inventar.
           */}
          <section id="explorar" className="px-6 py-14 scroll-mt-20 sm:py-20">
            <ExplorarSecao nAtividades={ATIVIDADES.length} />
          </section>

          <Stats />

          <Precos />

          <FAQ />

          <Fontes />
        </main>
        <Footer />
      </div>
    </>
  );
}
