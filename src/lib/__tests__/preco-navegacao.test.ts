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
const ATOMOS = readFileSync(join(SRC, "components", "precos", "atomos.tsx"), "utf8");
const LISTA = readFileSync(join(SRC, "components", "precos", "ListaCustos.tsx"), "utf8");
const ANUNCIO = readFileSync(join(SRC, "components", "precos", "AnuncioResultado.tsx"), "utf8");

/**
 * A fonte sem comentários.
 *
 * Estes testes leem código como texto, e neste projeto os comentários
 * citam com frequência o defeito que a linha corrigiu — «fazia
 * `replace(/[^\d,.]/g, "")` à mão». Uma asserção negativa que não
 * distinga o código da sua própria autópsia reprova a correção por ela
 * estar documentada.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * O corpo do efeito de retoma, isolado do resto do ficheiro.
 *
 * Procura a CHAMADA (`lerEnvelopePreco<…>(…)`) e não o nome solto, que
 * também aparece na linha do `import` — apanhar essa devolvia uma fatia
 * sem efeito nenhum lá dentro, e o teste passava a medir vazio.
 */
function efeitoDeRetoma(fonte: string): string {
  const i = fonte.search(/lerEnvelopePreco\s*[<(]/);
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
    const iEssencial = SIMULADOR.indexOf("<CamposEssenciais");
    const iResultado = SIMULADOR.indexOf("<ResultadoPreco");
    const iAvancado = SIMULADOR.indexOf("<Afinar");
    expect(iEssencial, "os campos essenciais desapareceram").toBeGreaterThan(-1);
    expect(iAvancado, "os campos avançados desapareceram").toBeGreaterThan(-1);
    expect(
      iEssencial < iResultado && iResultado < iAvancado,
      "a ordem tem de ser essencial → resultado → afinar. O resultado já esteve " +
        "à frente de tudo, e anunciava «quanto deves cobrar» sobre campos que " +
        "ninguém tinha preenchido",
    ).toBe(true);
  });

  it("o resultado sabe distinguir um exemplo de uma recomendação", () => {
    // Sem isto, escolher «um produto digital» e mais nada anunciava
    // «QUANTO DEVES COBRAR 1,09 €» — um número saído de um custo por omissão
    // de 0 €, uma margem de 70% e um volume de 20 que ninguém escolheu.
    expect(SIMULADOR).toMatch(/estado=\{estadoPreenchimento\}/);
    expect(
      /avaliarPreenchimento\(/.test(SIMULADOR),
      "nada avalia o preenchimento — o aviso de exemplo nunca sai, ou nunca entra",
    ).toBe(true);
  });

  it("e a distinção não é um booleano que uma tecla vira", () => {
    // O `tocado` era um booleano: escrever um dígito no volume promovia um
    // exemplo a «QUANTO DEVES COBRAR», por cima de vinte e cinco
    // pressupostos por confirmar. Agora regista-se QUAL campo foi
    // respondido, e a confiança sai da lista do que falta.
    expect(
      /setTocado\s*\(/.test(SIMULADOR),
      "voltou o booleano `tocado` — uma tecla em qualquer campo volta a " +
        "promover um exemplo a recomendação",
    ).toBe(false);
    expect(SIMULADOR).toMatch(/setRespondidos/);
    expect(
      /const atualizar = \(campo: string,/.test(SIMULADOR),
      "`atualizar` deixou de exigir o id do campo — passa a ser possível " +
        "mudar o contexto sem que ninguém saiba o que foi respondido",
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

describe("⑤ o `Segmentado` é o radiogroup que diz ser", () => {
  // O comentário do componente afirmava, palavra por palavra, ser «um
  // radiogroup a sério — com setas do teclado — e não uma fila de botões
  // que só parece um». Não havia `onKeyDown` nem `tabIndex` móvel: as
  // setas não faziam nada e todos os botões eram tabuláveis. O axe não o
  // apanha (a estrutura `radiogroup`/`radio` está formalmente correta), e
  // por isso passou o «zero violações» estando partido para teclado.
  it("trata as setas do teclado", () => {
    const i = ATOMOS.indexOf("export function Segmentado");
    expect(i, "o Segmentado desapareceu").toBeGreaterThan(-1);
    const bloco = ATOMOS.slice(i, ATOMOS.indexOf("export function Seletor"));

    expect(bloco).toMatch(/onKeyDown/);
    for (const tecla of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"]) {
      expect(bloco.includes(`"${tecla}"`), `o \`${tecla}\` deixou de ser tratado`).toBe(true);
    }
  });

  it("e tem um só ponto de tabulação", () => {
    const i = ATOMOS.indexOf("export function Segmentado");
    const bloco = ATOMOS.slice(i, ATOMOS.indexOf("export function Seletor"));
    expect(
      /tabIndex=\{[^}]*\?\s*0\s*:\s*-1\s*\}/.test(bloco),
      "sem `tabIndex` móvel o grupo tem tantas paragens de tabulação como opções, " +
        "que é precisamente o que o padrão WAI-ARIA de radiogroup existe para evitar",
    ).toBe(true);
  });
});

describe("⑥ a ajuda dos campos está ligada ao campo", () => {
  it("os campos numéricos passam `aria-describedby`", () => {
    // A ajuda vivia só dentro do `InfoTip`, sem ligação nenhuma ao input:
    // para quem usa leitor de ecrã, a descrição não existia.
    for (const campo of ["CampoEuros", "CampoPercentagem", "CampoNumero", "Seletor"]) {
      const i = ATOMOS.indexOf(`export function ${campo}`);
      expect(i, `${campo} desapareceu`).toBeGreaterThan(-1);
      const bloco = ATOMOS.slice(i, i + 2200);
      expect(bloco.includes("aria-describedby"), `${campo} sem \`aria-describedby\``).toBe(true);
    }
  });
});

describe("⑦ os números todos passam pelo mesmo parser", () => {
  it("a lista de custos usa `LocalizedNumberInput`", () => {
    // Fazia parsing à mão. «1.234,50» — como o Excel português escreve mil
    // duzentos e trinta e quatro e meio — virava 1,23450.
    expect(LISTA).toMatch(/LocalizedNumberInput/);
    expect(
      /replace\(\s*\/\[\^\\d,\.\]\/g/.test(semComentarios(LISTA)),
      "voltou o parser à mão na lista de custos",
    ).toBe(false);
  });
});

describe("⑧ os avisos graves ficam colados ao número", () => {
  it("os `perigo` e `atencao` renderizam antes dos campos avançados", () => {
    const iGraves = SIMULADOR.indexOf("apenas={GRAVES}");
    const iAvancado = SIMULADOR.indexOf("<Afinar");
    expect(iGraves, "os avisos graves deixaram de ser separados dos informativos").toBeGreaterThan(-1);
    expect(
      iGraves < iAvancado,
      "um aviso `perigo` («cada venda tira-te dinheiro») voltou a nascer depois de " +
        "todos os campos avançados — quatro ecrãs abaixo do preço a que se refere",
    ).toBe(true);
  });
});

describe("⑨ o número não muda em silêncio", () => {
  it("há uma região viva a anunciar o resultado", () => {
    expect(SIMULADOR).toMatch(/<AnuncioResultado/);
    expect(ANUNCIO).toMatch(/role="status"/);
    expect(ANUNCIO).toMatch(/aria-live="polite"/);
  });

  it("e o anúncio é adiado, para não ler um preço por cada tecla", () => {
    expect(
      /setTimeout/.test(ANUNCIO),
      "sem debounce, escrever «1250» anuncia quatro preços, três dos quais nunca existiram",
    ).toBe(true);
  });
});

describe("⑩ a ressalva de exemplo viaja com os números", () => {
  it("o slider e a tabela de cenários também a recebem", () => {
    expect(SIMULADOR).toMatch(/<SliderPreco[^>]*estado=\{estadoPreenchimento\}/);
    expect(SIMULADOR).toMatch(/<Cenarios[^>]*estado=\{estadoPreenchimento\}/);
    expect(SLIDER).toMatch(/function Selo\(/);
  });
});

describe("⑪ os pressupostos são declarados", () => {
  it("o bloco «estamos a assumir» existe e é alimentado pelo preenchimento", () => {
    // `perguntas.ts` promete isto desde o primeiro dia — «o resultado diz
    // sempre "estamos a assumir X" quando assume» — e a promessa nunca
    // chegou a existir no ecrã.
    expect(SIMULADOR).toMatch(/<Pressupostos preenchimento=\{preenchimento\}/);
  });

  it("e cada pressuposto leva ao campo que o resolve", () => {
    const PRESSUPOSTOS = readFileSync(join(SRC, "components", "precos", "Pressupostos.tsx"), "utf8");
    expect(PRESSUPOSTOS).toMatch(/getElementById/);
    expect(
      /focus\(/.test(PRESSUPOSTOS),
      "sem foco, a lista serve quem vê o scroll e mais ninguém",
    ).toBe(true);
  });
});

describe("⑫ retomar do cofre não perde nem inventa trabalho", () => {
  it("um cofre da versão anterior continua a ser lido", () => {
    const STORE = readFileSync(join(SRC, "lib", "store", "preco.ts"), "utf8");
    expect(
      STORE.includes("lerEnvelopePreco"),
      "o envelope v2 desapareceu",
    ).toBe(true);
    expect(
      /env\.versao === versaoContexto/.test(STORE),
      "deixou de aceitar um contexto v1 solto — quem tinha meia hora de custos " +
        "introduzidos abre a ferramenta e encontra-a vazia, sem explicação",
    ).toBe(true);
  });
});

describe("⑬ o resultado deixou de ser um cartão monolítico", () => {
  it("as secções são irmãs, não oito coisas dentro da mesma caixa", () => {
    // Tesouraria e sociedade viviam DENTRO do cartão de resultado, que
    // tinha ~830 px e empilhava número, faixa, decomposição, métricas,
    // tesouraria, sociedade, veredicto e preços psicológicos sem
    // hierarquia nenhuma.
    for (const secao of ["<Caixa", "<Tesouraria", "<Sociedade", "<DescontoResultado"]) {
      expect(SIMULADOR.includes(secao), `${secao} deixou de ser uma secção irmã`).toBe(true);
    }
  });

  it("o desconto tem saída, e não só entrada", () => {
    // `motores/desconto.ts` calculava o desconto máximo, se destrói a
    // rentabilidade e as unidades extra para compensar — e nada disso
    // chegava ao ecrã. O bloco de desconto era um formulário que aceitava
    // um número e não respondia nada.
    //
    // A asserção olha para a INTENÇÃO — o desconto é renderizado e é
    // `resultado.desconto` que o comanda — e não para a forma exata do
    // JSX. A forma mudou quando as secções passaram a atravessar as
    // camadas de revelação (`lib/pricing/nivel.ts`): o cartão continua a
    // aparecer, agora dentro de um `SeccaoRevelavel`. Fixar a forma
    // literal fazia este teste falhar por uma mudança que não mexe no que
    // ele existe para proteger.
    expect(SIMULADOR).toMatch(/resultado\.desconto\s*$|resultado\.desconto\s*\?/m);
    expect(SIMULADOR).toMatch(/<DescontoResultado\s+desconto=\{resultado\.desconto\}/);
    const DESCONTO = readFileSync(join(SRC, "components", "precos", "DescontoResultado.tsx"), "utf8");
    expect(DESCONTO).toMatch(/descontoMaximo/);
    expect(DESCONTO).toMatch(/unidadesExtraParaCompensar/);
  });

  it("a caixa mostra o percurso do dinheiro, que era calculado e nunca visto", () => {
    const CAIXA = readFileSync(join(SRC, "components", "precos", "Caixa.tsx"), "utf8");
    expect(CAIXA).toMatch(/cobradoAoCliente/);
    expect(CAIXA).toMatch(/entraNaConta/);
    expect(CAIXA).toMatch(/saiDepois/);
  });

  it("«não há preço possível» deixou de ser uma parede", () => {
    const SEM = readFileSync(join(SRC, "components", "precos", "SemPreco.tsx"), "utf8");
    expect(SEM).toMatch(/diagnostico\.consumidores/);
    expect(SEM).toMatch(/margemMaxima/);
    expect(
      /aoAceitarMaximo/.test(SEM),
      "sem a saída para a margem máxima, o ecrã diz que o problema existe e " +
        "deixa a pessoa a adivinhar o número que o resolve",
    ).toBe(true);
  });

  it("há um resumo fixo, e é o único elemento pegajoso da ferramenta", () => {
    expect(SIMULADOR).toMatch(/<ResumoPreco/);
    const RESUMO = readFileSync(join(SRC, "components", "precos", "ResumoPreco.tsx"), "utf8");
    expect(RESUMO).toMatch(/sticky top-14/);
    // O cartão de resultado NÃO pode voltar a ser pegajoso: tem ~830 px e
    // uma coluna pegajosa mais alta do que a janela fica presa com o
    // fundo cortado.
    const RESULTADO = readFileSync(join(SRC, "components", "precos", "ResultadoPreco.tsx"), "utf8");
    expect(semComentarios(RESULTADO).includes("sticky")).toBe(false);
  });

  it("em mobile a ordem do DOM continua a ser essencial → resultado → afinar", () => {
    // A grelha de duas colunas só existe a partir de `lg:`; o que manda em
    // mobile é a ordem do documento, e é ela que o leitor de ecrã segue.
    expect(SIMULADOR).toMatch(/lg:grid-cols-/);
    const iEssencial = SIMULADOR.indexOf("<CamposEssenciais");
    const iResultado = SIMULADOR.indexOf("<ResultadoPreco");
    const iAfinar = SIMULADOR.indexOf("<Afinar");
    expect(iEssencial < iResultado && iResultado < iAfinar).toBe(true);
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

// ═══════════════════════════════════════════════════════════════════════
//  ⑭ DECIDIR E MEDIR
//  ---------------------------------------------------------------------
//  A ferramenta acabava num parágrafo de isenção de responsabilidade e
//  disparava um único evento. As duas coisas são o mesmo defeito visto de
//  dois lados: não havia transição, e não havia forma de saber se alguém
//  chegava ao fim.
// ═══════════════════════════════════════════════════════════════════════

describe("⑭ a ferramenta tem um próximo passo, e mede-o", () => {
  const DECIDIR = readFileSync(join(SRC, "components", "precos", "Decidir.tsx"), "utf8");
  const CONCLUSAO = readFileSync(join(SRC, "components", "precos", "ConclusaoPreco.tsx"), "utf8");
  const MEDICAO = readFileSync(join(SRC, "components", "precos", "medicao.ts"), "utf8");

  it("a hierarquia dos CTA vem de `escolherRota`, não da página", () => {
    // Se cada página pudesse escolher os seus botões, a regra «nunca três
    // ações com o mesmo peso» duraria até à primeira semana em que a
    // receita estivesse abaixo do esperado. A ferramenta delega-a em
    // `ResultadoExplicado`, que a delega em `escolherRota`.
    expect(CONCLUSAO).toMatch(/ResultadoExplicado/);
    expect(CONCLUSAO).toMatch(/sinais=\{\{/);
    expect(SIMULADOR).toMatch(/<ConclusaoPreco/);
    expect(SIMULADOR).toMatch(/<Decidir/);
    // E o rodapé comercial NÃO pode voltar a ser desenhado à mão aqui.
    expect(semComentarios(DECIDIR).includes("escolherRota")).toBe(false);
  });

  it("e nenhuma rota comercial abre sobre um número que a pessoa não alimentou", () => {
    // `escolherRota` devolve `sem_parceiro` com confiança abaixo de
    // completa; o que este teste prende é que a confiança que lhe chega é
    // a REAL, e não um `completo` fixo.
    expect(CONCLUSAO).toMatch(/estado === "completo" \? "completo" : "estimado"/);
  });

  it("guardar, copiar e imprimir acontecem no dispositivo", () => {
    expect(DECIDIR).toMatch(/guardarPreco/);
    expect(DECIDIR).toMatch(/navigator\.clipboard/);
    expect(DECIDIR).toMatch(/window\.print/);
    // Nada de partilhar por link: encodar o contexto na URL punha custos
    // de fornecedor no histórico do browser e na área de transferência.
    expect(semComentarios(DECIDIR).includes("searchParams.set")).toBe(false);
  });

  it("os quatro eventos do percurso são disparados", () => {
    for (const evento of ["simulator_start", "simulator_step", "simulator_complete", "result_view"]) {
      expect(MEDICAO.includes(`"${evento}"`), `${evento} deixou de ser disparado`).toBe(true);
    }
    expect(MEDICAO).toMatch(/result_save/);
    expect(MEDICAO).toMatch(/result_export/);
  });

  it("`simulator_complete` só dispara com o essencial todo respondido", () => {
    // Um `complete` à primeira tecla mede intenção, não conclusão — e
    // enche a North Star de percursos que ninguém acabou.
    expect(MEDICAO).toMatch(/estado !== "completo"\) return;/);
  });

  it("e nenhum valor sai na medição", () => {
    const codigo = semComentarios(MEDICAO);
    for (const termo of ["pvp", "margem", "custo", "lucro", "faturacao"]) {
      expect(codigo.includes(termo), `«${termo}» apareceu no payload de medição`).toBe(false);
    }
  });

  it("o objetivo invertido existe — era o «Nível 4» documentado e ausente", () => {
    expect(SIMULADOR).toMatch(/<ObjetivoInvertido/);
    const OBJ = readFileSync(join(SRC, "components", "precos", "ObjetivoInvertido.tsx"), "utf8");
    expect(OBJ).toMatch(/precoParaGanhar/);
    expect(OBJ).toMatch(/unidadesParaGanhar/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  ⑮ AS SEIS CAMADAS DO RESULTADO
//  ---------------------------------------------------------------------
//  `ResultadoExplicado` é a componente que a skill de crescimento manda
//  usar, e não era usada por NENHUMA das quinze ferramentas. Uma regra que
//  nada cumpre não é uma regra: é um ficheiro.
//
//  A calculadora de preço passa a ser a primeira a cumpri-la, e a
//  cumpri-la como conclusão do resultado e não como moldura — as seis
//  camadas são uma ORDEM, não um cartão único, e envolver o cartão nela
//  desfazia o trabalho de distinguir «um exemplo» de «uma recomendação».
// ═══════════════════════════════════════════════════════════════════════

describe("⑮ as seis camadas do resultado", () => {
  const CONCLUSAO = readFileSync(join(SRC, "components", "precos", "ConclusaoPreco.tsx"), "utf8");

  it("a ferramenta usa mesmo o `ResultadoExplicado`", () => {
    expect(CONCLUSAO).toMatch(/from "@\/components\/ui\/ResultadoExplicado"/);
  });

  it("e alimenta as seis camadas, não só as fáceis", () => {
    for (const camada of ["premissas=", "formula=", "acao=", "cenarios=", "fontes=", "limites=", "sinais="]) {
      expect(CONCLUSAO.includes(camada), `a camada \`${camada}\` ficou por alimentar`).toBe(true);
    }
  });

  it("os limites são reais e condicionais, não uma frase de circunstância", () => {
    // Era a lacuna mais grave: a ferramenta dizia com precisão o que fazia
    // e nunca dizia onde parava. Um limite por dizer é uma promessa
    // implícita, e a promessa implícita de uma calculadora fiscal é
    // sempre «isto está completo».
    expect(CONCLUSAO).toMatch(/function limitesDe/);
    expect(CONCLUSAO).toMatch(/não o que o mercado aceita/);
    expect(
      /if \(c\.custos\.fixos\.length === 0\)/.test(CONCLUSAO),
      "os limites deixaram de reagir ao que a pessoa preencheu — uma lista que " +
        "não lhe diz respeito é uma lista que não se lê",
    ).toBe(true);
  });

  it("o resultado é apresentado como intervalo quando existe faixa", () => {
    // «Nunca devolver um número sem faixa»: dois decimais sozinhos são
    // falsa precisão sobre dados que a pessoa estimou de cabeça.
    expect(CONCLUSAO).toMatch(/valorMaximo=/);
  });

  it("e a componente partilhada deixou de se dizer exclusiva do servidor", () => {
    // O comentário lia-se como «não serve para ferramentas interativas»,
    // que é uma das razões por que ninguém a usava.
    const COMPONENTE = readFileSync(join(SRC, "components", "ui", "ResultadoExplicado.tsx"), "utf8");
    expect(COMPONENTE).toMatch(/MAS NÃO É EXCLUSIVA DO SERVIDOR/);
    // Continua sem `"use client"`: pô-lo arrastaria para o cliente todas
    // as páginas que a importam de um Server Component.
    expect(COMPONENTE.startsWith('"use client"')).toBe(false);
  });
});
