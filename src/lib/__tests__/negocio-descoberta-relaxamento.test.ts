// ═══════════════════════════════════════════════════════════════════════
//  RELAXAMENTO — zero resultados tem de ter saída, e a saída tem de ser
//  medida
//  ---------------------------------------------------------------------
//  O relatório de 25/08/2026 pede que um resultado vazio abra «uma
//  sequência de recuperação, não um beco»: explicar que restrições
//  fecharam o espaço e oferecer relaxamentos um a um, COM EFEITO MEDIDO.
//
//  A parte que é fácil errar é a última. «Se aceitares deslocações,
//  provavelmente abrem algumas» é uma frase que se escreve sem correr
//  nada — e é indistinguível, para quem lê, de um número contado. Estes
//  testes fixam que o número é contado: aplicam o contexto que o motor
//  devolveu e verificam que aparecem exatamente as hipóteses prometidas.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  CONTEXTO_INICIAL,
  descobrir,
  type OpportunityContext,
} from "@/lib/negocio/descoberta";

const perfil = (parcial: Partial<OpportunityContext>): OpportunityContext => ({
  ...CONTEXTO_INICIAL,
  localizacao: { regiao: "norte", alcance: "regiao" },
  ...parcial,
});

/** Um perfil que só fica vazio por causa do que a pessoa RECUSOU. */
const tudoRecusado = perfil({
  competencias: [
    { id: "limpeza", nivel: "avancado" },
    { id: "atendimento", nivel: "avancado" },
  ],
  capital: { disponivelAgora: 200 },
  tempo: { dedicacao: "poucas-horas", prazoMaxPrimeiraReceitaMeses: 1 },
  restricoes: [
    "sem-atendimento-presencial",
    "sem-deslocacoes",
    "sem-carro",
    "sem-trabalho-fisico",
    "sem-carregar-peso",
    "sem-loja-fisica",
    "sem-stock",
    "sem-empregados",
  ],
});

describe("descoberta: um resultado vazio oferece saídas, e são contadas", () => {
  it("um perfil fechado pelas próprias recusas recebe pelo menos uma saída", () => {
    const resultado = descobrir(tudoRecusado, { limite: 10 });
    expect(resultado.candidatos).toHaveLength(0);
    expect(resultado.diagnosticoVazio?.tipo).toBe("restricoes");
    expect(resultado.relaxamentos.length).toBeGreaterThan(0);
  });

  it("o número prometido é o número que aparece — contado, não estimado", () => {
    const resultado = descobrir(tudoRecusado, { limite: 10 });
    for (const relaxamento of resultado.relaxamentos) {
      const depois = descobrir(relaxamento.contexto, { limite: 10 });
      expect(
        depois.candidatos.length,
        `«${relaxamento.rotulo}» prometeu ${relaxamento.hipotesesQueAbriria}`,
      ).toBe(relaxamento.hipotesesQueAbriria);
    }
  });

  it("uma saída nunca promete abrir zero", () => {
    for (const relaxamento of descobrir(tudoRecusado, { limite: 10 }).relaxamentos) {
      expect(relaxamento.hipotesesQueAbriria).toBeGreaterThan(0);
    }
  });

  it("só se relaxa o que a pessoa declarou — nunca competências nem meios", () => {
    const resultado = descobrir(tudoRecusado, { limite: 10 });
    for (const relaxamento of resultado.relaxamentos) {
      // Uma «saída» que inventasse competências ou meios não seria um
      // compromisso: seria ficção com um número ao lado.
      expect(relaxamento.contexto.competencias).toEqual(tudoRecusado.competencias);
      expect(relaxamento.contexto.ativos).toEqual(tudoRecusado.ativos);
      expect(relaxamento.contexto.detalhesAtivos).toEqual(tudoRecusado.detalhesAtivos);
    }
  });

  it("quando nenhuma mudança isolada chega, oferece-se um par — e diz-se que é par", () => {
    // Oito recusas empilhadas: cada uma sozinha fecha o espaço, por isso
    // tirar uma não abre nada. Era exatamente a pessoa que mais precisa
    // desta lista a vê-la vazia.
    const resultado = descobrir(tudoRecusado, { limite: 10 });
    const par = resultado.relaxamentos.find((item) => item.id.includes("+"));
    expect(par).toBeDefined();
    expect(par!.rotulo).toMatch(/e também/);
    expect(par!.porque).toMatch(/sozinha/);

    // E aplicar UMA das duas metades continua a não abrir nada — que é a
    // razão de o par existir.
    const metade = descobrir(
      { ...tudoRecusado, restricoes: tudoRecusado.restricoes.slice(1) },
      { limite: 10 },
    );
    expect(metade.candidatos.length).toBeLessThan(par!.hipotesesQueAbriria);
  });

  it("um resultado COM candidatos não gasta tempo a calcular saídas", () => {
    const comResultados = descobrir(
      perfil({ competencias: [{ id: "limpeza", nivel: "avancado" }] }),
      { limite: 10 },
    );
    expect(comResultados.candidatos.length).toBeGreaterThan(0);
    expect(comResultados.relaxamentos).toEqual([]);
  });

  it("uma falta de MEIO não vira uma saída — isso é do painel de bloqueios", () => {
    // «Compra uma cozinha licenciada» não é um compromisso que se aceite
    // num botão. O painel de bloqueios trata disso, com outra linguagem.
    const semCozinha = descobrir(
      perfil({ competencias: [{ id: "cozinha", nivel: "avancado" }] }),
      { limite: 10 },
    );
    expect(semCozinha.candidatos).toHaveLength(0);
    expect(semCozinha.diagnosticoVazio?.tipo).toBe("meios-em-falta");
    expect(semCozinha.relaxamentos).toEqual([]);
    expect(semCozinha.bloqueiosPorMeio.length).toBeGreaterThan(0);
  });

  it("o cálculo das saídas não entra em recursão", () => {
    // Medir uma saída exige correr o motor outra vez; essa passagem não
    // pode voltar a medir saídas. Sem o travão isto nunca terminava.
    const resultado = descobrir(tudoRecusado, { limite: 10 });
    for (const relaxamento of resultado.relaxamentos) {
      const depois = descobrir(relaxamento.contexto, { limite: 10 });
      expect(depois.relaxamentos).toEqual([]);
    }
  });

  it("as saídas são determinísticas", () => {
    const a = descobrir(tudoRecusado, { limite: 10 }).relaxamentos;
    const b = descobrir(tudoRecusado, { limite: 10 }).relaxamentos;
    expect(a.map((item) => [item.id, item.hipotesesQueAbriria])).toEqual(
      b.map((item) => [item.id, item.hipotesesQueAbriria]),
    );
  });
});
