// As duas regras de «Novidades & Atualizações», fixadas em código.
//
// Estas verificações existem porque as duas regras são fáceis de partir sem
// que nada pareça errado: o painel continua a abrir, continua bonito, e a
// única diferença é que passa a custar dez vezes mais — ou a aparecer sozinho
// outra vez, que foi o que já aconteceu duas vezes.
//
//  · REGRA 10 — é PEDIDO, nunca um popup. Não abre sozinho: nem na primeira
//    visita, nem quando há versão nova, nem nunca. A única porta é o botão que
//    vive ao lado do seletor de tema.
//  · REGRA 11 (inegociável) — o que carrega ao entrar: só o mês atual. Os
//    meses anteriores são grupos fechados e só carregam ao clique.
//
// Ver CLAUDE.md, regras 10 e 11.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");
const PUBLICO = join(SRC, "..", "public", "novidades");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

const MODAL = ler("components", "ui", "NovidadesModal.tsx");
const LOADER = ler("lib", "novidades.ts");
const LOADERS = ler("components", "ui", "IntentOverlays.tsx");
const PORTA = ler("components", "novidades", "abrir.ts");
const BOTAO = ler("components", "novidades", "BotaoNovidades.tsx");
const PONTO = ler("hooks", "useNovidadesPorVer.ts");
const indice = JSON.parse(readFileSync(join(PUBLICO, "indice.json"), "utf8"));

// O bloco que MARCA a versão como vista quando o painel é mostrado.
const MARCA = MODAL.slice(MODAL.indexOf("if (!aberto) return;"), MODAL.indexOf("}, [aberto]);"));

describe("Regra 10 · o painel é PEDIDO, nunca um popup", () => {
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ A REGRA MUDOU, E MUDOU POR DECISÃO DO DONO DO PROJETO              │
  // │                                                                   │
  // │ A anterior dizia «só na primeira visita e quando há versão nova» — │
  // │ e era cumprida à risca. O que ela não resolvia era o custo de      │
  // │ existir de todo: um diálogo modal, sobre outro assunto, por cima   │
  // │ de quem tinha vindo calcular um recibo, com o teclado preso lá     │
  // │ dentro até o fechar. Uma vez por versão continua a ser uma vez a   │
  // │ mais quando ninguém o pediu.                                       │
  // │                                                                   │
  // │ Agora a informação está a um toque, ao lado do tema, com um ponto  │
  // │ quando há versão por ver. Estes testes garantem que o caminho de   │
  // │ volta — «só desta vez abrimos sozinhos» — não existe no código.    │
  // └───────────────────────────────────────────────────────────────────┘

  it("nada no painel lê a versão guardada para decidir abrir", () => {
    // A garantia é estrutural: sem acesso à chave, não há como comparar
    // versões — e sem comparar versões não há popup automático possível.
    expect(MODAL).not.toMatch(/VERSAO_STORAGE_KEY/);
    expect(MODAL).not.toMatch(/localStorage\.getItem/);
  });

  it("nem o loader que o traz do outro lado da fronteira dinâmica", () => {
    // Era aqui que vivia o `requestIdleCallback` que o montava sozinho.
    expect(LOADERS).not.toMatch(/VERSAO_STORAGE_KEY/);
    expect(LOADERS).not.toMatch(/requestIdleCallback/);
    expect(LOADERS).toContain("EVENTO_ABRIR_NOVIDADES");
    expect(LOADERS).toContain("<NovidadesModal abrirInicialmente />");
  });

  it("a única porta de entrada é o evento, e ninguém o dispara sozinho", () => {
    expect(MODAL).toMatch(/window\.addEventListener\(EVENTO_ABRIR_NOVIDADES/);
    // `abrirNovidades` é a única coisa no módulo que dispara o evento, e é uma
    // função exportada — não corre em nenhum efeito nem temporizador.
    const disparos = PORTA.match(/dispatchEvent\(new Event\(EVENTO_ABRIR_NOVIDADES\)\)/g) ?? [];
    expect(disparos).toHaveLength(1);
    expect(PORTA).not.toMatch(/setTimeout|requestIdleCallback|addEventListener/);
  });

  it("o botão vive ao lado do seletor de tema — no telemóvel e no computador", () => {
    // A folha da navegação é UM componente com duas geometrias: garantir aqui
    // é garantir nos dois ecrãs. Ver `navegacao/MenuCompleto.tsx`.
    const folha = ler("components", "navegacao", "MenuCompleto.tsx");
    expect(folha).toMatch(/<BotaoNovidades aoAbrir=\{aoFechar\} \/>\s*\n\s*<ThemeToggle \/>/);

    // E no menu de conta do cabeçalho de secretária, que é a outra superfície
    // onde o tema vive.
    const conta = ler("components", "header", "MenuConta.tsx");
    expect(conta).toContain("abrirNovidades()");
    expect(conta).toContain("<ThemeToggle />");
  });

  it("a folha fecha-se antes de pedir — nunca dois `aria-modal` no ecrã", () => {
    // O painel é modal e o coordenador só deixa um. Sem `aoAbrir`, o pedido
    // era recusado em silêncio e o botão não fazia nada.
    expect(BOTAO).toContain("aoAbrir?.()");
    expect(MODAL).toMatch(/iniciadoPeloUtilizador:\s*true/);
    // E quem perde a vaga arruma-se, em vez de reaparecer sozinho mais tarde.
    expect(MODAL).toMatch(/useOverlay\(\s*"novidades",[\s\S]*?fechar,\s*\)/);
  });

  it("marca a versão no INSTANTE em que o painel é mostrado", () => {
    // Continua a ser a mesma garantia de sempre, agora aplicada ao ponto do
    // botão: atualizar a página com o painel aberto não o volta a acender.
    expect(MARCA, "falta o efeito que marca a versão ao mostrar").toBeTruthy();
    expect(MARCA).toContain("marcarNovidadesVistas()");
    expect(MODAL).toMatch(/\}, \[aberto\]\);/);
  });

  it("o fecho volta a marcar, como rede de segurança", () => {
    expect(MODAL.slice(MODAL.indexOf("const fechar = useCallback"))).toContain(
      "marcarNovidadesVistas()",
    );
  });

  it("quem lê a versão guardada só acende um ponto — não abre nada", () => {
    expect(PONTO).toContain("haNovidadesPorVer");
    expect(PONTO).not.toMatch(/EVENTO_ABRIR_NOVIDADES|abrirNovidades/);
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

  it("o índice é pequeno — é o custo de ENTRAR no painel", () => {
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

    // No painel, o único caminho de entrada de dados além do índice é
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
