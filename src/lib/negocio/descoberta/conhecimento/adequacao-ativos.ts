// ═══════════════════════════════════════════════════════════════════════
//  ADEQUAÇÃO DOS MEIOS — ter não é o mesmo que poder usar
//  ---------------------------------------------------------------------
//  Este módulo é puro. Não tenta adivinhar a idade, o estado ou a
//  homologação de um meio: só distingue o que foi confirmado, o que foi
//  declarado limitado e o que ainda não foi perguntado.
// ═══════════════════════════════════════════════════════════════════════

import type {
  AtivoId,
  CapacidadeCargaVeiculo,
  DetalheAtivo,
  OpportunityContext,
} from "../contexto/tipos";
import { ATIVOS } from "../contexto/perguntas";
import type { Capacidade, RequisitoAtivo } from "./tipos";

export type EstadoAdequacaoAtivo =
  "adequado" | "limitado" | "por-confirmar" | "em-falta" | "inadequado";

export interface AvaliacaoRequisitoAtivo {
  requisito: RequisitoAtivo;
  estado: EstadoAdequacaoAtivo;
  /** Alternativa efetivamente avaliada, quando existe. */
  ativo?: AtivoId;
  /** Alternativas que resolvem uma ausência — são OU, nunca E. */
  alternativas: readonly AtivoId[];
  /** 0–1, para o eixo de fit. Desconhecido nunca recebe crédito total. */
  forca: number;
  nota: string;
}

const ORDEM_CARGA: Readonly<Record<CapacidadeCargaVeiculo, number>> = {
  "muito-reduzida": 0,
  reduzida: 1,
  media: 2,
  elevada: 3,
};

function requisitoGenerico(id: AtivoId): RequisitoAtivo {
  return {
    qualquerUmDe: [id],
    finalidade: `Meio necessário: ${ATIVOS.find((item) => item.id === id)?.rotulo ?? id}`,
  };
}

/** Requisitos explícitos, mais os legados que ainda não foram refinados. */
export function requisitosDaCapacidade(
  capacidade: Capacidade,
): readonly RequisitoAtivo[] {
  const explicitos = [...(capacidade.requisitosAtivos ?? [])];
  const cobertos = new Set(explicitos.flatMap((item) => item.qualquerUmDe));
  for (const id of capacidade.ativosNecessarios) {
    if (!cobertos.has(id)) explicitos.push(requisitoGenerico(id));
  }
  return explicitos;
}

function avaliarDetalhe(
  id: AtivoId,
  detalhe: DetalheAtivo | undefined,
  requisito: RequisitoAtivo,
): Omit<AvaliacaoRequisitoAtivo, "requisito" | "alternativas"> {
  if (!detalhe) {
    return {
      ativo: id,
      estado: "por-confirmar",
      forca: 0.55,
      nota: "Declaraste ter este meio, mas ainda não confirmaste estado, acesso, disponibilidade e limites.",
    };
  }

  if (detalhe.estado === "precisa-reparacao") {
    return {
      ativo: id,
      estado: "inadequado",
      forca: 0,
      nota: "O meio precisa de reparação antes de poder sustentar esta atividade.",
    };
  }
  if (detalhe.usoProfissional === "nao") {
    return {
      ativo: id,
      estado: "inadequado",
      forca: 0,
      nota: "Declaraste que este meio não pode ser usado profissionalmente.",
    };
  }

  const veiculo = requisito.veiculo;
  if (veiculo) {
    const declarado = detalhe.veiculo;
    if (
      declarado?.configuracao &&
      declarado.configuracao !== "por-confirmar" &&
      veiculo.configuracoesAceites &&
      !veiculo.configuracoesAceites.includes(declarado.configuracao)
    ) {
      return {
        ativo: id,
        estado: "inadequado",
        forca: 0,
        nota: "A configuração declarada da viatura não serve o transporte exigido.",
      };
    }
    if (
      declarado?.capacidadeCarga &&
      veiculo.capacidadeCargaMinima &&
      ORDEM_CARGA[declarado.capacidadeCarga] <
        ORDEM_CARGA[veiculo.capacidadeCargaMinima]
    ) {
      return {
        ativo: id,
        estado: "inadequado",
        forca: 0,
        nota: "A capacidade de carga declarada fica abaixo do que esta operação pede.",
      };
    }
    if (
      declarado?.lugares !== undefined &&
      veiculo.lugaresMinimos !== undefined &&
      declarado.lugares < veiculo.lugaresMinimos
    ) {
      return {
        ativo: id,
        estado: "inadequado",
        forca: 0,
        nota: "A viatura não tem lugares suficientes para esta operação.",
      };
    }
    if (
      declarado?.adaptacoes &&
      veiculo.adaptacoesNecessarias?.some(
        (adaptacao) => !declarado.adaptacoes?.includes(adaptacao),
      )
    ) {
      return {
        ativo: id,
        estado: "inadequado",
        forca: 0,
        nota: "Falta uma adaptação que esta operação exige.",
      };
    }
  }

  const faltaConfirmarUso = detalhe.usoProfissional !== "confirmado";
  const faltaConfirmarDisponibilidade = detalhe.disponibilidade === undefined;
  const faltaConfirmarAcesso = detalhe.acesso === undefined;
  const faltaConfirmarVeiculo = Boolean(
    veiculo?.prontoParaUsoProfissional &&
    (detalhe.veiculo?.inspecao !== "valida" ||
      (veiculo.configuracoesAceites &&
        (!detalhe.veiculo?.configuracao ||
          detalhe.veiculo.configuracao === "por-confirmar")) ||
      (veiculo.capacidadeCargaMinima && !detalhe.veiculo?.capacidadeCarga) ||
      (veiculo.lugaresMinimos !== undefined &&
        detalhe.veiculo?.lugares === undefined) ||
      ((veiculo.adaptacoesNecessarias?.length ?? 0) > 0 &&
        detalhe.veiculo?.adaptacoes === undefined)),
  );

  if (detalhe.veiculo?.inspecao === "nao-valida") {
    return {
      ativo: id,
      estado: "inadequado",
      forca: 0,
      nota: "A inspeção declarada não está válida; a viatura não pode sustentar a operação agora.",
    };
  }

  if (
    faltaConfirmarUso ||
    faltaConfirmarDisponibilidade ||
    faltaConfirmarAcesso ||
    faltaConfirmarVeiculo ||
    detalhe.estado === "por-confirmar"
  ) {
    return {
      ativo: id,
      estado: "por-confirmar",
      forca: 0.55,
      nota: "O meio existe, mas falta confirmar acesso, disponibilidade, legalidade ou adequação a esta utilização.",
    };
  }

  if (
    veiculo?.lugaresRecomendados !== undefined &&
    detalhe.veiculo?.lugares !== undefined &&
    detalhe.veiculo.lugares < veiculo.lugaresRecomendados
  ) {
    return {
      ativo: id,
      estado: "limitado",
      forca: Math.max(
        0.45,
        0.8 * (detalhe.veiculo.lugares / veiculo.lugaresRecomendados),
      ),
      nota: `A viatura tem ${detalhe.veiculo.lugares} ${detalhe.veiculo.lugares === 1 ? "lugar" : "lugares"}; esta operação fica limitada abaixo dos ${veiculo.lugaresRecomendados} recomendados.`,
    };
  }

  if (
    detalhe.estado === "funcional-com-limitacoes" ||
    detalhe.disponibilidade === "ocasional" ||
    detalhe.acesso === "partilhado" ||
    detalhe.acesso === "alugado" ||
    detalhe.acesso === "por-reservar" ||
    (detalhe.limitacoes?.length ?? 0) > 0
  ) {
    const forcaAcesso =
      detalhe.acesso === "por-reservar"
        ? 0.4
        : detalhe.acesso === "partilhado"
          ? 0.55
          : detalhe.acesso === "alugado"
            ? 0.75
            : 0.6;
    return {
      ativo: id,
      estado: "limitado",
      forca: detalhe.disponibilidade === "ocasional" ? 0.35 : forcaAcesso,
      nota:
        detalhe.acesso === "por-reservar"
          ? "O meio pode servir, mas a operação depende de conseguir reservá-lo quando houver trabalho."
          : detalhe.acesso === "partilhado"
            ? "O meio pode servir, mas o acesso partilhado reduz a disponibilidade operacional garantida."
            : detalhe.acesso === "alugado"
              ? "O meio pode servir, mas depende de aluguer e esse custo operacional ainda tem de ser confirmado."
              : "O meio pode ajudar, mas as limitações declaradas reduzem a capacidade real de execução.",
    };
  }

  const disponibilidade = detalhe.disponibilidade === "parcial" ? 0.8 : 1;
  return {
    ativo: id,
    estado: "adequado",
    forca: disponibilidade,
    nota:
      disponibilidade < 1
        ? "O meio foi confirmado como adequado, mas só está disponível parte do tempo."
        : "O meio foi confirmado como adequado e disponível para esta utilização.",
  };
}

export function avaliarRequisitoAtivo(
  contexto: OpportunityContext,
  requisito: RequisitoAtivo,
): AvaliacaoRequisitoAtivo {
  const presentes = requisito.qualquerUmDe.filter((id) =>
    contexto.ativos.includes(id),
  );
  if (presentes.length === 0) {
    return {
      requisito,
      alternativas: requisito.qualquerUmDe,
      estado: "em-falta",
      forca: 0,
      nota:
        requisito.qualquerUmDe.length > 1
          ? "Falta um dos meios alternativos que tornam esta operação possível."
          : "Falta um meio necessário para executar esta operação.",
    };
  }

  const avaliadas = presentes
    .map((id) => avaliarDetalhe(id, contexto.detalhesAtivos?.[id], requisito))
    .sort((a, b) => b.forca - a.forca || a.estado.localeCompare(b.estado));
  const melhor = avaliadas[0]!;
  return { requisito, alternativas: requisito.qualquerUmDe, ...melhor };
}

export function avaliarAtivosDaCapacidade(
  contexto: OpportunityContext,
  capacidade: Capacidade,
): readonly AvaliacaoRequisitoAtivo[] {
  return requisitosDaCapacidade(capacidade).map((requisito) =>
    avaliarRequisitoAtivo(contexto, requisito),
  );
}

export function ativoImpedeExecucao(
  avaliacao: AvaliacaoRequisitoAtivo,
): boolean {
  return avaliacao.estado === "em-falta" || avaliacao.estado === "inadequado";
}
