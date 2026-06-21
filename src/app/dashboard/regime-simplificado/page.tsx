import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import { CalculadoraRegimeSimplificado } from "@/components/guias/CalculadoraRegimeSimplificado";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Regime simplificado"
      descricao="Insere a tua faturação e atividade. Calcula coeficiente, rendimento tributável, IRS estimado e taxa efetiva."
    >
      <CalculadoraRegimeSimplificado />
    </PaginaFerramenta>
  );
}
