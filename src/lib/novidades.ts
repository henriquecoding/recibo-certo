// Carregamento dos dados do popup "Novidades & Atualizações".
//
// Os dados NÃO vivem num módulo JavaScript. Vivem em dois ficheiros estáticos
// gerados por `scripts/gen-novidades.mjs` a partir de `src/lib/changelog.ts`
// (que continua a ser a fonte de verdade, e o sítio onde se escreve uma
// entrada nova). A razão está escrita nesse script; em duas linhas:
//
//   · o changelog são 186 KB de prosa. Como módulo, era um chunk de 173 KB
//     que o browser tinha de descarregar, PARSEAR e executar antes de mostrar
//     uma linha;
//   · como JSON estático, não passa pelo parser de JS, não entra no grafo de
//     módulos, é `JSON.parse` puro e fica na CDN com cache própria.
//
// E o corte é por PROFUNDIDADE, não por data: o índice (~6 KB comprimido)
// traz os títulos de todas as 175 versões, já agrupadas por mês, mais o corpo
// da entrada nova — que é a única que abre expandida. Os corpos das restantes
// só são buscados se alguém mostrar intenção de abrir uma.

import { APP_VERSION } from "@/lib/version";

export interface EntradaResumo {
  version: string;
  /** Dia já formatado em pt-PT no build ("10 ago") — ver nota no gerador. */
  dia: string;
  titulo: string;
  /** Quantos marcadores tem a entrada. */
  n: number;
}

export interface MesNovidades {
  /** "2026-08" */
  chave: string;
  /** "Agosto de 2026" */
  rotulo: string;
  entradas: EntradaResumo[];
}

export interface IndiceNovidades {
  appVersion: string;
  totalVersoes: number;
  /** Marcadores da versão mais recente, para a primeira pintura não esperar. */
  destaque: string[];
  meses: MesNovidades[];
}

export type CorpoNovidades = Record<string, string[]>;

// `?v=` com a versão da app: os ficheiros não têm hash no nome, e é isto que
// garante que uma cache intermédia nunca serve um índice sem a entrada que
// acabou de fazer o popup aparecer.
const URL_INDICE = `/novidades/indice.json?v=${APP_VERSION}`;
const URL_CORPO = `/novidades/corpo.json?v=${APP_VERSION}`;

// Memorizadas ao nível do módulo: o painel abre, fecha e reabre sem repetir
// pedidos, e várias linhas a pedir o corpo ao mesmo tempo partilham um só.
let promessaIndice: Promise<IndiceNovidades> | null = null;
let promessaCorpo: Promise<CorpoNovidades> | null = null;

async function buscar<T>(url: string): Promise<T> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`[novidades] ${url} devolveu ${resposta.status}`);
  return (await resposta.json()) as T;
}

export function carregarIndice(): Promise<IndiceNovidades> {
  // Em caso de falha, esquecer a promessa para que uma nova tentativa (abrir
  // outra vez) não fique presa ao erro da primeira.
  promessaIndice ??= buscar<IndiceNovidades>(URL_INDICE).catch((e) => {
    promessaIndice = null;
    throw e;
  });
  return promessaIndice;
}

export function carregarCorpo(): Promise<CorpoNovidades> {
  promessaCorpo ??= buscar<CorpoNovidades>(URL_CORPO).catch((e) => {
    promessaCorpo = null;
    throw e;
  });
  return promessaCorpo;
}
