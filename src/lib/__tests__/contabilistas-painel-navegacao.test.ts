// ═══════════════════════════════════════════════════════════════════════
//  A ARRUMAÇÃO DO PAINEL — o que agrupar NÃO pode custar
//  ---------------------------------------------------------------------
//  O painel passou de dez destinos planos para seis secções. Agrupar é
//  barato de escrever e caro de errar: a forma como isto se estraga não é
//  com um erro de build, é com uma página que continua a existir, continua
//  a responder no endereço dela, e deixa de ter caminho a partir do
//  produto. Ninguém dá por isso — a rota funciona, os testes dela passam,
//  e a funcionalidade some-se na mesma.
//
//  Estes testes fixam três coisas:
//
//   1. TODA a página do painel tem um destino na navegação. É a garantia
//      contra a perda silenciosa: acrescentar uma rota sem a arrumar em
//      lado nenhum falha aqui, e não daqui a três meses.
//   2. Os dez destinos que existiam antes continuam a existir, no mesmo
//      endereço. Reorganizar não é renomear nem apagar.
//   3. A doca do telemóvel cabe no ecrã. Era esta a razão de tudo — dez
//      destinos rolavam na horizontal, e o que rola esconde.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DESTINOS, SECCOES, SEM_CONTAGENS, destinoAtivo, hrefDaSeccao,
  porResponderNaSeccao, seccaoDoCaminho,
} from "@/components/contabilistas/navegacao";

const SRC = join(__dirname, "..", "..");
const BASE = "/contabilista";
const DEMO = "/admin/contabilista";

/** Sem traduzir nada: o painel real. */
const identidade = (destino: string) => destino;
/** A tradução que `usarPainel` faz quando o painel abre na demonstração. */
const paraDemonstracao = (destino: string) =>
  destino === BASE ? DEMO : destino.startsWith(`${BASE}/`) ? DEMO + destino.slice(BASE.length) : destino;

/**
 * As rotas verdadeiras, lidas do disco.
 *
 * Uma lista escrita à mão aqui provaria apenas que eu sei copiar. Lida do
 * sistema de ficheiros, uma página nova sem destino faz este teste falhar
 * no dia em que é criada.
 *
 * As rotas dinâmicas (`[id]`) ficam de fora de propósito: a ficha de um
 * cliente não é um destino de navegação, chega-se lá a partir da lista.
 */
function rotasDoPainel(): string[] {
  const raiz = join(SRC, "app", "contabilista");
  const saida: string[] = [];

  function percorrer(diretorio: string, url: string) {
    for (const nome of readdirSync(diretorio)) {
      const caminho = join(diretorio, nome);
      if (statSync(caminho).isDirectory()) {
        if (nome.startsWith("[")) continue;
        percorrer(caminho, `${url}/${nome}`);
      } else if (nome === "page.tsx") {
        saida.push(url);
      }
    }
  }

  percorrer(raiz, BASE);
  return saida.sort();
}

describe("nenhuma página do painel fica sem caminho", () => {
  it("toda a rota do painel tem um destino na navegação", () => {
    const comDestino = new Set(DESTINOS.map((d) => d.href));
    const orfas = rotasDoPainel().filter((r) => !comDestino.has(r));
    expect(
      orfas,
      `rotas sem lugar na navegação: ${orfas.join(", ")}\n` +
        "Uma página sem destino continua a responder no endereço dela e " +
        "desaparece do produto. Arruma-a numa secção em navegacao.tsx.",
    ).toEqual([]);
  });

  it("nenhum destino aponta para uma rota que não existe", () => {
    const reais = new Set(rotasDoPainel());
    const partidos = DESTINOS.filter((d) => !reais.has(d.href)).map((d) => d.href);
    expect(partidos, `destinos sem página: ${partidos.join(", ")}`).toEqual([]);
  });

  /**
   * A lista de antes da reorganização, congelada.
   *
   * Não é redundante com o teste acima: aquele prova que o que existe está
   * arrumado, este prova que o que existia não foi renomeado nem fundido
   * num sítio onde deixasse de ser alcançável por endereço. Um marcador
   * antigo tem de continuar a abrir.
   */
  it("os dez destinos de antes continuam todos lá, no mesmo endereço", () => {
    const ANTES = [
      "/contabilista",
      "/contabilista/clientes",
      "/contabilista/casos",
      "/contabilista/agenda",
      "/contabilista/trabalho",
      "/contabilista/partilhas",
      "/contabilista/fidelidade",
      "/contabilista/pagamentos",
      "/contabilista/progressao",
      "/contabilista/perfil",
    ];
    const agora = new Set(DESTINOS.map((d) => d.href));
    const perdidos = ANTES.filter((h) => !agora.has(h));
    expect(perdidos, `destinos perdidos na reorganização: ${perdidos.join(", ")}`).toEqual([]);
  });

  it("a paleta de pesquisa indexa as folhas, e não as secções", () => {
    // Uma pesquisa que só chegasse ao nível de cima obrigava a passar por
    // uma secção — o trabalho que ela existe para poupar.
    expect(DESTINOS.length).toBeGreaterThanOrEqual(SECCOES.length);
    const layout = readFileSync(join(SRC, "components", "contabilista", "MolduraContabilista.tsx"), "utf8");
    expect(layout).toContain("destinos={DESTINOS}");
  });

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ O NOME DA NAVEGAÇÃO E O NOME DA PÁGINA TÊM DE SER O MESMO          │
   * │                                                                   │
   * │ Apanhado no smoke a 360 px: a secção passou a chamar-se «Trabalho» │
   * │ e o quadro de tarefas ficou como «Tarefas» na navegação — mas o    │
   * │ `<h1>` da página continuava a dizer «Trabalho». No telemóvel isso  │
   * │ lê-se de seguida: a linha de secção oferece «Casos · Tarefas», a   │
   * │ pessoa carrega em «Tarefas», e o título por baixo responde         │
   * │ «Trabalho» — que é o nome da SECÇÃO, uma linha acima.              │
   * │                                                                   │
   * │ Não parte nada, não dá erro, e faz a pessoa duvidar de onde está.  │
   * │ Um título mais completo é aceite («Progressão» → «Progressão e     │
   * │ comissão»); um título DIFERENTE não.                              │
   * └───────────────────────────────────────────────────────────────────┘
   */
  it("o título de cada página começa pelo nome que a navegação lhe dá", () => {
    const divergentes: string[] = [];

    for (const d of DESTINOS) {
      // O «Hoje» é a workspace: o título é o nome da vista escolhida pela
      // pessoa («Meu dia», «Fecho mensal»), e não um literal.
      if (d.href === BASE) continue;

      const ficheiro = join(SRC, "app", ...d.href.slice(1).split("/"), "page.tsx");
      const fonte = readFileSync(ficheiro, "utf8");

      // Duas formas de dar título no painel: `CabecalhoPainel` (a regra) e
      // um `<h1>` à mão (o Perfil, que tem um cabeçalho ilustrado próprio).
      //
      // O `titulo=` tem de estar preso ao `<CabecalhoPainel`: sem isso, o
      // primeiro `titulo="…"` do ficheiro podia ser o de um bloco lá dentro
      // — no Perfil era «Identidade profissional», que não é o da página.
      const doCabecalho = /<CabecalhoPainel[\s\S]{0,500}?titulo="([^"]+)"/.exec(fonte)?.[1];
      const doH1 = /<h1[^>]*>\s*([^<{][^<]*?)\s*<\/h1>/.exec(fonte)?.[1];
      const titulo = doCabecalho ?? doH1;

      if (!titulo) { divergentes.push(`${d.href}: não encontrei título nenhum`); continue; }
      if (!titulo.startsWith(d.label)) {
        divergentes.push(`${d.href}: navegação diz «${d.label}», página diz «${titulo}»`);
      }
    }

    expect(divergentes, divergentes.join("\n")).toEqual([]);
  });

  it("cada destino tem uma linha que diz o que ali se resolve", () => {
    // É o que a paleta mostra por baixo do nome. Sem ela, um resultado
    // «Fidelidade» obriga a abrir para saber se era aquilo.
    const mudos = DESTINOS.filter((d) => d.descricao.trim().length < 20).map((d) => d.href);
    expect(mudos, `sem descrição utilizável: ${mudos.join(", ")}`).toEqual([]);
  });
});

describe("a doca do telemóvel cabe no ecrã", () => {
  it("são no máximo seis secções", () => {
    // A conta está no `.mobileItem` do módulo CSS: a 3 rem de base, seis
    // lugares e cinco intervalos cabem em 320 px. Sete não cabem, e a
    // barra volta a rolar — que é o problema que isto resolveu.
    expect(SECCOES.length).toBeLessThanOrEqual(6);
  });

  it("o rótulo curto de cada secção cabe num lugar da doca", () => {
    // ~3,7 rem de lugar a 0,625 rem de fonte. Acima de dez caracteres o
    // rótulo é truncado e a secção passa a chamar-se «Recebiment…».
    const longos = SECCOES.filter((s) => s.curto.length > 10).map((s) => s.curto);
    expect(longos, `rótulos que não cabem: ${longos.join(", ")}`).toEqual([]);
  });

  it("a doca deixou de precisar de JavaScript para se explicar", () => {
    // Havia um `scrollIntoView({ inline: "center" })` a trazer o destino
    // ativo ao meio da doca, porque metade dos destinos vivia fora do
    // ecrã. Uma barra de navegação que precisa disso não é uma barra de
    // navegação — é uma lista com um penso.
    //
    // A asserção é sobre o `inline: "center"`, que é a assinatura desse
    // gesto, e não sobre `scrollIntoView`: o layout continua a usá-lo para
    // trazer à vista um campo que a proteção de texto recusou, e esse é
    // outro assunto.
    const layout = readFileSync(join(SRC, "components", "contabilista", "MolduraContabilista.tsx"), "utf8");
    const codigo = layout.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(codigo).not.toContain('inline: "center"');
  });
});

describe("cada secção sabe onde aterra e o que tem à espera", () => {
  it("uma secção aterra sempre no primeiro destino que tem", () => {
    for (const s of SECCOES) {
      expect(hrefDaSeccao(s), `secção ${s.id} sem destino`).toBe(s.destinos[0].href);
    }
  });

  it("nenhuma secção está vazia", () => {
    const vazias = SECCOES.filter((s) => s.destinos.length === 0).map((s) => s.id);
    expect(vazias).toEqual([]);
  });

  it("nenhum destino aparece em duas secções", () => {
    const vistos = new Set<string>();
    const repetidos: string[] = [];
    for (const d of DESTINOS) {
      if (vistos.has(d.href)) repetidos.push(d.href);
      vistos.add(d.href);
    }
    expect(repetidos, `em duas secções: ${repetidos.join(", ")}`).toEqual([]);
  });

  it("a contagem da secção é a soma do que está por responder lá dentro", () => {
    // Sem isto, um pedido em «Partilhas» ficava invisível enquanto a
    // secção «Clientes» não fosse aberta.
    const contagens = { pedidos: 3, partilhasPorLer: 2, consultasPorConfirmar: 4 };
    const clientes = SECCOES.find((s) => s.id === "clientes")!;
    expect(porResponderNaSeccao(clientes, contagens)).toBe(5);

    const agenda = SECCOES.find((s) => s.id === "agenda")!;
    expect(porResponderNaSeccao(agenda, contagens)).toBe(4);
  });

  it("sem nada por responder, nenhuma secção inventa um número", () => {
    for (const s of SECCOES) {
      expect(porResponderNaSeccao(s, SEM_CONTAGENS), s.id).toBe(0);
    }
  });
});

describe("qual é o destino aberto", () => {
  it("a raiz do painel não acende em todos os ecrãs", () => {
    // `/contabilista` é prefixo de tudo o resto. Com `startsWith` puro, o
    // «Hoje» ficava aceso na Agenda, nos Casos e no Perfil ao mesmo tempo.
    expect(destinoAtivo(BASE, BASE, BASE)).toBe(true);
    expect(destinoAtivo(BASE, "/contabilista/agenda", BASE)).toBe(false);
  });

  it("a ficha de um cliente acende o destino «Clientes»", () => {
    expect(destinoAtivo("/contabilista/clientes", "/contabilista/clientes/abc-123", BASE)).toBe(true);
  });

  it("um endereço parecido não acende o destino errado", () => {
    // `startsWith("/contabilista/trabalho")` dizia que sim a
    // `/contabilista/trabalhos`. A fronteira é a barra, não o texto.
    expect(destinoAtivo("/contabilista/trabalho", "/contabilista/trabalhos", BASE)).toBe(false);
  });

  it("cada rota do painel cai na secção certa", () => {
    const esperado: Record<string, string> = {
      "/contabilista": "hoje",
      "/contabilista/clientes": "clientes",
      "/contabilista/clientes/abc-123": "clientes",
      "/contabilista/partilhas": "clientes",
      "/contabilista/casos": "trabalho",
      "/contabilista/trabalho": "trabalho",
      "/contabilista/agenda": "agenda",
      "/contabilista/pagamentos": "negocio",
      "/contabilista/fidelidade": "negocio",
      "/contabilista/progressao": "negocio",
      "/contabilista/perfil": "perfil",
    };
    for (const [caminho, id] of Object.entries(esperado)) {
      expect(seccaoDoCaminho(caminho, BASE, identidade)?.id, caminho).toBe(id);
    }
  });

  /**
   * O painel tem duas moradas: `/contabilista` e `/admin/contabilista`,
   * onde a administração o abre com dados inventados. É o MESMO módulo
   * re-exportado — portanto a navegação tem de acender igual nas duas, ou
   * a demonstração deixa de dizer a verdade sobre o original.
   */
  it("a mesma arrumação vale na demonstração", () => {
    expect(seccaoDoCaminho("/admin/contabilista", DEMO, paraDemonstracao)?.id).toBe("hoje");
    expect(seccaoDoCaminho("/admin/contabilista/fidelidade", DEMO, paraDemonstracao)?.id).toBe("negocio");
    expect(seccaoDoCaminho("/admin/contabilista/partilhas", DEMO, paraDemonstracao)?.id).toBe("clientes");
    // E a raiz da demonstração também não acende em todo o lado.
    expect(destinoAtivo(DEMO, "/admin/contabilista/agenda", DEMO)).toBe(false);
  });
});
