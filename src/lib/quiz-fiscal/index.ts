import {
  META_CATEGORIA_QUIZ,
  META_GRUPO_QUIZ,
  type QuizCategoria,
  type QuizGrupo,
  type QuizFonte,
  type QuizOpcao,
  type QuizPergunta,
} from "./types";
import { ESTATISTICAS_BANCO, TOTAL_PERGUNTAS_META } from "./quiz-meta";

export {
  META_CATEGORIA_QUIZ,
  META_GRUPO_QUIZ,
  type QuizCategoria,
  type QuizGrupo,
  type QuizFonte,
  type QuizOpcao,
  type QuizPergunta,
};

// ─────────────────────────────────────────────────────────────────────────────
// Banco de perguntas carregado SOB PROCURA.
//
// Os ~900 KB de perguntas estavam todos a ser importados estaticamente — bastava
// abrir o ecrã de seleção para os descarregar. Agora os bancos só são pedidos
// (em paralelo, com cache) quando um quiz vai começar; o ecrã de seleção usa as
// contagens pré-calculadas em `quiz-meta.ts`. `prefetchBancoQuiz()` aquece tudo
// ao passar o rato/focar (ver SelecaoModo), para o arranque ser instantâneo.
// ─────────────────────────────────────────────────────────────────────────────

let _todas: QuizPergunta[] | null = null;
let _promessa: Promise<QuizPergunta[]> | null = null;

export async function carregarBancoQuiz(): Promise<QuizPergunta[]> {
  if (_todas) return _todas;
  if (_promessa) return _promessa;
  _promessa = (async () => {
    const [
      p1, p2, p3, ret, iva, ss, reg, jov, esc, ativ, catf, praz, ger, dep, emp,
    ] = await Promise.all([
      import("./perguntas-parte1"),
      import("./perguntas-parte2"),
      import("./perguntas-parte3"),
      import("./perguntas-retencao"),
      import("./perguntas-iva"),
      import("./perguntas-ss"),
      import("./perguntas-regime"),
      import("./perguntas-irs-jovem"),
      import("./perguntas-escaloes"),
      import("./perguntas-atividades"),
      import("./perguntas-catf"),
      import("./perguntas-prazos"),
      import("./perguntas-geral"),
      import("./gerador-dependente"),
      import("./gerador-empresa"),
    ]);
    _todas = [
      ...p1.PERGUNTAS_PARTE_1,
      ...p2.PERGUNTAS_PARTE_2,
      ...p3.PERGUNTAS_PARTE_3,
      ...ret.PERGUNTAS_RETENCAO,
      ...iva.PERGUNTAS_IVA,
      ...ss.PERGUNTAS_SS,
      ...reg.PERGUNTAS_REGIME,
      ...jov.PERGUNTAS_IRS_JOVEM,
      ...esc.PERGUNTAS_ESCALOES,
      ...ativ.PERGUNTAS_ATIVIDADES,
      ...catf.PERGUNTAS_CATF,
      ...praz.PERGUNTAS_PRAZOS,
      ...ger.PERGUNTAS_GERAL,
      ...dep.PERGUNTAS_DEPENDENTE,
      ...emp.PERGUNTAS_EMPRESA,
    ];
    return _todas;
  })();
  return _promessa;
}

/** Aquece o banco de perguntas em segundo plano (hover/foco). */
export function prefetchBancoQuiz(): void {
  if (typeof window === "undefined") return;
  if (!_todas && !_promessa) void carregarBancoQuiz();
}

export function embaralhar<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface SelecaoPerguntasOpcoes {
  quantidade?: number;
  categoria?: QuizCategoria;
  dificuldade?: 1 | 2 | 3;
  excluirIds?: string[];
}

// Lógica de seleção — pura, opera sobre o banco já carregado (inalterada).
function selecionar(todas: QuizPergunta[], opcoes: SelecaoPerguntasOpcoes): QuizPergunta[] {
  const { quantidade = 10, categoria, dificuldade, excluirIds = [] } = opcoes;

  const naCategoria = (p: QuizPergunta) => !categoria || p.categoria === categoria;
  const naoExcluido = (p: QuizPergunta) => !excluirIds.includes(p.id);
  const base = todas.filter((p) => naCategoria(p) && naoExcluido(p));

  const preferidas = dificuldade ? base.filter((p) => p.dificuldade === dificuldade) : base;

  let resultado = embaralhar(preferidas);
  if (dificuldade && resultado.length < quantidade) {
    const resto = embaralhar(base.filter((p) => p.dificuldade !== dificuldade));
    resultado = [...resultado, ...resto];
  }

  if (resultado.length < quantidade) {
    const extra = embaralhar(
      todas.filter((p) => naoExcluido(p) && !resultado.includes(p))
    );
    resultado = [...resultado, ...extra];
  }

  return resultado.slice(0, Math.min(quantidade, resultado.length));
}

export async function getPerguntasAleatorias(
  opcoes: SelecaoPerguntasOpcoes = {}
): Promise<QuizPergunta[]> {
  const todas = await carregarBancoQuiz();
  return selecionar(todas, opcoes);
}

export async function getPerguntasPorCategoria(
  categoria: QuizCategoria
): Promise<QuizPergunta[]> {
  const todas = await carregarBancoQuiz();
  return todas.filter((p) => p.categoria === categoria);
}

export function embaralharOpcoes(pergunta: QuizPergunta): {
  opcoes: QuizOpcao[];
  correta: number;
} {
  const indices = embaralhar(pergunta.opcoes.map((_, i) => i));
  const opcoes = indices.map((i) => pergunta.opcoes[i]);
  const correta = indices.indexOf(pergunta.correta);
  return { opcoes, correta };
}

// Estatísticas e total agora vêm dos metadados pré-calculados (sem carregar os
// bancos) — regenerar com `npx vitest run src/lib/quiz-fiscal/__gen_meta.test.ts`.
export function getEstatisticasBanco(): Record<
  QuizCategoria,
  { total: number; facil: number; medio: number; dificil: number }
> {
  return ESTATISTICAS_BANCO;
}

export const TOTAL_PERGUNTAS = TOTAL_PERGUNTAS_META;
