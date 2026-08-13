import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Plano } from "@/lib/entitlements";
import { planoTem, type Entitlement } from "@/lib/entitlements";
import type { TipoDocumento } from "@/lib/export/referencia";
import { estadoAcessoDoUtilizador } from "@/lib/billing/access";

const SEGREDO = () => process.env.DOCUMENTOS_HMAC_SEGREDO ?? "";

export function urlCompositor(pedido: Request): string {
  const configurado = process.env.DOCUMENTOS_COMPOSITOR_URL;
  if (configurado) return configurado;
  return `${new URL(pedido.url).origin}/api/compor-documento`;
}

export async function assinar(corpo: string): Promise<string> {
  const segredo = SEGREDO();
  if (!segredo) throw new Error("DOCUMENTOS_HMAC_SEGREDO não está definido.");
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo));
  return Array.from(new Uint8Array(assinatura))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export interface Requerente {
  id: string;
  plano: Plano;
}

/** A sessão vem da Auth; o plano vem da projeção de pagamentos, nunca do perfil. */
export async function requerente(pedido: Request): Promise<Requerente | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const header = pedido.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  const acesso = await estadoAcessoDoUtilizador(data.user.id);
  return { id: data.user.id, plano: acesso.plano };
}

export const podeExportar = (quem: Requerente, permissao: Entitlement): boolean =>
  planoTem(quem.plano, permissao);

export async function registarEmissao(entrada: {
  referencia: string;
  digest: string;
  tipo: TipoDocumento;
  utilizador: string;
  motor: string;
}): Promise<{ registado: boolean; motivo?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return { registado: false, motivo: "Supabase não configurado" };
  try {
    const sb = createClient(url, service, { auth: { persistSession: false } });
    const { error } = await sb.from("documentos_emitidos").insert({
      referencia: entrada.referencia,
      digest: entrada.digest,
      tipo: entrada.tipo,
      utilizador: entrada.utilizador,
      motor: entrada.motor,
    });
    if (error) return { registado: false, motivo: error.message };
    return { registado: true };
  } catch (error) {
    return { registado: false, motivo: error instanceof Error ? error.message : "desconhecido" };
  }
}

export interface EmissaoPublica {
  referencia: string;
  digest: string;
  tipo: string;
  motor: string;
  emitidoEm: string;
}

export async function consultarEmissao(referencia: string): Promise<EmissaoPublica | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  try {
    const sb = createClient(url, service, { auth: { persistSession: false } });
    const { data, error } = await sb.from("documentos_emitidos")
      .select("referencia, digest, tipo, motor, criado_em")
      .eq("referencia", referencia)
      .maybeSingle();
    if (error || !data) return null;
    return {
      referencia: data.referencia as string,
      digest: data.digest as string,
      tipo: data.tipo as string,
      motor: data.motor as string,
      emitidoEm: data.criado_em as string,
    };
  } catch {
    return null;
  }
}
