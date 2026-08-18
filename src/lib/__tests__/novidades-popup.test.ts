// As duas regras do popup "Novidades & Atualizações", fixadas em código.
//
// Estas verificações existem porque as duas regras são fáceis de partir sem
// que nada pareça errado: o popup continua a abrir, continua bonito, e a
// única diferença é que passa a custar dez vezes mais — ou a aparecer em cada
// refresh, que foi o que já aconteceu uma vez.
//
//  · REGRA 10 (imutável) — quando aparece: primeira visita de sempre, ou
//    versão nova. Nunca a cada refresh.
//  · REGRA 11 (inegociável) — o que carrega ao entrar: só o mês atual. Os
//    meses anteriores são grupos fechados e só carregam ao clique.
//
// Ver CLAUDE.md, regras 10 e 11.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");
const PUBLICO = join(SRC, "..", "public", "novidades");

const MODAL = readFileSync(join(SRC, "components", "ui", "NovidadesModal.tsx"), "utf8");
const LOADER = readFileSync(join(SRC, "lib", "novidades.ts"), "utf8");
const indice = JSON.parse(readFileSync(join(PUBLICO, "indice.json"), "utf8"));

// O bloco que DECIDE se o popup quer abrir: efeito com `[]`, só localStorage.
const DECISAO = MODAL.slice(
  MODAL.indexOf("localStorage.getItem(VERSAO_STORAGE_KEY)"),
  MODAL.indexOf("}, []);"),
);
// O bloco que MARCA a versão como vista quando o popup é mostrado.
const MARCA = MODAL.slice(MODAL.indexOf("if (!aberto) return;"), MODAL.indexOf("}, [aberto]);"));

describe("Regra 10 · quando o popup aparece (IMUTÁVEL)", () => {
  it("decide pela versão vista, sem depender de nada que possa falhar", () => {
    expect(DECISAO).toMatch(/localStorage\.getItem\(VERSAO_STORAGE_KEY\) !== APP_VERSION/);
    expect(DECISAO).toMatch(/setAberto\(true\)/);
    // Se um dia alguém lhe meter um `await`/`then`, uma falha de rede passa a
    // poder engolir o popup de uma versão inteira.
    expect(DECISAO).not.toMatch(/await|\.then\(|carregar/);
  });

  it("marca a versão no INSTANTE em que o popup é mostrado", () => {
    // ┌───────────────────────────────────────────────────────────────────┐
    // │ A REGRA NÃO MUDOU — MUDOU O QUE «MOSTRADO» SIGNIFICA               │
    // │                                                                   │
    // │ A marca era escrita no bloco da DECISÃO. Enquanto decidir e        │
    // │ mostrar foram a mesma coisa, chegava; deixaram de ser quando o     │
    // │ coordenador de overlays passou a poder adiar este popup para       │
    // │ depois do consentimento (P0-05 da auditoria do cabeçalho).         │
    // │                                                                   │
    // │ Antes disso, a auditoria encontrou o caso mau: na primeira visita  │
    // │ o popup montava POR CIMA do diálogo de cookies, com o foco preso   │
    // │ em baixo — a pessoa nunca o leu e a versão ficava marcada na       │
    // │ mesma. Marcar quando é MOSTRADO é a mesma regra, aplicada ao       │
    // │ instante certo, e é mais estrita do que era.                       │
    // │                                                                   │
    // │ O que continua exactamente igual: a marca não espera pelo fecho.   │
    // │ Atualizar a página com o popup aberto não o faz reaparecer.        │
    // └───────────────────────────────────────────────────────────────────┘
    expect(MARCA, "falta o efeito que marca a versão ao mostrar").toBeTruthy();
    expect(MARCA).toMatch(/localStorage\.setItem\(VERSAO_STORAGE_KEY, APP_VERSION\)/);
    // Depende de `aberto` — a permissão do coordenador — e de mais nada.
    expect(MODAL).toMatch(/\}, \[aberto\]\);/);
  });

  it("o fecho volta a marcar, como rede de segurança", () => {
    expect(MODAL.slice(MODAL.indexOf("function fechar()"))).toMatch(
      /localStorage\.setItem\(VERSAO_STORAGE_KEY, APP_VERSION\)/,
    );
  });

  it("não abre por cima de outro modal — pede vaga ao coordenador", () => {
    // A outra metade da mesma garantia: um popup que não pode ser lido não
    // se pode dar por visto.
    expect(MODAL).toMatch(/useOverlay\("novidades",\s*querAbrir,\s*\{\s*modal:\s*true,\s*iniciadoPeloUtilizador:\s*false\s*\}\)/);
  });
});

describe("Regra 11 · o que carrega ao entrar (INEGOCIÁVEL)", () => {
  it("o índice traz o mês atual e NÃO traz as entradas dos anteriores", () => {
    expect(indice.mesAtual).toBeTruthy();
    expect(indice.mesAtual.entradas.length).toBeGreaterThan(0);
    expect(Array.isArray(indice.anteriores)).toBe(true);

    for (const mes of indice.anteriores) {
      // Só nome, chave e contagem. Nem entradas, nem títulos, nem corpos —
      // é isto que torna a regra impossível de contornar por acidente.
      expect(Object.keys(mes).sort()).toEqual(["chave", "n", "rotulo"]);
      expect(mes.n).toBeGreaterThan(0);
    }
  });

  it("as entradas do mês atual vêm sem corpo (só o destaque o traz)", () => {
    for (const e of indice.mesAtual.entradas) {
      expect(Object.keys(e).sort()).toEqual(["dia", "n", "titulo", "version"]);
    }
    // A entrada nova abre expandida, por isso o corpo dela viaja no índice —
    // senão a primeira pintura esperava por um segundo pedido.
    expect(indice.destaque.length).toBeGreaterThan(0);
    expect(indice.mesAtual.entradas[0].version).toBe(indice.appVersion);
    expect(indice.destaque).toHaveLength(indice.mesAtual.entradas[0].n);
  });

  it("há um ficheiro por mês, e as contagens batem certo", () => {
    const chaves = [indice.mesAtual.chave, ...indice.anteriores.map((m: { chave: string }) => m.chave)];
    const noDisco = readdirSync(join(PUBLICO, "meses")).sort();
    expect(noDisco).toEqual(chaves.map((c) => `${c}.json`).sort());

    let total = 0;
    for (const chave of chaves) {
      const mes = JSON.parse(readFileSync(join(PUBLICO, "meses", `${chave}.json`), "utf8"));
      expect(mes.chave).toBe(chave);
      expect(mes.entradas.length).toBeGreaterThan(0);
      for (const e of mes.entradas) expect(e.itens).toHaveLength(e.n);
      total += mes.entradas.length;
    }
    expect(total).toBe(indice.totalVersoes);

    // E a contagem anunciada por um grupo fechado é a real — é o que a pessoa
    // vê antes de decidir se vale a pena carregá-lo.
    for (const m of indice.anteriores) {
      const mes = JSON.parse(readFileSync(join(PUBLICO, "meses", `${m.chave}.json`), "utf8"));
      expect(mes.entradas).toHaveLength(m.n);
    }
  });

  it("o índice é pequeno — é o custo de ENTRAR no popup", () => {
    const kb = Buffer.byteLength(JSON.stringify(indice)) / 1024;

    // O que interessa medir é a RAZÃO entre entrar e carregar tudo, não um
    // número absoluto de KB. Um teto fixo envelhece sozinho: o índice traz o
    // mês corrente inteiro, por construção, e um mês com setenta versões pesa
    // legitimamente mais do que um mês com cinco — sem que nada tenha
    // regredido. (Este teste chegou a falhar por isso, com o índice a 13 KB e
    // a regra cumprida à risca.)
    //
    // A regressão que ele existe para apanhar — alguém voltar a enfiar a
    // história toda no índice — está travada estruturalmente pelo teste
    // «o índice traz o mês atual e NÃO traz as entradas dos anteriores»,
    // que exige que cada mês fechado tenha exatamente chave, n e rótulo.
    // Aqui garante-se o efeito: entrar tem de custar uma fração do total.
    const totalKb =
      readdirSync(join(PUBLICO, "meses"))
        .map((f) => Buffer.byteLength(readFileSync(join(PUBLICO, "meses", f), "utf8")))
        .reduce((a, b) => a + b, 0) / 1024;

    expect(
      kb,
      `indice.json tem ${kb.toFixed(1)} KB, ${((kb / totalKb) * 100).toFixed(0)}% do histórico (${totalKb.toFixed(0)} KB)`,
    ).toBeLessThan(totalKb * 0.25);

    // E um teto absoluto, generoso, contra o índice crescer sem limite mesmo
    // que o histórico cresça com ele.
    expect(kb, `indice.json tem ${kb.toFixed(1)} KB`).toBeLessThan(40);
  });

  it("um mês só é pedido a pedido — nunca em lote nem à entrada", () => {
    // `carregarMes` recebe UMA chave. Não existe (nem pode passar a existir
    // sem partir este teste) um caminho que traga vários meses de uma vez.
    expect(LOADER).toMatch(/export function carregarMes\(chave: string\)/);
    expect(LOADER).toMatch(/\/novidades\/meses\/\$\{chave\}\.json/);
    expect(LOADER).not.toMatch(/corpo\.json/);

    // No modal, o único caminho de entrada de dados além do índice é
    // `pedirMes`, e é sempre disparado por uma ação: clique no grupo do mês,
    // ou intenção de abrir uma entrada do mês atual.
    expect(MODAL).toMatch(/const pedirMes = useCallback\(\(chave: string\)/);
    const efeitoIndice = MODAL.slice(MODAL.indexOf("if (!aberto || indice) return;"), MODAL.indexOf("}, [aberto, indice]);"));
    expect(efeitoIndice).not.toMatch(/pedirMes|carregarMes/);
  });

  it("o changelog não é importado como módulo pelo cliente", () => {
    // Era um chunk de 173 KB (58,6 comprimidos) a descarregar, parsear e
    // executar antes de mostrar uma linha.
    expect(MODAL).not.toMatch(/@\/lib\/changelog/);
    expect(LOADER).not.toMatch(/@\/lib\/changelog/);
    expect(existsSync(join(PUBLICO, "indice.json"))).toBe(true);
  });
});
