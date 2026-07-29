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
export { lerVistas, registarVistas, limparVistas, JANELA_VISTAS } from "./vistas";

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
  /** IDs a evitar — normalmente as perguntas já vistas em sessões recentes. */
  excluirIds?: string[];
}

/** Como a sessão foi construída, para a interface poder ser honesta sobre isso. */
export interface SelecaoDiagnostico {
  /** Quantas vieram com a dificuldade pedida. */
  naDificuldade: number;
  /** Quantas vieram de outra dificuldade da mesma categoria. */
  outraDificuldade: number;
  /** Quantas tiveram de vir de OUTRAS categorias. */
  foraDaCategoria: number;
  /** Quantas já tinham sido vistas (a lista de exclusão teve de ser ignorada). */
  repetidas: number;
}

export interface SelecaoComDiagnostico {
  perguntas: QuizPergunta[];
  diagnostico: SelecaoDiagnostico;
}

/**
 * Seleção de perguntas para uma sessão.
 *
 * Três correções face à versão anterior:
 *
 *  · O segundo fallback saía da CATEGORIA sem aviso. O primeiro (dificuldade)
 *    mantinha-se dentro dela; o segundo apanhava o banco inteiro. Pedir
 *    «Prazos» e receber perguntas de IVA é um erro que o utilizador nota.
 *    Agora a ordem de cedência é explícita — primeiro cede-se a dificuldade,
 *    depois a lista de exclusão, e só por último a categoria — e cada cedência
 *    fica registada no diagnóstico para a interface a poder comunicar.
 *
 *  · As pesquisas de pertença passaram a `Set`. Com 1.614 perguntas e uma
 *    lista de exclusão a crescer a cada sessão, `Array.includes` dentro de um
 *    filtro era quadrático.
 *
 *  · A deduplicação passa a ser por ID, não por identidade de objeto.
 */
function selecionarComDiagnostico(
  todas: QuizPergunta[],
  opcoes: SelecaoPerguntasOpcoes,
): SelecaoComDiagnostico {
  const { quantidade = 10, categoria, dificuldade, excluirIds = [] } = opcoes;
  const excluidos = new Set(excluirIds);

  const escolhidas: QuizPergunta[] = [];
  const jaEscolhido = new Set<string>();
  const diagnostico: SelecaoDiagnostico = {
    naDificuldade: 0,
    outraDificuldade: 0,
    foraDaCategoria: 0,
    repetidas: 0,
  };

  /** Acrescenta ao resultado, sem repetir, até encher a sessão. */
  const juntar = (candidatas: QuizPergunta[], contador: keyof SelecaoDiagnostico) => {
    for (const p of embaralhar(candidatas)) {
      if (escolhidas.length >= quantidade) return;
      if (jaEscolhido.has(p.id)) continue;
      escolhidas.push(p);
      jaEscolhido.add(p.id);
      diagnostico[contador] += 1;
    }
  };

  const daCategoria = todas.filter((p) => !categoria || p.categoria === categoria);
  const inedito = (p: QuizPergunta) => !excluidos.has(p.id);

  // 1) O que foi pedido: categoria certa, dificuldade certa, ainda não vista.
  juntar(
    daCategoria.filter((p) => inedito(p) && (!dificuldade || p.dificuldade === dificuldade)),
    "naDificuldade",
  );
  // 2) Cede-se a DIFICULDADE, mantendo a categoria.
  if (escolhidas.length < quantidade && dificuldade) {
    juntar(daCategoria.filter((p) => inedito(p) && p.dificuldade !== dificuldade), "outraDificuldade");
  }
  // 3) Cede-se a lista de EXCLUSÃO, mantendo a categoria — repetir uma
  //    pergunta da categoria certa é melhor do que sair dela.
  if (escolhidas.length < quantidade) {
    juntar(daCategoria, "repetidas");
  }
  // 4) Só em último caso se cede a CATEGORIA.
  if (escolhidas.length < quantidade) {
    juntar(todas.filter(inedito), "foraDaCategoria");
  }
  if (escolhidas.length < quantidade) {
    juntar(todas, "foraDaCategoria");
  }

  return { perguntas: escolhidas, diagnostico };
}

function selecionar(todas: QuizPergunta[], opcoes: SelecaoPerguntasOpcoes): QuizPergunta[] {
  return selecionarComDiagnostico(todas, opcoes).perguntas;
}

export async function getPerguntasAleatorias(
  opcoes: SelecaoPerguntasOpcoes = {}
): Promise<QuizPergunta[]> {
  const todas = await carregarBancoQuiz();
  return selecionar(todas, opcoes);
}

/** Como `getPerguntasAleatorias`, mas dizendo o que teve de ceder. */
export async function getPerguntasComDiagnostico(
  opcoes: SelecaoPerguntasOpcoes = {}
): Promise<SelecaoComDiagnostico> {
  const todas = await carregarBancoQuiz();
  return selecionarComDiagnostico(todas, opcoes);
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
  /**
   * Para cada posição embaralhada, o índice ORIGINAL no banco. Necessário
   * para o servidor poder verificar a resposta: ele conhece a ordem do banco,
   * não a que foi mostrada neste ecrã.
   */
  indicesOriginais: number[];
} {
  const indices = embaralhar(pergunta.opcoes.map((_, i) => i));
  const opcoes = indices.map((i) => pergunta.opcoes[i]);
  const correta = indices.indexOf(pergunta.correta);
  return { opcoes, correta, indicesOriginais: indices };
}

// Estatísticas e total agora vêm dos metadados pré-calculados (sem carregar os
// bancos) — regenerar com `npm run quiz:meta`.
export function getEstatisticasBanco(): Record<
  QuizCategoria,
  { total: number; facil: number; medio: number; dificil: number }
> {
  return ESTATISTICAS_BANCO;
}

export const TOTAL_PERGUNTAS = TOTAL_PERGUNTAS_META;
