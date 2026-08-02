// ─────────────────────────────────────────────────────────────────────
//  Emissão de documentos — assinatura, registo e verificação
//  ---------------------------------------------------------------------
//  Só corre no servidor. É aqui que vive a razão de negócio de toda a
//  migração: enquanto o PDF for gerado no cliente, `localStorage.clear()`
//  devolve as exportações todas, para sempre, em qualquer browser. O servidor
//  nunca via o pedido, por isso o gate era decorativo.
//
//  O que fica registado é a LINHA DE VERIFICAÇÃO — referência, impressão
//  digital, tipo, utilizador, data. Nunca os dados: quem verifica uma
//  referência confirma que ela existe e a que digest corresponde, e mais nada.
// ─────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import type { Plano } from "@/lib/entitlements";
import { planoTem, type Entitlement } from "@/lib/entitlements";
import type { TipoDocumento } from "@/lib/export/referencia";

/** Segredo partilhado com a função Python que compõe o PDF. */
const SEGREDO = () => process.env.DOCUMENTOS_HMAC_SEGREDO ?? "";

/**
 * URL da função compositora. Em produção é a própria implantação; em
 * desenvolvimento pode apontar para outro sítio.
 */
export function urlCompositor(pedido: Request): string {
  const configurado = process.env.DOCUMENTOS_COMPOSITOR_URL;
  if (configurado) return configurado;
  const origem = new URL(pedido.url).origin;
  return `${origem}/api/compor-documento`;
}

/** HMAC-SHA256 do corpo exato que segue para o compositor. */
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
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface Requerente {
  id: string;
  plano: Plano;
}

/**
 * Sessão + direito, verificados NO SERVIDOR.
 *
 * Devolve `null` quando não há sessão válida — a rota responde 401 — e o plano
 * quando há. O gate do cliente mantém-se como cortesia (evita o pedido
 * desnecessário), mas a verdade é esta.
 */
export async function requerente(pedido: Request): Promise<Requerente | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const cabecalho = pedido.headers.get("authorization") ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";
  if (!token) return null;

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: perfil } = await sb.from("profiles").select("plano").eq("id", data.user.id).single();
  const plano: Plano = perfil?.plano === "plus" ? "plus" : "free";
  return { id: data.user.id, plano };
}

/** True quando o requerente tem a permissão pedida. */
export const podeExportar = (quem: Requerente, permissao: Entitlement): boolean =>
  planoTem(quem.plano, permissao);

/**
 * Regista a emissão. Falhar aqui NÃO impede a entrega do documento: perder a
 * linha de verificação é mau, mas negar ao assinante o ficheiro que já foi
 * calculado e composto é pior.
 */
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
  } catch (erro) {
    return { registado: false, motivo: erro instanceof Error ? erro.message : "desconhecido" };
  }
}

export interface EmissaoPublica {
  referencia: string;
  digest: string;
  tipo: string;
  motor: string;
  emitidoEm: string;
}

/**
 * Consulta pública de uma referência. Devolve o que confirma a emissão e mais
 * nada — nem o utilizador, nem os dados, nem o valor do documento.
 */
export async function consultarEmissao(referencia: string): Promise<EmissaoPublica | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;

  try {
    const sb = createClient(url, service, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from("documentos_emitidos")
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
