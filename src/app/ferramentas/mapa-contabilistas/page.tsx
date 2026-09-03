import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import MapaRegioesLazy from "@/components/mapa/MapaRegioesLazy";
import ContabilistasNoResultado from "@/components/diretorio/ContabilistasNoResultado";

const TOOL = porId("mapa-contabilistas")!;

export const metadata: Metadata = {
  title: "Mapa de preços por região 2026: contabilistas, notários e advogados",
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
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Mapa de preços por região 2026: contabilistas, notários e advogados | Recibo Certo",
    description:
      "Um único mapa interativo de Portugal com filtros: avenças de contabilistas, atos notariais com preços, consultas de advogados e benefícios fiscais por região.",
    url: "https://www.recibocerto.pt/ferramentas/mapa-contabilistas",
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

export default function MapaContabilistasPage() {
  return (
    <ToolShell
      tool={TOOL}
      subtitulo="Um único mapa de Portugal com filtros: avenças de contabilistas, atos de notários com preços, consultas de advogados e os benefícios fiscais de cada região."
      contexto={
        <section className="rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50 sm:p-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Precisas mesmo de um contabilista?
          </p>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            O custo depende muito da tua situação. No simulador guiado, o passo «O que fazer a seguir»
            analisa a tua faturação, despesas, região e tipo de clientes e diz-te se — e quando — vale
            mesmo a pena contratar, com um intervalo de honorários adaptado ao teu caso.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Os valores são intervalos e medianas recolhidos de tabelas públicas e de preçários
            praticados, não cotações. Servem para enquadrar uma conversa, não para a substituir.
          </p>
        </section>
      }
    >
      <MapaRegioesLazy contexto="contabilistas" />

      {/* O mapa responde a «quanto custa». Isto responde a «quem» — que é
          a pergunta a seguir, e a única desta página que tem nomes. */}
      <ContabilistasNoResultado />
    </ToolShell>
  );
}
