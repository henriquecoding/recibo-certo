import { getSupabase, supabaseConfigurado } from "./client";

export interface DadosPerfil {
  nome: string;
  telefone: string;
  nif: string;
  avatarUrl: string;
}

const PERFIL_VAZIO: DadosPerfil = { nome: "", telefone: "", nif: "", avatarUrl: "" };

export async function obterPerfil(userId: string): Promise<DadosPerfil> {
  if (!supabaseConfigurado()) return PERFIL_VAZIO;
  const { data } = await getSupabase()
    .from("profiles")
    .select("nome, telefone, nif, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return PERFIL_VAZIO;
  return {
    nome: data.nome ?? "",
    telefone: data.telefone ?? "",
    nif: data.nif ?? "",
    avatarUrl: data.avatar_url ?? "",
  };
}

export async function guardarPerfil(
  userId: string,
  dados: Partial<DadosPerfil>,
): Promise<{ erro?: string }> {
  if (!supabaseConfigurado()) return { erro: "Serviço indisponível." };

  const payload: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (dados.nome !== undefined) payload.nome = dados.nome || null;
  if (dados.telefone !== undefined) payload.telefone = dados.telefone || null;
  if (dados.nif !== undefined) payload.nif = dados.nif || null;
  if (dados.avatarUrl !== undefined) payload.avatar_url = dados.avatarUrl || null;

  const { error } = await getSupabase()
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  return error ? { erro: error.message } : {};
}
