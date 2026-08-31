import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import PlaneadorContratacaoLazy from "@/app/ferramentas/planeador-contratacao/lazy";

/**
 * O planeador dentro do painel. Existe para que um cenário de contratação
 * guardado tenha para onde reabrir: `META_TIPO_CENARIO.contratacao.rota`
 * apontava para a própria lista de cenários, e abrir um devolvia a pessoa ao
 * sítio de onde tinha vindo (relatório, CON-P0-22).
 */
export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Planeador de contratação"
      descricao="Do orçamento ao pacote, ao líquido provável e à capacidade que o posto precisa de gerar — com o que está confirmado separado do que ainda falta."
    >
      <PlaneadorContratacaoLazy hoje={new Date().toISOString().slice(0, 10)} />
    </PaginaFerramenta>
  );
}
