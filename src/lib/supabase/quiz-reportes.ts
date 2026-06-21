// Reporte de erros nas perguntas do Quiz Fiscal.
// Inserção pública (qualquer pessoa pode reportar); leitura/gestão só admin.
// A RLS (migration 012) garante o controlo de acesso no servidor.

import { getSupabase, supabaseConfigurado } from "./client";

export type EstadoReporte = "novo" | "em_analise" | "resolvido" | "rejeitado";

export interface ReporteQuizRow {
  id: string;
  question_id: string;
  pergunta_texto: string | null;
  categoria: string | null;
  user_id: string | null;
  descricao: string | null;
  xp_atribuido: number;
  estado: EstadoReporte;
  criado_em: string;
  resolvido_em: string | null;
}

export interface ReportarPerguntaInput {
  questionId: string;
  perguntaTexto?: string;
  categoria?: string;
  descricao?: string;
  userId?: string | null;
  xpAtribuido?: number;
}

/** Cria um reporte de erro de uma pergunta. Devolve `{ erro }` em caso de falha. */
export async function reportarPergunta(
  input: ReportarPerguntaInput
): Promise<{ erro?: string }> {
  if (!supabaseConfigurado()) {
    return { erro: "Reporte indisponível: ligação à nuvem não configurada." };
  }
  const { error } = await getSupabase().from("quiz_question_reports").insert({
    question_id: input.questionId,
    pergunta_texto: input.perguntaTexto ?? null,
    categoria: input.categoria ?? null,
    user_id: input.userId ?? null,
    descricao: input.descricao?.trim() ? input.descricao.trim() : null,
    xp_atribuido: input.xpAtribuido ?? 0,
  });
  return error ? { erro: error.message } : {};
}

// ── Admin ────────────────────────────────────────────────────────────────

export async function listarReportesQuiz(estado?: EstadoReporte): Promise<ReporteQuizRow[]> {
  let q = getSupabase()
    .from("quiz_question_reports")
    .select("*")
    .order("criado_em", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ReporteQuizRow[];
}

export async function contarReportesQuiz(estado?: EstadoReporte): Promise<number> {
  let q = getSupabase()
    .from("quiz_question_reports")
    .select("*", { count: "exact", head: true });
  if (estado) q = q.eq("estado", estado);
  const { count } = await q;
  return count ?? 0;
}

export async function atualizarEstadoReporte(
  id: string,
  estado: EstadoReporte
): Promise<{ erro?: string }> {
  const resolvido = estado === "resolvido" || estado === "rejeitado";
  const { error } = await getSupabase()
    .from("quiz_question_reports")
    .update({ estado, resolvido_em: resolvido ? new Date().toISOString() : null })
    .eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function eliminarReporte(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("quiz_question_reports")
    .delete()
    .eq("id", id);
  return error ? { erro: error.message } : {};
}
