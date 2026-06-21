import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import ComparadorCenarios from "@/components/comparar/ComparadorCenarios";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Comparar cenários"
      descricao="Para o mesmo rendimento anual, compara o líquido como por conta de outrem, recibos verdes ou empresa — com o ponto de viragem, os benefícios por região e o custo de contabilista."
    >
      <ComparadorCenarios />
    </PaginaFerramenta>
  );
}
