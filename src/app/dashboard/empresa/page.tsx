import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import SimuladorIntegrado from "@/components/SimuladorIntegrado";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Abrir empresa"
      descricao="Faturação, custos e dividendos — estima o líquido via sociedade com IRC PME, derrama, tributação autónoma e benefícios fiscais (RFAI, DLRR, SIFIDE)."
    >
      <SimuladorIntegrado vista="empresa" />
    </PaginaFerramenta>
  );
}
