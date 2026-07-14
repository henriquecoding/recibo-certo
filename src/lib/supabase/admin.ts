// Helpers de acesso ao Supabase para a área de admin.
// Todas as operações de escrita passam pela RLS — só funcionam com sessão admin.

import { getSupabase } from "./client";
import { emailValido, normalizarEmail } from "@/lib/validacao-email";

// ── Anúncios ─────────────────────────────────────────────────

export type TipoAnuncio = "parceiro" | "google_ads" | "banner" | "nativo";

export interface AnuncioRow {
  id: string;
  tipo: TipoAnuncio;
  nome: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
  posicoes: string[];
  mostrar_desktop: boolean;
  mostrar_mobile: boolean;
  // parceiro
  url: string | null;
  cta: string | null;
  icone: string | null;
  logo_url: string | null;
  // google ads
  google_client_id: string | null;
  google_slot_id: string | null;
  google_format: string | null;
  google_responsive: boolean | null;
  // banner
  banner_titulo: string | null;
  banner_texto: string | null;
  banner_url: string | null;
  banner_cor_fundo: string | null;
  banner_cor_texto: string | null;
  banner_imagem_url: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type AnuncioInput = Omit<AnuncioRow, "criado_em" | "atualizado_em">;

export async function listarAnunciosTodos(): Promise<AnuncioRow[]> {
  const { data, error } = await getSupabase()
    .from("anuncios")
    .select("*")
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AnuncioRow[];
}

export async function buscarAnuncio(id: string): Promise<AnuncioRow | null> {
  const { data } = await getSupabase()
    .from("anuncios")
    .select("*")
    .eq("id", id)
    .single();
  return (data as AnuncioRow | null) ?? null;
}

export async function criarAnuncio(a: AnuncioInput): Promise<{ erro?: string }> {
  const { error } = await getSupabase().from("anuncios").insert(a);
  return error ? { erro: error.message } : {};
}

export async function atualizarAnuncio(
  id: string,
  dados: Partial<Omit<AnuncioInput, "id">>
): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("anuncios")
    .update(dados)
    .eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function eliminarAnuncio(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase().from("anuncios").delete().eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function reordenarAnuncios(
  items: { id: string; ordem: number }[]
): Promise<{ erro?: string }> {
  const sb = getSupabase();
  for (const { id, ordem } of items) {
    const { error } = await sb.from("anuncios").update({ ordem }).eq("id", id);
    if (error) return { erro: error.message };
  }
  return {};
}

export interface PartnerRow {
  id: string;
  nome: string;
  descricao: string;
  url: string;
  cta: string;
  contextos: string[];
  icone: "bank" | "building" | "file-sign" | "heart" | "invoice";
  ativo: boolean;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

export type PartnerInput = Omit<PartnerRow, "criado_em" | "atualizado_em">;

// ── Parceiros ────────────────────────────────────────────────

export async function listarParceirosTodos(): Promise<PartnerRow[]> {
  const { data, error } = await getSupabase()
    .from("admin_partners")
    .select("*")
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PartnerRow[];
}

export async function listarParceirosAtivos(): Promise<PartnerRow[]> {
  const { data, error } = await getSupabase()
    .from("admin_partners")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PartnerRow[];
}

export async function buscarParceiro(id: string): Promise<PartnerRow | null> {
  const { data } = await getSupabase()
    .from("admin_partners")
    .select("*")
    .eq("id", id)
    .single();
  return (data as PartnerRow | null) ?? null;
}

export async function criarParceiro(p: PartnerInput): Promise<{ erro?: string }> {
  const { error } = await getSupabase().from("admin_partners").insert(p);
  return error ? { erro: error.message } : {};
}

export async function atualizarParceiro(
  id: string,
  dados: Partial<Omit<PartnerInput, "id">>
): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("admin_partners")
    .update(dados)
    .eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function eliminarParceiro(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("admin_partners")
    .delete()
    .eq("id", id);
  return error ? { erro: error.message } : {};
}

// ── Perfis / utilizadores ────────────────────────────────────

export async function verificarAdmin(userId: string): Promise<boolean> {
  // Fonte de verdade é o role em profiles (o mesmo que a RLS aplica). Não há
  // fallback por email: um email conhecido sem role 'admin' na BD NÃO é admin.
  const { data } = await getSupabase()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role === "admin";
}

export async function contarUtilizadores(): Promise<number> {
  const { count } = await getSupabase()
    .from("profiles")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

// ── Lista de espera ──────────────────────────────────────────

export interface WaitlistRow {
  id: string;
  email: string;
  fonte: string;
  criado_em: string;
}

export async function listarWaitlist(): Promise<WaitlistRow[]> {
  const { data, error } = await getSupabase()
    .from("email_waitlist")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as WaitlistRow[];
}

export async function contarWaitlist(): Promise<number> {
  const { count } = await getSupabase()
    .from("email_waitlist")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function eliminarWaitlistEntry(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("email_waitlist")
    .delete()
    .eq("id", id);
  return error ? { erro: error.message } : {};
}

// ── Propostas de investidores ───────────────────────────────

export type EstadoProposta = "pendente" | "em_analise" | "contactado" | "aprovado" | "rejeitado";

export interface PropostaRow {
  id: string;
  nome: string;
  email: string;
  empresa: string | null;
  cargo: string | null;
  telefone: string | null;
  interesse: string;
  montante_minimo: number | null;
  montante_maximo: number | null;
  horizonte: string | null;
  experiencia_investimento: string | null;
  setores_interesse: string | null;
  como_conheceu: string | null;
  website: string | null;
  linkedin: string | null;
  mensagem: string | null;
  estado: EstadoProposta;
  notas_admin: string | null;
  submetido_em: string;
  atualizado_em: string;
}

export type PropostaInput = Omit<PropostaRow, "id" | "estado" | "notas_admin" | "submetido_em" | "atualizado_em">;

export async function submeterProposta(p: PropostaInput): Promise<{ erro?: string }> {
  // Validação (primeira linha; a RLS + CHECKs de BD são a defesa a sério).
  const nome = (p.nome ?? "").trim();
  const email = (p.email ?? "").trim();
  const interesse = (p.interesse ?? "").trim();
  if (!nome || nome.length > 200) return { erro: "Nome inválido." };
  if (!emailValido(email)) return { erro: "Email inválido." };
  if (!interesse || interesse.length > 2000) return { erro: "Indica o teu interesse." };
  if ((p.mensagem ?? "").length > 5000) return { erro: "Mensagem demasiado longa." };

  const { error } = await getSupabase()
    .from("propostas_investidores")
    .insert({ ...p, nome, email: normalizarEmail(email), interesse });
  return error ? { erro: error.message } : {};
}

export async function listarPropostas(): Promise<PropostaRow[]> {
  const { data, error } = await getSupabase()
    .from("propostas_investidores")
    .select("*")
    .order("submetido_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PropostaRow[];
}

export async function contarPropostas(): Promise<number> {
  const { count } = await getSupabase()
    .from("propostas_investidores")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function atualizarEstadoProposta(
  id: string,
  estado: EstadoProposta,
  notas_admin?: string
): Promise<{ erro?: string }> {
  const dados: Record<string, unknown> = { estado };
  if (notas_admin !== undefined) dados.notas_admin = notas_admin;
  const { error } = await getSupabase()
    .from("propostas_investidores")
    .update(dados)
    .eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function eliminarProposta(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("propostas_investidores")
    .delete()
    .eq("id", id);
  return error ? { erro: error.message } : {};
}
