import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import { DecisorAtoVsAtividade } from "@/components/guias/DecisorAtoVsAtividade";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Ato isolado ou atividade?"
      descricao="Responde a 4 perguntas simples e fica a saber se deves emitir um ato isolado ou abrir atividade nas Finanças."
    >
      <DecisorAtoVsAtividade />
    </PaginaFerramenta>
  );
}
