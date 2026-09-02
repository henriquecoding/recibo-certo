import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ATOS_CONTRATACAO,
  DURACAO_CONTRATACAO,
  PASSO,
} from "@/components/foco/salario/coreografia";

// ═══════════════════════════════════════════════════════════════════════
//  O PALCO PATRONAL NÃO PODE VOLTAR A SER UMA DECORAÇÃO
//  ---------------------------------------------------------------------
//  Este ficheiro existe por causa de um defeito muito concreto: os quatro
//  atos da contratação tinham `beats: []`. Um relógio a andar sem nada
//  ligado a ele — a régua do rodapé enchia-se, a legenda do cabeçalho
//  mudava, e no palco não acontecia coisa nenhuma além de uma borda a
//  acender por CSS.
//
//  O que torna esse defeito perigoso é ser INVISÍVEL a tudo o resto. O
//  build passava, os testes passavam, e os portões de runtime também: uma
//  cena morta não bloqueia a thread, não perde frames, tem contraste e
//  chega ao fim. Todas essas medições medem CUSTO; nenhuma media MUDANÇA.
//
//  `verificar-palcos.mjs` passou a medir a mudança em runtime. Isto é a
//  rede barata, que corre em cada PR sem browser nenhum.
// ═══════════════════════════════════════════════════════════════════════

const ler = (caminho: string) => readFileSync(join(process.cwd(), caminho), "utf8");
const PALCO = "src/components/foco/salario/PalcoContratacao.tsx";

/**
 * O ficheiro sem comentários.
 *
 * Os palcos deste projeto explicam-se por extenso, e um comentário que
 * CITA a cor antiga («todo o interior estava escrito em `bg-white/[.035]`»)
 * faz uma asserção sobre o código encontrar prosa. Aconteceu à primeira
 * escrita deste teste: passava a dizer que o defeito continuava lá porque
 * a explicação de o ter corrigido o mencionava.
 */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const ato = (id: string) => {
  const encontrado = ATOS_CONTRATACAO.find((a) => a.id === id);
  if (!encontrado) throw new Error(`o ato ${id} deixou de existir`);
  return encontrado;
};
const beat = (idAto: string, idBeat: string) => {
  const encontrado = ato(idAto).beats.find((b) => b.id === idBeat);
  if (!encontrado) throw new Error(`o beat ${idAto}/${idBeat} deixou de existir`);
  return encontrado.em;
};

describe("coreografia da contratação", () => {
  it("tem quatro atos, e nenhum deles é uma casca vazia", () => {
    expect(ATOS_CONTRATACAO).toHaveLength(4);
    for (const a of ATOS_CONTRATACAO) {
      // Três é o mínimo com que um ato conta uma coisa: abre, acontece,
      // assenta. Menos do que isso e o ato é uma transição com nome.
      expect.soft(a.beats.length, `o ato «${a.id}» ficou sem beats`).toBeGreaterThanOrEqual(3);
      expect.soft(a.duracao, `o ato «${a.id}»`).toBeGreaterThan(0);
    }
  });

  it("todos os beats cabem dentro do ato e estão por ordem", () => {
    for (const a of ATOS_CONTRATACAO) {
      const ids = a.beats.map((b) => b.id);
      expect(new Set(ids).size, `ids repetidos no ato «${a.id}»`).toBe(ids.length);
      let anterior = -1;
      for (const b of a.beats) {
        expect.soft(b.em, `${a.id}/${b.id} antes do anterior`).toBeGreaterThanOrEqual(anterior);
        // Um beat que dispara depois do fim do ato NUNCA dispara: o relógio
        // chama `aoTerminarAto` e desinscreve-se. Seria um passo escrito no
        // roteiro e ausente do ecrã.
        expect.soft(b.em, `${a.id}/${b.id} depois do fim do ato`).toBeLessThan(a.duracao);
        anterior = b.em;
      }
    }
  });

  it("as três parcelas partem desfasadas — é isso que as agrupa", () => {
    // A Lei de Gestalt do Destino Comum: peças que se sobrepõem no ar
    // lêem-se como um grupo. `PASSO.irmao` é o intervalo escolhido para
    // isso em `palco/curvas.ts`, e três parcelas a partir no mesmo
    // instante seriam uma só coisa a acontecer, não uma subtração.
    const refeicao = beat("pacote", "refeicao");
    const tsu = beat("pacote", "tsu");
    const posto = beat("pacote", "posto");
    expect(tsu - refeicao).toBe(PASSO.irmao);
    expect(posto - tsu).toBe(PASSO.irmao);
  });

  it("o que fica só assenta depois de o que sai ter saído", () => {
    // A fronteira entre a subtração e o resultado é um SILÊNCIO, e não um
    // desfasamento: `PASSO.outro`. Sem ele, o resto aparece enquanto as
    // fichas ainda estão no ar e a causa deixa de se ver ligada ao efeito.
    const ultimaAPartir = beat("pacote", "posto");
    expect(beat("pacote", "resto") - ultimaAPartir).toBeGreaterThanOrEqual(PASSO.outro);
    expect(beat("pacote", "salario")).toBeGreaterThan(beat("pacote", "resto"));
    expect(beat("pacote", "licao")).toBeGreaterThan(beat("pacote", "salario"));
  });

  it("a margem só é retirada bem depois de a barra encher", () => {
    // O recuo dos 5% é um acontecimento. Se `protege` disparasse junto de
    // `enche`, a barra nascia já a 95% e não se via decisão nenhuma —
    // exatamente o que o portão de runtime mede como «pico == repouso».
    expect(beat("orcamento", "protege") - beat("orcamento", "enche")).toBeGreaterThanOrEqual(600);
    expect(beat("orcamento", "sobra")).toBeGreaterThan(beat("orcamento", "protege"));
  });

  it("a duração publicada é a soma real dos atos", () => {
    const soma = ATOS_CONTRATACAO.reduce((total, a) => total + a.duracao, 0);
    expect(DURACAO_CONTRATACAO).toBe(soma);
    // Uma cena muito mais longa do que as irmãs deixa de ser uma
    // demonstração e passa a ser uma espera.
    expect(soma).toBeLessThanOrEqual(14_000);
  });
});

describe("o palco patronal é uma cena, não um painel", () => {
  it("usa a maquinaria de movimento partilhada em vez de realces CSS", () => {
    const palco = ler(PALCO);
    expect(palco).toContain("ATOS_CONTRATACAO");
    // Os três atores do palco: o que viaja, o número que muda porque algo
    // lhe chegou, e o anel que marca onde chegou.
    expect(palco).toContain("<Ficha");
    expect(palco).toContain("<Contador");
    expect(palco).toContain("<Anel");
    expect(palco).toContain("medir(");
    // `transition-all` em painéis inteiros era a forma anterior de fingir
    // movimento: anima tudo, não diz nada, e é o que lá estava.
    expect(semComentarios(palco)).not.toContain("transition-all");
  });

  it("segue o tom declarado pelo foco, para participar no tema", () => {
    const palco = ler(PALCO);
    const focos = ler("src/components/foco/focos.ts");
    expect(palco).toContain('tom="claro"');
    // O foco do salário declara `claro`, e os DOIS palcos que vivem nele
    // — trocados por um radiogroup — têm de o honrar. Enquanto este dizia
    // `escuro`, era `#0c251e` fixo nos dois temas.
    expect(ler("src/components/foco/salario/PalcoSalario.tsx")).toContain('tom="claro"');
    const bloco = focos.slice(focos.indexOf('id: "salario"'));
    expect(bloco.slice(0, bloco.indexOf("}"))).toContain('tom: "claro"');
    // E nenhuma cor que só exista contra um fundo escuro fixo.
    const codigo = semComentarios(palco);
    expect(codigo).not.toContain("bg-white/[.0");
    expect(codigo).not.toContain("text-white/");
    expect(codigo).not.toContain("bg-[#0a211b]");
  });

  it("mantém as âncoras de que o portão de runtime depende", () => {
    const palco = ler(PALCO);
    const portao = ler("scripts/verificar-palcos.mjs");
    for (const ancora of ["barra-orcamento", "parcela", "resto"]) {
      expect.soft(palco, `âncora «${ancora}» no palco`).toContain(`data-contratacao="${ancora}"`);
      expect.soft(portao, `âncora «${ancora}» no portão`).toContain(`data-contratacao="${ancora}"`);
    }
    // E o portão tem mesmo de renderizar o palco patronal, que só existe
    // com a query: foi o ponto cego que deixou o defeito passar.
    expect(portao).toContain("/inicio/salario?percurso=empregador");
    expect(ler("scripts/verificar-movel.mjs")).toContain(
      "/inicio/salario?percurso=empregador",
    );
  });
});

describe("a aritmética que a cena mostra", () => {
  const snapshot = JSON.parse(ler("src/generated/homepage/salario.json"));
  const c = snapshot.dados.contratacao;
  const cent = (n: number) => Math.round(n * 100);

  it("as quatro parcelas somam o custo anual, ao cêntimo", () => {
    const soma =
      cent(c.parcelas.salarioEsubsidios) +
      cent(c.parcelas.refeicao) +
      cent(c.parcelas.tsuPatronal) +
      cent(c.parcelas.posto);
    // A cena desenha uma barra composta por estas quatro. Se deixarem de
    // somar o total, a barra passa a mentir sobre proporções.
    expect(soma).toBe(cent(c.custoAnual));
  });

  it("o que sobra, dividido por catorze pagamentos, é o vencimento base", () => {
    // É a resposta à pergunta do palco — «quanto posso pagar?» — e é o
    // único número que a pessoa leva daqui. Não pode ser recomposto à mão.
    expect(cent(c.parcelas.salarioEsubsidios / 14)).toBe(cent(c.vencimentoBaseMensal));
  });

  it("a refeição e os custos do posto batem com as parcelas declaradas", () => {
    expect(cent(c.parcelas.refeicao)).toBe(cent(c.refeicaoDia * c.refeicaoDiasElegiveis));
    expect(cent(c.parcelas.posto)).toBe(cent(c.seguroAnual + c.sstAnual));
  });

  it("o orçamento utilizável é o que a margem deixa, e é o que se gasta", () => {
    expect(cent(c.orcamentoUtilizavel)).toBe(
      cent(c.orcamentoAnual * (1 - c.margemSegurancaPercentagem / 100)),
    );
    expect(cent(c.custoAnual)).toBe(cent(c.orcamentoUtilizavel));
  });
});
