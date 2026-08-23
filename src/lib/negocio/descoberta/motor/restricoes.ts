// ═══════════════════════════════════════════════════════════════════════
//  RESTRIÇÕES — o que ELIMINA, e porquê
//  ---------------------------------------------------------------------
//  O motor antigo só sabia preferir. Este sabe recusar, e guarda o motivo:
//  «Lavandaria self-service — boa procura, mas investimento superior ao
//  teu limite» é mais útil do que a ausência silenciosa da lavandaria.
//
//  A diferença entre eliminar e penalizar é a diferença entre um motor
//  que decide e um que ordena. Uma pessoa que diz «não tenho carro» não
//  quer ver rotas de entregas em nono lugar: quer não as ver.
//
//  Cada restrição devolve `null` quando não se aplica, ou o descarte
//  completo — com o que teria de mudar para deixar de se aplicar. Essa
//  segunda parte é o que alimenta o motor de «e se».
// ═══════════════════════════════════════════════════════════════════════

import {
  horasSemanais,
  pessoasDisponiveis,
  temRestricao,
  tetoDeCapital,
  toleranciaDe,
  type OpportunityContext,
} from "../contexto/tipos";
import type { CandidatoBruto } from "./gerador";
import type { CandidatoDescartado, MotivoDescarte } from "./tipos";

type Regra = (
  candidato: CandidatoBruto,
  contexto: OpportunityContext,
) => { motivo: MotivoDescarte; explicacao: string; oQueMudaria?: string } | null;

/** Horas por semana abaixo das quais um modelo com equipa não arranca. */
const HORAS_MINIMAS_OPERACAO = 25;

const REGRAS: readonly Regra[] = Object.freeze<readonly Regra[]>([
  // ── Restrições declaradas ──────────────────────────────────────────
  (candidato, contexto) =>
    temRestricao(contexto, "sem-empregados") && candidato.modelo.precisaEquipa
      ? {
          motivo: "restricao",
          explicacao: `${candidato.modelo.rotulo} depende de equipa desde o primeiro dia, e disseste que não queres empregados.`,
          oQueMudaria: "Aceitar contratar, ou atacar o mesmo problema por um modelo que não precise de equipa.",
        }
      : null,

  (candidato, contexto) =>
    temRestricao(contexto, "sem-loja-fisica") && candidato.modelo.precisaLojaFisica
      ? {
          motivo: "restricao",
          explicacao: `${candidato.modelo.rotulo} vive de um espaço aberto ao público, e disseste que não queres loja física.`,
          oQueMudaria: "Aceitar espaço próprio, ou o mesmo problema num modelo sem espaço.",
        }
      : null,

  (candidato, contexto) =>
    temRestricao(contexto, "sem-stock") && candidato.modelo.precisaStock
      ? {
          motivo: "restricao",
          explicacao: `${candidato.modelo.rotulo} obriga a comprar antes de vender, e disseste que não queres stock.`,
          oQueMudaria: "Aceitar stock, ou vender serviço em vez de produto.",
        }
      : null,

  (candidato, contexto) =>
    temRestricao(contexto, "sem-carro") &&
    candidato.capacidades.some((item) =>
      item.capacidade.ativosNecessarios.some((ativo) => ativo.startsWith("veiculo")),
    )
      ? {
          motivo: "restricao",
          explicacao: "Isto vive de deslocações com veículo próprio, e disseste que não tens carro.",
          oQueMudaria: "Ter acesso a um veículo, ou escolher trabalho que se faça a pé ou à distância.",
        }
      : null,

  (candidato, contexto) =>
    temRestricao(contexto, "sem-carregar-peso") &&
    candidato.capacidades.some((item) => item.capacidade.esforcoFisico)
      ? {
          motivo: "restricao",
          explicacao: "O trabalho envolve esforço físico continuado, e declaraste que não podes carregar peso.",
          oQueMudaria: "Delegar a parte física a alguém, o que muda o modelo e o capital.",
        }
      : null,

  (candidato, contexto) =>
    temRestricao(contexto, "sem-trabalho-fisico") &&
    candidato.capacidades.every((item) => item.capacidade.esforcoFisico)
      ? {
          motivo: "restricao",
          explicacao: "Todas as capacidades que este problema pede são de trabalho físico.",
          oQueMudaria: "Aceitar trabalho físico, ou procurar problemas que se resolvam à secretária.",
        }
      : null,

  (candidato, contexto) =>
    (temRestricao(contexto, "sem-atendimento-presencial") || temRestricao(contexto, "sem-deslocacoes")) &&
    candidato.entrega === "presencial"
      ? {
          motivo: "restricao",
          explicacao: "Esta forma de entrega é presencial, e recusaste atendimento presencial ou deslocações.",
          oQueMudaria: "Aceitar a variante híbrida, quando o problema a admitir.",
        }
      : null,

  (candidato, contexto) =>
    temRestricao(contexto, "sem-alimentos") && candidato.problema.setor === "alimentar"
      ? {
          motivo: "restricao",
          explicacao: "É um problema do setor alimentar, e disseste que não queres trabalhar com alimentos.",
        }
      : null,

  (candidato, contexto) =>
    temRestricao(contexto, "sem-atividade-regulada") &&
    candidato.problema.regulacoes.length >= 2
      ? {
          motivo: "regulacao",
          explicacao:
            "Isto acumula requisitos regulatórios — licenciamento, seguros ou habilitação — e pediste para evitar atividade regulada.",
          oQueMudaria: "Aceitar tratar de licenciamento, que costuma ser o que protege a margem de quem o faz.",
        }
      : null,

  // ── A sazonalidade semanal deixa de ser uma lista de ids ──────────
  //  Isto comparava com três identificadores escritos à mão. Um problema
  //  novo com procura ao sábado passava incólume e ninguém dava por
  //  isso — que é precisamente o modo de falha mais perigoso do grafo:
  //  silencioso, plausível e sem teste que o apanhe. `procuraFimDeSemana`
  //  é agora um campo OBRIGATÓRIO de `Problema`, e é o compilador que
  //  obriga a responder a cada problema que entre.
  (candidato, contexto) =>
    temRestricao(contexto, "sem-fins-de-semana") && candidato.problema.procuraFimDeSemana
      ? {
          motivo: "restricao",
          explicacao: "A procura deste problema concentra-se ao fim de semana, e excluíste fins de semana.",
          oQueMudaria: "Aceitar trabalhar ao fim de semana, ou atacar um problema com procura distribuída pela semana.",
        }
      : null,

  // ── Capital ────────────────────────────────────────────────────────
  (candidato, contexto) => {
    const teto = tetoDeCapital(contexto);
    if (teto === undefined) return null;
    const minimo = candidato.modelo.capitalTipico.min;
    if (minimo <= teto) return null;
    // `aberturaInvestidores` era recolhida e nunca lida. NÃO alarga o
    // teto — dinheiro de terceiros que ainda não existe não é capital
    // disponível, e alargar por causa de uma intenção seria inventar
    // meios. O que faz é mudar o caminho de saída que se propõe.
    const caminho = contexto.capital.aberturaInvestidores
      ? `Ter cerca de ${minimo.toLocaleString("pt-PT")} € disponíveis. Disseste estar aberto a investidores, e esta é das hipóteses em que essa abertura muda mesmo o que é possível — mas só depois de o dinheiro entrar, não antes.`
      : `Ter cerca de ${minimo.toLocaleString("pt-PT")} € disponíveis, ou atacar o mesmo problema por um modelo mais leve.`;
    return {
      motivo: "capital",
      explicacao: `Este modelo raramente arranca abaixo de ${minimo.toLocaleString("pt-PT")} €, e o teto que declaraste é ${teto.toLocaleString("pt-PT")} €.`,
      oQueMudaria: caminho,
    };
  },

  (candidato, contexto) =>
    contexto.capital.precisaComecarSemCapital && candidato.modelo.capitalTipico.min > 500
      ? {
          motivo: "capital",
          explicacao: "Disseste que precisas de começar praticamente sem capital, e este modelo não o permite.",
          oQueMudaria: "Juntar algum capital inicial, ou começar pelo modelo mais leve do mesmo problema.",
        }
      : null,

  (candidato, contexto) =>
    temRestricao(contexto, "sem-financiamento") && candidato.modelo.capitalTipico.min > (tetoDeCapital(contexto) ?? Number.POSITIVE_INFINITY)
      ? {
          motivo: "capital",
          explicacao: "Só arrancaria com financiamento, e recusaste financiamento.",
        }
      : null,

  // ── Prazo ──────────────────────────────────────────────────────────
  (candidato, contexto) => {
    const prazo = contexto.tempo.prazoMaxPrimeiraReceitaMeses;
    if (prazo === undefined) return null;
    const minimo = candidato.modelo.tempoAteReceitaMeses.min;
    if (minimo <= prazo) return null;
    return {
      motivo: "prazo",
      explicacao: `Mesmo no melhor caso este modelo demora ${minimo} ${minimo === 1 ? "mês" : "meses"} até à primeira receita, e disseste que aguentas ${prazo}.`,
      oQueMudaria: "Alargar o prazo, ou escolher um modelo que cobre mais cedo — sessão avulsa ou lote pequeno.",
    };
  },

  // ── Tempo e equipa ─────────────────────────────────────────────────
  (candidato, contexto) =>
    candidato.modelo.precisaEquipa &&
    pessoasDisponiveis(contexto) === 1 &&
    contexto.equipa.disponibilidadeContratar !== true
      ? {
          motivo: "equipa",
          explicacao: "Este modelo precisa de mais do que uma pessoa e não declaraste disponibilidade para contratar.",
          oQueMudaria: "Aceitar contratar, ou entrar com sócio.",
        }
      : null,

  (candidato, contexto) =>
    candidato.modelo.precisaEquipa && horasSemanais(contexto) < HORAS_MINIMAS_OPERACAO
      ? {
          motivo: "equipa",
          explicacao: `Gerir uma operação com equipa não cabe em ${horasSemanais(contexto)} horas por semana.`,
          oQueMudaria: "Aumentar a dedicação, ou escolher um modelo que uma pessoa consiga sozinha.",
        }
      : null,

  // ── Preferências fortes ────────────────────────────────────────────
  (candidato, contexto) =>
    contexto.preferencias.mercado !== "indiferente" &&
    candidato.problema.mercado !== contexto.preferencias.mercado &&
    // «Ambos» não existe como valor: quem quer os dois escolhe indiferente.
    !(contexto.preferencias.mercado === "b2b" && candidato.problema.mercado === "b2g")
      ? {
          motivo: "preferencia",
          explicacao: `Pediste ${contexto.preferencias.mercado.toUpperCase()} e este problema é de quem vende ${candidato.problema.mercado.toUpperCase()}.`,
          oQueMudaria: `Aceitar também ${candidato.problema.mercado.toUpperCase()}.`,
        }
      : null,

  (candidato, contexto) =>
    contexto.preferencias.formato === "digital" && candidato.entrega === "presencial"
      ? {
          motivo: "preferencia",
          explicacao: "Pediste negócio digital e esta variante é presencial.",
          oQueMudaria: "Aceitar formato híbrido.",
        }
      : null,

  (candidato, contexto) =>
    contexto.preferencias.formato === "fisico" && candidato.entrega === "remoto"
      ? {
          motivo: "preferencia",
          explicacao: "Pediste negócio físico e esta variante é remota.",
          oQueMudaria: "Aceitar formato híbrido.",
        }
      : null,

  (candidato, contexto) =>
    contexto.preferencias.naturezas.length > 0 &&
    !candidato.problema.naturezas.some((item) => contexto.preferencias.naturezas.includes(item))
      ? {
          motivo: "preferencia",
          explicacao: "A natureza da oferta não é nenhuma das que escolheste.",
        }
      : null,

  (candidato, contexto) =>
    contexto.preferencias.setoresPreferidos.length > 0 &&
    !contexto.preferencias.setoresPreferidos.includes(candidato.problema.setor)
      ? {
          motivo: "preferencia",
          explicacao: "O setor não é nenhum dos que escolheste.",
          oQueMudaria: "Alargar os setores de interesse.",
        }
      : null,

  (candidato, contexto) =>
    contexto.preferencias.receita !== "indiferente" &&
    candidato.modelo.padrao !== contexto.preferencias.receita &&
    // Contratos são uma forma de receita recorrente: quem pede recorrente
    // não está a recusar um contrato anual.
    !(contexto.preferencias.receita === "recorrente" && candidato.modelo.padrao === "contratos")
      ? {
          motivo: "preferencia",
          explicacao: `Preferes receita ${contexto.preferencias.receita} e este modelo é ${candidato.modelo.padrao}.`,
        }
      : null,

  // ── Risco ──────────────────────────────────────────────────────────
  (candidato, contexto) => {
    // Um perfil muito conservador não deve receber, no topo, um problema
    // com três riscos próprios e sazonalidade concentrada. Não é uma
    // penalização: é uma incompatibilidade declarada.
    if (toleranciaDe(contexto, "financeiro") > 0) return null;
    if (candidato.problema.sazonalidade < 3 && candidato.modelo.capitalTipico.min < 3000) return null;
    return {
      motivo: "risco",
      explicacao:
        "Declaraste perfil muito conservador, e isto junta capital significativo com procura concentrada em poucos meses.",
      oQueMudaria: "Aceitar mais risco financeiro, ou escolher algo com procura distribuída pelo ano.",
    };
  },
]);

export interface ResultadoRestricoes {
  aprovados: readonly CandidatoBruto[];
  descartados: readonly CandidatoDescartado[];
}

/**
 * Aplica as regras. A PRIMEIRA que dispara é a que fica registada — as
 * pessoas leem um motivo, não uma lista de sete.
 */
export function aplicarRestricoes(
  candidatos: readonly CandidatoBruto[],
  contexto: OpportunityContext,
): ResultadoRestricoes {
  const aprovados: CandidatoBruto[] = [];
  const descartados: CandidatoDescartado[] = [];

  for (const candidato of candidatos) {
    let descarte: ReturnType<Regra> = null;
    for (const regra of REGRAS) {
      descarte = regra(candidato, contexto);
      if (descarte) break;
    }
    if (descarte) {
      descartados.push({ id: candidato.id, titulo: candidato.titulo, ...descarte });
    } else {
      aprovados.push(candidato);
    }
  }

  return { aprovados, descartados };
}

/** Quantas regras existem. Serve a telemetria e o teste de cobertura. */
export const TOTAL_REGRAS = REGRAS.length;
