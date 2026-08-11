// Carregamento dos dados do popup "Novidades & Atualizações".
//
// ⚠️ REGRA INEGOCIÁVEL (CLAUDE.md, regra 11) — AO ABRIR, O POPUP SÓ CARREGA O
// MÊS ATUAL. Os meses anteriores entram como um grupo fechado com o nome do
// mês, e os dados desse mês só são pedidos quando alguém clica nele.
//
// A regra vale por CONSTRUÇÃO, não por disciplina: o índice não contém as
// entradas dos meses anteriores — só o nome e a contagem. Não há como um
// componente distraído as mostrar à entrada, porque elas não estão lá. Ver
// `scripts/gen-novidades.mjs`, que é quem talha os ficheiros.
//
// Os dados NÃO vivem num módulo JavaScript. Vivem em ficheiros estáticos
// gerados a partir de `src/lib/changelog.ts` (que continua a ser a fonte de
// verdade, e o sítio onde se escreve uma entrada nova). A razão está escrita
// nesse script; em duas linhas: o changelog são 186 KB de prosa, e como módulo
// era um chunk de 173 KB que o browser tinha de descarregar, PARSEAR e
// executar antes de mostrar uma linha. Como JSON estático não passa pelo
// parser de JS, não entra no grafo de módulos e fica na CDN com cache própria.

import { APP_VERSION } from "@/lib/version";

export interface EntradaResumo {
  version: string;
  /** Dia já formatado em pt-PT no build ("10 ago") — ver nota no gerador. */
  dia: string;
  titulo: string;
  /** Quantos marcadores tem a entrada. */
  n: number;
}

export interface EntradaCompleta extends EntradaResumo {
  itens: string[];
}

/** Um mês completo — entradas e corpos. Um ficheiro por mês. */
export interface MesCompleto {
  chave: string;
  rotulo: string;
  entradas: EntradaCompleta[];
}

/** O que o popup sabe de um mês anterior antes de alguém lhe tocar. */
export interface MesFechado {
  /** "2026-07" */
  chave: string;
  /** "Julho de 2026" */
  rotulo: string;
  /** Quantas versões tem — para o grupo poder anunciar-se sem ser carregado. */
  n: number;
}

export interface IndiceNovidades {
  appVersion: string;
  totalVersoes: number;
  /** Marcadores da versão mais recente, para a primeira pintura não esperar. */
  destaque: string[];
  mesAtual: { chave: string; rotulo: string; entradas: EntradaResumo[] } | null;
  anteriores: MesFechado[];
}

// `?v=` com a versão da app: os ficheiros não têm hash no nome, e é isto que
// garante que uma cache intermédia nunca serve um índice sem a entrada que
// acabou de fazer o popup aparecer.
const sufixo = `?v=${APP_VERSION}`;

// Memorizadas ao nível do módulo: o painel abre, fecha e reabre sem repetir
// pedidos, e várias linhas a pedir o mesmo mês ao mesmo tempo partilham um só.
let promessaIndice: Promise<IndiceNovidades> | null = null;
const promessasMes = new Map<string, Promise<MesCompleto>>();

async function buscar<T>(url: string): Promise<T> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`[novidades] ${url} devolveu ${resposta.status}`);
  return (await resposta.json()) as T;
}

export function carregarIndice(): Promise<IndiceNovidades> {
  // Em caso de falha, esquecer a promessa para que uma nova tentativa (abrir
  // outra vez) não fique presa ao erro da primeira.
  promessaIndice ??= buscar<IndiceNovidades>(`/novidades/indice.json${sufixo}`).catch((e) => {
    promessaIndice = null;
    throw e;
  });
  return promessaIndice;
}

/**
 * Um mês, inteiro, com os corpos. Chamado (a) por intenção de abrir uma
 * entrada do mês atual e (b) ao clicar no grupo de um mês anterior — nunca à
 * entrada, e nunca em lote.
 */
export function carregarMes(chave: string): Promise<MesCompleto> {
  const emCurso = promessasMes.get(chave);
  if (emCurso) return emCurso;
  const promessa = buscar<MesCompleto>(`/novidades/meses/${chave}.json${sufixo}`).catch((e) => {
    promessasMes.delete(chave);
    throw e;
  });
  promessasMes.set(chave, promessa);
  return promessa;
}
