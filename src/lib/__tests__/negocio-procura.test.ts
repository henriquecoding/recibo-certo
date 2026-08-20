// ═══════════════════════════════════════════════════════════════════════
//  SAZONALIDADE, EVOLUÇÃO E TIMING — §55-58 do relatório mestre
//  ---------------------------------------------------------------------
//  O domínio suportava sazonalidade e crescimento composto; a experiência
//  não estava à altura do motor. Ninguém configurava nenhum dos dois, e
//  por isso todos os negócios eram projetados como se vendessem o mesmo
//  em agosto e em dezembro, para sempre.
//
//  A distinção que estes testes prendem: SAZONALIDADE é a forma do ano e
//  repete-se; EVOLUÇÃO é para onde o negócio vai e não se repete. E um
//  ARRANQUE tem teto — ao contrário de uma taxa composta, que ao 24.º mês
//  dá um número que ninguém previu.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  analisarNegocio,
  contextoNegocioVazio,
  curvaComPico,
  curvaSazonal,
  escalaDoMes,
  evolucaoDe,
  fatorEvolucao,
  fatorSazonal,
  normalizarCurva,
  novaOferta,
  novoInvestimento,
  procuraConfigurada,
  projetarCaixa,
  type ContextoNegocio,
} from "@/lib/negocio";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

function negocio(extra: Partial<ContextoNegocio> = {}): ContextoNegocio {
  const c = contextoNegocioVazio("ja_vendo");
  return {
    ...c,
    ofertas: [{ ...novaOferta("servico", { volumeMes: 10 }), respondidos: ["custo-direto"] }],
    caixa: { saldoInicial: 10_000, prazoRecebimentoDias: 0, prazoFornecedorDias: 0 },
    procura: { ...c.procura, horizonteMeses: 24 },
    ...extra,
  };
}

const comProcura = (patch: Partial<ContextoNegocio["procura"]>, base = negocio()) =>
  ({ ...base, procura: { ...base.procura, ...patch } }) as ContextoNegocio;

// ═══════════════════════════════════════════════════════════════════════
//  1. SAZONALIDADE — §55, §56
// ═══════════════════════════════════════════════════════════════════════

describe("procura:sazonalidade", () => {
  it("sem sazonalidade, todos os meses valem 1", () => {
    const c = negocio();
    expect(curvaSazonal(c)).toEqual(Array.from({ length: 12 }, () => 1));
    expect(fatorSazonal(c, 7)).toBe(1);
  });

  it("a curva do NEGÓCIO ganha à das ofertas", () => {
    const base = negocio();
    const comOfertaSazonal: ContextoNegocio = {
      ...base,
      ofertas: base.ofertas.map((o) => ({ ...o, sazonalidade: Array.from({ length: 12 }, () => 2) })),
      procura: { ...base.procura, modo: "sazonal", sazonalidade: curvaComPico(6) },
    };

    // A do negócio: pico em julho, não 2 em todo o lado.
    expect(fatorSazonal(comOfertaSazonal, 6)).toBeGreaterThan(1);
    expect(fatorSazonal(comOfertaSazonal, 0)).toBeLessThan(1);
    expect(curvaSazonal(comOfertaSazonal).every((f) => f !== 2)).toBe(true);
  });

  it("sem curva do negócio, a das ofertas continua a valer", () => {
    const base = negocio();
    const c: ContextoNegocio = {
      ...base,
      ofertas: base.ofertas.map((o) => ({
        ...o,
        sazonalidade: [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      })),
      procura: { ...base.procura, modo: "sazonal" },
    };
    expect(fatorSazonal(c, 0)).toBe(2);
  });

  it("em modo simples, a curva é ignorada — mesmo que exista", () => {
    const c = comProcura({ modo: "simples", sazonalidade: curvaComPico(6) });
    expect(fatorSazonal(c, 6)).toBe(1);
  });

  it("uma curva com pico soma 12 — dar forma ao ano não muda o volume do ano", () => {
    const curva = curvaComPico(6);
    expect(curva.reduce((s, x) => s + x, 0)).toBeCloseTo(12, 1);
    // E tem mesmo pico onde se pediu.
    expect(curva[6]).toBeGreaterThan(curva[0]);
  });

  it("`normalizarCurva` repõe o total sem apagar a forma", () => {
    const desequilibrada = [3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const n = normalizarCurva(desequilibrada);

    expect(n.reduce((s, x) => s + x, 0)).toBeCloseTo(12, 1);
    // A forma mantém-se: os três primeiros continuam a ser os maiores.
    expect(n[0]).toBeGreaterThan(n[5]);
  });

  it("uma curva de lixo não rebenta", () => {
    // Vazia: doze meses médios.
    expect(normalizarCurva([])).toEqual(Array.from({ length: 12 }, () => 1));
    // Toda a zero: não há ano nenhum para normalizar, volta ao uniforme.
    expect(normalizarCurva(Array.from({ length: 12 }, () => 0))).toEqual(
      Array.from({ length: 12 }, () => 1),
    );
    // Curta: os meses que faltam contam como médios, não como zero — uma
    // curva incompleta não pode apagar três quartos do ano.
    const curta = normalizarCurva([0, 0, 0]);
    expect(curta).toHaveLength(12);
    expect(curta.reduce((s, x) => s + x, 0)).toBeCloseTo(12, 1);
    expect(curta.slice(0, 3)).toEqual([0, 0, 0]);
  });

  it("a sazonalidade muda o saldo mínimo da caixa", () => {
    const plana = projetarCaixa(negocio());
    const comEpoca = projetarCaixa(comProcura({ modo: "sazonal", sazonalidade: curvaComPico(6, 0.8) }));

    // Com época, há meses fracos — e é neles que a conta aperta.
    expect(comEpoca.saldoMinimo).toBeLessThan(plana.saldoMinimo);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. EVOLUÇÃO — §57
// ═══════════════════════════════════════════════════════════════════════

describe("procura:evolucao", () => {
  it("por omissão é estável", () => {
    const c = negocio();
    expect(evolucaoDe(c)).toBe("estavel");
    expect(fatorEvolucao(c, 1)).toBe(1);
    expect(fatorEvolucao(c, 24)).toBe(1);
    expect(procuraConfigurada(c)).toBe(false);
  });

  it("um crescimento guardado sem `evolucao` continua a valer", () => {
    // Projetos anteriores a este contrato têm a resposta lá. Ignorá-la
    // para usar o valor por omissão seria apagar trabalho de alguém.
    const c = comProcura({ crescimentoMensal: 0.03 });
    expect(evolucaoDe(c)).toBe("crescimento");
    expect(fatorEvolucao(c, 13)).toBeCloseTo(Math.pow(1.03, 12), 4);
  });

  it("o arranque tem TETO — e é isso que o distingue de uma taxa", () => {
    const c = comProcura({ evolucao: "arranque", arranqueMeses: 6 });

    expect(fatorEvolucao(c, 1)).toBeCloseTo(1 / 6, 4);
    expect(fatorEvolucao(c, 3)).toBeCloseTo(0.5, 4);
    expect(fatorEvolucao(c, 6)).toBe(1);
    // A partir do teto, fica lá. Uma taxa composta continuaria a subir.
    expect(fatorEvolucao(c, 24)).toBe(1);
  });

  it("um crescimento composto NÃO tem teto", () => {
    const c = comProcura({ evolucao: "crescimento", crescimentoMensal: 0.03 });
    expect(fatorEvolucao(c, 24)).toBeGreaterThan(fatorEvolucao(c, 12));
    expect(fatorEvolucao(c, 24)).toBeGreaterThan(1.9);
  });

  it("escolher «estável» limpa a taxa antiga", () => {
    // Deixá-la lá fazia o resultado depender de um número invisível.
    const src = ler("src/components/negocio/ProcuraNegocio.tsx");
    expect(src).toContain('crescimentoMensal: op.valor === "crescimento"');
  });

  it("o arranque baixa a receita dos primeiros meses na caixa", () => {
    const imediato = projetarCaixa(negocio());
    const gradual = projetarCaixa(comProcura({ evolucao: "arranque", arranqueMeses: 6 }));

    expect(gradual.meses[0].recebimentos).toBeLessThan(imediato.meses[0].recebimentos);
    // E ao 6.º mês já é igual.
    expect(gradual.meses[5].recebimentos).toBeCloseTo(imediato.meses[5].recebimentos, 1);
    // O buraco é maior — que é a informação que faltava a quem arranca.
    expect(gradual.saldoMinimo).toBeLessThan(imediato.saldoMinimo);
  });

  it("os dois eixos multiplicam-se e não se confundem", () => {
    const c = comProcura({
      modo: "sazonal",
      sazonalidade: [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      evolucao: "crescimento",
      crescimentoMensal: 0.1,
    });

    // Mês 13: janeiro outra vez (fator 2) e 12 meses de crescimento.
    expect(escalaDoMes(c, 13)).toBeCloseTo(2 * Math.pow(1.1, 12), 4);
  });

  it("o mês zero e os negativos não geram escala nenhuma", () => {
    const c = comProcura({ evolucao: "arranque", arranqueMeses: 6 });
    expect(escalaDoMes(c, 0)).toBe(0);
    expect(escalaDoMes(c, -3)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. O PRESSUPOSTO DISTINGUE RESPOSTA DE OMISSÃO
// ═══════════════════════════════════════════════════════════════════════

describe("procura:pressupostos", () => {
  it("«estável» por omissão é pressuposto; declarado não é", () => {
    const omisso = analisarNegocio(negocio()).pressupostos.map((p) => p.id);
    expect(omisso).toContain("crescimento");

    const declarado = analisarNegocio(comProcura({ evolucao: "estavel" })).pressupostos.map((p) => p.id);
    expect(declarado).not.toContain("crescimento");
  });

  it("um arranque declarado aparece como resposta, não como omissão", () => {
    const p = analisarNegocio(comProcura({ evolucao: "arranque", arranqueMeses: 4 })).pressupostos.find(
      (x) => x.id === "arranque",
    );
    expect(p).toBeTruthy();
    expect(p!.origem).toBe("utilizador");
    expect(p!.valor).toContain("4 meses");
  });

  it("declarar sazonalidade fecha o pressuposto da sazonalidade", () => {
    const com = analisarNegocio(comProcura({ modo: "sazonal", sazonalidade: curvaComPico(6) }));
    expect(com.pressupostos.map((p) => p.id)).not.toContain("sazonalidade");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. TIMING DE INVESTIMENTO — §58
// ═══════════════════════════════════════════════════════════════════════

describe("procura:investimento", () => {
  it("a interface deixa escolher o mês, não só «antes de abrir»", () => {
    const src = ler("src/components/negocio/EstruturaNegocio.tsx");
    expect(src).toContain("Quando sai este dinheiro");
    expect(src).toContain("Antes de abrir");
    expect(src).toContain("No mês {m}");
  });

  it("um investimento no mês 4 não afunda o mês 0", () => {
    const c = negocio({
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [{ ...novoInvestimento("equipamento", "Forno"), valor: 9_000, mes: 4 }],
      },
    });
    const r = projetarCaixa(c);

    expect(r.meses[0].investimentos).toBe(0);
    expect(r.meses[3].investimentos).toBeCloseTo(9_000, 1);
    expect(r.mesDoSaldoMinimo).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  5. A UI PERGUNTA ANTES DE ABRIR DOZE CAMPOS — §56
// ═══════════════════════════════════════════════════════════════════════

describe("procura:ui", () => {
  const src = ler("src/components/negocio/ProcuraNegocio.tsx");

  it("a pergunta vem primeiro", () => {
    expect(src).toContain("As vendas são aproximadamente iguais durante o ano?");
  });

  it("a curva é editável por teclado", () => {
    // Um gráfico que só se arrasta com o rato é um gráfico que metade
    // das pessoas não consegue usar.
    expect(src).toContain('type="range"');
    expect(src).toContain("htmlFor={`sazonal-");
  });

  it("as três evoluções são apresentadas em linguagem de quem responde", () => {
    expect(src).toContain("Arranque gradual");
    expect(src).toContain("Demora a chegar ao volume esperado");
    // E o número só aparece quando é preciso.
    expect(src).toContain('evolucao === "crescimento" ?');
  });
});
