// ═══════════════════════════════════════════════════════════════════════
//  INTEGRIDADE DO BANCO DE PERGUNTAS — todos os bancos, sem exceções
//  ---------------------------------------------------------------------
//  A auditoria do quiz explica porque é que o `rs-98` passou despercebido:
//  `quiz-novos-bancos.test.ts` aplicava as verificações estritas só a
//  `dep-*` e `emp-*`. Os bancos antigos — 13 ficheiros e a esmagadora
//  maioria das 1.614 perguntas — não tinham validação nenhuma além de IDs
//  únicos e `correta` dentro do intervalo.
//
//  Este ficheiro estende as mesmas regras a TODO o banco. Entra antes das
//  correções de conteúdo, de propósito: assim as correções nascem já
//  protegidas e uma regressão futura falha o CI em vez de chegar ao
//  utilizador.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { carregarBancoQuiz } from "../quiz-fiscal";
import { META_CATEGORIA_QUIZ, type QuizPergunta } from "../quiz-fiscal/types";

/** Normaliza um enunciado para comparação: sem acentos, espaços ou pontuação. */
function normalizarEnunciado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

let banco: QuizPergunta[] | null = null;
async function obterBanco(): Promise<QuizPergunta[]> {
  if (!banco) banco = await carregarBancoQuiz();
  return banco;
}

describe("quiz:banco — estrutura de cada pergunta", () => {
  it("toda a pergunta tem exatamente 4 opções", async () => {
    const falhas = (await obterBanco())
      .filter((p) => p.opcoes.length !== 4)
      .map((p) => `${p.id} (${p.opcoes.length} opções)`);
    expect(falhas).toEqual([]);
  });

  it("nenhuma pergunta tem opções com o mesmo texto", async () => {
    // É o defeito do `rs-98`: duas opções «36.000 €», uma marcada errada.
    // Depois de embaralhar são indistinguíveis, e quem sabe a resposta certa
    // tem 50% de probabilidade de ser marcado como errado.
    const falhas: string[] = [];
    for (const p of await obterBanco()) {
      const textos = p.opcoes.map((o) => o.texto.trim());
      const repetidos = textos.filter((t, i) => textos.indexOf(t) !== i);
      if (repetidos.length > 0) falhas.push(`${p.id}: «${[...new Set(repetidos)].join("», «")}»`);
    }
    expect(falhas).toEqual([]);
  });

  it("a opção correta está dentro do intervalo e tem explicação", async () => {
    const falhas: string[] = [];
    for (const p of await obterBanco()) {
      if (p.correta < 0 || p.correta >= p.opcoes.length) {
        falhas.push(`${p.id}: correta=${p.correta} fora do intervalo`);
        continue;
      }
      if (!p.opcoes[p.correta].porque?.trim()) falhas.push(`${p.id}: opção correta sem explicação`);
    }
    expect(falhas).toEqual([]);
  });

  it("toda a opção tem texto e explicação preenchidos", async () => {
    const falhas: string[] = [];
    for (const p of await obterBanco()) {
      p.opcoes.forEach((o, i) => {
        if (!o.texto?.trim()) falhas.push(`${p.id}[${i}]: sem texto`);
        if (!o.porque?.trim()) falhas.push(`${p.id}[${i}]: sem explicação`);
      });
    }
    expect(falhas).toEqual([]);
  });

  it("toda a pergunta tem base legal e fonte com URL", async () => {
    const falhas: string[] = [];
    for (const p of await obterBanco()) {
      if (!p.legalBasis?.trim()) falhas.push(`${p.id}: sem legalBasis`);
      if (!p.fonte?.url?.startsWith("https://")) falhas.push(`${p.id}: fonte sem URL https`);
      if (!p.fonte?.label?.trim()) falhas.push(`${p.id}: fonte sem rótulo`);
    }
    expect(falhas).toEqual([]);
  });

  it("toda a pergunta tem categoria conhecida e dificuldade válida", async () => {
    const falhas: string[] = [];
    for (const p of await obterBanco()) {
      if (!META_CATEGORIA_QUIZ[p.categoria]) falhas.push(`${p.id}: categoria «${p.categoria}» desconhecida`);
      if (![1, 2, 3].includes(p.dificuldade)) falhas.push(`${p.id}: dificuldade ${p.dificuldade}`);
    }
    expect(falhas).toEqual([]);
  });
});

describe("quiz:banco — unicidade em todo o banco", () => {
  it("nenhum ID se repete", async () => {
    const vistos = new Set<string>();
    const duplicados: string[] = [];
    for (const p of await obterBanco()) {
      if (vistos.has(p.id)) duplicados.push(p.id);
      vistos.add(p.id);
    }
    expect(duplicados).toEqual([]);
  });

  it("nenhum ENUNCIADO se repete", async () => {
    // `selecionar()` deduplica por identidade de objeto, não por texto: com
    // enunciados repetidos, a mesma pergunta pode sair duas vezes na mesma
    // sessão de 10 — e o utilizador vê-a como um erro do produto.
    const porTexto = new Map<string, string[]>();
    for (const p of await obterBanco()) {
      const chave = normalizarEnunciado(p.pergunta);
      porTexto.set(chave, [...(porTexto.get(chave) ?? []), p.id]);
    }
    const duplicados = [...porTexto.values()]
      .filter((ids) => ids.length > 1)
      .map((ids) => ids.join(" ≡ "));
    expect(duplicados).toEqual([]);
  });
});
