// ═══════════════════════════════════════════════════════════════════════
//  AS TRÊS PORTAS DE ENTRADA — §96 e §111 do relatório mestre
//  ---------------------------------------------------------------------
//  A auditoria encontrou três promessas de UX que o código não cumpria:
//
//   · «Já vendo» prometia começar pelo preço atual e abria exatamente a
//     mesma calculadora de «Tenho uma ideia» — só mudava a copy;
//   · «Já tenho empresa» prometia saltar para a estrutura e a comparação
//     e entregava um contexto tão vazio que nada disso abria;
//   · o enquadramento nascia `nao_sei` mesmo para quem tinha acabado de
//     dizer que já tem sociedade.
//
//  Cada teste aqui prende uma dessas promessas ao código.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  agregar,
  agregarBase,
  analisarNegocio,
  contextoNegocioVazio,
  novaOferta,
  novoCustoEstrutura,
  novoTrabalhador,
  temTrabalhadorValido,
  type ContextoNegocio,
} from "@/lib/negocio";
import {
  CAMPO_PRECO_ATUAL,
  comPrecoAtual,
  cenarioPorChave,
  contextoParaIntencao,
  precificar,
  precoAtualDeclarado,
} from "@/lib/pricing";
import { IVA_TAXAS } from "@/lib/fiscal-data";

const perto = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

// ═══════════════════════════════════════════════════════════════════════
//  1. «TENHO UMA IDEIA» — forma o preço, como sempre
// ═══════════════════════════════════════════════════════════════════════

describe("portas:ideia", () => {
  it("nasce em `nao_sei`: a forma jurídica é a pergunta, não a resposta", () => {
    const c = contextoNegocioVazio("ideia");
    expect(c.fiscal.enquadramento).toBe("nao_sei");
    expect(c.fiscal.compararAlternativas).toBe(true);
    expect(c.respondidos).not.toContain("enquadramento");
  });

  it("a intenção `formar` não mexe no objetivo do cenário", () => {
    const base = cenarioPorChave("servico").contexto();
    const depois = contextoParaIntencao(base, "formar");
    expect(depois).toBe(base);
    expect(depois.objetivo.modo).toBe(base.objetivo.modo);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. «JÁ VENDO» — começa mesmo pelo preço atual
// ═══════════════════════════════════════════════════════════════════════

describe("portas:ja-vendo", () => {
  it("a intenção `validar_atual` põe o objetivo em `preco_fixo` sobre o PVP", () => {
    const base = cenarioPorChave("servico").contexto();
    const validar = contextoParaIntencao(base, "validar_atual");

    expect(validar.objetivo.modo).toBe("preco_fixo");
    expect(validar.objetivo.valorEhPVP).toBe(true);
    // Deliberadamente por declarar: um valor por omissão faria a pessoa
    // ver a SUA margem efetiva calculada sobre um preço que nunca cobrou.
    expect(validar.objetivo.valor).toBe(0);
  });

  it("não muta o contexto que recebe", () => {
    const base = cenarioPorChave("servico").contexto();
    const modoAntes = base.objetivo.modo;
    contextoParaIntencao(base, "validar_atual");
    expect(base.objetivo.modo).toBe(modoAntes);
  });

  it("um preço por declarar não conta como declarado", () => {
    const validar = contextoParaIntencao(cenarioPorChave("servico").contexto(), "validar_atual");
    expect(precoAtualDeclarado(validar, [])).toBe(false);
    // Nem sequer marcado: sem valor, a marca não chega.
    expect(precoAtualDeclarado(validar, [CAMPO_PRECO_ATUAL])).toBe(false);
  });

  it("declarado o preço, a engine devolve-o como PVP e calcula a margem EFETIVA", () => {
    const validar = comPrecoAtual(
      contextoParaIntencao(cenarioPorChave("servico").contexto(), "validar_atual"),
      45,
    );
    expect(precoAtualDeclarado(validar, [CAMPO_PRECO_ATUAL])).toBe(true);

    const r = precificar(validar);
    expect(r.ok).toBe(true);
    // O preço é o da pessoa, não um que a ferramenta escolheu.
    expect(perto(r.pvp, 45, 0.5)).toBe(true);
  });

  it("o estúdio passa a intenção certa a cada porta", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/negocio/NegocioStudio.tsx"),
      "utf8",
    );
    expect(src).toContain('intencaoInicial={contexto.maturidade === "ja_vendo" ? "validar_atual" : "formar"}');
  });

  it("a calculadora continua a ser UMA — não há cópia para validar preços", () => {
    // §4: «Não copiar SimuladorPreco». A intenção é uma prop; o motor, os
    // campos e a memória de cálculo são os mesmos.
    const src = readFileSync(
      join(process.cwd(), "src/components/precos/SimuladorPreco.tsx"),
      "utf8",
    );
    expect(src).toContain("intencaoInicial");
    expect(src).toContain("contextoParaIntencao");
    // E o ecrã da primeira pergunta não reimplementa a engine.
    const gate = readFileSync(join(process.cwd(), "src/components/precos/PrecoAtual.tsx"), "utf8");
    expect(gate).not.toMatch(/precificar\s*\(/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. «JÁ TENHO SOCIEDADE» — o atalho existe mesmo
// ═══════════════════════════════════════════════════════════════════════

describe("portas:empresa-existente", () => {
  it("o enquadramento nasce `sociedade` e não volta a ser perguntado", () => {
    const c = contextoNegocioVazio("empresa_existente");
    expect(c.fiscal.enquadramento).toBe("sociedade");
    expect(c.respondidos).toContain("enquadramento");
  });

  it("as outras portas continuam a nascer indecisas", () => {
    for (const m of ["ideia", "ja_vendo"] as const) {
      expect(contextoNegocioVazio(m).fiscal.enquadramento).toBe("nao_sei");
    }
  });

  it("sem ofertas, um volume declarado dá receita — e abre o resto do percurso", () => {
    const c: ContextoNegocio = {
      ...contextoNegocioVazio("empresa_existente"),
      base: { volumeAnual: 120_000, custosAtividadeAno: 30_000 },
    };
    const r = analisarNegocio(c);

    expect(r.ofertas).toHaveLength(0);
    expect(perto(r.receitaSemIVAMes, 10_000)).toBe(true);
    expect(perto(r.custosVariaveisMes, 2_500)).toBe(true);
    expect(perto(r.receitaSemIVAAno, 120_000)).toBe(true);
    // É esta a condição que o estúdio usa para abrir comparação, caixa e
    // conclusão. Antes era sempre falsa nesta porta.
    expect(r.receitaSemIVAMes > 0).toBe(true);
  });

  it("com IVA dentro, converte pela taxa da região — e o IVA nunca é receita", () => {
    const taxa = IVA_TAXAS.continente.value.normal;
    const a = agregarBase({ volumeAnual: 123_000, comIVA: true, custosAtividadeAno: 0 }, "continente");

    expect(perto(a.receitaClienteMes, 123_000 / 12)).toBe(true);
    expect(perto(a.receitaSemIVAMes, 123_000 / 12 / (1 + taxa))).toBe(true);
    expect(perto(a.ivaCobradoMes, a.receitaClienteMes - a.receitaSemIVAMes)).toBe(true);
    expect(a.receitaSemIVAMes).toBeLessThan(a.receitaClienteMes);
  });

  it("a taxa da Madeira é a da Madeira — a região não é decorativa", () => {
    const cont = agregarBase({ volumeAnual: 120_000, comIVA: true, custosAtividadeAno: 0 }, "continente");
    const mad = agregarBase({ volumeAnual: 120_000, comIVA: true, custosAtividadeAno: 0 }, "madeira");
    // A taxa normal da Madeira é mais baixa → sobra mais volume de negócios.
    expect(mad.receitaSemIVAMes).toBeGreaterThan(cont.receitaSemIVAMes);
  });

  it("sem `comIVA` não se inventa IVA nenhum", () => {
    const a = agregarBase({ volumeAnual: 120_000, custosAtividadeAno: 0 }, "continente");
    expect(a.ivaCobradoMes).toBe(0);
    expect(a.receitaSemIVAMes).toBe(a.receitaClienteMes);
  });

  it("o ponto de equilíbrio vem em euros, não em «0 vendas»", () => {
    const c: ContextoNegocio = {
      ...contextoNegocioVazio("empresa_existente"),
      base: { volumeAnual: 120_000, custosAtividadeAno: 60_000 },
      estrutura: {
        overheadMensal: [novoCustoEstrutura("contabilidade", "Contabilidade", 150)],
        investimentosIniciais: [],
      },
    };
    const r = analisarNegocio(c);

    expect(r.breakEven.base).toBe("receita");
    expect(r.breakEven.possivel).toBe(true);
    expect(r.breakEven.vendasMes).toBe(0);
    // Margem de 50% → 150 € de estrutura exigem 300 € de faturação.
    expect(perto(r.breakEven.receitaSemIVAMes, 300)).toBe(true);
    expect(r.breakEven.nota).toBeTruthy();
  });

  it("com ofertas, o equilíbrio volta a ser em unidades", () => {
    const c: ContextoNegocio = {
      ...contextoNegocioVazio("ja_vendo"),
      ofertas: [{ ...novaOferta("servico", { volumeMes: 10 }), respondidos: ["custo-direto"] }],
      estrutura: {
        overheadMensal: [novoCustoEstrutura("contabilidade", "Contabilidade", 150)],
        investimentosIniciais: [],
      },
    };
    expect(analisarNegocio(c).breakEven.base).toBe("unidades");
  });

  it("a base soma-se às ofertas — não as substitui", () => {
    const so = { ...novaOferta("servico", { volumeMes: 4 }), respondidos: ["custo-direto"] };
    const semBase = agregar({ ...contextoNegocioVazio("ja_vendo"), ofertas: [so] });
    const comBase = agregar({
      ...contextoNegocioVazio("ja_vendo"),
      ofertas: [so],
      base: { volumeAnual: 12_000, custosAtividadeAno: 0 },
    });

    expect(perto(comBase.receitaSemIVAMes, semBase.receitaSemIVAMes + 1_000)).toBe(true);
    expect(comBase.receitaBaseMes).toBeGreaterThan(0);
    expect(semBase.receitaBaseMes).toBe(0);
  });

  it("um resultado negativo é dito mesmo sem ofertas", () => {
    const c: ContextoNegocio = {
      ...contextoNegocioVazio("empresa_existente"),
      base: { volumeAnual: 12_000, custosAtividadeAno: 6_000 },
      estrutura: {
        overheadMensal: [novoCustoEstrutura("sede", "Sede", 2_000)],
        investimentosIniciais: [],
      },
    };
    const r = analisarNegocio(c);
    expect(r.resultadoOperacionalMes).toBeLessThan(0);
    expect(r.avisos.map((a) => a.id)).toContain("resultado-negativo");
  });

  it("declarar a base é trabalho da pessoa — mas fica no livro de pressupostos", () => {
    const c: ContextoNegocio = {
      ...contextoNegocioVazio("empresa_existente"),
      base: { volumeAnual: 80_000, custosAtividadeAno: 20_000 },
    };
    const r = analisarNegocio(c);
    const p = r.pressupostos.find((x) => x.id === "base-declarada");

    expect(p).toBeTruthy();
    // §86: «declarado pelo utilizador», nunca «real».
    expect(p!.origem).toBe("utilizador");
    expect(p!.valor).toMatch(/declarado por ti/);
    // E a confiança sobe acima de «exploratório», porque há trabalho real.
    expect(r.confianca).not.toBe("exploratorio");
  });

  it("sem base e sem ofertas, continua exploratório — nada foi declarado", () => {
    expect(analisarNegocio(contextoNegocioVazio("empresa_existente")).confianca).toBe("exploratorio");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. §41 — UM TRABALHADOR VAZIO NÃO PODE AUMENTAR A CONFIANÇA
// ═══════════════════════════════════════════════════════════════════════

describe("portas:trabalhador-vazio", () => {
  const comTrabalhador = (salario: number): ContextoNegocio => ({
    ...contextoNegocioVazio("ja_vendo"),
    ofertas: [{ ...novaOferta("servico", { volumeMes: 5 }), respondidos: ["custo-direto"] }],
    estrutura: {
      overheadMensal: [],
      investimentosIniciais: [],
      trabalhadores: [{ ...novoTrabalhador("Designer"), salarioBrutoMensal: salario }],
    },
  });

  it("um cartão em branco não conta como estrutura declarada", () => {
    expect(temTrabalhadorValido(comTrabalhador(0).estrutura)).toBe(false);
    expect(temTrabalhadorValido(comTrabalhador(1_500).estrutura)).toBe(true);
  });

  it("adicionar um posto vazio NÃO sobe a confiança para «estruturado»", () => {
    expect(analisarNegocio(comTrabalhador(0)).confianca).toBe("estimado");
    expect(analisarNegocio(comTrabalhador(1_500)).confianca).toBe("estruturado");
  });

  it("e o posto por preencher aparece como pressuposto, em vez de desaparecer", () => {
    const ids = analisarNegocio(comTrabalhador(0)).pressupostos.map((p) => p.id);
    expect(ids).toContain("trabalhador-por-preencher");
    expect(analisarNegocio(comTrabalhador(1_500)).pressupostos.map((p) => p.id)).not.toContain(
      "trabalhador-por-preencher",
    );
  });
});
