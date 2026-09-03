// ═══════════════════════════════════════════════════════════════════════
//  O SISTEMA DE AVISOS, FIXADO EM CÓDIGO
//  ---------------------------------------------------------------------
//  Cinco defeitos viviam aqui ao mesmo tempo, e nenhum deles dava erro:
//
//   1. QUATRO TIPOS QUE A PRODUÇÃO ESCREVE NÃO CABIAM NA TABELA.
//      `proposta`, `caso`, `pagamento_recebido`, `patamar_desbloqueado`.
//      E, porque o aviso nasce na mesma transação que o facto (é a
//      garantia da migração 047), a recusa DESFAZIA O FACTO: a proposta
//      não se enviava, o pagamento da Stripe não liquidava, o patamar
//      comprado não se aplicava, e o cron diário morria à primeira linha.
//
//   2. O PAINEL NÃO TINHA MODO ESCURO. Nem uma classe `dark:` no ficheiro:
//      um cartão branco por cima da barra lateral escura.
//
//   3. NÃO EXISTIA NO TELEMÓVEL. Vivia no rodapé da `Sidebar`, que é
//      `hidden lg:flex`.
//
//   4. O ERRO DE LEITURA ERA ENGOLIDO (`catch(() => {})`): uma falha de
//      rede dava o mesmo ecrã que «não tens avisos».
//
//   5. O GUARDIÃO FISCAL NUNCA CORREU. A rota era `POST` e não tinha
//      entrada em `vercel.json`; os Cron Jobs do Vercel fazem GET.
//
//  As garantias abaixo são de três espécies, e a mistura é de propósito:
//  as do comportamento correm a loja a sério; as de construção leem o
//  ficheiro, porque o que se quer proibir é um `dark:` que desapareça; e
//  a dos tipos delega no portão, que é quem sabe ler SQL.
//
//  A prova contra PostgreSQL a sério — que os dezanove tipos ENTRAM mesmo
//  na tabela — está em `supabase/tests/completo/03-tipos-de-notificacao.sql`.
// ═══════════════════════════════════════════════════════════════════════

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CATALOGO_NOTIFICACOES,
  TIPOS_NOTIFICACAO,
  TIPOS_NOTIFICACAO_COM_EMAIL,
  chaveGuardiao,
  descreverNotificacao,
} from "@/lib/notificacoes/catalogo";
import { quando } from "@/lib/notificacoes/tempo";

const RAIZ = join(__dirname, "..", "..", "..");
const SRC = join(RAIZ, "src");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

const SINO = ler("components", "contabilistas", "SinoNotificacoes.tsx");
const SHELL = ler("components", "dashboard", "DashboardShellClient.tsx");
const SIDEBAR = ler("components", "dashboard", "Sidebar.tsx");
const LOJA = ler("lib", "notificacoes", "loja.ts");
const GUARDIAO = ler("app", "api", "email", "guardiao", "route.ts");
const VERCEL = JSON.parse(readFileSync(join(RAIZ, "vercel.json"), "utf8"));

/** As listas de classes de todos os `className="…"` do ficheiro. */
function classesDe(fonte: string): string[] {
  return [...fonte.matchAll(/className=\{?`?"([^"`]*)"/g)].map((m) => m[1]);
}

// ── Os duplos da camada de dados ────────────────────────────────────
//
// `vi.mock` é içado para o topo do módulo, e por isso as funções que ele
// devolve não podem fechar sobre variáveis declaradas depois. `vi.hoisted`
// é a via oficial: corre antes do mock e devolve os duplos.
//
// UM só `vi.mock` por módulo no ficheiro inteiro. Dois — um por bloco —
// não são dois: o segundo substitui o primeiro, e o primeiro bloco fica a
// chamar duplos que já não existem.
const duplos = vi.hoisted(() => ({
  listar: vi.fn(),
  escutar: vi.fn(),
  marcarUma: vi.fn(),
  marcarTodasNaNuvem: vi.fn(),
}));

vi.mock("@/lib/contabilistas/fonte/conversa", () => ({
  listarNotificacoes: (n?: number) => duplos.listar(n),
  escutarNotificacoes: (id: string, cb: (n: unknown) => void) => duplos.escutar(id, cb),
  marcarNotificacaoLida: (id: string) => duplos.marcarUma(id),
  marcarTodasLidas: () => duplos.marcarTodasNaNuvem(),
}));

const aviso = (id: string, lida = false) => ({
  id,
  tipo: "consulta_pedida",
  titulo: `Aviso ${id}`,
  corpo: null,
  url: "/dashboard",
  lidaEm: lida ? new Date().toISOString() : null,
  criadoEm: new Date().toISOString(),
});

// ═══════════════════════════════════════════════════════════════════════

describe("Defeito 1 · os tipos que a produção escreve cabem na tabela", () => {
  it("o portão dos tipos passa", () => {
    // Delegado de propósito: quem sabe ler as migrações, o catálogo e as
    // rotas é o script. Repetir aqui a análise dava duas implementações
    // da mesma regra — e um dia divergiam, que é o defeito original.
    const r = spawnSync("node", ["scripts/check-notificacoes.mjs"], {
      cwd: RAIZ,
      encoding: "utf8",
    });
    expect(r.stdout + r.stderr).toContain("OK — as três listas dizem o mesmo.");
    expect(r.status).toBe(0);
  });

  it.each(["proposta", "caso", "pagamento_recebido", "patamar_desbloqueado"])(
    "«%s» — o tipo que a tabela recusava — está declarado",
    (tipo) => {
      expect(TIPOS_NOTIFICACAO).toContain(tipo);
    },
  );

  it("os dois avisos que perderam o email em silêncio voltaram a tê-lo", () => {
    // A 20260825090000 reescreveu `aviso_merece_email` a partir da lista de
    // 047 e apagou estes dois sem o dizer no cabeçalho.
    expect(TIPOS_NOTIFICACAO_COM_EMAIL).toContain("consulta_local_mudou");
    expect(TIPOS_NOTIFICACAO_COM_EMAIL).toContain("proposta_desbloqueio_decidida");
  });

  it("quem merece email é subconjunto de quem existe", () => {
    for (const tipo of TIPOS_NOTIFICACAO_COM_EMAIL) {
      expect(TIPOS_NOTIFICACAO).toContain(tipo);
    }
  });

  it("uma conversa não manda um email por linha", () => {
    // Não é gosto: é o que faz alguém desligar TODOS os avisos.
    expect(TIPOS_NOTIFICACAO_COM_EMAIL).not.toContain("mensagem");
    expect(TIPOS_NOTIFICACAO_COM_EMAIL).not.toContain("partilha_recebida");
  });

  it("todos os tipos têm ícone e exigência, e o ícone existe no sino", () => {
    const mapa = SINO.slice(
      SINO.indexOf("export const ICONES_AVISO"),
      SINO.indexOf("};", SINO.indexOf("export const ICONES_AVISO")),
    );
    for (const tipo of TIPOS_NOTIFICACAO) {
      const d = CATALOGO_NOTIFICACOES[tipo];
      expect(d, `«${tipo}» sem descrição`).toBeTruthy();
      expect(mapa, `o ícone «${d.icone}» de «${tipo}» não está em ICONES_AVISO`)
        .toContain(d.icone);
    }
  });

  it("um tipo mais novo do que este código aparece na mesma", () => {
    // Uma aplicação em cache num telemóvel pode receber por Realtime um
    // tipo que só existe desde ontem. Devolver `undefined` apagava-o do
    // ecrã — e o que se perdia era sempre o aviso mais recente.
    const d = descreverNotificacao("tipo_que_ainda_nao_existe");
    expect(d.icone).toBe("BellAlert");
    expect(d.exigencia).toBe("saber");
  });
});

// ═══════════════════════════════════════════════════════════════════════

describe("Defeito 2 · o modo escuro do sino vem da camada, não de `dark:`", () => {
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ ESTA SECÇÃO JÁ AFIRMOU O CONTRÁRIO, E ESTAVA ERRADA                │
  // │                                                                   │
  // │ O sino não tinha uma única classe `dark:`, e isso parece um        │
  // │ componente sem modo escuro. Não é: o modo escuro deste projeto é   │
  // │ uma camada de override `.dark` em `globals.css` que remapeia os    │
  // │ neutros para uma palete QUENTE — `.dark .bg-white` é #1e221b,      │
  // │ `.dark .text-ink` é #f2f0e8, e os hovers todos que este ficheiro   │
  // │ usa (`hover:bg-cream`, `hover:bg-stone-100`, `hover:bg-brand-      │
  // │ light`) estão cobertos no mesmo sítio.                             │
  // │                                                                   │
  // │ Escrever `dark:bg-stone-900` contorna essa camada E GANHA-LHE: a   │
  // │ variante do Tailwind sai depois no CSS compilado com a mesma       │
  // │ especificidade. O resultado é uma segunda palete escura, fria, a   │
  // │ um clique da primeira — que é exatamente o defeito que             │
  // │ `contabilistas-painel-coerencia.test.ts` já existia para apanhar.  │
  // │                                                                   │
  // │ Fica aqui a garantia pelo lado de dentro, com a razão escrita, e   │
  // │ o número: zero.                                                    │
  // └───────────────────────────────────────────────────────────────────┘

  it("o ficheiro não tem uma única classe `dark:`", () => {
    const listas = classesDe(SINO);
    const comDark = listas.filter((c) => /\bdark:/.test(c));
    expect(comDark, `listas de classes com «dark:»:\n${comDark.join("\n")}`).toEqual([]);
  });

  it("e usa os neutros que a camada `.dark` remapeia", () => {
    // A prova de que o modo escuro CHEGA lá: as superfícies do painel são
    // as que `globals.css` cobre. Trocá-las por hex fixos ou por uma cor
    // que a camada não conhece seria o mesmo defeito ao contrário.
    // Sobre a fonte inteira: a linha de cada aviso monta as classes numa
    // constante (`classe`), fora de um `className="…"`, e é lá que vive o
    // `hover:bg-cream`.
    for (const neutro of ["bg-white", "border-stone-200", "text-ink", "hover:bg-cream"]) {
      expect(SINO, `«${neutro}» deixou de ser usado`).toContain(neutro);
    }
    const css = readFileSync(join(SRC, "app", "globals.css"), "utf8");
    expect(css).toMatch(/\.dark \.bg-white \{/);
    expect(css).toMatch(/\.dark \.text-ink,/);
    expect(css).toMatch(/hover:bg-cream"\]:hover/);
  });
});

// ═══════════════════════════════════════════════════════════════════════

describe("Defeito 3 · o sino existe no telemóvel", () => {
  it("está montado no cabeçalho do painel, que é o do telemóvel", () => {
    expect(SHELL).toMatch(/<SinoNotificacoes\s*\/>/);
    expect(SHELL).toMatch(/import SinoNotificacoes from/);
  });

  it("e continua na barra lateral, para o computador", () => {
    expect(SIDEBAR).toMatch(/<SinoNotificacoes\s*\/>/);
  });

  it("dois sinos montados não são dois canais Realtime", () => {
    // A regra antiga era «exatamente um sino por layout», guardada por um
    // teste que contava tags — e era ela que mantinha o sino fora do
    // telemóvel. A garantia passou a ser estrutural: o canal é da loja,
    // que o abre ao primeiro subscritor e o fecha ao último.
    expect(SINO).not.toMatch(/escutarNotificacoes/);
    expect(LOJA).toMatch(/escutarNotificacoes/);
    expect(LOJA).toMatch(/ouvintes\.size === 1/);
    expect(LOJA).toMatch(/ouvintes\.size === 0/);
  });

  it("no telemóvel a folha sai por portal, e não fica atrás da barra de baixo", () => {
    // O sino vive num cabeçalho `sticky z-40`, que é um contexto de
    // empilhamento: nenhum `z-index` de um filho seu passa por cima da
    // barra de navegação inferior, que é irmã do cabeçalho e vem depois no
    // DOM. Sem portal, o fundo da folha ficava escondido atrás dos cinco
    // lugares — e é lá que está o «ver mais antigos».
    expect(SINO).toMatch(/createPortal\(conteudo, document\.body\)/);
    expect(SINO).toMatch(/ehFolha \? createPortal/);
    // A decisão vem de `matchMedia` num efeito: no servidor não existe, e
    // decidi-la durante a hidratação dava uma árvore diferente da servida.
    expect(SINO).toMatch(/useState\(false\)/);
    expect(SINO).toMatch(/matchMedia\("\(max-width: 639px\)"\)/);
    // Acima de `sm` NÃO há portal: a pastilha é `absolute` e tem de ficar
    // ancorada ao botão.
    expect(SINO).toMatch(/sm:absolute/);
  });

  it("o clique fora não fecha o painel quando o clique é dentro dele", () => {
    // Com o portal, a folha deixa de estar dentro da caixa do botão — e o
    // detetor de «clicou fora» passava a apanhar cliques na própria folha.
    expect(SINO).toMatch(/painel\.current\?\.contains\(alvo\)/);
  });

  it("o painel é folha inferior no telemóvel e pastilha no computador", () => {
    // A regra 5b do CLAUDE.md: folha inferior, corpo com `min-h-0` dentro
    // de um `max-h-[…dvh]`, e a área segura respeitada.
    expect(SINO).toMatch(/max-h-\[85dvh\]/);
    expect(SINO).toMatch(/rounded-t-4xl/);
    expect(SINO).toMatch(/min-h-0 flex-1 overflow-y-auto/);
    expect(SINO).toMatch(/env\(safe-area-inset-bottom\)/);
    expect(SINO).toMatch(/sm:absolute/);
  });

  it("o sino tem a medida dos vizinhos, e o cabeçalho tem espaço para ele", () => {
    // `ThemeToggle` e `BotaoNovidades` são `h-9 w-9`. Um sino de `h-10 w-10`
    // não era só inconsistente: a 320px encolhia o logótipo do cabeçalho de
    // 115px para 104px — o `flex` não transborda, esmaga.
    expect(SINO).toMatch(/h-9 w-9 items-center justify-center rounded-xl text-stone-500/);
    expect(SINO).not.toMatch(/h-10 w-10/);
    // E a linha do cabeçalho aperta-se onde é preciso.
    expect(SHELL).toMatch(/px-4 py-3\.5 backdrop-blur-xl sm:px-5/);
    expect(SHELL).toMatch(/gap-1\.5 sm:gap-2/);
    // Os alvos nunca encolhem; quem cede, quando um administrador põe cinco
    // numa linha de 320px, é a PALAVRA do logótipo — que corta.
    expect(SHELL).toMatch(/flex shrink-0 items-center gap-1\.5/);
    expect(SHELL).toMatch(/flex min-w-0 shrink items-center overflow-hidden/);
    // E nunca a marca: um logótipo que muda de tamanho conforme o que está
    // ao lado deixa de ser um logótipo.
    expect(ler("components", "ui", "Icons.tsx"))
      .toMatch(/<LogoMark size=\{sz\} className="shrink-0" \/>/);
  });

  it("os alvos de toque não descem abaixo de 36px", () => {
    // A regra 5b do CLAUDE.md. Só os BOTÕES: o distintivo da contagem é
    // um `<span aria-hidden>` de 16px e não se toca nele.
    //
    // Tailwind: `h-8` = 2rem = 32px, e é o que estava no botão de fechar.
    // O piso é 36px — `h-9` — ou `min-h-9` quando a altura é do conteúdo.
    const botoes = [...SINO.matchAll(/<button[\s\S]*?>/g)]
      .map((m) => /className="([^"]*)"/.exec(m[0])?.[1])
      .filter((c): c is string => Boolean(c));
    expect(botoes.length).toBeGreaterThan(2);

    for (const classes of botoes) {
      const altura = /\b(?:min-)?h-(\d+)\b/.exec(classes);
      if (altura) {
        expect(Number(altura[1]), `alvo abaixo de 36px: ${classes}`).toBeGreaterThanOrEqual(9);
        continue;
      }
      // Sem altura fixa, a altura vem do conteúdo mais o `padding`. Uma
      // linha de texto a 12px com `py-2.5` dá 36px certos; abaixo disso,
      // não se pode afirmar que chega — e afirmar é o que este teste faz.
      const py = /\bpy-(\d(?:\.\d)?)\b/.exec(classes);
      expect(py, `botão sem altura nem padding vertical: ${classes}`).not.toBeNull();
      expect(Number(py![1]), `padding vertical insuficiente: ${classes}`)
        .toBeGreaterThanOrEqual(2.5);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════

describe("Defeito 4 · a loja distingue «falhou» de «não há nada»", () => {
  const { listar, escutar, marcarUma, marcarTodasNaNuvem } = duplos;
  let loja: typeof import("@/lib/notificacoes/loja");

  beforeEach(async () => {
    // A loja é de módulo: cada caso repõe-na antes de a exercer.
    loja = await import("@/lib/notificacoes/loja");
    loja.reporParaTestes();
    listar.mockReset().mockResolvedValue([]);
    escutar.mockReset().mockReturnValue(() => {});
    marcarUma.mockReset().mockResolvedValue(undefined);
    marcarTodasNaNuvem.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => loja.reporParaTestes());

  it("uma leitura falhada dá «erro», não uma lista vazia", async () => {
    listar.mockRejectedValue(new Error("rede"));
    loja.subscrever(() => {});
    loja.definirConta("u1");
    await vi.waitFor(() => expect(loja.instantaneoDosAvisos().estado).toBe("erro"));
    // O sintoma que isto guarda: «erro» e «pronto com zero» eram o mesmo
    // ecrã, e o mesmo ecrã diz a coisa errada metade das vezes.
    expect(loja.instantaneoDosAvisos().estado).not.toBe("pronto");
  });

  it("e o «tentar outra vez» volta a ler", async () => {
    listar.mockRejectedValueOnce(new Error("rede")).mockResolvedValue([aviso("a")]);
    loja.subscrever(() => {});
    loja.definirConta("u1");
    await vi.waitFor(() => expect(loja.instantaneoDosAvisos().estado).toBe("erro"));

    loja.recarregar();
    await vi.waitFor(() => expect(loja.instantaneoDosAvisos().estado).toBe("pronto"));
    expect(loja.instantaneoDosAvisos().avisos).toHaveLength(1);
  });

  it("sem sessão o estado é «inativo» e não «pronto com zero»", () => {
    loja.definirConta(null);
    expect(loja.instantaneoDosAvisos().estado).toBe("inativo");
  });
});

// ═══════════════════════════════════════════════════════════════════════

describe("A loja · uma subscrição, muitos sinos", () => {
  const { listar, escutar, marcarUma, marcarTodasNaNuvem } = duplos;
  const cancelar = vi.fn();
  let loja: typeof import("@/lib/notificacoes/loja");

  beforeEach(async () => {
    loja = await import("@/lib/notificacoes/loja");
    loja.reporParaTestes();
    listar.mockReset().mockResolvedValue([aviso("a"), aviso("b", true)]);
    marcarUma.mockReset().mockResolvedValue(undefined);
    marcarTodasNaNuvem.mockReset().mockResolvedValue(undefined);
    cancelar.mockReset();
    escutar.mockReset().mockReturnValue(cancelar);
  });

  afterEach(() => loja.reporParaTestes());

  it("dois subscritores abrem UM canal", async () => {
    loja.definirConta("u1");
    const sair1 = loja.subscrever(() => {});
    const sair2 = loja.subscrever(() => {});
    await vi.waitFor(() => expect(loja.instantaneoDosAvisos().estado).toBe("pronto"));

    expect(escutar).toHaveBeenCalledTimes(1);
    sair1();
    // Ainda há um sino no ecrã: o canal não pode fechar.
    expect(cancelar).not.toHaveBeenCalled();
    sair2();
    expect(cancelar).toHaveBeenCalledTimes(1);
  });

  it("o «por ler» conta só o que não foi lido", async () => {
    loja.subscrever(() => {});
    loja.definirConta("u1");
    await vi.waitFor(() => expect(loja.instantaneoDosAvisos().estado).toBe("pronto"));
    expect(loja.instantaneoDosAvisos().porLer).toBe(1);
  });

  it("marcar como lida apaga o ponto no instante do clique", async () => {
    loja.subscrever(() => {});
    loja.definirConta("u1");
    await vi.waitFor(() => expect(loja.instantaneoDosAvisos().porLer).toBe(1));

    loja.marcarLida("a");
    // Sem `await`: é otimista de propósito. Esperar pela rede para apagar
    // um ponto faz o clique parecer que não funcionou.
    expect(loja.instantaneoDosAvisos().porLer).toBe(0);
  });

  it("um aviso repetido pelo Realtime não entra duas vezes", async () => {
    let entregar: ((n: unknown) => void) | null = null;
    escutar.mockImplementation((_id: string, cb: (n: unknown) => void) => {
      entregar = cb;
      return cancelar;
    });
    loja.subscrever(() => {});
    loja.definirConta("u1");
    await vi.waitFor(() => expect(entregar).not.toBeNull());
    await vi.waitFor(() => expect(loja.instantaneoDosAvisos().estado).toBe("pronto"));

    const novo = aviso("c");
    entregar!(novo);
    entregar!(novo); // reconexão: o Realtime repete
    expect(loja.instantaneoDosAvisos().avisos.filter((x) => x.id === "c")).toHaveLength(1);
  });

  it("trocar de conta esvazia a lista", async () => {
    loja.subscrever(() => {});
    loja.definirConta("u1");
    await vi.waitFor(() => expect(loja.instantaneoDosAvisos().avisos).toHaveLength(2));

    // Os avisos da conta anterior no ecrã da seguinte são de outra pessoa.
    listar.mockResolvedValue([]);
    loja.definirConta("u2");
    expect(loja.instantaneoDosAvisos().avisos).toHaveLength(0);
    expect(cancelar).toHaveBeenCalled();
  });

  it("uma leitura lenta da conta anterior não escreve na seguinte", async () => {
    // A corrida: `definirConta('u1')` pede a lista, a pessoa sai e entra
    // noutra conta, e a resposta da PRIMEIRA chega depois. Sem a geração,
    // os avisos de u1 apareciam a u2.
    let resolverU1: ((v: unknown[]) => void) | null = null;
    listar.mockImplementationOnce(() => new Promise((r) => { resolverU1 = r; }));
    loja.subscrever(() => {});
    loja.definirConta("u1");
    await vi.waitFor(() => expect(resolverU1).not.toBeNull());

    listar.mockResolvedValue([]);
    loja.definirConta("u2");
    resolverU1!([aviso("da-conta-anterior")]);
    await Promise.resolve();

    expect(loja.instantaneoDosAvisos().avisos.map((a) => a.id))
      .not.toContain("da-conta-anterior");
  });

  it("o instantâneo é estável entre leituras (useSyncExternalStore)", () => {
    // Devolver um objeto novo a cada leitura põe o React em ciclo.
    expect(loja.instantaneoDosAvisos()).toBe(loja.instantaneoDosAvisos());
  });
});

// ═══════════════════════════════════════════════════════════════════════

describe("Defeito 5 · o Guardião Fiscal corre mesmo", () => {
  it("está agendado — era esta a linha que faltava", () => {
    const caminhos = (VERCEL.crons ?? []).map((c: { path: string }) => c.path);
    expect(caminhos).toContain("/api/email/guardiao");
  });

  it("responde a GET, porque é o que o Cron Job do Vercel faz", () => {
    // Era só `POST`. Um agendamento a apontar-lhe daria 405 todos os dias
    // — e não havia agendamento nenhum, por isso nem 405 dava.
    expect(GUARDIAO).toMatch(/export async function GET\(/);
    expect(GUARDIAO).toMatch(/export async function POST\(/);
  });

  it("acende o sino além de mandar o email", () => {
    expect(GUARDIAO).toMatch(/avisar_utilizador_uma_vez/);
    expect(GUARDIAO).toMatch(/p_tipo: "guardiao_iva"/);
  });

  it("o aviso do sino é por ano e por nível, e não por dia", () => {
    // O cron corre todos os dias e a mesma pessoa continua acima de 80%
    // todos os dias. Sem chave, eram trezentos avisos iguais por ano.
    expect(GUARDIAO).toMatch(/p_chave: chaveGuardiao\(year, item\.nivel\)/);
    expect(chaveGuardiao(2026, "critico")).toBe("guardiao:2026:critico");
    expect(chaveGuardiao(2026, "aviso")).not.toBe(chaveGuardiao(2026, "critico"));
    expect(chaveGuardiao(2027, "aviso")).not.toBe(chaveGuardiao(2026, "aviso"));
  });

  it("continua fechado a quem não traz o segredo do cron", () => {
    expect(GUARDIAO).toMatch(/cronAutorizado\(req\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════

describe("Defeito 6 · «desligar os avisos» passou a existir", () => {
  const CONTA = ler("app", "dashboard", "conta", "page.tsx");
  const INTERRUPTOR = ler("components", "conta", "AvisosPorEmail.tsx");
  const TEMPLATES = ler("lib", "email", "templates.ts");
  const MIGRACAO = readFileSync(
    join(RAIZ, "supabase/migrations/20260903103000_desligar_os_avisos_por_email.sql"),
    "utf8",
  );

  it("a página para onde o `List-Unsubscribe` aponta tem o interruptor", () => {
    // `URL_GERIR_AVISOS` é `/dashboard/conta`, e vai no rodapé de cada
    // email e no cabeçalho que o Gmail mostra como «cancelar subscrição».
    // Apontava para uma página onde não havia nada que cancelasse nada.
    expect(TEMPLATES).toMatch(/URL_GERIR_AVISOS = `\$\{SITE\}\/dashboard\/conta`/);
    expect(CONTA).toMatch(/<AvisosPorEmail \/>/);
  });

  it("o interruptor é um `switch` de verdade, com estado dito por extenso", () => {
    expect(INTERRUPTOR).toMatch(/role="switch"/);
    expect(INTERRUPTOR).toMatch(/aria-checked=\{ativo\}/);
    expect(INTERRUPTOR).toMatch(/aria-labelledby="conta-avisos-rotulo"/);
    // A posição de um botão não é legível a quem não o vê.
    expect(INTERRUPTOR).toMatch(/aria-live="polite"/);
  });

  it("um erro de leitura não desenha o interruptor «desligado»", () => {
    // Quem o visse assim carregava a pensar que desligava e ligava.
    expect(INTERRUPTOR).toMatch(/erro-leitura/);
    expect(INTERRUPTOR).toMatch(/Não conseguimos ler a tua preferência/);
  });

  it("desligar vale também para o que já estava em fila", () => {
    // Só o gatilho não chegava: o primeiro email a chegar DEPOIS de alguém
    // carregar no interruptor é o que faz essa pessoa carregar em «spam».
    expect(MIGRACAO).toMatch(/FUNCTION public\.avisos_email_reclamar/);
    expect(MIGRACAO).toMatch(/AND public\.avisos_por_email_ativos\(n\.user_id\)/);
  });

  it("e o Guardião, que não passa pela fila, pergunta à parte", () => {
    expect(GUARDIAO).toMatch(/contas_com_avisos_por_email/);
    // Falhar a pergunta não pode significar «manda a toda a gente».
    expect(GUARDIAO).toMatch(/if \(erroOptIn\)/);
  });

  it("o sino não se desliga — só o email", () => {
    // O sino é onde se VAI ver se aconteceu alguma coisa. Desligá-lo era
    // desligar a funcionalidade em vez da interrupção.
    expect(MIGRACAO).not.toMatch(/sino_ativo|notificacoes_ativas|in_app_ativo/);
    expect(INTERRUPTOR).toMatch(/Continuam todos no sino/);
  });

  it("a tabela nova está declarada no catálogo dos dados da conta", () => {
    // `conta-catalogo.test.ts` reprova uma tabela com dono que fique de
    // fora; esta está em `FORA_DO_CATALOGO` com a razão escrita, porque
    // apagá-la à parte LIGARIA os emails em vez de apagar seja o que for.
    const catalogo = ler("lib", "conta", "catalogo.ts");
    expect(catalogo).toMatch(/preferencias_avisos:/);
  });
});

// ═══════════════════════════════════════════════════════════════════════

describe("O carimbo de tempo", () => {
  const base = Date.parse("2026-09-03T12:00:00Z");
  const ha = (ms: number) => new Date(base - ms).toISOString();

  it.each([
    [0, "agora"],
    [30_000, "agora"],
    [5 * 60_000, "há 5 min"],
    [59 * 60_000, "há 59 min"],
    [3 * 3_600_000, "há 3 h"],
    [23 * 3_600_000, "há 23 h"],
    [30 * 3_600_000, "ontem"],
  ])("passados %ims lê-se «%s»", (ms, esperado) => {
    expect(quando(ha(ms as number), base)).toBe(esperado);
  });

  it("acima de 48 h passa a data", () => {
    // O formato exato é do `Intl` e varia com o ICU do ambiente («29/08»
    // aqui, «29 ago» noutro). O que importa é que deixou de ser relativo.
    const texto = quando(ha(5 * 86_400_000), base);
    expect(texto).not.toMatch(/^há |^agora$|^ontem$/);
    expect(texto).toMatch(/\d/);
  });

  it("um relógio adiantado não diz «há -1 min»", () => {
    expect(quando(new Date(base + 90_000).toISOString(), base)).toBe("agora");
  });

  it("uma data inválida não escreve «Invalid Date» no ecrã", () => {
    expect(quando("nem-por-isso", base)).toBe("");
  });
});
