// Helpers de acesso ao Supabase para a área de admin.
// Todas as operações de escrita passam pela RLS — só funcionam com sessão admin.

import { getSupabase } from "./client";
import { emailValido, normalizarEmail } from "@/lib/validacao-email";
import type { ModoParceria } from "@/lib/parcerias/modos";

// ── Anúncios ─────────────────────────────────────────────────

export type TipoAnuncio =
  | "parceiro"
  | "google_ads"
  | "banner"
  | "nativo"
  | "criativo_parceiro";

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
  // ── Camada de parcerias configuráveis (migração 025) ────────────────────
  // O modo é uma propriedade da PARCERIA, não da rota: a rota diz o que
  // poderia fazer, esta coluna diz o que está contratado hoje.
  parceiro_key: string | null;
  modo: ModoParceria;
  link_afiliado: string | null;
  /** Destino de alta intenção: o formulário de registo do parceiro. */
  link_afiliado_registo: string | null;
  dominios_permitidos: string[];
  subid_param: string | null;
  caminho_suportado: boolean;
  divulgacao: string;
  logo_url: string | null;
  cor_marca: string | null;
  comissao_descricao: string | null;
  atribuicao_janela_dias: number | null;
  validacao_dias: number | null;
  atribuicao_nota: string | null;
  inicio_em: string | null;
  fim_em: string | null;
}

export type PartnerInput = Omit<PartnerRow, "criado_em" | "atualizado_em">;

// ── Superfícies, criativos, cliques e comissões (migração 025) ───────────

export interface PartnerPlacementRow {
  id: string;
  parceiro_id: string;
  superficie: string;
  variante: "padrao" | "compacta" | "faixa" | "banner" | "texto";
  criativo_id: string | null;
  copy_titulo: string | null;
  copy_sub: string | null;
  copy_cta: string | null;
  copy_nota: string | null;
  divulgacao: string | null;
  ativo: boolean;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

export type PartnerPlacementInput = Omit<
  PartnerPlacementRow,
  "criado_em" | "atualizado_em"
>;

export interface PartnerCreativeRow {
  id: string;
  parceiro_id: string;
  tipo: "banner" | "logo" | "texto";
  idioma: "pt" | "en";
  largura: number | null;
  altura: number | null;
  /** Sempre no NOSSO domínio: `/parceiros/<key>/…`. Nunca o do parceiro. */
  url: string;
  alt: string;
  nota: string | null;
  ativo: boolean;
  criado_em: string;
}

export type PartnerCreativeInput = Omit<PartnerCreativeRow, "criado_em">;

export interface PartnerLinkClickRow {
  id: string;
  parceiro_id: string;
  click_id: string;
  superficie: string;
  variante: string | null;
  origem_slug: string | null;
  intent: string | null;
  destino_host: string;
  destino_caminho: string | null;
  dispositivo: "desktop" | "mobile" | "tablet" | "desconhecido" | null;
  criado_em: string;
}

export type EstadoComissao = "pendente" | "confirmada" | "anulada" | "paga";

export interface PartnerCommissionRow {
  id: string;
  parceiro_id: string;
  referencia: string | null;
  estado: EstadoComissao;
  /** Base sem IVA — é sobre este valor que a comissão incide. */
  valor_liquido: number;
  valor_comissao: number;
  plano: string | null;
  ocorrido_em: string;
  confirmavel_em: string | null;
  origem: "csv" | "api";
  importado_em: string;
}

export type PartnerCommissionInput = Omit<PartnerCommissionRow, "importado_em">;

// ── Superfícies ──────────────────────────────────────────────

export async function listarPlacements(parceiroId: string): Promise<PartnerPlacementRow[]> {
  const { data, error } = await getSupabase()
    .from("partner_placements")
    .select("*")
    .eq("parceiro_id", parceiroId)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PartnerPlacementRow[];
}

export async function guardarPlacement(p: PartnerPlacementInput): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("partner_placements")
    .upsert({ ...p, atualizado_em: new Date().toISOString() }, { onConflict: "id" });
  return error ? { erro: error.message } : {};
}

export async function eliminarPlacement(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase().from("partner_placements").delete().eq("id", id);
  return error ? { erro: error.message } : {};
}

// ── Criativos ────────────────────────────────────────────────

export async function listarCriativos(parceiroId: string): Promise<PartnerCreativeRow[]> {
  const { data, error } = await getSupabase()
    .from("partner_creatives")
    .select("*")
    .eq("parceiro_id", parceiroId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PartnerCreativeRow[];
}

export async function listarCriativosAtivos(): Promise<PartnerCreativeRow[]> {
  const { data, error } = await getSupabase()
    .from("partner_creatives")
    .select("*")
    .eq("ativo", true);
  if (error) throw new Error(error.message);
  return (data ?? []) as PartnerCreativeRow[];
}

export async function guardarCriativo(c: PartnerCreativeInput): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("partner_creatives")
    .upsert(c, { onConflict: "id" });
  return error ? { erro: error.message } : {};
}

/**
 * A licença de marca é «limitada, revogável, não exclusiva e intransmissível».
 * Se for revogada, todos os criativos de um parceiro saem do ar num só UPDATE.
 */
export async function desativarCriativosDoParceiro(parceiroId: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("partner_creatives")
    .update({ ativo: false })
    .eq("parceiro_id", parceiroId);
  return error ? { erro: error.message } : {};
}

// ── Cliques e comissões ──────────────────────────────────────

export async function listarCliques(
  parceiroId: string,
  desde?: string,
): Promise<PartnerLinkClickRow[]> {
  let q = getSupabase()
    .from("partner_link_clicks")
    .select("*")
    .eq("parceiro_id", parceiroId)
    .order("criado_em", { ascending: false })
    .limit(5000);
  if (desde) q = q.gte("criado_em", desde);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as PartnerLinkClickRow[];
}

export async function listarComissoesGuardadas(
  parceiroId: string,
): Promise<PartnerCommissionRow[]> {
  const { data, error } = await getSupabase()
    .from("partner_commissions")
    .select("*")
    .eq("parceiro_id", parceiroId)
    .order("ocorrido_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PartnerCommissionRow[];
}

export async function importarComissoes(
  linhas: PartnerCommissionInput[],
): Promise<{ erro?: string; inseridas: number }> {
  if (linhas.length === 0) return { inseridas: 0 };
  const { error } = await getSupabase()
    .from("partner_commissions")
    .upsert(linhas, { onConflict: "id" });
  return error ? { erro: error.message, inseridas: 0 } : { inseridas: linhas.length };
}

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
