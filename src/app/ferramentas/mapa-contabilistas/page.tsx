import type { Metadata } from "next";
import MapaRegioesLazy from "@/components/mapa/MapaRegioesLazy";

export const metadata: Metadata = {
  title: "Mapa de preços por região 2026: contabilistas, notários e advogados | ReciboCerto",
  description:
    "Quanto custa um contabilista, um notário ou um advogado em Portugal? Um único mapa interativo com filtros: avenças de contabilistas, atos notariais com preços, consultas de advogados e benefícios fiscais por região.",
  keywords: [
    "preço contabilista Portugal 2026",
    "honorários contabilista por região",
    "quanto custa um contabilista",
    "quanto custa um notário",
    "preço procuração testamento notário",
    "quanto custa um advogado consulta",
    "honorários advogado Portugal",
    "benefícios fiscais por região",
  ],
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas/mapa-contabilistas" },
  openGraph: {
    title: "Mapa de preços por região 2026: contabilistas, notários e advogados | ReciboCerto",
    description:
      "Um único mapa interativo de Portugal com filtros: avenças de contabilistas, atos notariais com preços, consultas de advogados e benefícios fiscais por região.",
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
        <div className="eyebrow mb-3 text-brand">Preços & regiões</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Quanto custam os profissionais de que precisas, na tua região?
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Um único mapa de Portugal com filtros: avenças de <strong>contabilistas</strong>, atos de{" "}
          <strong>notários</strong> com preços, consultas de <strong>advogados</strong> e os{" "}
          <strong>benefícios fiscais</strong> de cada região. Toca numa região, procura a tua zona ou
          muda de filtro quando quiseres.
        </p>
      </div>

      <MapaRegioesLazy contexto="contabilistas" />

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
