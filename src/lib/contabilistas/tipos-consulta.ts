// ═══════════════════════════════════════════════════════════════════════
//  TIPOS DE CONSULTA — o catálogo comercial, com preços INDICATIVOS
//  ---------------------------------------------------------------------
//  A tabela existe desde a migração 045 e nunca teve uma linha de
//  TypeScript: nenhum ecrã a lê, nenhum ecrã a escreve. O bloco «Consultas
//  e honorário» do perfil é o primeiro a usá-la.
//
//  ⚠️ A regra que não pode derrapar (§123): o preço aqui é uma ÂNCORA
//  COMERCIAL, não uma promessa. O valor real de cada consulta é acordado
//  em função do serviço, e é por isso que a interface tem sempre de dizer
//  «valores indicativos» ao lado da tabela. Um preço mostrado sem essa
//  frase transforma o catálogo numa tabela de preços fixos — que é
//  exatamente o que o produto decidiu não ser.
//
//  Zero é um preço legítimo, não um campo por preencher: a primeira
//  conversa costuma ser grátis, e não poder dizê-lo obrigaria a inventar
//  um valor.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";

type Linha = Record<string, unknown>;

export interface TipoConsulta {
  id: string;
  contabilistaId: string;
  nome: string;
  descricao: string | null;
  duracaoMin: number;
  /** Cêntimos. Zero significa «grátis», e mostra-se como tal. */
  precoCents: number;
  ativo: boolean;
  ordem: number;
}

export const DURACOES = [15, 30, 45, 60, 90, 120, 180, 240] as const;
export const TIPOS_MAX = 8;

function paraTipo(l: Linha): TipoConsulta {
  return {
    id: l.id as string,
    contabilistaId: l.contabilista_id as string,
    nome: l.nome as string,
    descricao: (l.descricao as string | null) ?? null,
    duracaoMin: (l.duracao_min as number) ?? 60,
    precoCents: (l.preco_cents as number) ?? 0,
    ativo: Boolean(l.ativo),
    ordem: (l.ordem as number) ?? 0,
  };
}

const CAMPOS = "id, contabilista_id, nome, descricao, duracao_min, preco_cents, ativo, ordem";

export async function listarTiposConsulta(contabilistaId: string): Promise<TipoConsulta[]> {
  const { data, error } = await getSupabase()
    .from("contabilista_tipos_consulta")
    .select(CAMPOS)
    .eq("contabilista_id", contabilistaId)
    .order("ordem")
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraTipo(l as unknown as Linha));
}

export interface NovoTipoConsulta {
  contabilistaId: string;
  nome: string;
  descricao?: string | null;
  duracaoMin: number;
  precoCents: number;
  ordem?: number;
}

export async function criarTipoConsulta(t: NovoTipoConsulta): Promise<{ erro?: string; id?: string }> {
  // As mesmas perguntas que os CHECK da base fazem, feitas cedo: poupam
  // uma ida e volta e dão resposta imediata a quem se enganou a escrever.
  const nome = t.nome.trim();
  if (nome.length < 2) return { erro: "Dá um nome ao tipo de consulta." };
  if (t.duracaoMin < 15 || t.duracaoMin > 240) return { erro: "A duração vai de 15 a 240 minutos." };
  if (t.precoCents < 0) return { erro: "O valor não pode ser negativo." };

  const { data, error } = await getSupabase()
    .from("contabilista_tipos_consulta")
    .insert({
      contabilista_id: t.contabilistaId,
      nome: nome.slice(0, 80),
      descricao: t.descricao?.trim().slice(0, 300) || null,
      duracao_min: t.duracaoMin,
      preco_cents: Math.round(t.precoCents),
      ordem: t.ordem ?? 0,
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };
  return { id: (data as unknown as Linha).id as string };
}

export async function atualizarTipoConsulta(
  id: string,
  campos: Partial<{ nome: string; descricao: string | null; duracao_min: number; preco_cents: number; ativo: boolean; ordem: number }>
): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("contabilista_tipos_consulta").update(campos).eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function apagarTipoConsulta(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("contabilista_tipos_consulta").delete().eq("id", id);
  return error ? { erro: error.message } : {};
}

// ─── Como se lê ────────────────────────────────────────────────────────

/** «Grátis» ou «49 €». Zero não é um campo vazio — é uma oferta. */
export function precoLegivel(cents: number): string {
  if (cents <= 0) return "Grátis";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** «30 min», «1 h», «1 h 30». */
export function duracaoLegivel(min: number): string {
  if (min < 60) return `${min} min`;
  const horas = Math.floor(min / 60);
  const resto = min % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto}`;
}

/**
 * A frase que acompanha SEMPRE a tabela de preços.
 *
 * Não é uma nota de rodapé opcional: é o que distingue uma âncora
 * comercial de uma tabela de preços fixos, e é a única coisa que mantém o
 * catálogo compatível com a §123. Há teste que a exige no ecrã.
 */
export const COPY_VALORES_INDICATIVOS =
  "Valores indicativos. O valor final é acordado contigo em função do serviço necessário.";
