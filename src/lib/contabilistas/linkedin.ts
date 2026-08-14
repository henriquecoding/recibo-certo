import type { UserIdentity } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

export const LINKEDIN_PROVIDER = "linkedin_oidc" as const;

export interface LinkedInPublico {
  url: string | null;
  avatarUrl: string | null;
  ligadoEm: string | null;
}

function identidadeLinkedIn(identidades: UserIdentity[]): UserIdentity | null {
  return identidades.find((i) => i.provider === LINKEDIN_PROVIDER) ?? null;
}

/**
 * Aceita o que a pessoa costuma colar (com ou sem https://), mas devolve uma
 * URL canónica, sem query/hash. Só perfis pessoais `/in/...` são aceites.
 */
export function normalizarUrlLinkedIn(valor: string): string | null {
  const cru = valor.trim();
  if (!cru) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(cru) ? cru : `https://${cru}`);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return null;
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;

    const partes = url.pathname.split("/").filter(Boolean);
    if (partes.length !== 2 || partes[0].toLowerCase() !== "in" || !partes[1]) return null;

    return `https://www.linkedin.com/in/${partes[1]}`;
  } catch {
    return null;
  }
}

/**
 * O claim `picture` do LinkedIn pode ser uma URL assinada e temporária.
 * Atualmente essas URLs usam o parâmetro `e` como epoch em segundos. Se o
 * provider mudar o formato e não houver esse parâmetro, não inventamos uma
 * expiração: a imagem é tentada e o componente mantém fallback em `onError`.
 */
export function avatarLinkedInExpirou(valor: string | null | undefined, agora = Date.now()): boolean {
  if (!valor) return false;
  try {
    const url = new URL(valor);
    const expiracao = url.searchParams.get("e");
    if (!expiracao || !/^\d+$/.test(expiracao)) return false;
    const epochMs = Number(expiracao) * 1000;
    return Number.isFinite(epochMs) && epochMs <= agora;
  } catch {
    return true;
  }
}

export async function obterLinkedInPublico(contabilistaId: string): Promise<LinkedInPublico> {
  const { data, error } = await getSupabase()
    .from("contabilistas")
    .select("linkedin_url, linkedin_avatar_url, linkedin_ligado_em")
    .eq("user_id", contabilistaId)
    .maybeSingle();

  if (error || !data) return { url: null, avatarUrl: null, ligadoEm: null };
  const linha = data as Record<string, unknown>;
  return {
    url: (linha.linkedin_url as string | null) ?? null,
    avatarUrl: (linha.linkedin_avatar_url as string | null) ?? null,
    ligadoEm: (linha.linkedin_ligado_em as string | null) ?? null,
  };
}

export async function obterEstadoLinkedIn(): Promise<{
  ligado: boolean;
  identidade: UserIdentity | null;
  fotoDaIdentidade: string | null;
  erro?: string;
}> {
  const { data, error } = await getSupabase().auth.getUserIdentities();
  if (error) return { ligado: false, identidade: null, fotoDaIdentidade: null, erro: error.message };

  const identidade = identidadeLinkedIn(data?.identities ?? []);
  const meta = (identidade?.identity_data ?? {}) as Record<string, unknown>;
  const foto = typeof meta.picture === "string"
    ? meta.picture
    : typeof meta.avatar_url === "string"
      ? meta.avatar_url
      : null;

  return { ligado: Boolean(identidade), identidade, fotoDaIdentidade: foto };
}

export async function sincronizarLinkedIn(): Promise<{ ligado: boolean; avatarUrl: string | null; erro?: string }> {
  const { data, error } = await getSupabase().rpc("sincronizar_linkedin_contabilista");
  if (error) return { ligado: false, avatarUrl: null, erro: error.message };

  const r = (data ?? {}) as { ligado?: boolean; avatar_url?: string | null };
  return { ligado: Boolean(r.ligado), avatarUrl: r.avatar_url ?? null };
}

export async function ligarLinkedIn(): Promise<{ erro?: string }> {
  const redirectTo = `${window.location.origin}/contabilista/perfil?linkedin=ligado`;
  const { error } = await getSupabase().auth.linkIdentity({
    provider: LINKEDIN_PROVIDER,
    options: {
      redirectTo,
      // Só pedimos o necessário para confirmar a identidade e obter a foto.
      scopes: "openid profile",
    },
  });
  return error ? { erro: error.message } : {};
}

export async function desligarLinkedIn(): Promise<{ erro?: string }> {
  const estado = await obterEstadoLinkedIn();
  if (estado.erro) return { erro: estado.erro };
  if (!estado.identidade) return {};

  const { error } = await getSupabase().auth.unlinkIdentity(estado.identidade);
  if (error) return { erro: error.message };

  const sync = await sincronizarLinkedIn();
  return sync.erro ? { erro: sync.erro } : {};
}

/**
 * Renova os claims OIDC (incluindo `picture`) quando o LinkedIn deixou uma
 * fotografia temporária expirar. O utilizador continua autenticado pela sua
 * identidade principal; só a identidade LinkedIn secundária é desligada e
 * imediatamente volta a pedir consentimento ao provider.
 */
export async function renovarLinkedIn(): Promise<{ erro?: string }> {
  const estado = await obterEstadoLinkedIn();
  if (estado.erro) return { erro: estado.erro };
  if (!estado.identidade) return ligarLinkedIn();

  const { data: identidades, error: identidadesErro } = await getSupabase().auth.getUserIdentities();
  if (identidadesErro) return { erro: identidadesErro.message };
  if ((identidades?.identities?.length ?? 0) < 2) {
    return { erro: "Não é possível renovar esta ligação sem outro método de acesso ativo na conta." };
  }

  const { error: unlinkErro } = await getSupabase().auth.unlinkIdentity(estado.identidade);
  if (unlinkErro) return { erro: unlinkErro.message };

  // Limpa a fotografia/subject verificados antes da nova autorização. Se esta
  // sincronização falhar, ainda assim voltamos a pedir consentimento: o novo
  // claim será sincronizado quando a página regressar do LinkedIn.
  await sincronizarLinkedIn();
  return ligarLinkedIn();
}

export async function guardarUrlLinkedIn(
  contabilistaId: string,
  valor: string,
): Promise<{ url?: string | null; erro?: string }> {
  const url = normalizarUrlLinkedIn(valor);
  if (valor.trim() && !url) {
    return { erro: "Usa um endereço de perfil LinkedIn no formato linkedin.com/in/teu-perfil." };
  }

  const { error } = await getSupabase()
    .from("contabilistas")
    .update({ linkedin_url: url })
    .eq("user_id", contabilistaId);

  return error ? { erro: error.message } : { url };
}
