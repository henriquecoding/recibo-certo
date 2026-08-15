// ═══════════════════════════════════════════════════════════════════════
//  PROGRESSÃO E COMISSÃO — os patamares, e o que o dinheiro pode comprar
//  ---------------------------------------------------------------------
//  Terceira frente do pacote de redesign. É a única que fala de dinheiro
//  do contabilista, e por isso é a que precisa de mais cuidado no que
//  AFIRMA — não no que calcula.
//
//  O modelo, numa frase: a taxa de intermediação do ReciboCerto começa nos
//  10% e desce até 5%, e desce por trabalho feito (XP e clientes
//  elegíveis) ou, opcionalmente, por desbloqueio pago.
//
//  ⚠️ TRÊS REGRAS QUE NÃO PODEM DERRAPAR
//
//  1. SOBRE O QUE INCIDE. A taxa aplica-se ao valor das PROPOSTAS ACEITES
//     e das CONSULTAS REALIZADAS através da plataforma — as duas, porque
//     as duas são negócio que a intermediação gerou. Nunca ao volume de
//     faturação do contabilista fora daqui, que o ReciboCerto não conhece
//     nem tem por onde conhecer.
//
//  2. QUEM COBRA O QUÊ. O ReciboCerto FATURA a taxa ao contabilista. Não
//     retém nada do que o cliente paga, porque não é intermediário
//     financeiro entre os dois (§10 de `docs/PLATAFORMA-CONTABILISTAS.md`).
//     A diferença não é de contabilidade, é de licença: retirar uma
//     percentagem do dinheiro de um cliente antes de o entregar a outro é
//     outra atividade, com outras obrigações.
//
//  3. O QUE O PAGAMENTO COMPRA, E O QUE NUNCA COMPRA. Desbloquear um
//     patamar compra UMA coisa: a percentagem. Não compra posição no
//     diretório, não compra prioridade no encaminhamento de casos, não
//     compra selo nenhum e não aparece no perfil público. O
//     `MONETIZACAO_PROIBIDA` do `routing.ts` proíbe «ordenar parceiros
//     pelo valor pago» — e a única forma de isso continuar verdade quando
//     existe um botão de pagar é o patamar não ser um sinal que o diretório
//     ou o routing consigam ler. Ver §138: nada disto entra no contrato
//     público.
//
//  Este módulo é PURO. Não lê a base de dados, não escreve nela, e não
//  sabe quem está autenticado. Quem persiste é o servidor — pela mesma
//  razão que o `fidelidade.ts` explica: validar quem escreve não chega, é
//  preciso validar o que é escrito, e para isso o cálculo tem de viver
//  onde o cliente não chega.
// ═══════════════════════════════════════════════════════════════════════

import { valorComDesconto } from "./fidelidade";

// ─── Os patamares ──────────────────────────────────────────────────────

export interface Patamar {
  /** 1 a 6. É o número que a interface mostra. */
  nivel: number;
  /** Percentagem de comissão neste patamar. Desce com o nível. */
  comissaoPct: number;
  /** XP acumulado necessário para o alcançar por mérito. */
  xpNecessario: number;
  /** Clientes elegíveis acumulados necessários para o alcançar por mérito. */
  clientesNecessarios: number;
  /**
   * Preço do desbloqueio imediato, em cêntimos. Zero no primeiro, que é
   * onde todos começam — não é uma oferta, é o ponto de partida.
   */
  precoDesbloqueioCents: number;
}

/**
 * A escada, do patamar de entrada ao mais baixo em comissão.
 *
 * A comissão desce de 1 em 1 ponto. Uma escada com saltos maiores no fim
 * daria a quem paga mais um desconto desproporcionado face a quem chega
 * lá por trabalho — e a escada existe para as duas vias serem
 * equivalentes no destino.
 */
export const PATAMARES: readonly Patamar[] = [
  { nivel: 1, comissaoPct: 10, xpNecessario: 0, clientesNecessarios: 0, precoDesbloqueioCents: 0 },
  { nivel: 2, comissaoPct: 9, xpNecessario: 200, clientesNecessarios: 2, precoDesbloqueioCents: 999 },
  { nivel: 3, comissaoPct: 8, xpNecessario: 400, clientesNecessarios: 4, precoDesbloqueioCents: 1999 },
  { nivel: 4, comissaoPct: 7, xpNecessario: 600, clientesNecessarios: 7, precoDesbloqueioCents: 3999 },
  { nivel: 5, comissaoPct: 6, xpNecessario: 900, clientesNecessarios: 11, precoDesbloqueioCents: 6999 },
  { nivel: 6, comissaoPct: 5, xpNecessario: 1300, clientesNecessarios: 16, precoDesbloqueioCents: 9999 },
];

export const PATAMAR_MIN = 1;
export const PATAMAR_MAX = PATAMARES.length;

/**
 * A comissão mais baixa que existe. O piso não é uma configuração: é o
 * fim da escada. Sem piso, uma escada com mais um degrau amanhã levava a
 * comissão a zero, e uma plataforma que intermedia de graça não paga a
 * revisão das mensagens que a intermediação obriga a fazer.
 */
export const COMISSAO_PISO_PCT = PATAMARES[PATAMARES.length - 1].comissaoPct;
export const COMISSAO_INICIAL_PCT = PATAMARES[0].comissaoPct;

export function patamarDeNivel(nivel: number): Patamar {
  const n = Math.min(PATAMAR_MAX, Math.max(PATAMAR_MIN, Math.trunc(nivel) || PATAMAR_MIN));
  return PATAMARES[n - 1];
}

// ─── XP: o que conta, e quanto ──────────────────────────────────────────

/**
 * Os eventos que dão XP. Todos têm a mesma forma: aconteceu trabalho
 * verificável PARA UM CLIENTE, através da plataforma.
 *
 * ⚠️ Preencher o perfil NÃO está aqui, e é deliberado (§133). Dar XP por
 * completar campos criava um incentivo superficial — e confundia a
 * completude de uma página com a progressão profissional, que é o que
 * mexe na comissão.
 */
export type EventoXP =
  | "cliente_elegivel"
  | "servico_concluido"
  | "cartao_fidelidade_concluido";

export const XP_POR_EVENTO: Readonly<Record<EventoXP, number>> = {
  /** Um cliente novo que chegou por um caso encaminhado e aceitou proposta. */
  cliente_elegivel: 20,
  /** Uma consulta realizada ou um serviço entregue e fechado. */
  servico_concluido: 15,
  /** O cartão fechado é a prova de relação continuada — vale mais. */
  cartao_fidelidade_concluido: 100,
};

export const ROTULO_DO_EVENTO: Readonly<Record<EventoXP, string>> = {
  cliente_elegivel: "Novo cliente elegível",
  servico_concluido: "Serviço concluído",
  cartao_fidelidade_concluido: "Cartão de fidelidade concluído",
};

/**
 * A frase que acompanha SEMPRE o contador de XP.
 *
 * «Elegível» é uma palavra que exclui, e quem a lê tem direito a saber o
 * que exclui: trabalho combinado fora da plataforma não conta, porque a
 * plataforma não o viu acontecer. Dizê-lo é o que impede a pessoa de
 * pensar que o contador está avariado.
 */
export const COPY_ELEGIBILIDADE =
  "Só contam clientes que chegaram pelo ReciboCerto e serviços concluídos por aqui.";

export function xpDoEvento(evento: EventoXP): number {
  return XP_POR_EVENTO[evento];
}

/** Soma uma lista de eventos. Ignora o que não é evento conhecido. */
export function somarXP(eventos: readonly EventoXP[]): number {
  return eventos.reduce((total, e) => total + (XP_POR_EVENTO[e] ?? 0), 0);
}

// ─── Onde a pessoa está ─────────────────────────────────────────────────

export interface EstadoProgressao {
  xp: number;
  clientesElegiveis: number;
  /**
   * O patamar comprado, se houver. Um desbloqueio pago não pode ser
   * perdido por o XP baixar — quem pagou pagou. Por isso o patamar
   * efetivo é o MAIOR entre o merecido e o comprado.
   */
  patamarComprado: number | null;
  /** Cartões de fidelidade fechados. Dão desconto no desbloqueio. */
  cartoesConcluidos: number;
}

export const ESTADO_PROGRESSAO_INICIAL: EstadoProgressao = {
  xp: 0,
  clientesElegiveis: 0,
  patamarComprado: null,
  cartoesConcluidos: 0,
};

/**
 * O patamar que o trabalho feito justifica.
 *
 * Exige as DUAS condições — XP e clientes. Só XP deixava subir quem
 * fecha muitos serviços a um cliente único; só clientes deixava subir
 * quem os junta e não lhes entrega nada.
 */
export function patamarPorMerito(xp: number, clientesElegiveis: number): number {
  const x = Math.max(0, Math.trunc(xp) || 0);
  const c = Math.max(0, Math.trunc(clientesElegiveis) || 0);
  let nivel = PATAMAR_MIN;
  for (const p of PATAMARES) {
    if (x >= p.xpNecessario && c >= p.clientesNecessarios) nivel = p.nivel;
  }
  return nivel;
}

export interface Progressao {
  /** O patamar em vigor: o maior entre o merecido e o comprado. */
  patamar: Patamar;
  /** O que o trabalho justifica, sem contar com o que foi pago. */
  patamarPorMerito: Patamar;
  /** O patamar seguinte, ou null em cima da escada. */
  proximo: Patamar | null;
  /** True quando o patamar em vigor só existe porque foi pago. */
  porDesbloqueio: boolean;
  comissaoPct: number;
  xp: number;
  clientesElegiveis: number;
  /** XP que falta para o próximo. Zero em cima da escada. */
  xpEmFalta: number;
  /** Clientes elegíveis que faltam para o próximo. */
  clientesEmFalta: number;
  /**
   * Progresso DENTRO do degrau atual, 0 a 1 — não a fração do total.
   * Uma barra medida contra o total da escada mal se move no fim, e a
   * pessoa deixa de ver o efeito do trabalho da semana.
   */
  fracaoDoDegrau: number;
  /** XP do degrau: onde começou e onde acaba. Para a barra e o «540/600». */
  xpDoDegrau: { de: number; ate: number };
  /** Idem para clientes — o «1 / 3 clientes» da referência. */
  clientesDoDegrau: { feitos: number; precisos: number };
  noTopo: boolean;
}

/**
 * Onde a pessoa está, e o que falta para o degrau seguinte.
 *
 * Função pura, e é o único sítio onde este cálculo existe: a coluna, o
 * cabeçalho e a jornada mostram todos a mesma percentagem ao mesmo tempo,
 * e três cálculos independentes davam três números do mesmo estado no
 * mesmo ecrã. Foi a lição de `percentagemDoPerfil`.
 */
export function calcularProgressao(estado: EstadoProgressao): Progressao {
  const xp = Math.max(0, Math.trunc(estado.xp) || 0);
  const clientes = Math.max(0, Math.trunc(estado.clientesElegiveis) || 0);

  const merecido = patamarDeNivel(patamarPorMerito(xp, clientes));
  const comprado = estado.patamarComprado ? patamarDeNivel(estado.patamarComprado) : null;

  // O maior dos dois. Um desbloqueio pago nunca é revogado por o mérito
  // ter baixado; e o mérito nunca é ignorado por ser maior do que o pago.
  const patamar =
    comprado && comprado.nivel > merecido.nivel ? comprado : merecido;
  const proximo = patamar.nivel < PATAMAR_MAX ? PATAMARES[patamar.nivel] : null;

  const anterior = patamar;
  const xpDe = anterior.xpNecessario;
  const xpAte = proximo?.xpNecessario ?? anterior.xpNecessario;
  const spanXp = Math.max(1, xpAte - xpDe);
  const feitoXp = Math.min(spanXp, Math.max(0, xp - xpDe));

  const clientesDe = anterior.clientesNecessarios;
  const clientesAte = proximo?.clientesNecessarios ?? anterior.clientesNecessarios;
  const spanClientes = Math.max(0, clientesAte - clientesDe);
  const feitosClientes = Math.min(spanClientes, Math.max(0, clientes - clientesDe));

  return {
    patamar,
    patamarPorMerito: merecido,
    proximo,
    porDesbloqueio: Boolean(comprado && comprado.nivel > merecido.nivel),
    comissaoPct: patamar.comissaoPct,
    xp,
    clientesElegiveis: clientes,
    xpEmFalta: proximo ? Math.max(0, proximo.xpNecessario - xp) : 0,
    clientesEmFalta: proximo ? Math.max(0, proximo.clientesNecessarios - clientes) : 0,
    fracaoDoDegrau: proximo ? feitoXp / spanXp : 1,
    xpDoDegrau: { de: xpDe, ate: xpAte },
    clientesDoDegrau: { feitos: feitosClientes, precisos: spanClientes },
    noTopo: proximo === null,
  };
}

// ─── O desconto de fidelidade sobre o desbloqueio ──────────────────────

/**
 * Cartões de fidelidade fechados dão desconto no preço do desbloqueio.
 *
 * É o único cruzamento entre as duas mecânicas, e faz sentido nesta
 * direção: quem fecha cartões tem relações continuadas, que é o que a
 * plataforma quer premiar. Na direção contrária — desconto no cartão do
 * CLIENTE por o contabilista ter pago — seria o contabilista a comprar
 * uma promessa feita a terceiros.
 */
export const ESCALA_FIDELIDADE: readonly { cartoes: number; descontoPct: number }[] = [
  { cartoes: 1, descontoPct: 5 },
  { cartoes: 5, descontoPct: 15 },
  { cartoes: 10, descontoPct: 20 },
];

export const DESCONTO_FIDELIDADE_MAX_PCT =
  ESCALA_FIDELIDADE[ESCALA_FIDELIDADE.length - 1].descontoPct;

/**
 * A frase que acompanha SEMPRE o desconto.
 *
 * Não acumula com mais nada. Dizê-lo à partida evita a descoberta no fim,
 * que é onde um desconto que não somou parece um desconto que desapareceu.
 */
export const COPY_DESCONTO_UNICO =
  "O desconto aplica-se ao desbloqueio de patamares e não acumula com outras promoções.";

export function descontoDeFidelidadePct(cartoesConcluidos: number): number {
  const n = Math.max(0, Math.trunc(cartoesConcluidos) || 0);
  let pct = 0;
  for (const degrau of ESCALA_FIDELIDADE) {
    if (n >= degrau.cartoes) pct = degrau.descontoPct;
  }
  return pct;
}

export interface ProximoBonus {
  cartoesEmFalta: number;
  descontoPct: number;
}

/** O degrau de desconto seguinte, para o cartão «bónus a aproximar-se». */
export function proximoBonusDeFidelidade(cartoesConcluidos: number): ProximoBonus | null {
  const n = Math.max(0, Math.trunc(cartoesConcluidos) || 0);
  const seguinte = ESCALA_FIDELIDADE.find((d) => n < d.cartoes);
  if (!seguinte) return null;
  return { cartoesEmFalta: seguinte.cartoes - n, descontoPct: seguinte.descontoPct };
}

export interface PrecoDesbloqueio {
  nivel: number;
  baseCents: number;
  descontoPct: number;
  descontoCents: number;
  finalCents: number;
}

/**
 * O preço de desbloquear um patamar, já com o desconto de fidelidade.
 *
 * Reutiliza `valorComDesconto` do cartão de fidelidade: é a mesma
 * aritmética de cêntimos inteiros, e ter duas implementações de «tirar
 * uma percentagem a um preço» é ter duas oportunidades de arredondar de
 * maneira diferente na mesma página.
 */
export function precoDeDesbloqueio(
  nivel: number,
  cartoesConcluidos: number
): PrecoDesbloqueio {
  const patamar = patamarDeNivel(nivel);
  const pct = descontoDeFidelidadePct(cartoesConcluidos);
  const v = valorComDesconto(patamar.precoDesbloqueioCents, pct);
  return {
    nivel: patamar.nivel,
    baseCents: v.baseCents,
    descontoPct: pct,
    descontoCents: v.descontoCents,
    finalCents: v.finalCents,
  };
}

/**
 * O que se pode desbloquear a partir de onde se está.
 *
 * Só o degrau IMEDIATAMENTE seguinte. Saltar do 2 para o 6 com um
 * pagamento transformava a escada numa tabela de preços da comissão, e
 * tirava sentido às duas vias serem equivalentes.
 */
export function desbloqueioDisponivel(p: Progressao): Patamar | null {
  return p.proximo;
}

// ─── A fronteira comercial, dita em código ─────────────────────────────

/**
 * O que o desbloqueio pago NUNCA compra.
 *
 * Está aqui em texto por duas razões. A primeira é que a interface tem de
 * o dizer a quem está a decidir pagar — um pagamento cujo efeito não está
 * escrito é um pagamento mal informado. A segunda é que há teste a exigir
 * que estas frases continuem a ser verdade no resto do código: nenhuma
 * ordenação do diretório e nenhum sinal do `routing.ts` pode passar a ler
 * o patamar.
 */
export const DESBLOQUEIO_NAO_COMPRA: readonly string[] = [
  "Posição no diretório ou no resultado de uma pesquisa.",
  "Prioridade no encaminhamento de casos.",
  "Selo, distintivo ou verificação no perfil público.",
  "Acesso a dados de clientes que o patamar anterior não dava.",
];

/**
 * O que a taxa incide, em linguagem de interface.
 *
 * As duas bases foram uma decisão de produto: proposta aceite e consulta
 * realizada. Uma só delas deixava metade do negócio intermediado fora da
 * conta.
 */
export const COPY_BASE_DA_COMISSAO =
  "A taxa incide sobre o valor das propostas aceites e das consultas realizadas através do ReciboCerto.";

/**
 * Quem cobra, e a quem.
 *
 * O ReciboCerto fatura a taxa ao contabilista. Não retém nada do que o
 * cliente paga — dizer o contrário seria afirmar que a plataforma toca em
 * dinheiro de terceiros, o que não é verdade e não é a atividade que ela
 * exerce.
 */
export const COPY_QUEM_FATURA =
  "A taxa é faturada a ti pelo ReciboCerto. O cliente paga-te diretamente — a plataforma não retém nem processa esse pagamento.";

/**
 * O estado do pagamento nesta etapa.
 *
 * O desbloqueio está desenhado e o preço é real, mas a cobrança ainda não
 * está ligada. Um botão que aceita o clique e não cobra nada seria pior do
 * que um botão que explica: a pessoa ficava à espera de uma fatura que não
 * vinha, e a acreditar que já tinha o patamar.
 */
export const COPY_DESBLOQUEIO_INDISPONIVEL =
  "O desbloqueio pago ainda não está disponível. Assim que a cobrança abrir, avisamos-te — até lá, os patamares sobem por XP e clientes elegíveis.";

export const DESBLOQUEIO_PAGO_ATIVO = false;

/** «8%» — a comissão como se lê. Inteira quando é inteira. */
export function comissaoLegivel(pct: number): string {
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1).replace(".", ",")}%`;
}
