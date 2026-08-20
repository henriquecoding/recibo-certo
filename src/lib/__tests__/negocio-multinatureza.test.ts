// ═══════════════════════════════════════════════════════════════════════
//  PORTEFÓLIO MISTO E ATIVIDADE DESCONHECIDA — §46, §47, §48 e §105
//  ---------------------------------------------------------------------
//  Dois erros que davam sempre números plausíveis:
//
//   ① reduzir um portefólio misto à «atividade dominante». 40 000 € de
//      consultoria (coef. 0,75) mais 30 000 € de venda de produtos
//      (coef. 0,15) tratados como 70 000 € de consultoria inflacionam o
//      rendimento tributável em ~18 000 €;
//   ② cair em `art151` quando nenhuma oferta declarava atividade. Isso
//      transforma ausência de informação numa decisão fiscal — e o
//      coeficiente pode variar entre 0,15 e 0,75.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  analisarNegocio,
  comparacaoPossivel,
  contextoNegocioVazio,
  entradaComparacao,
  extremosDaComparacao,
  naturezaPrincipal,
  novaOferta,
  portfolioFiscal,
  type ContextoNegocio,
  type OfertaNegocio,
} from "@/lib/negocio";
import { compararRegimes } from "@/lib/fiscal";
import {
  BASE_SS_POR_TIPO,
  COEFICIENTE_POR_TIPO,
  SS_COEFICIENTE,
  type TipoAtividade,
} from "@/lib/fiscal-data";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** Uma oferta com natureza fiscal declarada e volume conhecido. */
function oferta(
  nome: string,
  cenario: "servico" | "produto_revenda",
  volumeMes: number,
  atividade?: TipoAtividade,
): OfertaNegocio {
  const o = novaOferta(cenario, { nome, volumeMes });
  o.pricing.vendedor.atividade = atividade;
  // Regime normal para o IVA não interferir na leitura do volume.
  o.pricing.vendedor.regimeIVA = "isento_art53";
  return { ...o, respondidos: ["custo-direto"] };
}

function negocioCom(ofertas: OfertaNegocio[]): ContextoNegocio {
  return { ...contextoNegocioVazio("ja_vendo"), ofertas };
}

// ═══════════════════════════════════════════════════════════════════════
//  1. O PORTEFÓLIO NÃO É REDUZIDO A UMA NATUREZA — §46, §47
// ═══════════════════════════════════════════════════════════════════════

describe("multinatureza:portfolio", () => {
  it("cada natureza aparece com o seu volume, sem se fundirem", () => {
    const n = analisarNegocio(
      negocioCom([
        oferta("Consultoria", "servico", 8, "art151"),
        oferta("Produtos", "produto_revenda", 40, "vendas"),
      ]),
    );
    const p = portfolioFiscal(n);

    expect(p.estado).toBe("conhecida");
    expect(p.rendimentos).toHaveLength(2);
    expect(p.rendimentos.map((r) => r.natureza).sort()).toEqual(["art151", "vendas"]);
    // Ordenado por peso, para a interface poder nomear a principal.
    expect(p.rendimentos[0].valorAnual).toBeGreaterThanOrEqual(p.rendimentos[1].valorAnual);
  });

  it("as ofertas da mesma natureza somam-se numa linha só", () => {
    const p = portfolioFiscal(
      analisarNegocio(
        negocioCom([
          oferta("Consultoria A", "servico", 4, "art151"),
          oferta("Consultoria B", "servico", 4, "art151"),
        ]),
      ),
    );

    expect(p.rendimentos).toHaveLength(1);
    expect(p.rendimentos[0].ofertas).toHaveLength(2);
  });

  it("o coeficiente é a média PONDERADA — não o da oferta com mais peso", () => {
    const n = analisarNegocio(
      negocioCom([
        oferta("Consultoria", "servico", 8, "art151"),
        oferta("Produtos", "produto_revenda", 40, "vendas"),
      ]),
    );
    const p = portfolioFiscal(n);

    const [a, b] = p.rendimentos;
    const esperado =
      (a.valorAnual * COEFICIENTE_POR_TIPO[a.natureza] +
        b.valorAnual * COEFICIENTE_POR_TIPO[b.natureza]) /
      (a.valorAnual + b.valorAnual);

    expect(p.coefIRS).toBeCloseTo(esperado, 6);
    // E está ENTRE os dois — nunca é o de uma só.
    const menor = Math.min(COEFICIENTE_POR_TIPO.art151, COEFICIENTE_POR_TIPO.vendas);
    const maior = Math.max(COEFICIENTE_POR_TIPO.art151, COEFICIENTE_POR_TIPO.vendas);
    expect(p.coefIRS!).toBeGreaterThan(menor);
    expect(p.coefIRS!).toBeLessThan(maior);
  });

  it("a base de Segurança Social também é ponderada (§46)", () => {
    const p = portfolioFiscal(
      analisarNegocio(
        negocioCom([
          oferta("Consultoria", "servico", 8, "art151"),
          oferta("Produtos", "produto_revenda", 40, "vendas"),
        ]),
      ),
    );

    expect(p.coefSS).toBeGreaterThan(SS_COEFICIENTE.bens.value);
    expect(p.coefSS).toBeLessThan(SS_COEFICIENTE.servicos.value);
  });

  it("uma natureza só continua a dar o coeficiente dessa natureza", () => {
    const p = portfolioFiscal(analisarNegocio(negocioCom([oferta("Só serviços", "servico", 8, "art151")])));
    expect(p.coefIRS).toBeCloseTo(COEFICIENTE_POR_TIPO.art151, 6);
    expect(p.coefSS).toBeCloseTo(SS_COEFICIENTE[BASE_SS_POR_TIPO.art151].value, 6);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. MISTO ≠ TOTAL NA ATIVIDADE DOMINANTE — §105
// ═══════════════════════════════════════════════════════════════════════

describe("multinatureza:nao-equivale", () => {
  it("serviço + vendas NÃO dá o mesmo que tudo em serviços", () => {
    const misto = analisarNegocio(
      negocioCom([
        oferta("Consultoria", "servico", 8, "art151"),
        oferta("Produtos", "produto_revenda", 40, "vendas"),
      ]),
    );

    const comMistura = compararRegimes(entradaComparacao(misto));
    // O mesmo volume, tratado todo como consultoria — que era o
    // comportamento anterior.
    const comoDominante = compararRegimes({
      ...entradaComparacao(misto),
      coefOverride: undefined,
      coefBaseSS: undefined,
      tipo: "art151",
    });

    expect(comMistura.freelancer.liquido).not.toBeCloseTo(comoDominante.freelancer.liquido, 0);
    // E a diferença é a favor de quem vende produtos: o coeficiente de
    // vendas é muito mais baixo, logo menos IRS.
    expect(comMistura.freelancer.liquido).toBeGreaterThan(comoDominante.freelancer.liquido);
  });

  it("a Segurança Social de um negócio de vendas deixa de usar a base de serviços", () => {
    // ⚠️ ISTO ESTAVA ERRADO MESMO SEM PORTEFÓLIO MISTO: `compararRegimes`
    // usava sempre `SS_COEFICIENTE.servicos`.
    const soVendas = analisarNegocio(negocioCom([oferta("Produtos", "produto_revenda", 40, "vendas")]));
    const entrada = entradaComparacao(soVendas);

    const certo = compararRegimes(entrada);
    const comoAntes = compararRegimes({ ...entrada, coefBaseSS: SS_COEFICIENTE.servicos.value });

    expect(certo.freelancer.ss).toBeLessThan(comoAntes.freelancer.ss);
    // 70% → 20% é uma redução de mais de metade.
    expect(certo.freelancer.ss).toBeLessThan(comoAntes.freelancer.ss * 0.5);
  });

  it("a entrada do comparador leva os dois coeficientes", () => {
    const misto = analisarNegocio(
      negocioCom([
        oferta("Consultoria", "servico", 8, "art151"),
        oferta("Produtos", "produto_revenda", 40, "vendas"),
      ]),
    );
    const e = entradaComparacao(misto);

    expect(e.coefOverride).toBeDefined();
    expect(e.coefBaseSS).toBeDefined();
    expect(e.coefOverride).not.toBe(COEFICIENTE_POR_TIPO[e.tipo]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. A ATIVIDADE DESCONHECIDA TEM UM NOME — §48, §105
// ═══════════════════════════════════════════════════════════════════════

describe("multinatureza:desconhecida", () => {
  it("sem atividade declarada, o estado é `desconhecida` — não `art151`", () => {
    const n = analisarNegocio(negocioCom([oferta("Uma coisa", "servico", 8, undefined)]));
    const p = portfolioFiscal(n);

    expect(p.estado).toBe("desconhecida");
    expect(p.coefIRS).toBeNull();
    expect(p.coefSS).toBeNull();
    expect(naturezaPrincipal(n)).toBeNull();
    expect(comparacaoPossivel(p)).toBe(false);
  });

  it("nesse caso, a entrada não leva coeficientes inventados", () => {
    const n = analisarNegocio(negocioCom([oferta("Uma coisa", "servico", 8, undefined)]));
    const e = entradaComparacao(n);

    expect(e.coefOverride).toBeUndefined();
    expect(e.coefBaseSS).toBeUndefined();
  });

  it("mostra-se o intervalo que a resposta vai fechar, em vez de um número", () => {
    const n = analisarNegocio(negocioCom([oferta("Uma coisa", "servico", 8, undefined)]));
    const { maisFavoravel, menosFavoravel } = extremosDaComparacao(n);

    const melhor = compararRegimes(maisFavoravel);
    const pior = compararRegimes(menosFavoravel);

    expect(melhor.freelancer.liquido).toBeGreaterThan(pior.freelancer.liquido);
    // E a diferença é material — é essa a razão de não se escolher por ela.
    expect(melhor.freelancer.liquido - pior.freelancer.liquido).toBeGreaterThan(500);
  });

  it("uma parte sem atividade não apaga o que se sabe da outra", () => {
    const n = analisarNegocio(
      negocioCom([
        oferta("Consultoria", "servico", 8, "art151"),
        oferta("Não sei", "produto_revenda", 40, undefined),
      ]),
    );
    const p = portfolioFiscal(n);

    expect(p.estado).toBe("parcial");
    expect(p.rendimentos).toHaveLength(1);
    expect(p.semNaturezaAnual).toBeGreaterThan(0);
    // Dá para continuar, com o que se sabe.
    expect(comparacaoPossivel(p)).toBe(true);
  });

  it("uma base declarada em bloco não recebe natureza nenhuma (§6, §48)", () => {
    const ctx: ContextoNegocio = {
      ...contextoNegocioVazio("empresa_existente"),
      base: { volumeAnual: 120_000, custosAtividadeAno: 0 },
    };
    const p = portfolioFiscal(analisarNegocio(ctx), ctx);

    expect(p.estado).toBe("desconhecida");
    expect(p.semNaturezaAnual).toBeGreaterThan(0);
  });

  it("o total do portefólio bate com o volume de negócios do modelo", () => {
    const ctx = negocioCom([
      oferta("Consultoria", "servico", 8, "art151"),
      oferta("Produtos", "produto_revenda", 40, "vendas"),
      oferta("Sem natureza", "servico", 3, undefined),
    ]);
    const n = analisarNegocio(ctx);
    const p = portfolioFiscal(n, ctx);

    expect(p.totalAnual).toBeCloseTo(n.receitaSemIVAAno, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. O FALLBACK SILENCIOSO DESAPARECEU DO CÓDIGO
// ═══════════════════════════════════════════════════════════════════════

describe("multinatureza:sem-fallback", () => {
  it("o adapter já não devolve `art151` como conclusão", () => {
    const src = ler("src/lib/negocio/adapters/comparar.ts");
    // `art151` só pode aparecer como valor por omissão do CONTRATO do
    // motor — e com os coeficientes a mandar. Nunca como `return`.
    expect(src).not.toMatch(/^\s*return "art151";/m);
    expect(src).toContain("comparacaoPossivel");
  });

  it("a interface tem um caminho para a atividade desconhecida", () => {
    const src = ler("src/components/negocio/ComparacaoNegocio.tsx");
    expect(src).toContain("comparacaoPossivel");
    expect(src).toContain("extremosDaComparacao");
  });

  it("o comparador canónico aceita os dois coeficientes", () => {
    const src = ler("src/lib/fiscal.ts");
    expect(src).toContain("coefOverride?: number");
    expect(src).toContain("coefBaseSS?: number");
    // E a base de SS deixou de ser sempre a de serviços.
    expect(src).not.toMatch(/baseSSAnual = Math\.min\(bruto \* SS_COEFICIENTE\.servicos\.value/);
  });
});
