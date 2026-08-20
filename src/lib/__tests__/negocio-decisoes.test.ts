// ═══════════════════════════════════════════════════════════════════════
//  AS DECISÕES AVANÇADAS — §49-50, §88, §89, §90
//  ---------------------------------------------------------------------
//  Com o custo e a capacidade os dois no modelo, a contratação deixa de
//  ser um número e passa a poder ser uma decisão. E o custo por hora
//  produtiva fecha o ciclo de volta à pricing engine: um preço por hora
//  abaixo do custo por hora do posto que o entrega perde dinheiro em cada
//  venda, e nenhum dos dois motores o via sozinho.
//
//  O que estes testes prendem, sobretudo: a ferramenta NÃO escolhe. §80 —
//  apresentar um ótimo matemático como conselho esconde tudo o que o
//  modelo não sabe.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  analisarNegocio,
  compararContratacao,
  contextoNegocioVazio,
  custoMedioPorHora,
  custoPorHoraDaEquipa,
  diferencaEntre,
  horasProdutivasDoPosto,
  novaOferta,
  novoTrabalhador,
  situacaoIVADoNegocio,
  type ContextoNegocio,
  type TrabalhadorPlaneado,
} from "@/lib/negocio";
import { custoDoPosto } from "@/lib/payroll/custo-empregador";
import { IVA_LIMIAR_MENSAL } from "@/lib/fiscal-iva";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const posto = (
  funcao: string,
  salario: number,
  capacidade?: TrabalhadorPlaneado["capacidade"],
): TrabalhadorPlaneado => ({
  ...novoTrabalhador(funcao),
  id: `t_${funcao}`,
  remuneracao: { salarioBaseMensal: salario },
  capacidade,
});

function negocio(trabalhadores: TrabalhadorPlaneado[] = []): ContextoNegocio {
  const c = contextoNegocioVazio("ja_vendo");
  return {
    ...c,
    ofertas: [{ ...novaOferta("servico", { volumeMes: 10 }), respondidos: ["custo-direto"] }],
    estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores },
    caixa: { saldoInicial: 5_000, prazoRecebimentoDias: 30, prazoFornecedorDias: 30 },
  };
}

const PRODUTIVO = { aumenta: true, horasSemana: 40, fracaoProdutiva: 0.8 } as const;

// ═══════════════════════════════════════════════════════════════════════
//  1. CUSTO POR HORA PRODUTIVA — §89
// ═══════════════════════════════════════════════════════════════════════

describe("decisoes:custo-hora", () => {
  it("um posto que não produz horas não tem custo por hora", () => {
    const c = negocio([posto("Administrativo", 1_000, { aumenta: false })]);
    const [p] = custoPorHoraDaEquipa(c);

    // `null`, não zero: zero seria uma resposta, e a resposta certa é
    // «esta pergunta não se aplica a este posto».
    expect(p.custoHora).toBeNull();
    expect(custoMedioPorHora(c)).toBeNull();
  });

  it("um posto produtivo tem custo por hora, e é o custo COMPLETO", () => {
    const t = posto("Operador", 1_500, PRODUTIVO);
    const c = negocio([t]);
    const [p] = custoPorHoraDaEquipa(c);

    const custoAnual = custoDoPosto({ salarioBaseMensal: 1_500, pagamentoSubsidios: "normal" })
      .empresa.custoAnual;
    const horasAno = horasProdutivasDoPosto(t) * 12;

    expect(p.custoHora).toBeCloseTo(custoAnual / horasAno, 1);
    // Inclui subsídios, TSU e seguro — não é `salário ÷ horas`.
    expect(p.custoHora!).toBeGreaterThan((1_500 * 12) / horasAno);
  });

  it("as horas são as PRODUTIVAS, não as contratadas", () => {
    const t = posto("Operador", 1_500, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 });
    const [p] = custoPorHoraDaEquipa(negocio([t]));

    // Dividir por 40 × 52 daria um número abaixo da verdade: as férias e
    // a formação obrigatória existem.
    const ingenuo = p.custoAnual / (40 * 52);
    expect(p.custoHora!).toBeGreaterThan(ingenuo);
  });

  it("a média da equipa pondera pelas horas, não pelo número de pessoas", () => {
    const c = negocio([
      posto("Caro", 3_000, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 }),
      posto("Barato", 1_000, { aumenta: true, horasSemana: 8, fracaoProdutiva: 1 }),
    ]);
    const medio = custoMedioPorHora(c)!;
    const [caro, barato] = custoPorHoraDaEquipa(c);

    expect(medio).toBeGreaterThan(0);
    // Com muito mais horas do caro, a média puxa para o lado dele.
    expect(Math.abs(medio - caro.custoHora!)).toBeLessThan(Math.abs(medio - barato.custoHora!));
  });

  it("sem equipa nenhuma, não há média a dar", () => {
    expect(custoMedioPorHora(negocio())).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. CONTRATAR AGORA, DEPOIS, OU NÃO — §88
// ═══════════════════════════════════════════════════════════════════════

describe("decisoes:contratar", () => {
  const c = negocio([posto("Operador", 1_500, PRODUTIVO)]);
  const comparacao = compararContratacao(c, "t_Operador")!;

  it("devolve os três cenários", () => {
    expect(comparacao.cenarios.map((x) => x.quando)).toEqual(["nunca", "agora", "depois"]);
  });

  it("contratar baixa o resultado — e isso é o custo da decisão", () => {
    const [nunca, agora] = comparacao.cenarios;
    expect(agora.resultadoOperacionalMes).toBeLessThan(nunca.resultadoOperacionalMes);
  });

  it("um posto produtivo acrescenta capacidade — e sem contratar não há", () => {
    const [nunca, agora] = comparacao.cenarios;
    expect(nunca.capacidadeEquipaMes).toBe(0);
    expect(agora.capacidadeEquipaMes).toBeGreaterThan(0);
    expect(comparacao.produtivo).toBe(true);
  });

  it("adiar melhora o primeiro ano — é esse o trade-off", () => {
    const [, agora, depois] = comparacao.cenarios;
    // O custo estabilizado é o mesmo; o que muda é a caixa do primeiro ano.
    expect(depois.capitalNecessario).toBeLessThanOrEqual(agora.capitalNecessario);
  });

  it("um posto administrativo custa e não acrescenta capacidade", () => {
    const admin = compararContratacao(negocio([posto("Apoio", 1_000, { aumenta: false })]), "t_Apoio")!;
    const [nunca, agora] = admin.cenarios;

    expect(agora.resultadoOperacionalMes).toBeLessThan(nunca.resultadoOperacionalMes);
    expect(agora.capacidadeEquipaMes).toBe(0);
    expect(admin.produtivo).toBe(false);
  });

  it("um posto sem salário não é comparável — não é uma contratação", () => {
    expect(compararContratacao(negocio([posto("Vazio", 0)]), "t_Vazio")).toBeNull();
  });

  it("um id que não existe devolve `null` em vez de rebentar", () => {
    expect(compararContratacao(c, "nao-existe")).toBeNull();
  });

  it("os outros postos continuam em todos os cenários", () => {
    const dois = negocio([posto("A", 1_200, PRODUTIVO), posto("B", 1_000, { aumenta: false })]);
    const so = compararContratacao(dois, "t_A")!;
    const semA = so.cenarios[0];

    // «Sem contratar A» ainda tem B a custar dinheiro.
    const semNinguem = analisarNegocio(negocio());
    expect(semA.resultadoOperacionalMes).toBeLessThan(semNinguem.resultadoOperacionalMes);
  });

  it("`diferencaEntre` mede, não julga", () => {
    const [nunca, agora] = comparacao.cenarios;
    const d = diferencaEntre(nunca, agora);

    expect(d.resultado).toBeLessThan(0);
    expect(d.capacidade).toBeGreaterThan(0);
    // Não devolve veredicto nenhum: só três números.
    expect(Object.keys(d).sort()).toEqual(["capacidade", "capital", "resultado"]);
  });

  it("a interface não recomenda — mostra o trade-off (§80)", () => {
    const src = ler("src/components/negocio/DecisaoContratar.tsx");
    expect(src).toContain("Não escolhemos por ti");
    expect(src).not.toMatch(/recomendamos|deves contratar|a melhor opção é/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. A SITUAÇÃO DE IVA — §49, §50
// ═══════════════════════════════════════════════════════════════════════

describe("decisoes:iva", () => {
  const comVolume = (volumeAnual: number, enquadramento: "independente" | "sociedade" = "independente") => {
    const base = contextoNegocioVazio("empresa_existente");
    return {
      ...base,
      base: { volumeAnual, custosAtividadeAno: 0 },
      fiscal: { ...base.fiscal, enquadramento },
    } as ContextoNegocio;
  };

  it("um volume pequeno cai na isenção do Art. 53.º", () => {
    const c = comVolume(12_000);
    const s = situacaoIVADoNegocio(c, analisarNegocio(c));
    expect(s.limiar).toBeGreaterThan(12_000);
    expect(s.margemAteLimiar).toBeGreaterThan(0);
  });

  it("um volume grande já passou o limiar — e o motor di-lo", () => {
    const c = comVolume(120_000);
    const s = situacaoIVADoNegocio(c, analisarNegocio(c));
    expect(s.margemAteLimiar).toBeLessThan(0);
    expect(s.oQueTensDeFazer.length).toBeGreaterThan(10);
  });

  it("uma sociedade recebe periodicidade; um independente não", () => {
    const soc = comVolume(120_000, "sociedade");
    expect(situacaoIVADoNegocio(soc, analisarNegocio(soc)).periodicidade).toBe("trimestral");

    const ti = comVolume(120_000, "independente");
    expect(situacaoIVADoNegocio(ti, analisarNegocio(ti)).periodicidade).toBeNull();
  });

  it("acima do limiar do Art. 41.º, a sociedade passa a mensal", () => {
    const c = comVolume(IVA_LIMIAR_MENSAL + 10_000, "sociedade");
    expect(situacaoIVADoNegocio(c, analisarNegocio(c)).periodicidade).toBe("mensal");
  });

  it("o ecrã não recodifica nenhum limiar (§53)", () => {
    const src = ler("src/components/negocio/SituacaoIVANegocio.tsx");
    expect(src).toContain("situacaoIVADoNegocio");
    // Nenhum número de limiar nem taxa escritos à mão.
    expect(src).not.toMatch(/\b(15000|15_000|650000|650_000|0\.23)\b/);
  });

  it("o adapter não escreve limiares — chama o motor", () => {
    const src = ler("src/lib/negocio/adapters/iva.ts");
    expect(src).toContain("situacaoIVA(");
    expect(src).not.toMatch(/=\s*\d{4,}/);
  });
});
