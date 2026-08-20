// ═══════════════════════════════════════════════════════════════════════
//  CONTRATAR: AGORA, MAIS TARDE, OU NÃO — §88-90
//  ---------------------------------------------------------------------
//  Depois de o custo e a capacidade estarem os dois no modelo (§25-27 e
//  §39-40), a contratação deixa de ser um número e passa a poder ser uma
//  DECISÃO. Faltava a pergunta:
//
//      «E se eu contratar daqui a seis meses, em vez de já?»
//
//  Três cenários, o mesmo negócio, quatro respostas: resultado,
//  capacidade, ponto de equilíbrio e capital necessário. Não há um
//  vencedor — há um trade-off, e a ferramenta mostra-o em vez de o
//  resolver por alguém.
//
//  ── O QUE ESTE MÓDULO NÃO FAZ ──────────────────────────────────────
//  Recomendar. Contratar mais tarde poupa dinheiro E deixa procura por
//  servir; contratar já custa E permite entregar. Qual dos dois vale mais
//  depende de coisas que o modelo não sabe — se a procura espera, se a
//  pessoa certa está disponível daqui a seis meses, quanto vale um
//  cliente perdido. §80: apresentar um ótimo matemático como conselho é
//  esconder tudo isso.
//
//  ── E O CUSTO POR HORA PRODUTIVA (§89) ─────────────────────────────
//  É a ponte de volta para a pricing engine: um preço por hora que não
//  cobre o custo por hora do posto que o entrega é um preço que perde
//  dinheiro em cada venda, e nenhum dos dois motores o via sozinho.
// ═══════════════════════════════════════════════════════════════════════

import { cent, dividir, num } from "@/lib/pricing/numeros";
import { analisarNegocio } from "./viabilidade";
import { custosDosPostos } from "./agregar";
import { horasProdutivasDoPosto } from "./capacidade";
import type { ContextoNegocio, ResultadoNegocio, TrabalhadorPlaneado } from "./tipos";

// ─── O custo por hora produtiva (§89) ──────────────────────────────────

export interface CustoPorHora {
  trabalhadorId: string;
  funcao: string;
  /** Custo anual completo do posto, com encargos e extras. */
  custoAnual: number;
  /** Horas faturáveis por ano, já sem férias nem formação. */
  horasAno: number;
  /** custoAnual ÷ horasAno. `null` quando o posto não produz horas. */
  custoHora: number | null;
}

/**
 * O custo de cada hora que a equipa consegue faturar.
 *
 * ⚠️ AS HORAS SÃO AS PRODUTIVAS, não as contratadas. Dividir o custo por
 * 40 h × 52 semanas dá um número 25% abaixo da verdade — as férias e a
 * formação obrigatória existem, e as horas não faturáveis também.
 *
 * `null` para um posto que não foi declarado como produtivo: um
 * administrativo não tem custo por hora faturável porque não fatura
 * horas, e inventar-lhe um daria um número que não significa nada.
 */
export function custoPorHoraDaEquipa(contexto: ContextoNegocio): CustoPorHora[] {
  return custosDosPostos(contexto.estrutura).map(({ trabalhador: t, custo }) => {
    const horasAno = cent(horasProdutivasDoPosto(t) * 12);
    return {
      trabalhadorId: t.id,
      funcao: t.funcao?.trim() || "posto sem nome",
      custoAnual: custo.empresa.custoAnual,
      horasAno,
      custoHora: horasAno > 0 ? cent(dividir(custo.empresa.custoAnual, horasAno)) : null,
    };
  });
}

/**
 * O custo médio por hora produtiva da equipa inteira.
 *
 * `null` quando ninguém produz horas — e é `null`, não zero: zero seria
 * uma resposta, e a resposta certa é «esta pergunta não se aplica».
 */
export function custoMedioPorHora(contexto: ContextoNegocio): number | null {
  const postos = custoPorHoraDaEquipa(contexto).filter((p) => p.custoHora !== null);
  if (postos.length === 0) return null;

  const custo = postos.reduce((s, p) => s + p.custoAnual, 0);
  const horas = postos.reduce((s, p) => s + p.horasAno, 0);
  return horas > 0 ? cent(dividir(custo, horas)) : null;
}

// ─── Contratar agora, depois, ou não (§88) ─────────────────────────────

export type QuandoContratar = "nunca" | "agora" | "depois";

export interface CenarioContratacao {
  quando: QuandoContratar;
  rotulo: string;
  /** Mês de entrada usado neste cenário. `null` quando não se contrata. */
  inicioMes: number | null;
  resultadoOperacionalMes: number;
  /** Horas faturáveis que a equipa acrescenta ao teto. */
  capacidadeEquipaMes: number;
  /** Vendas (ou faturação) necessárias para as contas fecharem. */
  breakEvenMes: number;
  /** Em que unidade vem o break-even. */
  breakEvenBase: "unidades" | "receita";
  /** Capital que falta para o saldo nunca ficar negativo. */
  capitalNecessario: number;
}

export interface ComparacaoContratacao {
  cenarios: CenarioContratacao[];
  /** O posto que está a ser comparado. */
  posto: { id: string; funcao: string; custoMensal: number };
  /** O mês de entrada do cenário «depois». */
  mesDepois: number;
  /** `true` quando o posto acrescenta capacidade — muda a leitura toda. */
  produtivo: boolean;
}

/**
 * Os três cenários, sobre o MESMO negócio.
 *
 * Corre `analisarNegocio()` três vezes com estruturas diferentes. É caro
 * — três agregações completas com projeção de caixa — e por isso só se
 * chama quando a pessoa pede. Nunca no caminho crítico do primeiro ecrã.
 */
export function compararContratacao(
  contexto: ContextoNegocio,
  trabalhadorId: string,
  mesDepois = 6,
): ComparacaoContratacao | null {
  const trabalhadores = contexto.estrutura?.trabalhadores ?? [];
  const alvo = trabalhadores.find((t) => t.id === trabalhadorId);
  if (!alvo || num(alvo.remuneracao?.salarioBaseMensal) <= 0) return null;

  const semEste = trabalhadores.filter((t) => t.id !== trabalhadorId);
  const comEste = (inicioMes: number): TrabalhadorPlaneado[] => [
    ...semEste,
    { ...alvo, contrato: { ...alvo.contrato, inicioMes } },
  ];

  const correr = (lista: TrabalhadorPlaneado[]): ResultadoNegocio =>
    analisarNegocio(
      { ...contexto, estrutura: { ...contexto.estrutura, trabalhadores: lista } },
      { comCaixa: true },
    );

  const nunca = correr(semEste);
  const agora = correr(comEste(0));
  const depois = correr(comEste(Math.max(1, Math.round(mesDepois))));

  const cenario = (
    quando: QuandoContratar,
    rotulo: string,
    inicioMes: number | null,
    r: ResultadoNegocio,
  ): CenarioContratacao => ({
    quando,
    rotulo,
    inicioMes,
    resultadoOperacionalMes: r.resultadoOperacionalMes,
    capacidadeEquipaMes: r.capacidadeEquipaMes,
    breakEvenMes: r.breakEven.base === "receita" ? r.breakEven.receitaSemIVAMes : r.breakEven.vendasMes,
    breakEvenBase: r.breakEven.base,
    capitalNecessario: r.caixa?.capitalAdicionalNecessario ?? 0,
  });

  return {
    cenarios: [
      cenario("nunca", "Sem contratar", null, nunca),
      cenario("agora", "Contratar desde o início", 0, agora),
      cenario("depois", `Contratar no mês ${mesDepois + 1}`, mesDepois, depois),
    ],
    posto: {
      id: alvo.id,
      funcao: alvo.funcao?.trim() || "posto sem nome",
      custoMensal: cent(
        custosDosPostos({ ...contexto.estrutura, trabalhadores: [alvo] })[0]?.custo.empresa
          .custoMedioMensal ?? 0,
      ),
    },
    mesDepois,
    produtivo: Boolean(alvo.capacidade?.aumenta),
  };
}

/**
 * O que muda entre dois cenários, em linguagem de decisão.
 *
 * Deliberadamente SEM veredicto. §80: o motor pode encontrar um ótimo
 * matemático e apresentá-lo como conselho seria esconder tudo o que ele
 * não sabe — se a procura espera, se a pessoa certa está disponível
 * daqui a seis meses, quanto custa um cliente perdido.
 */
export function diferencaEntre(
  a: CenarioContratacao,
  b: CenarioContratacao,
): { resultado: number; capacidade: number; capital: number } {
  return {
    resultado: cent(b.resultadoOperacionalMes - a.resultadoOperacionalMes),
    capacidade: cent(b.capacidadeEquipaMes - a.capacidadeEquipaMes),
    capital: cent(b.capitalNecessario - a.capitalNecessario),
  };
}
