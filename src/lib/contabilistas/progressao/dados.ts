// ═══════════════════════════════════════════════════════════════════════
//  FUNDADORES E NEGOCIAÇÃO — acesso a dados, sob RLS
//  ---------------------------------------------------------------------
//  Como o resto: nenhuma verificação de permissão vive aqui. Quem autoriza
//  é a migração `20260819100000`. Um `if` em JavaScript sobre quem pode o
//  quê seria uma segunda opinião que ninguém consulta, porque o browser
//  está do lado de quem a quiser contornar.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";
import {
  LUGARES_DESCONHECIDOS, normalizarLugares,
  type LugaresFundadores, type PropostaDesbloqueio,
} from "./fundadores";

type Linha = Record<string, unknown>;

const MOTIVO: Record<string, string> = {
  sem_permissao: "Só uma conta de contabilista aprovada pode fazer isto.",
  nao_autenticado: "Entra na tua conta primeiro.",
  justificacao_curta: "A justificação é curta demais para ser lida a sério.",
  valor_invalido: "Diz que valor propões.",
  acima_do_catalogo: "O valor tem de ser abaixo do preço de tabela.",
  sem_patamar_seguinte: "Já estás no último patamar — não há o que desbloquear.",
  ja_tens_uma_aberta: "Já tens uma proposta à espera de resposta. Espera por ela.",
  so_a_administracao: "Só a administração pode decidir isto.",
  decisao_invalida: "Decisão desconhecida.",
  falta_o_valor: "Diz que valor contrapões.",
  falta_a_razao: "Recusar sem dizer porquê deixa a pessoa a adivinhar.",
  nao_decidivel: "Esta proposta já não está por decidir.",
  nao_aceitavel: "Esta contraproposta já não está disponível.",
  esgotado: "Os lugares de fundador estão todos ocupados.",
};

const traduzir = (m?: string) => MOTIVO[m ?? ""] ?? "Não foi possível concluir.";

/* ── Os lugares ────────────────────────────────────────────────────── */

/**
 * Quantos lugares de fundador restam.
 *
 * Falha FECHADA: sem resposta, devolve «esgotado e não verificado». A
 * interface tem de saber a diferença entre «não há lugares» e «não
 * sabemos» — anunciar um lugar que já não existe é uma promessa que se
 * quebra no instante seguinte.
 */
export async function lugaresFundadores(): Promise<LugaresFundadores> {
  try {
    const { data, error } = await getSupabase().rpc("lugares_fundadores");
    if (error || !data) return LUGARES_DESCONHECIDOS;
    const linha = (Array.isArray(data) ? data[0] : data) as Partial<LugaresFundadores>;
    return normalizarLugares(linha);
  } catch {
    return LUGARES_DESCONHECIDOS;
  }
}

/** O lugar do próprio, se tiver algum. */
export async function meuLugarDeFundador(): Promise<{
  numero: number;
  atribuidoEm: string;
} | null> {
  const { data } = await getSupabase()
    .from("contabilista_fundadores")
    .select("numero, atribuido_em")
    .is("libertado_em", null)
    .maybeSingle();

  if (!data) return null;
  const l = data as unknown as Linha;
  return { numero: l.numero as number, atribuidoEm: l.atribuido_em as string };
}

/* ── A negociação ──────────────────────────────────────────────────── */

function paraProposta(l: Linha): PropostaDesbloqueio {
  return {
    id: l.id as string,
    contabilistaId: l.contabilista_id as string,
    patamarAlvo: l.patamar_alvo as number,
    precoCatalogoCents: l.preco_catalogo_cents as number,
    valorPropostoCents: l.valor_proposto_cents as number,
    justificacao: l.justificacao as string,
    estado: l.estado as PropostaDesbloqueio["estado"],
    contrapropostaCents: (l.contraproposta_cents as number | null) ?? null,
    notaAdmin: (l.nota_admin as string | null) ?? null,
    decididaEm: (l.decidida_em as string | null) ?? null,
    validaAte: (l.valida_ate as string | null) ?? null,
    criadoEm: l.criado_em as string,
  };
}

/** As minhas propostas, mais recente primeiro. */
export async function minhasPropostas(): Promise<PropostaDesbloqueio[]> {
  const { data } = await getSupabase()
    .from("desbloqueio_propostas")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(20);
  return ((data ?? []) as unknown as Linha[]).map(paraProposta);
}

export async function proporValor(
  valorCents: number, justificacao: string,
): Promise<{ erro?: string; id?: string }> {
  const { data, error } = await getSupabase().rpc("propor_valor_de_desbloqueio", {
    p_valor_cents: Math.round(valorCents),
    p_justificacao: justificacao.trim(),
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string; id?: string };
  return r.ok ? { id: r.id } : { erro: traduzir(r.motivo) };
}

export async function aceitarContraproposta(id: string): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("aceitar_contraproposta", {
    p_proposta: id,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}

/* ── O lado da administração ───────────────────────────────────────── */

/** A fila: propostas por decidir, mais antiga primeiro. */
export async function filaDePropostas(): Promise<PropostaDesbloqueio[]> {
  const { data } = await getSupabase()
    .from("desbloqueio_propostas")
    .select("*")
    .eq("estado", "enviada")
    .order("criado_em")
    .limit(100);
  return ((data ?? []) as unknown as Linha[]).map(paraProposta);
}

export async function decidirProposta(
  id: string,
  decisao: "aceitar" | "contrapor" | "recusar",
  valorCents?: number,
  nota?: string,
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("decidir_proposta_de_desbloqueio", {
    p_proposta: id,
    p_decisao: decisao,
    p_valor: valorCents === undefined ? null : Math.round(valorCents),
    p_nota: nota?.trim() || null,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}
