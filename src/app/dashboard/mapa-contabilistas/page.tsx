import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import MapaPrecosRegioes from "@/components/contabilista/MapaPrecosRegioes";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Ferramentas"
      titulo="Mapa de preços de contabilistas"
      descricao="Quanto custa um contabilista por região? Vê a média de honorários (avença mensal) de Lisboa aos Açores, num mapa interativo. Estimativas de mercado."
    >
      <MapaPrecosRegioes />
    </PaginaFerramenta>
  );
}
