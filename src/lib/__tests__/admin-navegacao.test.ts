// ═══════════════════════════════════════════════════════════════════════
//  A ARRUMAÇÃO DA ADMINISTRAÇÃO — o que agrupar NÃO pode custar
//  ---------------------------------------------------------------------
//  O painel passou de dez destinos planos para seis secções. Agrupar é
//  barato de escrever e caro de errar: a forma como isto se estraga não é
//  com um erro de build, é com uma página que continua a existir, continua
//  a responder no endereço dela, e deixa de ter caminho a partir do
//  produto. Ninguém dá por isso — a rota funciona e a funcionalidade
//  some-se na mesma.
//
//  É o mesmo contrato que `contabilistas-painel-navegacao.test.ts` fixou
//  para o painel de contabilista. Escrito à parte porque as duas molduras
//  têm rotas e exclusões diferentes; deliberadamente parecido porque o
//  problema é o mesmo.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BASE_ADMIN, DESTINOS_ADMIN, SECCOES_ADMIN,
  destinoAtivoAdmin, destinoDoCaminhoAdmin, hrefDaSeccaoAdmin, seccaoDoCaminhoAdmin,
} from "@/components/admin/navegacao";

const SRC = join(__dirname, "..", "..");

/**
 * Rotas que vivem debaixo de `/admin` e NÃO são destinos de navegação.
 *
 * Cada uma com o motivo: uma exclusão sem razão escrita é a forma de a
 * próxima página órfã entrar sem ninguém reparar.
 */
const FORA_DA_MOLDURA: { prefixo: string; porque: string }[] = [
  {
    prefixo: "/admin/login",
    porque: "É o portão. O layout devolve-o sem moldura — não há navegação para ele.",
  },
  {
    prefixo: "/admin/contabilista",
    porque:
      "Espelho de demonstração do painel de contabilista. Traz a moldura DELE " +
      "(`eDemonstracao`), com barra, separadores e doca próprios.",
  },
  {
    prefixo: "/admin/parceiros",
    porque:
      "Sistema antigo. `/admin/parceiros` redireciona para `/admin/anuncios`, que é " +
      "o destino que a navegação oferece.",
  },
];

/** As rotas verdadeiras, lidas do disco. Uma lista à mão só provaria que sei copiar. */
function rotasDoAdmin(): string[] {
  const raiz = join(SRC, "app", "admin");
  const saida: string[] = [];

  function percorrer(diretorio: string, url: string) {
    for (const nome of readdirSync(diretorio)) {
      const caminho = join(diretorio, nome);
      if (statSync(caminho).isDirectory()) {
        // As rotas dinâmicas ficam de fora: a ficha de um anúncio não é um
        // destino de navegação, chega-se lá a partir da lista.
        if (nome.startsWith("[")) continue;
        percorrer(caminho, `${url}/${nome}`);
      } else if (nome === "page.tsx") {
        saida.push(url);
      }
    }
  }

  percorrer(raiz, BASE_ADMIN);
  return saida.sort();
}

/** Uma rota está coberta se É um destino ou vive DENTRO de um. */
function coberta(rota: string): boolean {
  return DESTINOS_ADMIN.some((d) => destinoAtivoAdmin(d.href, rota));
}

describe("nenhuma página da administração fica sem caminho", () => {
  it("toda a rota do painel tem um destino na navegação", () => {
    const orfas = rotasDoAdmin().filter(
      (r) => !coberta(r) && !FORA_DA_MOLDURA.some((e) => r === e.prefixo || r.startsWith(`${e.prefixo}/`)),
    );
    expect(
      orfas,
      `rotas sem lugar na navegação: ${orfas.join(", ")}\n` +
        "Uma página sem destino continua a responder no endereço dela e " +
        "desaparece do produto. Arruma-a numa secção em components/admin/navegacao.tsx.",
    ).toEqual([]);
  });

  it("nenhum destino aponta para uma rota que não existe", () => {
    const reais = new Set(rotasDoAdmin());
    const partidos = DESTINOS_ADMIN.filter((d) => !reais.has(d.href)).map((d) => d.href);
    expect(partidos, `destinos sem página: ${partidos.join(", ")}`).toEqual([]);
  });

  /**
   * A lista de antes da reorganização, congelada.
   *
   * Prova que o que existia não foi renomeado nem fundido num sítio onde
   * deixasse de ser alcançável por endereço. Um marcador antigo tem de
   * continuar a abrir.
   */
  it("os dez destinos de antes continuam todos lá, no mesmo endereço", () => {
    const ANTES = [
      "/admin",
      "/admin/painel",
      "/admin/contas",
      "/admin/propostas",
      "/admin/casos",
      "/admin/contabilistas",
      "/admin/anuncios",
      "/admin/reportes",
      "/admin/waitlist",
      "/admin/auditoria",
    ];
    const agora = new Set(DESTINOS_ADMIN.map((d) => d.href));
    const perdidos = ANTES.filter((h) => !agora.has(h));
    expect(perdidos, `destinos perdidos na reorganização: ${perdidos.join(", ")}`).toEqual([]);
  });
});

describe("a doca do telemóvel cabe no ecrã", () => {
  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ ERA ISTO QUE ESTAVA PARTIDO                                        │
   * │                                                                   │
   * │ A doca declarava `grid-cols-6` e recebia DEZ destinos. Seis        │
   * │ colunas com dez itens dão duas linhas: ~130 px de barra contra     │
   * │ 96 px reservados (`pb-24`), e o fim de cada página ficava por      │
   * │ baixo da navegação.                                               │
   * └───────────────────────────────────────────────────────────────────┘
   */
  it("são no máximo seis secções", () => {
    // Seis lugares e cinco intervalos cabem em 320 px com alvo ≥44 px.
    // Sete não cabem, e a barra volta a rolar ou a partir para duas linhas.
    expect(SECCOES_ADMIN.length).toBeLessThanOrEqual(6);
  });

  it("a doca declara exatamente tantas colunas quantas as secções", () => {
    // O acoplamento que partiu o telemóvel: a grelha e a lista viviam em
    // sítios diferentes e ninguém as comparava.
    const layout = readFileSync(join(SRC, "app", "admin", "layout.tsx"), "utf8");
    expect(layout).toContain(`grid-cols-${SECCOES_ADMIN.length}`);
  });

  it("o rótulo curto de cada secção cabe num lugar da doca", () => {
    // ~3,7 rem de lugar a 0,625 rem de fonte. Acima de dez caracteres o
    // rótulo é truncado e a secção passa a chamar-se «Candidatur…».
    const longos = SECCOES_ADMIN.filter((s) => s.curto.length > 10).map((s) => s.curto);
    expect(longos, `rótulos que não cabem: ${longos.join(", ")}`).toEqual([]);
  });

  it("a doca respeita a área segura do telemóvel", () => {
    // As outras duas molduras já o faziam. Sem isto, a última linha fica
    // por baixo do indicador de gestos.
    const layout = readFileSync(join(SRC, "app", "admin", "layout.tsx"), "utf8");
    expect(layout).toContain("env(safe-area-inset-bottom)");
  });

  it("o conteúdo reserva espaço para a doca", () => {
    // `pb-24` (96 px) era para uma barra de uma linha e ficou a servir uma
    // de duas. O `main` tem de reservar mais do que a doca ocupa.
    const layout = readFileSync(join(SRC, "app", "admin", "layout.tsx"), "utf8");
    expect(layout).toMatch(/<main[^>]*\bpb-2[8-9]|<main[^>]*\bpb-3\d/);
  });
});

describe("cada secção sabe onde aterra", () => {
  it("uma secção aterra sempre no primeiro destino que tem", () => {
    for (const s of SECCOES_ADMIN) {
      expect(hrefDaSeccaoAdmin(s), `secção ${s.id} sem destino`).toBe(s.destinos[0].href);
    }
  });

  it("nenhuma secção está vazia", () => {
    const vazias = SECCOES_ADMIN.filter((s) => s.destinos.length === 0).map((s) => s.id);
    expect(vazias).toEqual([]);
  });

  it("nenhum destino aparece em duas secções", () => {
    const vistos = new Set<string>();
    const repetidos: string[] = [];
    for (const d of DESTINOS_ADMIN) {
      if (vistos.has(d.href)) repetidos.push(d.href);
      vistos.add(d.href);
    }
    expect(repetidos, `em duas secções: ${repetidos.join(", ")}`).toEqual([]);
  });

  /**
   * O ícone é o único diferenciador a 18 px na doca e na linha de secção.
   *
   * A moldura antiga dava `Briefcase` a «Propostas» E a «Triagem de casos»,
   * e `ShieldCheck` a «Contabilistas» E a «Auditoria fiscal» — quatro
   * destinos, dois desenhos.
   */
  it("nenhum destino repete o ícone de outro", () => {
    const porIcone = new Map<unknown, string[]>();
    for (const d of DESTINOS_ADMIN) {
      porIcone.set(d.Icon, [...(porIcone.get(d.Icon) ?? []), d.label]);
    }
    const repetidos = [...porIcone.values()].filter((l) => l.length > 1);
    expect(repetidos, `destinos com o mesmo ícone: ${repetidos.map((l) => l.join(" = ")).join("; ")}`).toEqual([]);
  });

  it("nenhuma secção repete o ícone de outra", () => {
    const icones = SECCOES_ADMIN.map((s) => s.Icon);
    expect(new Set(icones).size, "duas secções com o mesmo desenho na doca").toBe(icones.length);
  });

  it("cada destino tem uma linha que diz o que ali se resolve", () => {
    const mudos = DESTINOS_ADMIN.filter((d) => d.descricao.trim().length < 20).map((d) => d.href);
    expect(mudos, `sem descrição utilizável: ${mudos.join(", ")}`).toEqual([]);
  });
});

describe("qual é o destino aberto", () => {
  it("a raiz não acende em todos os ecrãs", () => {
    // `/admin` é prefixo de tudo o resto. Com `startsWith` puro, a «Visão
    // geral» ficava acesa nas Contas, nos Casos e na Auditoria ao mesmo
    // tempo — que era o que a moldura antiga fazia.
    expect(destinoAtivoAdmin("/admin", "/admin")).toBe(true);
    expect(destinoAtivoAdmin("/admin", "/admin/contas")).toBe(false);
  });

  it("uma sub-página acende o destino que a contém", () => {
    expect(destinoAtivoAdmin("/admin/anuncios", "/admin/anuncios/novo")).toBe(true);
    expect(destinoAtivoAdmin("/admin/anuncios", "/admin/anuncios/abc-123")).toBe(true);
  });

  it("um endereço parecido não acende o destino errado", () => {
    // `startsWith("/admin/contas")` dizia que sim a `/admin/contas-antigas`.
    // A fronteira é a barra, não o texto.
    expect(destinoAtivoAdmin("/admin/contas", "/admin/contas-antigas")).toBe(false);
    // E o par que já existe no produto: `/admin/contabilista` (demonstração)
    // não pode acender `/admin/contabilistas` (candidaturas).
    expect(destinoAtivoAdmin("/admin/contabilistas", "/admin/contabilista")).toBe(false);
    expect(destinoAtivoAdmin("/admin/contabilistas", "/admin/contabilista/agenda")).toBe(false);
  });

  it("cada rota cai na secção certa", () => {
    const esperado: Record<string, string> = {
      "/admin": "visao",
      "/admin/painel": "medicao",
      "/admin/casos": "triagem",
      "/admin/contabilistas": "triagem",
      "/admin/reportes": "triagem",
      "/admin/contas": "pessoas",
      "/admin/waitlist": "pessoas",
      "/admin/propostas": "pessoas",
      "/admin/anuncios": "site",
      "/admin/anuncios/novo": "site",
      "/admin/auditoria": "fiscal",
    };
    for (const [caminho, id] of Object.entries(esperado)) {
      expect(seccaoDoCaminhoAdmin(caminho)?.id, caminho).toBe(id);
    }
  });

  it("uma rota de fora da moldura não inventa secção", () => {
    // O login e o espelho de demonstração não têm secção. Quem chama tem
    // de aguentar `undefined` sem partir.
    expect(seccaoDoCaminhoAdmin("/admin/login")).toBeUndefined();
    expect(seccaoDoCaminhoAdmin("/admin/contabilista")).toBeUndefined();
    expect(destinoDoCaminhoAdmin("/admin/login")).toBeUndefined();
  });
});

describe("o nome da navegação e o nome da página são o mesmo", () => {
  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ Apanhado no painel de contabilista, e vale igual aqui: a linha de  │
   * │ secção oferece «Reportes», a pessoa carrega, e o título por baixo  │
   * │ responde outra coisa. Não parte nada, não dá erro, e faz a pessoa  │
   * │ duvidar de onde está.                                             │
   * │                                                                   │
   * │ Um título mais completo é aceite («Propostas» → «Propostas de      │
   * │ investidores»); um título DIFERENTE não.                          │
   * └───────────────────────────────────────────────────────────────────┘
   */
  it("o título de cada página começa pelo nome que a navegação lhe dá", () => {
    const divergentes: string[] = [];

    for (const d of DESTINOS_ADMIN) {
      const ficheiro = join(SRC, "app", ...d.href.slice(1).split("/"), "page.tsx");
      const fonte = readFileSync(ficheiro, "utf8");

      // O `titulo=` tem de estar preso ao `<CabecalhoAdmin`: sem isso, o
      // primeiro `titulo="…"` do ficheiro podia ser o de um bloco lá dentro.
      const doCabecalho = /<CabecalhoAdmin[\s\S]{0,400}?titulo="([^"]+)"/.exec(fonte)?.[1];
      // Um `<h1>` que comece por `{` é uma expressão (o nome de uma pessoa,
      // por exemplo) e não um título literal desta página.
      const doH1 = /<h1[^>]*>\s*([^<{][^<]*?)\s*<\/h1>/.exec(fonte)?.[1];
      const titulo = doCabecalho ?? doH1;

      if (!titulo) { divergentes.push(`${d.href}: não encontrei título nenhum`); continue; }
      if (!titulo.startsWith(d.label)) {
        divergentes.push(`${d.href}: navegação diz «${d.label}», página diz «${titulo}»`);
      }
    }

    expect(divergentes, divergentes.join("\n")).toEqual([]);
  });

  /**
   * As dez páginas abrem da mesma maneira.
   *
   * Antes não abriam: três tamanhos de título, dois pesos e três cores —
   * e a diferença era a ordem por que as páginas foram escritas.
   */
  it("todas as páginas usam o mesmo cabeçalho", () => {
    const sem: string[] = [];
    for (const d of DESTINOS_ADMIN) {
      const fonte = readFileSync(join(SRC, "app", ...d.href.slice(1).split("/"), "page.tsx"), "utf8");
      if (!fonte.includes("<CabecalhoAdmin")) sem.push(d.href);
    }
    expect(
      sem,
      `páginas com cabeçalho próprio: ${sem.join(", ")}\n` +
        "Usa `CabecalhoAdmin` — é o que garante rótulo, título e barra de topo iguais.",
    ).toEqual([]);
  });
});

describe("as três superfícies leem a mesma arrumação", () => {
  it("o layout não escreve uma segunda lista de destinos", () => {
    // A regressão que isto impede: alguém acrescenta um destino à doca e
    // esquece a barra lateral, e as duas passam a discordar.
    const layout = readFileSync(join(SRC, "app", "admin", "layout.tsx"), "utf8");
    expect(layout).toContain("SECCOES_ADMIN");
    // O `NAV` inline que existia antes tinha `href:` e `label:` no layout.
    const codigo = layout.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(codigo).not.toMatch(/const NAV\s*=/);
  });

  it("as duas navegações fixas têm nome", () => {
    // Duas `<nav>` sem `aria-label` anunciam-se as duas como «navegação», e
    // quem ouve não sabe qual é qual.
    const layout = readFileSync(join(SRC, "app", "admin", "layout.tsx"), "utf8");
    const navs = layout.match(/<nav\b[^>]*>/g) ?? [];
    const semNome = navs.filter((n) => !n.includes("aria-label"));
    expect(semNome, `<nav> sem aria-label: ${semNome.join(" | ")}`).toEqual([]);
  });
});
