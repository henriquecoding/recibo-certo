// ═══════════════════════════════════════════════════════════════════════
//  A CONFIGURAÇÃO DOS MÓDULOS TEM DE MUDAR O ECRÃ
//  ---------------------------------------------------------------------
//  ⚠️ A RAZÃO DE ESTE FICHEIRO EXISTIR
//
//  `WidgetPresentationConfig` existia desde a migração do painel modular.
//  Era validado no cliente, validado outra vez em SQL contra uma
//  allow-list, persistido dentro do layout, e coberto por testes — testes
//  de SERIALIZAÇÃO. Provavam que a chave sobrevivia a uma ida e volta ao
//  JSON.
//
//  Nenhum widget a recebia. `CorpoDoModulo` calculava a densidade pela
//  geometria e passava `type`, `densidade`, `broker` e `href` — mais nada.
//  Havia um contrato de personalização com persistência, validação e
//  testes verdes, e zero efeito no ecrã.
//
//  É por isso que estas asserções olham para o MARKUP. Um teste que
//  verifique o JSON dá exatamente a mesma sensação de segurança que o
//  anterior dava — e foi essa sensação que manteve o problema vivo.
//
//  `renderToStaticMarkup` e não uma biblioteca de interface: o que se
//  prova aqui é o que sai, e os widgets leem o broker por
//  `useSyncExternalStore`, que em render de servidor usa o snapshot que
//  lhe demos.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CorpoDoModulo, { normalizarConfig } from "@/components/contabilistas/dashboard/widgets";
import type { Broker } from "@/components/contabilistas/dashboard/broker";
import { MODULOS } from "@/lib/contabilistas/dashboard/modulos";
import type { DominioDados } from "@/lib/contabilistas/dashboard/modulos";
import type { WidgetPresentationConfig, WidgetType } from "@/lib/contabilistas/dashboard/tipos";
import type { Caso } from "@/lib/contabilistas/casos";
import type { Tarefa } from "@/lib/contabilistas/trabalho";

/* ------------------------------------------------------------------ */
/* Um broker que não fala com nada                                     */
/* ------------------------------------------------------------------ */

/**
 * O broker verdadeiro constrói leitores contra o Supabase no construtor.
 * Aqui só interessa o que ele DEVOLVE, e por isso o que se passa aos
 * widgets é um objeto com a mesma superfície e dados já lá dentro.
 */
function brokerCom(dados: Partial<Record<DominioDados, unknown>>): Broker {
  return {
    estado: (d: DominioDados) =>
      d in dados
        ? { estado: "pronto", dados: dados[d], atualizadoEm: Date.now() }
        : { estado: "a-carregar" },
    subscrever: () => () => {},
    velho: () => false,
    revisaoDe: () => 0,
    pedir: async () => undefined,
    pedirVarios: async () => [],
    revalidar: async () => [],
    revalidarSeVelho: async () => [],
  } as unknown as Broker;
}

const href = (d: string) => d;

/** Um módulo, do tamanho que se quiser, com a configuração que se quiser. */
function desenhar(
  type: WidgetType,
  broker: Broker,
  config?: WidgetPresentationConfig,
  geometria: { colSpan: number; rowSpan: number } = { colSpan: 12, rowSpan: 8 },
): string {
  return renderToStaticMarkup(
    <CorpoDoModulo
      type={type}
      colSpan={geometria.colSpan}
      rowSpan={geometria.rowSpan}
      broker={broker}
      config={config}
      href={href}
    />,
  );
}

const tarefa = (over: Partial<Tarefa> = {}): Tarefa => ({
  id: "t1", vinculoId: null, titulo: "Tarefa", notas: null,
  estado: "por_tratar", prazo: null, etiquetas: [], obrigacao: null,
  ordem: 0, passos: [], ...over,
});

const caso = (over: Partial<Caso> = {}): Caso => ({
  id: "c1", referencia: "RC-2026-0001", nomeCompleto: "Alguém", nif: "123456789",
  assunto: "Assunto", situacao: "Situação com detalhe suficiente para passar.",
  area: "irs", urgencia: "normal", orcamentoCents: null, estado: "encaminhado",
  notaTriagem: null, partilhaContactos: false,
  criadoEm: "2026-08-01T09:00:00Z", submetidoEm: "2026-08-01T09:00:00Z", ...over,
});

/* ------------------------------------------------------------------ */

describe("a configuração só existe onde o módulo a declara", () => {
  it("`normalizarConfig` deita fora o que o módulo não suporta", () => {
    // `atividade_semana` só declara `density`. Um layout gravado com
    // `maxItems` — de outra versão, de outro módulo, ou escrito à mão —
    // não pode passar a ter efeito por acidente.
    expect(normalizarConfig("atividade_semana", { density: "compact", maxItems: 3 }))
      .toEqual({ density: "compact" });
  });

  it("nenhum módulo declara uma opção que não esteja implementada", () => {
    // `periodo` e `agrupar` continuam no tipo e na allow-list — um layout
    // gravado pode trazê-las —, mas widget nenhum lhes obedece. Declará-las
    // seria pôr um interruptor sem efeito no menu, que é o defeito que
    // este ficheiro existe para impedir.
    const implementadas = new Set(["density", "maxItems", "showCompleted", "sort"]);
    for (const def of Object.values(MODULOS)) {
      for (const o of def.opcoes) {
        expect(implementadas.has(o), `${def.type} declara «${o}», que não está implementada`)
          .toBe(true);
      }
    }
  });
});

describe("`maxItems` corta a lista, e nunca a alarga", () => {
  const casos = [
    caso({ id: "a", assunto: "Alfa" }),
    caso({ id: "b", assunto: "Beta" }),
    caso({ id: "c", assunto: "Gama" }),
  ];
  const broker = brokerCom({ casos });

  it("sem configuração, mostra o que a densidade permite", () => {
    const html = desenhar("casos", broker);
    expect(html).toContain("Alfa");
    expect(html).toContain("Beta");
    expect(html).toContain("Gama");
  });

  it("com `maxItems: 1`, mostra um só", () => {
    const html = desenhar("casos", broker, { maxItems: 1 });
    expect(html).toContain("Alfa");
    expect(html).not.toContain("Beta");
    expect(html).not.toContain("Gama");
  });

  it("um `maxItems` maior do que cabe não desenha mais linhas", () => {
    // Um módulo pequeno com `maxItems: 20` desenharia vinte linhas dentro
    // de uma caixa que não as comporta — e o que a pessoa via era uma
    // lista cortada pelo overflow, não a personalização que pediu.
    const pequeno = { colSpan: 3, rowSpan: 2 };
    const semConfig = desenhar("casos", broker, undefined, pequeno);
    const comMuitos = desenhar("casos", broker, { maxItems: 20 }, pequeno);
    expect(comMuitos).toBe(semConfig);
  });
});

describe("`sort` muda a ordem no ecrã", () => {
  const broker = brokerCom({
    casos: [
      caso({ id: "z", assunto: "Zebra", submetidoEm: "2026-08-10T09:00:00Z" }),
      caso({ id: "a", assunto: "Abelha", submetidoEm: "2026-08-01T09:00:00Z" }),
    ],
  });

  it("por omissão, o mais recente primeiro", () => {
    const html = desenhar("casos", broker);
    expect(html.indexOf("Zebra")).toBeLessThan(html.indexOf("Abelha"));
  });

  it("com `sort: \"alpha\"`, por ordem alfabética", () => {
    const html = desenhar("casos", broker, { sort: "alpha" });
    expect(html.indexOf("Abelha")).toBeLessThan(html.indexOf("Zebra"));
  });

  it("com `sort: \"deadline\"`, o que está parado há mais tempo primeiro", () => {
    const html = desenhar("casos", broker, { sort: "deadline" });
    expect(html.indexOf("Abelha")).toBeLessThan(html.indexOf("Zebra"));
  });
});

describe("`showCompleted` esconde o que já está feito", () => {
  const broker = brokerCom({
    trabalho: [
      tarefa({ id: "t1", titulo: "Por fazer", estado: "por_tratar" }),
      tarefa({ id: "t2", titulo: "Já feito", estado: "entregue" }),
    ],
    clientes: [],
  });

  it("por omissão, a coluna dos concluídos aparece", () => {
    // O valor por omissão é MOSTRAR: é o que o módulo fazia antes de esta
    // opção existir, e mudar o comportamento de quem nunca escolheu nada
    // seria personalizar por eles.
    expect(desenhar("estado_trabalho", broker)).toContain("Concluído");
  });

  it("com `showCompleted: false`, desaparece", () => {
    const html = desenhar("estado_trabalho", broker, { showCompleted: false });
    expect(html).not.toContain("Concluído");
    expect(html).toContain("Por tratar");
  });
});

describe("a densidade escolhida aperta, mas não alarga", () => {
  const broker = brokerCom({
    casos: Array.from({ length: 8 }, (_, i) => caso({ id: `c${i}`, assunto: `Caso ${i}` })),
  });

  it("`compact` num módulo grande mostra menos", () => {
    const grande = desenhar("casos", broker);
    const apertado = desenhar("casos", broker, { density: "compact" });
    expect(grande).toContain("Caso 5");
    expect(apertado).not.toContain("Caso 5");
  });

  it("`full` num módulo pequeno é ignorado", () => {
    // Pedir `full` a um cartão de 3×2 desenha oito linhas numa caixa de
    // duas. A escolha é aceite e não obedecida — e o teste existe para
    // que alguém que ache isso estranho encontre aqui a razão.
    const pequeno = { colSpan: 3, rowSpan: 2 };
    expect(desenhar("casos", broker, { density: "full" }, pequeno))
      .toBe(desenhar("casos", broker, undefined, pequeno));
  });
});
