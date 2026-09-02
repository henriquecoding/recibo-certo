import type { Metadata } from "next";
import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import DescobrirNegocioLazy from "@/app/ferramentas/descobrir-negocio/lazy";
import EstadoDescoberta from "./EstadoDescoberta";

/**
 * DESCOBRIR, DENTRO DO PAINEL.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ A ROTA PÚBLICA CAPTA; ESTA RETOMA (ADR-01)                           │
 * │                                                                     │
 * │ `/ferramentas/descobrir-negocio` continua a ser a landing canónica e │
 * │ indexável: tem o hero, os dossiers curados renderizados no servidor  │
 * │ e é por lá que alguém descobre que isto existe.                      │
 * │                                                                     │
 * │ O que faltava era o outro lado: quem já respondeu ao perfil e guardou │
 * │ hipóteses não tinha, no painel, sítio nenhum para voltar. O percurso  │
 * │ começava no site e morria ali.                                       │
 * │                                                                     │
 * │ Esta rota não copia o hero nem a navegação editorial, e sobretudo    │
 * │ não copia o MOTOR: é o mesmo `DescobrirNegocioApp`, no mesmo chunk   │
 * │ dinâmico, com um cabeçalho de continuidade por cima (ADR-05).       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * O que continua exclusivamente no dispositivo: perfil profundo, zona
 * detalhada, competências, restrições, entrevistas, contactos, orçamentos
 * e notas. Nada disto tem caminho para a nuvem — e não ganha um por esta
 * rota existir.
 */
export const metadata: Metadata = {
  title: "Descobrir",
};

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="O teu negócio"
      titulo="Descobrir"
      descricao="Que negócio testar, a partir do que sabes fazer e de sinais oficiais. O perfil, as análises e as hipóteses ficam neste dispositivo."
    >
      <EstadoDescoberta />
      <DescobrirNegocioLazy />
    </PaginaFerramenta>
  );
}
