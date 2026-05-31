import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Precos from "@/components/Precos";
import FAQ from "@/components/FAQ";
import EmailCapture from "@/components/EmailCapture";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Preços — ReciboCerto",
  description:
    "Calcular e simular é grátis para sempre. O plano Pro traz alertas de prazos, conta na nuvem e exportação para o teu contabilista. Vê os planos do ReciboCerto.",
  alternates: { canonical: "/precos" },
};

export default function PrecosPage() {
  return (
    <div id="top">
      <Nav />
      <main className="pt-8">
        <Precos />
        <FAQ />
        <EmailCapture />
      </main>
      <Footer />
    </div>
  );
}
