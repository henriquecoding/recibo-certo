import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_ROUTES, GUIA_SLUGS } from "@/lib/seo";
import { guiaSemCorpo } from "@/lib/guias/expansao/derivar";
import { ORIGEM_CANONICA } from "@/lib/origem";

// ═══════════════════════════════════════════════════════════════════════
//  A coerência entre o que EXISTE, o que se SUBMETE e o que se RECUSA
//  ---------------------------------------------------------------------
//  Três registos descrevem o mesmo site a partir de sítios diferentes:
//
//   · `src/app/**` — as rotas que existem de facto;
//   · `PUBLIC_ROUTES` → sitemap.xml — o que pedimos ao motor para indexar;
//   · `PRIVADAS` → robots.txt — o que lhe pedimos para não rastrear.
//
//  Nenhum deles deriva dos outros, e por isso podem divergir em silêncio.
//  Divergiram: `/investidores` era submetido ao Google enquanto a própria
//  página servia `robots: { index: false }`, e o painel do contabilista
//  (`/contabilista/*`) não constava do robots.txt de todo.
//
//  Um sitemap que se contradiz não falha um build nem quebra um ecrã. O
//  custo aparece meses depois, na forma de rastreio desperdiçado e de um
//  motor que aprendeu a confiar menos em tudo o resto que lhe submetemos.
//  É o mesmo raciocínio que tirou a data do build do `lastmod`.
// ═══════════════════════════════════════════════════════════════════════

const RAIZ = process.cwd();
const APP = join(RAIZ, "src", "app");

/**
 * O diretório que serve um caminho, resolvendo segmentos dinâmicos.
 *
 * Nem toda a rota do sitemap tem uma pasta com o seu nome: os 57 guias
 * antigos têm rota própria, mas os 112 da expansão são servidos por
 * `/guias/[slug]`. O Next dá precedência ao segmento estático sobre o
 * dinâmico, e é essa ordem que se replica aqui — procurar só a pasta exata
 * dava 112 falsos positivos e tornava o teste inútil.
 */
function dirDaRota(rota: string): string | null {
  let dir = APP;
  for (const seg of rota.split("/").filter(Boolean)) {
    if (existsSync(join(dir, seg))) {
      dir = join(dir, seg);
      continue;
    }
    const dinamico = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith("["))
      .map((e) => e.name)[0];
    if (!dinamico) return null;
    dir = join(dir, dinamico);
  }
  return dir;
}

/** O ficheiro de rota de um caminho público, se existir. */
function ficheiroDaRota(rota: string): string | null {
  const dir = dirDaRota(rota);
  if (!dir) return null;
  const page = join(dir, "page.tsx");
  return existsSync(page) ? page : null;
}

/** A página e o layout que a envolve — os dois sítios onde o `noindex` pode viver. */
function fontesQueDefinemMetadados(rota: string): string[] {
  const page = ficheiroDaRota(rota);
  if (!page) return [];
  const fontes = [page];
  // Os metadados herdam-se: um `index: false` no layout do segmento vale para
  // a página inteira, mesmo que o `page.tsx` não diga nada. Foi assim que o
  // `/investidores` ficou `noindex` — a instrução está no layout.
  let dir = dirDaRota(rota)!;
  while (dir.startsWith(APP)) {
    const layout = join(dir, "layout.tsx");
    // O layout raiz declara `index: true` para todo o site; não é um noindex.
    if (existsSync(layout) && dir !== APP) fontes.push(layout);
    if (dir === APP) break;
    dir = join(dir, "..");
  }
  return fontes;
}

describe("sitemap: o que se submete existe e aceita ser indexado", () => {
  it("toda a rota do sitemap tem uma página real", () => {
    // Uma entrada sem página é um 404 entregue ao Google por escrito.
    const fantasmas = PUBLIC_ROUTES
      .filter((r) => !r.path.includes("["))
      .filter((r) => ficheiroDaRota(r.path) === null)
      .map((r) => r.path);
    expect(fantasmas).toEqual([]);
  });

  it("nenhuma rota estática do sitemap se declara noindex", () => {
    // A regressão verdadeira: `/investidores` esteve submetido no sitemap com
    // prioridade 0.6 enquanto o seu layout servia `robots: { index: false }`.
    // Pedir a indexação de uma página que recusa ser indexada é gastar
    // rastreio para ser mandado embora à chegada.
    //
    // Só as rotas ESTÁTICAS se verificam por leitura do ficheiro: nelas o
    // `metadata` é um literal, e ler `index: false` no texto é ler a decisão.
    // Numa rota dinâmica a decisão é uma função do slug — `/guias/[slug]`
    // contém `index: false` numa condição que só vale para guias sem corpo, e
    // procurá-lo no texto acusaria os 112 guias legítimos. Essa família tem o
    // seu próprio teste, feito com o predicado a sério.
    const contraditorias: string[] = [];
    for (const r of PUBLIC_ROUTES) {
      const dir = dirDaRota(r.path);
      if (!dir || dir.includes("[")) continue;
      for (const fonte of fontesQueDefinemMetadados(r.path)) {
        if (/index:\s*false/.test(readFileSync(fonte, "utf8"))) {
          contraditorias.push(r.path);
          break;
        }
      }
    }
    expect(contraditorias).toEqual([]);
  });

  it("nenhum guia do sitemap é um andaime sem corpo", () => {
    // A mesma contradição da `/investidores`, mas multiplicada por 112 e
    // servida por uma rota dinâmica. `GUIA_SLUGS` filtra por `guiaSemCorpo` e
    // `generateMetadata` decide o `noindex` pelo MESMO predicado — hoje não
    // podem divergir. Este teste é o que garante que continuam a ser o mesmo:
    // se um dia o sitemap passar a filtrar por outra coisa (por `status`, como
    // já filtrou), um guia por escrever volta a ser submetido ao Google.
    const andaimes = GUIA_SLUGS.filter((slug) => guiaSemCorpo(slug));
    expect(andaimes).toEqual([]);
  });

  it("as prioridades e frequências são valores legais", () => {
    for (const r of PUBLIC_ROUTES) {
      expect(r.priority, r.path).toBeGreaterThanOrEqual(0);
      expect(r.priority, r.path).toBeLessThanOrEqual(1);
      expect(["weekly", "monthly", "yearly"], r.path).toContain(r.changeFrequency);
    }
  });

  it("nenhuma rota aparece duas vezes", () => {
    const vistos = PUBLIC_ROUTES.map((r) => r.path);
    expect(vistos.length).toBe(new Set(vistos).size);
  });

  it("todos os caminhos são relativos e sem barra final", () => {
    // `${SITE_URL}${path}` só produz um URL válido se o caminho começar por
    // uma barra e não acabar noutra — caso contrário nascem `//` ou `/rota/`,
    // que o canónico da própria página contradiz.
    for (const r of PUBLIC_ROUTES) {
      expect(r.path.startsWith("/"), r.path).toBe(true);
      expect(r.path === "/" || !r.path.endsWith("/"), r.path).toBe(true);
      expect(r.path.includes("//"), r.path).toBe(false);
    }
  });
});

describe("robots.txt: o que é privado é recusado", () => {
  const fonteRobots = readFileSync(join(APP, "robots.ts"), "utf8");
  const privadas = [
    ...(/const PRIVADAS = \[([\s\S]*?)\];/.exec(fonteRobots)?.[1] ?? "")
      .matchAll(/"([^"]+)"/g),
  ].map((m) => m[1]);

  it("a lista foi lida (senão o resto deste describe não prova nada)", () => {
    expect(privadas.length).toBeGreaterThan(0);
  });

  /** Uma regra de robots.txt cobre este caminho? (`$` = fim exato.) */
  const coberto = (caminho: string) =>
    privadas.some((regra) =>
      regra.endsWith("$") ? caminho === regra.slice(0, -1) : caminho.startsWith(regra),
    );

  // As áreas do produto que exigem sessão. `contabilista` no singular é o
  // painel privado; `contabilistas` no plural é o diretório público — e a
  // distinção entre os dois é exatamente o que torna esta lista delicada.
  const AREAS_PRIVADAS = ["dashboard", "admin", "contabilista"];

  it("toda a página sob uma área privada está coberta, incluindo a raiz", () => {
    const descobertas: string[] = [];
    for (const area of AREAS_PRIVADAS) {
      const base = join(APP, area);
      if (!existsSync(base)) continue;
      const porVisitar = [base];
      while (porVisitar.length) {
        const dir = porVisitar.pop()!;
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) porVisitar.push(join(dir, e.name));
        }
        if (existsSync(join(dir, "page.tsx"))) {
          const rota = "/" + dir.slice(APP.length + 1);
          if (!coberto(rota)) descobertas.push(rota);
        }
      }
    }
    // A raiz de um painel é o caso que escapa: `Disallow: /dashboard/`
    // corresponde a `/dashboard/recibos` e NÃO a `/dashboard`.
    expect(descobertas).toEqual([]);
  });

  it("o diretório público de contabilistas continua rastreável", () => {
    // O reverso do teste anterior. Ao fechar `/contabilista`, é trivial fechar
    // por acidente `/contabilistas` — o diretório que queremos indexado, e que
    // está no sitemap.
    expect(coberto("/contabilistas")).toBe(false);
    expect(coberto("/contabilistas/candidatura")).toBe(false);
    for (const r of PUBLIC_ROUTES) {
      expect(coberto(r.path), `${r.path} está no sitemap mas bloqueado no robots.txt`).toBe(false);
    }
  });

  it("a origem não é re-declarada — vem de origem.ts (RC-CFG-001)", () => {
    // Uma segunda cópia do host mantém-se certa até ao dia em que a primeira
    // muda. Aí o `Host:` e o `Sitemap:` passam a apontar para um domínio que o
    // site já não serve, sem erro nenhum.
    expect(fonteRobots).toMatch(/from "@\/lib\/origem"/);
    const codigo = fonteRobots
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(codigo, "a origem voltou a ser escrita à mão no robots.ts")
      .not.toMatch(/=\s*"https:\/\//);
    expect(ORIGEM_CANONICA.endsWith("/"), "a origem canónica não pode ter barra final").toBe(false);
  });
});
