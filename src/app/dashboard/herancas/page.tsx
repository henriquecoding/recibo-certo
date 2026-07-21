import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import SimuladorHeranca from "@/components/SimuladorHeranca";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Heranças e sucessões"
      descricao="Quem herda o quê e quanto se paga de Imposto do Selo — meação, legítima e quota disponível, partilha e comparação herança vs doação em vida."
    >
      <SimuladorHeranca />
    </PaginaFerramenta>
  );
}
