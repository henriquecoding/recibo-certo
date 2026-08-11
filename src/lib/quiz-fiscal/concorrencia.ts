// ═══════════════════════════════════════════════════════════════════════
//  DOIS PEDIDOS AO MESMO TEMPO — RC-QUIZ-001
//  ---------------------------------------------------------------------
//  O bilhete de sessão (migração 028) resolveu o problema de alguém repetir a
//  MESMA submissão: fecha-se com um UPDATE condicional, e de dois pedidos
//  simultâneos com o mesmo bilhete só um passa.
//
//  Não resolveu o problema de dois bilhetes DIFERENTES. Ambos legítimos, ambos
//  abertos, ambos submetidos ao mesmo tempo no limiar da recompensa:
//
//     pedido A                          pedido B
//     lê sequencia_atual = 2            lê sequencia_atual = 2
//     calcula 3, que é a meta           calcula 3, que é a meta
//     grava 0 (ciclo reiniciado)        grava 0 (ciclo reiniciado)
//     insere cupão  ←──────────────────→ insere cupão
//
//  Dois cupões, três meses de Plus cada, para um ciclo que só devia dar um.
//  Ler e depois escrever, sem nada entre as duas coisas, é o defeito.
//
//  ── O que este módulo faz, e o que não faz ──────────────────────────────
//  A correção definitiva é uma função SQL `security definer` que faça tudo
//  numa transação, com a linha de progresso bloqueada — está na Onda 1 do
//  relatório porque exige migração. Isto é a CONTENÇÃO, e vive só em código:
//
//   · `avancoCondicional()` descreve um compare-and-swap — só escreve se a
//     sequência ainda for a que foi lida. O perdedor da corrida não recebe
//     erro nem perde a sessão: fica a saber que não é ele a fechar o ciclo.
//   · `premiosAutomaticosAtivos()` é o travão administrativo que o relatório
//     pede em alternativa: um interruptor para suspender a emissão automática
//     sem tirar o Quiz do ar.
//   · `inicioDoDiaEm()` calcula a meia-noite no fuso de quem joga, e não no
//     do servidor — em Lisboa no verão são duas coisas diferentes, e o teto
//     diário estava a mudar uma hora antes do dia da pessoa.
// ═══════════════════════════════════════════════════════════════════════

/** Fuso de referência do produto. */
export const FUSO_PT = "Europe/Lisbon";

/**
 * A emissão automática de cupões está ligada?
 *
 * Por omissão SIM — está a funcionar hoje e desligá-la em silêncio tirava um
 * prémio a quem o ganhou. O que passa a existir é a possibilidade de a travar
 * de imediato, sem deploy, se aparecer abuso: basta
 * `QUIZ_PREMIOS_AUTOMATICOS=false`.
 *
 * Com ela desligada o progresso continua a ser contado com verdade — o ciclo
 * fecha, a sequência reinicia — e só a emissão do cupão fica para trás, para
 * ser feita à mão. Ninguém perde o que ganhou.
 */
export function premiosAutomaticosAtivos(): boolean {
  return process.env.QUIZ_PREMIOS_AUTOMATICOS?.trim() !== "false";
}

/**
 * Meia-noite do dia corrente, no fuso indicado, em ISO.
 *
 * `new Date().setHours(0,0,0,0)` dá a meia-noite do SERVIDOR. Na Vercel isso é
 * UTC, e entre o fim de março e o fim de outubro Lisboa está uma hora à
 * frente: o teto diário reiniciava às 01:00 de quem joga.
 */
export function inicioDoDiaEm(agora: Date = new Date(), fuso: string = FUSO_PT): string {
  // `en-CA` dá o formato AAAA-MM-DD, que é o que serve para reconstruir a data.
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);

  // O desvio do fuso àquela hora, para converter a meia-noite local em UTC.
  // Calculado a partir do próprio instante para apanhar a hora de verão.
  const comoUTC = new Date(`${dia}T00:00:00Z`);
  const desvioMs = deslocacaoDoFusoMs(comoUTC, fuso);
  return new Date(comoUTC.getTime() - desvioMs).toISOString();
}

/** Deslocação do fuso, em milissegundos, no instante dado. */
function deslocacaoDoFusoMs(instante: Date, fuso: string): number {
  const emFuso = new Date(instante.toLocaleString("en-US", { timeZone: fuso }));
  const emUTC = new Date(instante.toLocaleString("en-US", { timeZone: "UTC" }));
  return emFuso.getTime() - emUTC.getTime();
}

export interface ResultadoAvanco {
  /** A escrita foi minha — sou eu quem avança a sequência. */
  ganhei: boolean;
  /** Valor a gravar: reinicia a zero quando o ciclo fecha. */
  sequenciaAGravar: number;
  /** O ciclo fechou-se com esta submissão. */
  fechouCiclo: boolean;
}

/**
 * O que gravar, dado o que foi lido.
 *
 * Separado da base de dados de propósito: é aqui que está a regra, e é aqui
 * que ela se testa sem precisar de um Postgres. Quem chama tem de aplicar a
 * escrita com a condição `sequencia_atual = sequenciaLida` — sem essa
 * condição, isto não vale nada.
 */
export function avancoCondicional(sequenciaLida: number, meta: number): ResultadoAvanco {
  const proxima = sequenciaLida + 1;
  const fechouCiclo = proxima >= meta;
  return {
    ganhei: true,
    sequenciaAGravar: fechouCiclo ? 0 : proxima,
    fechouCiclo,
  };
}

/**
 * Estou dentro do teto diário, sabendo quantos bilhetes existem ANTES do meu?
 *
 * O teto era contado antes de inserir — dois pedidos simultâneos contavam
 * ambos `limite - 1` e ambos inseriam. Contar os que vieram antes do meu, DEPOIS
 * de inserir, dá uma ordem estável: cada bilhete sabe a sua posição na fila e
 * os que sobram removem-se a si próprios.
 */
export function dentroDoTeto(bilhetesAnteriores: number, limite: number): boolean {
  return bilhetesAnteriores < limite;
}
