import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  CONJUNTOS, GRUPOS, FORA_DO_CATALOGO, conjuntoPorId, APAGAVEIS,
} from "@/lib/conta/catalogo";

const RAIZ = process.cwd();
const MIGRACOES = join(RAIZ, "supabase/migrations");

/** As tabelas que as migrações criam, com as colunas de cada uma. */
function tabelasDasMigracoes(): Map<string, string[]> {
  const tabelas = new Map<string, string[]>();
  for (const f of readdirSync(MIGRACOES).filter((n) => n.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRACOES, f), "utf8");
    const re = /CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
    for (const m of sql.matchAll(re)) {
      const colunas = [...m[2].matchAll(/^\s*(\w+)\s+\w/gm)].map((c) => c[1]);
      // Uma migração posterior pode recriar a tabela; fica a última.
      tabelas.set(m[1], colunas);
    }

    // As colunas acrescentadas depois contam tanto como as originais —
    // `profiles.preferencias_fiscais` nasceu num ALTER, e ler só os CREATE
    // dava um catálogo «errado» por um campo que existe mesmo.
    const alter = /ALTER TABLE (?:IF EXISTS )?public\.(\w+)([\s\S]*?);/g;
    for (const m of sql.matchAll(alter)) {
      const existentes = tabelas.get(m[1]);
      if (!existentes) continue;
      for (const c of m[2].matchAll(/ADD COLUMN (?:IF NOT EXISTS )?(\w+)/g)) {
        if (!existentes.includes(c[1])) existentes.push(c[1]);
      }
    }
  }
  return tabelas;
}

/** Colunas que dizem «esta linha é de alguém». */
const COLUNAS_DE_DONO = ["user_id", "cliente_id", "contabilista_id", "autor_id", "pedida_por"];

describe("RC-DADOS-001 · o catálogo cobre tudo o que tem dono", () => {
  // ⚠️ Este é o teste que existe por causa do buraco. A rota apagava cinco
  // tabelas; a base de dados tinha vinte e oito com dados de pessoas. Uma
  // lista escrita à mão dentro de uma rota não sobrevive a uma migração
  // nova, e ninguém dá por isso até alguém pedir para ser esquecido.
  it("nenhuma tabela com coluna de dono fica de fora sem uma razão escrita", () => {
    const noCatalogo = new Set(CONJUNTOS.flatMap((c) => c.tabelas.map((t) => t.nome)));
    const esquecidas: string[] = [];

    for (const [tabela, colunas] of tabelasDasMigracoes()) {
      const temDono = colunas.some((c) => COLUNAS_DE_DONO.includes(c));
      if (!temDono) continue;
      if (noCatalogo.has(tabela)) continue;
      if (FORA_DO_CATALOGO[tabela]) continue;
      esquecidas.push(tabela);
    }

    expect(
      esquecidas,
      "tabelas com dono fora do catálogo — declara-as em CONJUNTOS ou explica-as em FORA_DO_CATALOGO",
    ).toEqual([]);
  });

  it("toda a tabela do catálogo existe mesmo nas migrações", () => {
    const existentes = tabelasDasMigracoes();
    const inventadas = CONJUNTOS
      .flatMap((c) => c.tabelas.map((t) => `${c.id}: ${t.nome}`))
      .filter((s) => !existentes.has(s.split(": ")[1]));
    expect(inventadas, "o catálogo aponta para tabelas que não existem").toEqual([]);
  });

  it("a coluna de posse existe mesmo na tabela", () => {
    const existentes = tabelasDasMigracoes();
    const erradas: string[] = [];
    for (const c of CONJUNTOS) {
      for (const t of c.tabelas) {
        const colunas = existentes.get(t.nome) ?? [];
        if (t.posse.por === "coluna" && !colunas.includes(t.posse.coluna)) {
          erradas.push(`${t.nome} sem ${t.posse.coluna}`);
        }
        // Uma tabela que diz pender de outra tem mesmo de lhe apontar.
        if (t.posse.por === "pende") {
          const fk = `${t.posse.de.replace(/s$/, "")}_id`;
          const temFk = colunas.some((col) => col.endsWith("_id") && col !== "id");
          if (!temFk) erradas.push(`${t.nome} diz pender de ${t.posse.de} e não tem chave nenhuma`);
          void fk;
        }
        if (t.posse.por === "campo" && !colunas.includes(t.posse.coluna)) {
          erradas.push(`${t.nome} sem o campo ${t.posse.coluna}`);
        }
      }
    }
    expect(erradas).toEqual([]);
  });

  it("uma razão em FORA_DO_CATALOGO nunca é uma tabela que também está dentro", () => {
    const noCatalogo = new Set(CONJUNTOS.flatMap((c) => c.tabelas.map((t) => t.nome)));
    const ambos = Object.keys(FORA_DO_CATALOGO).filter((t) => noCatalogo.has(t));
    // `profiles` é a exceção declarada: o campo do perfil fiscal limpa-se,
    // a linha inteira sai com a conta.
    expect(ambos).toEqual(["profiles"]);
  });
});

describe("RC-DADOS-002 · o catálogo é legível por quem o vai usar", () => {
  it("cada conjunto tem id único e um grupo que existe", () => {
    const ids = CONJUNTOS.map((c) => c.id);
    expect(new Set(ids).size, "ids repetidos").toBe(ids.length);
    const grupos = new Set(GRUPOS.map((g) => g.id));
    for (const c of CONJUNTOS) {
      expect(grupos.has(c.grupo), `${c.id} num grupo inexistente`).toBe(true);
    }
  });

  it("cada grupo tem pelo menos um conjunto — nenhum aparece vazio", () => {
    for (const g of GRUPOS) {
      expect(
        CONJUNTOS.some((c) => c.grupo === g.id),
        `o grupo «${g.titulo}» não tem nada dentro`,
      ).toBe(true);
    }
  });

  it("as descrições dizem o que desaparece, sem nomes de tabelas", () => {
    for (const c of CONJUNTOS) {
      expect(c.titulo.length, `${c.id} sem título`).toBeGreaterThan(3);
      expect(c.descricao.length, `${c.id} com descrição curta de mais`).toBeGreaterThan(30);
      // Quem lê a zona de perigo não sabe o que é `contabilista_vinculos`.
      // Só os nomes técnicos contam: «recibos» é uma tabela E uma palavra
      // portuguesa, e proibi-la proibia escrever a frase que faz sentido.
      for (const t of c.tabelas.filter((x) => x.nome.includes("_"))) {
        expect(c.descricao, `${c.id} mostra o nome da tabela`).not.toContain(t.nome);
      }
    }
  });

  it("o que é retido diz porquê, e não entra na lista do que se apaga", () => {
    for (const c of CONJUNTOS) {
      if (!c.retido) continue;
      expect(c.retido.length, `${c.id} retido sem razão escrita`).toBeGreaterThan(20);
      expect(APAGAVEIS).not.toContain(c.id);
    }
  });

  it("encontra-se um conjunto pelo id, e um id inventado não devolve nada", () => {
    expect(conjuntoPorId("recibos")?.titulo).toBe("Recibos verdes");
    expect(conjuntoPorId("nao-existe")).toBeUndefined();
  });
});
