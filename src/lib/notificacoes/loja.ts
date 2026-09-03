// ═══════════════════════════════════════════════════════════════════════
//  A LOJA DOS AVISOS — uma subscrição, muitos sinos
//  ---------------------------------------------------------------------
//  O sino tinha o estado todo dentro de si: a lista, o «por ler», e o canal
//  Realtime. Isso obrigava a uma regra que só um teste podia guardar —
//  «exatamente um `<SinoNotificacoes />` por layout» — porque dois sinos
//  eram dois canais com o mesmo nome, e o segundo cancelava o primeiro.
//
//  A regra existia por uma boa razão e resolvia-se mal: mantinha o sino
//  FORA do telemóvel, onde não há barra lateral. Quem tivesse um pedido de
//  consulta por decidir e abrisse o painel no telemóvel não via sino
//  nenhum — e é no telemóvel que a maior parte das pessoas abre isto.
//
//  Aqui o estado sai do componente. É uma loja de módulo com contagem de
//  subscritores: o canal abre quando o PRIMEIRO sino monta e fecha quando o
//  ÚLTIMO desmonta. Dois sinos no ecrã continuam a ser uma subscrição — não
//  por disciplina, mas porque não há por onde serem duas.
//
//  É o mesmo padrão de `lib/dashboard/eventos.ts`, e usa-se com
//  `useSyncExternalStore`, que é o que o React 19 quer para isto.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ SEM `use client` E SEM REACT                                         │
//  │                                                                     │
//  │ É importado pelo hook, que é cliente. Ficar sem React deixa-o        │
//  │ testável em Node sem arrastar nada, que é a razão pela qual as       │
//  │ garantias abaixo são exercidas e não só afirmadas.                   │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import {
  escutarNotificacoes,
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasLidas,
  type Notificacao,
} from "@/lib/contabilistas/fonte/conversa";

export type EstadoAvisos =
  /** Sem sessão, ou sem nuvem configurada: o sino não se mostra. */
  | "inativo"
  /** A primeira leitura ainda não voltou. */
  | "a-carregar"
  | "pronto"
  /** A leitura falhou. O sino mostra-se, e diz que falhou. */
  | "erro";

export interface Instantaneo {
  readonly avisos: readonly Notificacao[];
  readonly estado: EstadoAvisos;
  readonly porLer: number;
  /** Há mais no servidor do que os que estão carregados. */
  readonly haMais: boolean;
}

/** Quantos por passagem. O «ver mais» pede outro tanto. */
export const PAGINA = 30;
/** Teto de segurança: um histórico grande não pode encher a memória. */
const LIMITE_MAXIMO = 300;

const VAZIO: Instantaneo = {
  avisos: [],
  estado: "inativo",
  porLer: 0,
  haMais: false,
};

// ── Estado do módulo ────────────────────────────────────────────────

let conta: string | null = null;
let avisos: Notificacao[] = [];
let estado: EstadoAvisos = "inativo";
let limite = PAGINA;
let haMais = false;

const ouvintes = new Set<() => void>();
let cancelarCanal: (() => void) | null = null;
/** Sobe a cada (re)ligação. Uma resposta de uma ligação antiga é ignorada. */
let geracao = 0;
/**
 * Há uma leitura por responder.
 *
 * Não se deduz do `estado`: a partir da segunda página o estado fica
 * «pronto» de propósito — trocar a lista por três esqueletos a cada «ver
 * mais» faria a lista saltar debaixo do dedo de quem estava a lê-la. Sem
 * esta bandeira, dois cliques seguidos eram dois pedidos.
 */
let aLer = false;

// O instantâneo é guardado porque `useSyncExternalStore` compara por
// identidade: devolver um objeto novo a cada leitura põe o React em ciclo.
let instantaneo: Instantaneo = VAZIO;

function recalcular(): void {
  instantaneo = {
    avisos,
    estado,
    porLer: avisos.reduce((n, a) => (a.lidaEm ? n : n + 1), 0),
    haMais,
  };
}

function anunciar(): void {
  recalcular();
  for (const ouvinte of ouvintes) ouvinte();
}

export function instantaneoDosAvisos(): Instantaneo {
  return instantaneo;
}

/** No servidor não há sino: `useSyncExternalStore` pede um valor estável. */
export function instantaneoNoServidor(): Instantaneo {
  return VAZIO;
}

// ── Carregar ────────────────────────────────────────────────────────

async function carregar(quantos: number): Promise<void> {
  const minha = geracao;
  aLer = true;
  if (avisos.length === 0) {
    estado = "a-carregar";
    anunciar();
  }

  try {
    const lista = await listarNotificacoes(quantos);
    if (minha !== geracao) return; // trocou de conta a meio: esta resposta já não é de ninguém
    avisos = lista;
    limite = quantos;
    // Uma página cheia é a única pista de que há mais. Pedir a contagem ao
    // servidor era outra ida e volta para escrever um botão.
    haMais = lista.length >= quantos && quantos < LIMITE_MAXIMO;
    estado = "pronto";
  } catch {
    if (minha !== geracao) return;
    // O erro é do lado do sino e não da aplicação: mostrar um ecrã de erro
    // por causa de uma lista de avisos seria pior do que a lista faltar.
    // Mas também não pode ser silêncio — era o que fazia parecer que não
    // havia avisos nenhuns quando o que havia era uma leitura falhada.
    estado = "erro";
  } finally {
    if (minha === geracao) aLer = false;
  }
  anunciar();
}

/** Pede mais uma página. Sem efeito quando já não há mais. */
export function verMais(): void {
  if (!conta || !haMais || aLer) return;
  void carregar(Math.min(limite + PAGINA, LIMITE_MAXIMO));
}

/** Volta a tentar depois de um erro. */
export function recarregar(): void {
  if (!conta || aLer) return;
  void carregar(limite);
}

// ── Ligar e desligar ────────────────────────────────────────────────

function abrirCanal(userId: string): void {
  cancelarCanal?.();
  cancelarCanal = escutarNotificacoes(userId, (nova) => {
    // O Realtime pode repetir um evento a seguir a uma reconexão, e o
    // aviso que acabou de chegar pode já ter vindo na leitura inicial.
    if (avisos.some((a) => a.id === nova.id)) return;
    avisos = [nova, ...avisos];
    anunciar();
  });
}

/**
 * Diz de quem são os avisos. `null` desliga tudo e esvazia.
 *
 * Chamado pelo hook a partir da sessão. Trocar de conta TEM de esvaziar a
 * lista: os avisos da conta anterior ficariam no ecrã da seguinte, e são
 * de outra pessoa.
 */
export function definirConta(userId: string | null): void {
  if (userId === conta) return;
  conta = userId;
  geracao += 1;

  cancelarCanal?.();
  cancelarCanal = null;
  avisos = [];
  limite = PAGINA;
  haMais = false;

  if (!userId) {
    estado = "inativo";
    anunciar();
    return;
  }

  estado = "a-carregar";
  anunciar();
  void carregar(PAGINA);
  if (ouvintes.size > 0) abrirCanal(userId);
}

/**
 * Subscreve as mudanças. Devolve a função que cancela — é o contrato de
 * `useSyncExternalStore`.
 *
 * O canal abre com o primeiro subscritor e fecha com o último: é isto que
 * torna «uma subscrição por sessão» uma propriedade e não uma regra.
 */
export function subscrever(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  if (ouvintes.size === 1 && conta && !cancelarCanal) abrirCanal(conta);

  return () => {
    ouvintes.delete(aoMudar);
    if (ouvintes.size === 0) {
      cancelarCanal?.();
      cancelarCanal = null;
    }
  };
}

// ── Marcar como lida ────────────────────────────────────────────────

/**
 * Marca um aviso como lido.
 *
 * Otimista: o ponto apaga-se no instante do clique. Se a escrita falhar, a
 * pessoa vê-o outra vez na recarga seguinte — que é o comportamento certo,
 * porque o aviso continua mesmo por ler.
 */
export function marcarLida(id: string): void {
  const alvo = avisos.find((a) => a.id === id);
  if (!alvo || alvo.lidaEm) return;
  const agora = new Date().toISOString();
  avisos = avisos.map((a) => (a.id === id ? { ...a, lidaEm: agora } : a));
  anunciar();
  void marcarNotificacaoLida(id).catch(() => {
    /* fica por ler no servidor; volta a aparecer na próxima leitura */
  });
}

export function marcarTodas(): void {
  if (instantaneo.porLer === 0) return;
  const agora = new Date().toISOString();
  avisos = avisos.map((a) => (a.lidaEm ? a : { ...a, lidaEm: agora }));
  anunciar();
  void marcarTodasLidas().catch(() => {});
}

/** Só para os testes: repõe o módulo entre casos. */
export function reporParaTestes(): void {
  cancelarCanal?.();
  cancelarCanal = null;
  ouvintes.clear();
  conta = null;
  avisos = [];
  estado = "inativo";
  limite = PAGINA;
  haMais = false;
  aLer = false;
  geracao += 1;
  recalcular();
}

recalcular();
