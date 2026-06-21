import { PERGUNTAS_PARTE_1 } from "./perguntas-parte1";
import { PERGUNTAS_PARTE_2 } from "./perguntas-parte2";
import { PERGUNTAS_PARTE_3 } from "./perguntas-parte3";
import { PERGUNTAS_RETENCAO } from "./perguntas-retencao";
import { PERGUNTAS_IVA } from "./perguntas-iva";
import { PERGUNTAS_SS } from "./perguntas-ss";
import { PERGUNTAS_REGIME } from "./perguntas-regime";
import { PERGUNTAS_IRS_JOVEM } from "./perguntas-irs-jovem";
import { PERGUNTAS_ESCALOES } from "./perguntas-escaloes";
import { PERGUNTAS_ATIVIDADES } from "./perguntas-atividades";
import { PERGUNTAS_CATF } from "./perguntas-catf";
import { PERGUNTAS_PRAZOS } from "./perguntas-prazos";
import { PERGUNTAS_GERAL } from "./perguntas-geral";
import { PERGUNTAS_DEPENDENTE } from "./gerador-dependente";
import { PERGUNTAS_EMPRESA } from "./gerador-empresa";
import {
  META_CATEGORIA_QUIZ,
  META_GRUPO_QUIZ,
  type QuizCategoria,
  type QuizGrupo,
  type QuizFonte,
  type QuizOpcao,
  type QuizPergunta,
} from "./types";

export {
  META_CATEGORIA_QUIZ,
  META_GRUPO_QUIZ,
  type QuizCategoria,
  type QuizGrupo,
  type QuizFonte,
  type QuizOpcao,
  type QuizPergunta,
};

export const QUIZ_PERGUNTAS: QuizPergunta[] = [
  ...PERGUNTAS_PARTE_1,
  ...PERGUNTAS_PARTE_2,
  ...PERGUNTAS_PARTE_3,
  ...PERGUNTAS_RETENCAO,
  ...PERGUNTAS_IVA,
  ...PERGUNTAS_SS,
  ...PERGUNTAS_REGIME,
  ...PERGUNTAS_IRS_JOVEM,
  ...PERGUNTAS_ESCALOES,
  ...PERGUNTAS_ATIVIDADES,
  ...PERGUNTAS_CATF,
  ...PERGUNTAS_PRAZOS,
  ...PERGUNTAS_GERAL,
  ...PERGUNTAS_DEPENDENTE,
  ...PERGUNTAS_EMPRESA,
];

export function embaralhar<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function getPerguntasPorCategoria(categoria: QuizCategoria): QuizPergunta[] {
  return QUIZ_PERGUNTAS.filter((p) => p.categoria === categoria);
}

export interface SelecaoPerguntasOpcoes {
  quantidade?: number;
  categoria?: QuizCategoria;
  dificuldade?: 1 | 2 | 3;
  excluirIds?: string[];
}

export function getPerguntasAleatorias(opcoes: SelecaoPerguntasOpcoes = {}): QuizPergunta[] {
  const { quantidade = 10, categoria, dificuldade, excluirIds = [] } = opcoes;

  // Universo elegível: categoria escolhida (ou todas) menos as já vistas.
  const naCategoria = (p: QuizPergunta) => !categoria || p.categoria === categoria;
  const naoExcluido = (p: QuizPergunta) => !excluirIds.includes(p.id);
  const base = QUIZ_PERGUNTAS.filter((p) => naCategoria(p) && naoExcluido(p));

  // Perguntas da dificuldade pedida vêm PRIMEIRO (prioridade).
  const preferidas = dificuldade ? base.filter((p) => p.dificuldade === dificuldade) : base;

  // Se a dificuldade escolhida não chega para a sessão pedida, completa-se com
  // as restantes perguntas da mesma categoria (outras dificuldades) — assim o
  // utilizador recebe sempre o número de perguntas que pediu, em vez de menos.
  let resultado = embaralhar(preferidas);
  if (dificuldade && resultado.length < quantidade) {
    const resto = embaralhar(base.filter((p) => p.dificuldade !== dificuldade));
    resultado = [...resultado, ...resto];
  }

  // Último recurso: categoria sem perguntas suficientes → usa todo o banco.
  if (resultado.length < quantidade) {
    const extra = embaralhar(
      QUIZ_PERGUNTAS.filter((p) => naoExcluido(p) && !resultado.includes(p))
    );
    resultado = [...resultado, ...extra];
  }

  return resultado.slice(0, Math.min(quantidade, resultado.length));
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

export function getEstatisticasBanco(): Record<
  QuizCategoria,
  { total: number; facil: number; medio: number; dificil: number }
> {
  const base: Record<QuizCategoria, { total: number; facil: number; medio: number; dificil: number }> =
    Object.fromEntries(
      (Object.keys(META_CATEGORIA_QUIZ) as QuizCategoria[]).map((cat) => [
        cat,
        { total: 0, facil: 0, medio: 0, dificil: 0 },
      ])
    ) as Record<QuizCategoria, { total: number; facil: number; medio: number; dificil: number }>;

  for (const p of QUIZ_PERGUNTAS) {
    base[p.categoria].total++;
    if (p.dificuldade === 1) base[p.categoria].facil++;
    else if (p.dificuldade === 2) base[p.categoria].medio++;
    else base[p.categoria].dificil++;
  }

  return base;
}

export const TOTAL_PERGUNTAS = QUIZ_PERGUNTAS.length;
