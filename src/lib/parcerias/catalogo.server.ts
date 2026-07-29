// ═══════════════════════════════════════════════════════════════════════
//  CATÁLOGO DE PARCERIAS (lado servidor)
//  ---------------------------------------------------------------------
//  Lê `admin_partners` e `partner_placements`, com cache curta em memória.
//
//  ⚠️ Isto NÃO se funde com `estadoIntegracao()`, e a razão importa:
//  `estadoIntegracao()` é síncrona, só lê variáveis de ambiente, e é isso que
//  a torna utilizável dentro de `client.server.ts`, onde serve de guarda
//  antes de qualquer chamada HTTP. Saber se existe uma parceria ativa exige
//  ler o Supabase — é assíncrono, pode falhar, tem cache própria. Misturar as
//  duas coisas transforma um guarda barato numa dependência de rede dentro do
//  cliente HTTP.
//
//  `estadoIntegracao()` continua a significar exatamente uma coisa: a API do
//  parceiro está utilizável?
// ═══════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { modoValido, type ModoParceria } from "./modos";

export interface ParceriaAtiva {
  id: string;
  parceiroKey: string;
  nome: string;
  modo: ModoParceria;
  linkAfiliado: string | null;
  /** Destino de alta intenção (formulário de registo), quando existe. */
  linkAfiliadoRegisto: string | null;
  dominiosPermitidos: string[];
  subidParam: string | null;
  caminhoSuportado: boolean;
  divulgacao: string;
  logoUrl: string | null;
  corMarca: string | null;
  comissaoDescricao: string | null;
  atribuicaoJanelaDias: number | null;
  validacaoDias: number | null;
  atribuicaoNota: string | null;
  inicioEm: string | null;
  fimEm: string | null;
  ativo: boolean;
}

export interface PlacementParceria {
  id: string;
  parceiroId: string;
  superficie: string;
  variante: string;
  criativoId: string | null;
  copyTitulo: string | null;
  copySub: string | null;
  copyCta: string | null;
  copyNota: string | null;
  divulgacao: string | null;
  ordem: number;
}

/**
 * `PARCERIAS_ATIVAS` resolve o problema da base de dados partilhada entre
 * produção e deploys de ramo.
 *
 * A mesma linha do Supabase serve os dois. Em produção a variável é "true" e
 * a ligação de afiliado ganha ao catálogo simulado. Nos deploys de ramo fica
 * por definir, e a resolução continua a passar pela pré-visualização — que é
 * a única superfície onde o handoff da Fase 2 pode ser desenhado e revisto.
 * Sem isto, ativar a parceria apagaria essa superfície.
 */
export function parceriasAtivas(): boolean {
  return process.env.PARCERIAS_ATIVAS === "true";
}

/** Permite desligar o registo de cliques sem desligar os links. */
export function cliquesAtivos(): boolean {
  return process.env.PARCERIAS_CLIQUES_ATIVOS !== "false";
}

function servico(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ── Cache curta ──────────────────────────────────────────────────────────
// 60 segundos chegam: uma parceria muda por decisão humana no admin, não por
// evento. E uma cache longa faria com que desligar um link demorasse a
// produzir efeito — que é precisamente a operação que tem de ser rápida.
const TTL_MS = 60_000;
const cacheParceria = new Map<string, { em: number; valor: ParceriaAtiva | null }>();
const cachePlacements = new Map<string, { em: number; valor: PlacementParceria[] }>();

/** Só para testes: esvazia a cache entre casos. */
export function limparCacheParcerias(): void {
  cacheParceria.clear();
  cachePlacements.clear();
}

function dentroDaJanela(p: ParceriaAtiva, agora = Date.now()): boolean {
  if (p.inicioEm && Date.parse(p.inicioEm) > agora) return false;
  if (p.fimEm && Date.parse(p.fimEm) < agora) return false;
  return true;
}

/** true quando a parceria pode ser usada agora: ativa, na janela, com link. */
export function parceriaUtilizavel(p: ParceriaAtiva | null): p is ParceriaAtiva {
  return !!p && p.ativo && dentroDaJanela(p) && !!p.linkAfiliado;
}

/**
 * Devolve a parceria com esta chave, ou `null`.
 *
 * Nunca lança: uma falha de rede ao Supabase não pode partir a renderização
 * de um Guia. O pior que acontece é o bloco de parceria não aparecer.
 */
export async function parceriaAtiva(key: string): Promise<ParceriaAtiva | null> {
  const emCache = cacheParceria.get(key);
  if (emCache && Date.now() - emCache.em < TTL_MS) return emCache.valor;

  const sb = servico();
  if (!sb) return null;

  const { data, error } = await sb
    .from("admin_partners")
    .select("*")
    .eq("parceiro_key", key)
    .maybeSingle();

  if (error) {
    // Não se guarda um erro em cache: a próxima visita volta a tentar.
    return null;
  }

  const valor: ParceriaAtiva | null = data
    ? {
        id: String(data.id),
        parceiroKey: String(data.parceiro_key ?? key),
        nome: String(data.nome ?? key),
        modo: modoValido(data.modo),
        linkAfiliado: data.link_afiliado ?? null,
        linkAfiliadoRegisto: data.link_afiliado_registo ?? null,
        dominiosPermitidos: Array.isArray(data.dominios_permitidos) ? data.dominios_permitidos : [],
        subidParam: data.subid_param ?? null,
        caminhoSuportado: !!data.caminho_suportado,
        divulgacao: String(data.divulgacao ?? ""),
        logoUrl: data.logo_url ?? null,
        corMarca: data.cor_marca ?? null,
        comissaoDescricao: data.comissao_descricao ?? null,
        atribuicaoJanelaDias: data.atribuicao_janela_dias ?? null,
        validacaoDias: data.validacao_dias ?? null,
        atribuicaoNota: data.atribuicao_nota ?? null,
        inicioEm: data.inicio_em ?? null,
        fimEm: data.fim_em ?? null,
        ativo: !!data.ativo,
      }
    : null;

  cacheParceria.set(key, { em: Date.now(), valor });
  return valor;
}

/** Placements ativos de uma parceria, por superfície. */
export async function placementsDaParceria(parceiroId: string): Promise<PlacementParceria[]> {
  const emCache = cachePlacements.get(parceiroId);
  if (emCache && Date.now() - emCache.em < TTL_MS) return emCache.valor;

  const sb = servico();
  if (!sb) return [];

  const { data, error } = await sb
    .from("partner_placements")
    .select("*")
    .eq("parceiro_id", parceiroId)
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) return [];

  const valor: PlacementParceria[] = (data ?? []).map((r) => ({
    id: String(r.id),
    parceiroId: String(r.parceiro_id),
    superficie: String(r.superficie),
    variante: String(r.variante ?? "padrao"),
    criativoId: r.criativo_id ?? null,
    copyTitulo: r.copy_titulo ?? null,
    copySub: r.copy_sub ?? null,
    copyCta: r.copy_cta ?? null,
    copyNota: r.copy_nota ?? null,
    divulgacao: r.divulgacao ?? null,
    ordem: Number(r.ordem ?? 0),
  }));

  cachePlacements.set(parceiroId, { em: Date.now(), valor });
  return valor;
}

/** O placement de uma superfície, ou `null` se não estiver ativo. */
export async function placementDaSuperficie(
  parceiroId: string,
  superficie: string,
): Promise<PlacementParceria | null> {
  const todos = await placementsDaParceria(parceiroId);
  return todos.find((p) => p.superficie === superficie) ?? null;
}

/**
 * Regista um clique. Nunca lança e nunca bloqueia o redirecionamento —
 * perder a atribuição de um clique é um problema comercial nosso, não do
 * utilizador.
 */
export async function registarClique(entrada: {
  parceiroId: string;
  clickId: string;
  superficie: string;
  variante?: string | null;
  origemSlug?: string | null;
  intent?: string | null;
  destinoHost: string;
  destinoCaminho?: string | null;
  dispositivo: "desktop" | "mobile" | "tablet" | "desconhecido";
}): Promise<void> {
  if (!cliquesAtivos()) return;
  const sb = servico();
  if (!sb) return;
  try {
    await sb.from("partner_link_clicks").insert({
      parceiro_id: entrada.parceiroId,
      click_id: entrada.clickId,
      superficie: entrada.superficie,
      variante: entrada.variante ?? null,
      origem_slug: entrada.origemSlug ?? null,
      intent: entrada.intent ?? null,
      destino_host: entrada.destinoHost,
      destino_caminho: entrada.destinoCaminho ?? null,
      dispositivo: entrada.dispositivo,
    });
  } catch {
    // Falha em silêncio, como `registarReferencia()` já faz.
  }
}
