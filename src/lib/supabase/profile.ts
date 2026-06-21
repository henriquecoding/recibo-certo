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

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const TIPOS_ACEITES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url?: string; erro?: string }> {
  if (!supabaseConfigurado()) return { erro: "Serviço indisponível." };

  if (!TIPOS_ACEITES.includes(file.type)) {
    return { erro: "Formato não suportado. Usa JPG, PNG ou WebP." };
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { erro: "Imagem demasiado grande. Máximo 2 MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;
  const sb = getSupabase();

  const { error: uploadError } = await sb.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { erro: uploadError.message };

  const { data: urlData } = sb.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await sb
    .from("profiles")
    .update({ avatar_url: url, atualizado_em: new Date().toISOString() })
    .eq("id", userId);

  if (dbError) return { erro: dbError.message };

  return { url };
}

export async function removerAvatar(userId: string): Promise<{ erro?: string }> {
  if (!supabaseConfigurado()) return { erro: "Serviço indisponível." };
  const sb = getSupabase();

  const { data: files } = await sb.storage.from(AVATAR_BUCKET).list(userId);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    await sb.storage.from(AVATAR_BUCKET).remove(paths);
  }

  const { error } = await sb
    .from("profiles")
    .update({ avatar_url: null, atualizado_em: new Date().toISOString() })
    .eq("id", userId);

  return error ? { erro: error.message } : {};
}
