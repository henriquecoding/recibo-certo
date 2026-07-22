import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import MapaRegioesLazy from "@/components/mapa/MapaRegioesLazy";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Ferramentas"
      titulo="Mapa de preços por região"
      descricao="Contabilistas, notários e advogados — quanto custam na tua região — e os benefícios fiscais de cada zona do país. Um único mapa, com filtros."
    >
      <MapaRegioesLazy contexto="contabilistas" />
    </PaginaFerramenta>
  );
}
