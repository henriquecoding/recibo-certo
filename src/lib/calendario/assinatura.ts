// ═══════════════════════════════════════════════════════════════════════
//  A SUBSCRIÇÃO DE CALENDÁRIO — acesso a dados
//  ---------------------------------------------------------------------
//  Como o resto de `dados.ts`: nenhuma verificação de permissão vive aqui.
//  Quem autoriza é a migração `20260818220000`, e o token nunca é
//  escolhido deste lado — as RPC geram-no, porque um segredo escolhido no
//  browser é um segredo que alguém há de derivar do email de alguém.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";
import { ORIGEM_CANONICA } from "@/lib/origem";

export type PapelDeCalendario = "cliente" | "contabilista";
export type DetalheDoCalendario = "completo" | "ocupado";

export interface Assinatura {
  papel: PapelDeCalendario;
  detalhe: DetalheDoCalendario;
  alarmeMin: number | null;
  criadoEm: string;
  /** Nulo enquanto nenhum calendário tiver lido o feed. */
  ultimoAcessoEm: string | null;
  /** O endereço `https`. O `webcal:` deriva-se dele. */
  url: string;
}

const MOTIVO: Record<string, string> = {
  nao_autenticado: "Entra na tua conta primeiro.",
  papel_invalido: "Esse tipo de agenda não existe.",
  detalhe_invalido: "Essa opção de detalhe não existe.",
  nao_es_contabilista: "Só uma conta de contabilista aprovada tem esta agenda.",
  sem_assinatura: "Ainda não criaste um endereço de calendário.",
};

const traduzir = (m?: string) => MOTIVO[m ?? ""] ?? "Não foi possível concluir.";

/**
 * O endereço do feed.
 *
 * A origem canónica e não `window.location`: quem copia isto de uma
 * pré-visualização da Vercel levava um endereço que morre com o deploy, e
 * só dava por isso semanas depois, quando a agenda deixasse de atualizar.
 */
export function urlDoFeed(token: string): string {
  return `${ORIGEM_CANONICA}/api/calendario/${token}.ics`;
}

export async function obterAssinatura(
  papel: PapelDeCalendario,
): Promise<Assinatura | null> {
  const { data } = await getSupabase()
    .from("calendario_assinaturas")
    .select("papel, token, detalhe, alarme_min, criado_em, ultimo_acesso_em")
    .eq("papel", papel)
    .is("revogado_em", null)
    .maybeSingle();

  if (!data) return null;
  const l = data as unknown as Record<string, unknown>;
  return {
    papel: l.papel as PapelDeCalendario,
    detalhe: l.detalhe as DetalheDoCalendario,
    alarmeMin: (l.alarme_min as number | null) ?? null,
    criadoEm: l.criado_em as string,
    ultimoAcessoEm: (l.ultimo_acesso_em as string | null) ?? null,
    url: urlDoFeed(l.token as string),
  };
}

/**
 * Cria o endereço — ou troca-o por um novo.
 *
 * É a mesma chamada porque é a mesma operação: rodar um segredo é
 * escrever outro por cima. Quem a chamar uma segunda vez INVALIDA o
 * endereço anterior, e a interface tem de o dizer antes.
 */
export async function criarOuRodar(
  papel: PapelDeCalendario,
  detalhe: DetalheDoCalendario = "completo",
  alarmeMin: number | null = 60,
): Promise<{ erro?: string; url?: string }> {
  const { data, error } = await getSupabase().rpc("criar_assinatura_calendario", {
    p_papel: papel, p_detalhe: detalhe, p_alarme: alarmeMin,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string; token?: string };
  return r.ok && r.token ? { url: urlDoFeed(r.token) } : { erro: traduzir(r.motivo) };
}

/** Muda o que sai no feed sem trocar o endereço já subscrito. */
export async function ajustar(
  papel: PapelDeCalendario,
  detalhe: DetalheDoCalendario,
  alarmeMin: number | null,
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("ajustar_assinatura_calendario", {
    p_papel: papel, p_detalhe: detalhe, p_alarme: alarmeMin,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}

export async function revogar(papel: PapelDeCalendario): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("revogar_assinatura_calendario", {
    p_papel: papel,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}
