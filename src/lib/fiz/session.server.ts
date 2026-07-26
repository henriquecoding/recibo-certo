// ═══════════════════════════════════════════════════════════════════════
//  SESSÃO E LIGAÇÃO FIZ (lado servidor)
//  ---------------------------------------------------------------------
//  Resolve o utilizador autenticado a partir do cabeçalho Authorization e
//  gere a ligação FIZ guardada em `partner_connections`.
//
//  Os tokens só são decifrados aqui e nunca saem para a resposta HTTP.
//  A renovação é transparente: se o access token expirou, usa-se o refresh
//  token; se este também falhar, a ligação passa a "reauthorization_required"
//  em vez de ficar num estado ambíguo.
// ═══════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cifrarToken, decifrarToken } from "./tokens.server";
import { renovarTokens } from "./oauth.server";
import { FizError } from "./errors";
import type { ConnectionState } from "./contracts";

export interface UtilizadorSessao {
  id: string;
  email?: string;
}

export function servicoSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function utilizadorDoPedido(req: Request): Promise<UtilizadorSessao | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const sb = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data } = await sb.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
}

interface LigacaoRow {
  user_id: string;
  partner_user_id: string;
  scopes: string[];
  access_token_ciphertext: string | null;
  refresh_token_ciphertext: string | null;
  token_expires_at: string | null;
  status: "connected" | "reauthorization_required" | "revoked";
}

export interface Ligacao {
  estado: ConnectionState;
  scopes: string[];
  partnerUserId?: string;
  ligadaEm?: string;
}

const ESTADO_BD_PARA_CONTRATO: Record<LigacaoRow["status"], ConnectionState> = {
  connected: "CONNECTED",
  reauthorization_required: "REAUTHORIZATION_REQUIRED",
  revoked: "REVOKED",
};

export async function obterLigacao(userId: string): Promise<Ligacao> {
  const sb = servicoSupabase();
  if (!sb) return { estado: "NOT_CONNECTED", scopes: [] };

  const { data } = await sb
    .from("partner_connections")
    .select("status, scopes, partner_user_id, connected_at")
    .eq("user_id", userId)
    .eq("partner", "fiz")
    .maybeSingle();

  if (!data) return { estado: "NOT_CONNECTED", scopes: [] };
  return {
    estado: ESTADO_BD_PARA_CONTRATO[data.status as LigacaoRow["status"]] ?? "NOT_CONNECTED",
    scopes: (data.scopes as string[]) ?? [],
    partnerUserId: data.partner_user_id as string,
    ligadaEm: data.connected_at as string,
  };
}

export async function guardarLigacao(params: {
  userId: string;
  partnerUserId: string;
  scopes: string[];
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}): Promise<void> {
  const sb = servicoSupabase();
  if (!sb) throw new FizError("sem_credenciais", "Supabase não configurado no servidor.");

  const { error } = await sb.from("partner_connections").upsert(
    {
      user_id: params.userId,
      partner: "fiz",
      partner_user_id: params.partnerUserId,
      scopes: params.scopes,
      access_token_ciphertext: cifrarToken(params.accessToken),
      refresh_token_ciphertext: params.refreshToken ? cifrarToken(params.refreshToken) : null,
      token_expires_at: new Date(Date.now() + params.expiresIn * 1000).toISOString(),
      status: "connected",
      revoked_at: null,
    },
    { onConflict: "user_id,partner" },
  );
  if (error) throw new FizError("indisponivel", `Não foi possível guardar a ligação: ${error.message}`);
}

async function marcarEstado(userId: string, status: LigacaoRow["status"]): Promise<void> {
  const sb = servicoSupabase();
  if (!sb) return;
  await sb
    .from("partner_connections")
    .update({
      status,
      ...(status === "revoked"
        ? { revoked_at: new Date().toISOString(), access_token_ciphertext: null, refresh_token_ciphertext: null }
        : {}),
    })
    .eq("user_id", userId)
    .eq("partner", "fiz");
}

/**
 * Devolve um access token válido, renovando-o se preciso.
 * Lança `FizError("nao_autorizado")` quando é necessário voltar a autorizar.
 */
export async function accessTokenValido(userId: string): Promise<string> {
  const sb = servicoSupabase();
  if (!sb) throw new FizError("sem_credenciais", "Supabase não configurado no servidor.");

  const { data } = await sb
    .from("partner_connections")
    .select("access_token_ciphertext, refresh_token_ciphertext, token_expires_at, status")
    .eq("user_id", userId)
    .eq("partner", "fiz")
    .maybeSingle();

  const linha = data as Pick<LigacaoRow, "access_token_ciphertext" | "refresh_token_ciphertext" | "token_expires_at" | "status"> | null;
  if (!linha || linha.status === "revoked") {
    throw new FizError("nao_autorizado", "Não há ligação ativa à FIZ.");
  }

  const expiraEm = linha.token_expires_at ? Date.parse(linha.token_expires_at) : 0;
  const aindaValido = linha.access_token_ciphertext && expiraEm > Date.now() + 60_000;
  if (aindaValido) return decifrarToken(linha.access_token_ciphertext as string);

  if (!linha.refresh_token_ciphertext) {
    await marcarEstado(userId, "reauthorization_required");
    throw new FizError("nao_autorizado", "A ligação à FIZ expirou.");
  }

  try {
    const renovados = await renovarTokens(decifrarToken(linha.refresh_token_ciphertext));
    await sb
      .from("partner_connections")
      .update({
        access_token_ciphertext: cifrarToken(renovados.accessToken),
        refresh_token_ciphertext: renovados.refreshToken ? cifrarToken(renovados.refreshToken) : linha.refresh_token_ciphertext,
        token_expires_at: new Date(Date.now() + renovados.expiresIn * 1000).toISOString(),
        status: "connected",
      })
      .eq("user_id", userId)
      .eq("partner", "fiz");
    return renovados.accessToken;
  } catch {
    await marcarEstado(userId, "reauthorization_required");
    throw new FizError("nao_autorizado", "A ligação à FIZ precisa de ser autorizada outra vez.");
  }
}

/** Revogação local. A revogação do lado da FIZ é feita pela rota /disconnect. */
export async function apagarLigacao(userId: string): Promise<void> {
  await marcarEstado(userId, "revoked");
}

/** Chamado pelo webhook `user.connection.revoked`. */
export async function revogarPorPartnerUserId(partnerUserId: string): Promise<void> {
  const sb = servicoSupabase();
  if (!sb) return;
  await sb
    .from("partner_connections")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      access_token_ciphertext: null,
      refresh_token_ciphertext: null,
    })
    .eq("partner", "fiz")
    .eq("partner_user_id", partnerUserId);
}
