// ═══════════════════════════════════════════════════════════════════════
//  OS WORKFLOWS — RC-SEC-002, RC-CI-003 e RC-CI-005
//  ---------------------------------------------------------------------
//  RC-SEC-002 é o que importa mesmo. `actions/checkout@v4` não é uma versão:
//  é uma ETIQUETA, e uma etiqueta pode ser movida para outro commit por quem
//  controlar o repositório da action. Se essa conta for comprometida, o
//  próximo run do nosso CI executa código novo — com acesso ao token do
//  workflow e aos segredos do repositório — sem que nada aqui mude. Foi assim
//  que caíram várias cadeias de fornecimento em CI. Um SHA completo não se
//  move: é o conteúdo.
//
//  RC-CI-003: Node 20 em dois workflows e 22 noutros três, sem ficheiro de
//  versão. Um teste que passa em 22 e parte em 20 é um bug que só aparece no
//  workflow errado, e ninguém sabe qual é o certo.
//
//  RC-CI-005: sem `concurrency`, cada push acumula runs que já não interessam
//  a ninguém e a fila atrasa o feedback do push que interessa.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "..", "..");
const DIR = join(RAIZ, ".github", "workflows");

const ficheiros = readdirSync(DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
const ler = (f: string) => readFileSync(join(DIR, f), "utf8");

it("há workflows para inspecionar", () => {
  expect(ficheiros.length).toBeGreaterThan(0);
});

describe("RC-SEC-002 · actions fixadas por SHA", () => {
  it("nenhuma action externa usa etiqueta móvel", () => {
    const moveis: string[] = [];
    for (const f of ficheiros) {
      for (const linha of ler(f).split("\n")) {
        const m = linha.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/);
        if (!m) continue;
        const ref = m[1];
        // `./algo` e `docker://` não são actions de terceiros por etiqueta.
        if (ref.startsWith("./") || ref.startsWith("docker://")) continue;
        const depoisDoArroba = ref.split("@")[1] ?? "";
        if (!/^[0-9a-f]{40}$/.test(depoisDoArroba)) moveis.push(`${f}: ${ref}`);
      }
    }
    expect(moveis, `fixar por SHA completo:\n${moveis.join("\n")}`).toEqual([]);
  });

  it("cada SHA traz ao lado a versão que representa, para ser legível", () => {
    const semComentario: string[] = [];
    for (const f of ficheiros) {
      for (const linha of ler(f).split("\n")) {
        if (!/uses:\s*\S+@[0-9a-f]{40}/.test(linha)) continue;
        if (!/#\s*v?\d/.test(linha)) semComentario.push(`${f}: ${linha.trim()}`);
      }
    }
    expect(semComentario).toEqual([]);
  });
});

describe("RC-CI-003 · uma versão de Node", () => {
  it("existe .nvmrc e é a fonte única", () => {
    const nvmrc = readFileSync(join(RAIZ, ".nvmrc"), "utf8").trim();
    expect(nvmrc).toMatch(/^\d+$/);
  });

  it("nenhum workflow fixa a versão à mão", () => {
    const fixados: string[] = [];
    for (const f of ficheiros) {
      for (const linha of ler(f).split("\n")) {
        if (/^\s*node-version:\s*\S/.test(linha)) fixados.push(`${f}: ${linha.trim()}`);
      }
    }
    expect(fixados, "usar node-version-file: .nvmrc").toEqual([]);
  });

  it("quem instala Node lê o ficheiro", () => {
    for (const f of ficheiros) {
      const fonte = ler(f);
      if (!fonte.includes("actions/setup-node@")) continue;
      expect(fonte, `${f} instala Node sem ler o .nvmrc`).toMatch(/node-version-file:\s*\.nvmrc/);
    }
  });
});

describe("RC-CI-005 · runs obsoletos são cancelados", () => {
  it("todos os workflows têm grupo de concorrência", () => {
    for (const f of ficheiros) {
      const fonte = ler(f);
      expect(fonte, `${f} sem concurrency`).toMatch(/^concurrency:/m);
      expect(fonte, `${f} sem group`).toMatch(/group:\s*\$\{\{/);
    }
  });

  it("em main nada é cancelado — cada commit fica com o seu resultado", () => {
    for (const f of ficheiros) {
      const fonte = ler(f);
      const m = fonte.match(/cancel-in-progress:\s*(.+)/);
      expect(m, `${f} sem cancel-in-progress`).not.toBeNull();
      expect(m![1], `${f} cancelaria runs de main`).toMatch(/refs\/heads\/main/);
    }
  });
});
