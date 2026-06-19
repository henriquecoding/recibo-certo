import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import { ComparadorCAE } from "@/components/guias/ComparadorCAE";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Ferramentas"
      titulo="Classificar atividade fiscal"
      descricao="Pesquisa a tua profissão e descobre a retenção na fonte, o coeficiente e a base de Segurança Social aplicável."
    >
      <ComparadorCAE />
    </PaginaFerramenta>
  );
}
