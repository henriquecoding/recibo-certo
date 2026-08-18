import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  CATALOGO_FERRAMENTAS, PERCURSOS, FERRAMENTAS_ATIVAS, TOTAL_FERRAMENTAS,
  validarCatalogoFerramentas, selecionar, porId, porSlug, porHref,
  agruparPorObjetivo, SLUGS_PUBLICOS, DESTAQUE_POR_PERFIL, ORDEM_POR_PERFIL,
} from "@/lib/ferramentas";
import { CHAVES_ICONES } from "@/components/ferramentas/icon-map";
import { FERRAMENTA_SLUGS, PUBLIC_ROUTES } from "@/lib/seo";
import { construirDocumentos } from "@/lib/busca/documentos";

// ═══════════════════════════════════════════════════════════════════════
//  O TESTE QUE O CATÁLOGO ANTIGO NÃO TINHA
//  ---------------------------------------------------------------------
//  Havia um teste a provar que `FERRAMENTAS` e `FERRAMENTA_SLUGS` diziam o
//  mesmo. Passava — e estava certo. O que não fazia era a única pergunta
//  que importava: «e as ferramentas que existem no produto e não estão em
//  NENHUMA das duas listas?». Eram quatro. Duas viviam dentro de guias,
//  uma só na homepage e uma sem landing.
//
//  Duas listas paralelas nunca divergem com estrondo. Por isso a maior
//  parte do que está aqui não compara listas entre si: compara o catálogo
//  com o SISTEMA DE FICHEIROS, que é a única fonte que não pode mentir
//  sobre o que existe.
// ═══════════════════════════════════════════════════════════════════════

const RAIZ = process.cwd();
const DIR_FERRAMENTAS = join(RAIZ, "src", "app", "ferramentas");

/** Slugs das rotas que existem mesmo em `src/app/ferramentas/`. */
const rotasNoDisco = (): string[] =>
  readdirSync(DIR_FERRAMENTAS)
    .filter((n) => statSync(join(DIR_FERRAMENTAS, n)).isDirectory())
    .filter((n) => existsSync(join(DIR_FERRAMENTAS, n, "page.tsx")))
    .sort();

const lerFonte = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

/** Todos os .ts/.tsx de src/, para as varreduras de fronteira. */
function ficheirosFonte(dir = join(RAIZ, "src"), acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === "__tests__" || nome === "node_modules") continue;
      ficheirosFonte(caminho, acc);
    } else if (/\.tsx?$/.test(nome)) {
      acc.push(caminho);
    }
  }
  return acc;
}

describe("catálogo de ferramentas: invariantes", () => {
  it("passa todas as invariantes declaradas", () => {
    expect(validarCatalogoFerramentas()).toEqual([]);
  });

  it("não tem ids, slugs, URLs nem títulos duplicados", () => {
    for (const chave of ["id", "slug", "canonicalHref", "title"] as const) {
      const valores = CATALOGO_FERRAMENTAS.map((f) => f[chave]);
      expect(new Set(valores).size, `${chave} duplicado`).toBe(valores.length);
    }
  });

  it("todos os relacionados e passos de percurso referenciam ids válidos", () => {
    const ids = new Set(CATALOGO_FERRAMENTAS.map((f) => f.id));
    for (const f of CATALOGO_FERRAMENTAS) {
      for (const rel of f.relatedToolIds) expect(ids, `${f.id} → ${rel}`).toContain(rel);
    }
    for (const p of PERCURSOS) {
      for (const s of p.steps) expect(ids, `${p.id} → ${s.toolId}`).toContain(s.toolId);
    }
  });

  it("todas as chaves de ícone existem no icon-map", () => {
    for (const f of CATALOGO_FERRAMENTAS) {
      expect(CHAVES_ICONES, `${f.id} usa o ícone "${f.icon}"`).toContain(f.icon);
    }
  });

  it("a curadoria da homepage só aponta para ferramentas do catálogo", () => {
    const ids = new Set(CATALOGO_FERRAMENTAS.map((f) => f.id));
    for (const id of Object.values(DESTAQUE_POR_PERFIL)) expect(ids).toContain(id);
    for (const lista of Object.values(ORDEM_POR_PERFIL)) {
      for (const id of lista) expect(ids).toContain(id);
    }
  });
});

describe("catálogo de ferramentas: completude face ao disco", () => {
  it("toda a ferramenta do catálogo tem uma página que existe", () => {
    const noDisco = new Set(rotasNoDisco());
    for (const f of CATALOGO_FERRAMENTAS) {
      expect(noDisco, `${f.id} promete ${f.canonicalHref}`).toContain(f.slug);
    }
  });

  it("toda a página pública de ferramenta está no catálogo", () => {
    // É esta a direção que faltava. Criar `src/app/ferramentas/<x>/page.tsx`
    // e esquecer o catálogo passa a reprovar aqui, e não a produzir uma
    // página órfã que ninguém encontra.
    const slugs = new Set(CATALOGO_FERRAMENTAS.map((f) => f.slug));
    for (const slug of rotasNoDisco()) {
      expect(slugs, `/ferramentas/${slug} existe mas não está no catálogo`).toContain(slug);
    }
  });

  it("toda a rota de painel declarada existe no disco", () => {
    for (const f of CATALOGO_FERRAMENTAS) {
      if (!f.dashboardHref) continue;
      const caminho = join(RAIZ, "src", "app", f.dashboardHref, "page.tsx");
      expect(existsSync(caminho), `${f.id} → ${f.dashboardHref}`).toBe(true);
    }
  });

  it("todo o guia relacionado existe", () => {
    for (const f of CATALOGO_FERRAMENTAS) {
      for (const slug of f.relatedGuideSlugs) {
        const dinamico = existsSync(join(RAIZ, "src", "app", "guias", "[slug]"));
        const estatico = existsSync(join(RAIZ, "src", "app", "guias", slug, "page.tsx"));
        expect(dinamico || estatico, `${f.id} → /guias/${slug}`).toBe(true);
      }
    }
  });
});

describe("catálogo de ferramentas: superfícies derivadas", () => {
  it("toda a ferramenta ativa aparece no hub e na pesquisa", () => {
    const docs = construirDocumentos();
    const naPesquisa = new Set(docs.map((d) => d.href));
    for (const f of FERRAMENTAS_ATIVAS) {
      expect(f.surfaces).toContain("hub");
      expect(naPesquisa, `${f.id} não está indexada`).toContain(f.canonicalHref);
    }
  });

  it("toda a ferramenta do sitemap está em PUBLIC_ROUTES", () => {
    const rotas = new Set(PUBLIC_ROUTES.map((r) => r.path));
    for (const slug of SLUGS_PUBLICOS) {
      expect(rotas, `/ferramentas/${slug}`).toContain(`/ferramentas/${slug}`);
    }
  });

  it("FERRAMENTA_SLUGS é exatamente o catálogo público", () => {
    expect([...FERRAMENTA_SLUGS].sort()).toEqual([...SLUGS_PUBLICOS].sort());
  });

  it("a contagem apresentada deriva do catálogo e exclui guias e quiz", () => {
    expect(TOTAL_FERRAMENTAS).toBe(FERRAMENTAS_ATIVAS.length);
    const nav = lerFonte("src/components/nav-config.tsx");
    expect(nav, "a contagem da navegação não pode ser um número escrito à mão")
      .toContain("TOTAL_FERRAMENTAS");
    // Nenhuma ferramenta do catálogo pode ser um guia ou o quiz.
    for (const f of CATALOGO_FERRAMENTAS) {
      expect(f.canonicalHref.startsWith("/ferramentas/")).toBe(true);
    }
  });

  it("cada ferramenta pública declara metadata e canonical próprios", () => {
    for (const f of CATALOGO_FERRAMENTAS) {
      const fonte = lerFonte(`src/app/ferramentas/${f.slug}/page.tsx`);
      expect(fonte, `${f.slug}: sem metadata`).toContain("export const metadata");
      expect(fonte, `${f.slug}: sem canonical`).toContain("canonical");
      // O canonical pode ser literal ou derivado do catálogo — derivar é
      // melhor, porque não pode divergir do destino que o hub anuncia.
      const literal = fonte.includes(`/ferramentas/${f.slug}`);
      const derivado = fonte.includes("TOOL.canonicalHref");
      expect(literal || derivado, `${f.slug}: canonical não identificável`).toBe(true);
    }
  });
});

describe("catálogo de ferramentas: fronteiras que não se atravessam", () => {
  it("nenhuma ferramenta é ligada por uma query da homepage", () => {
    // P0-02: o cartão do comparador mandava a pessoa para `/?modo=comparar`,
    // ou seja, para o topo da homepage. Nenhum link do produto pode voltar a
    // apontar uma ferramenta para uma query da landing.
    const infratores: string[] = [];
    for (const caminho of ficheirosFonte()) {
      const fonte = readFileSync(caminho, "utf8");
      // Só atribuições de destino contam. Comentários que EXPLICAM o defeito
      // — e o seletor de modo da homepage, que é quem legitimamente escreve
      // esse parâmetro — não são links de ferramenta.
      if (/\bhref\s*[=:]\s*["'`]\/\?modo=/.test(fonte)) {
        infratores.push(caminho.replace(`${RAIZ}/`, ""));
      }
    }
    expect(infratores, "usar o destino canónico em /ferramentas/*").toEqual([]);
  });

  it("o catálogo é dados puros — sem React, sem motores fiscais", () => {
    // O hub e o sitemap consomem-no; se arrastasse ícones ou `fiscal-data`,
    // qualquer consumidor pagava esse bundle só para ler metadados (§13.1).
    for (const rel of [
      "src/lib/ferramentas/catalogo.ts",
      "src/lib/ferramentas/tipos.ts",
      "src/lib/ferramentas/selecionar.ts",
      "src/lib/ferramentas/homepage.ts",
    ]) {
      const fonte = lerFonte(rel);
      expect(fonte, `${rel}: não pode ser um componente`).not.toContain('"use client"');
      expect(fonte, `${rel}: não pode importar React`).not.toMatch(/from "react"/);
      expect(fonte, `${rel}: não pode importar ícones`).not.toContain("components/ui/Icons");
      expect(fonte, `${rel}: não pode importar o motor fiscal`).not.toMatch(/from "@\/lib\/fiscal/);
    }
  });

  it("a rota do hub não importa motores fiscais nem simuladores", () => {
    const fonte = lerFonte("src/app/ferramentas/page.tsx");
    expect(fonte).not.toMatch(/from "@\/lib\/fiscal"/);
    expect(fonte).not.toContain("SimuladorIntegrado");
    expect(fonte).not.toContain("SimuladorIRS");
    expect(fonte).not.toContain("ComparadorCenarios");
    expect(fonte).not.toContain("MapaRegioes");
  });

  it("toda a ferramenta declara cálculo grátis, local e sem conta obrigatória", () => {
    for (const f of CATALOGO_FERRAMENTAS) {
      expect(f.access.core, f.id).toBe("free");
      expect(f.access.account, f.id).toBe("none");
      expect(f.privacy, f.id).toBe("local-only");
      // §11.3: o handoff FIZ nunca é uma funcionalidade Plus.
      expect(["optional-free", "none"], f.id).toContain(f.access.fizHandoff);
    }
  });

  it("as ferramentas pesadas carregam por chunk próprio e com fronteira de erro", () => {
    for (const f of CATALOGO_FERRAMENTAS) {
      if (f.layout === "compact") continue;
      const dir = join(RAIZ, "src", "app", "ferramentas", f.slug);
      const fontes = readdirSync(dir).map((n) => readFileSync(join(dir, n), "utf8")).join("\n");
      // Ou a rota tem a sua própria ponte de carregamento, ou importa um
      // componente que já é ele próprio diferido (`*Lazy`) — o mapa é assim.
      const proprio = fontes.includes("next/dynamic") && fontes.includes("ErrorBoundary");
      const delegado = /import\s+\w*Lazy\s+from/.test(fontes);
      expect(proprio || delegado, `${f.slug}: sem chunk próprio nem fronteira de erro`).toBe(true);
    }
  });
});

describe("descoberta: pesquisa e filtros do hub", () => {
  it("«salário» encontra o simulador e a auditoria", () => {
    const ids = selecionar({ q: "salário" }).map((f) => f.id);
    expect(ids).toContain("recibo-vencimento");
    expect(ids).toContain("auditoria-recibo");
  });

  it("«recibos verdes» encontra a ferramenta central em primeiro", () => {
    expect(selecionar({ q: "recibos verdes" })[0]?.id).toBe("recibos-verdes");
  });

  it("«segurança social» encontra a calculadora trimestral", () => {
    expect(selecionar({ q: "segurança social" }).map((f) => f.id)).toContain("seguranca-social");
  });

  it("a pesquisa ignora acentos nos dois sentidos", () => {
    expect(selecionar({ q: "herancas" }).map((f) => f.id)).toContain("simulador-herancas");
    expect(selecionar({ q: "heranças" }).map((f) => f.id)).toContain("simulador-herancas");
  });

  it("todos os termos têm de corresponder", () => {
    // «salário empresa» não pode devolver tudo o que fala de salário OU de
    // empresa — seria um OR disfarçado de pesquisa.
    const ids = selecionar({ q: "salário empresa" }).map((f) => f.id);
    expect(ids).not.toContain("auditoria-recibo");
  });

  it("uma consulta sem correspondência devolve lista vazia, não tudo", () => {
    expect(selecionar({ q: "xpto qwerty" })).toEqual([]);
  });

  it("o filtro de perfil não elimina ferramentas transversais", () => {
    const ids = selecionar({ perfil: "independente" }).map((f) => f.id);
    expect(ids).toContain("mapa-contabilistas");
    expect(ids).toContain("recibos-verdes");
  });

  it("sem filtros, devolve o catálogo ativo inteiro", () => {
    expect(selecionar({})).toHaveLength(TOTAL_FERRAMENTAS);
  });

  it("cada objetivo tem pelo menos uma ferramenta", () => {
    const grupos = agruparPorObjetivo();
    expect(grupos.map((g) => g.objetivo).sort())
      .toEqual(["calcular", "comparar", "cumprir", "verificar"]);
  });

  it("os agrupamentos cobrem todas as ferramentas ativas", () => {
    const cobertas = new Set(agruparPorObjetivo().flatMap((g) => g.ferramentas.map((f) => f.id)));
    for (const f of FERRAMENTAS_ATIVAS) expect(cobertas, f.id).toContain(f.id);
  });

  it("resolve por id, por slug e por qualquer um dos destinos", () => {
    expect(porId("recibos-verdes")?.slug).toBe("recibos-verdes");
    expect(porSlug("irs-jovem")?.id).toBe("irs-jovem");
    expect(porHref("/ferramentas/comparar-regimes")?.id).toBe("comparar-regimes");
    expect(porHref("/dashboard/comparar")?.id).toBe("comparar-regimes");
    expect(porHref("/ferramentas/simulador-irs?x=1#y")?.id).toBe("simulador-irs");
    expect(porHref("/ferramentas/inexistente")).toBeUndefined();
  });
});

describe("as quatro ferramentas que faltavam", () => {
  // Guarda explícita sobre P0-01, P0-02 e P0-03. Não é redundante com as
  // invariantes: estas quatro são o motivo de tudo o resto existir, e um
  // teste nominal deixa registado que a ausência delas foi um defeito.
  it.each([
    ["recibos-verdes", "o simulador central do produto"],
    ["comparar-regimes", "o comparador sem landing canónica"],
    ["seguranca-social", "a calculadora escondida no guia"],
    ["irs-jovem", "o simulador escondido no guia"],
  ])("%s está no catálogo, no hub e no sitemap (%s)", (id) => {
    const f = porId(id);
    expect(f, `${id} não está no catálogo`).toBeDefined();
    expect(f!.surfaces).toContain("hub");
    expect(f!.surfaces).toContain("search");
    expect(f!.surfaces).toContain("sitemap");
    expect(SLUGS_PUBLICOS).toContain(f!.slug);
  });

  it("o simulador de recibos verdes está entre os três de «Começa por aqui»", () => {
    const tres = FERRAMENTAS_ATIVAS
      .filter((f) => f.featuredRank !== undefined)
      .sort((a, b) => a.featuredRank! - b.featuredRank!)
      .slice(0, 3)
      .map((f) => f.id);
    expect(tres).toContain("recibos-verdes");
  });

  it("os guias que embutem uma ferramenta apontam para a versão completa", () => {
    for (const f of CATALOGO_FERRAMENTAS) {
      if (!f.guiaEmbedHref) continue;
      const fonte = lerFonte(`src/app/guias/${f.guiaEmbedHref.split("/").pop()}/page.tsx`);
      expect(fonte, `${f.guiaEmbedHref} não liga a ${f.canonicalHref}`)
        .toContain(f.canonicalHref);
    }
  });

  it("o catálogo tem as 15 ferramentas reais do inventário", () => {
    // 14 no levantamento original; a 15.ª é o motor de preço
    // (`calcular-preco`). Este número sobe DE PROPÓSITO e uma ferramenta de
    // cada vez: o teste existe para que ninguém acrescente uma entrada ao
    // catálogo sem reparar que está a mudar o inventário do produto.
    expect(TOTAL_FERRAMENTAS).toBe(15);
  });
});

describe("gramática comum: todas as ferramentas usam o mesmo ToolShell", () => {
  it("nenhuma página escreve o seu próprio H1", () => {
    // Antes, cada landing tinha o seu hero: eyebrow, H1 e subtítulo escritos
    // à mão, com gramáticas diferentes. Era a raiz de «as ferramentas não
    // parecem pertencer ao mesmo sistema» (P1-08). O H1 vem do catálogo.
    for (const f of CATALOGO_FERRAMENTAS) {
      const fonte = lerFonte(`src/app/ferramentas/${f.slug}/page.tsx`);
      expect(fonte, `${f.slug}: não usa ToolShell`).toContain("<ToolShell");
      expect(fonte, `${f.slug}: escreve um <h1> próprio`).not.toMatch(/<h1[\s>]/);
    }
  });

  it("nenhuma página abre um <main> dentro do layout", () => {
    // Dois landmarks `main` na mesma página quebram a navegação por
    // regiões num leitor de ecrã. O layout já abre um.
    for (const f of CATALOGO_FERRAMENTAS) {
      const fonte = lerFonte(`src/app/ferramentas/${f.slug}/page.tsx`);
      expect(fonte, `${f.slug}: <main> aninhado`).not.toMatch(/<main[\s>]/);
    }
  });

  it("o H1 de cada ferramenta com procura própria leva a sua âncora", () => {
    const ancoras: Array<[string, RegExp]> = [
      ["recibos-verdes", /recibos verdes 2026/i],
      ["simulador-irs", /IRS 2026/i],
      ["recibo-vencimento", /líquido 2026/i],
      ["seguranca-social", /segurança social/i],
      ["irs-jovem", /IRS Jovem 2026/i],
      ["simulador-herancas", /heranças/i],
    ];
    for (const [id, padrao] of ancoras) {
      const f = porId(id)!;
      expect(f.h1 ?? f.title, `${id}: H1 sem a âncora de pesquisa`).toMatch(padrao);
    }
  });

  it("toda a ferramenta declara tempo, dados necessários e CTA próprio", () => {
    for (const f of CATALOGO_FERRAMENTAS) {
      expect(f.estimatedMinutes, f.id).toBeGreaterThan(0);
      expect(f.requiredInputs.length, f.id).toBeGreaterThan(0);
      // O CTA é específico («Calcular líquido»), nunca genérico.
      expect(f.cta, f.id).not.toMatch(/^(abrir|ver|come(ç|c)ar|entrar)$/i);
    }
  });
});
