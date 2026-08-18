// ═══════════════════════════════════════════════════════════════════════
//  NAVEGAÇÃO DO SIMULADOR DE PREÇO — os defeitos que só aparecem a usar
//  ---------------------------------------------------------------------
//  Três defeitos reportados por quem usou a ferramenta no telemóvel, todos
//  invisíveis para a suíte porque a matemática estava certa e o que estava
//  partido era a ligação ao DOM:
//
//   ① «Ao clicar em Mudar não acontece nada.»
//      `setCenario(null)` reentrava no efeito de retoma — que estava preso
//      a `[cenario]` sem guarda — e este relia do cofre o contexto acabado
//      de gravar, repondo tudo no mesmo sítio. O botão funcionava; o efeito
//      desfazia-o no mesmo tick.
//
//   ② «Seleciono o tipo, não consigo voltar.»
//      O cenário vivia só em estado React. O «voltar» do telemóvel (botão
//      ou gesto) saía da ferramenta em vez de recuar um passo.
//
//   ③ «O preço está lá em baixo.»
//      O slider nascia depois de TODOS os campos — a 3 415 px do topo em
//      mobile, quatro ecrãs abaixo do número que serve para afinar.
//
//  Não há jsdom nem Testing Library nesta suíte (e o projeto não aceita
//  dependências novas sem motivo), por isso prende-se o que se consegue
//  prender sem browser: a FONTE não pode voltar a perder estas garantias.
//  É o mesmo método de `verificacao-irs.test.ts`, e pela mesma razão.
//
//  O que isto NÃO prova: que o clique funciona depois de hidratar. Isso foi
//  verificado em browser (Chromium, 390 px) antes de entregar — e é o
//  género de verificação que continua a ter de ser feita à mão.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");
const SIMULADOR = readFileSync(join(SRC, "components", "precos", "SimuladorPreco.tsx"), "utf8");
const SLIDER = readFileSync(join(SRC, "components", "precos", "EQueSe.tsx"), "utf8");

/**
 * O corpo do efeito de retoma, isolado do resto do ficheiro.
 *
 * Procura a CHAMADA (`lerContextoPreco<…>(…)`) e não o nome solto, que
 * também aparece na linha do `import` — apanhar essa devolvia uma fatia
 * sem efeito nenhum lá dentro, e o teste passava a medir vazio.
 */
function efeitoDeRetoma(fonte: string): string {
  const i = fonte.search(/lerContextoPreco\s*[<(]/);
  expect(i, "o efeito de retoma desapareceu").toBeGreaterThan(-1);
  const inicio = fonte.lastIndexOf("useEffect(", i);
  expect(inicio, "a chamada de retoma deixou de estar dentro de um efeito").toBeGreaterThan(-1);
  return fonte.slice(inicio, i + 400);
}

describe("① «Mudar» tem mesmo de mudar", () => {
  it("a retoma corre UMA vez e não reage a ficar sem cenário", () => {
    const efeito = efeitoDeRetoma(SIMULADOR);
    // A guarda pode chamar-se outra coisa; o que não pode é não existir.
    expect(
      /if\s*\(\s*\w+\.current\s*\)\s*return/.test(efeito),
      "o efeito de retoma voltou a correr sem guarda — ao sair de um cenário " +
        "vai reler o cofre e repor o que a pessoa acabou de abandonar",
    ).toBe(true);
  });

  it("abandonar um cenário limpa o cofre", () => {
    // Sem isto, «Mudar» devolvia ao seletor mas a recarga seguinte
    // ressuscitava o cenário abandonado por baixo de quem lá estava.
    expect(
      SIMULADOR.includes("limparContextoPreco"),
      "sair de um cenário tem de limpar o cofre, senão ele volta ao recarregar",
    ).toBe(true);
  });
});

describe("② o «voltar» do telemóvel recua dentro da ferramenta", () => {
  it("escolher um cenário escreve-o na URL", () => {
    expect(
      /searchParams\.set\(\s*["']c["']/.test(SIMULADOR),
      "o cenário tem de ir para a URL — é o que dá um passo ao histórico",
    ).toBe(true);
    expect(SIMULADOR).toMatch(/history\.pushState/);
  });

  it("e o browser a recuar é ouvido", () => {
    expect(
      SIMULADOR.includes('"popstate"'),
      "sem ouvir `popstate`, recuar muda a URL e deixa o ecrã no sítio errado",
    ).toBe(true);
  });
});

describe("④ personaliza-se ANTES de ver o número", () => {
  it("o essencial vem antes do resultado, e o avançado depois", () => {
    const iEssencial = SIMULADOR.indexOf('parte="essencial"');
    const iResultado = SIMULADOR.indexOf("<ResultadoPreco");
    const iAvancado = SIMULADOR.indexOf('parte="avancado"');
    expect(iEssencial, "os campos essenciais desapareceram").toBeGreaterThan(-1);
    expect(iAvancado, "os campos avançados desapareceram").toBeGreaterThan(-1);
    expect(
      iEssencial < iResultado && iResultado < iAvancado,
      "a ordem tem de ser essencial → resultado → avançado. O resultado já esteve " +
        "à frente de tudo, e anunciava «quanto deves cobrar» sobre campos que " +
        "ninguém tinha preenchido",
    ).toBe(true);
  });

  it("o resultado sabe distinguir um exemplo de uma recomendação", () => {
    // Sem isto, escolher «um produto digital» e mais nada anunciava
    // «QUANTO DEVES COBRAR 1,09 €» — um número saído de um custo por omissão
    // de 0 €, uma margem de 70% e um volume de 20 que ninguém escolheu.
    expect(SIMULADOR).toMatch(/exemplo=\{!tocado\}/);
    expect(
      /setTocado\(true\)/.test(SIMULADOR),
      "nada marca o contexto como personalizado — o aviso de exemplo nunca sai",
    ).toBe(true);
  });
});

describe("③ o preço fica onde se lhe mexe", () => {
  it("o slider é IRMÃO do resultado, dentro da mesma coluna", () => {
    // Proximidade em caracteres não chega — no código partido o slider
    // também estava «perto» no ficheiro e nascia quatro ecrãs abaixo. O que
    // decide a posição em mobile é estar na MESMA caixa que o resultado.
    const iResultado = SIMULADOR.indexOf("<ResultadoPreco");
    expect(iResultado, "o resultado desapareceu").toBeGreaterThan(-1);

    const fimDaColuna = SIMULADOR.indexOf("</div>", iResultado);
    const coluna = SIMULADOR.slice(iResultado, fimDaColuna);

    expect(
      coluna.includes("<SliderPreco"),
      "o slider saiu da coluna do resultado — em mobile isso empurra-o para " +
        "depois de todos os campos, que foi exactamente o defeito reportado",
    ).toBe(true);
  });
});

describe("o slider parado mostra o resultado, não uma re-derivação dele", () => {
  it("só recalcula quando a pessoa lhe mexe", () => {
    // Resolver outra vez a partir do PVP já arredondado devolvia 338,15 €
    // onde o solver tinha 338,14 €, e a mesma página exibia dois preços sem
    // IVA diferentes para o mesmo preço. O invariante manda arredondar
    // líquido, IVA e PVP em conjunto.
    expect(
      /preco === null\s*\?\s*resultado/.test(SLIDER),
      "no valor recomendado o slider tem de mostrar `resultado`, senão " +
        "reintroduz o arredondamento e diverge do cabeçalho ao cêntimo",
    ).toBe(true);
  });
});
