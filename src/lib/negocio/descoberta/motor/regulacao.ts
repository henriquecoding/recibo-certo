// ═══════════════════════════════════════════════════════════════════════
//  REGULAÇÃO — nomear o requisito sem legislar
//  ---------------------------------------------------------------------
//  A regra é a do ponto 43: não afirmar automaticamente que uma licença é
//  obrigatória sem fonte confiável. O que o motor faz é NOMEAR o
//  requisito, dizer quem decide e apontar onde confirmar — que é o que
//  uma pessoa precisa antes de investir, e é tudo o que podemos afirmar.
// ═══════════════════════════════════════════════════════════════════════

import { REGULACAO_POR_ID } from "../conhecimento/grafo";
import type { Regulacao } from "../conhecimento/tipos";
import type { CandidatoBruto } from "./gerador";
import type { AvaliacaoRegulatoria } from "./tipos";

export function avaliarRegulacao(candidato: CandidatoBruto): AvaliacaoRegulatoria {
  const requisitos: Regulacao[] = [];
  for (const id of candidato.problema.regulacoes) {
    const regulacao = REGULACAO_POR_ID.get(id);
    if (regulacao) requisitos.push(regulacao);
  }

  // O modelo acrescenta requisitos que o problema não tem: quem monta
  // equipa passa a ter obrigações laborais, quem vende à distância passa
  // a ter obrigações de informação pré-contratual.
  const acrescentar = (id: string) => {
    const regulacao = REGULACAO_POR_ID.get(id);
    if (regulacao && !requisitos.some((item) => item.id === id)) requisitos.push(regulacao);
  };
  if (candidato.modelo.precisaEquipa) {
    acrescentar("acidentes-trabalho");
    acrescentar("cedencia-trabalhadores");
  }
  if (candidato.modelo.id === "loja-online" || candidato.modelo.id === "produto-digital") {
    acrescentar("comercio-eletronico");
  }
  if (candidato.modelo.precisaStock && candidato.problema.setor === "alimentar") {
    acrescentar("rotulagem");
  }

  const severidadeMaxima = requisitos.reduce((maior, item) => Math.max(maior, item.severidade), 0);
  // A barreira é a severidade máxima, com um agravamento quando há muitos
  // requisitos a acumular: três requisitos de nível 1 não são um de nível
  // 3, mas também não são um de nível 1.
  const agravamento = requisitos.length >= 4 ? 1 : 0;
  const barreira = Math.min(3, severidadeMaxima + agravamento) as 0 | 1 | 2 | 3;

  return {
    requisitos,
    barreira,
    temIncerteza: requisitos.some((item) => item.obrigatorio === null),
  };
}
