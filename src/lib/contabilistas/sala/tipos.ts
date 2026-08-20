// ═══════════════════════════════════════════════════════════════════════
//  SALA DE ACOMPANHAMENTO — tipos partilhados
//  ---------------------------------------------------------------------
//  Os mesmos nomes que a migração da sala de acompanhamento usa nas restrições CHECK. Um estado
//  novo aqui sem estar lá e a base recusa a escrita — que é o
//  comportamento certo.
// ═══════════════════════════════════════════════════════════════════════

import { diaLocal, FUSO_PT } from "../agenda";

/**
 * O que se pede a um cliente.
 *
 * Sete tipos e não um campo livre: o tipo é o que permite à interface saber
 * que botão pôr no cartão. «Documento» abre o seletor de ficheiros,
 * «confirmação» é um sim, «agendamento» leva à agenda. Um campo livre dava
 * um cartão com o mesmo botão para tudo, que é o mesmo que não ter cartão.
 */
export type TipoPedido =
  | "documento"
  | "resposta"
  | "confirmacao"
  | "escolha"
  | "pagamento"
  | "agendamento"
  | "dados";

/**
 * O ciclo de vida de um pedido.
 *
 * `respondido` e `em_analise` são estados diferentes de propósito: o
 * primeiro é do cliente («já mandei»), o segundo é do contabilista («já vi,
 * estou a tratar»). Juntá-los pouparia uma linha de código e tirava à
 * pessoa a única forma de saber se o que enviou chegou a ser olhado.
 */
export type EstadoPedido =
  | "aberto"
  | "respondido"
  | "em_analise"
  | "concluido"
  | "cancelado";

export const ESTADOS_POR_FECHAR: readonly EstadoPedido[] = [
  "aberto",
  "respondido",
  "em_analise",
];

export interface PedidoCliente {
  id: string;
  vinculoId: string;
  criadoPor: string;
  tipo: TipoPedido;
  titulo: string;
  descricao: string | null;
  /** Data (não instante) — ver a nota na migração da sala de acompanhamento. */
  prazo: string | null;
  obrigatorio: boolean;
  estado: EstadoPedido;
  respostaTexto: string | null;
  respostaMensagemId: string | null;
  respondidoEm: string | null;
  concluidoEm: string | null;
  criadoEm: string;
}

/** O que pode aparecer na linha do tempo da relação. */
export type TipoEvento =
  | "mensagem"
  | "pedido"
  | "partilha"
  | "consulta"
  | "fidelidade"
  | "pagamento"
  | "vinculo";

export interface EventoTimeline {
  tipo: TipoEvento;
  referenciaId: string;
  quando: string;
  /** Quem provocou o evento. `null` quando foi o sistema. */
  autorId: string | null;
  titulo: string | null;
  corpo: string | null;
  estado: string | null;
  meta: Record<string, unknown>;
}

export const ROTULO_PEDIDO: Record<TipoPedido, string> = {
  documento: "Documento",
  resposta: "Resposta",
  confirmacao: "Confirmação",
  escolha: "Escolha",
  pagamento: "Pagamento",
  agendamento: "Agendamento",
  dados: "Dados",
};

export const ROTULO_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  em_analise: "Em análise",
  concluido: "Tratado",
  cancelado: "Cancelado",
};

/** O verbo que o cartão do pedido põe no botão, do lado do cliente. */
export const ACCAO_DO_PEDIDO: Record<TipoPedido, string> = {
  documento: "Enviar ficheiro",
  resposta: "Responder",
  confirmacao: "Confirmar",
  escolha: "Escolher",
  pagamento: "Pagar",
  agendamento: "Marcar",
  dados: "Preencher",
};

export function pedidoPorFechar(p: PedidoCliente): boolean {
  return ESTADOS_POR_FECHAR.includes(p.estado);
}

/**
 * Quantos dias faltam até ao prazo. Negativo quando já passou.
 *
 * Conta em dias de calendário e não em múltiplos de 24 horas: «amanhã» às
 * 23h e «amanhã» às 8h são o mesmo amanhã para quem lê, e uma diferença de
 * horas dava «faltam 0 dias» a meio da tarde da véspera.
 *
 * ⚠️ AS DUAS DATAS TÊM DE VIR DO MESMO SÍTIO, e não vinham.
 *
 * O prazo é uma data CIVIL — «17 de agosto», sem hora e sem fuso. O «hoje»
 * era lido com `getFullYear/getMonth/getDate`, que respondem no fuso da
 * MÁQUINA. Comparar as duas é comparar duas escalas diferentes, e o erro
 * aparece na hora em que elas divergem: às 23h de 16 de agosto em Lisboa
 * (22:00 UTC, porque no verão Portugal está em UTC+1), a máquina em UTC
 * ainda dizia «16» e a pessoa em Lisboa já estava no dia 17. Faltava um
 * dia para o prazo e o cartão dizia «é hoje».
 *
 * O CI corre em UTC e nunca via a diferença. Foi um teste com um instante
 * às 22:00Z que a mostrou.
 *
 * Agora as duas datas são chaves `AAAA-MM-DD` no MESMO fuso — o de
 * Portugal, que é onde vivem as pessoas a quem estes prazos dizem
 * respeito.
 */
export function diasAtePrazo(prazo: string, agora: Date): number {
  return Math.round((diaEmMs(prazo) - diaEmMs(diaLocal(agora, FUSO_PT))) / 86_400_000);
}

/**
 * `AAAA-MM-DD` → instante da meia-noite desse dia em UTC.
 *
 * Só serve para SUBTRAIR uma chave de outra. O UTC aqui não é um fuso, é
 * uma régua: as duas datas entram na mesma, e a diferença entre elas é a
 * mesma que seria em qualquer outra.
 */
function diaEmMs(chave: string): number {
  const [a, m, d] = chave.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}
