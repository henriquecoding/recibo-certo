import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GUIDE_MANIFESTS, manifesto, TOOL_HREFS, HUB_GRUPOS } from "@/lib/guias/manifests";
import { LEGAL_SOURCES, LEITURAS_COMPLEMENTARES } from "@/lib/guias/legal-sources";
import { APLICABILIDADE } from "@/lib/guias/aplicabilidade";
import { HISTORICO_GUIAS } from "@/lib/guias/historico";
import { GUIAS_EXPANSAO, SLUGS_EXPANSAO, guiaExpansao } from "@/lib/guias/expansao/catalogo";
import { CONTEUDO_EXPANSAO } from "@/lib/guias/expansao/conteudo";
import { CORPOS_REDIGIDOS } from "@/lib/guias/expansao/corpos-redigidos";
import { CORRECOES_AO_PACOTE } from "@/lib/guias/expansao/correcoes";
import { dadosDoGuia } from "@/lib/guias/expansao/dados";
import { FONTES_ACRESCENTADAS } from "@/lib/guias/expansao/fontes-acrescentadas";
import { DADOS_MOTOR, bindingsDoGuia } from "@/lib/guias/expansao/dados-motor";
import * as FISCAL from "@/lib/fiscal-data";
import { IMI_PRESTACOES } from "@/lib/fiscal-data";
import { fontesDoGuia } from "@/lib/guias";
import { guiaSemCorpo, estadoDoGuia, rotuloCurto } from "@/lib/guias/expansao/derivar";
import { CORPOS } from "@/components/guias/expansao/corpos";
import { GUIA_SLUGS } from "@/lib/seo";

// ═══════════════════════════════════════════════════════════════════════
//  guias:expansao — os critérios de aceitação do pacote, como asserções
//  ---------------------------------------------------------------------
//  A secção 5 do pacote é uma checklist de onze pontos por guia, e a
//  secção 6 pede quatro verificações automáticas. Uma checklist que vive
//  num documento é uma checklist que ninguém corre: o que se segue é a
//  mesma lista, executável, a falhar o CI quando alguma coisa escorrega.
//
//  As verificações que dependem da rede (URL vivo, âncora presente, texto
//  do artigo alterado) NÃO estão aqui — vivem em `scripts/check-guias.mjs`
//  e em `scripts/verificar-expansao.mjs`, para não pôr o CI de código
//  dependente do tempo de resposta do Portal das Finanças.
// ═══════════════════════════════════════════════════════════════════════

const daExpansao = GUIDE_MANIFESTS.filter((m) => SLUGS_EXPANSAO.includes(m.slug));
const comCorpo = GUIAS_EXPANSAO.filter((g) => !guiaSemCorpo(g.slug));

describe("guias:expansao — integridade do pacote importado", () => {
  it("os 112 guias do pacote chegaram todos ao catálogo", () => {
    expect(SLUGS_EXPANSAO).toHaveLength(112);
    expect(daExpansao).toHaveLength(112);
    for (const g of GUIAS_EXPANSAO) expect(manifesto(g.slug), g.slug).toBeDefined();
  });

  it("nenhum slug da expansão colide com os 57 anteriores", () => {
    const anteriores = GUIDE_MANIFESTS.filter((m) => !SLUGS_EXPANSAO.includes(m.slug)).map((m) => m.slug);
    for (const slug of SLUGS_EXPANSAO) expect(anteriores, slug).not.toContain(slug);
    expect(new Set(SLUGS_EXPANSAO).size).toBe(SLUGS_EXPANSAO.length);
  });

  it("as seis secções novas existem e têm guias", () => {
    const novas = ["casa", "investir", "familia", "reforma", "estrangeiro", "profissao"];
    const ids = HUB_GRUPOS.map((h) => h.id);
    for (const nova of novas) {
      expect(ids, nova).toContain(nova);
      expect(GUIAS_EXPANSAO.some((g) => g.hub === nova), nova).toBe(true);
    }
  });

  it("cada guia resolve todas as suas fontes no catálogo legal", () => {
    const orfas: string[] = [];
    for (const g of GUIAS_EXPANSAO) {
      for (const id of [...g.baseLegal, ...g.fontesOficiais]) {
        if (!(id in LEGAL_SOURCES)) orfas.push(`${g.slug} → ${id}`);
      }
      for (const id of g.leituraComplementar) {
        if (!(id in LEITURAS_COMPLEMENTARES)) orfas.push(`${g.slug} → leitura ${id}`);
      }
    }
    expect(orfas).toEqual([]);
  });

  it("a base legal é sempre um subconjunto das fontes oficiais", () => {
    // `fontes_oficiais` é `base_legal` mais os portais. Se algum artigo
    // estivesse só na base legal, não apareceria no bloco de fontes da
    // página — a afirmação ficava sem a fonte visível ao leitor.
    for (const g of GUIAS_EXPANSAO) {
      for (const id of g.baseLegal) expect(g.fontesOficiais, `${g.slug} → ${id}`).toContain(id);
    }
  });

  it("nenhum guia relacionado é órfão nem aponta para si próprio", () => {
    const todos = new Set(GUIDE_MANIFESTS.map((m) => m.slug));
    const quebradas: string[] = [];
    for (const g of GUIAS_EXPANSAO) {
      for (const alvo of g.relacionados) {
        if (!todos.has(alvo)) quebradas.push(`${g.slug} → ${alvo}`);
        if (alvo === g.slug) quebradas.push(`${g.slug} → si próprio`);
      }
    }
    expect(quebradas).toEqual([]);
  });

  it("cada guia tem ferramenta relacionada resolúvel", () => {
    for (const g of GUIAS_EXPANSAO) {
      expect(g.ferramentas.length, g.slug).toBeGreaterThan(0);
      for (const t of g.ferramentas) expect(TOOL_HREFS, `${g.slug} → ${t}`).toHaveProperty(t);
    }
  });
});

describe("guias:expansao — critérios de aceitação da secção 5", () => {
  it("a meta description tem 175 caracteres ou menos e é específica", () => {
    const longas = GUIAS_EXPANSAO.filter((g) => g.metaDescription.length > 175)
      .map((g) => `${g.slug} (${g.metaDescription.length})`);
    expect(longas).toEqual([]);

    const vistas = new Map<string, string>();
    const repetidas: string[] = [];
    for (const g of GUIAS_EXPANSAO) {
      const anterior = vistas.get(g.metaDescription);
      if (anterior) repetidas.push(`${g.slug} = ${anterior}`);
      vistas.set(g.metaDescription, g.slug);
    }
    expect(repetidas).toEqual([]);
  });

  it("a resposta curta responde e não remete para o corpo", () => {
    // «Ver abaixo» numa resposta curta é a resposta curta a demitir-se.
    const remissoes = /\b(ver (abaixo|mais abaixo|adiante)|como se explica (abaixo|a seguir))\b/i;
    for (const g of GUIAS_EXPANSAO) {
      expect(g.respostaCurta.length, g.slug).toBeGreaterThan(40);
      expect(remissoes.test(g.respostaCurta), g.slug).toBe(false);
      expect(APLICABILIDADE[g.slug]?.respostaCurta, g.slug).toBe(g.respostaCurta);
    }
  });

  it("«não se aplica se…» e «aplica-se a ti se…» estão preenchidos", () => {
    for (const g of GUIAS_EXPANSAO) {
      const c = CONTEUDO_EXPANSAO[g.slug];
      expect(c, g.slug).toBeDefined();
      expect(c.aplicaSe.length, g.slug).toBeGreaterThan(0);
      expect(c.naoAplicaSe.length, g.slug).toBeGreaterThan(0);
      expect(c.oQuePreparar.length, g.slug).toBeGreaterThan(0);
      expect(c.estruturaH2.length, g.slug).toBeGreaterThan(0);
    }
  });

  it("nenhum valor marcado «confirmar» chega à página", () => {
    // Regra 3 do pacote. Guardar não é publicar: `conteudo.ts` retém tudo,
    // `dadosDoGuia` é que decide o que sai.
    for (const g of GUIAS_EXPANSAO) {
      for (const d of dadosDoGuia(g.slug).publicaveis) {
        expect(d.porConfirmar, `${g.slug} → ${d.label}`).toBe(false);
      }
    }
  });

  it("as divergências face ao pacote apontam para dados e fontes que existem", () => {
    for (const c of CORRECOES_AO_PACOTE) {
      expect(guiaExpansao(c.slug), c.slug).toBeDefined();
      expect(LEGAL_SOURCES, `${c.slug} → ${c.fonte}`).toHaveProperty(c.fonte);
      expect(c.motivo.length, `${c.slug}/${c.dado}`).toBeGreaterThan(60);
      if (c.semDadoNoPacote) {
        // A dispensa só vale onde não há tabela nenhuma para apontar. Num
        // guia com `dados`, um `dado` que não case com nenhuma linha é uma
        // gralha — e a dispensa não a pode encobrir.
        expect(
          CONTEUDO_EXPANSAO[c.slug].dados,
          `${c.slug} → "semDadoNoPacote" num guia que TEM dados no pacote`,
        ).toHaveLength(0);
      } else {
        expect(
          CONTEUDO_EXPANSAO[c.slug].dados.some((d) => d.label === c.dado),
          `${c.slug} → dado "${c.dado}" não existe no pacote`,
        ).toBe(true);
      }
      if (c.acao === "corrigir") {
        expect(c.verificado, `${c.slug}/${c.dado}`).toBeTruthy();
        // Uma entrada corrigida não pode continuar a pedir confirmação: a
        // nota fica ao lado do valor e é o que o leitor lê a seguir a ele.
        const nota = c.notaVerificada ?? CONTEUDO_EXPANSAO[c.slug].dados.find((d) => d.label === c.dado)?.nota ?? "";
        expect(nota.toLowerCase(), `${c.slug}/${c.dado}`).not.toContain("confirmar");
      }
    }
  });

  it("o valor do pacote que foi corrigido nunca chega à página", () => {
    // Vale para as duas origens. Quando o guia passou a ser servido pelo
    // motor, a correção deixa de ser aplicada por substituição de texto —
    // mas o resultado tem de ser o mesmo: o valor errado não aparece.
    for (const c of CORRECOES_AO_PACOTE) {
      const publicados = dadosDoGuia(c.slug).publicaveis;
      const textoTodo = publicados.map((d) => `${d.label} ${d.valor} ${d.nota}`).join(" | ");
      expect(textoTodo, `${c.slug}/${c.dado}`).not.toContain(c.noPacote);
      if (c.acao === "reter") {
        expect(publicados.map((d) => d.label), `${c.slug}/${c.dado}`).not.toContain(c.dado);
      }
    }
  });

  it("o motor reflete as correções feitas ao pacote", () => {
    // A correção mais cara foi a do prazo do IMI. Se alguém repuser
    // «maio e agosto» em `fiscal-data.ts`, isto falha — e é o único sítio
    // onde repor faria efeito, agora que a página vem do motor.
    const meses = IMI_PRESTACOES.value.map((p) => p.meses.join(" e "));
    expect(meses).toContain("maio e novembro");
    expect(meses).not.toContain("maio e agosto");
  });

  it("as fontes que a redação acrescentou existem e ficam visíveis", () => {
    for (const [slug, fontes] of Object.entries(FONTES_ACRESCENTADAS)) {
      expect(guiaExpansao(slug), slug).toBeDefined();
      expect(fontes.length, slug).toBeGreaterThan(0);
      const visiveis = new Set(fontesDoGuia(slug).oficiais.map((f) => f.id));
      for (const id of fontes) {
        expect(LEGAL_SOURCES, `${slug} → ${id}`).toHaveProperty(id);
        // Declarar a proveniência no código e não a mostrar ao leitor não
        // seria proveniência nenhuma.
        expect([...visiveis], `${slug} → ${id}`).toContain(id);
      }
    }
  });

  it("todo o guia com corpo tem entrada de changelog datada", () => {
    for (const g of comCorpo) {
      const entradas = HISTORICO_GUIAS.filter((h) => h.guideId === g.slug);
      expect(entradas.length, g.slug).toBeGreaterThan(0);
      for (const e of entradas) expect(e.data, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("guias que exigem revisão especializada nascem em revisão, nunca revistos", () => {
    for (const g of GUIAS_EXPANSAO) {
      if (!g.exigeRevisaoEspecializada) continue;
      expect(estadoDoGuia(g), g.slug).not.toBe("published");
      expect(manifesto(g.slug)?.reviewer, g.slug).toContain("Por atribuir");
    }
  });
});

describe("guias:expansao — nada de hardcode: os números vêm do motor", () => {
  // Um valor fiscal escrito à mão num guia é um valor que ninguém valida,
  // que não entra em conta nenhuma, e que continua ali com ar de certo no
  // dia em que o Orçamento do Estado o muda. Estes três testes existem para
  // que isso não possa voltar a acontecer sem o CI dar por ela.

  const COM_NUMERO = /\d/;

  it("todo o guia publicado serve a tabela de dados a partir do motor", () => {
    const semMotor = comCorpo
      .filter((g) => CONTEUDO_EXPANSAO[g.slug].dados.length > 0)
      .filter((g) => dadosDoGuia(g.slug).origem !== "motor")
      .map((g) => g.slug);
    expect(semMotor).toEqual([]);
  });

  it("cada valor mostrado declara o parâmetro do motor de onde saiu", () => {
    for (const [slug, dados] of Object.entries(DADOS_MOTOR)) {
      expect(guiaExpansao(slug), slug).toBeDefined();
      for (const d of dados) {
        // O binding tem de ser um parâmetro que EXISTE em `fiscal-data.ts`.
        // Sem isto seria uma etiqueta decorativa: dizia «vim do motor» sem
        // que ninguém verificasse de onde, e sobreviveria a um `sv()`
        // renomeado ou apagado.
        expect(FISCAL, `${slug}/${d.label} → ${d.binding}`).toHaveProperty(d.binding);
        expect(d.nota.length, `${slug}/${d.label}`).toBeGreaterThan(10);
      }
    }
  });

  it("o manifesto declara os parâmetros que o guia usa", () => {
    // `engineBindings` era uma lista vazia nos 112 guias. Deixa de poder
    // sê-lo em qualquer guia que mostre números.
    for (const g of comCorpo) {
      const bindings = bindingsDoGuia(g.slug);
      if (bindings.length === 0) continue;
      expect(manifesto(g.slug)?.engineBindings, g.slug).toEqual(bindings);
    }
    const publicadosComNumeros = comCorpo.filter((g) =>
      dadosDoGuia(g.slug).publicaveis.some((d) => COM_NUMERO.test(d.valor)),
    );
    for (const g of publicadosComNumeros) {
      expect(manifesto(g.slug)!.engineBindings.length, g.slug).toBeGreaterThan(0);
    }
  });

  it("o corpo de um guia não escreve percentagens à mão", () => {
    // Uma percentagem no JSX de um corpo é um número fora do motor. Os
    // corpos falam de «a taxa está na tabela de dados» e a tabela vem de
    // `fiscal-data.ts` — quem escrever "25%" no texto parte este teste.
    const dir = join(process.cwd(), "src/components/guias/expansao/corpos");
    const infratores: string[] = [];
    for (const ficheiro of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
      const fonte = readFileSync(join(dir, ficheiro), "utf8");
      const corpo = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      for (const m of corpo.matchAll(/\b\d+(?:[.,]\d+)?\s*%/g)) {
        infratores.push(`${ficheiro}: "${m[0]}"`);
      }
    }
    expect(infratores).toEqual([]);
  });
});

describe("guias:expansao — o corpo e o plano do pacote", () => {
  it("cada slug com corpo tem componente, e cada componente tem slug", () => {
    // Duas listas para os dois lados da fronteira cliente/servidor. Se
    // divergirem, ou um guia entra no índice sem corpo, ou um corpo fica
    // escrito e invisível.
    expect([...CORPOS_REDIGIDOS].sort()).toEqual(Object.keys(CORPOS).sort());
  });

  it("nenhum corpo cobre menos secções do que o plano do pacote", () => {
    const dir = join(process.cwd(), "src/components/guias/expansao/corpos");
    const insuficientes: string[] = [];
    for (const slug of CORPOS_REDIGIDOS) {
      const ficheiro = join(dir, `${slug}.tsx`);
      expect(existsSync(ficheiro), slug).toBe(true);
      const fonte = readFileSync(ficheiro, "utf8");
      const seccoes = [...fonte.matchAll(/<Seccao\s+titulo=/g)].length;
      const planeadas = CONTEUDO_EXPANSAO[slug].estruturaH2.length;
      if (seccoes < planeadas) insuficientes.push(`${slug}: ${seccoes} de ${planeadas}`);
    }
    expect(insuficientes).toEqual([]);
  });

  it("as ligações internas escritas nos corpos apontam para rotas que existem", () => {
    const dir = join(process.cwd(), "src/components/guias/expansao/corpos");
    const conhecidos = new Set(GUIDE_MANIFESTS.map((m) => m.slug));
    const partidas: string[] = [];

    for (const ficheiro of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
      const fonte = readFileSync(join(dir, ficheiro), "utf8");
      for (const m of fonte.matchAll(/href="(\/[^"]*)"/g)) {
        const rota = m[1].split(/[?#]/)[0].replace(/\/$/, "");
        if (rota === "") continue;
        // Um guia serve-se ou de uma rota estática própria, ou da rota
        // dinâmica da expansão. As duas contam como existindo.
        if (rota.startsWith("/guias/")) {
          if (!conhecidos.has(rota.slice("/guias/".length))) partidas.push(`${ficheiro} → ${rota}`);
          continue;
        }
        if (!existsSync(join(process.cwd(), "src/app", rota, "page.tsx"))) {
          partidas.push(`${ficheiro} → ${rota}`);
        }
      }
    }
    expect(partidas).toEqual([]);
  });

  it("um andaime não é indexado nem anunciado", () => {
    const andaimes = GUIAS_EXPANSAO.filter((g) => guiaSemCorpo(g.slug));
    expect(andaimes.length).toBeGreaterThan(0);
    for (const g of andaimes) {
      expect(GUIA_SLUGS, g.slug).not.toContain(g.slug);
      expect(estadoDoGuia(g), g.slug).toBe("draft");
    }
  });

  it("o rótulo curto de navegação cabe e não fica vazio", () => {
    for (const g of GUIAS_EXPANSAO) {
      const rotulo = rotuloCurto(g.titulo);
      expect(rotulo.length, g.slug).toBeGreaterThan(2);
      expect(rotulo.length, `${g.slug}: "${rotulo}"`).toBeLessThanOrEqual(30);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  A CADEIA QUE PÕE UM GUIA NO ÍNDICE E NO SITEMAP
//  ---------------------------------------------------------------------
//  Escrever o corpo não chega: um guia só é encontrável se atravessar
//  quatro camadas — `CORPOS_REDIGIDOS` → `GUIDE_MANIFESTS` → `GUIA_SLUGS`
//  → sitemap e índice. Cada uma tem o seu filtro, e basta um deles ficar
//  desalinhado para o trabalho existir e não ser visto por ninguém.
//
//  Estas asserções fixam a cadeia nos DOIS sentidos. Um guia escrito que
//  não chegue ao sitemap é trabalho invisível; um andaime que lá chegue é
//  uma página por acabar candidata a resultado de pesquisa. Nenhum dos
//  dois é aceitável, e nenhum dos dois se nota a olho.
// ═══════════════════════════════════════════════════════════════════════

describe("guias:expansao — índice e sitemap", () => {
  it("todo o guia com corpo redigido chega a GUIA_SLUGS", () => {
    const fora = [...CORPOS_REDIGIDOS].filter((slug) => !GUIA_SLUGS.includes(slug));
    expect(fora, "guias escritos que não entram no sitemap nem no índice").toEqual([]);
  });

  it("nenhum andaime chega a GUIA_SLUGS", () => {
    const dentro = SLUGS_EXPANSAO.filter(
      (slug) => !CORPOS_REDIGIDOS.has(slug) && GUIA_SLUGS.includes(slug),
    );
    expect(dentro, "guias por escrever anunciados no sitemap").toEqual([]);
  });

  it("cada guia escrito tem manifesto, e o manifesto não o marca como rascunho", () => {
    for (const slug of CORPOS_REDIGIDOS) {
      const m = GUIDE_MANIFESTS.find((x) => x.slug === slug);
      expect(m, `${slug}: sem manifesto`).toBeDefined();
      // `draft` é o que `guiaSemCorpo()` produz — um guia escrito nunca
      // pode lá ficar, ou sai do índice sem ninguém dar por isso.
      expect(m!.status, `${slug}: manifesto ainda em rascunho`).not.toBe("draft");
    }
  });

  it("GUIA_SLUGS = guias originais + guias da expansão escritos", () => {
    const daExpansaoNoIndice = GUIA_SLUGS.filter((s) => SLUGS_EXPANSAO.includes(s));
    expect(daExpansaoNoIndice.length).toBe(CORPOS_REDIGIDOS.size);
    // E o total cresce exatamente com o que se escreve: qualquer outra
    // variação significa que alguma coisa entrou ou saiu por outra via.
    const originais = GUIA_SLUGS.length - daExpansaoNoIndice.length;
    expect(originais, "o número de guias originais não devia mudar por escrever expansão").toBe(57);
  });
});
