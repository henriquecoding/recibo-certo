import { describe, it, expect } from "vitest";
import { simularIRSAnual, type SimulacaoInput } from "@/lib/fiscal";

// ═══════════════════════════════════════════════════════════════════════
//  CASOS DE REFERÊNCIA — deteção de regressão
//
//  ATENÇÃO AO QUE ISTO É E AO QUE NÃO É.
//
//  Estes valores são a saída ATUAL do motor, fixada perfil a perfil. Servem
//  para que qualquer alteração futura ao cálculo apareça como um teste a
//  falhar, com o número velho e o novo lado a lado — em vez de passar
//  despercebida.
//
//  NÃO são valores conferidos contra o simulador oficial da AT. A análise
//  dos simuladores pede casos-ouro verificados externamente, e essa
//  verificação é humana: continua na lista de revisão fiscal por fazer,
//  ao lado dos restantes grupos P0.
//
//  Quando um destes testes falhar, a pergunta certa não é «como faço passar»
//  — é «a mudança era intencional?». Se sim, atualiza-se o valor no mesmo
//  commit que muda o cálculo, e a revisão do diff mostra exatamente quanto
//  mexeu e em quem.
// ═══════════════════════════════════════════════════════════════════════

interface Esperado {
  rendimentoTributavel: number;
  rendimentoColetavel: number;
  coletaBruta: number;
  irsEstimado: number;
  irsImputavelCatB: number;
  ssAnual: number;
}

const CASOS: { nome: string; input: SimulacaoInput; esperado: Esperado; nota: string }[] = [
  {
    nome: "jovem no 1.º ano de atividade (IRS Jovem 100% + isenção de SS)",
    input: {
      brutoAnual: 18_000,
      tipo: "art151",
      anoAtividade: 1,
      irsJovemAno: 1,
      isencaoSSPrimeiroAno: true,
    },
    esperado: {
      rendimentoTributavel: 6_750,
      rendimentoColetavel: 0,
      coletaBruta: 0,
      irsEstimado: 0,
      irsImputavelCatB: 0,
      ssAnual: 0,
    },
    nota: "Coeficiente reduzido a 50% no 1.º ano (0,75 → 0,375) e isenção total do IRS Jovem.",
  },
  {
    nome: "prestador do Art. 151.º consolidado, 30 000 €",
    input: { brutoAnual: 30_000, tipo: "art151", anoAtividade: 3 },
    esperado: {
      rendimentoTributavel: 22_500,
      rendimentoColetavel: 22_500,
      coletaBruta: 3_945.97,
      irsEstimado: 3_945.97,
      irsImputavelCatB: 3_945.97,
      ssAnual: 4_494,
    },
    nota: "O caso base: coeficiente 0,75, sem acréscimo da regra dos 15%.",
  },
  {
    nome: "acumulação com emprego — 24 000 € de recibos + 30 000 € de salário",
    input: {
      brutoAnual: 24_000,
      tipo: "art151",
      anoAtividade: 3,
      acumulaEmprego: true,
      outrosRendimentos: 30_000,
    },
    esperado: {
      rendimentoTributavel: 18_000,
      rendimentoColetavel: 48_000,
      coletaBruta: 12_966.28,
      irsEstimado: 12_966.28,
      irsImputavelCatB: 6_706.13,
      ssAnual: 0,
    },
    nota:
      "O perfil que o guiado tratava pior: sem englobamento, o IRS imputável saía a " +
      "menos de metade. A SS é zero porque 24 000 × 70% / 12 = 1 400 €/mês, abaixo dos 4 × IAS.",
  },
  {
    nome: "família com dois filhos e tributação conjunta, 45 000 €",
    input: {
      brutoAnual: 45_000,
      tipo: "art151",
      anoAtividade: 3,
      conjunta: true,
      dependentesDetalhe: { normais: 2, bebe: 0, deficientes: 0 },
    },
    esperado: {
      rendimentoTributavel: 33_759,
      rendimentoColetavel: 33_759,
      coletaBruta: 5_238.45,
      irsEstimado: 4_038.45,
      irsImputavelCatB: 4_038.45,
      ssAnual: 6_741,
    },
    nota: "Quociente conjugal + 1 200 € de dedução por dois dependentes. É a diferença que o guiado não pergunta.",
  },
  {
    nome: "venda de bens, 60 000 € (base de SS a 20%)",
    input: { brutoAnual: 60_000, tipo: "vendas", anoAtividade: 3 },
    esperado: {
      rendimentoTributavel: 9_000,
      rendimentoColetavel: 9_000,
      coletaBruta: 1_146.06,
      irsEstimado: 1_146.06,
      irsImputavelCatB: 1_146.06,
      ssAnual: 2_568,
    },
    nota: "Coeficiente 0,15 e base de SS de 20% — o caso que a regra dos 15% tratava como serviços.",
  },
  {
    nome: "no limite do regime simplificado, 200 000 €",
    input: { brutoAnual: 200_000, tipo: "art151", anoAtividade: 3 },
    esperado: {
      rendimentoTributavel: 163_447.8,
      rendimentoColetavel: 163_447.8,
      coletaBruta: 69_153.87,
      irsEstimado: 69_153.87,
      irsImputavelCatB: 69_153.87,
      ssAnual: 16_552.2,
    },
    nota:
      "Onde a regra dos 15% passou a morder: com o teto de 12 × IAS na SS, o acréscimo " +
      "sobe de ~40 € para ~13 400 €. A SS é exatamente o teto.",
  },
];

describe("casos de referência do apuramento anual", () => {
  it.each(CASOS)("$nome", ({ input, esperado }) => {
    const r = simularIRSAnual(input);
    expect(r.rendimentoTributavel).toBeCloseTo(esperado.rendimentoTributavel, 2);
    expect(r.rendimentoColetavel).toBeCloseTo(esperado.rendimentoColetavel, 2);
    expect(r.coletaBruta).toBeCloseTo(esperado.coletaBruta, 2);
    expect(r.irsEstimado).toBeCloseTo(esperado.irsEstimado, 2);
    expect(r.irsImputavelCatB).toBeCloseTo(esperado.irsImputavelCatB, 2);
    expect(r.ssAnual).toBeCloseTo(esperado.ssAnual, 2);
  });

  it("cada caso traz a nota que explica porque está aqui", () => {
    // Um caso de referência sem explicação é um número que ninguém sabe rever.
    for (const c of CASOS) expect(c.nota.length).toBeGreaterThan(40);
  });
});
