// ═══════════════════════════════════════════════════════════════════════
//  O HANDOFF ESTÚDIO → SIMULADOR DE EMPRESA
//  ---------------------------------------------------------------------
//  §97-100 e §106 do relatório mestre. Cada teste aqui prende um erro que
//  se pode cometer e que NÃO se vê no ecrã: números plausíveis, com sinal
//  certo e ordem de grandeza certa, mas errados.
//
//  O mais caro de todos é a dupla contagem (§14): `custosOperacionaisAno`
//  já inclui a estrutura. Copiá-lo para `despesasOper` e preencher
//  `custosEstrutura` ao lado conta a estrutura duas vezes — e 27 400 € ou
//  54 800 € são ambos plausíveis para uma empresa pequena.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  analisarNegocio,
  contextoNegocioVazio,
  novaOferta,
  novoCustoEstrutura,
  novoInvestimento,
  novoTrabalhador,
  type ContextoNegocio,
} from "@/lib/negocio";
import {
  criarHandoffEmpresa,
  custosDoHandoffFecham,
  handoffUtilizavel,
  levamos,
  type HandoffNegocioEmpresaV1,
} from "@/lib/negocio/adapters/empresa-handoff";
import {
  normalizarSnapshotEmpresa,
  primeiroPassoPendente,
  type SnapshotEmpresaGuiada,
} from "@/lib/empresa/snapshot";
import {
  camposImportados,
  custosEstruturaIniciais,
  resolverEstadoEmpresa,
} from "@/lib/empresa/importacao";
import { FERRAMENTA_DO_FOCO } from "@/components/foco/focos";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const perto = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

/**
 * O ficheiro sem comentários.
 *
 * Os testes de privacidade procuram PADRÕES DE CÓDIGO — `fetch(`,
 * `searchParams.set`, `supabase`. Um comentário que explica porque é que
 * não se faz `?faturacao=80000` contém literalmente esse texto, e sem
 * isto o teste reprovava a documentação da própria regra que verifica.
 */
function codigo(caminho: string): string {
  return ler(caminho)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");
}

// ─── Um negócio completo, para os testes não repetirem a montagem ──────

function negocioCompleto(
  extra: Partial<ContextoNegocio> = {},
  maturidade: "ideia" | "ja_vendo" | "empresa_existente" = "ja_vendo",
): ContextoNegocio {
  const c = contextoNegocioVazio(maturidade);
  return {
    ...c,
    nome: "Estúdio Norte",
    ofertas: [
      { ...novaOferta("servico", { nome: "Consultoria", volumeMes: 8 }), respondidos: ["custo-direto"] },
      { ...novaOferta("produto_revenda", { nome: "Kits", volumeMes: 30 }), respondidos: ["custo-direto"] },
    ],
    estrutura: {
      overheadMensal: [
        novoCustoEstrutura("contabilidade", "Contabilidade", 150),
        novoCustoEstrutura("software", "Software", 60),
      ],
      investimentosIniciais: [{ ...novoInvestimento("equipamento", "Máquina"), valor: 20_000 }],
      trabalhadores: [{ ...novoTrabalhador("Designer"), remuneracao: { salarioBaseMensal: 1_500 } }],
    },
    ...extra,
  };
}

const comHandoff = (ctx: ContextoNegocio) => {
  const negocio = analisarNegocio(ctx);
  return { negocio, handoff: criarHandoffEmpresa(ctx, negocio) };
};

// ═══════════════════════════════════════════════════════════════════════
//  1. O INVARIANTE PRINCIPAL — §98
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:invariante-custos", () => {
  it("despesasOper + custosEstrutura === custosOperacionaisAno", () => {
    const { negocio, handoff } = comHandoff(negocioCompleto());

    expect(
      (handoff.prefill.despesasOper ?? 0) + (handoff.prefill.custosEstrutura ?? 0),
    ).toBeCloseTo(negocio.custosOperacionaisAno, 2);
    expect(custosDoHandoffFecham(handoff, negocio)).toBe(true);
  });

  it("continua a fechar sem estrutura nenhuma", () => {
    const ctx = negocioCompleto({
      estrutura: { overheadMensal: [], investimentosIniciais: [] },
    });
    const { negocio, handoff } = comHandoff(ctx);

    expect(handoff.prefill.custosEstrutura).toBe(0);
    expect(custosDoHandoffFecham(handoff, negocio)).toBe(true);
  });

  it("continua a fechar sem ofertas, só com base declarada", () => {
    const ctx: ContextoNegocio = {
      ...contextoNegocioVazio("empresa_existente"),
      base: { volumeAnual: 120_000, custosAtividadeAno: 40_000 },
      estrutura: {
        overheadMensal: [novoCustoEstrutura("contabilidade", "Contabilidade", 200)],
        investimentosIniciais: [],
      },
    };
    const { negocio, handoff } = comHandoff(ctx);

    expect(perto(handoff.prefill.despesasOper ?? 0, 40_000, 1)).toBe(true);
    expect(perto(handoff.prefill.custosEstrutura ?? 0, 2_400, 1)).toBe(true);
    expect(custosDoHandoffFecham(handoff, negocio)).toBe(true);
  });

  it("a estrutura NÃO é `custosOperacionaisAno` — o erro do §14 é impossível", () => {
    const { negocio, handoff } = comHandoff(negocioCompleto());
    // Se alguém copiar `custosOperacionaisAno` para `despesasOper`, isto
    // deixa de ser verdade — e a soma passa a exceder o total.
    expect(handoff.prefill.despesasOper).not.toBeCloseTo(negocio.custosOperacionaisAno, 2);
    expect(handoff.prefill.despesasOper).toBeLessThan(negocio.custosOperacionaisAno);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. O QUE VIAJA — §97
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:o-que-viaja", () => {
  it("a receita viaja SEM IVA, e o simulador é avisado disso", () => {
    const { negocio, handoff } = comHandoff(negocioCompleto());

    expect(handoff.prefill.faturacaoAnual).toBeCloseTo(negocio.receitaSemIVAAno, 2);
    // Sem isto, o simulador voltava a dividir por 1,23 e tirava ~19% à
    // faturação sem dar sinal nenhum.
    expect(handoff.prefill.faturacaoComIva).toBe(false);
  });

  it("o IVA cobrado nunca entra na faturação do handoff", () => {
    const { negocio, handoff } = comHandoff(negocioCompleto());
    const comIVA = negocio.receitaClienteMes * 12;

    expect(negocio.ivaCobradoMes).toBeGreaterThan(0);
    expect(handoff.prefill.faturacaoAnual).toBeLessThan(comIVA);
  });

  it("os custos variáveis viajam separados da estrutura", () => {
    const { negocio, handoff } = comHandoff(negocioCompleto());

    expect(handoff.prefill.despesasOper).toBeCloseTo(negocio.custosVariaveisMes * 12, 2);
    expect(handoff.prefill.custosEstrutura).toBeCloseTo(
      (negocio.overheadMes + negocio.custoTrabalhadoresMes) * 12,
      2,
    );
  });

  it("o custo do pessoal está DENTRO da estrutura, não à parte", () => {
    const semEquipa = comHandoff(
      negocioCompleto({
        estrutura: {
          overheadMensal: [novoCustoEstrutura("contabilidade", "Contabilidade", 150)],
          investimentosIniciais: [],
        },
      }),
    );
    const comEquipa = comHandoff(
      negocioCompleto({
        estrutura: {
          overheadMensal: [novoCustoEstrutura("contabilidade", "Contabilidade", 150)],
          investimentosIniciais: [],
          trabalhadores: [{ ...novoTrabalhador("Designer"), remuneracao: { salarioBaseMensal: 1_500 } }],
        },
      }),
    );

    expect(comEquipa.handoff.prefill.custosEstrutura).toBeGreaterThan(
      semEquipa.handoff.prefill.custosEstrutura ?? 0,
    );
  });

  it("a decomposição da estrutura explica o total (§83)", () => {
    const { handoff } = comHandoff(negocioCompleto());
    const soma = handoff.estrutura.reduce((s, l) => s + l.valorAnual, 0);

    expect(handoff.estrutura.length).toBeGreaterThan(0);
    expect(soma).toBeCloseTo(handoff.prefill.custosEstrutura ?? 0, 1);
    expect(handoff.estrutura.map((l) => l.categoria)).toContain("pessoal");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. O QUE NÃO SE INVENTA — §16, §17, §18
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:nao-inventa", () => {
  const CAMPOS_PROIBIDOS = [
    "tipoSociedade",
    "salGerenteMensal",
    "distribuirDividendos",
    "opcaoEnglobamento",
    "tipoViatura",
    "encargosViatura",
    "despRepresentacao",
    "ajudasCusto",
    "naoDocumentadas",
    "rfaiInvest",
    "sifideDespesas",
    "rfaiContratualValor",
    "temImovelEmpresa",
    "vptImovel",
    "perfilFundador",
    "aplicarIFICI",
  ] as const;

  it("nenhuma decisão societária vem preenchida", () => {
    const { handoff } = comHandoff(negocioCompleto());
    for (const campo of CAMPOS_PROIBIDOS) {
      expect(handoff.prefill[campo], `${campo} não pode vir do modelo comercial`).toBeUndefined();
    }
  });

  it("um trabalhador NUNCA vira salário de gerente (§18)", () => {
    const { handoff } = comHandoff(negocioCompleto());
    expect(handoff.prefill.salGerenteMensal).toBeUndefined();
    // E diz-se em voz alta que a equipa entrou noutro sítio.
    expect(handoff.avisos.map((a) => a.id)).toContain("equipa-nao-e-gerencia");
  });

  it("investimento declarado NÃO vira RFAI elegível (§17)", () => {
    const { handoff } = comHandoff(negocioCompleto());

    expect(handoff.prefill.rfaiInvest).toBeUndefined();
    expect(handoff.prefill.sifideDespesas).toBeUndefined();
    const aviso = handoff.avisos.find((a) => a.id === "investimento-nao-e-beneficio");
    expect(aviso).toBeTruthy();
    expect(aviso!.texto).toMatch(/20[.\s ]?000/);
    // E os benefícios ficam explicitamente por decidir.
    expect(handoff.pendentes.map((p) => p.chave)).toContain("beneficios");
  });

  it("sem investimento não há aviso a inventar um", () => {
    const { handoff } = comHandoff(
      negocioCompleto({
        estrutura: {
          overheadMensal: [novoCustoEstrutura("contabilidade", "Contabilidade", 150)],
          investimentosIniciais: [],
        },
      }),
    );
    expect(handoff.avisos.map((a) => a.id)).not.toContain("investimento-nao-e-beneficio");
  });

  it("os pendentes cobrem tudo o que a fase societária tem de resolver", () => {
    const { handoff } = comHandoff(negocioCompleto());
    const chaves = handoff.pendentes.map((p) => p.chave);
    for (const c of ["tipoSociedade", "perfilFundador", "salGerenteMensal", "distribuirDividendos"]) {
      expect(chaves).toContain(c);
    }
    // E cada pendente diz PORQUÊ — sem isso é uma lista de tarefas.
    expect(handoff.pendentes.every((p) => p.porque.length > 0)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. LOCALIZAÇÃO — §111: nunca um município inventado
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:localizacao", () => {
  it("continente NÃO vira município: fica pendente", () => {
    const ctx = negocioCompleto();
    const { handoff } = comHandoff({
      ...ctx,
      fiscal: { ...ctx.fiscal, regiao: "continente" },
    });

    expect(handoff.prefill.localizacao).toBeUndefined();
    expect(handoff.pendentes.map((p) => p.chave)).toContain("localizacao");
  });

  it("sem região declarada, também fica pendente", () => {
    const { handoff } = comHandoff(negocioCompleto());
    expect(handoff.prefill.localizacao).toBeUndefined();
    expect(handoff.pendentes.map((p) => p.chave)).toContain("localizacao");
  });

  it("Madeira e Açores têm parâmetros próprios — e esses viajam", () => {
    for (const regiao of ["madeira", "acores"] as const) {
      const ctx = negocioCompleto();
      const { handoff } = comHandoff({ ...ctx, fiscal: { ...ctx.fiscal, regiao } });

      expect(handoff.prefill.localizacao?.regiaoId).toBe(regiao);
      expect(handoff.prefill.localNome).toBeTruthy();
      expect(handoff.pendentes.map((p) => p.chave)).not.toContain("localizacao");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  5. EMPRESA EXISTENTE — §84, §85
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:empresa-existente", () => {
  it("quem já tem sociedade não paga constituição outra vez", () => {
    const ctx: ContextoNegocio = {
      ...negocioCompleto({}, "empresa_existente"),
    };
    const { handoff } = comHandoff(ctx);

    expect(handoff.prefill.jaTemEmpresa).toBe("sim");
    expect(handoff.prefill.incluirConstituicao).toBe(false);
    expect(handoff.proveniencia.jaTemEmpresa.origem).toBe("utilizador");
  });

  it("quem ainda vai abrir decide a constituição lá (§85)", () => {
    const { handoff } = comHandoff(negocioCompleto({}, "ideia"));

    expect(handoff.prefill.jaTemEmpresa).toBeUndefined();
    expect(handoff.prefill.incluirConstituicao).toBeUndefined();
    expect(handoff.pendentes.map((p) => p.chave)).toContain("incluirConstituicao");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  6. ESTADO DE COMPLETUDE — §65
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:estado", () => {
  it("sem volume de negócios, está bloqueado — e não se oferece continuidade", () => {
    const { handoff } = comHandoff(contextoNegocioVazio("ideia"));
    expect(handoff.estado).toBe("bloqueado");
    expect(handoffUtilizavel(handoff)).toBe(false);
  });

  it("com ofertas por responder, é parcial", () => {
    const ctx = negocioCompleto();
    const { handoff } = comHandoff({
      ...ctx,
      ofertas: ctx.ofertas.map((o) => ({ ...o, respondidos: [] })),
    });
    expect(handoff.estado).toBe("parcial");
    expect(handoff.avisos.map((a) => a.id)).toContain("confianca-exploratoria");
  });

  it("com receita, estrutura e ofertas trabalhadas, está pronto", () => {
    const { handoff } = comHandoff(negocioCompleto());
    expect(handoff.estado).toBe("pronto");
    expect(handoffUtilizavel(handoff)).toBe(true);
  });

  it("sem estrutura declarada, continua parcial — o resultado está por cima", () => {
    const { handoff } = comHandoff(
      negocioCompleto({ estrutura: { overheadMensal: [], investimentosIniciais: [] } }),
    );
    expect(handoff.estado).toBe("parcial");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  7. PROVENIÊNCIA — §67
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:proveniencia", () => {
  it("todo o campo pré-preenchido sabe de onde veio", () => {
    const { handoff } = comHandoff(negocioCompleto());
    for (const chave of ["faturacaoAnual", "despesasOper", "custosEstrutura"]) {
      const p = handoff.proveniencia[chave];
      expect(p, `${chave} sem proveniência`).toBeTruthy();
      expect(p.texto.length).toBeGreaterThan(10);
    }
  });

  it("a faturação diz que saiu das ofertas, não de um valor nosso", () => {
    const { handoff } = comHandoff(negocioCompleto());
    expect(handoff.proveniencia.faturacaoAnual.origem).toBe("derivado");
    expect(handoff.proveniencia.faturacaoAnual.texto).toMatch(/2 ofertas/);
  });

  it("«vamos levar» só lista o que tem proveniência", () => {
    const { handoff } = comHandoff(negocioCompleto());
    const linhas = levamos(handoff);
    expect(linhas.length).toBeGreaterThan(0);
    expect(linhas.every((l) => l.proveniencia.texto.length > 0)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  8. PRECEDÊNCIA — §22, §99
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:precedencia", () => {
  const handoffDe = (ctx = negocioCompleto()) => comHandoff(ctx).handoff;

  it("um cenário explicitamente reaberto ganha ao handoff", () => {
    const cenario: SnapshotEmpresaGuiada = {
      versao: 2,
      jaTemEmpresa: "sim",
      tipoSelecionado: true,
      faturacaoAnual: 75_000,
    };
    const r = resolverEstadoEmpresa({ cenario, handoff: handoffDe() });

    expect(r.fonte).toBe("cenario");
    expect(r.snapshot.faturacaoAnual).toBe(75_000);
    // E a pessoa fica a saber que existe um projeto mais recente (§69).
    expect(r.handoffPreterido).toBe(true);
    expect(r.handoff).toBeNull();
  });

  it("o handoff ganha aos defaults", () => {
    const h = handoffDe();
    const r = resolverEstadoEmpresa({ handoff: h });

    expect(r.fonte).toBe("handoff");
    expect(r.snapshot.faturacaoAnual).toBe(h.prefill.faturacaoAnual);
    expect(r.handoff).toBeTruthy();
  });

  it("sem nada, abre nos defaults e no passo zero", () => {
    const r = resolverEstadoEmpresa({});
    expect(r.fonte).toBe("defaults");
    expect(r.snapshot).toEqual({});
    expect(r.passo).toBe(0);
  });

  it("um handoff bloqueado não sobrepõe nada", () => {
    const h = comHandoff(contextoNegocioVazio("ideia")).handoff;
    expect(resolverEstadoEmpresa({ handoff: h }).fonte).toBe("defaults");
  });

  it("um cenário reaberto abre no resultado guardado", () => {
    const r = resolverEstadoEmpresa({ cenario: { versao: 2, faturacaoAnual: 90_000 } });
    expect(r.passo).toBe("resultado");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  9. O PRIMEIRO PASSO PENDENTE — §21
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:primeiro-passo", () => {
  it("sem nada respondido, começa no princípio", () => {
    expect(primeiroPassoPendente({})).toBe(0);
  });

  it("com a situação respondida, salta para o tipo de sociedade", () => {
    expect(primeiroPassoPendente({ jaTemEmpresa: "sim" })).toBe(1);
  });

  it("com o tipo escolhido, vai para a localização", () => {
    expect(primeiroPassoPendente({ jaTemEmpresa: "sim", tipoSelecionado: true })).toBe("local");
  });

  it("com localização e sem faturação, pede a faturação", () => {
    expect(
      primeiroPassoPendente({
        jaTemEmpresa: "sim",
        tipoSelecionado: true,
        localizacao: { regiaoId: "madeira" } as never,
      }),
    ).toBe(2);
  });

  it("com tudo respondido, mostra logo o resultado", () => {
    expect(
      primeiroPassoPendente({
        jaTemEmpresa: "sim",
        tipoSelecionado: true,
        localizacao: { regiaoId: "madeira" } as never,
        faturacaoAnual: 80_000,
      }),
    ).toBe("resultado");
  });

  it("nunca salta um passo por responder", () => {
    // Faturação preenchida mas tipo por escolher: continua a pedir o tipo.
    expect(primeiroPassoPendente({ jaTemEmpresa: "sim", faturacaoAnual: 80_000 })).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  10. OS DEFAULTS DEIXAM DE SER FACTOS — §81, §82
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:defaults", () => {
  it("estrutura importada SUBSTITUI a estimativa padrão — não se soma", () => {
    const r = custosEstruturaIniciais({ custosEstrutura: 27_400 }, 2_700);
    expect(r.valor).toBe(27_400);
    expect(r.substituiuDefaults).toBe(true);
    expect(r.nota).toBeTruthy();
  });

  it("sem estrutura importada, os defaults ficam", () => {
    const r = custosEstruturaIniciais({}, 2_700);
    expect(r.valor).toBe(2_700);
    expect(r.substituiuDefaults).toBe(false);
    expect(r.nota).toBeUndefined();
  });

  it("uma estrutura a zero não substitui — não há resposta nenhuma", () => {
    expect(custosEstruturaIniciais({ custosEstrutura: 0 }, 2_700).valor).toBe(2_700);
  });

  it("a contabilidade declarada no projeto é dita, para não ser somada duas vezes", () => {
    const { handoff } = comHandoff(negocioCompleto());
    expect(handoff.avisos.map((a) => a.id)).toContain("estrutura-substitui-defaults");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  11. NORMALIZAÇÃO — §94, §95
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:normalizacao", () => {
  it("lixo não rebenta — devolve um snapshot vazio", () => {
    for (const entrada of [null, undefined, 42, "texto", [], true]) {
      expect(() => normalizarSnapshotEmpresa(entrada)).not.toThrow();
      expect(normalizarSnapshotEmpresa(entrada)).toEqual({});
    }
  });

  it("valores fora de domínio são ignorados, não convertidos", () => {
    const s = normalizarSnapshotEmpresa({
      tipoSociedade: "cooperativa",
      perfilFundador: 7,
      faturacaoAnual: -5_000,
      custosEstrutura: "muito",
      distribuirDividendos: "sim",
      tipoViatura: "trator",
    });

    expect(s.tipoSociedade).toBeUndefined();
    expect(s.perfilFundador).toBeUndefined();
    expect(s.faturacaoAnual).toBeUndefined();
    expect(s.custosEstrutura).toBeUndefined();
    expect(s.distribuirDividendos).toBeUndefined();
    expect(s.tipoViatura).toBeUndefined();
  });

  it("os valores válidos passam intactos", () => {
    const s = normalizarSnapshotEmpresa({
      tipoSociedade: "quotas",
      perfilFundador: "estrangeiro_ue",
      faturacaoAnual: 80_000,
      custosEstrutura: 27_400,
      distribuirDividendos: true,
      tipoViatura: "comb_medio",
      tipoSifide: "pme_jovem",
    });

    expect(s.tipoSociedade).toBe("quotas");
    expect(s.perfilFundador).toBe("estrangeiro_ue");
    expect(s.faturacaoAnual).toBe(80_000);
    expect(s.custosEstrutura).toBe(27_400);
    expect(s.distribuirDividendos).toBe(true);
    expect(s.tipoViatura).toBe("comb_medio");
    expect(s.tipoSifide).toBe("pme_jovem");
  });

  it("meia localização é recusada inteira (§111)", () => {
    const s = normalizarSnapshotEmpresa({
      localizacao: { regiaoId: "aml", nome: "Lisboa", interior: false },
    });
    expect(s.localizacao).toBeUndefined();
  });

  it("uma localização completa passa", () => {
    const completa = {
      regiaoId: "madeira",
      nome: "Região Autónoma da Madeira",
      interior: false,
      ircPME: 0.105,
      ircGeral: 0.133,
      derramaEstimada: 0.015,
      rfaiTipo: "interior",
      rfaiTaxa: 0.3,
      contabMin: 60,
      contabMax: 130,
      selo: "IRC 10,5%",
    };
    expect(normalizarSnapshotEmpresa({ localizacao: completa }).localizacao).toBeTruthy();
  });

  it("a contagem de campos importados sai do snapshot, não de um número escrito", () => {
    const { handoff } = comHandoff(negocioCompleto({}, "empresa_existente"));
    const campos = camposImportados(normalizarSnapshotEmpresa(handoff.prefill));

    expect(campos).toContain("faturacaoAnual");
    expect(campos).toContain("custosEstrutura");
    expect(campos).not.toContain("versao");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  12. PRIVACIDADE — §100
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:privacidade", () => {
  const STORE = "src/lib/store/handoff-negocio-empresa.ts";
  const ADAPTER = "src/lib/negocio/adapters/empresa-handoff.ts";

  it("o handoff não usa o URL", () => {
    for (const f of [STORE, ADAPTER, "src/components/negocio/ContinuarNaEmpresa.tsx"]) {
      const src = codigo(f);
      expect(src, `${f} escreve no URL`).not.toMatch(/searchParams\.set|pushState|replaceState/);
      // E não põe números na rota.
      expect(src, `${f} põe valores no URL`).not.toMatch(/simulador-empresa\?/);
    }
  });

  it("o handoff não faz rede nem toca em Supabase", () => {
    for (const f of [STORE, ADAPTER]) {
      const src = codigo(f);
      expect(src, `${f} faz rede`).not.toMatch(/\bfetch\s*\(/);
      expect(src, `${f} toca em Supabase`).not.toMatch(/supabase/i);
    }
  });

  it("vive no cofre, não numa chave global", () => {
    const src = ler(STORE);
    expect(src).toContain('chaveAtiva("handoff-negocio-empresa")');
    const cofre = ler("src/lib/store/cofre.ts");
    expect(cofre).toContain('"handoff-negocio-empresa"');
  });

  it("tem TTL e consumo único", () => {
    const src = ler(STORE);
    expect(src).toContain("HANDOFF_TTL_MS");
    expect(src).toMatch(/export function consumirHandoffEmpresa/);
    expect(src).toMatch(/limparHandoffEmpresa\(\)/);
  });

  it("o adapter não carrega o motor de empresa (§77)", () => {
    const src = ler(ADAPTER);
    // Só TIPOS do snapshot; nunca `fiscal-empresa`.
    expect(src).not.toMatch(/from "@\/lib\/fiscal-empresa"/);
    expect(src).not.toMatch(/simularEmpresa/);
  });

  it("a medição não recebe números do negócio (§74)", () => {
    const src = ler("src/components/negocio/ContinuarNaEmpresa.tsx");
    const chamadas = src.match(/registar\([\s\S]{0,400}?\)\;/g) ?? [];
    expect(chamadas.length).toBeGreaterThan(0);
    for (const c of chamadas) {
      for (const proibido of ["faturacao", "custos", "salario", "margem", "receita", "nome"]) {
        expect(c.toLowerCase(), `medição com «${proibido}»`).not.toContain(proibido);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  13. A LIGAÇÃO ESTÁ MESMO FEITA — §106, §107
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:integracao", () => {
  it("o estúdio oferece a continuidade, e não só um link", () => {
    const studio = ler("src/components/negocio/NegocioStudio.tsx");
    expect(studio).toContain("ContinuarNaEmpresa");
  });

  it("o simulador consome o handoff e resolve a precedência", () => {
    const sim = ler("src/components/simulador/ModoGuiadoEmpresa.tsx");
    expect(sim).toContain("consumirHandoffEmpresa");
    expect(sim).toContain("resolverEstadoEmpresa");
    expect(sim).toContain("ImportacaoNegocio");
    // §21 — abre onde falta responder.
    expect(sim).toContain("setPasso(r.passo)");
  });

  it("o snapshot deixou de ser definido pelo React (§12)", () => {
    const sim = codigo("src/components/simulador/ModoGuiadoEmpresa.tsx");
    expect(sim).toContain("SnapshotEmpresaGuiada");
    // O tipo derivado da implementação desapareceu.
    expect(sim).not.toContain("ReturnType<typeof montarSnapshot>");
    // E os vocabulários vivem no contrato, não no componente.
    expect(sim).not.toMatch(/^type (TipoSociedade|PerfilFundador|TipoSede|TipoViaturaGuiado) =/m);
  });

  it("o banner deixa ignorar a importação e voltar ao projeto (§24)", () => {
    const banner = ler("src/components/empresa/ImportacaoNegocio.tsx");
    expect(banner).toContain("Ignorar importação");
    expect(banner).toContain("Voltar ao projeto");
    expect(banner).toContain("/dashboard/negocio");
  });

  it("as rotas standalone continuam todas de pé (§107)", () => {
    for (const rota of [
      "src/app/ferramentas/calcular-preco/page.tsx",
      "src/app/ferramentas/simulador-empresa/page.tsx",
      "src/app/ferramentas/comparar-regimes/page.tsx",
      "src/app/dashboard/empresa/page.tsx",
      "src/app/dashboard/precos/page.tsx",
    ]) {
      expect(() => ler(rota), `${rota} desapareceu`).not.toThrow();
    }
  });

  it("o simulador continua acessível sem passar pelo estúdio (§2.5)", () => {
    // Isto lia-se em `src/components/Hero.tsx`, onde o perfil «empresa» tinha
    // um botão secundário com o href escrito à mão. Esse hero foi substituído
    // pela bússola, e o destino deixou de estar escrito num componente:
    // vive na tabela dos focos, que é a fonte de verdade de onde cada
    // pergunta leva. Verificar a tabela é mais forte do que verificar uma
    // string num ficheiro de UI — a UI passou a derivar dela.
    expect(FERRAMENTA_DO_FOCO.empresa).toBe("/ferramentas/simulador-empresa");
    // E a bússola tem mesmo de a usar como destino do painel da resposta.
    expect(ler("src/components/foco/HeroBussola.tsx")).toContain("href={focoAberto.ferramenta}");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  14. O COFRE — leitura, TTL e consumo único, com localStorage de mentira
// ═══════════════════════════════════════════════════════════════════════

describe("handoff:cofre", () => {
  let mapa: Map<string, string>;

  beforeEach(() => {
    mapa = new Map();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (k: string) => mapa.get(k) ?? null,
          setItem: (k: string, v: string) => void mapa.set(k, v),
          removeItem: (k: string) => void mapa.delete(k),
          clear: () => mapa.clear(),
          key: (i: number) => [...mapa.keys()][i] ?? null,
          get length() {
            return mapa.size;
          },
        },
      },
      configurable: true,
      writable: true,
    });
  });

  const carregar = async () => import("@/lib/store/handoff-negocio-empresa");

  it("grava, espreita e consome uma só vez", async () => {
    const { guardarHandoffEmpresa, espreitarHandoffEmpresa, consumirHandoffEmpresa } = await carregar();
    const h = comHandoff(negocioCompleto()).handoff;

    expect(guardarHandoffEmpresa(h)).toBe(true);
    // Espreitar não consome.
    expect(espreitarHandoffEmpresa()?.origem.contextoId).toBe(h.origem.contextoId);
    expect(espreitarHandoffEmpresa()).toBeTruthy();
    // Consumir consome.
    expect(consumirHandoffEmpresa()?.origem.contextoId).toBe(h.origem.contextoId);
    expect(espreitarHandoffEmpresa()).toBeNull();
  });

  it("um handoff fora do prazo é recusado", async () => {
    const { guardarHandoffEmpresa, espreitarHandoffEmpresa, HANDOFF_TTL_MS } = await carregar();
    guardarHandoffEmpresa(comHandoff(negocioCompleto()).handoff);

    const chave = [...mapa.keys()][0];
    const env = JSON.parse(mapa.get(chave)!);
    env.gravadoEm = Date.now() - HANDOFF_TTL_MS - 1_000;
    mapa.set(chave, JSON.stringify(env));

    expect(espreitarHandoffEmpresa()).toBeNull();
  });

  it("um payload ilegível não rebenta a página", async () => {
    const { espreitarHandoffEmpresa, guardarHandoffEmpresa } = await carregar();
    guardarHandoffEmpresa(comHandoff(negocioCompleto()).handoff);
    const chave = [...mapa.keys()][0];

    for (const lixo of ["{", "null", "[]", '{"versao":99}']) {
      mapa.set(chave, lixo);
      expect(() => espreitarHandoffEmpresa()).not.toThrow();
      expect(espreitarHandoffEmpresa()).toBeNull();
    }
  });

  it("o que sai do cofre é igual ao que entrou, nas partes que importam", async () => {
    const { guardarHandoffEmpresa, consumirHandoffEmpresa } = await carregar();
    const { negocio, handoff } = comHandoff(negocioCompleto({}, "empresa_existente"));
    guardarHandoffEmpresa(handoff);

    const lido = consumirHandoffEmpresa() as HandoffNegocioEmpresaV1;
    expect(lido).toBeTruthy();
    expect(lido.prefill.faturacaoAnual).toBeCloseTo(handoff.prefill.faturacaoAnual ?? 0, 2);
    expect(lido.prefill.jaTemEmpresa).toBe("sim");
    expect(lido.estrutura.length).toBe(handoff.estrutura.length);
    expect(lido.pendentes.length).toBe(handoff.pendentes.length);
    // O invariante sobrevive à viagem.
    expect(custosDoHandoffFecham(lido, negocio)).toBe(true);
  });
});
