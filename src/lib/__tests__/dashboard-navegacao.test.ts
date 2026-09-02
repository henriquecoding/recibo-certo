import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DESTINOS_SEMPRE,
  ETAPAS_NEGOCIO,
  GRUPOS_DASHBOARD,
  ITENS_CONTA,
  ITENS_EXPLORAR,
  MAXIMO_DESTINOS_SEMPRE,
  NAV_DASHBOARD,
  SLOTS_MOVEL,
  SLOTS_MOVEL_DASHBOARD,
  grupoAAbrir,
  itemAtivoDashboard,
} from "@/lib/dashboard/navegacao";
import { CATALOGO_FERRAMENTAS } from "@/lib/ferramentas";
import { CHAVES_ICONES } from "@/components/ferramentas/icon-map";

// ═══════════════════════════════════════════════════════════════════════
//  AS INVARIANTES DA NAVEGAÇÃO DO PAINEL
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ISTO EXISTE PARA IMPEDIR                               │
//  │                                                                     │
//  │ A sidebar era um array dentro de um Client Component, e o hub da     │
//  │ visão geral desenhava as ferramentas da superfície `hub` — a         │
//  │ PÚBLICA — enquanto o catálogo já tinha uma superfície `dashboard`    │
//  │ que ninguém lia. Três regras paralelas para a mesma pergunta: o que  │
//  │ aparece no painel?                                                   │
//  │                                                                     │
//  │ Uma rota nova podia existir sem aparecer em lado nenhum, ou aparecer │
//  │ na superfície errada, e nada reprovava. Passa a reprovar aqui.        │
//  └─────────────────────────────────────────────────────────────────────┘

const RAIZ = join(process.cwd(), "src");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("dashboard:navegacao — integridade do manifesto", () => {
  it("não tem ids nem rotas repetidas", () => {
    const ids = NAV_DASHBOARD.map((i) => i.id);
    const hrefs = NAV_DASHBOARD.map((i) => i.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("cada ícone é uma chave que existe", () => {
    for (const item of [...NAV_DASHBOARD, ...SLOTS_MOVEL_DASHBOARD]) {
      expect(CHAVES_ICONES, `${item.id} usa um ícone inexistente`).toContain(item.icone);
    }
  });

  it("nenhum destino é ao mesmo tempo principal e externo", () => {
    for (const item of DESTINOS_SEMPRE) {
      expect(item.externo, `${item.id} é «sempre» e externo`).toBeUndefined();
    }
  });

  it("os destinos internos vivem todos debaixo de /dashboard", () => {
    for (const item of NAV_DASHBOARD.filter((i) => !i.externo)) {
      expect(item.href.startsWith("/dashboard")).toBe(true);
    }
  });

  it("todo o item pertence a um grupo, ao rodapé ou a explorar", () => {
    const emGrupos = new Set(GRUPOS_DASHBOARD.flatMap((g) => g.itens).map((i) => i.id));
    const noRodape = new Set([...ITENS_CONTA, ...ITENS_EXPLORAR].map((i) => i.id));
    for (const item of NAV_DASHBOARD) {
      expect(emGrupos.has(item.id) || noRodape.has(item.id), `${item.id} está órfão`).toBe(true);
    }
  });
});

describe("dashboard:navegacao — o teto do que se vê de uma vez", () => {
  it("não passa dos destinos sempre visíveis declarados", () => {
    expect(DESTINOS_SEMPRE.length).toBeLessThanOrEqual(MAXIMO_DESTINOS_SEMPRE);
  });

  it("os grupos recolhíveis são recolhíveis e os principais não", () => {
    const porId = new Map(GRUPOS_DASHBOARD.map((g) => [g.id, g]));
    expect(porId.get("principal")?.recolhivel).toBe(false);
    expect(porId.get("negocio")?.recolhivel).toBe(false);
    expect(porId.get("atividade")?.recolhivel).toBe(false);
    expect(porId.get("decidir")?.recolhivel).toBe(true);
    expect(porId.get("apoio")?.recolhivel).toBe(true);
  });

  it("a barra do telemóvel tem quatro destinos e o quinto lugar é o menu", () => {
    expect(SLOTS_MOVEL_DASHBOARD.length).toBe(SLOTS_MOVEL - 1);
    const shell = ler("components", "dashboard", "NavMovelDashboard.tsx");
    expect(shell).toContain("Abrir menu completo");
  });
});

describe("dashboard:navegacao — as quatro etapas do negócio", () => {
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ «PLANEAR UMA CONTRATAÇÃO» É UMA ETAPA, NÃO UM SIMULADOR            │
  // │                                                                   │
  // │ Estava enterrada entre os simuladores, ao lado das heranças. É o   │
  // │ quarto passo do mesmo arco — descobrir, pôr preço, montar o        │
  // │ projeto, contratar a primeira pessoa — e o único em que o negócio  │
  // │ deixa de caber numa pessoa só. Se algum dia sair daqui, isto       │
  // │ reprova.                                                           │
  // └───────────────────────────────────────────────────────────────────┘
  it("são exatamente descobrir, preço, projeto e contratar, por essa ordem", () => {
    expect(ETAPAS_NEGOCIO.map((i) => i.id)).toEqual(["descobrir", "precos", "negocio", "contratar"]);
  });

  it("todas são destinos de primeira classe, nunca escondidas num grupo", () => {
    for (const etapa of ETAPAS_NEGOCIO) {
      expect(etapa.visibilidade, `${etapa.id} deixou de ser sempre visível`).toBe("sempre");
    }
  });

  it("o hub móvel mostra as mesmas quatro etapas, pela mesma fonte", () => {
    // A secção é UMA e serve as duas superfícies: se o hub tivesse a sua
    // própria lista, a visão geral e o telemóvel podiam divergir sobre
    // onde a pessoa ficou — que é o defeito que este trabalho corrige.
    const hub = ler("app", "dashboard", "construir", "HubNegocio.tsx");
    expect(hub).toContain("SeccaoNegocio");
    const seccao = ler("components", "dashboard", "SeccaoNegocio.tsx");
    expect(seccao).toContain("ETAPAS_NEGOCIO");
  });
});

describe("dashboard:navegacao — a ligação ao catálogo das ferramentas", () => {
  it("cada toolId existe no catálogo", () => {
    const ids = new Set(CATALOGO_FERRAMENTAS.map((f) => f.id));
    for (const item of NAV_DASHBOARD.filter((i) => i.toolId)) {
      expect(ids, `${item.id} aponta para um toolId inexistente`).toContain(item.toolId!);
    }
  });

  it("uma ferramenta com superfície «dashboard» declara para onde vai", () => {
    for (const f of CATALOGO_FERRAMENTAS.filter((x) => x.surfaces.includes("dashboard"))) {
      expect(f.dashboardHref, `${f.id} promete o painel e não diz onde`).toBeTruthy();
    }
  });

  it("todo o dashboardHref tem dono — no manifesto ou numa rota que existe", () => {
    const doManifesto = new Set(NAV_DASHBOARD.map((i) => i.href));
    for (const f of CATALOGO_FERRAMENTAS.filter((x) => x.dashboardHref)) {
      const href = f.dashboardHref!;
      const temDono = doManifesto.has(href) || [...doManifesto].some((d) => href.startsWith(`${d}/`));
      expect(temDono, `${f.id} aponta para ${href}, que não pertence a nenhum destino`).toBe(true);
    }
  });

  it("Descobrir e Preço declaram o painel — era a promessa por cumprir", () => {
    for (const id of ["descobrir-negocio", "calcular-preco", "planeador-contratacao"]) {
      const f = CATALOGO_FERRAMENTAS.find((x) => x.id === id)!;
      expect(f.surfaces, `${id} não declara a superfície dashboard`).toContain("dashboard");
      expect(f.dashboardHref, `${id} não tem destino no painel`).toBeTruthy();
    }
  });
});

describe("dashboard:navegacao — a rota ativa é determinística", () => {
  it("a visão geral só acende na visão geral", () => {
    expect(itemAtivoDashboard("/dashboard")?.id).toBe("visao-geral");
    expect(itemAtivoDashboard("/dashboard/precos")?.id).toBe("precos");
  });

  it("uma subrota acende o destino mais específico, e só um", () => {
    expect(itemAtivoDashboard("/dashboard/precos/novo")?.id).toBe("precos");
    expect(itemAtivoDashboard("/dashboard/casos/abc")?.id).toBe("casos");
    expect(itemAtivoDashboard("/dashboard/contratacao")?.id).toBe("contratar");
  });

  it("tolera a barra final e desconhece o que não é do painel", () => {
    expect(itemAtivoDashboard("/dashboard/prazos/")?.id).toBe("prazos");
    expect(itemAtivoDashboard("/guias")).toBeNull();
    expect(itemAtivoDashboard(null)).toBeNull();
  });

  it("uma rota dentro de um grupo fechado manda abri-lo", () => {
    expect(grupoAAbrir("/dashboard/herancas")).toBe("decidir");
    expect(grupoAAbrir("/dashboard/auditoria-recibo")).toBe("apoio");
    // Um destino sempre visível não abre grupo nenhum: não está fechado.
    expect(grupoAAbrir("/dashboard/precos")).toBeNull();
  });
});

describe("dashboard:navegacao — nenhuma rota se perdeu na reestruturação", () => {
  // A sidebar antiga tinha 27 destinos. Reduzir o que se VÊ não pode
  // reduzir o que se ALCANÇA: cada rota de então continua no manifesto,
  // ainda que dentro de um grupo recolhido ou no rodapé.
  const ANTIGAS = [
    "/dashboard", "/dashboard/cenarios", "/dashboard/recibos", "/dashboard/receitas",
    "/dashboard/precos", "/dashboard/prazos", "/dashboard/casos", "/dashboard/contabilista",
    "/dashboard/recibos-verdes", "/dashboard/simulador", "/dashboard/recibo-vencimento",
    "/dashboard/negocio", "/dashboard/empresa", "/dashboard/herancas", "/dashboard/comparar",
    "/dashboard/regime-simplificado", "/dashboard/ato-isolado", "/dashboard/auditoria-recibo",
    "/dashboard/classificar-atividade", "/dashboard/mapa-contabilistas",
    "/ferramentas/payout-mor", "/ferramentas", "/guias", "/quiz-fiscal",
    "/dashboard/perfil", "/dashboard/conta", "/dashboard/upgrade",
  ];

  it("todas as 27 continuam alcançáveis", () => {
    const atuais = new Set(NAV_DASHBOARD.map((i) => i.href));
    for (const href of ANTIGAS) {
      expect(atuais, `${href} desapareceu da navegação`).toContain(href);
    }
  });

  it("e as duas rotas novas do arco entraram", () => {
    const atuais = new Set(NAV_DASHBOARD.map((i) => i.href));
    expect(atuais).toContain("/dashboard/descobrir");
    expect(atuais).toContain("/dashboard/contratacao");
  });
});

describe("dashboard:navegacao — o manifesto não pode pagar bundle", () => {
  it("não importa React, motores nem o catálogo", () => {
    const fonte = ler("lib", "dashboard", "navegacao.ts");
    const imports = fonte.match(/^import .*$/gm) ?? [];
    expect(imports, "o manifesto ganhou importações e vive no shell de todas as páginas").toEqual([]);
    expect(fonte).not.toContain('"use client"');
  });
});
