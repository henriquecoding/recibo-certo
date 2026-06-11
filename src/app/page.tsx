import Nav from "@/components/Nav";

import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import SimuladorIntegrado from "@/components/SimuladorIntegrado";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import Fontes from "@/components/Fontes";
import EmailCapture from "@/components/EmailCapture";
import Comparacao from "@/components/Comparacao";
import Precos from "@/components/Precos";
import Footer from "@/components/Footer";
import Reveal from "@/components/ui/Reveal";
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
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">
                  Calculadora de recibos verdes 2026
                </div>
                <h2 className="font-display display-2 font-semibold text-ink">
                  Calcula o teu líquido real.<br className="hidden sm:block" /> IRS, SS e IVA em segundos.
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500">
                  Ajusta o valor e a atividade — vê imediatamente quanto recebes a limpo como recibos verdes
                  e quanto ficarias como empresa. Taxas de 2026, verificadas com fonte legal.
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <SimuladorIntegrado />
              </Reveal>
            </div>
          </section>

          <Stats />

          <Features />

          <div className="border-y border-stone-100 bg-white">
            <Comparacao />
          </div>

          <Precos />

          <Fontes />

          <FAQ />

          <EmailCapture />
        </main>
        <Footer />
      </div>
    </>
  );
}
