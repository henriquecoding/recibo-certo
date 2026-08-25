import type { AtivoId, DetalheAtivo } from "./tipos";

export type EstadoAdequacaoDeclarada =
  "confirmado" | "limitado" | "por-confirmar" | "inadequado";

const VIATURAS: ReadonlySet<AtivoId> = new Set([
  "veiculo-ligeiro",
  "veiculo-carga",
]);

/**
 * Estado do que a pessoa declarou, antes de o cruzar com uma operação
 * concreta. É partilhado pelo badge e pelo resumo para não chamar
 * “confirmado” ao que o motor trata como limitado ou incompatível.
 */
export function estadoDaAdequacaoDeclarada(
  id: AtivoId,
  detalhe: DetalheAtivo | undefined,
): EstadoAdequacaoDeclarada {
  if (!detalhe) return "por-confirmar";

  if (
    detalhe.estado === "precisa-reparacao" ||
    detalhe.usoProfissional === "nao" ||
    detalhe.veiculo?.inspecao === "nao-valida"
  ) {
    return "inadequado";
  }

  if (
    detalhe.estado === "por-confirmar" ||
    detalhe.disponibilidade === undefined ||
    detalhe.acesso === undefined ||
    detalhe.usoProfissional !== "confirmado"
  ) {
    return "por-confirmar";
  }

  if (
    VIATURAS.has(id) &&
    (!detalhe.veiculo?.configuracao ||
      detalhe.veiculo.configuracao === "por-confirmar" ||
      detalhe.veiculo.lugares === undefined ||
      detalhe.veiculo.capacidadeCarga === undefined ||
      detalhe.veiculo.inspecao !== "valida")
  ) {
    return "por-confirmar";
  }

  if (
    detalhe.estado === "funcional-com-limitacoes" ||
    detalhe.disponibilidade === "ocasional" ||
    detalhe.acesso !== "proprio" ||
    (detalhe.limitacoes?.length ?? 0) > 0
  ) {
    return "limitado";
  }

  return "confirmado";
}
