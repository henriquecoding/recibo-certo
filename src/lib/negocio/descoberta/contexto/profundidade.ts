// ═══════════════════════════════════════════════════════════════════════
//  PROFUNDIDADE DO CONTEXTO — «quanto já conhecemos do teu cenário»
//  ---------------------------------------------------------------------
//  Ponto 6 do pedido, com o aviso que o acompanha: isto NÃO é precisão
//  estatística e não se pode chamar «precisão do perfil». É a fração do
//  que o motor sabe perguntar que já foi respondida — nada mais.
//
//  A distinção não é cosmética. «Precisão 82 %» sugere que a resposta
//  está 82 % certa; «conhecemos 82 % do teu cenário» diz a verdade: que
//  ainda faltam 18 % das respostas que mudariam o resultado.
// ═══════════════════════════════════════════════════════════════════════

import type { OpportunityContext } from "./tipos";

export interface CampoDeProfundidade {
  id: string;
  rotulo: string;
  /** Quanto vale para o resultado. Nem todas as respostas contam igual. */
  peso: number;
  respondido: (contexto: OpportunityContext) => boolean;
  /** O que muda no resultado quando esta resposta existe. */
  efeito: string;
}

export const CAMPOS_PROFUNDIDADE: readonly CampoDeProfundidade[] = Object.freeze([
  {
    id: "competencias",
    rotulo: "O que sabes fazer",
    peso: 20,
    respondido: (contexto) => contexto.competencias.length > 0,
    efeito: "Sem isto o motor não consegue compor hipótese nenhuma — é o ponto de partida do grafo.",
  },
  {
    id: "regiao",
    rotulo: "Onde vais operar",
    peso: 12,
    respondido: (contexto) => contexto.localizacao.regiao !== "portugal",
    efeito: "Decide que leituras oficiais são da tua zona e quais entram como contexto nacional.",
  },
  {
    id: "capital",
    rotulo: "Capital disponível",
    peso: 12,
    respondido: (contexto) =>
      contexto.capital.disponivelAgora !== undefined ||
      contexto.capital.maximo !== undefined ||
      contexto.capital.precisaComecarSemCapital === true,
    efeito: "Elimina modelos que não arrancam com o que tens, em vez de os mostrar em nono lugar.",
  },
  {
    id: "ativos",
    rotulo: "Adequação do que já tens",
    peso: 12,
    respondido: (contexto) =>
      contexto.ativos.length > 0 &&
      contexto.ativos.every((id) => {
        const detalhe = contexto.detalhesAtivos?.[id];
        return (
          detalhe !== undefined &&
          detalhe.estado !== "por-confirmar" &&
          detalhe.disponibilidade !== undefined &&
          detalhe.acesso !== undefined &&
          detalhe.usoProfissional !== undefined &&
          detalhe.usoProfissional !== "por-confirmar"
        );
      }),
    efeito:
      "Estado, acesso, disponibilidade e capacidade decidem se uma carrinha, terreno ou cozinha abrem mesmo uma hipótese — presença sozinha não chega.",
  },
  {
    id: "tempo",
    rotulo: "Tempo disponível",
    peso: 8,
    respondido: (contexto) => contexto.tempo.horasSemana !== undefined || contexto.tempo.dedicacao === "integral",
    efeito: "Modelos com equipa ou espaço não cabem em poucas horas por semana.",
  },
  {
    id: "prazo",
    rotulo: "Prazo até à primeira receita",
    peso: 8,
    respondido: (contexto) => contexto.tempo.prazoMaxPrimeiraReceitaMeses !== undefined,
    efeito: "Descarta o que só paga daqui a um ano quando aguentas três meses.",
  },
  {
    id: "restricoes",
    rotulo: "O que não queres ou não podes",
    peso: 10,
    respondido: (contexto) => contexto.restricoes.length > 0,
    efeito: "É o que faz o motor recusar em vez de ordenar.",
  },
  {
    id: "preferencias",
    rotulo: "Que tipo de negócio aceitas",
    peso: 8,
    respondido: (contexto) =>
      contexto.preferencias.mercado !== "indiferente" ||
      contexto.preferencias.receita !== "indiferente" ||
      contexto.preferencias.setoresPreferidos.length > 0,
    efeito: "Aproxima o resultado do que procuras, em vez de o espalhar por tudo.",
  },
  {
    id: "risco",
    rotulo: "Tolerância ao risco",
    peso: 5,
    respondido: (contexto) => contexto.risco.toleranciaPorDimensao !== undefined,
    efeito: "Compara cada risco com o que declaraste aceitar, dimensão a dimensão.",
  },
  {
    id: "rendimento",
    rotulo: "Quanto queres ganhar",
    peso: 5,
    respondido: (contexto) => contexto.rendimento.minimoMensal !== undefined,
    // A promessa desta frase esteve por cumprir durante muito tempo: o
    // campo valia 5 pontos de profundidade, a frase dizia «confronta», e
    // nenhuma linha do motor lia `minimoMensal`. Confronta agora, e o
    // confronto é o que aqui se descreve — não uma projeção de receita.
    efeito:
      "Soma o que precisas de tirar ao custo fixo do modelo e diz quanto a operação tem de gerar por mês antes de te pagar.",
  },
  {
    id: "concelho",
    rotulo: "Concelho",
    peso: 10,
    respondido: (contexto) => contexto.localizacao.concelho !== undefined,
    efeito:
      "A contagem de concorrentes passa a comparar-se entre os 308 concelhos em vez das nove regiões — e a diferença é grande: Lisboa tem 8,3 empresas de limpeza por dez mil habitantes e Mafra 23,8.",
  },
  {
    id: "territorio",
    rotulo: "Tipo de território",
    peso: 6,
    respondido: (contexto) => contexto.localizacao.territorio !== undefined,
    efeito:
      "Urbano, suburbano ou rural é o que mais muda que negócio funciona — e há problemas que só são intensos num deles.",
  },
]);

const PESO_TOTAL = CAMPOS_PROFUNDIDADE.reduce((total, campo) => total + campo.peso, 0);

export interface Profundidade {
  /** 0–100. Fração das respostas que existem, ponderada pelo efeito. */
  percentagem: number;
  respondidos: readonly CampoDeProfundidade[];
  /** O que falta, por ordem do que mais mudaria o resultado. */
  emFalta: readonly CampoDeProfundidade[];
  /** Há o mínimo para o motor correr? */
  suficienteParaCorrer: boolean;
}

export function profundidadeDoContexto(contexto: OpportunityContext): Profundidade {
  const respondidos = CAMPOS_PROFUNDIDADE.filter((campo) => campo.respondido(contexto));
  const emFalta = CAMPOS_PROFUNDIDADE.filter((campo) => !campo.respondido(contexto)).sort(
    (esquerda, direita) => direita.peso - esquerda.peso,
  );
  const soma = respondidos.reduce((total, campo) => total + campo.peso, 0);

  return {
    percentagem: Math.round((soma / PESO_TOTAL) * 100),
    respondidos,
    emFalta,
    // O mínimo absoluto é saber o que a pessoa sabe fazer. Sem isso o
    // grafo não tem por onde começar, e o motor não corre.
    suficienteParaCorrer: contexto.competencias.length > 0,
  };
}
