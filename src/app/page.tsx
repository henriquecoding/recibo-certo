import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Calculadora from "@/components/Calculadora";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import Fontes from "@/components/Fontes";
import EmailCapture from "@/components/EmailCapture";
import Comparacao from "@/components/Comparacao";
import SimuladorEmpresa from "@/components/SimuladorEmpresa";
import Precos from "@/components/Precos";
import Footer from "@/components/Footer";
import Reveal from "@/components/ui/Reveal";
import { faqs } from "@/lib/faq";

const SITE_URL = "https://recibocerto.pt";

// Dados estruturados (JSON-LD) — melhoram a indexação e os rich results.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "ReciboCerto",
      url: SITE_URL,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: "pt-PT",
      description:
        "Calculadora de recibos verdes para trabalhadores independentes em Portugal: IRS, Segurança Social e IVA com as taxas de 2026.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div id="top">
        <Nav />
        <main>
          <Hero />

          <section className="grain border-y border-stone-100 bg-white px-6 py-24">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">Experimenta com o teu valor</div>
                <h2 className="font-display display-2 font-semibold text-ink">Quanto fica realmente teu?</h2>
                <p className="mx-auto mt-3 max-w-md text-stone-500">
                  Muda o valor e vê, em tempo real, o que é teu e o que reservar. IRS, Segurança Social e IVA, com as
                  taxas de 2026.
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <Calculadora />
              </Reveal>
            </div>
          </section>

          <SimuladorEmpresa />

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
