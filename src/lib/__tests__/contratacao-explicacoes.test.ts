import { describe, expect, it } from "vitest";
import { resolveCitation } from "../../../ReciboCerto-Fiscal-Engine/src";
import {
  EXPLICACAO_POR_CUSTO,
  EXPLICACOES,
  explicacaoPorId,
} from "@/components/contratacao/explicacoes";
import { META_CUSTOS } from "@/components/contratacao/estado";

/**
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ O QUE ESTE PORTÃO IMPEDE                                              │
 * │                                                                      │
 * │ Uma explicação laboral é copy que AFIRMA uma consequência legal —     │
 * │ «isto é contra-ordenação grave», «tens de pagar o triplo». Se a       │
 * │ frase ficar e a citação se partir, fica uma afirmação jurídica sem    │
 * │ fonte no ecrã de quem vai contratar uma pessoa. É o mesmo risco que   │
 * │ a regra 1 do projeto cobre para os dados fiscais, noutro domínio.     │
 * │                                                                      │
 * │ Daí três invariantes: cada citação resolve no catálogo do motor,      │
 * │ nenhuma das três partes pode ficar vazia, e a parte «se não           │
 * │ cumprires» — a que faltava em todo o lado — tem de dizer mesmo        │
 * │ alguma coisa, não uma linha de circunstância.                         │
 * └──────────────────────────────────────────────────────────────────────┘
 */
describe("explicações laborais do planeador de contratação", () => {
  it("cada citação resolve no catálogo legal do motor", () => {
    for (const explicacao of EXPLICACOES) {
      expect(explicacao.citacoes.length, `${explicacao.id} sem fonte`).toBeGreaterThan(0);
      for (const citacao of explicacao.citacoes) {
        expect(
          resolveCitation(citacao),
          `${explicacao.id}: citação por resolver — ${citacao}`,
        ).toBeDefined();
      }
    }
  });

  it("cada citação aponta para um artigo concreto, não para o diploma inteiro", () => {
    for (const explicacao of EXPLICACOES) {
      for (const citacao of explicacao.citacoes) {
        const resolvida = resolveCitation(citacao)!;
        expect(
          resolvida.locator,
          `${explicacao.id}: ${citacao} resolve para o diploma inteiro, não para um artigo`,
        ).toBeDefined();
      }
    }
  });

  it("responde sempre às três perguntas, e nenhuma fica por dizer", () => {
    for (const explicacao of EXPLICACOES) {
      expect(explicacao.titulo.trim().length, explicacao.id).toBeGreaterThan(10);
      expect(explicacao.regra.trim().length, `${explicacao.id}: regra`).toBeGreaterThan(80);
      // A consequência é a razão de este ficheiro existir: uma linha solta
      // («é obrigatório») era exatamente o que já lá estava e não chegava.
      expect(
        explicacao.seNaoCumprires.trim().length,
        `${explicacao.id}: a consequência está demasiado curta para ser uma explicação`,
      ).toBeGreaterThan(120);
      expect(explicacao.aQuemSeAplica.trim().length, `${explicacao.id}: âmbito`).toBeGreaterThan(80);
    }
  });

  it("não tem ids repetidos e resolve-se por id", () => {
    const ids = EXPLICACOES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(explicacaoPorId(id)?.id).toBe(id);
    expect(explicacaoPorId("nao-existe")).toBeUndefined();
  });

  it("o mapa por custo só aponta para custos que existem", () => {
    const conhecidos = new Set(META_CUSTOS.map((meta) => meta.id));
    for (const [custoId, explicacao] of Object.entries(EXPLICACAO_POR_CUSTO)) {
      expect(conhecidos.has(custoId as never), `custo desconhecido: ${custoId}`).toBe(true);
      expect(EXPLICACOES).toContain(explicacao);
    }
  });

  it("o custo obrigatório explica-se — «obrigatório» sozinho não é explicação", () => {
    for (const meta of META_CUSTOS) {
      if (!meta.obrigatorio) continue;
      expect(
        EXPLICACAO_POR_CUSTO[meta.id],
        `${meta.id} é obrigatório e não diz o que acontece a quem não cumpre`,
      ).toBeDefined();
    }
  });

  it("a formação contínua cita os três artigos que fazem a consequência", () => {
    const formacao = explicacaoPorId("formacao-continua")!;
    // 131.º dá as 40 h; sem o 132.º e o 134.º a frase «não dar formação sai
    // caro» ficava sem base — são eles que transformam a hora em dívida e em
    // dinheiro à saída.
    expect(formacao.citacoes).toContain("pt.dr.codigo-trabalho.artigo-131");
    expect(formacao.citacoes).toContain("pt.dr.codigo-trabalho.artigo-132");
    expect(formacao.citacoes).toContain("pt.dr.codigo-trabalho.artigo-134");
    expect(formacao.aQuemSeAplica).toMatch(/todas as empresas/i);
  });
});
