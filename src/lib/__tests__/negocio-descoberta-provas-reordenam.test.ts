// ═══════════════════════════════════════════════════════════════════════
//  AS PROVAS VOLTAM AO MOTOR — e sabem o que não podem afirmar
//  ---------------------------------------------------------------------
//  §5.3 do relatório de 25/08/2026: «essas provas vivem no percurso da
//  hipótese e não voltam ao motor como sinais de reordenação. […] A
//  ferramenta tem um bom laboratório, mas o laboratório e o motor ainda
//  não formam um sistema de aprendizagem.»
//
//  Fechar esse ciclo é fácil de fazer mal. A tentação é tratar uma venda
//  como evidência de mercado — e nesse instante a ferramenta passa a
//  produzir números sobre procura a partir de uma anedota. Estes testes
//  fixam as duas metades:
//
//   · a prova MUDA a ordem, e a razão aparece escrita;
//   · a prova NÃO MUDA procura, oferta, evidência nem confiança.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  CONTEXTO_INICIAL,
  descobrir,
  type OpportunityContext,
} from "@/lib/negocio/descoberta";
import type { MarketHypothesis } from "@/lib/negocio/market/hipoteses";

const AGORA = "2026-08-25T10:00:00.000Z";
const HOJE = "2026-08-20";
const ANTIGA = "2025-01-10";

const perfil: OpportunityContext = {
  ...CONTEXTO_INICIAL,
  localizacao: { regiao: "norte", alcance: "regiao" },
  competencias: [
    { id: "organizacao", nivel: "avancado" },
    { id: "atendimento", nivel: "avancado" },
    { id: "vendas", nivel: "intermedio" },
  ],
  capital: { disponivelAgora: 5000 },
};

const correr = (hipoteses: readonly MarketHypothesis[] = []) =>
  descobrir(perfil, { limite: 12, agora: () => AGORA, hipoteses });

const base = correr();

function hipoteseSobre(
  templateId: string,
  proofs: MarketHypothesis["proofs"],
  pricing?: MarketHypothesis["pricing"],
): MarketHypothesis {
  return {
    templateId,
    region: "norte",
    createdAt: AGORA,
    updatedAt: AGORA,
    proofs,
    requirementsReviewed: true,
    ...(pricing ? { pricing } : {}),
  };
}

/** A chave com que uma hipótese guardada se liga a um candidato. */
const chave = (candidato: (typeof base.candidatos)[number]) =>
  candidato.seedTemplateId ?? candidato.id;

describe("descoberta: uma prova do utilizador reordena, e diz porquê", () => {
  it("o cenário de partida tem candidatos para reordenar", () => {
    expect(base.candidatos.length).toBeGreaterThan(2);
  });

  it("uma venda recente sobe a própria hipótese, com a razão escrita", () => {
    const alvo = base.candidatos[base.candidatos.length - 1]!;
    const depois = correr([
      hipoteseSobre(chave(alvo), [
        { id: "p1", kind: "sale", occurredAt: HOJE, paymentReceived: true },
      ]),
    ]);
    const ajuste = depois.aprendizagem.ajustes.get(alvo.id);
    expect(ajuste?.ajuste ?? 0).toBeGreaterThan(0);
    expect(ajuste?.razoes.join(" ")).toMatch(/dinheiro recebido/);
  });

  it("uma entrevista continua a não promover nada", () => {
    // É a mesma fronteira do gate de evidência: ouvir «era capaz de
    // comprar» não é uma venda.
    const alvo = base.candidatos[0]!;
    const depois = correr([
      hipoteseSobre(chave(alvo), [{ id: "p1", kind: "interview", occurredAt: HOJE }]),
    ]);
    expect(depois.aprendizagem.ajustes.get(alvo.id)?.ajuste ?? 0).toBe(0);
  });

  it("uma prova expirada não reordena o ecrã de hoje", () => {
    const alvo = base.candidatos[0]!;
    const depois = correr([
      hipoteseSobre(chave(alvo), [
        { id: "p1", kind: "sale", occurredAt: ANTIGA, paymentReceived: true },
      ]),
    ]);
    expect(depois.aprendizagem.ajustes.get(alvo.id)?.ajuste ?? 0).toBe(0);
  });

  it("uma prova paga favorece a vizinhança — mesmo cliente E mesma entrega", () => {
    const alvo = base.candidatos[0]!;
    const vizinho = base.candidatos.find(
      (item) =>
        item.id !== alvo.id &&
        item.mercado === alvo.mercado &&
        item.entrega === alvo.entrega,
    );
    if (!vizinho) return; // Este perfil não produziu vizinhança; nada a provar.

    const depois = correr([
      hipoteseSobre(chave(alvo), [
        { id: "p1", kind: "paid_pilot", occurredAt: HOJE, paymentReceived: true },
      ]),
    ]);
    const ajuste = depois.aprendizagem.ajustes.get(vizinho.id);
    expect(ajuste?.ajuste ?? 0).toBeGreaterThan(0);
    expect(ajuste?.razoes.join(" ")).toMatch(/tipo de cliente/);
  });

  it("um modelo que não fechou as contas desce — e é o modelo, não o setor", () => {
    const alvo = base.candidatos[0]!;
    const mesmoModelo = base.candidatos.find(
      (item) => item.id !== alvo.id && item.modelo.id === alvo.modelo.id,
    );
    const outroModelo = base.candidatos.find(
      (item) => item.modelo.id !== alvo.modelo.id,
    );

    const depois = correr([
      hipoteseSobre(chave(alvo), [], {
        viable: false,
        priceNet: 0,
        concludedAt: AGORA,
      }),
    ]);

    if (mesmoModelo) {
      const ajuste = depois.aprendizagem.ajustes.get(mesmoModelo.id);
      expect(ajuste?.ajuste ?? 0).toBeLessThan(0);
      expect(ajuste?.razoes.join(" ")).toMatch(/motor de preço/);
    }
    if (outroModelo) {
      expect(depois.aprendizagem.ajustes.get(outroModelo.id)?.ajuste ?? 0).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("descoberta: uma venda tua não é uma série oficial", () => {
  const alvo = base.candidatos[0]!;
  const comProva = correr([
    hipoteseSobre(chave(alvo), [
      { id: "p1", kind: "sale", occurredAt: HOJE, paymentReceived: true },
    ]),
  ]);

  const mesmo = (id: string) => ({
    antes: base.candidatos.find((item) => item.id === id),
    depois: comProva.candidatos.find((item) => item.id === id),
  });

  it("não mexe na procura, na oferta nem na evidência", () => {
    for (const candidato of base.candidatos) {
      const { antes, depois } = mesmo(candidato.id);
      if (!antes || !depois) continue;
      expect(depois.procura).toEqual(antes.procura);
      expect(depois.evidencias.length).toBe(antes.evidencias.length);
    }
  });

  it("não mexe na confiança nem na pontuação publicada", () => {
    for (const candidato of base.candidatos) {
      const { antes, depois } = mesmo(candidato.id);
      if (!antes || !depois) continue;
      expect(depois.confianca.nivel).toBe(antes.confianca.nivel);
      expect(depois.pontuacaoGlobal).toBe(antes.pontuacaoGlobal);
      expect(depois.scores).toEqual(antes.scores);
    }
  });

  it("não mexe na viabilidade nem nas objeções", () => {
    for (const candidato of base.candidatos) {
      const { antes, depois } = mesmo(candidato.id);
      if (!antes || !depois) continue;
      expect(depois.viabilidade).toEqual(antes.viabilidade);
      expect(depois.objecoes).toEqual(antes.objecoes);
    }
  });

  it("sem hipóteses guardadas, o resultado é exatamente o de sempre", () => {
    const semNada = correr([]);
    expect(semNada.candidatos.map((item) => item.id)).toEqual(
      base.candidatos.map((item) => item.id),
    );
  });
});
