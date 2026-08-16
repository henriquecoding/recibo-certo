// ═══════════════════════════════════════════════════════════════════════
//  SALA DE ACOMPANHAMENTO — acesso a dados, sob RLS
//  ---------------------------------------------------------------------
//  Como no resto de `lib/contabilistas`: nenhuma verificação de permissão
//  vive aqui. Quem autoriza é a migração 055 — a política de leitura da
//  tabela e, na linha do tempo, a verificação escrita à mão dentro da
//  função (que é SECURITY DEFINER e por isso passa por cima da RLS).
//
//  Uma verificação em JavaScript seria uma segunda opinião que ninguém
//  consulta, porque o browser está do lado de quem a quiser contornar.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";
import type { EventoTimeline, PedidoCliente, TipoEvento, TipoPedido } from "./tipos";

type Linha = Record<string, unknown>;

function paraPedido(l: Linha): PedidoCliente {
  return {
    id: l.id as string,
    vinculoId: l.vinculo_id as string,
    criadoPor: l.criado_por as string,
    tipo: l.tipo as TipoPedido,
    titulo: l.titulo as string,
    descricao: (l.descricao as string | null) ?? null,
    prazo: (l.prazo as string | null) ?? null,
    obrigatorio: (l.obrigatorio as boolean) ?? true,
    estado: l.estado as PedidoCliente["estado"],
    respostaTexto: (l.resposta_texto as string | null) ?? null,
    respostaMensagemId: (l.resposta_mensagem_id as string | null) ?? null,
    respondidoEm: (l.respondido_em as string | null) ?? null,
    concluidoEm: (l.concluido_em as string | null) ?? null,
    criadoEm: l.criado_em as string,
  };
}

const COLUNAS =
  "id, vinculo_id, criado_por, tipo, titulo, descricao, prazo, obrigatorio, estado," +
  " resposta_texto, resposta_mensagem_id, respondido_em, concluido_em, criado_em";

export async function listarPedidos(vinculoId: string): Promise<PedidoCliente[]> {
  const { data, error } = await getSupabase()
    .from("pedido_cliente")
    .select(COLUNAS)
    .eq("vinculo_id", vinculoId)
    .order("criado_em", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraPedido(l as unknown as Linha));
}

export interface NovoPedido {
  vinculoId: string;
  tipo: TipoPedido;
  titulo: string;
  descricao?: string | null;
  /** `AAAA-MM-DD`. Ver a nota sobre datas na migração 055. */
  prazo?: string | null;
  obrigatorio?: boolean;
}

/**
 * Os motivos que as RPC devolvem, ditos a quem está a ler.
 *
 * Traduzir aqui e não no componente: são as mesmas frases nos dois lados
 * da relação, e um motivo novo que ninguém traduziu aparece como ele
 * próprio em vez de desaparecer num «não foi possível».
 */
const MOTIVOS: Record<string, string> = {
  sem_permissao: "Não tens permissão para isto.",
  relacao_inativa: "O acompanhamento não está ativo.",
  prazo_no_passado: "Esse prazo já passou.",
  pedidos_a_mais: "Já há pedidos a mais por tratar nesta relação.",
  tipo_desconhecido: "Esse tipo de pedido não existe.",
  titulo_curto: "Escreve um título que se perceba.",
  pedido_fechado: "Este pedido já foi fechado.",
  resposta_vazia: "Escreve alguma coisa, ou junta um ficheiro.",
  mensagem_invalida: "Não foi possível ligar o ficheiro a este pedido.",
  decisao_desconhecida: "Essa decisão não existe.",
  transicao_nao_permitida: "Este pedido já não estava nesse estado.",
};

function traduzir(r: { ok?: boolean; motivo?: string } | null): { erro?: string } {
  if (r?.ok) return {};
  const m = r?.motivo ?? "";
  return { erro: MOTIVOS[m] ?? "Não foi possível concluir." };
}

export async function criarPedido(p: NovoPedido): Promise<{ erro?: string; id?: string }> {
  const { data, error } = await getSupabase().rpc("criar_pedido_cliente", {
    p_vinculo: p.vinculoId,
    p_tipo: p.tipo,
    p_titulo: p.titulo,
    p_descricao: p.descricao ?? null,
    p_prazo: p.prazo || null,
    p_obrigatorio: p.obrigatorio ?? true,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string; id?: string };
  const t = traduzir(r);
  return t.erro ? t : { id: r.id };
}

export async function responderPedido(p: {
  pedidoId: string;
  texto?: string | null;
  mensagemId?: string | null;
}): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("responder_pedido_cliente", {
    p_pedido: p.pedidoId,
    p_texto: p.texto ?? null,
    p_mensagem: p.mensagemId ?? null,
  });
  if (error) return { erro: error.message };
  return traduzir(data as { ok?: boolean; motivo?: string });
}

export type DecisaoPedido = "concluir" | "analisar" | "reabrir" | "cancelar";

export async function decidirPedido(
  pedidoId: string,
  decisao: DecisaoPedido,
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("decidir_pedido_cliente", {
    p_pedido: pedidoId,
    p_decisao: decisao,
  });
  if (error) return { erro: error.message };
  return traduzir(data as { ok?: boolean; motivo?: string });
}

// ─── A linha do tempo ──────────────────────────────────────────────────

/**
 * Uma página da linha do tempo, do mais recente para trás.
 *
 * `ate` é o cursor: passa-se o `quando` do último evento recebido para
 * pedir os anteriores. É deliberadamente diferente de um `offset` — com
 * offset, uma mensagem nova a chegar entre dois pedidos empurra tudo e a
 * página seguinte repete uma linha que já se tinha visto.
 */
export async function listarTimeline(p: {
  vinculoId: string;
  ate?: string | null;
  limite?: number;
}): Promise<EventoTimeline[]> {
  const { data, error } = await getSupabase().rpc("listar_timeline_vinculo", {
    p_vinculo: p.vinculoId,
    p_ate: p.ate ?? null,
    p_limite: p.limite ?? 30,
  });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as Linha[]).map((l) => ({
    tipo: l.tipo as TipoEvento,
    referenciaId: l.referencia_id as string,
    quando: l.quando as string,
    autorId: (l.autor_id as string | null) ?? null,
    titulo: (l.titulo as string | null) ?? null,
    corpo: (l.corpo as string | null) ?? null,
    estado: (l.estado as string | null) ?? null,
    meta: ((l.meta as Record<string, unknown> | null) ?? {}),
  }));
}

/**
 * Escuta pedidos novos e alterados nesta relação.
 *
 * Devolve a função de cancelamento, e quem chama TEM de a usar na limpeza
 * do efeito: um canal por montagem que nunca fecha esgota as ligações
 * simultâneas do plano, e o sintoma aparece longe da causa.
 */
export function escutarPedidos(vinculoId: string, aoMudar: () => void): () => void {
  const sb = getSupabase();
  const canal = sb
    .channel(`pedidos:${vinculoId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pedido_cliente",
        filter: `vinculo_id=eq.${vinculoId}`,
      },
      () => aoMudar(),
    )
    .subscribe();

  return () => { void sb.removeChannel(canal); };
}
