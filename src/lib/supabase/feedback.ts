// Central de reportes, sugestões e dúvidas de todo o site.
// Envio público (qualquer pessoa); leitura/gestão só admin (RLS — migration 018).
// Validar um feedback útil credita XP ao autor (RPC validar_feedback_xp).

import { getSupabase, supabaseConfigurado } from "./client";
import { contemCodigo, sanitizarTexto, emailValido } from "@/lib/feedback-sanitize";

export type TipoFeedback = "sugestao" | "erro" | "duvida" | "mensagem";
export type EstadoFeedback = "novo" | "em_analise" | "valido" | "resolvido" | "rejeitado";

export interface FeedbackRow {
  id: string;
  tipo: TipoFeedback;
  mensagem: string;
  assunto: string | null;
  area: string | null;
  nome: string | null;
  email: string | null;
  user_id: string | null;
  estado: EstadoFeedback;
  xp_atribuido: number;
  nota_admin: string | null;
  criado_em: string;
  resolvido_em: string | null;
}

export interface EnviarFeedbackInput {
  tipo: TipoFeedback;
  mensagem: string;
  assunto?: string;
  area?: string;
  nome?: string;
  email?: string;
  userId?: string | null;
}

const limpar = (v?: string) => (v && v.trim() ? v.trim() : null);

/** Envia um feedback (sugestão, erro, dúvida ou mensagem). Devolve `{ erro }` se falhar. */
export async function enviarFeedback(input: EnviarFeedbackInput): Promise<{ erro?: string }> {
  if (!supabaseConfigurado()) {
    return { erro: "Envio indisponível: ligação à nuvem não configurada." };
  }
  // Bloqueia código/HTML antes de qualquer limpeza (defesa em profundidade).
  if (contemCodigo(input.mensagem) || contemCodigo(input.assunto ?? "")) {
    return { erro: "Por segurança, não incluas código, HTML ou scripts na mensagem." };
  }
  if (!emailValido(input.email)) {
    return { erro: "O email indicado não parece válido." };
  }
  const mensagem = sanitizarTexto(input.mensagem);
  if (!mensagem) return { erro: "Escreve uma mensagem antes de enviar." };
  if (mensagem.length > 4000) return { erro: "A mensagem é demasiado longa (máx. 4000 caracteres)." };

  const { error } = await getSupabase().from("site_feedback").insert({
    tipo: input.tipo,
    mensagem,
    assunto: limpar(input.assunto ? sanitizarTexto(input.assunto) : undefined),
    area: limpar(input.area),
    nome: limpar(input.nome ? sanitizarTexto(input.nome) : undefined),
    email: limpar(input.email),
    user_id: input.userId ?? null,
  });
  return error ? { erro: error.message } : {};
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function listarFeedback(estado?: EstadoFeedback): Promise<FeedbackRow[]> {
  let q = getSupabase()
    .from("site_feedback")
    .select("*")
    .order("criado_em", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedbackRow[];
}

export async function atualizarEstadoFeedback(
  id: string,
  estado: EstadoFeedback,
): Promise<{ erro?: string }> {
  const resolvido = estado === "resolvido" || estado === "rejeitado" || estado === "valido";
  const { error } = await getSupabase()
    .from("site_feedback")
    .update({ estado, resolvido_em: resolvido ? new Date().toISOString() : null })
    .eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function guardarNotaFeedback(id: string, nota: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("site_feedback")
    .update({ nota_admin: nota.trim() ? nota.trim() : null })
    .eq("id", id);
  return error ? { erro: error.message } : {};
}

/** Valida o feedback e credita XP ao autor (idempotente do lado da BD). */
export async function validarFeedbackComXP(id: string, xp: number): Promise<{ erro?: string }> {
  const { error } = await getSupabase().rpc("validar_feedback_xp", { p_id: id, p_xp: xp });
  return error ? { erro: error.message } : {};
}

export async function eliminarFeedback(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase().from("site_feedback").delete().eq("id", id);
  return error ? { erro: error.message } : {};
}
