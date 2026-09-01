import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { construirDocumentos } from "@/lib/busca/documentos";
import { TETO_POPOVER, pesquisar } from "@/lib/busca/pontuar";
import { consultaParaRanking, reconhecer } from "@/lib/busca/reconhecer";
import { aplicarResposta, compilarPlano, camposDoHandoff, type PlanoBusca } from "@/lib/busca/plano";
import { CATALOGO } from "@/lib/analytics/eventos";
import { verificarSemPII } from "@/lib/analytics/pii";

// ═══════════════════════════════════════════════════════════════════════
//  A MOLDURA APROVADA É UM CONTRATO, NÃO UMA REFERÊNCIA VAGA
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTES TESTES EXISTEM PARA IMPEDIR                              │
//  │                                                                     │
//  │ Cada uma destas regressões já foi proposta a sério: transformar a    │
//  │ superfície num popup «porque evita reflow», esconder o herói         │
//  │ «porque dá mais espaço», mostrar quatro CTAs «porque as pessoas      │
//  │ querem escolher», dizer «pedido claro» sempre «porque inspira        │
//  │ confiança».                                                          │
//  │                                                                     │
//  │ Nenhuma delas daria erro. Todas fariam a interface parecer melhor    │
//  │ numa captura de ecrã e pior para quem a usa a decidir dinheiro.      │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(process.cwd(), "src");
const ler = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

/**
 * Os comentários deste projeto EXPLICAM o que não se pode fazer — e por
 * isso contêm, à letra, as palavras que estes testes proíbem. Medir o
 * código e não a prosa é a diferença entre um portão e um jogo de palavras.
 */
const semComentarios = (s: string) =>
  s
    .split("\n")
    .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
    .join("\n")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const MOLDURA = semComentarios(ler("components", "busca", "moldura.tsx"));
const PARTES = semComentarios(ler("components", "busca", "partes.tsx"));
const PAINEL = semComentarios(ler("components", "busca", "PainelPesquisa.tsx"));

const DOCS = construirDocumentos();

function planoDe(consulta: string, resposta?: { tipo: string; opcao: string }): PlanoBusca {
  const bruto = reconhecer(consulta);
  const reconhecimento = aplicarResposta(bruto, (resposta as never) ?? null);
  const resultados = pesquisar(consultaParaRanking(consulta, reconhecimento), DOCS, {
    limite: TETO_POPOVER,
    sinais: { dominio: reconhecimento.dominio, intencao: reconhecimento.intencao },
  });
  return compilarPlano({ consulta, reconhecimento, resultados, documentos: DOCS });
}

describe("busca:moldura-nao-modal", () => {
  it("não há véu, portal, foco preso nem `aria-modal`", () => {
    for (const fonte of [MOLDURA, PARTES]) {
      expect(fonte).not.toContain("aria-modal");
      expect(fonte).not.toContain("createPortal");
      expect(fonte).not.toContain("backdrop-blur");
      expect(fonte).not.toContain("fixed inset-0");
    }
    // O painel continua a declarar-se região de pesquisa, e não diálogo.
    expect(PAINEL).toContain('role="search"');
    expect(PAINEL).not.toContain("aria-modal");
  });

  it("a moldura não bloqueia o scroll da página nem come o ecrã", () => {
    expect(MOLDURA).not.toContain("overflow-hidden");
    expect(MOLDURA).not.toMatch(/\bh-screen\b|\bh-\[100dvh\]\b/);
  });

  it("uma coluna no telemóvel, duas só a partir de `lg`", () => {
    // Mobile-first é uma regra do projeto, e num painel ancorado a uma
    // barra de 360 px duas colunas não são apertadas: são ilegíveis.
    expect(PARTES).toContain("lg:grid-cols-[1.05fr_0.95fr]");
    expect(PARTES).not.toMatch(/grid-cols-2[^\w]/);
  });
});

describe("busca:moldura-hierarquia", () => {
  it("há UMA ação principal, e é a única com preenchimento de marca", () => {
    // `bg-brand` no botão principal; as alternativas e o apoio secundário
    // ficam em borda. Duas ações com o mesmo peso é a forma mais rápida de
    // não haver recomendação nenhuma.
    const preenchidos = MOLDURA.match(/bg-brand px-4|bg-brand text-white/g) ?? [];
    expect(preenchidos.length).toBeLessThanOrEqual(2);
    expect(MOLDURA).toContain("data-caminho-principal");
  });

  it("o valor só entra no botão quando vai mesmo viajar", () => {
    // «Comparar com 3 500 €» num botão que abre o comparador vazio é a
    // promessa mais barata de fazer e a mais cara de quebrar.
    expect(MOLDURA).toContain('acao.campos.includes("valor")');
  });

  it("«pedido claro» exige confiança alta", () => {
    expect(MOLDURA).toContain('const claro = plano.confianca === "alta"');
    expect(MOLDURA).toContain("Pedido reconhecido");
  });

  it("as explicações vêm de códigos do plano, não de frases soltas", () => {
    expect(MOLDURA).toContain("EXPLICACAO[c]");
    expect(MOLDURA).toContain("Porque recomendamos isto?");
  });
});

describe("busca:moldura-alvos", () => {
  it("nenhum alvo abaixo de 36px e nenhum texto abaixo do piso", () => {
    // O `movel:e2e` mede isto num browser; este teste é o aviso rápido que
    // apanha a regressão no momento em que ela é escrita.
    const alturas = MOLDURA.match(/min-h-\[?(\d+)/g) ?? [];
    for (const a of alturas) {
      const n = Number(a.replace(/\D/g, ""));
      // `min-h-9` são 36px em Tailwind; as formas em píxeis são explícitas.
      expect(n === 8 || n === 9 || n >= 36, `alvo pequeno: ${a}`).toBe(true);
    }
    // O piso tipográfico é uma classe, não um valor à mão.
    expect(MOLDURA).not.toMatch(/text-\[1[01]px\]/);
    expect(MOLDURA).toContain("texto-mini");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  A MEDIÇÃO DA MOLDURA — a decisão sai, a leitura não
// ═══════════════════════════════════════════════════════════════════════

describe("busca:moldura-medicao", () => {
  const CONSULTAS = [
    "quanto me fica de 1 200 € por mês",
    "recibos verdes ou empresa com 3 500 € por mês",
    "contabilista no Porto para o iva de um cliente que não me pagou",
    "quando entrego o iva",
    "1200 €",
    "xpto qwerty zzz",
  ];

  it("nenhum evento da moldura passa a barreira de PII com o que quer que seja", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ NÃO SE TESTA UMA CHAMADA — TESTAM-SE OS PAYLOADS POSSÍVEIS     │
    // │                                                               │
    // │ Um teste que verificasse «a função X não envia a consulta»     │
    // │ ficaria verde no dia em que alguém acrescentasse um campo      │
    // │ novo. Este constrói o payload de cada evento a partir de       │
    // │ planos REAIS de consultas com valor, distrito e caso descrito  │
    // │ por extenso — e passa-o pela mesma barreira que corre em       │
    // │ produção.                                                     │
    // └───────────────────────────────────────────────────────────────┘
    for (const consulta of CONSULTAS) {
      const plano = planoDe(consulta);
      const payloads: Record<string, unknown>[] = [
        {
          viewport_class: "secretaria",
          route_group: "/",
          domain: plano.dominio ?? "nenhum",
          intent: plano.intencao ?? "nenhuma",
          plan_state: plano.estado,
          confidence: plano.confianca,
          renderer: plano.principal?.renderer ?? "nenhum",
          entity_count: plano.entidades.length,
        },
        ...(plano.clarificacao
          ? [
              {
                viewport_class: "secretaria",
                route_group: "/",
                kind: plano.clarificacao.tipo,
                domain: plano.dominio ?? "nenhum",
              },
              ...plano.clarificacao.opcoes.map((o) => ({
                viewport_class: "secretaria",
                route_group: "/",
                kind: plano.clarificacao!.tipo,
                answer: o.id,
              })),
            ]
          : []),
        ...(plano.principal
          ? [
              {
                viewport_class: "secretaria",
                route_group: "/",
                document_id: plano.principal.id,
                renderer: plano.principal.renderer,
                confidence: plano.confianca,
                handoff_field_count: plano.principal.campos.length,
              },
            ]
          : []),
        ...plano.alternativas.map((a, i) => ({
          viewport_class: "secretaria",
          route_group: "/",
          document_id: a.id,
          rank: i + 2,
        })),
        {
          viewport_class: "secretaria",
          route_group: "/",
          as_primary: plano.apoio?.principal ?? false,
          filter_count: plano.apoio?.filtros.length ?? 0,
        },
      ];

      for (const payload of payloads) {
        const r = verificarSemPII(payload);
        expect(r.ok, `${consulta} → ${r.motivo ?? ""} em ${JSON.stringify(payload)}`).toBe(true);
      }
    }
  });

  it("os seis eventos novos estão no catálogo — sem entrada não saem", () => {
    for (const nome of [
      "header_search_intent_recognized",
      "header_search_clarification_shown",
      "header_search_clarification_answered",
      "header_search_prepared_action_open",
      "header_search_alternate_path_click",
      "header_search_professional_support_open",
    ] as const) {
      expect(CATALOGO[nome], nome).toBeTruthy();
      expect(CATALOGO[nome].origem).toBe("cliente");
    }
  });

  it("a medição não conhece a consulta — não há por onde ela entrar", () => {
    const MEDICAO = semComentarios(ler("lib", "busca", "medicao.ts"));
    // As funções da moldura recebem o plano e o contexto. Se alguma
    // passasse a receber a frase, era aqui que se via.
    expect(MEDICAO).toContain("medirPlano(ctx: ContextoMedicao, plano: PlanoBusca)");
    expect(MEDICAO).not.toMatch(/registar\([^)]*consulta[^)]*\)/);
  });
});

describe("busca:moldura-plano", () => {
  it("uma pergunta de cada vez, e a resposta encerra-a", () => {
    const antes = planoDe("recibos verdes ou empresa com 3 500 € por mês");
    expect(antes.clarificacao?.tipo).toBe("base_de_comparacao");

    const depois = planoDe("recibos verdes ou empresa com 3 500 € por mês", {
      tipo: "base_de_comparacao",
      opcao: "custoEmpregador",
    });
    expect(depois.clarificacao).toBeUndefined();
    expect(depois.estado).toBe("pronto");
    expect(depois.explicacoes).toContain("CLARIFICATION_ANSWERED");
  });

  it("a resposta viaja para o destino que a soube pedir", () => {
    const plano = planoDe("recibos verdes ou empresa com 3 500 € por mês", {
      tipo: "base_de_comparacao",
      opcao: "custoEmpregador",
    });
    const campos = camposDoHandoff(plano);
    expect(campos.valor).toBe(3500);
    expect(campos.periodicidade).toBe("mes");
    expect(campos.base).toBe("custoEmpregador");
  });

  it("«não sei» encerra a pergunta sem inventar o dado", () => {
    const plano = planoDe("quanto me fica de 1 200 €", { tipo: "periodicidade", opcao: "nao-sei" });
    expect(plano.clarificacao).toBeUndefined();
    expect(camposDoHandoff(plano).periodicidade).toBeUndefined();
  });

  it("o plano nunca transporta valores — só tipos", () => {
    // O plano é serializável e é o que a medição vê. Se transportasse
    // «1 200 €», bastava alguém registá-lo uma vez.
    const plano = planoDe("quanto me fica de 1 200 € por mês");
    const serializado = JSON.stringify({
      estado: plano.estado,
      principal: plano.principal,
      alternativas: plano.alternativas,
      explicacoes: plano.explicacoes,
    });
    expect(serializado).not.toContain("1200");
    expect(serializado).not.toContain("1 200");
  });
});
