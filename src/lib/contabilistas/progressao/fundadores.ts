// ═══════════════════════════════════════════════════════════════════════
//  O PROGRAMA FUNDADOR — domínio puro
//  ---------------------------------------------------------------------
//  Os primeiros dez contabilistas aprovados ficam com 5% de comissão,
//  enquanto forem uma conta de contabilista válida.
//
//  Este ficheiro espelha a migração `20260819100000`. O SQL é a autoridade
//  em runtime — há um teste que compara os dois, como já acontece com o
//  `catalogo.ts`. Uma constante de front-end que discorde do servidor
//  produz um ecrã que promete um número e uma fatura que cobra outro.
//
//  PORQUE É QUE ISTO É `least` E NÃO «igual a 500»
//  -----------------------------------------------
//  Se um dia existir um patamar abaixo dos 5%, quem lá chegou por mérito
//  não pode ser EMPURRADO PARA CIMA pelo benefício que devia ajudá-lo. O
//  fundador nunca paga mais do que 5%; se o patamar dele já for melhor,
//  fica com o dele. A mesma regra está no SQL, e pela mesma razão.
// ═══════════════════════════════════════════════════════════════════════

import { PATAMARES, formatarComissao } from "./catalogo";

/** Quantos lugares existem. Espelha `lugares_fundadores_total()`. */
export const LUGARES_FUNDADORES = 10;

/** A comissão de fundador, em basis points. 5% = 500. */
export const COMISSAO_FUNDADOR_BPS = 500;

export interface LugaresFundadores {
  total: number;
  ocupados: number;
  restantes: number;
  esgotado: boolean;
  /**
   * Falso quando não se conseguiu confirmar. Falha FECHADA: sem
   * confirmação, a interface não promete um lugar que pode já não existir.
   */
  verificado: boolean;
}

export const LUGARES_DESCONHECIDOS: LugaresFundadores = {
  total: LUGARES_FUNDADORES,
  ocupados: 0,
  restantes: 0,
  esgotado: true,
  verificado: false,
};

export function normalizarLugares(
  linha: Partial<LugaresFundadores> | undefined,
): LugaresFundadores {
  const total = Number(linha?.total ?? LUGARES_FUNDADORES);
  const ocupados = Math.max(Number(linha?.ocupados ?? 0), 0);
  const restantes = Math.max(total - ocupados, 0);
  return { total, ocupados, restantes, esgotado: restantes <= 0, verificado: true };
}

/**
 * O contador, dito em português.
 *
 * Nunca inventa urgência. «Faltam 3» é um facto; «só faltam 3, corre» é
 * uma pressão — e a pressão numa decisão profissional é o que faz alguém
 * arrepender-se e cancelar.
 */
export function textoLugares(l: LugaresFundadores): string {
  if (!l.verificado) return "Não conseguimos confirmar quantos lugares restam.";
  if (l.esgotado) return `Os ${l.total} lugares de fundador estão ocupados.`;
  if (l.restantes === 1) return `Falta 1 lugar de fundador, de ${l.total}.`;
  return `Restam ${l.restantes} lugares de fundador, de ${l.total}.`;
}

/**
 * A comissão que um contabilista paga de facto.
 *
 * Espelha `comissao_efetiva_bps`. O servidor é quem manda; isto existe
 * para o ecrã não mostrar um número diferente daquele que vai ser cobrado.
 */
export function comissaoEfetivaBps(bpsDoPatamar: number, eFundador: boolean): number {
  return eFundador ? Math.min(bpsDoPatamar, COMISSAO_FUNDADOR_BPS) : bpsDoPatamar;
}

/** «5%». */
export const COMISSAO_FUNDADOR_TEXTO = formatarComissao(COMISSAO_FUNDADOR_BPS);

/**
 * Quantas SUBIDAS de patamar é que o benefício poupa.
 *
 * Degraus, não patamares: do primeiro ao sexto são cinco subidas. Serve
 * para dizer a alguém o que está a receber sem o obrigar a comparar duas
 * percentagens de cabeça.
 */
export function patamaresQueOFundadorSalta(): number {
  const base = PATAMARES[0];
  const fundador = PATAMARES.find((p) => p.comissaoBps <= COMISSAO_FUNDADOR_BPS);
  if (!base || !fundador) return 0;
  return Math.max(fundador.ordem - base.ordem, 0);
}

/* ------------------------------------------------------------------ */
/* A negociação, para quem chegou a seguir                             */
/* ------------------------------------------------------------------ */

export type EstadoPropostaDesbloqueio =
  | "enviada" | "aceite" | "contraproposta" | "recusada" | "expirada" | "usada";

export interface PropostaDesbloqueio {
  id: string;
  contabilistaId: string;
  patamarAlvo: number;
  precoCatalogoCents: number;
  valorPropostoCents: number;
  justificacao: string;
  estado: EstadoPropostaDesbloqueio;
  contrapropostaCents: number | null;
  notaAdmin: string | null;
  decididaEm: string | null;
  validaAte: string | null;
  criadoEm: string;
}

/** O mínimo de uma justificação. O mesmo número está num CHECK do SQL. */
export const JUSTIFICACAO_MIN = 40;
export const JUSTIFICACAO_MAX = 2000;

export interface ValidacaoDaProposta {
  valido: boolean;
  /** O que dizer a quem está a escrever. Vazio quando está tudo bem. */
  problemas: string[];
}

/**
 * As mesmas perguntas que o servidor faz, feitas cedo.
 *
 * Não é a fronteira — a fronteira é `propor_valor_de_desbloqueio`, que
 * corre na transação que escreve. Isto existe para a pessoa saber ANTES de
 * carregar em enviar, que é a diferença entre uma explicação e uma parede.
 */
export function validarProposta(p: {
  valorCents: number;
  precoCatalogoCents: number;
  justificacao: string;
}): ValidacaoDaProposta {
  const problemas: string[] = [];

  if (!Number.isFinite(p.valorCents) || p.valorCents < 0) {
    problemas.push("Diz que valor propões.");
  } else if (p.valorCents >= p.precoCatalogoCents) {
    // Propor mais do que o catálogo não é negociar. Dizê-lo é mais útil
    // do que aceitar e devolver um erro do servidor três segundos depois.
    problemas.push("O valor tem de ser abaixo do preço de tabela — senão não há nada a negociar.");
  }

  const texto = p.justificacao.trim();
  if (texto.length < JUSTIFICACAO_MIN) {
    problemas.push(
      `Explica porque é que aquele valor faz sentido — faltam ${
        JUSTIFICACAO_MIN - texto.length
      } caracteres.`,
    );
  }

  return { valido: problemas.length === 0, problemas };
}

/** Como se lê o estado de uma proposta, do lado de quem a fez. */
export function estadoDaPropostaLegivel(p: PropostaDesbloqueio): {
  titulo: string;
  explicacao: string;
  tom: "neutro" | "bom" | "aviso";
} {
  const expirada = p.validaAte !== null && new Date(p.validaAte) <= new Date();

  switch (p.estado) {
    case "enviada":
      return {
        titulo: "À espera de resposta",
        explicacao: "A tua proposta está com a administração. Avisamos-te quando houver decisão.",
        tom: "neutro",
      };
    case "contraproposta":
      return {
        titulo: "Há uma contraproposta",
        explicacao: "Não foi o teu valor, mas também não foi um não. Vê o que te propõem.",
        tom: "aviso",
      };
    case "aceite":
      return expirada
        ? {
            titulo: "Aceite, mas já passou o prazo",
            explicacao: "O valor acordado caducou. Se ainda fizer sentido, propõe de novo.",
            tom: "aviso",
          }
        : {
            titulo: "Aceite",
            explicacao: "O valor acordado é o que vais pagar ao desbloquear este patamar.",
            tom: "bom",
          };
    case "recusada":
      return {
        titulo: "Não aceite",
        explicacao: "Podes propor outro valor, com outra justificação.",
        tom: "neutro",
      };
    case "expirada":
      return {
        titulo: "Caducou",
        explicacao: "Passou o prazo sem ser usada. Podes propor de novo.",
        tom: "neutro",
      };
    case "usada":
      return {
        titulo: "Usada",
        explicacao: "Este valor já serviu para desbloquear o patamar.",
        tom: "bom",
      };
  }
}

/**
 * Quanto é que a proposta poupa, em cêntimos.
 *
 * Sobre o valor que está EM CIMA DA MESA — o da contraproposta quando ela
 * existe, o proposto quando não. Mostrar a poupança do valor pedido depois
 * de haver contraproposta seria mostrar um número que já ninguém oferece.
 */
export function poupancaDaProposta(p: PropostaDesbloqueio): number {
  const emCima = p.contrapropostaCents ?? p.valorPropostoCents;
  return Math.max(p.precoCatalogoCents - emCima, 0);
}
