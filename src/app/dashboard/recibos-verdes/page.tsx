import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import SimuladorIntegrado from "@/components/SimuladorIntegrado";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Recibos verdes"
      descricao="Trabalhador independente? Do valor faturado ao líquido real — IRS, Segurança Social e IVA, com os coeficientes e taxas oficiais de 2026. Guarda o cenário para reabrires quando quiseres."
    >
      <SimuladorIntegrado vista="rv" />
    </PaginaFerramenta>
  );
}
