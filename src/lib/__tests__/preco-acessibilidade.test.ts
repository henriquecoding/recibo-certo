import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
//  ACESSIBILIDADE DA CALCULADORA DE PREÇO — as falhas que o axe não vê
//  ---------------------------------------------------------------------
//  As auditorias em navegador (`auditar-a11y-preco.mjs` para o axe,
//  `auditar-teclado-preco.mjs` para o teclado) medem o que se renderiza.
//  Estas asserções guardam as decisões que elas descobriram mas que só
//  sobrevivem se alguém as escrever:
//
//      1. desênfase por OPACIDADE parte o contraste;
//      2. um link sozinho na linha não cabe na exceção «inline» da 2.5.8;
//      3. conteúdo que abre por foco tem de fechar com Escape (1.4.13);
//      4. uma secção que muda de forma tem de apanhar o foco que desmonta.
//
//  As duas últimas foram encontradas COM O AXE A DAR ZERO. É o argumento
//  todo do §18 do prompt-mestre numa frase.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE ISTO SE VERIFICA LENDO A FONTE                                │
//  │                                                                     │
//  │ Nenhuma das três dá erro ao partir. O `/70` volta sempre que alguém  │
//  │ quiser «acalmar» uma linha secundária — foi assim que reapareceu,    │
//  │ herdado de um componente partilhado. O Escape no InfoTip não tem     │
//  │ sintoma nenhum a desenvolver com rato. E o `min-h` de um link        │
//  │ desaparece na primeira limpeza de classes que pareça inofensiva.     │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");
const ler = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

/** A fonte sem os comentários — que aqui CITAM as classes proibidas. */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const INFOTIP = ler("components", "ui", "InfoTip.tsx");
const REVELAVEL = ler("components", "precos", "SeccaoRevelavel.tsx");
const RESULTADO_EXPLICADO = ler("components", "ui", "ResultadoExplicado.tsx");
const TESOURARIA = ler("components", "precos", "Tesouraria.tsx");
const MEMORIA = ler("components", "precos", "MemoriaCalculo.tsx");

describe("preco-acessibilidade:contraste", () => {
  it("não desenfatiza texto de marca com opacidade", () => {
    // `text-brand-dark/70` sobre `bg-brand-light` mistura-se e dá 3,06:1 —
    // abaixo dos 4,5:1 da AA. Foram 12 violações medidas pelo axe, nos dois
    // temas e nas duas larguras. A hierarquia faz-se com tamanho e peso,
    // que não custam legibilidade; a cor cheia dá 5,47:1.
    const fonte = semComentarios(RESULTADO_EXPLICADO);
    expect(fonte).not.toMatch(/text-brand-dark\/[0-9]/);
    expect(fonte).not.toMatch(/text-brand-mint\/[0-9]/);
  });
});

describe("preco-acessibilidade:alvos", () => {
  // WCAG 2.2 · 2.5.8 pede 24×24. A exceção «inline» cobre links dentro de
  // uma frase — não cobre estes dois, que estão sozinhos na sua linha.
  it("o link do calendário chega aos 24 px de altura", () => {
    // Ancorado ao próprio elemento: um `min-h-[24px]` solto noutro sítio do
    // ficheiro não pode fazer esta asserção passar.
    const anchor = semComentarios(TESOURARIA).match(
      /<a\b[^>]*href="\/dashboard\/prazos"[\s\S]*?>/,
    )?.[0];
    expect(anchor).toBeDefined();
    expect(anchor).toContain("min-h-[24px]");
  });

  it("o link da fonte legal chega aos 24 px de altura", () => {
    expect(semComentarios(MEMORIA)).toContain("min-h-[24px]");
  });
});

describe("preco-acessibilidade:infotip", () => {
  it("abre por foco de teclado, não só por rato", () => {
    // Sem `onFocus` o painel é invisível para quem navega por teclado — e o
    // conteúdo dele é a explicação dos termos fiscais, não decoração.
    expect(INFOTIP).toContain("onFocus");
    expect(INFOTIP).toContain("onBlur");
  });

  it("fecha com Escape sem tirar o foco do botão (WCAG 1.4.13)", () => {
    // «Dismissible»: conteúdo que aparece por hover ou foco tem de poder
    // ser dispensado sem mexer o ponteiro nem o foco. Sem isto, quem usa
    // teclado fica com o painel a tapar o campo seguinte até sair do botão.
    const fonte = semComentarios(INFOTIP);
    expect(fonte).toMatch(/onKeyDown/);
    expect(fonte).toMatch(/"Escape"/);
    // E não pode fechar o modal onde estiver: o Escape tem de parar aqui.
    expect(fonte).toMatch(/stopPropagation/);
  });

  it("mantém a área de toque alargada por pseudo-elemento", () => {
    // (mantido junto dos outros testes do InfoTip)
    // O botão desenha-se a 16×16 de propósito — é uma marca ao lado de um
    // rótulo, não um botão. Quem lhe dá os 24×24 da 2.5.8 é o
    // `before:-inset-2.5`, que leva a área efetiva a 36×36 sem gastar uma
    // linha de altura em cada um dos ~30 campos do formulário. Trocar isto
    // por um botão maior seria pagar ~240 px de altura por nada.
    expect(INFOTIP).toContain("before:-inset-2.5");
    expect(INFOTIP).toMatch(/before:absolute|before:content-\[''\]/);
  });
});

describe("preco-acessibilidade:foco-nas-camadas", () => {
  it("o foco é reposicionado quando uma secção muda de forma", () => {
    // ⚠️ DEFEITO REAL, APANHADO PELO `auditar-teclado-preco.mjs` DEPOIS
    // DE O AXE TER DADO ZERO. Recolhida e aberta são árvores diferentes:
    // ao alternar, o elemento com o foco é desmontado e o foco cai no
    // `<body>` — quem navega por teclado é atirado para o topo do
    // documento a meio da ferramenta e tem de percorrer tudo de novo.
    //
    // Ao abrir, o foco vai para a região revelada; ao fechar, volta para
    // a linha que substituiu aquilo em que a pessoa carregou.
    const fonte = semComentarios(REVELAVEL);
    expect(fonte).toMatch(/useEffect/);
    expect(fonte).toMatch(/refRegiao|refLinha/);
    expect(fonte).toMatch(/\.focus\(\)/);
  });

  it("a região revelada pode receber foco sem entrar na ordem do Tab", () => {
    // `tabIndex={-1}`: recebe foco por programa, mas quem passa a tabular
    // não leva um passo extra por cada secção aberta.
    expect(semComentarios(REVELAVEL)).toMatch(/tabIndex=\{-1\}/);
  });

  it("a linha recolhida declara o estado e o painel que comanda", () => {
    expect(REVELAVEL).toMatch(/aria-expanded=\{false\}/);
    expect(REVELAVEL).toMatch(/aria-controls=\{idPainel\}/);
  });
});
