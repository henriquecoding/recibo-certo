// ═══════════════════════════════════════════════════════════════════════
//  O TRABALHO — tarefas em quatro estados, e o que delas se pode dizer
//  ---------------------------------------------------------------------
//  ⚠️ Não há percentagens aqui, e não é esquecimento. Num roadmap de
//  software «82% completo» é uma estimativa aceitável; num IVA é uma
//  afirmação falsa — ou tem os documentos ou não tem. O progresso é
//  «3 de 5 passos», que é verificável.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";

type Linha = Record<string, unknown>;

export type EstadoTarefa = "por_tratar" | "espera_cliente" | "em_curso" | "entregue";

/**
 * A ordem das colunas não é alfabética nem cronológica: é a do olhar.
 * «À espera do cliente» vem em segundo porque é onde vive o trabalho
 * parado — e é isso que uma lista esconde e um quadro mostra.
 */
export const COLUNAS: { id: EstadoTarefa; rotulo: string; ajuda: string }[] = [
  { id: "por_tratar", rotulo: "Por tratar", ajuda: "Ainda não lhe pegaste." },
  { id: "espera_cliente", rotulo: "À espera do cliente", ajuda: "Falta alguma coisa que não depende de ti." },
  { id: "em_curso", rotulo: "Em curso", ajuda: "Está a andar." },
  { id: "entregue", rotulo: "Entregue", ajuda: "Fechado." },
];

export interface Passo {
  id: string;
  texto: string;
  feito: boolean;
  ordem: number;
}

export interface Tarefa {
  id: string;
  vinculoId: string | null;
  titulo: string;
  notas: string | null;
  estado: EstadoTarefa;
  prazo: string | null;
  etiquetas: string[];
  obrigacao: string | null;
  ordem: number;
  passos: Passo[];
}

function paraTarefa(l: Linha): Tarefa {
  const passos = ((l.passos as Linha[] | null) ?? []).map((p) => ({
    id: p.id as string,
    texto: p.texto as string,
    feito: Boolean(p.feito),
    ordem: (p.ordem as number) ?? 0,
  }));
  passos.sort((a, b) => a.ordem - b.ordem);

  return {
    id: l.id as string,
    vinculoId: (l.vinculo_id as string | null) ?? null,
    titulo: l.titulo as string,
    notas: (l.notas as string | null) ?? null,
    estado: l.estado as EstadoTarefa,
    prazo: (l.prazo as string | null) ?? null,
    etiquetas: (l.etiquetas as string[]) ?? [],
    obrigacao: (l.obrigacao as string | null) ?? null,
    ordem: (l.ordem as number) ?? 0,
    passos,
  };
}

export async function listarTarefas(contabilistaId: string): Promise<Tarefa[]> {
  const { data, error } = await getSupabase()
    .from("contabilista_tarefas")
    .select("id, vinculo_id, titulo, notas, estado, prazo, etiquetas, obrigacao, ordem, passos:contabilista_tarefa_passos(id, texto, feito, ordem)")
    .eq("contabilista_id", contabilistaId)
    .order("ordem")
    .order("criado_em")
    .limit(400);

  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraTarefa(l as unknown as Linha));
}

export async function criarTarefa(p: {
  contabilistaId: string;
  titulo: string;
  vinculoId?: string | null;
  prazo?: string | null;
  etiquetas?: string[];
  notas?: string;
}): Promise<{ erro?: string; id?: string }> {
  const { data, error } = await getSupabase()
    .from("contabilista_tarefas")
    .insert({
      contabilista_id: p.contabilistaId,
      titulo: p.titulo.trim().slice(0, 200),
      vinculo_id: p.vinculoId ?? null,
      prazo: p.prazo || null,
      etiquetas: p.etiquetas ?? [],
      notas: p.notas?.trim().slice(0, 2000) || null,
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };
  return { id: (data as unknown as Linha).id as string };
}

export async function moverTarefa(id: string, estado: EstadoTarefa): Promise<{ erro?: string }> {
  // `concluido_em` não vai aqui: é o gatilho da migração 045 que o trata,
  // para não haver duas verdades sobre a mesma tarefa.
  const { error } = await getSupabase()
    .from("contabilista_tarefas").update({ estado }).eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function apagarTarefa(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase().from("contabilista_tarefas").delete().eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function acrescentarPasso(
  tarefaId: string, texto: string, ordem: number
): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("contabilista_tarefa_passos")
    .insert({ tarefa_id: tarefaId, texto: texto.trim().slice(0, 200), ordem });
  return error ? { erro: error.message } : {};
}

export async function alternarPasso(id: string, feito: boolean): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("contabilista_tarefa_passos").update({ feito }).eq("id", id);
  return error ? { erro: error.message } : {};
}

// ─── Leituras derivadas (puras) ────────────────────────────────────────

export interface Progresso {
  feitos: number;
  total: number;
  /** «3 de 5 passos», ou `null` quando não há passos nenhuns. */
  rotulo: string | null;
}

export function progressoDe(t: Tarefa): Progresso {
  const total = t.passos.length;
  const feitos = t.passos.filter((p) => p.feito).length;
  return {
    feitos,
    total,
    rotulo: total === 0 ? null : `${feitos} de ${total} ${total === 1 ? "passo" : "passos"}`,
  };
}

export type UrgenciaPrazo = "sem_prazo" | "folgado" | "esta_semana" | "amanha" | "hoje" | "atrasado";

/**
 * Quão apertado está o prazo.
 *
 * Devolve uma categoria e não um número de dias porque é a categoria que
 * muda a decisão: «atrasado» e «faltam 40 dias» pedem coisas diferentes,
 * «faltam 39» e «faltam 40» não.
 */
export function urgenciaDe(prazo: string | null, hoje: Date = new Date()): UrgenciaPrazo {
  if (!prazo) return "sem_prazo";
  const alvo = Date.parse(`${prazo}T00:00:00Z`);
  if (!Number.isFinite(alvo)) return "sem_prazo";

  const dia = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  const dias = Math.round((alvo - dia) / 86400_000);

  if (dias < 0) return "atrasado";
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanha";
  if (dias <= 7) return "esta_semana";
  return "folgado";
}

export const ROTULO_URGENCIA: Record<UrgenciaPrazo, string> = {
  sem_prazo: "",
  folgado: "",
  esta_semana: "Esta semana",
  amanha: "Amanhã",
  hoje: "Hoje",
  atrasado: "Atrasado",
};

/** Etiquetas sugeridas. Curta de propósito — ver `catalogo.ts`. */
export const ETIQUETAS_SUGERIDAS = [
  "IVA", "IRS", "Segurança Social", "Documentos", "Fecho", "Urgente",
] as const;
