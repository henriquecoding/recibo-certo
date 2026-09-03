// ═══════════════════════════════════════════════════════════════════════
//  O CATÁLOGO DOS AVISOS — o mesmo do lado de cá e do lado de lá
//  ---------------------------------------------------------------------
//  A lista dos tipos de aviso vivia em dois sítios que ninguém obrigava a
//  concordar: uma restrição `CHECK` em SQL e uma união de strings em
//  TypeScript. Divergiram — a restrição recusava quatro tipos que a
//  produção escreve, e a união conhecia nove de dezanove. Nenhum dos dois
//  lados tinha como saber.
//
//  Agora há três listas e um portão que as obriga a ser a mesma:
//
//      supabase/migrations/…  `tipos_de_notificacao()`   ← autoritativa
//      este ficheiro          `TIPOS_NOTIFICACAO`
//      scripts/check-notificacoes.mjs                     ← compara-as
//
//  `npm run avisos:check` reprova quando divergem, e corre no CI. Ver o
//  cabeçalho do script para os detalhes do que ele lê.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ ESTE FICHEIRO NÃO PODE IMPORTAR NADA PESADO                          │
//  │                                                                     │
//  │ É lido pelo sino, que vive no chrome de todas as páginas do painel.  │
//  │ Só tipos, constantes e nomes de ícones — o mapa de nome→componente   │
//  │ é do lado do React (`components/ui/Icons.tsx` via `iconeDe`).        │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

/**
 * Todos os tipos de aviso que a base de dados aceita.
 *
 * A ordem é a da migração `20260903090000`, agrupada por assunto e não por
 * ordem alfabética: é assim que se lê ao lado da função SQL quando se está
 * a acrescentar um tipo novo.
 */
export const TIPOS_NOTIFICACAO = [
  "vinculo_pedido",
  "vinculo_aceite",
  "mensagem",
  "consulta_pedida",
  "consulta_confirmada",
  "consulta_cancelada",
  "consulta_local_mudou",
  "partilha_recebida",
  "pedido_criado",
  "pedido_respondido",
  "pedido_concluido",
  "caso",
  "proposta",
  "cupao_ganho",
  "candidatura_decidida",
  "patamar_desbloqueado",
  "proposta_desbloqueio_decidida",
  "pagamento_recebido",
  "guardiao_iva",
] as const;

export type TipoNotificacao = (typeof TIPOS_NOTIFICACAO)[number];

/**
 * Os que também saem por email — o espelho de
 * `tipos_de_notificacao_com_email()`.
 *
 * Está aqui para o portão poder compará-lo, e para a interface poder
 * dizer a verdade sobre o que chega à caixa de entrada. Quem DECIDE é o
 * gatilho em SQL; isto não é uma segunda decisão.
 */
export const TIPOS_NOTIFICACAO_COM_EMAIL = [
  "vinculo_pedido",
  "vinculo_aceite",
  "consulta_pedida",
  "consulta_confirmada",
  "consulta_cancelada",
  "consulta_local_mudou",
  "cupao_ganho",
  "candidatura_decidida",
  "caso",
  "proposta",
  "proposta_desbloqueio_decidida",
  "guardiao_iva",
] as const satisfies readonly TipoNotificacao[];

/**
 * O que um aviso PEDE de quem o recebe.
 *
 * Não é decoração: é o que separa «tens uma decisão à espera» de «ficas a
 * saber». Um sino que trata as duas coisas da mesma maneira é um sino que
 * se deixa de ouvir — e foi por isso que a 044 recusou avisos de «alguém
 * viu o teu perfil».
 *
 *   · `decidir`  — há uma ação por fazer do outro lado do clique;
 *   · `saber`    — mudou alguma coisa que interessa, e nada é pedido.
 */
export type Exigencia = "decidir" | "saber";

interface Descricao {
  /** Nome do ícone em `components/ui/Icons.tsx`. */
  readonly icone: string;
  readonly exigencia: Exigencia;
  /** O grupo com que aparece na lista, quando há muitos. */
  readonly assunto: "contabilista" | "consulta" | "trabalho" | "dinheiro" | "fiscal";
}

/**
 * Um por tipo, sem exceções: o `Record` obriga o TypeScript a reprovar um
 * tipo novo que ninguém descreveu — e um aviso sem descrição aparecia com
 * o ícone genérico e sem assunto, que é o defeito silencioso desta zona.
 */
export const CATALOGO_NOTIFICACOES: Record<TipoNotificacao, Descricao> = {
  vinculo_pedido: { icone: "Handshake", exigencia: "decidir", assunto: "contabilista" },
  vinculo_aceite: { icone: "Handshake", exigencia: "saber", assunto: "contabilista" },
  mensagem: { icone: "Mail", exigencia: "decidir", assunto: "contabilista" },
  consulta_pedida: { icone: "Calendar", exigencia: "decidir", assunto: "consulta" },
  consulta_confirmada: { icone: "Check", exigencia: "saber", assunto: "consulta" },
  consulta_cancelada: { icone: "Close", exigencia: "saber", assunto: "consulta" },
  consulta_local_mudou: { icone: "MapPin", exigencia: "decidir", assunto: "consulta" },
  partilha_recebida: { icone: "Export", exigencia: "saber", assunto: "trabalho" },
  pedido_criado: { icone: "FileSign", exigencia: "decidir", assunto: "trabalho" },
  pedido_respondido: { icone: "FileSign", exigencia: "saber", assunto: "trabalho" },
  pedido_concluido: { icone: "Check", exigencia: "saber", assunto: "trabalho" },
  caso: { icone: "Briefcase", exigencia: "decidir", assunto: "trabalho" },
  proposta: { icone: "FileSign", exigencia: "decidir", assunto: "dinheiro" },
  cupao_ganho: { icone: "Gift", exigencia: "saber", assunto: "dinheiro" },
  candidatura_decidida: { icone: "ShieldCheck", exigencia: "saber", assunto: "contabilista" },
  patamar_desbloqueado: { icone: "Trophy", exigencia: "saber", assunto: "dinheiro" },
  proposta_desbloqueio_decidida: { icone: "Scale", exigencia: "saber", assunto: "dinheiro" },
  pagamento_recebido: { icone: "Coin", exigencia: "saber", assunto: "dinheiro" },
  guardiao_iva: { icone: "Shield", exigencia: "decidir", assunto: "fiscal" },
};

/** O que fazer com um tipo que a base de dados conhece e este código não. */
const DESCONHECIDO: Descricao = {
  icone: "BellAlert",
  exigencia: "saber",
  assunto: "trabalho",
};

/**
 * Descreve um tipo, mesmo quando ele é mais novo do que este código.
 *
 * Uma versão da aplicação em cache num telemóvel pode receber, por
 * Realtime, um tipo que só existe desde ontem. Devolver `undefined` aqui
 * apagava o aviso do ecrã — e o aviso que se perde é sempre o mais novo,
 * que é o que interessa. Aparece com o ícone genérico e diz o que diz.
 */
export function descreverNotificacao(tipo: string): Descricao {
  return CATALOGO_NOTIFICACOES[tipo as TipoNotificacao] ?? DESCONHECIDO;
}

/** As chaves de deduplicação do Guardião Fiscal. Ver a migração de setembro. */
export function chaveGuardiao(ano: number, nivel: string): string {
  return `guardiao:${ano}:${nivel}`;
}
