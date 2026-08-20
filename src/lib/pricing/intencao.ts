// ═══════════════════════════════════════════════════════════════════════
//  A INTENÇÃO — porque é que esta pessoa abriu a calculadora
//  ---------------------------------------------------------------------
//  §4 do relatório: «Já vendo» prometia um percurso diferente e abria a
//  mesma calculadora, da mesma maneira. A copy mudava; a PERGUNTA INICIAL
//  não. Quem já tem clientes era obrigado a responder «que margem queres?»
//  antes de poder dizer «cobro 45 €» — e a margem é justamente o que essa
//  pessoa vem descobrir, não o que ela sabe.
//
//  ── O QUE ESTE MÓDULO NÃO FAZ ──────────────────────────────────────
//  Não calcula. Não copia a calculadora. Não cria um segundo motor. A
//  engine é a mesma, os campos são os mesmos, a memória de cálculo é a
//  mesma — muda apenas o MODO DO OBJETIVO com que o contexto nasce e,
//  com ele, a ordem por que as perguntas fazem sentido.
//
//  `preco_fixo` já existia em `ModoObjetivo`: «quero cobrar X — diz-me se
//  dá». Validar um preço atual é exatamente isso. Não era preciso
//  inventar nada — era preciso deixar de esconder o que já lá estava.
// ═══════════════════════════════════════════════════════════════════════

import type { ContextoPreco, IntencaoPreco } from "./tipos";

/** O campo de `respondidos` que marca «este preço é mesmo o meu». */
export const CAMPO_PRECO_ATUAL = "preco-atual";

/**
 * O contexto com que um cenário deve nascer, dada a intenção.
 *
 * Em `validar_atual` o objetivo passa a `preco_fixo` com valor por
 * declarar — deliberadamente ZERO e deliberadamente FORA de `respondidos`.
 * Um valor por omissão aqui seria pior do que a pergunta: a pessoa veria
 * a sua margem efetiva calculada sobre um preço que nunca cobrou.
 *
 * Função pura: recebe um contexto, devolve outro. Não muta o que recebe.
 */
export function contextoParaIntencao(
  contexto: ContextoPreco,
  intencao: IntencaoPreco,
): ContextoPreco {
  if (intencao !== "validar_atual") return contexto;
  return {
    ...contexto,
    objetivo: {
      ...contexto.objetivo,
      modo: "preco_fixo",
      // O PVP é o número que a pessoa diz em voz alta a um cliente. É esse
      // que ela sabe de cor — não o líquido de IVA.
      valorEhPVP: true,
      valor: 0,
    },
  };
}

/**
 * O preço atual já foi declarado?
 *
 * Não basta `objetivo.valor > 0`: o cenário podia trazer um valor de
 * exemplo. Só conta se a pessoa o escreveu — a mesma disciplina de
 * `preenchimento.ts`, que é o que separa «o custo é 0 porque é um
 * ficheiro» de «o custo é 0 porque ainda não disse nada».
 */
export function precoAtualDeclarado(
  contexto: ContextoPreco,
  respondidos: ReadonlySet<string> | readonly string[],
): boolean {
  const tem =
    respondidos instanceof Set
      ? respondidos.has(CAMPO_PRECO_ATUAL)
      : (respondidos as readonly string[]).includes(CAMPO_PRECO_ATUAL);
  return tem && (contexto.objetivo.valor ?? 0) > 0;
}

/** Aplica o preço que a pessoa cobra hoje, mantendo o resto intacto. */
export function comPrecoAtual(contexto: ContextoPreco, pvp: number): ContextoPreco {
  return {
    ...contexto,
    objetivo: { ...contexto.objetivo, modo: "preco_fixo", valorEhPVP: true, valor: Math.max(0, pvp) },
  };
}
