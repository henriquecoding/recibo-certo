// ═══════════════════════════════════════════════════════════════════════
//  OS INVARIANTES DO DOMÍNIO DE NEGÓCIO
//  ---------------------------------------------------------------------
//  §32 do relatório. Cada teste aqui existe por causa de um erro concreto
//  que se pode cometer e que NÃO se vê no ecrã — números plausíveis, com
//  sinal certo e ordem de grandeza certa, mas errados.
//
//  Os seis do §32.1:
//    1. a soma das ofertas fecha com a receita global;
//    2. o IVA não entra no volume de negócios;
//    3. o overhead não duplica;
//    4. contribuição zero não cria break-even falso;
//    5. carga acima da capacidade gera aviso;
//    6. os choques produzem impacto coerente.
// ═══════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  agregar,
  analisarNegocio,
  calcularOferta,
  contextoNegocioVazio,
  custosOperacionaisAnuais,
  detetarDuplicacoes,
  diagnosticarConcentracao,
  entradaComparacao,
  manterNaOferta,
  mesmaDespesa,
  moverParaEstrutura,
  novaOferta,
  novoCustoEstrutura,
  paraEmpresa,
  paraFiz,
  paraDiagnosticoContabilista,
  conteudoPartilhaNegocio,
  sinaisDoNegocio,
  type ContextoNegocio,
  type OfertaNegocio,
  type TrabalhadorPlaneado,
} from "@/lib/negocio";
import { custoDoPosto } from "@/lib/payroll/custo-empregador";
import { precificar } from "@/lib/pricing";
import { escolherRota } from "@/lib/routing";
import { diagnosticoContabilista } from "@/lib/contabilista";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";

// ─── Utilitários dos testes ────────────────────────────────────────────

/** Marca uma oferta como respondida — o que a torna «trabalho da pessoa». */
function respondida(o: OfertaNegocio, campos = ["custo-direto", "volume"]): OfertaNegocio {
  return { ...o, respondidos: campos };
}

function negocioCom(ofertas: OfertaNegocio[], overhead: number[] = []): ContextoNegocio {
  const c = contextoNegocioVazio("ja_vendo");
  return {
    ...c,
    ofertas,
    estrutura: {
      ...c.estrutura,
      overheadMensal: overhead.map((v, i) => novoCustoEstrutura("outro", `Custo ${i + 1}`, v)),
    },
  };
}

const perto = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

/** Um posto no contrato v2, para os testes não repetirem a montagem. */
function posto(funcao: string, salarioBaseMensal: number, inicioMes = 0): TrabalhadorPlaneado {
  return {
    id: `t_${funcao}`,
    funcao,
    remuneracao: { salarioBaseMensal },
    contrato: { inicioMes, pagamentoSubsidios: "normal" },
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  0. A CAMADA É UM ORQUESTRADOR — e prova-se lendo o próprio código
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:sem-fonte-propria", () => {
  const RAIZ = join(process.cwd(), "src/lib/negocio");

  const ficheiros = (dir: string): string[] =>
    readdirSync(dir).flatMap((nome) => {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) return ficheiros(caminho);
      return nome.endsWith(".ts") ? [caminho] : [];
    });

  it("nenhum ficheiro do domínio declara uma taxa fiscal", () => {
    // A prova de que isto é um orquestrador e não um segundo motor. Uma
    // constante com percentagem aqui significa que alguém duplicou uma
    // fonte de verdade — e uma fonte duplicada envelhece em silêncio.
    const suspeitos: string[] = [];

    for (const caminho of ficheiros(RAIZ)) {
      const linhas = readFileSync(caminho, "utf8").split("\n");
      linhas.forEach((linha, i) => {
        const semComentario = linha.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
        // Uma constante exportada com nome de taxa e um número por valor.
        //
        // O nome tem de COMEÇAR pela palavra-chave, tê-la num degrau de
        // camelCase, ou estar todo em maiúsculas. A versão anterior era
        // `\w*(?:…|IVA|…)\w*` com `/i`, e casava «iva» dentro de qualquer
        // palavra portuguesa terminada em -iva: tentativa, alternativa,
        // iniciativa. Apanhou um contador de tentativas e ia continuar a
        // apanhar quem escrevesse português normal.
        //
        // `const iva = 0.23`, `taxaIvaNormal`, `TAXA_IVA` continuam todos
        // a ser apanhados — que é o que esta guarda existe para impedir.
        if (
          /(?:const|let)\s+(?:[A-Z0-9_]*(?:TAXA|IVA|IRS|IRC|TSU|SS_|DERRAMA|COEF)[A-Z0-9_]*|(?:taxa|iva|irs|irc|tsu|derrama|coef)\w*|[a-z]\w*(?:Taxa|Iva|Irs|Irc|Tsu|Derrama|Coef)\w*)\s*=\s*[\d.]/.test(
            semComentario,
          )
        ) {
          suspeitos.push(`${caminho.replace(process.cwd(), "")}:${i + 1} → ${linha.trim()}`);
        }
      });
    }

    // A própria guarda tem de continuar a apanhar o que existe para
    // apanhar. Sem isto, afinar o padrão para calar um falso positivo
    // podia esvaziá-lo sem ninguém dar por nada.
    const apanha = (linha: string) =>
      /(?:const|let)\s+(?:[A-Z0-9_]*(?:TAXA|IVA|IRS|IRC|TSU|SS_|DERRAMA|COEF)[A-Z0-9_]*|(?:taxa|iva|irs|irc|tsu|derrama|coef)\w*|[a-z]\w*(?:Taxa|Iva|Irs|Irc|Tsu|Derrama|Coef)\w*)\s*=\s*[\d.]/.test(
        linha,
      );
    for (const real of [
      "const TAXA_IVA = 0.23",
      "const IVA_NORMAL = 23",
      "const taxaIvaNormal = 0.23",
      "const iva = 0.23",
      "const COEF_SERVICOS = 0.75",
      "let derramaMunicipal = 1.5",
    ]) {
      expect(apanha(real), `devia apanhar: ${real}`).toBe(true);
    }
    for (const inocente of [
      "for (let ronda = 0; ronda < 3; ronda += 1) {",
      "const tentativa = 0",
      "const alternativa = 2",
      "const iniciativa = 1",
    ]) {
      expect(apanha(inocente), `não devia apanhar: ${inocente}`).toBe(false);
    }

    expect(suspeitos).toEqual([]);
  });

  it("as taxas que usa vêm importadas de `fiscal-data`", () => {
    const agregarSrc = readFileSync(join(RAIZ, "agregar.ts"), "utf8");
    expect(agregarSrc).toContain('from "@/lib/fiscal-data"');
    // E não escreve nenhuma à mão: nem a TSU, nem o IVA.
    expect(agregarSrc).not.toMatch(/0\.2375/);
    expect(agregarSrc).not.toMatch(/0\.23\b/);
  });

  it("o custo de pessoal é DELEGADO ao motor de payroll (§26)", () => {
    // «Nenhuma fórmula de payroll nova deve viver em `lib/negocio`.» A
    // conta de encargos estava aqui e era `bruto × meses × (1 + TSU)`:
    // ignorava refeição, seguro obrigatório, medicina do trabalho e a
    // retenção autónoma dos subsídios.
    const agregarSrc = readFileSync(join(RAIZ, "agregar.ts"), "utf8");
    expect(agregarSrc).toContain('from "@/lib/payroll/custo-empregador"');
    expect(agregarSrc).toContain("custoDoPosto");

    for (const caminho of ficheiros(RAIZ)) {
      const src = readFileSync(caminho, "utf8");
      // As assinaturas do motor de vencimento não podem reaparecer aqui.
      expect(src, caminho).not.toMatch(/function\s+(retencaoIRS|calcularRecibo|isencaoJovem)/);
    }
  });

  it("nenhum ficheiro do domínio reimplementa o solver de preço", () => {
    for (const caminho of ficheiros(RAIZ)) {
      const src = readFileSync(caminho, "utf8");
      // As assinaturas do solver da pricing engine. Se aparecerem aqui,
      // é porque há um segundo motor de preço a nascer.
      expect(src).not.toMatch(/function\s+precoPor(Margem|Markup|LucroUnidade)/);
      expect(src).not.toMatch(/function\s+fracaoDisponivel/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  1. A SOMA FECHA
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:soma", () => {
  it("a receita global é a soma das ofertas, ao cêntimo", () => {
    const a = respondida(novaOferta("produto_revenda", { nome: "Camisolas", volumeMes: 40 }));
    const b = respondida(novaOferta("servico", { nome: "Consultoria", volumeMes: 6 }));
    const r = analisarNegocio(negocioCom([a, b]));

    const somaLiquida = r.ofertas.reduce((s, o) => s + o.mensal.receitaSemIVA, 0);
    const somaCliente = r.ofertas.reduce((s, o) => s + o.mensal.receitaCliente, 0);

    expect(perto(r.receitaSemIVAMes, somaLiquida)).toBe(true);
    expect(perto(r.receitaClienteMes, somaCliente)).toBe(true);
  });

  it("os pesos somam 1 quando há receita", () => {
    const r = analisarNegocio(
      negocioCom([
        respondida(novaOferta("produto_revenda", { nome: "A", volumeMes: 30 })),
        respondida(novaOferta("produto_digital", { nome: "B", volumeMes: 15 })),
      ]),
    );
    const soma = r.ofertas.reduce((s, o) => s + o.peso, 0);
    expect(perto(soma, 1, 0.0001)).toBe(true);
  });

  it("as duas identidades que provam que a separação é exata", () => {
    // O invariante que sustenta `agregar.ts`. Se a separação entre custos
    // da OPERAÇÃO e impostos da PESSOA fosse aproximada, o comparador e o
    // motor de empresa receberiam custos que não fecham com o preço que
    // os produziu — e ninguém veria a diferença no ecrã.
    const oferta = respondida(novaOferta("servico", { nome: "Consultoria", volumeMes: 8 }));
    const r = calcularOferta(oferta);

    // ① A contribuição do NEGÓCIO é antes dos impostos pessoais: é ela que
    //    tem de fechar com a receita, porque é a que vai para o EBIT.
    expect(perto(r.custosVariaveisOperacionaisMes + r.contribuicaoMes, r.mensal.receitaSemIVA, 0.05)).toBe(
      true,
    );

    // ② Tirando-lhe os encargos, sobra exatamente a contribuição que a
    //    pricing engine calculou. É esta a prova de que não se inventou
    //    nem se perdeu um cêntimo na separação.
    const daEngine = r.preco.margem.contribuicaoUnidade * r.unidadesMes;
    expect(perto(r.contribuicaoMes - r.encargosVendedorMes, daEngine, 0.05)).toBe(true);
  });

  it("o resultado operacional é EBIT — antes dos impostos de quem recebe o lucro", () => {
    const oferta = novaOferta("servico", { nome: "Consultoria", volumeMes: 8 });
    oferta.pricing.vendedor.tipo = "ti";
    oferta.pricing.vendedor.faturacaoAnualPrevista = 32000;
    const r = analisarNegocio(negocioCom([respondida(oferta)], [200]));

    expect(r.temFiscalidadeVendedor).toBe(true);
    expect(r.encargosVendedorMes).toBeGreaterThan(0);
    // O que fica à pessoa é MENOS do que o resultado operacional — e a
    // diferença é exatamente a Segurança Social e o IRS já embutidos no
    // preço. Se fossem os mesmos números, um dos dois estava errado.
    expect(r.resultadoDepoisEncargosMes).toBeLessThan(r.resultadoOperacionalMes);
    expect(
      perto(r.resultadoOperacionalMes - r.encargosVendedorMes, r.resultadoDepoisEncargosMes, 0.02),
    ).toBe(true);
  });

  it("um negócio sem ofertas devolve zeros e não rebenta", () => {
    const r = analisarNegocio(contextoNegocioVazio());
    expect(r.receitaSemIVAMes).toBe(0);
    expect(r.resultadoOperacionalMes).toBe(0);
    expect(r.breakEven.possivel).toBe(false);
    expect(Number.isFinite(r.breakEven.vendasMes)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. O IVA NÃO É RECEITA
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:iva", () => {
  it("receitaSemIVA é menor do que receitaCliente quando se liquida IVA", () => {
    const oferta = novaOferta("produto_revenda", { nome: "Camisola", volumeMes: 20 });
    oferta.pricing.vendedor.regimeIVA = "normal";
    const r = calcularOferta(respondida(oferta));

    expect(r.mensal.receitaCliente).toBeGreaterThan(r.mensal.receitaSemIVA);
    expect(r.mensal.ivaCobrado).toBeGreaterThan(0);
    expect(perto(r.mensal.receitaSemIVA + r.mensal.ivaCobrado, r.mensal.receitaCliente)).toBe(true);
  });

  it("o adapter da empresa recebe volume de negócios SEM IVA", () => {
    const oferta = novaOferta("produto_revenda", { nome: "Camisola", volumeMes: 20 });
    oferta.pricing.vendedor.regimeIVA = "normal";
    const negocio = analisarNegocio(negocioCom([respondida(oferta)]));

    const entrada = paraEmpresa(negocio);
    expect(entrada.faturacao).toBe(negocio.receitaSemIVAAno);
    // O erro que este teste existe para apanhar: 23% a mais.
    expect(entrada.faturacao).toBeLessThan(negocio.receitaClienteMes * 12);
  });

  it("o adapter do comparador recebe volume de negócios SEM IVA", () => {
    const oferta = novaOferta("produto_revenda", { nome: "Camisola", volumeMes: 20 });
    oferta.pricing.vendedor.regimeIVA = "normal";
    const negocio = analisarNegocio(negocioCom([respondida(oferta)]));

    const entrada = entradaComparacao(negocio);
    expect(entrada.brutoAnual).toBe(negocio.receitaSemIVAAno);
    expect(entrada.brutoAnual).toBeLessThan(negocio.receitaClienteMes * 12);
  });

  it("no Art. 53.º não há IVA cobrado e as duas receitas coincidem", () => {
    const oferta = novaOferta("servico", { nome: "Explicações", volumeMes: 10 });
    oferta.pricing.vendedor.regimeIVA = "isento_art53";
    oferta.pricing.vendedor.faturacaoAnualPrevista = 9000;
    const r = calcularOferta(respondida(oferta));

    expect(r.mensal.ivaCobrado).toBe(0);
    expect(r.mensal.receitaCliente).toBe(r.mensal.receitaSemIVA);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. O OVERHEAD NÃO DUPLICA
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:duplicacao", () => {
  it("deteta o mesmo custo na oferta e na estrutura", () => {
    const oferta = novaOferta("servico", { nome: "Consultoria", volumeMes: 6 });
    oferta.pricing.custos.fixos = [{ id: "f1", rotulo: "Contabilidade", mensal: 150 }];
    const contexto = negocioCom([respondida(oferta)]);
    contexto.estrutura.overheadMensal = [novoCustoEstrutura("contabilidade", "Contabilista", 150)];

    const dups = detetarDuplicacoes(contexto);
    expect(dups).toHaveLength(1);
    expect(dups[0].valorDuplicado).toBe(150);
  });

  it("reconhece sinónimos da mesma família, e não funde despesas diferentes", () => {
    expect(mesmaDespesa("Contabilidade", "Contabilista (avença)")).toBe(true);
    expect(mesmaDespesa("Software", "Subscrições de software")).toBe(true);
    expect(mesmaDespesa("Seguro de responsabilidade civil", "Seguros")).toBe(true);
    expect(mesmaDespesa("Contabilidade", "Marketing")).toBe(false);
    expect(mesmaDespesa("Renda do escritório", "Ingredientes")).toBe(false);
  });

  it("mover para a estrutura tira o custo da oferta e não mexe no resto", () => {
    const oferta = novaOferta("servico", { nome: "Consultoria", volumeMes: 6 });
    oferta.pricing.custos.fixos = [
      { id: "f1", rotulo: "Contabilidade", mensal: 150 },
      { id: "f2", rotulo: "Ferramentas de desenho", mensal: 30 },
    ];
    const contexto = negocioCom([respondida(oferta)]);
    contexto.estrutura.overheadMensal = [novoCustoEstrutura("contabilidade", "Contabilidade", 150)];

    const depois = moverParaEstrutura(contexto, detetarDuplicacoes(contexto)[0]);
    const fixos = depois.ofertas[0].pricing.custos.fixos;

    expect(fixos).toHaveLength(1);
    expect(fixos[0].rotulo).toBe("Ferramentas de desenho");
    expect(detetarDuplicacoes(depois)).toHaveLength(0);
    // O original NÃO foi mutado: é o que permite oferecer «cancelar».
    expect(contexto.ofertas[0].pricing.custos.fixos).toHaveLength(2);
  });

  it("manter na oferta tira o custo da soma do overhead", () => {
    const oferta = novaOferta("servico", { nome: "Consultoria", volumeMes: 6 });
    oferta.pricing.custos.fixos = [{ id: "f1", rotulo: "Contabilidade", mensal: 150 }];
    const contexto = negocioCom([respondida(oferta)]);
    contexto.estrutura.overheadMensal = [novoCustoEstrutura("contabilidade", "Contabilidade", 150)];

    const antes = agregar(contexto).overheadMes;
    const depois = manterNaOferta(contexto, detetarDuplicacoes(contexto)[0]);

    expect(antes).toBe(150);
    expect(agregar(depois).overheadMes).toBe(0);
    expect(detetarDuplicacoes(depois)).toHaveLength(0);
  });

  it("o overhead soma uma só vez cada custo declarado", () => {
    const r = analisarNegocio(
      negocioCom([respondida(novaOferta("produto_revenda", { volumeMes: 30 }))], [150, 49, 300]),
    );
    expect(r.overheadMes).toBe(499);
  });

  it("os custos operacionais anuais não incluem os impostos do vendedor", () => {
    const oferta = novaOferta("servico", { nome: "Consultoria", volumeMes: 8 });
    oferta.pricing.vendedor.tipo = "ti";
    oferta.pricing.vendedor.faturacaoAnualPrevista = 30000;
    const contexto = negocioCom([respondida(oferta)], [150]);

    const a = agregar(contexto);
    const anuais = custosOperacionaisAnuais(a);

    expect(a.encargosVendedorMes).toBeGreaterThan(0);
    // Se os encargos estivessem lá dentro, esta soma bateria certo.
    expect(anuais).toBeLessThan((a.custosVariaveisMes + a.custosFixosMes + a.encargosVendedorMes) * 12);
    expect(perto(anuais, (a.custosVariaveisMes + a.custosFixosMes) * 12, 0.05)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. CONTRIBUIÇÃO ZERO NÃO CRIA BREAK-EVEN FALSO
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:breakeven", () => {
  it("com contribuição negativa não há ponto de equilíbrio, e diz-se porquê", () => {
    const oferta = novaOferta("produto_revenda", { nome: "Perde dinheiro", volumeMes: 20 });
    oferta.pricing.custos.direto = { valor: 100, incluiIVA: false, escalao: "normal" };
    // Um preço fixo abaixo do custo: cada venda tira dinheiro.
    oferta.pricing.objetivo = { modo: "preco_fixo", valor: 40, valorEhPVP: true };

    const r = analisarNegocio(negocioCom([respondida(oferta)], [200]));

    expect(r.breakEven.possivel).toBe(false);
    expect(r.breakEven.vendasMes).toBe(0);
    expect(r.breakEven.nota).toMatch(/não cobre|prejuízo/i);
    expect(Number.isFinite(r.breakEven.vendasMes)).toBe(true);
    expect(r.avisos.some((a) => a.severidade === "perigo")).toBe(true);
  });

  it("sem custos fixos o equilíbrio é zero e avisa-se que talvez falte declarar", () => {
    const r = analisarNegocio(negocioCom([respondida(novaOferta("produto_revenda", { volumeMes: 20 }))]));
    expect(r.breakEven.possivel).toBe(true);
    expect(r.breakEven.vendasMes).toBe(0);
    expect(r.breakEven.nota).toMatch(/custos de estrutura/i);
  });

  it("o break-even ao mix cobre exatamente os custos fixos", () => {
    const a = respondida(novaOferta("produto_revenda", { nome: "A", volumeMes: 40 }));
    const b = respondida(novaOferta("servico", { nome: "B", volumeMes: 5 }));
    const contexto = negocioCom([a, b], [800]);
    const r = analisarNegocio(contexto);
    const agg = agregar(contexto);

    expect(r.breakEven.possivel).toBe(true);
    const contribuicaoMedia = agg.margemContribuicaoMes / agg.unidadesMes;
    // Arredonda-se para cima (não há meia venda), por isso cobre com folga.
    expect(r.breakEven.vendasMes * contribuicaoMedia).toBeGreaterThanOrEqual(800 - 0.01);
    expect((r.breakEven.vendasMes - 1) * contribuicaoMedia).toBeLessThan(800 + 0.01);
  });

  it("abaixo do equilíbrio, a folga é negativa e há aviso", () => {
    const oferta = respondida(novaOferta("produto_revenda", { nome: "A", volumeMes: 2 }));
    const r = analisarNegocio(negocioCom([oferta], [3000]));

    expect(r.breakEven.folgaVendas).toBeLessThan(0);
    expect(r.resultadoOperacionalMes).toBeLessThan(0);
    expect(r.avisos.some((a) => a.id === "resultado-negativo")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  5. CAPACIDADE PODE CONTRADIZER O VOLUME
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:capacidade", () => {
  it("um plano impossível é sinalizado, não corrigido", () => {
    const oferta = novaOferta("projeto", { nome: "Projetos", volumeMes: 100 });
    // 40 h por projeto × 100 projetos = 4 000 h/mês.
    oferta.pricing.tempo = { ...oferta.pricing.tempo!, horasPorUnidade: 40 };
    const contexto = negocioCom([respondida(oferta)]);
    const r = analisarNegocio(contexto);

    const excedidas = r.capacidade.filter((c) => c.estado === "excedida");
    expect(excedidas.length).toBeGreaterThan(0);
    expect(r.avisos.some((a) => a.titulo.includes("não cabe"))).toBe(true);
    // O volume NÃO foi corrigido: a decisão é da pessoa.
    expect(r.ofertas[0].unidadesMes).toBe(100);
  });

  it("um plano folgado não gera aviso", () => {
    const oferta = novaOferta("projeto", { nome: "Projetos", volumeMes: 1 });
    oferta.pricing.tempo = { ...oferta.pricing.tempo!, horasPorUnidade: 20 };
    const r = analisarNegocio(negocioCom([respondida(oferta)]));

    expect(r.capacidade.every((c) => c.estado !== "excedida")).toBe(true);
    expect(r.avisos.some((a) => a.titulo.includes("não cabe"))).toBe(false);
  });

  it("o gargalo de horas soma as ofertas mas não soma os tetos", () => {
    // Duas ofertas de serviço partilham a mesma semana de trabalho.
    const a = novaOferta("servico", { nome: "A", volumeMes: 10 });
    a.pricing.tempo = { ...a.pricing.tempo!, horasPorUnidade: 8 };
    const b = novaOferta("servico", { nome: "B", volumeMes: 10 });
    b.pricing.tempo = { ...b.pricing.tempo!, horasPorUnidade: 8 };

    const r = analisarNegocio(negocioCom([respondida(a), respondida(b)]));
    const gargalo = r.capacidade.find((c) => c.ofertaId === "__horas__");

    expect(gargalo).toBeDefined();
    expect(gargalo!.carga).toBe(160);
    // O teto é o de UMA pessoa, não a soma de dois modelos de tempo.
    expect(gargalo!.maximo).toBeLessThan(200);
  });

  it("uma revenda não inventa capacidade", () => {
    const r = analisarNegocio(
      negocioCom([respondida(novaOferta("produto_revenda", { volumeMes: 5000 }))]),
    );
    expect(r.capacidade).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  6. OS CHOQUES SÃO COERENTES
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:sensibilidade", () => {
  const contexto = negocioCom(
    [
      respondida(novaOferta("produto_revenda", { nome: "A", volumeMes: 60 })),
      respondida(novaOferta("servico", { nome: "B", volumeMes: 6 })),
    ],
    [600],
  );

  it("menos volume dá menos resultado; mais volume dá mais", () => {
    const r = analisarNegocio(contexto, { comSensibilidade: true });
    const s = r.sensibilidade!;

    const queda = s.impactos.find((i) => i.eixo === "volume" && i.choque === -0.3)!;
    const subida = s.impactos.find((i) => i.eixo === "volume" && i.choque === 0.1)!;

    expect(queda.delta).toBeLessThan(0);
    expect(subida.delta).toBeGreaterThan(0);
  });

  it("custos e overhead a subir só podem descer o resultado", () => {
    const s = analisarNegocio(contexto, { comSensibilidade: true }).sensibilidade!;
    for (const i of s.impactos.filter((x) => x.eixo === "custo" || x.eixo === "overhead")) {
      expect(i.delta).toBeLessThanOrEqual(0);
    }
  });

  it("o tornado vem ordenado por amplitude e nomeia um eixo crítico", () => {
    const s = analisarNegocio(contexto, { comSensibilidade: true }).sensibilidade!;
    for (let i = 1; i < s.tornado.length; i++) {
      expect(s.tornado[i - 1].amplitude).toBeGreaterThanOrEqual(s.tornado[i].amplitude);
    }
    expect(s.critico).toBeDefined();
    expect(s.critico).toBe(s.tornado[0]);
  });

  it("o choque de preço não reforma o preço a partir do objetivo de margem", () => {
    // Se o choque mexesse no `ContextoPreco`, a engine resolveria outro
    // preço e o teste mediria outra coisa. O preço da oferta fica igual.
    const antes = precificar(contexto.ofertas[0].pricing).precoLiquido;
    analisarNegocio(contexto, { comSensibilidade: true });
    const depois = precificar(contexto.ofertas[0].pricing).precoLiquido;
    expect(depois).toBe(antes);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  CONCENTRAÇÃO
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:concentracao", () => {
  it("uma oferta só é `unica`, e não um risco fiscal", () => {
    const r = analisarNegocio(negocioCom([respondida(novaOferta("servico", { volumeMes: 5 }))]));
    expect(r.concentracao.estado).toBe("unica");
    expect(r.concentracao.mensagem).not.toMatch(/fisc|imposto|AT\b/i);
  });

  it("distingue diversificada de concentrada", () => {
    const grande = respondida(novaOferta("projeto", { nome: "Grande", volumeMes: 4 }));
    const pequena = respondida(novaOferta("produto_digital", { nome: "Pequena", volumeMes: 1 }));
    const r = diagnosticarConcentracao(analisarNegocio(negocioCom([grande, pequena])).ofertas);
    expect(["concentrada", "moderada", "diversificada"]).toContain(r.estado);
    expect(r.maiorPeso).toBeGreaterThan(0);
    expect(r.hhi).toBeGreaterThan(0);
    expect(r.hhi).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  §32.2 — INTEGRAÇÃO COM OS MOTORES EXISTENTES
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:integracao", () => {
  it("mudar o preço de uma oferta muda o negócio", () => {
    const oferta = respondida(novaOferta("produto_revenda", { nome: "A", volumeMes: 30 }));
    const antes = analisarNegocio(negocioCom([oferta]));

    const maisCaro: OfertaNegocio = {
      ...oferta,
      pricing: { ...oferta.pricing, objetivo: { modo: "margem", percentagem: 0.6 } },
    };
    const depois = analisarNegocio(negocioCom([maisCaro]));

    expect(depois.receitaSemIVAMes).toBeGreaterThan(antes.receitaSemIVAMes);
  });

  it("remover uma oferta recalcula tudo", () => {
    const a = respondida(novaOferta("produto_revenda", { nome: "A", volumeMes: 30 }));
    const b = respondida(novaOferta("servico", { nome: "B", volumeMes: 5 }));

    const comDuas = analisarNegocio(negocioCom([a, b]));
    const comUma = analisarNegocio(negocioCom([a]));

    expect(comUma.receitaSemIVAMes).toBeLessThan(comDuas.receitaSemIVAMes);
    expect(comUma.ofertas).toHaveLength(1);
    expect(comUma.concentracao.estado).toBe("unica");
  });

  it("o diagnóstico de contabilista usa o negócio e não repete perguntas", () => {
    const contexto = negocioCom([respondida(novaOferta("servico", { volumeMes: 8 }))], [150]);
    contexto.fiscal.enquadramento = "sociedade";
    const negocio = analisarNegocio(contexto);

    const entrada = paraDiagnosticoContabilista(negocio, contexto);
    expect(entrada.formaJuridica).toBe("sociedade");
    expect(entrada.faturacaoAnual).toBe(negocio.receitaSemIVAAno);
    expect(entrada.despesasAnuais).toBe(negocio.custosOperacionaisAno);

    // O motor existente aceita-o sem adaptações.
    const d = diagnosticoContabilista(entrada);
    expect(d.nivel).toBe("obrigatorio");
  });

  it("clientes internacionais chegam ao diagnóstico", () => {
    const oferta = novaOferta("servico", { volumeMes: 5 });
    oferta.pricing.canal = { ...oferta.pricing.canal, cliente: "empresa_ue" };
    const contexto = negocioCom([respondida(oferta)]);
    expect(paraDiagnosticoContabilista(analisarNegocio(contexto), contexto).clientes).toBe(
      "internacional",
    );
  });

  it("o routing usa os sinais do resultado, e um exemplo não abre rota comercial", () => {
    // Sem `respondidos`, o negócio é exploratório.
    const exploratorio = negocioCom([novaOferta("servico", { volumeMes: 5 })]);
    const rExp = analisarNegocio(exploratorio);
    expect(rExp.confianca).toBe("exploratorio");

    const rota = escolherRota(sinaisDoNegocio(rExp, exploratorio));
    expect(rota.rota).toBe("sem_parceiro");
    expect(rota.motivo).toBe("confianca_insuficiente");
  });

  it("uma sociedade é encaminhada para contabilista, não para a FIZ", () => {
    const contexto = negocioCom([respondida(novaOferta("servico", { volumeMes: 8 }))], [150]);
    contexto.fiscal.enquadramento = "sociedade";
    contexto.respondidos = ["estrutura-sem-custos"];

    const negocio = analisarNegocio(contexto);
    const rota = escolherRota(sinaisDoNegocio(negocio, contexto));
    expect(rota.rota).toBe("contabilista");
  });

  it("contratar alguém torna o caso complexo", () => {
    const contexto = negocioCom([respondida(novaOferta("servico", { volumeMes: 8 }))]);
    contexto.estrutura.trabalhadores = [posto("Apoio", 900)];
    const sinais = sinaisDoNegocio(analisarNegocio(contexto), contexto);
    expect(sinais.casoComplexo).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  TRABALHADORES — o cálculo é do motor de vencimento, não daqui
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:trabalhadores", () => {
  it("o custo é o do motor de payroll, não uma fórmula própria", () => {
    // ⚠️ ISTO JÁ FOI `bruto × meses × (1 + TSU) ÷ 12`, e o teste verificava
    // essa fórmula. Verificar uma fórmula que o domínio não devia ter era
    // prender aqui a duplicação que §26 proíbe: o domínio delega, e o
    // teste tem de verificar a DELEGAÇÃO, não uma segunda conta.
    const contexto = negocioCom([respondida(novaOferta("servico", { volumeMes: 8 }))]);
    contexto.estrutura.trabalhadores = [posto("Apoio", 1000)];

    const doMotor = custoDoPosto({ salarioBaseMensal: 1000, pagamentoSubsidios: "normal" });
    expect(perto(agregar(contexto).custoTrabalhadoresMes, doMotor.empresa.custoMedioMensal, 0.02)).toBe(
      true,
    );
  });

  it("o custo cobre mais do que o bruto e a TSU (§25)", () => {
    // O seguro de acidentes de trabalho é obrigatório desde o primeiro dia
    // e a conta antiga deixava-o de fora, junto com a refeição e a SST.
    const contexto = negocioCom([respondida(novaOferta("servico", { volumeMes: 8 }))]);
    contexto.estrutura.trabalhadores = [posto("Apoio", 1000)];

    const antigo = (1000 * 14 * (1 + SS_DEPENDENTE.entidade.value)) / 12;
    expect(agregar(contexto).custoTrabalhadoresMes).toBeGreaterThan(antigo);
  });

  it("o custo dos trabalhadores entra nos fixos e sobe o ponto de equilíbrio", () => {
    const base = negocioCom([respondida(novaOferta("produto_revenda", { volumeMes: 60 }))], [200]);
    const comEquipa: ContextoNegocio = {
      ...base,
      estrutura: { ...base.estrutura, trabalhadores: [posto("Apoio", 900)] },
    };

    const a = analisarNegocio(base);
    const b = analisarNegocio(comEquipa);
    expect(b.breakEven.vendasMes).toBeGreaterThan(a.breakEven.vendasMes);
    expect(b.resultadoOperacionalMes).toBeLessThan(a.resultadoOperacionalMes);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  PRIVACIDADE — o que sai para parceiros
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:privacidade", () => {
  const contexto = (() => {
    const oferta = novaOferta("produto_revenda", { nome: "Camisola secreta", volumeMes: 30 });
    oferta.pricing.custos.direto = { valor: 7.77, incluiIVA: false, escalao: "normal" };
    const c = negocioCom([respondida(oferta)], [150]);
    c.fiscal.enquadramento = "independente";
    return c;
  })();
  const negocio = analisarNegocio(contexto);

  it("o conteúdo para o contabilista não leva custos de fornecedor nem margens", () => {
    const conteudo = conteudoPartilhaNegocio(negocio, contexto);
    const texto = JSON.stringify(conteudo);
    expect(texto).not.toContain("7,77");
    expect(texto).not.toContain("7.77");
    expect(texto.toLowerCase()).not.toContain("margem");
    expect(texto.toLowerCase()).not.toContain("markup");
  });

  it("é enumerável campo a campo — é o que o consentimento mostra", () => {
    const conteudo = conteudoPartilhaNegocio(negocio, contexto);
    const chaves = Object.keys(conteudo);
    expect(chaves.length).toBeGreaterThan(0);
    // Nada de `undefined` nem de funções: o que segue tem de ser dados
    // inertes, enumeráveis e mostráveis antes do envio.
    for (const k of chaves) {
      expect(conteudo[k]).toBeDefined();
      expect(typeof conteudo[k]).not.toBe("function");
    }
  });

  it("o handoff da FIZ leva o resumo fiscal e não o modelo de negócio", () => {
    const valores = paraFiz(negocio, contexto);
    const chaves = Object.keys(valores);
    const permitidas = [
      "entityType", "activityCategory", "vatTerritory", "vatRegimeEstimate",
      "period", "grossEstimate", "vatEstimate", "withholdingEstimate",
      "socialSecurityEstimate", "irsEstimate",
    ];
    for (const k of chaves) expect(permitidas).toContain(k);

    const texto = JSON.stringify(valores);
    expect(texto).not.toContain("Camisola secreta");
    expect(texto).not.toContain("7.77");
  });

  it("o `grossEstimate` da FIZ é sem IVA", () => {
    expect(paraFiz(negocio, contexto).grossEstimate).toBe(negocio.receitaSemIVAAno);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  CONFIANÇA
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:confianca", () => {
  it("sem ofertas é exploratório", () => {
    expect(analisarNegocio(contextoNegocioVazio()).confianca).toBe("exploratorio");
  });

  it("com ofertas por responder continua exploratório", () => {
    expect(analisarNegocio(negocioCom([novaOferta("servico", { volumeMes: 5 })])).confianca).toBe(
      "exploratorio",
    );
  });

  it("com ofertas respondidas mas sem estrutura é estimado", () => {
    expect(
      analisarNegocio(negocioCom([respondida(novaOferta("servico", { volumeMes: 5 }))])).confianca,
    ).toBe("estimado");
  });

  it("com ofertas, volume e estrutura é estruturado", () => {
    expect(
      analisarNegocio(
        negocioCom([respondida(novaOferta("servico", { volumeMes: 5 }))], [150]),
      ).confianca,
    ).toBe("estruturado");
  });

  it("declarar que não há custos de estrutura também conta como resposta", () => {
    const contexto = negocioCom([respondida(novaOferta("servico", { volumeMes: 5 }))]);
    contexto.respondidos = ["estrutura-sem-custos"];
    expect(analisarNegocio(contexto).confianca).toBe("estruturado");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  PRESSUPOSTOS
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:pressupostos", () => {
  it("uma estrutura vazia é um pressuposto de impacto alto", () => {
    const r = analisarNegocio(negocioCom([respondida(novaOferta("servico", { volumeMes: 5 }))]));
    const p = r.pressupostos.find((x) => x.id === "estrutura-vazia");
    expect(p).toBeDefined();
    expect(p!.impacto).toBe("alto");
    expect(p!.origem).toBe("default");
  });

  it("vêm ordenados por impacto", () => {
    const r = analisarNegocio(negocioCom([respondida(novaOferta("servico", { volumeMes: 5 }))]));
    const ordem = { alto: 3, medio: 2, baixo: 1 } as const;
    for (let i = 1; i < r.pressupostos.length; i++) {
      expect(ordem[r.pressupostos[i - 1].impacto]).toBeGreaterThanOrEqual(
        ordem[r.pressupostos[i].impacto],
      );
    }
  });

  it("uma oferta sem trabalho da pessoa é declarada como exemplo", () => {
    const r = analisarNegocio(negocioCom([novaOferta("servico", { volumeMes: 5 })]));
    expect(r.pressupostos.some((p) => p.id.startsWith("oferta-exemplo-"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  CAIXA — lucro não é dinheiro
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:caixa", () => {
  it("só corre quando é pedida — não pesa no primeiro ecrã", () => {
    const contexto = negocioCom([respondida(novaOferta("produto_revenda", { volumeMes: 30 }))]);
    expect(analisarNegocio(contexto).caixa).toBeUndefined();
    expect(analisarNegocio(contexto, { comCaixa: true }).caixa).toBeDefined();
  });

  it("um prazo de recebimento longo cria um buraco que o lucro não mostra", () => {
    const oferta = respondida(novaOferta("produto_revenda", { nome: "A", volumeMes: 40 }));
    const base = negocioCom([oferta], [400]);

    const semPrazo: ContextoNegocio = {
      ...base,
      caixa: { saldoInicial: 0, prazoRecebimentoDias: 0, prazoFornecedorDias: 0 },
    };
    const comPrazo: ContextoNegocio = {
      ...base,
      caixa: { saldoInicial: 0, prazoRecebimentoDias: 90, prazoFornecedorDias: 0 },
    };

    const a = analisarNegocio(semPrazo, { comCaixa: true });
    const b = analisarNegocio(comPrazo, { comCaixa: true });

    // O LUCRO é o mesmo nos dois: o prazo não muda o modelo económico.
    expect(a.resultadoOperacionalMes).toBe(b.resultadoOperacionalMes);
    // A CAIXA não é: com 90 dias, os primeiros meses não recebem nada.
    expect(b.caixa!.saldoMinimo).toBeLessThan(a.caixa!.saldoMinimo);
    expect(b.caixa!.capitalAdicionalNecessario).toBeGreaterThan(0);
  });

  it("o investimento inicial sai antes de abrir e conta no capital necessário", () => {
    const base = negocioCom([respondida(novaOferta("produto_revenda", { volumeMes: 30 }))]);
    const comInvestimento: ContextoNegocio = {
      ...base,
      estrutura: {
        ...base.estrutura,
        investimentosIniciais: [
          { id: "i1", categoria: "equipamento", rotulo: "Forno", valor: 9000, mes: 0 },
        ],
      },
      caixa: { saldoInicial: 1000, prazoRecebimentoDias: 30, prazoFornecedorDias: 0 },
    };

    const r = analisarNegocio(comInvestimento, { comCaixa: true }).caixa!;
    expect(r.saldoMinimo).toBeLessThan(0);
    expect(r.capitalAdicionalNecessario).toBeGreaterThan(0);
  });

  it("a projeção tem tantos meses quanto o horizonte, e o saldo encadeia", () => {
    const base = negocioCom([respondida(novaOferta("produto_revenda", { volumeMes: 30 }))], [300]);
    const contexto: ContextoNegocio = {
      ...base,
      procura: { horizonteMeses: 24, modo: "simples" },
      caixa: { saldoInicial: 500, prazoRecebimentoDias: 30, prazoFornecedorDias: 30 },
    };

    const r = analisarNegocio(contexto, { comCaixa: true }).caixa!;
    expect(r.meses).toHaveLength(24);
    for (let i = 1; i < r.meses.length; i++) {
      expect(perto(r.meses[i].saldoFim, r.meses[i - 1].saldoFim + r.meses[i].fluxo, 0.02)).toBe(true);
    }
  });

  it("o IVA cobrado não fica na caixa como se fosse receita", () => {
    // ⚠️ ISTO MUDOU NA CAIXA v2, E A MUDANÇA É O PONTO.
    //
    // A v1 neutralizava o IVA no MESMO mês, por não saber o calendário. O
    // fluxo do mês 1 era, por construção, igual ao resultado operacional
    // — e este teste verificava essa igualdade.
    //
    // Só que essa igualdade escondia o efeito que interessa: entre cobrar
    // o IVA e o entregar passam dois a cinco meses, e nesse intervalo o
    // dinheiro está na conta sem ser da empresa. A pergunta certa não é
    // «o mês 1 bate com o resultado» — é «o IVA acaba por sair».
    const oferta = novaOferta("produto_revenda", { nome: "A", volumeMes: 30 });
    oferta.pricing.vendedor.regimeIVA = "normal";
    const base = negocioCom([respondida(oferta)]);
    const contexto: ContextoNegocio = {
      ...base,
      // Sociedade: é para ela que o Art. 41.º determina periodicidade.
      fiscal: { ...base.fiscal, enquadramento: "sociedade" },
      procura: { ...base.procura, horizonteMeses: 24 },
      caixa: { saldoInicial: 0, prazoRecebimentoDias: 0, prazoFornecedorDias: 0 },
    };

    const r = analisarNegocio(contexto, { comCaixa: true });
    expect(r.ivaCobradoMes).toBeGreaterThan(0);

    // ① O IVA SAI mesmo — e sai etiquetado, não diluído num total.
    const saidasDeIVA = (r.caixa!.fluxos ?? []).filter((f) => f.tipo === "iva");
    expect(saidasDeIVA.length).toBeGreaterThan(0);
    expect(saidasDeIVA.every((f) => f.valor < 0)).toBe(true);

    // ② E não sai no mês em que é cobrado: é esse o efeito de tesouraria
    //    que a v1 não conseguia mostrar.
    expect(saidasDeIVA.every((f) => f.mes > 1)).toBe(true);

    // ③ Ao longo do horizonte, o que sai aproxima-se do que foi cobrado.
    //    Não é igual: o IVA dos últimos meses só se entrega depois do fim
    //    da projeção — e é isso mesmo que acontece na vida real.
    const totalSaido = Math.abs(saidasDeIVA.reduce((s, f) => s + f.valor, 0));
    const totalCobrado = r.ivaCobradoMes * contexto.procura.horizonteMeses;
    expect(totalSaido).toBeGreaterThan(totalCobrado * 0.6);
    expect(totalSaido).toBeLessThanOrEqual(totalCobrado + 0.01);
  });

  it("sem periodicidade determinada, o IVA não gera um calendário inventado", () => {
    // Para um trabalhador independente o motor não determina
    // periodicidade. A caixa NÃO pode escolher uma por ela — §53.
    const oferta = novaOferta("produto_revenda", { nome: "A", volumeMes: 30 });
    oferta.pricing.vendedor.regimeIVA = "normal";
    const base = negocioCom([respondida(oferta)]);
    const r = analisarNegocio(
      {
        ...base,
        fiscal: { ...base.fiscal, enquadramento: "independente" },
        caixa: { saldoInicial: 0, prazoRecebimentoDias: 0, prazoFornecedorDias: 0 },
      },
      { comCaixa: true },
    );

    expect((r.caixa!.fluxos ?? []).filter((f) => f.tipo === "iva")).toHaveLength(0);
  });
});
