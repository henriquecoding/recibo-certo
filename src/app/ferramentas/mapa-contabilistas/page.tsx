import type { Metadata } from "next";
import MapaPrecosRegioes from "@/components/contabilista/MapaPrecosRegioes";

export const metadata: Metadata = {
  title: "Mapa de preços de contabilistas por região 2026 | ReciboCerto",
  description:
    "Quanto custa um contabilista em Portugal? Vê a média de honorários (avença mensal) por região — Lisboa, Norte, Centro, Alentejo, Algarve, Madeira e Açores — num mapa interativo. Estimativas de mercado.",
  keywords: [
    "preço contabilista Portugal 2026",
    "honorários contabilista por região",
    "quanto custa um contabilista",
    "avença contabilidade mensal",
    "contabilista Lisboa Porto preço",
  ],
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas/mapa-contabilistas" },
  openGraph: {
    title: "Mapa de preços de contabilistas por região 2026 | ReciboCerto",
    description:
      "A média de honorários de contabilistas por região de Portugal, num mapa interativo. Estimativas de mercado para trabalhadores independentes.",
    url: "https://www.recibocerto.pt/ferramentas/mapa-contabilistas",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

export default function MapaContabilistasPage() {
  return (
    <>
      <div className="mb-8">
        <div className="eyebrow mb-3 text-brand">Contabilistas</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Quanto custa um contabilista, por região?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Explora a média de honorários (avença mensal) de Contabilistas Certificados pelas regiões de
          Portugal. Toca numa região no mapa ou na lista para ver os valores. Em breve poderás contactar
          contabilistas diretamente por aqui.
        </p>
      </div>

      <MapaPrecosRegioes />

      <div className="mt-8 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
          Precisas mesmo de um contabilista?
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          O custo depende muito da tua situação. No simulador guiado, o passo «O que fazer a seguir»
          analisa a tua faturação, despesas, região e tipo de clientes e diz-te se — e quando — vale
          mesmo a pena contratar, com um intervalo de honorários adaptado ao teu caso.
        </p>
      </div>
    </>
  );
}
