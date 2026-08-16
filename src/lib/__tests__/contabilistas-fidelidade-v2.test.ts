// ═══════════════════════════════════════════════════════════════════════
//  FIDELIDADE V2 — a máquina de estados, e a invariante que a governa
//  ---------------------------------------------------------------------
//  O modelo é o decidido: CARIMBOS, com o desconto dado no FIM e para UMA
//  única utilização. Não é desconto contínuo nas N consultas do cartão —
//  essa leitura do mockup custava cinco vezes mais e eliminava o estado
//  «benefício pendente», que é a razão de ser de metade desta frente.
//
//  A invariante que nunca pode ser violada: nunca coexistem um benefício
//  por usar e um cartão novo a acumular carimbos. E a consulta que resgata
//  o benefício NÃO conta como primeiro carimbo do ciclo seguinte — uma
//  consulta não pode ser o prémio de um ciclo e o primeiro passo do outro.
//
//  Relatório Mestre §13–20.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  aplicarConsulta, calcularDesconto, copyEstadoCiclo, copyPublicaFidelidade,
  type Ciclo, type RegraFidelidade,
} from "../contabilistas/fidelidade/estados";

const regra5 = (): RegraFidelidade =>
  ({ id: "r1", versao: 1, meta: 5, descontoPct: 10, exigePagamento: true, ativa: true });
const regra6 = (): RegraFidelidade =>
  ({ id: "r2", versao: 2, meta: 6, descontoPct: 15, exigePagamento: true, ativa: true });

const consulta = (preco: number, extra: Partial<Parameters<typeof aplicarConsulta>[1]> = {}) =>
  ({ agendamentoId: "a1", precoCents: preco, compareceu: true, ...extra });

describe("fidelidade — máquina de estados", () => {
  it("a primeira consulta paga abre o cartão com a regra corrente", () => {
    const t = aplicarConsulta({ estado: "sem_ciclo", carimbos: 0, regra: null }, consulta(14000), regra5());
    expect(t.efeito.tipo).toBe("abre_cartao_e_carimba");
    expect(t.proximo.estado).toBe("cartao_ativo");
    expect(t.proximo.regra!.meta).toBe(5);
  });

  it("uma consulta grátis não abre ciclo quando a regra exige pagamento", () => {
    const t = aplicarConsulta({ estado: "sem_ciclo", carimbos: 0, regra: null }, consulta(0), regra5());
    expect(t.efeito).toEqual({ tipo: "nada", motivo: "consulta_nao_elegivel" });
    expect(t.proximo.estado).toBe("sem_ciclo");
  });

  it("uma falta não carimba", () => {
    const ciclo: Ciclo = { estado: "cartao_ativo", carimbos: 2, regra: regra5() };
    const t = aplicarConsulta(ciclo, consulta(14000, { compareceu: false }), regra5());
    expect(t.efeito).toEqual({ tipo: "nada", motivo: "nao_compareceu" });
    expect(t.proximo.carimbos).toBe(2);
  });

  it("o cartão em curso mantém a regra congelada mesmo com uma nova publicada", () => {
    const ciclo: Ciclo = { estado: "cartao_ativo", carimbos: 3, regra: regra5() };
    const t = aplicarConsulta(ciclo, consulta(14000), regra6());
    expect(t.proximo.regra!.meta).toBe(5);
    expect(t.proximo.carimbos).toBe(4);
  });

  it("o último carimbo emite o benefício e NÃO abre outro cartão", () => {
    const ciclo: Ciclo = { estado: "cartao_ativo", carimbos: 4, regra: regra5() };
    const t = aplicarConsulta(ciclo, consulta(14000), regra6());
    expect(t.efeito).toEqual({ tipo: "completa_e_emite_beneficio", descontoPct: 10 });
    expect(t.proximo.estado).toBe("beneficio_pendente");
  });

  it("com benefício pendente, uma consulta nova não inicia ciclo", () => {
    const ciclo: Ciclo = { estado: "beneficio_pendente", carimbos: 5, regra: regra5() };
    const t = aplicarConsulta(ciclo, consulta(14000), regra6());
    expect(t.efeito).toEqual({ tipo: "nada", motivo: "beneficio_pendente" });
    expect(t.proximo.estado).toBe("beneficio_pendente");
  });

  it("o resgate usa o preço REAL da consulta e não carimba o ciclo seguinte", () => {
    const ciclo: Ciclo = { estado: "beneficio_pendente", carimbos: 5, regra: regra5() };
    const t = aplicarConsulta(ciclo, consulta(14000, { resgataBeneficio: true }), regra6());
    expect(t.efeito).toEqual({
      tipo: "resgata_beneficio", descontoPct: 10,
      baseCents: 14000, descontoCents: 1400, finalCents: 12600,
    });
    expect(t.proximo.estado).toBe("sem_ciclo");
    expect(t.proximo.carimbos).toBe(0);
  });

  it("só depois do resgate é que a regra nova entra", () => {
    const t = aplicarConsulta({ estado: "sem_ciclo", carimbos: 0, regra: null }, consulta(14000), regra6());
    expect(t.proximo.regra!.meta).toBe(6);
    expect(t.proximo.regra!.descontoPct).toBe(15);
  });

  it("desconto é sempre em cêntimos e arredonda ao cêntimo", () => {
    expect(calcularDesconto(14000, 10)).toEqual({ descontoCents: 1400, finalCents: 12600 });
    expect(calcularDesconto(3333, 15)).toEqual({ descontoCents: 500, finalCents: 2833 });
    expect(calcularDesconto(0, 10)).toEqual({ descontoCents: 0, finalCents: 0 });
  });

  it("a copy pública descreve meta e percentagem, sem inventar euros", () => {
    const texto = copyPublicaFidelidade(regra5())!;
    expect(texto).toContain("5 serviços");
    expect(texto).toContain("10%");
    expect(texto).not.toMatch(/€|\bEUR\b/);
  });

  it("fidelidade inativa não abre nada", () => {
    const t = aplicarConsulta({ estado: "sem_ciclo", carimbos: 0, regra: null },
      consulta(14000), { ...regra5(), ativa: false });
    expect(t.efeito).toEqual({ tipo: "nada", motivo: "fidelidade_inativa" });
  });
});

/* =================================================================== */

describe("fidelidade — o que o cliente lê", () => {
  it("a copy pública diz o modelo certo: no fim, uma vez", () => {
    const t = copyPublicaFidelidade(regra5())!;
    expect(t).toMatch(/ao completar 5/i);
    expect(t).toMatch(/10%/);
    // «numa consulta futura» — singular. O modelo não é desconto contínuo.
    expect(t).toMatch(/numa consulta/i);
    expect(t).not.toMatch(/em cada|todas as consultas/i);
  });

  it("sem regra ativa não promete nada", () => {
    expect(copyPublicaFidelidade(null)).toBeNull();
    expect(copyPublicaFidelidade({ ...regra5(), ativa: false })).toBeNull();
  });

  it("o benefício pendente explica porque a regra nova ainda não entrou", () => {
    const c: Ciclo = { estado: "beneficio_pendente", carimbos: 5, regra: regra5() };
    expect(copyEstadoCiclo(c)).toMatch(/por usar/i);
    expect(copyEstadoCiclo(c)).toMatch(/nova regra/i);
  });

  it("a copy nunca inventa um valor em euros", () => {
    // §137: o preço real é por consulta. Prometer «10% de 120 €» antes de
    // o preço existir seria inventar dinheiro que ninguém acordou.
    for (const t of [copyPublicaFidelidade(regra5()), copyEstadoCiclo({ estado: "cartao_ativo", carimbos: 2, regra: regra5() })]) {
      expect(t ?? "").not.toMatch(/€/);
    }
  });
});
