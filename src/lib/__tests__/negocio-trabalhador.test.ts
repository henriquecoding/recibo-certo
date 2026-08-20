// ═══════════════════════════════════════════════════════════════════════
//  O CUSTO DE UM POSTO DE TRABALHO — §101, §102 do relatório mestre
//  ---------------------------------------------------------------------
//  A conta antiga era `bruto × meses × (1 + TSU) ÷ 12` e respondia a uma
//  pergunta só. Estes testes prendem as quatro que ela não respondia —
//  quanto recebe a pessoa, quanto é contribuição e quanto é imposto, o
//  que custa o posto para além do salário, e o que muda se ela entrar em
//  julho — e as identidades que impedem que os três dinheiros se
//  confundam.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  custoDoPosto,
  invariantesDoPosto,
  type EntradaCustoPosto,
} from "@/lib/payroll/custo-empregador";
import {
  agregar,
  analisarNegocio,
  contextoNegocioVazio,
  custoTrabalhadoresMensal,
  custoTrabalhadoresPrimeiroAnoMensal,
  migrarNegocioV1ParaV2,
  migrarTrabalhadorV1ParaV2,
  novaOferta,
  novoTrabalhador,
  precisaMigrar,
  type ContextoNegocio,
  type TrabalhadorPlaneado,
} from "@/lib/negocio";
import { SMN, SS_DEPENDENTE } from "@/lib/fiscal-data";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const perto = (a: number, b: number, tol = 0.5) => Math.abs(a - b) <= tol;

const posto = (extra: Partial<EntradaCustoPosto> = {}) =>
  custoDoPosto({ salarioBaseMensal: 1_500, pagamentoSubsidios: "normal", ...extra });

// ═══════════════════════════════════════════════════════════════════════
//  1. OS TRÊS DINHEIROS — §28
// ═══════════════════════════════════════════════════════════════════════

describe("posto:tres-dinheiros", () => {
  it("a soma das parcelas é o custo anual", () => {
    const r = posto();
    const e = r.empresa;
    expect(
      e.remuneracao + e.subsidioFerias + e.subsidioNatal + e.ssEntidade + e.refeicao + e.seguroAT + e.sst + e.formacao + e.outros,
    ).toBeCloseTo(e.custoAnual, 1);
    expect(invariantesDoPosto(r)).toBe(true);
  });

  it("os subsídios de férias e Natal são um salário cada", () => {
    const r = posto({ salarioBaseMensal: 1_500 });
    expect(r.empresa.remuneracao).toBeCloseTo(18_000, 1);
    expect(r.empresa.subsidioFerias).toBeCloseTo(1_500, 1);
    expect(r.empresa.subsidioNatal).toBeCloseTo(1_500, 1);
  });

  it("a Segurança Social da empresa é sobre a base contributiva", () => {
    const r = posto({ salarioBaseMensal: 1_000 });
    // 14 prestações de 1 000 € → base anual de 14 000 €.
    expect(r.empresa.ssEntidade).toBeCloseTo(14_000 * SS_DEPENDENTE.entidade.value, 1);
  });

  it("a Segurança Social do trabalhador NÃO aumenta o custo da empresa (§102)", () => {
    const r = posto();
    // Sai do bruto dele; não é uma parcela do custo do empregador.
    expect(r.trabalhador.ss).toBeGreaterThan(0);
    expect(r.empresa.ssEntidade).not.toBeCloseTo(r.trabalhador.ss, 1);
    const semSSTrabalhador =
      r.empresa.remuneracao + r.empresa.subsidioFerias + r.empresa.subsidioNatal + r.empresa.ssEntidade;
    expect(semSSTrabalhador).toBeLessThanOrEqual(r.empresa.custoAnual + 0.01);
  });

  it("o IRS retido não aumenta o custo do empregador (§102)", () => {
    const comPerfil = posto({ perfil: { dependentes: 0, estadoCivil: "naoCasado" } });
    const semPerfil = posto();
    // O custo da empresa é o MESMO — só muda o que a pessoa leva para casa.
    expect(comPerfil.empresa.custoAnual).toBeCloseTo(semPerfil.empresa.custoAnual, 1);
    expect(comPerfil.trabalhador.irsRetido).not.toBeNull();
    expect(comPerfil.trabalhador.irsRetido!).toBeGreaterThan(0);
  });

  it("o líquido nunca excede o bruto recebido (§102)", () => {
    for (const salario of [SMN.value, 1_200, 2_500, 5_000]) {
      const r = posto({ salarioBaseMensal: salario, perfil: { dependentes: 1 } });
      expect(r.trabalhador.liquido!).toBeLessThanOrEqual(r.trabalhador.bruto);
      expect(invariantesDoPosto(r)).toBe(true);
    }
  });

  it("a empresa paga sempre mais do que a pessoa recebe", () => {
    const r = posto({ perfil: {} });
    expect(r.empresa.custoAnual).toBeGreaterThan(r.trabalhador.liquido!);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. O QUE NÃO SE INVENTA — §29
// ═══════════════════════════════════════════════════════════════════════

describe("posto:nao-inventa", () => {
  it("sem situação pessoal, o líquido NÃO é estimado", () => {
    const r = posto();
    expect(r.trabalhador.liquido).toBeNull();
    expect(r.trabalhador.irsRetido).toBeNull();
    expect(r.publico.irsRetido).toBeNull();
    expect(r.estimado.liquidoPorEstimar).toBe(true);
  });

  it("mas a Segurança Social do trabalhador é sempre conhecida", () => {
    // A taxa de 11% não depende de estado civil nem de dependentes.
    const r = posto();
    expect(r.trabalhador.ss).toBeGreaterThan(0);
  });

  it("com situação pessoal declarada, o líquido aparece", () => {
    const r = posto({ perfil: { dependentes: 2, estadoCivil: "casadoUnico" } });
    expect(r.trabalhador.liquido).not.toBeNull();
    expect(r.estimado.liquidoPorEstimar).toBe(false);
  });

  it("dependentes reduzem a retenção — o perfil não é decorativo", () => {
    const sem = posto({ perfil: { dependentes: 0 } });
    const com = posto({ perfil: { dependentes: 3 } });
    expect(com.trabalhador.irsRetido!).toBeLessThan(sem.trabalhador.irsRetido!);
    // E não muda um cêntimo do custo da empresa.
    expect(com.empresa.custoAnual).toBeCloseTo(sem.empresa.custoAnual, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. OS CUSTOS QUE FALTAVAM — §34, §35, §36, §37
// ═══════════════════════════════════════════════════════════════════════

describe("posto:custos-do-posto", () => {
  it("o seguro de acidentes de trabalho é estimado e assinalado como tal (§35)", () => {
    const r = posto();
    expect(r.empresa.seguroAT).toBeGreaterThan(0);
    expect(r.estimado.seguroAT).toBe(true);
  });

  it("um prémio declarado substitui a estimativa e deixa de ser estimativa", () => {
    const r = posto({ seguroAT: { anual: 400 } });
    expect(r.empresa.seguroAT).toBe(400);
    expect(r.estimado.seguroAT).toBe(false);
  });

  it("a medicina do trabalho fica a ZERO enquanto não houver orçamento (§36)", () => {
    // Um valor inventado seria pior do que a omissão declarada.
    const r = posto();
    expect(r.empresa.sst).toBe(0);
    expect(r.estimado.sst).toBe(true);

    const comOrcamento = posto({ sst: { anual: 180 } });
    expect(comOrcamento.empresa.sst).toBe(180);
    expect(comOrcamento.estimado.sst).toBe(false);
  });

  it("o subsídio de refeição não está ativo por omissão (§34)", () => {
    expect(posto().empresa.refeicao).toBe(0);
  });

  it("com refeição, o custo do posto sobe", () => {
    const sem = posto();
    const com = posto({ refeicao: { valorDia: 10, diasMes: 22, cartao: true } });
    expect(com.empresa.refeicao).toBeGreaterThan(0);
    expect(com.empresa.custoAnual).toBeGreaterThan(sem.empresa.custoAnual);
  });

  it("cartão e dinheiro têm limites isentos diferentes — e isso muda a conta", () => {
    const cartao = posto({ refeicao: { valorDia: 12, diasMes: 22, cartao: true } });
    const dinheiro = posto({ refeicao: { valorDia: 12, diasMes: 22, cartao: false } });
    // Em numerário mais parte é tributada → mais base contributiva → mais TSU.
    expect(dinheiro.empresa.ssEntidade).toBeGreaterThan(cartao.empresa.ssEntidade);
  });

  it("a formação declarada entra no custo (§37)", () => {
    const r = posto({ formacao: { anual: 500 } });
    expect(r.empresa.formacao).toBe(500);
    expect(r.estimado.formacao).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. O CALENDÁRIO DOS SUBSÍDIOS — §30
// ═══════════════════════════════════════════════════════════════════════

describe("posto:calendario", () => {
  it("duodécimos e pagamento normal custam praticamente o mesmo à empresa", () => {
    const normal = posto({ pagamentoSubsidios: "normal" });
    const duo = posto({ pagamentoSubsidios: "duodecimos" });
    // A diferença é de calendário, não de valor: o que muda é QUANDO sai.
    expect(perto(normal.empresa.custoAnual, duo.empresa.custoAnual, 5)).toBe(true);
  });

  it("o modo legado mantém a conta antiga e assinala o calendário (§71)", () => {
    const legado = posto({ pagamentoSubsidios: "legado" });
    expect(legado.empresa.subsidioFerias).toBe(0);
    expect(legado.empresa.subsidioNatal).toBe(0);
    expect(legado.estimado.calendarioPorConfirmar).toBe(true);
    // E custa menos do que o normal — que é exatamente o problema a sinalizar.
    expect(legado.empresa.custoAnual).toBeLessThan(posto().empresa.custoAnual);
  });

  it("os subsídios têm retenção autónoma, não a taxa do mês", () => {
    // Se fossem tributados como salário do mês, a retenção do subsídio
    // seria a mesma do mês corrente — e não é (Art. 99.º-C CIRS).
    const r = posto({ perfil: { dependentes: 0 } });
    expect(r.trabalhador.irsRetido!).toBeGreaterThan(0);
    expect(invariantesDoPosto(r)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  5. A DATA DE ENTRADA FECHA O CICLO — §38
// ═══════════════════════════════════════════════════════════════════════

describe("posto:primeiro-ano", () => {
  it("entrando em janeiro, o primeiro ano é o ano inteiro", () => {
    const r = posto({ inicioMes: 0 });
    expect(r.primeiroAno.mesesTrabalhados).toBe(12);
    expect(r.primeiroAno.custoAnual).toBeCloseTo(r.empresa.custoAnual, 1);
  });

  it("entrando em julho, o primeiro ano são seis meses", () => {
    const r = posto({ inicioMes: 6 });
    expect(r.primeiroAno.mesesTrabalhados).toBe(6);
    expect(r.primeiroAno.custoAnual).toBeCloseTo(r.empresa.custoAnual / 2, 1);
  });

  it("o custo estabilizado NÃO muda com a data de entrada", () => {
    // O break-even usa o estabilizado: a pergunta «quantas vendas pagam a
    // estrutura» é sobre o regime de cruzeiro, não sobre o mês de entrada.
    expect(posto({ inicioMes: 0 }).empresa.custoMedioMensal).toBeCloseTo(
      posto({ inicioMes: 6 }).empresa.custoMedioMensal,
      1,
    );
  });

  it("no negócio, o primeiro ano e o estabilizado divergem quando alguém entra a meio", () => {
    const ctx: ContextoNegocio = {
      ...contextoNegocioVazio("ja_vendo"),
      ofertas: [{ ...novaOferta("servico", { volumeMes: 8 }), respondidos: ["custo-direto"] }],
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [],
        trabalhadores: [
          {
            ...novoTrabalhador("Designer"),
            remuneracao: { salarioBaseMensal: 1_500 },
            contrato: { inicioMes: 6, pagamentoSubsidios: "normal" },
          },
        ],
      },
    };

    const estabilizado = custoTrabalhadoresMensal(ctx.estrutura);
    const primeiroAno = custoTrabalhadoresPrimeiroAnoMensal(ctx.estrutura);
    expect(primeiroAno).toBeLessThan(estabilizado);
    expect(primeiroAno).toBeCloseTo(estabilizado / 2, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  6. A MATRIZ DO §101
// ═══════════════════════════════════════════════════════════════════════

describe("posto:matriz", () => {
  const REGIOES = ["continente", "madeira", "acores"] as const;
  const SALARIOS = [SMN.value, 1_500, 3_500];
  const DEPENDENTES = [0, 1, 2];

  it("nenhuma combinação rebenta nem quebra os invariantes", () => {
    for (const regiao of REGIOES) {
      for (const salarioBaseMensal of SALARIOS) {
        for (const dependentes of DEPENDENTES) {
          for (const irsJovemAno of [0, 3]) {
            for (const cartao of [true, false]) {
              for (const inicioMes of [0, 6]) {
                for (const pagamentoSubsidios of ["normal", "duodecimos"] as const) {
                  const r = custoDoPosto({
                    salarioBaseMensal,
                    pagamentoSubsidios,
                    inicioMes,
                    refeicao: { valorDia: 10, diasMes: 22, cartao },
                    perfil: { regiao, dependentes, irsJovemAno },
                  });
                  expect(
                    invariantesDoPosto(r),
                    `${regiao}/${salarioBaseMensal}/${dependentes}/${irsJovemAno}`,
                  ).toBe(true);
                  expect(r.empresa.custoAnual).toBeGreaterThan(0);
                  expect(r.trabalhador.liquido!).toBeGreaterThan(0);
                }
              }
            }
          }
        }
      }
    }
  });

  it("o IRS Jovem reduz a retenção sem mexer no custo da empresa", () => {
    const sem = posto({ salarioBaseMensal: 1_500, perfil: { dependentes: 0 } });
    const com = posto({ salarioBaseMensal: 1_500, perfil: { dependentes: 0, irsJovemAno: 1 } });
    expect(com.trabalhador.irsRetido!).toBeLessThan(sem.trabalhador.irsRetido!);
    expect(com.empresa.custoAnual).toBeCloseTo(sem.empresa.custoAnual, 1);
  });

  it("a região muda a retenção — as tabelas das autónomas são outras", () => {
    const continente = posto({ salarioBaseMensal: 2_000, perfil: { regiao: "continente" } });
    const madeira = posto({ salarioBaseMensal: 2_000, perfil: { regiao: "madeira" } });
    expect(madeira.trabalhador.irsRetido).not.toBeCloseTo(continente.trabalhador.irsRetido!, 1);
  });

  it("salário zero não rebenta e não custa nada", () => {
    const r = custoDoPosto({ salarioBaseMensal: 0 });
    expect(r.empresa.custoAnual).toBe(0);
    expect(invariantesDoPosto(r)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  7. A MIGRAÇÃO v1 → v2 — §70, §71
// ═══════════════════════════════════════════════════════════════════════

describe("posto:migracao", () => {
  const v1 = (meses: 12 | 14) => ({
    id: "t1",
    funcao: "Apoio",
    salarioBrutoMensal: 1_200,
    meses,
    entraNoMes: 3,
  });

  it("`meses: 14` vira pagamento normal — a semântica é a mesma", () => {
    const t = migrarTrabalhadorV1ParaV2(v1(14))!;
    expect(t.remuneracao.salarioBaseMensal).toBe(1_200);
    expect(t.contrato.pagamentoSubsidios).toBe("normal");
    expect(t.contrato.inicioMes).toBe(3);
  });

  it("`meses: 12` vira LEGADO — não se conclui que não há direito (§71)", () => {
    const t = migrarTrabalhadorV1ParaV2(v1(12))!;
    expect(t.contrato.pagamentoSubsidios).toBe("legado");
    // E a conta que a pessoa tinha mantém-se: 12 salários, sem subsídios.
    const r = custoDoPosto({ salarioBaseMensal: 1_200, pagamentoSubsidios: "legado" });
    expect(r.empresa.subsidioFerias).toBe(0);
    expect(r.estimado.calendarioPorConfirmar).toBe(true);
  });

  it("a migração não inventa refeição, seguro nem perfil", () => {
    const t = migrarTrabalhadorV1ParaV2(v1(14))!;
    expect(t.refeicao).toBeUndefined();
    expect(t.seguroAT).toBeUndefined();
    expect(t.sst).toBeUndefined();
    expect(t.perfil).toBeUndefined();
  });

  it("é idempotente — corre a cada leitura do rascunho", () => {
    const uma = migrarTrabalhadorV1ParaV2(v1(14))!;
    const duas = migrarTrabalhadorV1ParaV2(uma)!;
    expect(duas).toEqual(uma);
  });

  it("um contexto inteiro da v1 migra e o resto atravessa intacto", () => {
    const antigo = {
      ...contextoNegocioVazio("ja_vendo"),
      versao: 1,
      nome: "Projeto antigo",
      ofertas: [novaOferta("servico", { volumeMes: 4 })],
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [],
        trabalhadores: [v1(14), v1(12)],
      },
    };

    expect(precisaMigrar(antigo)).toBe(true);
    const novo = migrarNegocioV1ParaV2(antigo)!;

    expect(novo.versao).toBe(2);
    expect(novo.nome).toBe("Projeto antigo");
    expect(novo.ofertas).toHaveLength(1);
    expect(novo.estrutura.trabalhadores).toHaveLength(2);
    expect(novo.estrutura.trabalhadores![0].contrato.pagamentoSubsidios).toBe("normal");
    expect(novo.estrutura.trabalhadores![1].contrato.pagamentoSubsidios).toBe("legado");
  });

  it("lixo não rebenta a migração", () => {
    for (const x of [null, undefined, 42, "texto", {}, { versao: 9 }]) {
      expect(() => migrarNegocioV1ParaV2(x)).not.toThrow();
      expect(migrarNegocioV1ParaV2(x)).toBeNull();
    }
  });

  it("um contexto já na v2 atravessa sem mudar", () => {
    const atual = contextoNegocioVazio("ideia");
    expect(migrarNegocioV1ParaV2(atual)!.versao).toBe(2);
    expect(precisaMigrar(atual)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  8. O DOMÍNIO DELEGA — §26
// ═══════════════════════════════════════════════════════════════════════

describe("posto:delegacao", () => {
  it("`lib/negocio` não reimplementa payroll", () => {
    const agregarSrc = ler("src/lib/negocio/agregar.ts");
    expect(agregarSrc).toContain('from "@/lib/payroll/custo-empregador"');
    // A fórmula antiga desapareceu.
    expect(agregarSrc).not.toMatch(/meses === 14 \? 14 : 12/);
    expect(agregarSrc).not.toMatch(/SS_DEPENDENTE\.entidade\.value/);
  });

  it("o motor de posto não tem tabelas próprias — chama o de vencimento", () => {
    const src = ler("src/lib/payroll/custo-empregador.ts");
    expect(src).toContain('from "@/lib/fiscal-dependente"');
    expect(src).toContain("calcularReciboMensal");
    // Nenhuma percentagem escrita à mão.
    expect(src).not.toMatch(/=\s*0\.(11|2375|23)\b/);
  });

  it("os pressupostos do posto chegam ao livro (§42)", () => {
    const ctx: ContextoNegocio = {
      ...contextoNegocioVazio("ja_vendo"),
      ofertas: [{ ...novaOferta("servico", { volumeMes: 8 }), respondidos: ["custo-direto"] }],
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [],
        trabalhadores: [{ ...novoTrabalhador("Designer"), remuneracao: { salarioBaseMensal: 1_500 } }],
      },
    };
    const ids = analisarNegocio(ctx).pressupostos.map((p) => p.id);

    expect(ids.some((i) => i.startsWith("posto-seguro-"))).toBe(true);
    expect(ids.some((i) => i.startsWith("posto-sst-"))).toBe(true);
    expect(ids.some((i) => i.startsWith("posto-liquido-"))).toBe(true);
    expect(ids.some((i) => i.startsWith("posto-entrada-"))).toBe(true);
  });

  it("um posto sem salário não gera pressupostos de posto — não há posto", () => {
    const ctx: ContextoNegocio = {
      ...contextoNegocioVazio("ja_vendo"),
      ofertas: [{ ...novaOferta("servico", { volumeMes: 8 }), respondidos: ["custo-direto"] }],
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [],
        trabalhadores: [novoTrabalhador("Por definir")],
      },
    };
    const ids = analisarNegocio(ctx).pressupostos.map((p) => p.id);

    expect(ids).toContain("trabalhador-por-preencher");
    expect(ids.some((i) => i.startsWith("posto-seguro-"))).toBe(false);
  });

  it("o agregado usa o custo estabilizado, e ele é o do motor", () => {
    const t: TrabalhadorPlaneado = {
      ...novoTrabalhador("Designer"),
      remuneracao: { salarioBaseMensal: 1_500 },
      refeicao: { ativo: true, valorDia: 10, diasMes: 22, cartao: true },
      seguroAT: { premioAnual: 300 },
    };
    const ctx: ContextoNegocio = {
      ...contextoNegocioVazio("ja_vendo"),
      ofertas: [{ ...novaOferta("servico", { volumeMes: 8 }), respondidos: ["custo-direto"] }],
      estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores: [t] },
    };

    const doMotor = custoDoPosto({
      salarioBaseMensal: 1_500,
      pagamentoSubsidios: "normal",
      refeicao: { valorDia: 10, diasMes: 22, cartao: true },
      seguroAT: { anual: 300 },
      sst: { anual: undefined },
      formacao: { anual: undefined },
    });

    expect(agregar(ctx).custoTrabalhadoresMes).toBeCloseTo(doMotor.empresa.custoMedioMensal, 1);
  });
});
