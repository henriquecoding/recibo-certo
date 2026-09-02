import type { Metadata } from "next";
import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import PlaneadorContratacaoLazy from "@/app/ferramentas/planeador-contratacao/lazy";
import PlanosDeContratacao from "./PlanosDeContratacao";

/**
 * PLANEAR UMA CONTRATAÇÃO — a quarta etapa do arco do negócio.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PARA QUEM CONTRATA                                                   │
 * │                                                                     │
 * │ Estava classificada como «simulador», ao lado das heranças e do ato  │
 * │ isolado, e alcançava-se por uma lista de nove entradas. Mas isto não │
 * │ é um simulador entre outros: é o passo em que o negócio deixa de     │
 * │ caber numa pessoa — o mais caro e o menos reversível de todos os que │
 * │ este produto acompanha.                                              │
 * │                                                                     │
 * │ Passa a ser destino de primeira classe, ao lado de Descobrir, Preços │
 * │ e Projeto: descobrir o que vender, a que preço, se as contas fecham  │
 * │ — e quem entra quando já não chega uma pessoa.                       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * O motor é o mesmo da rota pública (`/ferramentas/planeador-contratacao`),
 * no mesmo chunk. O que esta rota acrescenta é continuidade: os planos que
 * já foram guardados, e a porta para os reabrir.
 */
export const metadata: Metadata = {
  title: "Planear uma contratação",
};

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="O teu negócio"
      titulo="Planear uma contratação"
      descricao="Do orçamento ao pacote, ao líquido provável e à capacidade que o posto precisa de gerar — com o que está confirmado separado do que ainda falta."
    >
      <PlanosDeContratacao />
      <PlaneadorContratacaoLazy hoje={new Date().toISOString().slice(0, 10)} />
    </PaginaFerramenta>
  );
}
