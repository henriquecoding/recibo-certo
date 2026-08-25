// ═══════════════════════════════════════════════════════════════════════
//  ADEQUAÇÃO DOS MEIOS — ter não é o mesmo que poder usar
//  ---------------------------------------------------------------------
//  Este módulo é puro. Não tenta adivinhar a idade, o estado ou a
//  homologação de um meio: só distingue o que foi confirmado, o que foi
//  declarado limitado e o que ainda não foi perguntado.
//
//  ── O QUE MUDOU, E PORQUÊ ──────────────────────────────────────────
//  A primeira versão já sabia recusar uma carrinha de passageiros a um
//  trabalho de mercadorias. Não sabia recusar uma carrinha de mercadorias
//  com 300 kg de carga útil a um trabalho que pede 500 — porque a carga
//  vivia só numa faixa qualitativa, e «média» era o que a pessoa achasse
//  que era. Também não perguntava o ano da matrícula, e portanto tratava
//  uma viatura de 2004 e uma de 2023 como o mesmo meio.
//
//  Passam a contar quatro coisas que a pessoa pode declarar:
//
//   · CARGA ÚTIL em quilos, que manda sobre a faixa quando existe;
//   · DIMENSÕES da zona de carga, porque o volume não negoceia;
//   · ANO DA MATRÍCULA, que dá a periodicidade legal da inspeção;
//   · RESTRIÇÕES DE CIRCULAÇÃO, declaradas — nunca inferidas.
//
//  Nenhuma delas inventa um veredito. Os quilos e os centímetros são
//  comparações exatas contra o que o trabalho pede; a idade é uma leitura
//  da lei (DL 144/2017) e uma pergunta que passa a ser obrigatória; as
//  restrições de circulação são o que a pessoa disser que são.
// ═══════════════════════════════════════════════════════════════════════

import type {
  AtivoId,
  DetalheAtivo,
  DimensoesCargaCm,
  OpportunityContext,
} from "../contexto/tipos";
import { ATIVOS } from "../contexto/perguntas";
import type { Capacidade, RequisitoAtivo } from "./tipos";
import {
  ORDEM_CARGA,
  faixaDaCargaUtil,
  inspecaoJaEAnual,
  kgMinimosDaFaixa,
} from "./veiculos";

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

/**
 * A carga útil que uma viatura declarada representa, em quilos.
 *
 * `null` quando a pessoa não declarou nem quilos nem faixa. Quando
 * declarou as duas, os quilos ganham: são a medição, a faixa é o rótulo.
 */
function cargaUtilDeclaradaKg(detalhe: DetalheAtivo | undefined): number | null {
  const kg = detalhe?.veiculo?.cargaUtilKg;
  if (kg !== undefined && Number.isFinite(kg) && kg >= 0) return kg;
  return null;
}

/** As dimensões em falta face ao que o trabalho exige. */
function dimensoesEmFalta(
  declaradas: DimensoesCargaCm | undefined,
  exigidas: NonNullable<
    NonNullable<RequisitoAtivo["veiculo"]>["dimensaoMinimaCargaCm"]
  >,
): { insuficientes: readonly string[]; porDeclarar: readonly string[] } {
  const eixos = [
    ["comprimento", exigidas.comprimento] as const,
    ["largura", exigidas.largura] as const,
    ["altura", exigidas.altura] as const,
  ];
  const insuficientes: string[] = [];
  const porDeclarar: string[] = [];
  for (const [eixo, minimo] of eixos) {
    if (minimo === undefined) continue;
    const valor = declaradas?.[eixo];
    if (valor === undefined) porDeclarar.push(eixo);
    else if (valor < minimo) insuficientes.push(`${eixo} ${valor} cm < ${minimo} cm`);
  }
  return { insuficientes, porDeclarar };
}

function avaliarDetalhe(
  id: AtivoId,
  detalhe: DetalheAtivo | undefined,
  requisito: RequisitoAtivo,
  anoAtual: number,
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
  const declarado = detalhe.veiculo;
  const kgDeclarados = cargaUtilDeclaradaKg(detalhe);

  if (veiculo) {
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

    // ── Carga: os quilos mandam sobre a faixa ───────────────────────
    //  Uma pessoa que escreve «320 kg» respondeu melhor do que uma que
    //  escolheu «média». Comparar faixa contra faixa deitaria fora a
    //  resposta mais precisa das duas — e é exatamente nesse degrau que
    //  «tenho carrinha» deixava de ser verificável.
    if (veiculo.capacidadeCargaMinima) {
      const minimoKg = kgMinimosDaFaixa(veiculo.capacidadeCargaMinima);
      if (kgDeclarados !== null) {
        if (kgDeclarados < minimoKg) {
          return {
            ativo: id,
            estado: "inadequado",
            forca: 0,
            nota: `A carga útil declarada (${kgDeclarados} kg) fica abaixo dos ${minimoKg} kg que esta operação pede.`,
          };
        }
      } else if (
        declarado?.capacidadeCarga &&
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

    // ── Volume: o que não entra, não entra ──────────────────────────
    if (veiculo.dimensaoMinimaCargaCm) {
      const { insuficientes } = dimensoesEmFalta(
        declarado?.dimensoesCargaCm,
        veiculo.dimensaoMinimaCargaCm,
      );
      if (insuficientes.length > 0) {
        return {
          ativo: id,
          estado: "inadequado",
          forca: 0,
          nota: `A zona de carga declarada não chega para o que esta operação transporta (${insuficientes.join("; ")}).`,
        };
      }
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

  if (detalhe.veiculo?.inspecao === "nao-valida") {
    return {
      ativo: id,
      estado: "inadequado",
      forca: 0,
      nota: "A inspeção declarada não está válida; a viatura não pode sustentar a operação agora.",
    };
  }

  // ── O que ainda falta perguntar ───────────────────────────────────
  const faltaConfirmarUso = detalhe.usoProfissional !== "confirmado";
  const faltaConfirmarDisponibilidade = detalhe.disponibilidade === undefined;
  const faltaConfirmarAcesso = detalhe.acesso === undefined;

  const cargaPorDeclarar = Boolean(
    veiculo?.capacidadeCargaMinima &&
      kgDeclarados === null &&
      !declarado?.capacidadeCarga,
  );
  const dimensoesPorDeclarar =
    veiculo?.dimensaoMinimaCargaCm !== undefined &&
    dimensoesEmFalta(declarado?.dimensoesCargaCm, veiculo.dimensaoMinimaCargaCm)
      .porDeclarar.length > 0;

  const faltaConfirmarVeiculo = Boolean(
    veiculo?.prontoParaUsoProfissional &&
      (declarado?.inspecao !== "valida" ||
        (veiculo.configuracoesAceites &&
          (!declarado?.configuracao ||
            declarado.configuracao === "por-confirmar")) ||
        cargaPorDeclarar ||
        dimensoesPorDeclarar ||
        // O ano da matrícula deixou de ser opcional para um meio que vai
        // sustentar trabalho pago: sem ele não se sabe se a inspeção já é
        // anual, e «tenho carrinha» volta a não querer dizer nada.
        declarado?.anoMatricula === undefined ||
        declarado?.restricoesCirculacao === undefined ||
        declarado.restricoesCirculacao === "por-confirmar" ||
        (veiculo.lugaresMinimos !== undefined &&
          declarado?.lugares === undefined) ||
        ((veiculo.adaptacoesNecessarias?.length ?? 0) > 0 &&
          declarado?.adaptacoes === undefined)),
  );

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
      nota:
        faltaConfirmarVeiculo && declarado?.anoMatricula === undefined
          ? "O meio existe, mas falta o ano da matrícula — sem ele não se sabe com que periodicidade a inspeção é obrigatória nem o que isso custa por ano."
          : faltaConfirmarVeiculo && cargaPorDeclarar
            ? "O meio existe, mas a carga útil ainda não foi declarada; sem quilos ou faixa não é possível dizer que serve para este trabalho."
            : faltaConfirmarVeiculo && dimensoesPorDeclarar
              ? "O meio existe, mas as medidas da zona de carga ainda não foram declaradas e este trabalho é sobre volume."
              : "O meio existe, mas falta confirmar acesso, disponibilidade, legalidade ou adequação a esta utilização.",
    };
  }

  // ── Limitações que não impedem, mas custam ────────────────────────
  if (
    veiculo?.lugaresRecomendados !== undefined &&
    declarado?.lugares !== undefined &&
    declarado.lugares < veiculo.lugaresRecomendados
  ) {
    return {
      ativo: id,
      estado: "limitado",
      forca: Math.max(
        0.45,
        0.8 * (declarado.lugares / veiculo.lugaresRecomendados),
      ),
      nota: `A viatura tem ${declarado.lugares} ${declarado.lugares === 1 ? "lugar" : "lugares"}; esta operação fica limitada abaixo dos ${veiculo.lugaresRecomendados} recomendados.`,
    };
  }

  if (declarado?.restricoesCirculacao === "centro-urbano-limitado") {
    return {
      ativo: id,
      estado: "limitado",
      forca: 0.6,
      nota: "Declaraste que esta viatura tem a circulação limitada em centro urbano; o trabalho que lá acontece fica fora de alcance ou obriga a alternativa.",
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

  // ── Adequado, e com a idade dita em voz alta ──────────────────────
  //  Uma viatura antiga confirmada continua adequada. O que muda é que a
  //  inspeção já é anual, e isso é uma obrigação legal com custo — não
  //  uma opinião nossa sobre viaturas velhas.
  const disponibilidade = detalhe.disponibilidade === "parcial" ? 0.8 : 1;
  const jaAnual = veiculo
    ? inspecaoJaEAnual(declarado?.anoMatricula, declarado?.configuracao, anoAtual)
    : null;
  const notaIdade =
    jaAnual === true
      ? " Pela idade declarada, a inspeção já é anual (DL 144/2017) — conta com esse custo e com a viatura parada nesse dia."
      : "";

  return {
    ativo: id,
    estado: "adequado",
    forca: disponibilidade,
    nota:
      (disponibilidade < 1
        ? "O meio foi confirmado como adequado, mas só está disponível parte do tempo."
        : "O meio foi confirmado como adequado e disponível para esta utilização.") + notaIdade,
  };
}

export function avaliarRequisitoAtivo(
  contexto: OpportunityContext,
  requisito: RequisitoAtivo,
  anoAtual: number = new Date().getFullYear(),
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
    .map((id) =>
      avaliarDetalhe(id, contexto.detalhesAtivos?.[id], requisito, anoAtual),
    )
    .sort((a, b) => b.forca - a.forca || a.estado.localeCompare(b.estado));
  const melhor = avaliadas[0]!;
  return { requisito, alternativas: requisito.qualquerUmDe, ...melhor };
}

export function avaliarAtivosDaCapacidade(
  contexto: OpportunityContext,
  capacidade: Capacidade,
  anoAtual?: number,
): readonly AvaliacaoRequisitoAtivo[] {
  return requisitosDaCapacidade(capacidade).map((requisito) =>
    avaliarRequisitoAtivo(contexto, requisito, anoAtual),
  );
}

export function ativoImpedeExecucao(
  avaliacao: AvaliacaoRequisitoAtivo,
): boolean {
  return avaliacao.estado === "em-falta" || avaliacao.estado === "inadequado";
}

/**
 * O custo mensal declarado dos meios que esta operação usa, em euros.
 *
 * Só conta o que a pessoa escreveu. Um meio sem custo declarado devolve
 * `null` na sua parcela e fica registado como por orçamentar — não como
 * gratuito, que é a leitura que a versão anterior fazia por omissão.
 */
export function custoMensalDeclaradoDosMeios(
  contexto: OpportunityContext,
  ativos: readonly AtivoId[],
): { total: number; declarados: readonly AtivoId[]; porDeclarar: readonly AtivoId[] } {
  const unicos = [...new Set(ativos)];
  const declarados: AtivoId[] = [];
  const porDeclarar: AtivoId[] = [];
  let total = 0;
  for (const id of unicos) {
    if (!contexto.ativos.includes(id)) continue;
    const custo = contexto.detalhesAtivos?.[id]?.custoMensalEur;
    if (custo !== undefined && Number.isFinite(custo) && custo > 0) {
      total += custo;
      declarados.push(id);
    } else {
      porDeclarar.push(id);
    }
  }
  return { total, declarados, porDeclarar };
}
