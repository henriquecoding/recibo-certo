// ═══════════════════════════════════════════════════════════════════════
//  LADO SERVIDOR DA PLATAFORMA DE CONTABILISTAS
//  ---------------------------------------------------------------------
//  Tudo o que a base de dados fechou ao cliente passa por aqui: aprovar uma
//  candidatura, marcar uma consulta como realizada e carimbar o cartão.
//
//  A regra é a da migração 024, escrita noutro contexto e igualmente
//  válida neste: **o cliente não é fonte de verdade**. O servidor recebe
//  identificadores, confirma quem é quem contra a base de dados, e só então
//  escreve com a chave de serviço.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formatarCodigoCupao } from "./fidelidade";

export function supabaseServico(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Quem fez o pedido, validando o token do Supabase. `null` se não houver. */
export async function utilizadorDoPedido(req: Request): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const cabecalho = req.headers.get("authorization") ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";
  if (!token) return null;

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Código de cupão com aleatoriedade criptográfica.
 *
 * `Math.random()` não serve: um código adivinhável é um desconto adivinhável,
 * e quem o adivinhasse gastava o cupão de outra pessoa.
 */
export function gerarCodigoCupao(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return formatarCodigoCupao(bytes);
}

// ─── Endereço público ──────────────────────────────────────────────────

/** Palavras que não podem ser o endereço de ninguém — colidem com rotas. */
const SLUGS_RESERVADOS = new Set([
  "novo", "novos", "admin", "api", "dashboard", "conta", "perfil", "entrar",
  "sair", "registar", "candidatura", "contabilista", "contabilistas",
  "precos", "termos", "privacidade", "cookies", "guias", "ferramentas",
  "pesquisar", "quiz-fiscal", "metodologia", "parceiros", "integracoes",
]);

/** "Ana Sofia Martins" → "ana-sofia-martins". */
export function slugificar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function slugValido(slug: string): boolean {
  return (
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) &&
    slug.length >= 3 &&
    slug.length <= 60 &&
    !SLUGS_RESERVADOS.has(slug)
  );
}

/**
 * Encontra um endereço livre a partir do nome. Sufixa com um número quando
 * já existe — dois «João Silva» são perfeitamente possíveis.
 */
export async function slugLivre(sb: SupabaseClient, nome: string): Promise<string> {
  const raiz = slugificar(nome) || "contabilista";
  const base = slugValido(raiz) ? raiz : `cc-${raiz}`.slice(0, 60);

  for (let i = 0; i < 50; i++) {
    const tentativa = i === 0 ? base : `${base}-${i + 1}`.slice(0, 60);
    if (!slugValido(tentativa)) continue;
    const { data } = await sb
      .from("contabilistas")
      .select("slug")
      .eq("slug", tentativa)
      .maybeSingle();
    if (!data) return tentativa;
  }
  // Recurso final: sufixo aleatório. Nunca devolve um endereço ocupado.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`.slice(0, 60);
}

// ─── Identidade na plataforma ──────────────────────────────────────────

export interface ContabilistaDoPedido {
  userId: string;
  slug: string;
  nome: string;
}

/**
 * Confirma que quem fez o pedido é um contabilista APROVADO.
 *
 * Lê com a chave de serviço de propósito: a pergunta é «esta pessoa tem
 * direito a esta operação?», e a resposta não pode depender de a própria
 * pessoa conseguir ler a linha.
 */
export async function contabilistaAprovadoDoPedido(
  sb: SupabaseClient,
  userId: string
): Promise<ContabilistaDoPedido | null> {
  const { data } = await sb
    .from("contabilistas")
    .select("user_id, slug, nome, estado")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data || data.estado !== "aprovado") return null;
  return {
    userId: data.user_id as string,
    slug: data.slug as string,
    nome: data.nome as string,
  };
}
