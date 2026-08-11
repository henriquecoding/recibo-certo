// ═══════════════════════════════════════════════════════════════════════
//  RANKING — determinístico, explicável e sem subsequência
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTAVA AQUI ANTES, E PORQUE TINHA DE SAIR (P0-02)              │
//  │                                                                     │
//  │ A função anterior dava 20 pontos quando todos os caracteres da       │
//  │ consulta apareciam pela mesma ORDEM em qualquer parte do texto —     │
//  │ sem distância máxima, sem fronteira de palavra, sem proporção de     │
//  │ cobertura e sem pontuação mínima. Em português, com palavras         │
//  │ longas e vogais repetidas, quase tudo é subsequência de quase tudo:  │
//  │                                                                     │
//  │   «doações» → d·o·a·ç·õ·e·s  encontrava «Retenção na fonte»          │
//  │                              e «Fatura, recibo e fatura-recibo»      │
//  │                                                                     │
//  │ Não é um resultado mau: é um resultado INVENTADO. E o que se perde   │
//  │ com ele não é uma pesquisa — é a confiança de que a pesquisa sabe    │
//  │ alguma coisa. Num produto fiscal isso contamina tudo o resto.        │
//  │                                                                     │
//  │ O que fica: frase exacta, prefixo, subcadeia, token exacto, prefixo  │
//  │ de token e UMA gralha em palavras com pelo menos cinco letras.       │
//  │ Cada correspondência tem nome, e o nome viaja com o resultado — um   │
//  │ resultado que ninguém consegue explicar não se consegue corrigir.    │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import type { DocumentoBusca, FiltroIntencao, TipoDoc } from "./esquema";
import { ORDEM_TIPOS } from "./esquema";
import { distanciaAteUm, normalizar, tokens } from "./normalizar";

/** Abaixo disto não se escreve uma pesquisa: escreve-se o caminho até uma. */
export const MIN_CARACTERES = 2;

/**
 * A pontuação mínima para um documento ser mostrado.
 *
 * Existe para haver um estado «sem resultados» honesto. Sem limiar, o
 * fundo do ranking é sempre preenchido por algo — e uma lista que nunca
 * está vazia é uma lista em que a primeira linha não significa nada.
 */
export const LIMIAR = 18;

/** Tectos por superfície (P0-04). Ver `partes.tsx` e `/pesquisar`. */
export const TETO_POPOVER = 8;
export const TETO_DIALOGO = 12;

export type CampoMatch = "titulo" | "aliases" | "descricao";

export interface ResultadoBusca {
  doc: DocumentoBusca;
  pontos: number;
  /** Qual campo produziu a pontuação. É o «porquê» de cada resultado. */
  campo: CampoMatch;
}

/** Pesos por campo. O título manda; a descrição confirma, não decide. */
const PESO: Record<CampoMatch, number> = {
  titulo: 1,
  aliases: 0.9,
  descricao: 0.45,
};

/**
 * A subcadeia vale — mas só quando começa numa FRONTEIRA DE PALAVRA.
 *
 * Sem esta condição, `texto.includes(q)` reintroduz pela porta do lado o
 * problema que a subsequência tinha pela porta da frente: «ira» encontra
 * «primeira», «estrangeira» e «Parteiras», e a pessoa recebe outra vez
 * resultados que não têm nada a ver com o que perguntou. Em português, com
 * palavras longas e sufixos comuns, isso é a regra e não a excepção.
 *
 * Sem expressão regular de propósito: isto corre uma vez por campo, por
 * documento, por tecla — três centenas de compilações de regex por
 * carácter escrito seria pagar caro por uma linha mais curta.
 */
function contemEmFronteira(texto: string, q: string): boolean {
  let i = texto.indexOf(q);
  while (i !== -1) {
    if (i === 0 || texto[i - 1] === " ") return true;
    i = texto.indexOf(q, i + 1);
  }
  return false;
}

/**
 * Normalizar 305 documentos × 3 campos a cada tecla é o grosso do custo
 * desta pesquisa — e o resultado é sempre o mesmo, porque os campos não
 * mudam. O cache é `Map` por string de entrada: as entradas são poucas
 * (os campos do índice) e vivem tanto quanto o índice.
 */
const cacheNormalizado = new Map<string, string>();
function normalizarCampo(valor: string): string {
  const em = cacheNormalizado.get(valor);
  if (em !== undefined) return em;
  const norm = normalizar(valor);
  cacheNormalizado.set(valor, norm);
  return norm;
}

function pontuarCampo(consultaNormalizada: string, valor: string): number {
  const texto = normalizarCampo(valor);
  if (!consultaNormalizada || !texto) return 0;

  if (texto === consultaNormalizada) return 120;
  if (texto.startsWith(consultaNormalizada)) return 90;
  if (contemEmFronteira(texto, consultaNormalizada)) return 70;

  const tokensDoc = tokens(texto);
  const tokensConsulta = tokens(consultaNormalizada);
  if (tokensConsulta.length === 0) return 0;

  let soma = 0;
  let cobertos = 0;
  for (const alvo of tokensConsulta) {
    const exato = tokensDoc.includes(alvo);
    const prefixo = !exato && alvo.length >= 3 && tokensDoc.some((t) => t.startsWith(alvo));
    // Uma gralha só é perdoada a partir de cinco letras: em palavras curtas
    // uma edição transforma «iva» em «ira» e passa a ser outra pergunta.
    const gralha = !exato && !prefixo && alvo.length >= 5 && tokensDoc.some((t) => distanciaAteUm(t, alvo));

    const pontos = exato ? 45 : prefixo ? 28 : gralha ? 18 : 0;
    if (pontos > 0) cobertos++;
    soma += pontos;
  }
  if (cobertos === 0) return 0;

  /**
   * Proporção de cobertura — o que impedia «abrir empresa» de devolver
   * tudo o que fala de «empresa» ao mesmo nível de quem responde às duas
   * palavras. Quem cobre metade da pergunta vale metade.
   */
  return soma * (cobertos / tokensConsulta.length);
}

export function pontuarDocumento(consulta: string, doc: DocumentoBusca): ResultadoBusca | null {
  const q = normalizar(consulta);
  if (q.length < MIN_CARACTERES) return null;

  const candidatos: [CampoMatch, number][] = [
    ["titulo", pontuarCampo(q, doc.titulo) * PESO.titulo],
    ["aliases", pontuarCampo(q, doc.aliases.join(" ")) * PESO.aliases],
    ["descricao", pontuarCampo(q, doc.descricao) * PESO.descricao],
  ];

  let campo: CampoMatch = "titulo";
  let melhor = 0;
  for (const [nome, pontos] of candidatos) {
    if (pontos > melhor) {
      melhor = pontos;
      campo = nome;
    }
  }
  if (melhor <= 0) return null;

  // A prioridade nunca faz um documento passar o limiar sozinha: entra
  // depois, e só desempata (0–100 → 0–1 ponto).
  return { doc, pontos: melhor + doc.prioridade / 100, campo };
}

export interface OpcoesPesquisa {
  /** Máximo de resultados devolvidos. `0` ou ausente = sem tecto. */
  limite?: number;
  /** Filtro por intenção. `tudo` (ou ausente) não filtra. */
  intencao?: FiltroIntencao;
  /** Filtro por tipo, para o «ver só guias» da página completa. */
  tipo?: TipoDoc | "todos";
}

export function pesquisar(
  consulta: string,
  documentos: DocumentoBusca[],
  opcoes: OpcoesPesquisa = {},
): ResultadoBusca[] {
  const { limite = 0, intencao = "tudo", tipo = "todos" } = opcoes;
  if (normalizar(consulta).length < MIN_CARACTERES) return [];

  const resultados: ResultadoBusca[] = [];
  for (const doc of documentos) {
    if (intencao !== "tudo" && !doc.intencoes.includes(intencao)) continue;
    if (tipo !== "todos" && doc.tipo !== tipo) continue;
    const r = pontuarDocumento(consulta, doc);
    if (r && r.pontos >= LIMIAR) resultados.push(r);
  }

  resultados.sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.doc.prioridade - a.doc.prioridade ||
      ORDEM_TIPOS.indexOf(a.doc.tipo) - ORDEM_TIPOS.indexOf(b.doc.tipo) ||
      // O último critério é o id: sem ele, dois documentos empatados
      // trocavam de lugar entre renders conforme a ordem do índice.
      a.doc.id.localeCompare(b.doc.id, "pt-PT"),
  );

  return limite > 0 ? resultados.slice(0, limite) : resultados;
}

/**
 * A MELHOR RESPOSTA — no máximo uma, e só quando é destacada de facto.
 *
 * Coroar sempre o primeiro resultado seria um enfeite: numa lista em que o
 * primeiro e o segundo estão empatados, destacar um deles é dizer à pessoa
 * que há uma certeza que não existe. Só há «melhor resposta» quando o topo
 * ganha por uma margem clara.
 */
export function melhorResposta(resultados: ResultadoBusca[]): ResultadoBusca | null {
  const [primeiro, segundo] = resultados;
  if (!primeiro) return null;
  if (!segundo) return primeiro;
  return primeiro.pontos >= segundo.pontos * 1.25 ? primeiro : null;
}

/**
 * Agrupa por tipo — mas a ORDEM dos grupos vem do ranking.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UMA ORDEM FIXA DE TIPOS ENTERRA O MELHOR RESULTADO                   │
 * │                                                                     │
 * │ «Ferramentas antes de guias» é uma boa regra para percorrer uma      │
 * │ lista e uma péssima regra para responder a uma pergunta. Em «iva», o │
 * │ guia «IVA nos recibos verdes» ganhava por larga margem e aparecia    │
 * │ DEPOIS de uma calculadora que só menciona IVA na descrição — porque  │
 * │ o tipo dela vinha antes na lista.                                    │
 * │                                                                     │
 * │ O grupo vale o que vale o seu melhor membro. `ORDEM_TIPOS` continua  │
 * │ a existir, mas só para desempatar — que é o papel que uma preferência│
 * │ editorial deve ter quando a relevância já se pronunciou.             │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function agruparPorTipo(resultados: ResultadoBusca[]): [TipoDoc, ResultadoBusca[]][] {
  const mapa = new Map<TipoDoc, ResultadoBusca[]>();
  for (const r of resultados) {
    const lista = mapa.get(r.doc.tipo);
    if (lista) lista.push(r);
    else mapa.set(r.doc.tipo, [r]);
  }

  return [...mapa.entries()].sort(
    ([tipoA, listaA], [tipoB, listaB]) =>
      listaB[0].pontos - listaA[0].pontos || ORDEM_TIPOS.indexOf(tipoA) - ORDEM_TIPOS.indexOf(tipoB),
  );
}
