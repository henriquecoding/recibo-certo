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
      expect(
        CONTEUDO_EXPANSAO[c.slug].dados.some((d) => d.label === c.dado),
        `${c.slug} → dado "${c.dado}" não existe no pacote`,
      ).toBe(true);
      if (c.acao === "corrigir") expect(c.verificado, `${c.slug}/${c.dado}`).toBeTruthy();
    }
  });

  it("uma correção aplicada substitui mesmo o valor do pacote", () => {
    for (const c of CORRECOES_AO_PACOTE.filter((x) => x.acao === "corrigir")) {
      const publicado = dadosDoGuia(c.slug).publicaveis.find((d) => d.label === c.dado);
      expect(publicado?.valor, `${c.slug}/${c.dado}`).toBe(c.verificado);
      expect(publicado?.valor, `${c.slug}/${c.dado}`).not.toBe(c.noPacote);
    }
    for (const c of CORRECOES_AO_PACOTE.filter((x) => x.acao === "reter")) {
      const labels = dadosDoGuia(c.slug).publicaveis.map((d) => d.label);
      expect(labels, `${c.slug}/${c.dado}`).not.toContain(c.dado);
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
