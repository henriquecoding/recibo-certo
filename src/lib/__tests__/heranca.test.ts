import { describe, it, expect } from "vitest";
import {
  calcularMeacao,
  calcularPartilha,
  impostoSeloHeranca,
  impostoSeloDoacao,
  compararHerancaVsDoacao,
  maisValiasImovelHerdado,
  simularHeranca,
  resolverConfigLegitima,
  type ConfigFamiliar,
  type Patrimonio,
} from "@/lib/fiscal-heranca";
import {
  IS_TRANSMISSAO_GRATUITA,
  IS_DOACAO_IMOVEL,
  LEGITIMA,
  CONJUGE_QUOTA_MINIMA,
} from "@/lib/fiscal-data";

const soma = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

// Helpers para configurações-tipo.
const patrimonio = (over: Partial<Patrimonio> = {}): Patrimonio => ({
  imoveis: [],
  outrosBensComuns: 0,
  outrosBensProprios: 0,
  dividas: 0,
  ...over,
});

const config = (over: Partial<ConfigFamiliar> = {}): ConfigFamiliar => ({
  temConjuge: false,
  vinculoConjuge: "casado",
  regimeBens: "sem_conjuge",
  nFilhos: 0,
  nRamosNetos: 0,
  ascendentes: "nenhum",
  ...over,
});

// ── Meação ─────────────────────────────────────────────────────────────────

describe("calcularMeacao", () => {
  it("comunhão de adquiridos: cônjuge retira metade dos bens comuns", () => {
    const r = calcularMeacao(patrimonio({ outrosBensComuns: 200_000 }), "comunhao_adquiridos");
    expect(r.meacaoConjuge).toBe(100_000);
    expect(r.herancaLiquida).toBe(100_000);
  });

  it("separação de bens: não há meação, tudo é herança", () => {
    const r = calcularMeacao(patrimonio({ outrosBensProprios: 200_000 }), "separacao");
    expect(r.meacaoConjuge).toBe(0);
    expect(r.herancaLiquida).toBe(200_000);
  });

  it("bens próprios não entram na meação", () => {
    const r = calcularMeacao(
      patrimonio({ outrosBensComuns: 100_000, outrosBensProprios: 50_000 }),
      "comunhao_adquiridos",
    );
    expect(r.meacaoConjuge).toBe(50_000); // metade dos 100k comuns
    expect(r.herancaLiquida).toBe(100_000); // 50k (metade comuns) + 50k próprios
  });

  it("dívidas reduzem a herança líquida", () => {
    const r = calcularMeacao(patrimonio({ outrosBensProprios: 100_000, dividas: 30_000 }), "sem_conjuge");
    expect(r.herancaLiquida).toBe(70_000);
  });

  it("união de facto não tem meação", () => {
    const r = calcularMeacao(patrimonio({ outrosBensComuns: 200_000 }), "comunhao_adquiridos", "unido_facto");
    expect(r.meacaoConjuge).toBe(0);
  });
});

// ── Partilha (sucessão legítima, sem testamento) ────────────────────────────

describe("calcularPartilha — sucessão legítima", () => {
  it("cônjuge + 2 filhos: por cabeça (1/3 cada), cônjuge ≥ 1/4", () => {
    const r = calcularPartilha(config({ temConjuge: true, nFilhos: 2 }), 300_000);
    const conjuge = r.quinhoes.find((q) => q.relacao === "conjuge")!;
    const filhos = r.quinhoes.filter((q) => q.relacao === "filho");
    expect(conjuge.fracao).toBeCloseTo(1 / 3, 5); // 1/3 > 1/4, aplica-se por cabeça
    expect(filhos).toHaveLength(2);
    expect(soma(r.quinhoes.map((q) => q.fracao))).toBeCloseTo(1, 5);
    expect(soma(r.quinhoes.map((q) => q.valor))).toBeCloseTo(300_000, 0);
  });

  it("cônjuge + 4 filhos: quota mínima do cônjuge de 1/4 domina o por-cabeça", () => {
    const r = calcularPartilha(config({ temConjuge: true, nFilhos: 4 }), 100_000);
    const conjuge = r.quinhoes.find((q) => q.relacao === "conjuge")!;
    // por cabeça seria 1/5 = 0,20, mas o mínimo é 1/4 = 0,25
    expect(conjuge.fracao).toBeCloseTo(CONJUGE_QUOTA_MINIMA.value, 5);
    expect(conjuge.fracao).toBeCloseTo(0.25, 5);
    const restoPorFilho = (1 - 0.25) / 4;
    const filho = r.quinhoes.find((q) => q.relacao === "filho")!;
    expect(filho.fracao).toBeCloseTo(restoPorFilho, 5);
    expect(soma(r.quinhoes.map((q) => q.fracao))).toBeCloseTo(1, 5);
  });

  it("só 1 filho: recebe tudo", () => {
    const r = calcularPartilha(config({ nFilhos: 1 }), 200_000);
    expect(r.quinhoes).toHaveLength(1);
    expect(r.quinhoes[0].valor).toBe(200_000);
  });

  it("cônjuge + ascendentes (sem filhos): cônjuge 2/3, ascendentes 1/3", () => {
    const r = calcularPartilha(config({ temConjuge: true, ascendentes: "pais" }), 300_000);
    const conjuge = r.quinhoes.find((q) => q.relacao === "conjuge")!;
    const pais = r.quinhoes.find((q) => q.relacao === "pai")!;
    expect(conjuge.fracao).toBeCloseTo(2 / 3, 5);
    expect(pais.fracao).toBeCloseTo(1 / 3, 5);
  });

  it("dois progenitores vivos (sem cônjuge): 2 herdeiros, 1/2 cada", () => {
    const r = calcularPartilha(config({ ascendentes: "pais", nAscendentes: 2 }), 200_000);
    const pais = r.quinhoes.filter((q) => q.relacao === "pai");
    expect(pais).toHaveLength(2);
    pais.forEach((p) => expect(p.fracao).toBeCloseTo(1 / 2, 5));
    expect(soma(r.quinhoes.map((q) => q.valor))).toBeCloseTo(200_000, 0);
  });

  it("um só progenitor vivo: é 1 herdeiro e recebe tudo", () => {
    const r = calcularPartilha(config({ ascendentes: "pais", nAscendentes: 1 }), 200_000);
    expect(r.quinhoes.filter((q) => q.relacao === "pai")).toHaveLength(1);
    expect(r.quinhoes[0].fracao).toBeCloseTo(1, 5);
    expect(r.quinhoes[0].valor).toBe(200_000);
  });

  it("cônjuge + dois progenitores: cônjuge 2/3, cada progenitor 1/6", () => {
    const r = calcularPartilha(config({ temConjuge: true, ascendentes: "pais", nAscendentes: 2 }), 300_000);
    const conjuge = r.quinhoes.find((q) => q.relacao === "conjuge")!;
    const pais = r.quinhoes.filter((q) => q.relacao === "pai");
    expect(conjuge.fracao).toBeCloseTo(2 / 3, 5);
    expect(pais).toHaveLength(2);
    pais.forEach((p) => expect(p.fracao).toBeCloseTo(1 / 6, 5));
    expect(soma(r.quinhoes.map((q) => q.fracao))).toBeCloseTo(1, 5);
  });

  it("três avós vivos: reparte 1/3 cada e avisa da divisão por linhas", () => {
    const r = calcularPartilha(config({ ascendentes: "avos", nAscendentes: 3 }), 300_000);
    const avos = r.quinhoes.filter((q) => q.relacao === "avo");
    expect(avos).toHaveLength(3);
    avos.forEach((a) => expect(a.fracao).toBeCloseTo(1 / 3, 5));
    expect(r.avisos.join(" ")).toMatch(/linha paterna|por linhas|linha materna/i);
  });

  it("ascendentes são isentos de Imposto do Selo mesmo sendo vários", () => {
    const { partilha, selo } = simularHeranca(
      config({ ascendentes: "pais", nAscendentes: 2 }),
      patrimonio({ outrosBensProprios: 200_000 }),
    );
    expect(partilha.quinhoes).toHaveLength(2);
    expect(selo.total).toBe(0);
    expect(selo.todosIsentos).toBe(true);
  });

  it("só cônjuge: recebe toda a herança", () => {
    const r = calcularPartilha(config({ temConjuge: true }), 150_000);
    expect(r.quinhoes).toHaveLength(1);
    expect(r.quinhoes[0].relacao).toBe("conjuge");
    expect(r.quinhoes[0].valor).toBe(150_000);
  });

  it("representação: netos de filho pré-falecido formam um ramo", () => {
    const r = calcularPartilha(config({ nFilhos: 1, nRamosNetos: 1 }), 200_000);
    const filho = r.quinhoes.find((q) => q.relacao === "filho")!;
    const netos = r.quinhoes.find((q) => q.relacao === "neto")!;
    expect(filho.fracao).toBeCloseTo(0.5, 5);
    expect(netos.fracao).toBeCloseTo(0.5, 5);
  });

  it("união de facto sem testamento: não herda e gera aviso", () => {
    const r = calcularPartilha(
      config({ temConjuge: true, vinculoConjuge: "unido_facto", nFilhos: 1 }),
      100_000,
    );
    expect(r.quinhoes.find((q) => q.relacao === "conjuge")).toBeUndefined();
    // o filho herda tudo
    expect(r.quinhoes.find((q) => q.relacao === "filho")!.valor).toBe(100_000);
    expect(r.avisos.join(" ")).toMatch(/união de facto/i);
  });

  it("sem legitimários: gera aviso (colaterais/Estado)", () => {
    const r = calcularPartilha(config(), 100_000);
    expect(r.quinhoes).toHaveLength(0);
    expect(r.avisos.join(" ")).toMatch(/colaterais|Estado/i);
  });
});

// ── Partilha com testamento (quota disponível) ──────────────────────────────

describe("calcularPartilha — testamento", () => {
  it("cônjuge + descendentes: legítima 2/3 reservada, 1/3 disponível", () => {
    expect(resolverConfigLegitima(config({ temConjuge: true, nFilhos: 2 }))).toBe("conjuge_descendentes");
    expect(LEGITIMA.conjuge_descendentes.fracao).toBeCloseTo(2 / 3, 5);
  });

  it("deixar toda a quota disponível a um irmão: irmão fica com 1/3", () => {
    const r = calcularPartilha(
      config({
        temConjuge: true,
        nFilhos: 2,
        testamento: { usaQuotaDisponivel: true, beneficiario: "irmao" },
      }),
      300_000,
    );
    const irmao = r.quinhoes.find((q) => q.relacao === "irmao")!;
    expect(irmao.fracao).toBeCloseTo(1 / 3, 5); // quota disponível
    // legitimários repartem os 2/3 restantes
    expect(soma(r.quinhoes.map((q) => q.fracao))).toBeCloseTo(1, 5);
    expect(r.temTestamento).toBe(true);
  });

  it("só 1 filho: disponível 1/2 (Art. 2159.º n.º 2)", () => {
    expect(LEGITIMA.descendentes_1.fracao).toBeCloseTo(1 / 2, 5);
    const r = calcularPartilha(
      config({ nFilhos: 1, testamento: { usaQuotaDisponivel: true, beneficiario: "outro" } }),
      200_000,
    );
    const terceiro = r.quinhoes.find((q) => q.relacao === "outro")!;
    expect(terceiro.fracao).toBeCloseTo(0.5, 5);
  });
});

// ── Imposto do Selo (herança) ───────────────────────────────────────────────

describe("impostoSeloHeranca", () => {
  it("família direta (cônjuge + filhos): totalmente isenta", () => {
    const { partilha } = simularHeranca(
      config({ temConjuge: true, nFilhos: 2 }),
      patrimonio({ outrosBensProprios: 300_000 }),
    );
    const selo = impostoSeloHeranca(partilha.quinhoes);
    expect(selo.total).toBe(0);
    expect(selo.todosIsentos).toBe(true);
  });

  it("irmão (não isento): 10% do quinhão", () => {
    const r = calcularPartilha(config({ testamento: undefined }), 0); // vazio
    // partilha direta manual: um único herdeiro irmão
    const selo = impostoSeloHeranca([
      { id: "q0", rotulo: "Irmão", relacao: "irmao", fracao: 1, valor: 100_000, fundamento: "" },
    ]);
    expect(selo.total).toBeCloseTo(100_000 * IS_TRANSMISSAO_GRATUITA.value, 2);
    expect(selo.total).toBeCloseTo(10_000, 2);
    expect(r.quinhoes).toHaveLength(0);
  });

  it("herança NUNCA aplica a Verba 1.1 (0,8% imóveis) mesmo a não isentos", () => {
    // Um sobrinho herda um imóvel de 200k: paga só 10% (20k), não 10,8%.
    const selo = impostoSeloHeranca([
      { id: "q0", rotulo: "Sobrinho", relacao: "sobrinho", fracao: 1, valor: 200_000, fundamento: "" },
    ]);
    expect(selo.total).toBeCloseTo(20_000, 2); // 10% e não 21 600
  });
});

// ── Doação em vida + comparação ─────────────────────────────────────────────

describe("impostoSeloDoacao / comparação", () => {
  it("doação de imóvel a um filho: isenta da Verba 1.2 mas paga 0,8% (Verba 1.1)", () => {
    const r = impostoSeloDoacao([{ tipo: "imovel", valor: 250_000 }], "filho");
    expect(r.verba12).toBe(0);
    expect(r.verba11).toBeCloseTo(250_000 * IS_DOACAO_IMOVEL.value, 2);
    expect(r.total).toBeCloseTo(2_000, 2);
    expect(r.avisos.join(" ")).toMatch(/0,8%/);
  });

  it("doação de dinheiro a um filho: totalmente isenta (sem imóvel)", () => {
    const r = impostoSeloDoacao([{ tipo: "outro", valor: 50_000 }], "filho");
    expect(r.total).toBe(0);
  });

  it("doação a não-família: 10% + 0,8% sobre o imóvel", () => {
    const r = impostoSeloDoacao([{ tipo: "imovel", valor: 100_000 }], "sobrinho");
    expect(r.verba12).toBeCloseTo(10_000, 2);
    expect(r.verba11).toBeCloseTo(800, 2);
    expect(r.total).toBeCloseTo(10_800, 2);
  });

  it("doações até 500€ são isentas", () => {
    const r = impostoSeloDoacao([{ tipo: "outro", valor: 400 }], "sobrinho");
    expect(r.total).toBe(0);
  });

  it("comparação: para família, herdar imóvel (0€) é mais barato do que doá-lo (0,8%)", () => {
    const c = compararHerancaVsDoacao([{ tipo: "imovel", valor: 300_000 }], "filho");
    expect(c.impostoHeranca).toBe(0);
    expect(c.impostoDoacao).toBeCloseTo(2_400, 2);
    expect(c.herancaMaisBarata).toBe(true);
  });
});

// ── Mais-valias de imóvel herdado ───────────────────────────────────────────

describe("maisValiasImovelHerdado", () => {
  it("valor de aquisição = VPT; residente engloba 50% do ganho", () => {
    const r = maisValiasImovelHerdado({
      vptHeranca: 100_000,
      valorVenda: 180_000,
      rendimentoBase: 20_000,
    });
    expect(r.valorAquisicao).toBe(100_000);
    expect(r.ganho).toBe(80_000);
    expect(r.incluido).toBe(40_000); // 50%
    expect(r.impostoEstimado).toBeGreaterThan(0);
  });

  it("venda abaixo do VPT: sem ganho, sem imposto", () => {
    const r = maisValiasImovelHerdado({ vptHeranca: 150_000, valorVenda: 120_000 });
    expect(r.ganho).toBe(0);
    expect(r.impostoEstimado).toBe(0);
  });
});
