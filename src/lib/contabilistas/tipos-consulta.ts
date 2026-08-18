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
import { COPY_PRECO_MINIMO, precoDeConsultaValido } from "./preco-consulta";

type Linha = Record<string, unknown>;

export interface TipoConsulta {
  id: string;
  contabilistaId: string;
  nome: string;
  descricao: string | null;
  duracaoMin: number;
  /** Cêntimos. Zero significa «grátis», e mostra-se como tal. */
  precoCents: number;
  /** Quando é que se paga. Ver `PAGAMENTOS`. */
  pagamento: MomentoDePagamento;
  ativo: boolean;
  ordem: number;
}

/**
 * Quando é que uma consulta deste tipo se paga.
 *
 * A escolha não é só operacional — muda o que acontece ao marcar. Com
 * `no_pedido`, a consulta só nasce depois de a Stripe confirmar; com
 * `depois`, nasce como sempre nasceu e o pedido de pagamento aparece
 * quando o contabilista a dá por realizada com o valor real.
 */
export type MomentoDePagamento = "no_pedido" | "depois" | "sem_pagamento";

export const PAGAMENTOS: ReadonlyArray<{
  id: MomentoDePagamento; rotulo: string; explicacao: string;
}> = [
  {
    id: "depois",
    rotulo: "Paga depois da consulta",
    explicacao:
      "Marca sem pagar. Quando deres a consulta por realizada com o valor real, o cliente recebe o pedido de pagamento.",
  },
  {
    id: "no_pedido",
    rotulo: "Paga ao marcar",
    explicacao:
      "A consulta só fica marcada depois de o pagamento passar. Evita faltas, e evita perseguir pagamentos.",
  },
  {
    id: "sem_pagamento",
    rotulo: "Não se paga por aqui",
    explicacao:
      "Uma primeira conversa gratuita, ou um acerto que fazes fora da plataforma. Não gera cobrança nem comissão.",
  },
];

export const DURACOES = [15, 30, 45, 60, 90, 120, 180, 240] as const;
export const TIPOS_MAX = 8;

// O piso da consulta paga vive em `preco-consulta.ts`, que é puro: o painel
// do contabilista precisa dele e não pode alcançar, por essa via, um módulo
// que fale com o Supabase. Reexporta-se aqui por conveniência de quem já
// importa este ficheiro.
export {
  COPY_PRECO_MINIMO, PRECO_MINIMO_CONSULTA_CENTS, precoDeConsultaValido,
} from "./preco-consulta";

function paraTipo(l: Linha): TipoConsulta {
  return {
    id: l.id as string,
    contabilistaId: l.contabilista_id as string,
    nome: l.nome as string,
    descricao: (l.descricao as string | null) ?? null,
    duracaoMin: (l.duracao_min as number) ?? 60,
    precoCents: (l.preco_cents as number) ?? 0,
    pagamento: ((l.pagamento as MomentoDePagamento) ?? "depois"),
    ativo: Boolean(l.ativo),
    ordem: (l.ordem as number) ?? 0,
  };
}

const CAMPOS =
  "id, contabilista_id, nome, descricao, duracao_min, preco_cents, pagamento, ativo, ordem";

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
  pagamento?: MomentoDePagamento;
  ordem?: number;
}

export async function criarTipoConsulta(t: NovoTipoConsulta): Promise<{ erro?: string; id?: string }> {
  // As mesmas perguntas que os CHECK da base fazem, feitas cedo: poupam
  // uma ida e volta e dão resposta imediata a quem se enganou a escrever.
  const nome = t.nome.trim();
  if (nome.length < 2) return { erro: "Dá um nome ao tipo de consulta." };
  if (t.duracaoMin < 15 || t.duracaoMin > 240) return { erro: "A duração vai de 15 a 240 minutos." };
  if (t.precoCents < 0) return { erro: "O valor não pode ser negativo." };
  if (!precoDeConsultaValido(Math.round(t.precoCents))) return { erro: COPY_PRECO_MINIMO };

  const { data, error } = await getSupabase()
    .from("contabilista_tipos_consulta")
    .insert({
      contabilista_id: t.contabilistaId,
      nome: nome.slice(0, 80),
      descricao: t.descricao?.trim().slice(0, 300) || null,
      duracao_min: t.duracaoMin,
      preco_cents: Math.round(t.precoCents),
      pagamento: t.pagamento ?? "depois",
      ordem: t.ordem ?? 0,
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };
  return { id: (data as unknown as Linha).id as string };
}

export async function atualizarTipoConsulta(
  id: string,
  campos: Partial<{
    nome: string; descricao: string | null; duracao_min: number;
    preco_cents: number; pagamento: MomentoDePagamento; ativo: boolean; ordem: number;
  }>
): Promise<{ erro?: string }> {
  // O mesmo piso da criação. Sem isto, quem criasse a 20 € e editasse para
  // 3 € recebia a mensagem crua do Postgres em vez de uma frase.
  if (campos.preco_cents !== undefined && !precoDeConsultaValido(Math.round(campos.preco_cents))) {
    return { erro: COPY_PRECO_MINIMO };
  }

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

/** O rótulo curto de cada momento, para as listas. */
export function pagamentoLegivel(m: MomentoDePagamento): string {
  return PAGAMENTOS.find((p) => p.id === m)?.rotulo ?? "Paga depois da consulta";
}
