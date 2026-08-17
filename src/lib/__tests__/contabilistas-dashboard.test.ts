// ═══════════════════════════════════════════════════════════════════════
//  DASHBOARD MODULAR — geometria, tags, validação, migração e diff
//  ---------------------------------------------------------------------
//  Domínio puro do painel personalizável. Vem do pacote de implementação
//  auditado contra a base de produção; as invariantes essenciais estão
//  repetidas em SQL na RPC `guardar_dashboard_layout`, porque a validação
//  do cliente é conveniência e não fronteira de confiança.
//
//  Relatório Mestre §5.3–5.11, §6, §8, §12.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GRID_DESKTOP, assinaturaCanonica, colide, compactarVertical, derivarLayoutTablet,
  derivarMobile, derivarTablet, migrarV1, mudou, primeiroEncaixe, proximaTag,
  resolverColisoes, validarLayout,
} from "../contabilistas/dashboard/layout";
import { MODULOS, densidadeDe, dominiosNecessarios } from "../contabilistas/dashboard/modulos";
import type { WorkspaceLayoutV2, WorkspaceWidgetInstance } from "../contabilistas/dashboard/tipos";
import {
  CODIGOS_FATAIS, CODIGOS_NORMALIZAVEIS, erroQueImpedeGravar,
  prepararParaGravar, temSobreposicao,
} from "../contabilistas/dashboard/validacao";

const RAIZ = process.cwd();

const uuid = (n: number) => `0000000${n}-0000-4000-8000-000000000000`.slice(-36);

const widget = (
  n: number, type: keyof typeof MODULOS, tag: string,
  col: number, row: number, colSpan: number, rowSpan: number,
): WorkspaceWidgetInstance => ({
  instanceId: uuid(n), type, tag, configVersion: 1,
  desktop: { col, row, colSpan, rowSpan },
});

const layoutCom = (items: WorkspaceWidgetInstance[]): WorkspaceLayoutV2 => ({
  version: 2, revision: 1,
  grid: { desktop: { ...GRID_DESKTOP }, tablet: { columns: 8, rowHeight: 52, gap: 12 } },
  items,
});

describe("dashboard — registry", () => {
  it("cada módulo tem uma tag base única de 3 letras", () => {
    const tags = Object.values(MODULOS).map((m) => m.tagBase);
    expect(new Set(tags).size).toBe(tags.length);
    for (const t of tags) expect(t).toMatch(/^[A-Z]{3}$/);
  });

  it("não existe módulo simulador — o contabilista recebe, não calcula", () => {
    const tipos = Object.keys(MODULOS);
    expect(tipos).not.toContain("simulador_irs");
    expect(tipos).not.toContain("simulador_vencimento");
    expect(tipos).toContain("simulacoes_recebidas");
  });

  it("simulações recebidas só lê partilhas", () => {
    expect(MODULOS.simulacoes_recebidas.dominios).toEqual(["partilhas"]);
  });

  // Regressão: a coluna «Consultas» do widget contava a agenda futura —
  // canceladas incluídas — enquanto a página de clientes contava as
  // realizadas. A agregação é do servidor, e é de lá que tem de vir.
  it("o resumo por cliente lê o agregado do servidor, não a agenda", () => {
    const def = MODULOS.resumo_por_cliente;
    expect(def.dominios).toContain("resumo_clientes");
    expect(def.dominios).not.toContain("agenda");
    expect(def.dominios).not.toContain("clientes");
  });

  it("min/max de span são coerentes", () => {
    for (const m of Object.values(MODULOS)) {
      expect(m.colSpan.min).toBeLessThanOrEqual(m.colSpan.max);
      expect(m.rowSpan.min).toBeLessThanOrEqual(m.rowSpan.max);
      expect(m.posicaoPadrao.colSpan).toBeGreaterThanOrEqual(m.colSpan.min);
      expect(m.posicaoPadrao.colSpan).toBeLessThanOrEqual(m.colSpan.max);
    }
  });

  it("só carrega os domínios da vista, e ignora ocultos", () => {
    const d = dominiosNecessarios([
      { type: "agenda_hoje" }, { type: "prazos_proximos" },
      { type: "estado_trabalho", hidden: true },
    ]);
    expect(d.sort()).toEqual(["agenda", "prazos"]);
  });

  it("densidade muda com a área, não só com a largura", () => {
    expect(densidadeDe(3, 2)).toBe("compact");
    expect(densidadeDe(4, 4)).toBe("normal");
    expect(densidadeDe(6, 6)).toBe("expanded");
    expect(densidadeDe(12, 6)).toBe("full");
  });
});

describe("dashboard — tags", () => {
  it("gera a sequência por tipo", () => {
    expect(proximaTag("agenda_hoje", [])).toBe("AGD-01");
    expect(proximaTag("agenda_hoje", ["AGD-01"])).toBe("AGD-02");
    expect(proximaTag("prazos_proximos", ["AGD-01", "AGD-02"])).toBe("PRZ-01");
  });

  it("reutiliza um número libertado — a tag não é um contador global", () => {
    expect(proximaTag("documentos_rever", ["DOC-01", "DOC-03"])).toBe("DOC-02");
  });
});

describe("dashboard — geometria", () => {
  it("deteta colisão", () => {
    expect(colide({ col: 1, row: 1, colSpan: 4, rowSpan: 4 },
      [{ col: 3, row: 2, colSpan: 4, rowSpan: 2 }])).toBe(true);
    expect(colide({ col: 1, row: 1, colSpan: 4, rowSpan: 4 },
      [{ col: 5, row: 1, colSpan: 4, rowSpan: 4 }])).toBe(false);
  });

  it("mover empurra só quem choca, e mantém a coluna", () => {
    const items = [
      widget(1, "agenda_hoje", "AGD-01", 1, 1, 4, 3),
      widget(2, "prazos_proximos", "PRZ-01", 1, 4, 4, 3),
      widget(3, "clientes", "CLI-01", 9, 1, 4, 3),
    ];
    items[0]!.desktop.row = 3;   // arrasta a agenda para cima dos prazos
    const out = resolverColisoes(items, uuid(1));
    expect(out.find((i) => i.tag === "PRZ-01")!.desktop.row).toBe(6);
    // o widget que não chocava não se mexeu
    expect(out.find((i) => i.tag === "CLI-01")!.desktop).toEqual({ col: 9, row: 1, colSpan: 4, rowSpan: 3 });
  });

  it("compacta buracos deixados por remoções", () => {
    const out = compactarVertical([
      widget(1, "agenda_hoje", "AGD-01", 1, 8, 4, 3),
      widget(2, "prazos_proximos", "PRZ-01", 5, 12, 4, 3),
    ]);
    expect(out.map((i) => i.desktop.row)).toEqual([1, 1]);
  });

  it("encontra o primeiro encaixe livre", () => {
    const encaixe = primeiroEncaixe(4, 3, [{ col: 1, row: 1, colSpan: 8, rowSpan: 3 }]);
    expect(encaixe).toEqual({ col: 9, row: 1, colSpan: 4, rowSpan: 3 });
  });

  it("deriva tablet a partir do desktop", () => {
    expect(derivarTablet({ col: 1, row: 1, colSpan: 12, rowSpan: 4 })).toEqual(
      { col: 1, row: 1, colSpan: 8, rowSpan: 4 });
    expect(derivarTablet({ col: 9, row: 1, colSpan: 4, rowSpan: 4 })).toEqual(
      { col: 6, row: 1, colSpan: 3, rowSpan: 4 });
  });

  // ── Regressão: o painel saía torto em tablet ─────────────────────────
  //
  // Escalar módulo a módulo não dá um painel válido. Três módulos de 4
  // colunas cabem lado a lado em doze; em oito passam a 3 cada, somam 9, e
  // não cabem. Na vista «Meu dia», ATN-01 e PRZ-01 saíam ambos a ocupar a
  // coluna 6 — e como nada aplicava nem validava o tablet, ninguém dava por
  // isso até um iPad em retrato o mostrar.
  it("a derivação por módulo sobrepõe-se — é o que motiva a de conjunto", () => {
    const atn = derivarTablet({ col: 5, row: 1, colSpan: 4, rowSpan: 4 });
    const prz = derivarTablet({ col: 9, row: 1, colSpan: 4, rowSpan: 4 });
    expect(atn).toEqual({ col: 4, row: 1, colSpan: 3, rowSpan: 4 });
    expect(prz).toEqual({ col: 6, row: 1, colSpan: 3, rowSpan: 4 });
    expect(colide(atn, [prz])).toBe(true);
  });

  it("derivarLayoutTablet não deixa dois módulos na mesma célula", () => {
    const tablet = derivarLayoutTablet([
      widget(1, "agenda_hoje", "AGD-01", 1, 1, 4, 5),
      widget(2, "precisam_atencao", "ATN-01", 5, 1, 4, 4),
      widget(3, "prazos_proximos", "PRZ-01", 9, 1, 4, 4),
    ]);

    const colocados = [...tablet.values()];
    expect(colocados).toHaveLength(3);
    for (const [i, p] of colocados.entries()) {
      expect(colide(p, colocados.slice(i + 1))).toBe(false);
      // Nada pode transbordar as oito colunas do tablet.
      expect(p.col + p.colSpan - 1).toBeLessThanOrEqual(8);
    }
  });

  it("o tablet sai de validarLayout, e sai limpo, mesmo do que estava gravado", () => {
    // Um layout com colocações de tablet sobrepostas já gravadas — o que
    // a derivação antiga produzia. A leitura tem de as corrigir sozinha.
    const sujo = layoutCom([
      widget(1, "precisam_atencao", "ATN-01", 5, 1, 4, 4),
      widget(2, "prazos_proximos", "PRZ-01", 9, 1, 4, 4),
    ]);
    sujo.items[0].tablet = { col: 4, row: 1, colSpan: 3, rowSpan: 4 };
    sujo.items[1].tablet = { col: 6, row: 1, colSpan: 3, rowSpan: 4 };

    const tablets = validarLayout(sujo).layout.items.map((i) => i.tablet!);
    expect(tablets.every(Boolean)).toBe(true);
    expect(colide(tablets[0], [tablets[1]])).toBe(false);
  });

  it("um módulo oculto não disputa espaço no tablet", () => {
    const oculto = widget(1, "clientes", "CLI-01", 1, 1, 4, 4);
    oculto.hidden = true;
    const tablet = derivarLayoutTablet([
      oculto,
      widget(2, "agenda_hoje", "AGD-01", 5, 1, 4, 4),
    ]);
    // O visível fica na primeira coluna: o oculto não ocupou nada.
    expect(tablet.get(uuid(2))).toEqual({ col: 1, row: 1, colSpan: 3, rowSpan: 4 });
  });

  it("mobile é uma lista ordenada por leitura, não uma matriz", () => {
    const ordem = derivarMobile([
      widget(1, "clientes", "CLI-01", 9, 1, 4, 3),
      widget(2, "agenda_hoje", "AGD-01", 1, 1, 4, 3),
      widget(3, "prazos_proximos", "PRZ-01", 1, 4, 4, 3),
    ]);
    expect(ordem.map((o) => o.instanceId)).toEqual([uuid(2), uuid(1), uuid(3)]);
    expect(ordem.map((o) => o.order)).toEqual([1, 2, 3]);
  });
});

describe("dashboard — validação", () => {
  it("aceita um layout correto", () => {
    const r = validarLayout(layoutCom([
      widget(1, "agenda_hoje", "AGD-01", 1, 1, 4, 4),
      widget(2, "prazos_proximos", "PRZ-01", 9, 1, 4, 4),
    ]));
    expect(r.valido).toBe(true);
    expect(r.layout.items).toHaveLength(2);
  });

  it("descarta um tipo desconhecido em vez de o montar", () => {
    const r = validarLayout(layoutCom([
      { ...widget(1, "agenda_hoje", "AGD-01", 1, 1, 4, 4), type: "simulador_irs" as never },
      widget(2, "prazos_proximos", "PRZ-01", 9, 1, 4, 4),
    ]));
    expect(r.valido).toBe(false);
    expect(r.erros.some((e) => e.codigo === "tipo_desconhecido")).toBe(true);
    expect(r.layout.items).toHaveLength(1);
  });

  it("limita o span ao registry", () => {
    const r = validarLayout(layoutCom([widget(1, "fidelidade", "FID-01", 1, 1, 12, 40)]));
    expect(r.layout.items[0]!.desktop.rowSpan).toBeLessThanOrEqual(MODULOS.fidelidade.rowSpan.max);
  });

  it("recusa col + colSpan a transbordar", () => {
    const r = validarLayout(layoutCom([widget(1, "agenda_hoje", "AGD-01", 10, 1, 6, 4)]));
    expect(r.erros.some((e) => e.codigo === "modulo_transborda_a_grelha")).toBe(true);
    const it0 = r.layout.items[0]!;
    expect(it0.desktop.col + it0.desktop.colSpan - 1).toBeLessThanOrEqual(12);
  });

  it("limpa config com dados de cliente", () => {
    const w = widget(1, "agenda_hoje", "AGD-01", 1, 1, 4, 4);
    const r = validarLayout(layoutCom([
      { ...w, config: { density: "compact", clienteNome: "Maria Sousa", valorIRS: 1840 } as never },
    ]));
    expect(r.erros.some((e) => e.codigo === "config_com_chave_nao_permitida")).toBe(true);
    expect(r.layout.items[0]!.config).toEqual({ density: "compact" });
  });

  it("corrige tag que não corresponde ao tipo", () => {
    const r = validarLayout(layoutCom([widget(1, "prazos_proximos", "AGD-01", 1, 1, 4, 4)]));
    expect(r.erros.some((e) => e.codigo === "tag_nao_corresponde_ao_tipo")).toBe(true);
    expect(r.layout.items[0]!.tag).toBe("PRZ-01");
  });

  it("recusa uma versão não suportada", () => {
    expect(validarLayout({ version: 9, items: [] }).erros[0]!.codigo).toBe("versao_nao_suportada");
  });

  it("trunca acima do máximo de módulos", () => {
    const muitos = Array.from({ length: 40 }, (_, i) =>
      widget(i + 1, "clientes", `CLI-${String(i + 1).padStart(2, "0")}`, 1, i + 1, 3, 2));
    expect(validarLayout(layoutCom(muitos)).layout.items.length).toBeLessThanOrEqual(24);
  });
});

describe("dashboard — migração e diff", () => {
  it("migra V1 para V2 sem perder módulos conhecidos", () => {
    const v2 = migrarV1({
      version: 1,
      items: [
        { id: uuid(1), type: "agenda_hoje", desktop: { x: 0, y: 0, w: 4, h: 4 } },
        { id: uuid(2), type: "fantasma" as never, desktop: { x: 4, y: 0, w: 4, h: 4 } },
      ],
    }, () => uuid(9));
    expect(v2.items).toHaveLength(1);
    expect(v2.items[0]!.tag).toBe("AGD-01");
    expect(v2.items[0]!.desktop.col).toBe(1);   // x 0-based -> col 1-based
  });

  it("concluir sem alterações não produz escrita", () => {
    const a = validarLayout(layoutCom([widget(1, "agenda_hoje", "AGD-01", 1, 1, 4, 4)])).layout;
    const b = JSON.parse(JSON.stringify(a)) as WorkspaceLayoutV2;
    delete b.items[0]!.config;              // ausente vs. undefined dá o mesmo
    expect(mudou(a, b)).toBe(false);
    b.items[0]!.desktop.col = 5;
    expect(mudou(a, b)).toBe(true);
  });

  it("a assinatura ignora a ordem incidental do array", () => {
    const w1 = widget(1, "agenda_hoje", "AGD-01", 1, 1, 4, 4);
    const w2 = widget(2, "prazos_proximos", "PRZ-01", 9, 1, 4, 4);
    expect(assinaturaCanonica(layoutCom([w1, w2])))
      .toBe(assinaturaCanonica(layoutCom([w2, w1])));
  });
});

/* =================================================================== */
/* O que recusa gravar, e o que apenas arruma                          */
/* =================================================================== */

describe("dashboard — o que se grava é o layout normalizado", () => {
  it("sobreposição no input corrige-se; o output vai limpo", () => {
    // O bug real: a loja de demonstração recusava gravar sempre que
    // `validarLayout` sinalizava sobreposição no INPUT — que é o estado
    // normal a meio de um arrasto — e o «Concluir edição» não fazia nada.
    // O servidor RECUSA sobreposições; a correção não foi passar a
    // aceitá-las, foi gravar o layout normalizado em vez do input.
    const sobrepostos = layoutCom([
      widget(1, "agenda_hoje", "AGD-01", 1, 1, 4, 4),
      widget(2, "prazos_proximos", "PRZ-01", 1, 1, 4, 4),
    ]);
    const r = validarLayout(sobrepostos);
    expect(r.erros.map((e) => e.codigo)).toContain("modulos_sobrepostos");
    expect(erroQueImpedeGravar(r)).toBeNull();

    const pronto = prepararParaGravar(sobrepostos);
    expect(pronto.ok).toBe(true);
    if (pronto.ok) {
      expect(temSobreposicao(pronto.layout)).toBe(false);
      expect(pronto.layout.items[1].desktop.row).not.toBe(pronto.layout.items[0].desktop.row);
    }
  });

  it("um tipo desconhecido impede gravar", () => {
    const pronto = prepararParaGravar({
      ...layoutCom([]),
      items: [{
        instanceId: uuid(1), type: "simulador_de_irs", tag: "SIM-01",
        configVersion: 1, desktop: { col: 1, row: 1, colSpan: 4, rowSpan: 4 },
      }],
    });
    expect(pronto.ok).toBe(false);
    if (!pronto.ok) expect(pronto.motivo).toBe("tipo_desconhecido");
  });

  it("o servidor recusa sobreposições — e é por isso que normalizamos", () => {
    // Se um dia o SQL deixar de as recusar, este teste falha e obriga a
    // reler a decisão em vez de a herdar por engano.
    const sql = readFileSync(
      join(RAIZ, "supabase", "migrations", "20260815220000_dashboard_modular_contabilistas.sql"),
      "utf8",
    );
    const inicio = sql.indexOf("FUNCTION public.dashboard_layout_invalido");
    const corpo = sql.slice(inicio, sql.indexOf("$$;", inicio));
    expect(corpo).toContain("modulos_sobrepostos");

    for (const codigo of [
      "tipo_desconhecido", "tag_invalida", "instanceId_invalido",
      "modulo_transborda_a_grelha",
    ]) {
      expect(CODIGOS_FATAIS).toContain(codigo);
      expect(corpo).toContain(codigo);
    }
    // Não está na lista de fatais porque é resolvido ANTES de o payload
    // sair — não porque o servidor o tolere.
    expect(CODIGOS_FATAIS).not.toContain("modulos_sobrepostos");
    expect(CODIGOS_NORMALIZAVEIS).toContain("modulos_sobrepostos");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  GERIR VISTAS — criar já se podia; o resto faltava
//  ---------------------------------------------------------------------
//  As funções existiam desde a migração do painel modular e nenhuma tinha
//  botão: uma vista criada por engano ficava para sempre no separador,
//  com o nome que o sistema lhe deu. Estes testes fixam as três regras
//  que a interface nova tem de cumprir.
// ═══════════════════════════════════════════════════════════════════════

describe("dashboard — gerir as vistas", () => {
  const gerir = readFileSync(
    join(RAIZ, "src", "components", "contabilistas", "dashboard", "GerirVista.tsx"), "utf8",
  );
  const workspace = readFileSync(
    join(RAIZ, "src", "components", "contabilistas", "dashboard", "Workspace.tsx"), "utf8",
  );

  it("as três operações que faltavam têm agora por onde ser feitas", () => {
    expect(gerir).toContain("renomearVista");
    expect(gerir).toContain("definirVistaPrincipal");
    expect(gerir).toContain("apagarVista");
    expect(workspace).toContain("GerirVista");
  });

  it("apagar pergunta antes, e diz o que leva com ela", () => {
    expect(gerir).toContain("confirmar({");
    expect(gerir).toMatch(/Apagar a vista/);
    expect(gerir).toContain("consequencias");
    // Diz também o que NÃO se perde: os módulos leem de dados que ficam.
    expect(gerir).toMatch(/dados não se perdem/i);
  });

  it("a última vista não se apaga", () => {
    // Um painel sem vistas não é um painel vazio: é um painel partido.
    expect(gerir).toContain("podeApagar");
    expect(gerir).toContain("disabled={!podeApagar}");
    expect(workspace).toContain("podeApagar={vistas.length > 1}");
  });

  it("apagar a vista ativa não deixa o painel a apontar para nada", () => {
    expect(workspace).toContain("async function recarregarVistas(apagada?: string)");
    expect(workspace).toMatch(/apagada === ativaId/);
    expect(workspace).toMatch(/frescas\.find\(\(v\) => v\.principal\)\?\.id \?\? frescas\[0\]\?\.id/);
  });

  it("não se mexe em vistas a meio de uma edição por gravar", () => {
    // O rascunho vive em memória até «Concluir»: trocar de vista ou
    // apagá-la a meio deitava-o fora sem o dizer.
    expect(workspace).toContain("{ativaAqui && !edicao && (");
  });

  it("mudar o nome é escrever no sítio, com saída por Escape", () => {
    expect(gerir).toContain('e.key === "Enter"');
    expect(gerir).toContain('e.key === "Escape"');
    expect(gerir).toContain("onBlur");
  });
});
