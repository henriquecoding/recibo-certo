import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ATOS,
  ASSENTA,
  DUR,
  ENTRADA,
  PASSO,
  SAIDA,
  VIAGEM,
  arco,
  bezier,
  dwell,
  medir,
} from "@/components/preco/coreografia";

const emDe = (ato: string, beat: string) => {
  const encontrado = ATOS.find((a) => a.id === ato)?.beats.find((b) => b.id === beat);
  if (!encontrado) throw new Error(`o beat ${ato}/${beat} deixou de existir`);
  return encontrado.em;
};

// ═══════════════════════════════════════════════════════════════════════
//  O ROTEIRO E O CÓDIGO NÃO PODEM DIVERGIR
//  ---------------------------------------------------------------------
//  `docs/design/roteiro-animacao-preco.md` diz-se a fonte de verdade da
//  coreografia. Uma fonte de verdade que ninguém verifica é uma intenção:
//  passa a estar desatualizada no primeiro ajuste de 80 ms que alguém faz
//  no código sem abrir o documento — e a partir daí mente com confiança.
//
//  Este teste lê o documento e compara-o, instante a instante, com
//  `coreografia.ts`.
// ═══════════════════════════════════════════════════════════════════════

const ROTEIRO = readFileSync(
  join(process.cwd(), "docs/design/roteiro-animacao-preco.md"),
  "utf8",
);

interface AtoDoRoteiro {
  titulo: string;
  duracao: number;
  cues: { id: string; em: number }[];
}

/** Lê as tabelas da §3 do roteiro. */
function lerRoteiro(): AtoDoRoteiro[] {
  const atos: AtoDoRoteiro[] = [];
  let atual: AtoDoRoteiro | null = null;

  for (const linha of ROTEIRO.split("\n")) {
    const cabecalho = linha.match(/^### ATO \d+ — (.+?) · ([\d\s ]+) ms\s*$/);
    if (cabecalho) {
      atual = {
        titulo: cabecalho[1].trim(),
        duracao: Number(cabecalho[2].replace(/[\s ]/g, "")),
        cues: [],
      };
      atos.push(atual);
      continue;
    }
    if (linha.startsWith("### ") || linha.startsWith("## ")) {
      if (!/^### ATO/.test(linha)) atual = null;
      continue;
    }
    if (!atual) continue;

    // | 120 | `materiais` | ... |     ← cue
    // | 820 | `⤷ aterraA` | ... |     ← consequência: não tem instante próprio
    // | — | `markup` | ... |          ← encenação sem instante
    const celula = linha.match(/^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|/);
    if (!celula) continue;
    const id = celula[2].trim();
    if (id.startsWith("⤷")) continue;
    atual.cues.push({ id, em: Number(celula[1]) });
  }
  return atos;
}

const ROTEIRO_ATOS = lerRoteiro();

describe("coreografia do preço: o roteiro é a fonte de verdade", () => {
  it("o documento descreve exatamente os atos que o código executa", () => {
    expect(ROTEIRO_ATOS).toHaveLength(ATOS.length);
    expect(ROTEIRO_ATOS.length).toBeGreaterThan(0);
  });

  it.each(ATOS.map((ato, i) => [i, ato] as const))(
    "ato %i — a duração e os cues batem com o roteiro",
    (i, ato) => {
      const doRoteiro = ROTEIRO_ATOS[i];
      expect(doRoteiro, `o roteiro não descreve o ato ${i}`).toBeDefined();
      expect(doRoteiro.duracao).toBe(ato.duracao);

      // Mesma ordem, mesmos ids, mesmos instantes. Uma comparação de
      // conjuntos deixaria passar um beat trocado de sítio, que é
      // precisamente o tipo de mudança que estraga uma coreografia.
      expect(doRoteiro.cues).toEqual(ato.beats);
    },
  );

  it("nenhum beat cai fora do seu ato", () => {
    for (const ato of ATOS) {
      for (const beat of ato.beats) {
        expect(beat.em, `${ato.id}/${beat.id}`).toBeGreaterThanOrEqual(0);
        expect(beat.em, `${ato.id}/${beat.id}`).toBeLessThan(ato.duracao);
      }
    }
  });

  it("os beats de cada ato estão por ordem crescente e sem repetições", () => {
    for (const ato of ATOS) {
      const ids = ato.beats.map((b) => b.id);
      expect(new Set(ids).size, `ids repetidos em ${ato.id}`).toBe(ids.length);
      const tempos = ato.beats.map((b) => b.em);
      expect([...tempos].sort((a, b) => a - b)).toEqual(tempos);
    }
  });

  it("os dois silêncios prometidos existem mesmo", () => {
    // Um silêncio é ausência DELIBERADA de movimento — e é o que faz o
    // evento seguinte aterrar. Se um beat novo for enfiado lá no meio, o
    // roteiro deixa de ser verdade e ninguém dá por isso a olho.
    const impostos = ATOS.find((a) => a.id === "impostos");
    const margem = impostos?.beats.find((b) => b.id === "chipMargem");
    const retencao = impostos?.beats.find((b) => b.id === "chipRetencao");
    // 260 → 900 é a margem a contar; o silêncio vai de 900 a 1280.
    expect(retencao!.em - (margem!.em + 640)).toBe(380);

    const preco = ATOS.find((a) => a.id === "preco");
    const chega = preco?.beats.find((b) => b.id === "chega");
    const conta = preco?.beats.find((b) => b.id === "contaPreco");
    expect(conta!.em - chega!.em).toBe(260);
  });

  it("o intervalo entre duas partidas diz a que grupo elas pertencem", () => {
    // ⚠️ Esta é a regra da §1.3, e é a que se estraga primeiro: são números
    // pequenos, ninguém os vê a olho, e cada um parece inofensivo sozinho.
    //
    // Mas o intervalo é informação. Três degraus, três significados:
    //   uno   (90)  · não são dois acontecimentos, é um com espessura
    //   irmao (160) · partes de uma mesma soma
    //   outro (380) · uma fronteira — o que vem a seguir é outra ideia

    // As três fichas de custo são irmãs: partes de uma soma.
    const a = emDe("base", "fichaA");
    const b = emDe("base", "fichaB");
    const c = emDe("base", "fichaC");
    expect(b - a).toBe(PASSO.irmao);
    expect(c - b).toBe(PASSO.irmao);

    // E o desfasamento tem de as deixar SOBREPOSTAS no ar, senão perde-se a
    // pista de destino comum e leem-se como três eventos sem relação. Com
    // uma viagem de `DUR.viagem`, a última parte em `c - a` e a primeira
    // chega em `DUR.viagem`: o que sobra é a janela em que estão as três.
    const sobreposicao = DUR.viagem - (c - a);
    expect(sobreposicao / DUR.viagem).toBeGreaterThanOrEqual(0.45);

    // A mesma coisa dita pela métrica de Chevalier et al. (2014). A 220 ms
    // — o valor anterior — isto dava 0,61.
    expect(dwell(PASSO.irmao, 3, c - a + DUR.viagem)).toBeCloseTo(0.5, 2);

    // A retenção e o IVA são a MESMA ideia vista duas vezes: `uno`.
    expect(emDe("impostos", "chipIVA") - emDe("impostos", "chipRetencao")).toBe(PASSO.uno);

    // E entre a margem e as retenções há uma fronteira, não um desfasamento.
    // (A margem conta 640 ms depois de sair; o silêncio começa aí.)
    expect(emDe("impostos", "chipRetencao") - (emDe("impostos", "chipMargem") + 640)).toBe(
      PASSO.outro,
    );

    // Nenhum destes três degraus pode colapsar noutro: uma escala com dois
    // valores indistinguíveis não é uma escala, é ruído com dois nomes.
    expect(PASSO.uno).toBeLessThan(PASSO.irmao);
    expect(PASSO.irmao).toBeLessThan(PASSO.outro);
  });

  it("nada aterra sobre uma peça que ainda se está a desenhar", () => {
    // O defeito que a §1.3 e o ato 4 corrigem: o marcador caía aos 1 700,
    // sobre uma régua que só fechava aos 2 000 e enquanto o preço grande
    // ainda estava a contar (até 2 120). Três afirmações ao mesmo tempo.
    const regua = emDe("preco", "regua");
    const conta = emDe("preco", "contaPreco");
    const zonas = emDe("preco", "zonas");
    const cai = emDe("preco", "marcadorCai");

    const reguaFecha = regua + DUR.desenrolar;
    const contaAcaba = conta + DUR.contaResultado;

    // As zonas são ALCANÇADAS pela régua: começam depois de ela arrancar e
    // a última acende quando ela fecha.
    expect(zonas).toBeGreaterThan(regua);
    expect(zonas + (2 * DUR.desenrolar) / 3).toBeLessThanOrEqual(reguaFecha);

    // E o marcador espera pelas duas.
    expect(cai).toBeGreaterThanOrEqual(reguaFecha);
    expect(cai).toBeGreaterThanOrEqual(contaAcaba);
  });

  it("há exatamente um momento simultâneo, e é o grupo a responder", () => {
    // `confirmaOrigens` é a única coisa da cena que se move sem
    // desfasamento nenhum, e é de propósito: luminância dinâmica
    // sincronizada é a pista de destino comum mais forte que há. Se algum
    // dia isto ganhar um `delay: i * …`, deixa de dizer o que existe para
    // dizer — que as três, JUNTAS, são esta base.
    const HERO = readFileSync(
      join(process.cwd(), "src/components/preco/HeroPreco.tsx"),
      "utf8",
    );
    expect(emDe("base", "confirmaOrigens")).toBeGreaterThan(emDe("base", "assenta"));
    expect(emDe("base", "confirmaOrigens")).toBeLessThan(emDe("base", "parcelas"));
    expect(HERO).toContain('const origensConfirmadas = ato === 1 && emCena("confirmaOrigens")');
    expect(HERO).toContain("const confirmado = origensConfirmadas");
    expect(HERO).toContain("scale: confirmado ? 1.08 : 1,");
  });

  it("uma peça sai mais depressa do que entra", () => {
    // O emparelhamento entrada/saída do Material 3. O que chega tem de ser
    // lido; o que parte já foi.
    expect(DUR.saida).toBeLessThan(DUR.entrada);
  });

  it("a cena acaba: o último ato não devolve ao primeiro", () => {
    // A regra do §7. Se algum dia aparecer aqui um beat de reinício, é
    // porque alguém transformou a demonstração num GIF.
    const ids = ATOS.flatMap((a) => a.beats.map((b) => b.id));
    expect(ids).not.toContain("reinicia");
    expect(ATOS[ATOS.length - 1].id).toBe("preco");
    expect(ATOS[ATOS.length - 1].beats.at(-1)?.id).toBe("resolve");
  });
});

describe("coreografia do preço: a cena servida está resolvida", () => {
  const HERO = readFileSync(
    join(process.cwd(), "src/components/preco/HeroPreco.tsx"),
    "utf8",
  );

  it("o que se desenha lê `emCena`, e só os lançamentos leem o relógio cru", () => {
    // ⚠️ Isto já se partiu uma vez, e em silêncio.
    //
    // `feito()` responde pelo RELÓGIO. No servidor o relógio nunca correu,
    // portanto nenhum beat disparou — e desenhar a partir dele escrevia
    // `opacity: 0` na régua, na composição e no preço recomendado do HTML
    // servido. Quem chegava sem JavaScript ficava com 35,55 € debaixo de
    // «mínimo para cobrir custos» e nunca via o resto. A página continuava a
    // passar em todos os outros testes.
    //
    // `emCena()` resolve a cena antes de a hidratação existir. Os
    // lançamentos de fichas ficam no relógio cru de propósito: uma ficha
    // lançada antes de hidratar viajaria de um ponto que ainda não está no
    // seu lugar final.
    expect(HERO).toContain(
      "const emCena = useCallback((id: string) => !montado || feito(id), [montado, feito]);",
    );

    // Sem comentários: este ficheiro fala de `feito()` em prosa várias
    // vezes, e contá-las mediria a documentação em vez do código.
    const codigo = HERO.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const cru = [...codigo.matchAll(/(?<![A-Za-z])feito\(/g)].length;
    // Seis leituras legítimas do relógio, e não mais:
    //   1 · a própria definição de `emCena`, que o embrulha;
    //   3 · as fichas de custo (`fichaA`, `fichaB`, `fichaC`);
    //   1 · o laço que as lança;
    //   1 · a entrega do total (`handoff`).
    // Qualquer sétima é alguém a desenhar outra vez a partir do relógio.
    expect(cru, "alguém voltou a desenhar a partir do relógio cru").toBe(6);
  });

  it("o estado inicial é o último ato, não o primeiro", () => {
    // É isto que põe o preço, a régua e a composição no HTML servido. Trocar
    // para `useState(0)` devolve exatamente o mesmo defeito.
    expect(HERO).toContain("const [ato, setAto] = useState(ULTIMO_ATO);");
    expect(HERO).toContain("const [parado, setParado] = useState(true);");
  });

  it("nenhuma peça do palco esconde conteúdo com um `initial` opaco", () => {
    // Um `initial={{ opacity: 0 }}` num `m.*` faz o SSR escrever
    // `opacity: 0` no HTML: conteúdo que desaparece sem JavaScript. O §7 do
    // roteiro proíbe animar a EXISTÊNCIA — anima-se a ênfase.
    //
    // As fichas e os anéis são a exceção legítima e vivem noutro ficheiro:
    // não existem no HTML servido de todo, porque são criadas por medição
    // em tempo de execução.
    expect(HERO).not.toMatch(/initial=\{\{[^}]*opacity:\s*0/);
  });
});

describe("coreografia do preço: os três defeitos apanhados em runtime", () => {
  const HERO = readFileSync(join(process.cwd(), "src/components/preco/HeroPreco.tsx"), "utf8");
  // A mecânica mudou de casa: vive em `components/palco/`, partilhada com o
  // palco de «Descobrir». O invariante é o mesmo — o que se verifica é o
  // ficheiro onde ele agora existe.
  const ATORES = readFileSync(join(process.cwd(), "src/components/palco/atores.tsx"), "utf8");
  const FRAME = readFileSync(join(process.cwd(), "src/components/palco/frame.ts"), "utf8");

  it("a pausa pára as fichas e os contadores, não só o relógio dos atos", () => {
    // Defeito: com a demonstração «em pausa», as fichas continuavam a voar e
    // a aterrar. A pausa parava o relógio dos beats e mais nada. É o WCAG
    // 2.2.2 a não ser cumprido.
    //
    // A correção estrutural: beats e atores subscrevem um único relógio por
    // cena. Pausar, esconder o separador ou sair do viewport suspende a fonte
    // comum; nenhuma peça conserva um ciclo concorrente.
    expect(FRAME.match(/requestAnimationFrame\(/g)).toHaveLength(1);
    expect(FRAME).toContain("!paradoRef.current");
    expect(FRAME).toContain("documentoVisivel.current");
    expect(FRAME).toContain("emVista.current");
    expect(ATORES).not.toMatch(/requestAnimationFrame\(/);
    expect(ATORES).toContain("relogioDeCena.inscrever");
    expect(ATORES).toContain("const { imediato, estatico, relogioDeCena }");
    // A ficha é um `span` pintado à mão, não um `m.span` animado.
    expect(ATORES).not.toMatch(/<m\.span[\s\S]{0,400}onAnimationComplete/);
  });

  it("entrar num ato repõe o estado que esse ato constrói", () => {
    // Defeito: `if (ato < 1) setBaseAcumulada(0)` deixava a soma do ato
    // anterior de pé. Saltar para o ato da base entrava nele a mostrar
    // 28,90 € onde devia estar `—`: o ato que existe para MOSTRAR a soma
    // mostrava-a já resolvida.
    expect(HERO).not.toContain("if (ato < 1) setBaseAcumulada(0)");
    const limpeza = HERO.slice(HERO.indexOf("setFichas([]);"));
    expect(limpeza.slice(0, 700)).toContain("setBaseAcumulada(0);");
  });

  it("ir para um ato põe-no a correr", () => {
    // Defeito: `onIr` pausava. Saltar para «Fixar o preço» deixava o preço
    // preso em 35,55 € para sempre, porque nenhum beat chegava a disparar.
    const onIr = HERO.slice(HERO.indexOf("onIr={(i) =>"));
    expect(onIr.slice(0, 120)).toContain("setParado(false)");
    expect(onIr.slice(0, 120)).not.toContain("setParado(true)");
  });
});

describe("coreografia do preço: as curvas", () => {
  it("são tuplas de Bézier válidas", () => {
    for (const [nome, curva] of Object.entries({ ENTRADA, SAIDA, VIAGEM, ASSENTA })) {
      expect(curva, nome).toHaveLength(4);
      for (const n of curva) expect(Number.isFinite(n), nome).toBe(true);
      // O x de uma Bézier de easing tem de ficar em [0,1] — fora disso a
      // curva deixa de ser uma função do tempo.
      expect(curva[0], `${nome}.x1`).toBeGreaterThanOrEqual(0);
      expect(curva[0], `${nome}.x1`).toBeLessThanOrEqual(1);
      expect(curva[2], `${nome}.x2`).toBeGreaterThanOrEqual(0);
      expect(curva[2], `${nome}.x2`).toBeLessThanOrEqual(1);
    }
  });

  it("só ASSENTA passa do alvo — é a única que representa peso", () => {
    // `ASSENTA` tem y > 1 de propósito (overshoot). As outras não podem
    // ter: um fade elástico é o efeito barato que o §7 proíbe.
    expect(Math.max(ASSENTA[1], ASSENTA[3])).toBeGreaterThan(1);
    for (const [nome, curva] of Object.entries({ ENTRADA, SAIDA, VIAGEM })) {
      expect(Math.max(curva[1], curva[3]), `${nome} não pode ter overshoot`).toBeLessThanOrEqual(1);
    }
  });

  it("o avaliador de Bézier concorda com o que o CSS faria", () => {
    // As fichas deixaram de ser animadas pelo `motion` e passaram a avaliar
    // a curva à mão. Se esta avaliação estiver errada, o movimento fica
    // errado de uma maneira que ninguém consegue apontar a olho.
    const linear = bezier([0, 0, 1, 1]);
    for (const x of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(linear(x)).toBeCloseTo(x, 5);
    }

    const e = bezier(ENTRADA);
    expect(e(0)).toBe(0);
    expect(e(1)).toBe(1);
    // Uma curva de saída está SEMPRE acima da diagonal: chega depressa e
    // assenta devagar. Se descer abaixo, alguém trocou os pontos de controlo.
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) expect(e(x)).toBeGreaterThan(x);
    // E é monótona: nunca anda para trás no meio do percurso.
    let ultimo = -1;
    for (let x = 0; x <= 1; x += 0.02) {
      const y = e(x);
      expect(y).toBeGreaterThanOrEqual(ultimo - 1e-9);
      ultimo = y;
    }

    // `ASSENTA` passa do alvo — é o que lhe dá massa — e volta a 1.
    const a = bezier(ASSENTA);
    expect(a(1)).toBe(1);
    let maximo = 0;
    for (let x = 0; x <= 1; x += 0.01) maximo = Math.max(maximo, a(x));
    expect(maximo).toBeGreaterThan(1);
  });

  it("fora do intervalo, a curva não inventa valores", () => {
    const e = bezier(ENTRADA);
    expect(e(-1)).toBe(0);
    expect(e(2)).toBe(1);
  });

  it("ENTRADA é a curva da marca, e não uma variação dela", () => {
    // `lib/motion.ts` exporta a mesma. Duas curvas «quase iguais» no mesmo
    // produto leem-se como inconsistência sem ninguém saber apontar porquê.
    expect(ENTRADA).toEqual([0.16, 1, 0.3, 1]);
  });
});

describe("coreografia do preço: a trajetória", () => {
  it("o arco desvia-se da reta, mas pouco", () => {
    const origem = { x: 0, y: 0 };
    const destino = { x: 300, y: 0 };
    const meio = arco(origem, destino);

    // A meio da distância no eixo do movimento…
    expect(meio.x).toBeCloseTo(150, 6);
    // …e desviado 16% na perpendicular. Uma reta lê-se como teletransporte;
    // mais do que isto lê-se como maneirismo.
    expect(Math.abs(meio.y)).toBeCloseTo(300 * 0.16, 6);
  });

  it("o desvio acompanha a direção — no telemóvel a viagem é vertical", () => {
    // As colunas empilham e as fichas passam a viajar para baixo. Não há um
    // segundo roteiro para isso: a trajetória segue a medição.
    const meio = arco({ x: 0, y: 0 }, { x: 0, y: 240 });
    expect(meio.y).toBeCloseTo(120, 6);
    expect(Math.abs(meio.x)).toBeCloseTo(240 * 0.16, 6);
  });

  it("uma distância nula não produz NaN", () => {
    const meio = arco({ x: 10, y: 10 }, { x: 10, y: 10 });
    expect(Number.isFinite(meio.x)).toBe(true);
    expect(Number.isFinite(meio.y)).toBe(true);
  });

  it("sem elemento não há medida — e quem chama tem de saber disso", () => {
    // `medir` devolver `{0,0}` em vez de `null` faria uma ficha viajar do
    // canto superior esquerdo do palco, que é pior do que ficha nenhuma.
    expect(medir(null, null)).toBeNull();
  });
});
