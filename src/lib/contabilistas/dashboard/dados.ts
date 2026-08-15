/**
 * Acesso a dados das vistas do painel — pelo cliente, sob RLS.
 *
 * Duas notas que explicam a forma deste ficheiro:
 *
 *  1. NÃO há função de `update` ao layout. A migração
 *     `20260815120100` não dá política de UPDATE a `authenticated`: mudar
 *     layout, nome, ordem ou principal passa obrigatoriamente por RPC,
 *     que valida a geometria e faz compare-and-swap por `revision`. Um
 *     `UPDATE` livre daqui não funcionaria, e é isso que se pretende.
 *
 *  2. Guardar é UMA escrita por sessão de edição (§12.12). Não há
 *     autosave por movimento: trinta e três arrastos não são trinta e
 *     três pedidos de rede.
 */

import { getSupabase } from "@/lib/supabase/client";
import { validarLayout } from "./layout";
import { VISTAS_POR_OMISSAO, layoutDaOmissao } from "./omissao";
import type { WorkspaceLayoutV2, WorkspaceView } from "./tipos";

type Linha = Record<string, unknown>;

const CAMPOS = "id, nome, ordem, principal, sistema, layout, revision";

function paraVista(l: Linha): WorkspaceView {
  return {
    id: l.id as string,
    nome: l.nome as string,
    ordem: (l.ordem as number) ?? 0,
    principal: Boolean(l.principal),
    sistema: Boolean(l.sistema),
    revision: (l.revision as number) ?? 1,
    // Um layout gravado por uma versão futura, ou adulterado, é
    // normalizado aqui em vez de rebentar o painel. `validarLayout`
    // devolve sempre algo montável.
    layout: validarLayout(l.layout).layout,
  };
}

export async function listarVistas(contabilistaId: string): Promise<WorkspaceView[]> {
  const { data, error } = await getSupabase()
    .from("contabilista_dashboard_vistas")
    .select(CAMPOS)
    .eq("contabilista_id", contabilistaId)
    .order("ordem")
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraVista(l as unknown as Linha));
}

/**
 * As vistas de partida, criadas à primeira visita.
 *
 * Só corre quando a pessoa não tem vista nenhuma. Uma conta que apagou
 * tudo de propósito não recebe as omissões outra vez — isso seria
 * desfazer uma decisão dela a cada carregamento.
 */
export async function criarVistasPorOmissao(contabilistaId: string): Promise<WorkspaceView[]> {
  const novoId = () => crypto.randomUUID();
  const linhas = VISTAS_POR_OMISSAO.map((v) => ({
    contabilista_id: contabilistaId,
    nome: v.nome,
    ordem: v.ordem,
    principal: v.principal,
    layout: layoutDaOmissao(v.posicoes, novoId) as unknown as Record<string, unknown>,
  }));

  const { error } = await getSupabase()
    .from("contabilista_dashboard_vistas")
    .insert(linhas);
  // A política de INSERT recusa `sistema = true`, por isso as vistas de
  // partida nascem apagáveis. É deliberado: são uma sugestão, não uma
  // moldura obrigatória.
  if (error) throw new Error(error.message);
  return listarVistas(contabilistaId);
}

export type MotivoFalhaGravacao =
  | "sem_permissao"
  | "layout_demasiado_grande"
  | "layout_invalido"
  | "vista_inexistente"
  | "layout_desatualizado"
  | "rede";

export interface ResultadoGravacao {
  ok: boolean;
  revision?: number;
  motivo?: MotivoFalhaGravacao;
  detalhe?: string;
}

/**
 * Guarda o layout de uma vista, com compare-and-swap.
 *
 * `layout_desatualizado` não é um erro a esconder: significa que outra
 * aba ou outro dispositivo gravou entretanto. A interface tem de
 * oferecer uma escolha em vez de destruir a versão mais nova (§12.15).
 */
export async function guardarLayout(
  vistaId: string,
  revisionEsperada: number,
  layout: WorkspaceLayoutV2,
): Promise<ResultadoGravacao> {
  const { data, error } = await getSupabase().rpc("guardar_dashboard_layout", {
    p_vista: vistaId,
    p_revision_esperada: revisionEsperada,
    p_layout: layout,
  });

  if (error) return { ok: false, motivo: "rede", detalhe: error.message };
  const r = (data ?? {}) as Linha;
  if (r.ok === true) return { ok: true, revision: r.revision as number };
  return {
    ok: false,
    motivo: (r.motivo as MotivoFalhaGravacao) ?? "rede",
    detalhe: r.detalhe as string | undefined,
    revision: r.revision as number | undefined,
  };
}

export async function criarVista(
  nome: string,
  copiarDe?: string,
): Promise<{ erro?: string; id?: string }> {
  const { data, error } = await getSupabase().rpc("criar_dashboard_vista", {
    p_nome: nome.trim().slice(0, 60),
    p_copiar_de: copiarDe ?? null,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as Linha;
  if (r.ok === true) return { id: r.id as string };
  return { erro: (r.motivo as string) ?? "Não foi possível criar a vista." };
}

export async function renomearVista(vistaId: string, nome: string): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("renomear_dashboard_vista", {
    p_vista: vistaId,
    p_nome: nome.trim().slice(0, 60),
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as Linha;
  return r.ok === true ? {} : { erro: (r.motivo as string) ?? "Não foi possível renomear." };
}

export async function definirVistaPrincipal(vistaId: string): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("definir_dashboard_vista_principal", {
    p_vista: vistaId,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as Linha;
  return r.ok === true ? {} : { erro: (r.motivo as string) ?? "Não foi possível definir." };
}

export async function apagarVista(vistaId: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("contabilista_dashboard_vistas")
    .delete()
    .eq("id", vistaId);
  return error ? { erro: error.message } : {};
}
