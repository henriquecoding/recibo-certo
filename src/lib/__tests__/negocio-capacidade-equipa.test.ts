// ═══════════════════════════════════════════════════════════════════════
//  A CAPACIDADE DA EQUIPA — §39, §40, §103 do relatório mestre
//  ---------------------------------------------------------------------
//  Contratar alguém subia o custo e o ponto de equilíbrio, e não mexia na
//  capacidade. Isso torna qualquer contratação economicamente unilateral
//  e sempre má — e é falso para um cargo produtivo.
//
//  A correção tinha de vir com o seu próprio limite: contratar tão-pouco
//  aumenta a capacidade SEMPRE. Um administrativo custa e não entrega
//  horas faturáveis, e assumir o contrário seria o erro simétrico.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  analisarNegocio,
  capacidadeDaEquipa,
  contextoNegocioVazio,
  horasProdutivasDoPosto,
  novaOferta,
  novoTrabalhador,
  type ContextoNegocio,
  type TrabalhadorPlaneado,
} from "@/lib/negocio";
import { FERIAS, FORMACAO_CONTINUA } from "@/lib/fiscal-data";

// ─── Montagem ──────────────────────────────────────────────────────────

function trabalhador(
  funcao: string,
  salario: number,
  capacidade?: TrabalhadorPlaneado["capacidade"],
): TrabalhadorPlaneado {
  return {
    ...novoTrabalhador(funcao),
    id: `t_${funcao}`,
    remuneracao: { salarioBaseMensal: salario },
    capacidade,
  };
}

/** Um negócio de serviços com modelo de tempo — o único que tem gargalo. */
function negocioDeHoras(trabalhadores: TrabalhadorPlaneado[] = []): ContextoNegocio {
  const c = contextoNegocioVazio("ja_vendo");
  return {
    ...c,
    ofertas: [{ ...novaOferta("servico", { volumeMes: 10 }), respondidos: ["custo-direto"] }],
    estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores },
  };
}

const gargaloDe = (ctx: ContextoNegocio) =>
  analisarNegocio(ctx).capacidade.find((c) => c.ofertaId === "__horas__");

// ═══════════════════════════════════════════════════════════════════════
//  1. O QUE NÃO SE ASSUME
// ═══════════════════════════════════════════════════════════════════════

describe("equipa:nao-assume", () => {
  it("um posto sem capacidade declarada não acrescenta horas nenhumas", () => {
    expect(horasProdutivasDoPosto(trabalhador("Apoio", 1_000))).toBe(0);
  });

  it("um administrativo custa e NÃO aumenta capacidade (§103)", () => {
    const admin = trabalhador("Administrativo", 1_000, { aumenta: false });
    expect(horasProdutivasDoPosto(admin)).toBe(0);
    expect(capacidadeDaEquipa({ overheadMensal: [], investimentosIniciais: [], trabalhadores: [admin] }).horasMes).toBe(
      0,
    );
  });

  it("um posto sem salário não é capacidade — não é sequer uma contratação", () => {
    const fantasma = trabalhador("Fantasma", 0, { aumenta: true, horasSemana: 40 });
    expect(
      capacidadeDaEquipa({ overheadMensal: [], investimentosIniciais: [], trabalhadores: [fantasma] }).horasMes,
    ).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. UM POSTO PRODUTIVO ACRESCENTA — E QUANTO
// ═══════════════════════════════════════════════════════════════════════

describe("equipa:produtivo", () => {
  it("acrescenta horas, já sem férias nem formação (§37)", () => {
    const op = trabalhador("Operador", 1_200, {
      aumenta: true,
      horasSemana: 40,
      fracaoProdutiva: 1,
    });

    const semanasFerias = FERIAS.diasUteisAno.value / 5;
    const esperado = (40 * (52 - semanasFerias) - FORMACAO_CONTINUA.horasAnuais.value) / 12;

    expect(horasProdutivasDoPosto(op)).toBeCloseTo(esperado, 1);
    // E é menos do que a conta ingénua de 40 × 52 ÷ 12.
    expect(horasProdutivasDoPosto(op)).toBeLessThan((40 * 52) / 12);
  });

  it("a fração faturável reduz o que entra no teto", () => {
    const cheio = trabalhador("A", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 });
    const meio = trabalhador("B", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 0.5 });
    expect(horasProdutivasDoPosto(meio)).toBeCloseTo(horasProdutivasDoPosto(cheio) / 2, 1);
  });

  it("meio horário acrescenta cerca de metade", () => {
    const inteiro = trabalhador("A", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 });
    const parcial = trabalhador("B", 600, { aumenta: true, horasSemana: 20, fracaoProdutiva: 1 });
    // Não é exatamente metade: a formação é anual e não escala com o horário.
    expect(horasProdutivasDoPosto(parcial)).toBeLessThan(horasProdutivasDoPosto(inteiro));
    expect(horasProdutivasDoPosto(parcial)).toBeGreaterThan(horasProdutivasDoPosto(inteiro) * 0.4);
  });

  it("mais formação declarada tira mais do teto produtivo", () => {
    const minimo = trabalhador("A", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 });
    const muita: TrabalhadorPlaneado = {
      ...trabalhador("B", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 }),
      formacao: { horasAno: 200 },
    };
    expect(horasProdutivasDoPosto(muita)).toBeLessThan(horasProdutivasDoPosto(minimo));
  });

  it("dois postos produtivos somam-se — são pessoas diferentes", () => {
    const a = trabalhador("A", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 });
    const b = trabalhador("B", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 });
    const equipa = capacidadeDaEquipa({
      overheadMensal: [],
      investimentosIniciais: [],
      trabalhadores: [a, b],
    });

    expect(equipa.postos).toHaveLength(2);
    expect(equipa.horasMes).toBeCloseTo(horasProdutivasDoPosto(a) * 2, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. O GARGALO DO NEGÓCIO MUDA — §103
// ═══════════════════════════════════════════════════════════════════════

describe("equipa:gargalo", () => {
  it("contratar um administrativo: custo sobe, capacidade igual", () => {
    const sem = negocioDeHoras();
    const com = negocioDeHoras([trabalhador("Administrativo", 1_000, { aumenta: false })]);

    const a = analisarNegocio(sem);
    const b = analisarNegocio(com);

    expect(b.custoTrabalhadoresMes).toBeGreaterThan(a.custoTrabalhadoresMes);
    expect(b.capacidadeEquipaMes).toBe(0);
    expect(gargaloDe(com)?.maximo).toBe(gargaloDe(sem)?.maximo);
  });

  it("contratar um operador produtivo: custo sobe E capacidade sobe", () => {
    const sem = negocioDeHoras();
    const com = negocioDeHoras([
      trabalhador("Operador", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 0.8 }),
    ]);

    const a = analisarNegocio(sem);
    const b = analisarNegocio(com);

    expect(b.custoTrabalhadoresMes).toBeGreaterThan(a.custoTrabalhadoresMes);
    expect(b.capacidadeEquipaMes).toBeGreaterThan(0);
    expect(gargaloDe(com)!.maximo).toBeGreaterThan(gargaloDe(sem)!.maximo);
    // A carga não muda: o volume é o mesmo.
    expect(gargaloDe(com)!.carga).toBe(gargaloDe(sem)!.carga);
  });

  it("a mensagem diz de onde vem o teto quando parte é da equipa", () => {
    const com = negocioDeHoras([
      trabalhador("Operador", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 0.8 }),
    ]);
    expect(gargaloDe(com)!.mensagem).toMatch(/da equipa/);
  });

  it("sem equipa produtiva, a mensagem não fala de equipa nenhuma", () => {
    expect(gargaloDe(negocioDeHoras())!.mensagem).not.toMatch(/da equipa/);
  });

  it("volume acima da capacidade continua a avisar, mesmo com equipa (§103)", () => {
    // Um volume absurdo não passa a caber só porque se contratou alguém.
    const ctx = negocioDeHoras([
      trabalhador("Operador", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 }),
    ]);
    const enorme: ContextoNegocio = {
      ...ctx,
      ofertas: ctx.ofertas.map((o) => ({ ...o, volume: { esperadoMes: 500 } })),
    };

    const r = analisarNegocio(enorme);
    expect(gargaloDe(enorme)!.estado).toBe("excedida");
    expect(r.avisos.map((a) => a.id)).toContain("capacidade-__horas__");
  });

  it("o teto continua a ser o do titular quando não há equipa", () => {
    const g = gargaloDe(negocioDeHoras());
    expect(g).toBeTruthy();
    expect(g!.maximo).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. A CONTRATAÇÃO DEIXA DE SER SEMPRE MÁ IDEIA — §39
// ═══════════════════════════════════════════════════════════════════════

describe("equipa:decisao", () => {
  it("com um posto produtivo, o negócio pode subir o volume sem estourar", () => {
    const base = negocioDeHoras();
    const cabeSemEquipa = gargaloDe(base)!.maximo;

    const comEquipa = negocioDeHoras([
      trabalhador("Operador", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 0.8 }),
    ]);
    const cabeComEquipa = gargaloDe(comEquipa)!.maximo;

    // Este é o número que faltava para a contratação ser uma decisão: o
    // custo já se via, a capacidade não.
    expect(cabeComEquipa - cabeSemEquipa).toBeGreaterThan(100);
  });

  it("o resultado expõe as horas da equipa para a interface as poder mostrar", () => {
    const r = analisarNegocio(
      negocioDeHoras([trabalhador("Op", 1_200, { aumenta: true, horasSemana: 40, fracaoProdutiva: 1 })]),
    );
    expect(r.capacidadeEquipaMes).toBeGreaterThan(0);
  });
});
