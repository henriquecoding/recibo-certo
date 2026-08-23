// ═══════════════════════════════════════════════════════════════════════
//  O QUESTIONÁRIO ARRUMADO — o que a interface NÃO pode deixar cair
//  ---------------------------------------------------------------------
//  Agrupar as opções em categorias resolveu a densidade e criou um modo
//  de falhar novo e silencioso: uma opção com um grupo que não existe, ou
//  um grupo sem opções nenhumas, desaparece do ecrã sem partir o build,
//  sem partir o type-check e sem ninguém dar por isso — porque o
//  componente desenha grupo a grupo e um grupo vazio não deixa marca.
//
//  Uma competência que ninguém consegue declarar é uma hipótese que o
//  motor nunca compõe. É por isso que isto é um teste e não um comentário.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  ATIVOS,
  COMPETENCIAS_OFERECIDAS,
  FAMILIAS_COMPETENCIA,
  GRUPOS_ATIVOS,
  GRUPOS_RESTRICOES,
  NIVEIS,
  ONDE_SE_RESPONDE,
  RESTRICOES,
} from "@/lib/negocio/descoberta/contexto/perguntas";
import { CAMPOS_PROFUNDIDADE } from "@/lib/negocio/descoberta/contexto/profundidade";

describe("perguntas: agrupamento", () => {
  it("cada competência do grafo cabe numa família com nome", () => {
    const familias = new Set(FAMILIAS_COMPETENCIA.map((item) => item.id));
    const semFamilia = COMPETENCIAS_OFERECIDAS.filter((item) => !familias.has(item.familia));
    expect(semFamilia.map((item) => item.id)).toEqual([]);
  });

  it("nenhuma família fica vazia — um grupo sem opções é um grupo invisível", () => {
    const vazias = FAMILIAS_COMPETENCIA.filter(
      (familia) => !COMPETENCIAS_OFERECIDAS.some((item) => item.familia === familia.id),
    );
    expect(vazias.map((item) => item.id)).toEqual([]);
  });

  it("cada meio cabe num grupo declarado, e nenhum grupo fica vazio", () => {
    const grupos = new Set(GRUPOS_ATIVOS.map((item) => item.id));
    expect(ATIVOS.filter((item) => !grupos.has(item.grupo)).map((item) => item.id)).toEqual([]);
    expect(
      GRUPOS_ATIVOS.filter((grupo) => !ATIVOS.some((item) => item.grupo === grupo.id)).map(
        (item) => item.id,
      ),
    ).toEqual([]);
  });

  it("cada restrição cabe num grupo declarado, e nenhum grupo fica vazio", () => {
    const grupos = new Set(GRUPOS_RESTRICOES.map((item) => item.id));
    expect(RESTRICOES.filter((item) => !grupos.has(item.grupo)).map((item) => item.id)).toEqual([]);
    expect(
      GRUPOS_RESTRICOES.filter((grupo) => !RESTRICOES.some((item) => item.grupo === grupo.id)).map(
        (item) => item.id,
      ),
    ).toEqual([]);
  });

  it("agrupar não perde nem duplica nenhuma opção", () => {
    // A soma dos grupos tem de ser exatamente a lista. É esta a asserção
    // que apanha uma entrada nova que ficou só no grupo errado.
    const porGrupo = (lista: readonly { grupo: string }[], grupos: readonly { id: string }[]) =>
      grupos.reduce((total, grupo) => total + lista.filter((item) => item.grupo === grupo.id).length, 0);

    expect(porGrupo(ATIVOS, GRUPOS_ATIVOS)).toBe(ATIVOS.length);
    expect(porGrupo(RESTRICOES, GRUPOS_RESTRICOES)).toBe(RESTRICOES.length);
    expect(
      FAMILIAS_COMPETENCIA.reduce(
        (total, familia) =>
          total + COMPETENCIAS_OFERECIDAS.filter((item) => item.familia === familia.id).length,
        0,
      ),
    ).toBe(COMPETENCIAS_OFERECIDAS.length);
  });

  it("nenhum identificador de grupo se repete", () => {
    for (const grupos of [GRUPOS_ATIVOS, GRUPOS_RESTRICOES, FAMILIAS_COMPETENCIA]) {
      expect(new Set(grupos.map((item) => item.id)).size).toBe(grupos.length);
    }
  });
});

describe("perguntas: os três níveis", () => {
  it("continuam a ser três, com rótulo curto e nota", () => {
    expect(NIVEIS).toHaveLength(3);
    for (const nivel of NIVEIS) {
      expect(nivel.rotulo.length).toBeGreaterThan(0);
      // O rótulo vive num controlo segmentado que tem de caber a 360 px:
      // «Preferências avançadas» empurrava a página para o lado.
      expect(nivel.rotulo.length).toBeLessThanOrEqual(14);
      expect(nivel.nota.length).toBeGreaterThan(0);
    }
  });
});

describe("perguntas: o que falta tem sempre onde ser respondido", () => {
  // O painel lateral transformou «o que mais mudaria o resultado» em
  // atalhos. Um campo de profundidade sem destino no configurador seria
  // uma linha que não faz nada — e ninguém repara num botão inerte.
  it("todos os campos de profundidade têm destino conhecido", () => {
    const semDestino = CAMPOS_PROFUNDIDADE.filter((campo) => !ONDE_SE_RESPONDE[campo.id]);
    expect(semDestino.map((campo) => campo.id)).toEqual([]);
  });

  it("e nenhum destino aponta para um campo que já não existe", () => {
    const campos = new Set(CAMPOS_PROFUNDIDADE.map((campo) => campo.id));
    expect(Object.keys(ONDE_SE_RESPONDE).filter((id) => !campos.has(id))).toEqual([]);
  });
});
