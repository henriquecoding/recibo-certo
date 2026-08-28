import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COPY_HEROS, tituloEmDuasLinhas } from "@/components/foco/copy-heros";
import { FOCOS } from "@/components/foco/focos";

// ═══════════════════════════════════════════════════════════════════════
//  A FORMA DOS CINCO TÍTULOS — uma barreira, não disciplina
//  ---------------------------------------------------------------------
//  Os cinco heros tinham cinco formas diferentes porque não havia forma
//  nenhuma declarada: um número, uma pergunta com resposta adiada, um
//  exemplo apresentado como sendo do leitor, um slogan e um aforismo.
//  Cada um passava sozinho; lidos seguidos não eram um produto.
//
//  Estas regras estão escritas em `copy-heros.ts`. Aqui são exigidas.
// ═══════════════════════════════════════════════════════════════════════

/** As palavras pelas quais alguém chega a cada foco. */
const PROCURA: Record<string, readonly string[]> = {
  descobrir: ["negócio"],
  preco: ["cobrar"],
  recibos: ["recibo verde"],
  salario: ["recibo de vencimento"],
  empresa: ["empresa", "recibos verdes"],
};

const palavras = (t: string) => t.split(/\s+/).filter(Boolean).length;

/**
 * Primeira pessoa do plural.
 *
 * «Cruzamos o que sabes fazer», «Refazemos a conta» — o produto a
 * apresentar-se como uma equipa, no meio de uma página que trata o leitor
 * por tu. A conta é que tem de estar em cena, não quem a faz.
 */
const NOS = /\b\w+(?:amos|emos|imos)\b|\bnós\b|\bnoss[ao]s?\b/i;

const SRC = join(process.cwd(), "src", "components");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

describe("os cinco títulos de hero são o mesmo instrumento", () => {
  it("as cinco portas usam a mesma abertura dinâmica", () => {
    const abertura = ler("foco", "CabecalhoHeroFoco.tsx");
    const consumidores = [
      ler("foco", "HeroFoco.tsx"),
      ler("descobrir", "HeroDescobrir.tsx"),
      ler("preco", "HeroPreco.tsx"),
    ];

    expect(abertura).toContain("<TituloHero foco={foco.id}");
    expect(abertura).toContain("<SubtituloHero foco={foco.id}");
    expect(abertura).toContain("{foco.palco}");
    for (const consumidor of consumidores) {
      expect(consumidor).toContain("<CabecalhoHeroFoco foco=");
    }
  });

  it("a rota raiz abre o instrumento e a pergunta ativa muda dentro do hero", () => {
    const pagina = readFileSync(join(process.cwd(), "src", "app", "page.tsx"), "utf8");
    const regua = ler("foco", "ReguaPerguntasHero.tsx");
    const abertura = ler("foco", "CabecalhoHeroFoco.tsx");

    expect(pagina).toContain('export const dynamic = "error"');
    expect(pagina).toContain('<HomepageFocoShell foco="descobrir">');
    expect(pagina).not.toContain("searchParams");
    expect(pagina).not.toContain("<HeroBussola");
    expect(abertura).toContain("<ReguaPerguntasHero focoAtivo={foco.id}");
    expect(regua).toContain("FOCOS.map");
    expect(regua).toContain('aria-current={ativo ? "step" : undefined}');
    expect(regua).toContain("hrefDoFoco(item.id)");
  });

  it("há um por foco, e nenhum a mais", () => {
    expect(Object.keys(COPY_HEROS).sort()).toEqual(FOCOS.map((f) => f.id).sort());
  });

  it.each(FOCOS.map((f) => f.id))("«%s» cumpre a forma do título", (id) => {
    const { titulo } = COPY_HEROS[id];

    // 42–62 caracteres. É o intervalo em que um H1 continua a caber num
    // ecrã estreito e ainda diz uma coisa inteira; abaixo disso vira
    // slogan, acima parte-se em quatro linhas no telemóvel.
    expect(titulo.length, `${id}: ${titulo.length} caracteres`).toBeGreaterThanOrEqual(42);
    expect(titulo.length, `${id}: ${titulo.length} caracteres`).toBeLessThanOrEqual(62);

    // Uma oração, acabada. Não um fragmento nem duas frases coladas.
    expect(titulo, `${id} não acaba`).toMatch(/[.?]$/);
    expect(titulo.slice(0, -1), `${id} tem duas frases`).not.toMatch(/[.?!]/);

    // Marcação nenhuma no meio do texto: tem de continuar a ser uma
    // string para se poder medir. A quebra é um índice.
    expect(titulo).not.toMatch(/<|>/);

    expect(titulo, `${id} fala na primeira pessoa do plural`).not.toMatch(NOS);
  });

  it.each(FOCOS.map((f) => f.id))("«%s» diz a palavra pela qual se chega lá", (id) => {
    const t = COPY_HEROS[id].titulo.toLowerCase();
    const encontrou = PROCURA[id].some((termo) => t.includes(termo));
    expect(encontrou, `«${COPY_HEROS[id].titulo}» não contém nenhuma de ${PROCURA[id].join(", ")}`).toBe(true);
  });

  it("nenhum título afirma um montante como se fosse universal", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ A ÚNICA COISA FACTUALMENTE ERRADA NOS TÍTULOS ANTIGOS         │
    // │                                                               │
    // │ «Compensa a partir de 140 000 € por ano» dava como lei o      │
    // │ cruzamento de UM conjunto de pressupostos. «Recebeste         │
    // │ 2000,00 €. Teus são 1240,40 €» apresentava um exemplo como    │
    // │ sendo o do leitor.                                            │
    // │                                                               │
    // │ Os números continuam na demonstração, onde os pressupostos    │
    // │ estão ao lado. Um título não tem espaço para os pressupostos, │
    // │ e por isso não pode ter o número.                             │
    // └───────────────────────────────────────────────────────────────┘
    for (const id of Object.keys(COPY_HEROS)) {
      expect(COPY_HEROS[id as keyof typeof COPY_HEROS].titulo, id).not.toMatch(/\d/);
    }
  });

  it.each(FOCOS.map((f) => f.id))("«%s» cumpre a forma do subtítulo", (id) => {
    const { subtitulo } = COPY_HEROS[id];
    const n = palavras(subtitulo);
    expect(n, `${id}: ${n} palavras`).toBeGreaterThanOrEqual(28);
    expect(n, `${id}: ${n} palavras`).toBeLessThanOrEqual(44);
    expect(subtitulo, `${id} fala na primeira pessoa do plural`).not.toMatch(NOS);
    expect(subtitulo).not.toMatch(/<|>/);
  });

  it("a quebra de linha nunca parte uma palavra", () => {
    for (const id of Object.keys(COPY_HEROS) as (keyof typeof COPY_HEROS)[]) {
      const copy = COPY_HEROS[id];
      if (!copy.quebra) continue;
      const [antes, depois] = tituloEmDuasLinhas(copy);
      // Reconstituído, tem de dar o título — só com o espaço da quebra.
      expect(`${antes} ${depois}`, id).toBe(copy.titulo);
      // E nenhuma das metades pode ficar com duas palavras a olhar para
      // o nada: uma linha de três caracteres não é uma quebra, é um erro.
      expect(antes.length, `${id}: primeira linha curta`).toBeGreaterThanOrEqual(12);
      expect(depois.length, `${id}: segunda linha curta`).toBeGreaterThanOrEqual(12);

      // ── E nenhuma pode passar dos 33 ──────────────────────────────
      //  É o que cabe numa linha a 3,75 rem dentro de `max-w-4xl`. Uma
      //  linha declarada mais longa do que isso não fica mais longa: o
      //  browser parte-a outra vez, e o título que devia ter duas linhas
      //  aparece com três — uma delas com uma palavra. Foi o que
      //  aconteceu a «Confere o teu recibo de vencimento,» (34).
      expect(antes.length, `${id}: primeira linha com ${antes.length}`).toBeLessThanOrEqual(33);
      expect(depois.length, `${id}: segunda linha com ${depois.length}`).toBeLessThanOrEqual(33);
    }
  });
});
