// ═══════════════════════════════════════════════════════════════════════
//  PAGAMENTOS — o lado do cliente (browser), sob RLS
//  ---------------------------------------------------------------------
//  Duas coisas que este ficheiro NÃO faz, e é o essencial:
//
//   1. Não calcula preços. O valor de uma consulta nasce em
//      `preparar_pagamento_consulta`, do lado do servidor. Aqui só se lê o
//      que já foi decidido, para o mostrar.
//   2. Não escreve estado de pagamento. `pagamentos` não tem política de
//      INSERT nem de UPDATE para `authenticated` — quem escreve é a RPC de
//      servidor e o webhook.
//
//  O que passa por aqui é leitura, e o pedido de abertura de um checkout,
//  que é uma chamada à nossa própria API — não à Stripe.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";

type Linha = Record<string, unknown>;

export type EstadoPagamento =
  | "pendente" | "pago" | "falhado" | "reembolsado" | "cancelado" | "expirado";

export type MomentoPagamento = "no_pedido" | "depois" | "sem_pagamento";

export interface Pagamento {
  id: string;
  contabilistaId: string;
  clienteId: string;
  agendamentoId: string | null;
  momento: "no_pedido" | "depois";
  estado: EstadoPagamento;
  brutoCents: number;
  descontoCents: number;
  liquidoCents: number;
  comissaoCents: number;
  comissaoBps: number;
  descricao: string | null;
  criadoEm: string;
  pagoEm: string | null;
}

function paraPagamento(l: Linha): Pagamento {
  return {
    id: l.id as string,
    contabilistaId: l.contabilista_id as string,
    clienteId: l.cliente_id as string,
    agendamentoId: (l.agendamento_id as string | null) ?? null,
    momento: (l.momento as "no_pedido" | "depois") ?? "depois",
    estado: l.estado as EstadoPagamento,
    brutoCents: (l.bruto_cents as number) ?? 0,
    descontoCents: (l.desconto_cents as number) ?? 0,
    liquidoCents: (l.liquido_cents as number) ?? 0,
    comissaoCents: (l.comissao_cents as number) ?? 0,
    comissaoBps: (l.comissao_bps as number) ?? 0,
    descricao: (l.descricao as string | null) ?? null,
    criadoEm: l.criado_em as string,
    pagoEm: (l.pago_em as string | null) ?? null,
  };
}

const CAMPOS =
  "id, contabilista_id, cliente_id, agendamento_id, momento, estado, " +
  "bruto_cents, desconto_cents, liquido_cents, comissao_cents, comissao_bps, " +
  "descricao, criado_em, pago_em";

export async function listarPagamentos(filtro: {
  contabilistaId?: string;
  clienteId?: string;
  estado?: EstadoPagamento;
}): Promise<Pagamento[]> {
  let q = getSupabase()
    .from("pagamentos")
    .select(CAMPOS)
    .order("criado_em", { ascending: false });

  if (filtro.contabilistaId) q = q.eq("contabilista_id", filtro.contabilistaId);
  if (filtro.clienteId) q = q.eq("cliente_id", filtro.clienteId);
  if (filtro.estado) q = q.eq("estado", filtro.estado);

  const { data, error } = await q.limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraPagamento(l as unknown as Linha));
}

/** Uma consulta concluída, com valor fixado e ainda por pagar. */
export interface ConsultaPorPagar {
  agendamentoId: string;
  contabilistaId: string;
  clienteId: string;
  inicio: string;
  valorCents: number;
  descricao: string;
  pagamentoId: string | null;
  pagamentoEstado: EstadoPagamento | null;
}

export async function consultasPorPagar(clienteId?: string): Promise<ConsultaPorPagar[]> {
  const { data, error } = await getSupabase()
    .rpc("consultas_por_pagar", { p_cliente: clienteId ?? null });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as Linha[]).map((r) => ({
    agendamentoId: r.agendamento_id as string,
    contabilistaId: r.contabilista_id as string,
    clienteId: r.cliente_id as string,
    inicio: r.inicio as string,
    valorCents: (r.valor_cents as number) ?? 0,
    descricao: (r.descricao as string) ?? "Consulta",
    pagamentoId: (r.pagamento_id as string | null) ?? null,
    pagamentoEstado: (r.pagamento_estado as EstadoPagamento | null) ?? null,
  }));
}

/**
 * Abre o Checkout de uma consulta.
 *
 * Devolve o URL da Stripe. Repare-se no que NÃO vai no corpo: nem valor,
 * nem comissão, nem conta de destino. O servidor calcula tudo isso a
 * partir do id do agendamento, e é o que impede um browser de escolher
 * quanto quer pagar.
 */
export async function abrirPagamentoDaConsulta(
  agendamentoId: string,
  cupaoId?: string | null,
): Promise<{ url?: string; erro?: string }> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { erro: "A sessão expirou. Entra outra vez." };

  try {
    const res = await fetch("/api/pagamentos/consulta", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ agendamentoId, cupaoId: cupaoId ?? null }),
    });
    const corpo = (await res.json()) as { url?: string; erro?: string };
    if (!res.ok) return { erro: corpo.erro ?? "Não foi possível abrir o pagamento." };
    return { url: corpo.url };
  } catch {
    return { erro: "Falha de rede. Tenta outra vez." };
  }
}

// ─── A conta de recebimentos do contabilista ───────────────────────────

export interface EstadoRecebimentos {
  ligada: boolean;
  podeCobrar: boolean;
  podeReceber: boolean;
  dadosSubmetidos: boolean;
  requisitos: string[];
}

const SEM_CONTA: EstadoRecebimentos = {
  ligada: false, podeCobrar: false, podeReceber: false,
  dadosSubmetidos: false, requisitos: [],
};

async function comToken<T>(
  caminho: string,
  metodo: "GET" | "POST" | "PUT",
  corpo?: unknown,
): Promise<{ dados?: T; erro?: string }> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { erro: "A sessão expirou. Entra outra vez." };

  try {
    const res = await fetch(caminho, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const json = (await res.json()) as T & { erro?: string };
    if (!res.ok) return { erro: json.erro ?? "Não foi possível." };
    return { dados: json };
  } catch {
    return { erro: "Falha de rede. Tenta outra vez." };
  }
}

export async function estadoDosRecebimentos(): Promise<EstadoRecebimentos> {
  const r = await comToken<EstadoRecebimentos>("/api/contabilistas/stripe", "GET");
  return r.dados ?? SEM_CONTA;
}

/** Cria a conta, se preciso, e devolve o link do formulário da Stripe. */
export async function abrirOnboarding(): Promise<{ url?: string; erro?: string }> {
  const r = await comToken<{ url: string }>("/api/contabilistas/stripe", "POST");
  return r.erro ? { erro: r.erro } : { url: r.dados?.url };
}

/** Relê o estado na Stripe e, se já der, devolve o link do painel dele. */
export async function sincronizarRecebimentos(): Promise<
  EstadoRecebimentos & { url?: string | null; erro?: string }
> {
  const r = await comToken<EstadoRecebimentos & { url: string | null }>(
    "/api/contabilistas/stripe", "PUT",
  );
  if (r.erro || !r.dados) return { ...SEM_CONTA, erro: r.erro };
  return { ...r.dados, ligada: true };
}

/** Abre o Checkout do desbloqueio do próximo patamar. */
export async function abrirDesbloqueio(
  creditos: number,
): Promise<{ url?: string; erro?: string }> {
  const r = await comToken<{ url: string }>(
    "/api/contabilistas/desbloqueio", "POST", { creditos },
  );
  return r.erro ? { erro: r.erro } : { url: r.dados?.url };
}

// ─── Formatação ────────────────────────────────────────────────────────

export function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/** O que o contabilista recebe depois da comissão. */
export function liquidoParaOContabilista(p: Pagamento): number {
  return Math.max(p.liquidoCents - p.comissaoCents, 0);
}
