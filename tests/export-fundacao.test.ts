// Fundação de exportação — as medições da pesquisa de documentos premium,
// transformadas em invariantes. Cada bloco cita a medição que o motivou.

import { describe, expect, it } from "vitest";
import {
  arredondar,
  cent,
  dataISO,
  dataPT,
  eur,
  eurFolhaPT,
  eurMaquina,
  numeroDoc,
  pctDoc,
  regruparMilhares,
  repartirCentimos,
} from "../src/lib/export/dinheiro";
import {
  DIALETOS,
  data,
  dinheiro,
  escreverAmbosCSV,
  escreverCSV,
  neutralizarFormula,
  numero,
  texto,
  vazio,
  type TabelaCSV,
} from "../src/lib/export/csv";
import {
  canonico,
  digestDados,
  digestCurto,
  gerarReferencia,
  referenciaValida,
  criarProveniencia,
} from "../src/lib/export/referencia";
import { ascii, contentDisposition, nomeFicheiro } from "../src/lib/export/nomes";

// ── M8 · toFixed não é um arredondador de dinheiro ───────────────────────────

describe("arredondamento de dinheiro (M8)", () => {
  it("arredonda meio-para-cima os casos que o toFixed erra", () => {
    // Medido na pesquisa: (1867.665).toFixed(2) === "1867.66".
    expect((1867.665).toFixed(2)).toBe("1867.66");
    expect(arredondar(1867.665)).toBe(1867.67);
    expect(arredondar(2.675)).toBe(2.68);
    expect(arredondar(1.005)).toBe(1.01);
    expect(arredondar(0.615)).toBe(0.62);
  });

  it("trata negativos simetricamente", () => {
    expect(arredondar(-1867.665)).toBe(-1867.67);
    expect(arredondar(-2.675)).toBe(-2.68);
  });

  it("é estável: arredondar duas vezes dá o mesmo", () => {
    for (const valor of [1867.665, 0.005, 1234.567, -99.995, 24748]) {
      expect(arredondar(arredondar(valor))).toBe(arredondar(valor));
    }
  });

  it("aceita casas diferentes e sobrevive a valores não finitos", () => {
    expect(arredondar(0.12345, 4)).toBe(0.1235);
    expect(arredondar(Number.NaN)).toBe(0);
    expect(arredondar(Number.POSITIVE_INFINITY)).toBe(0);
    expect(cent(10 / 3)).toBe(3.33);
  });
});

// ── M3 · o Intl português não agrupa milhares abaixo de 10 000 ───────────────

describe("formatação de euros (M3)", () => {
  it("agrupa sempre os milhares, mesmo abaixo de 10 000", () => {
    // Sem useGrouping:"always", o CLDR pt-PT dá "2051,58 €" — medido.
    expect(new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(2051.58))
      .not.toContain("2 051");
    expect(eur(2051.58)).toContain("2");
    expect(eur(2051.58).replace(/ | /g, " ")).toBe("2 051,58 €");
    expect(eur(24748).replace(/ | /g, " ")).toBe("24 748,00 €");
    expect(eur(1850).replace(/ | /g, " ")).toBe("1 850,00 €");
  });

  it("arredonda antes de formatar, para o impresso ser o somado", () => {
    expect(eur(1867.665).replace(/ | /g, " ")).toBe("1 867,67 €");
  });

  it("a célula de folha de cálculo não leva símbolo nem agrupamento", () => {
    // As três coisas que fazem o Excel importar o número como TEXTO.
    expect(eurMaquina(24748)).toBe("24748.00");
    expect(eurFolhaPT(24748)).toBe("24748,00");
    expect(eurMaquina(1867.665)).toBe("1867.67");
  });

  it("percentagens e números simples", () => {
    expect(pctDoc(0.236)).toBe("23,6%");
    expect(numeroDoc(1.25)).toBe("1,25");
    expect(numeroDoc(40)).toBe("40");
  });

  it("datas nos dois dialetos", () => {
    expect(dataISO("2026-07-31T10:00:00Z")).toBe("2026-07-31");
    expect(dataPT("2026-07-31T10:00:00Z")).toBe("31/07/2026");
    expect(dataISO("nada")).toBe("");
  });
});

// ── M6 · injeção de fórmulas ─────────────────────────────────────────────────

describe("injeção de fórmulas em CSV (M6)", () => {
  it("neutraliza todos os inícios perigosos", () => {
    for (const perigoso of ["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx", "＝1", "＋1", "－1", "＠x"]) {
      expect(neutralizarFormula(perigoso).startsWith("'")).toBe(true);
    }
  });

  it("não toca em texto inofensivo", () => {
    for (const seguro of ["Empresa Lda.", "Remuneração base", "2026-07-31", ""]) {
      expect(neutralizarFormula(seguro)).toBe(seguro);
    }
  });

  it("NUNCA prefixa um campo numérico — senão a coluna deixa de somar", () => {
    const tabela: TabelaCSV = {
      colunas: [{ codigo: "valor_eur", rotulo: "Valor" }],
      linhas: [[dinheiro(-205.44)]],
    };
    const maquina = escreverCSV(tabela, { dialeto: "maquina" });
    expect(maquina).toContain("-205.44");
    expect(maquina).not.toContain("'-205.44");
  });

  it("defende o campo de texto que vem do utilizador", () => {
    const tabela: TabelaCSV = {
      colunas: [{ codigo: "cliente", rotulo: "Cliente" }],
      linhas: [[texto("=HYPERLINK(\"http://mau\",\"clica\")")]],
    };
    const csv = escreverCSV(tabela, { dialeto: "humano" });
    expect(csv).toContain("'=HYPERLINK");
  });

  it("defende também o cabeçalho", () => {
    const tabela: TabelaCSV = { colunas: [{ codigo: "=mau", rotulo: "=mau" }], linhas: [] };
    expect(escreverCSV(tabela, { dialeto: "maquina" })).toContain("'=mau");
  });
});

// ── RFC 4180 ─────────────────────────────────────────────────────────────────

describe("conformidade RFC 4180", () => {
  const tabela: TabelaCSV = {
    colunas: [
      { codigo: "rubrica", rotulo: "Rubrica" },
      { codigo: "valor_eur", rotulo: "Valor" },
    ],
    linhas: [
      [texto("Vencimento base"), dinheiro(1850)],
      [texto('Prémio "desempenho"'), dinheiro(250)],
      [texto("Linha; com separador"), dinheiro(0)],
    ],
  };

  it("termina as linhas em CRLF e não deixa linha vazia no fim", () => {
    const csv = escreverCSV(tabela, { dialeto: "maquina" });
    expect(csv).toContain("\r\n");
    expect(csv.endsWith("\r\n")).toBe(false);
    expect(csv.split("\r\n")).toHaveLength(4);
  });

  it("escapa aspas duplicando-as, nunca com barra invertida", () => {
    const csv = escreverCSV(tabela, { dialeto: "maquina" });
    expect(csv).toContain('"Prémio ""desempenho"""');
    expect(csv).not.toContain("\\\"");
  });

  it("cita só quando é preciso", () => {
    const csv = escreverCSV(tabela, { dialeto: "maquina" });
    expect(csv).toContain("Vencimento base,1850.00");
    // O ponto e vírgula não é separador no dialeto de máquina: não precisa de aspas.
    expect(csv).toContain("Linha; com separador,0.00");
    // Mas é no humano, e aí precisa.
    expect(escreverCSV(tabela, { dialeto: "humano" })).toContain('"Linha; com separador"');
  });

  it("cita quando há espaço nas pontas", () => {
    const t: TabelaCSV = { colunas: [{ codigo: "a", rotulo: "A" }], linhas: [[texto(" espaço ")]] };
    expect(escreverCSV(t, { dialeto: "maquina" })).toContain('" espaço "');
  });

  it("uma tabela por ficheiro: um cabeçalho, sem blocos concatenados (M7)", () => {
    const csv = escreverCSV(tabela, { dialeto: "maquina" });
    const linhas = csv.split("\r\n");
    expect(linhas[0]).toBe("rubrica,valor_eur");
    expect(linhas.filter((linha) => linha === "")).toHaveLength(0);
  });
});

// ── Os dois dialetos ─────────────────────────────────────────────────────────

describe("dialetos", () => {
  const tabela: TabelaCSV = {
    colunas: [
      { codigo: "data", rotulo: "Data" },
      { codigo: "horas", rotulo: "Horas" },
      { codigo: "valor_eur", rotulo: "Valor" },
      { codigo: "nao_aplicavel", rotulo: "Não aplicável" },
    ],
    linhas: [[data("2026-07-31T00:00:00Z"), numero(1.25), dinheiro(2051.58), vazio()]],
  };

  it("o humano leva BOM, ponto e vírgula, vírgula decimal e data portuguesa", () => {
    const csv = escreverCSV(tabela, { dialeto: "humano" });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Data;Horas;Valor");
    expect(csv).toContain("31/07/2026;1,25;2051,58;");
  });

  it("o de máquina é RFC 4180 puro: sem BOM, vírgula, ponto decimal, ISO", () => {
    const csv = escreverCSV(tabela, { dialeto: "maquina" });
    expect(csv.startsWith("﻿")).toBe(false);
    expect(csv).toContain("data,horas,valor_eur");
    expect(csv).toContain("2026-07-31,1.25,2051.58,");
  });

  it("nunca escreve a linha sep=, que quebra todos os outros leitores", () => {
    for (const dialeto of ["humano", "maquina"] as const) {
      expect(escreverCSV(tabela, { dialeto })).not.toContain("sep=");
    }
  });

  it("os dois dialetos descrevem os mesmos valores", () => {
    const { humano, maquina } = escreverAmbosCSV(tabela);
    expect(humano.replace("﻿", "").split("\r\n")).toHaveLength(maquina.split("\r\n").length);
    expect(DIALETOS.humano.separador).not.toBe(DIALETOS.maquina.separador);
  });

  it("em-dash não: célula vazia para «não aplicável», zero para zero", () => {
    const csv = escreverCSV(tabela, { dialeto: "maquina" });
    expect(csv.split("\r\n")[1].endsWith(",")).toBe(true);
  });
});

// ── M11 · proveniência ───────────────────────────────────────────────────────

describe("proveniência (M11)", () => {
  it("a referência não usa os carateres que se trocam ao ler em voz alta", () => {
    for (let i = 0; i < 200; i++) {
      const referencia = gerarReferencia("vencimento");
      expect(referencia).toMatch(/^RC-\d{4}-VNC-[A-Z2-9]{6}$/);
      expect(referencia.slice(11)).not.toMatch(/[IO01]/);
      expect(referenciaValida(referencia)).toBe(true);
    }
  });

  it("rejeita referências mal formadas", () => {
    for (const ma of ["RC-2026-VNC-8F3K2", "RC-2026-XXX-8F3K2M", "8F3K2M", "rc-2026-vnc-8f3k2m"]) {
      expect(referenciaValida(ma)).toBe(false);
    }
  });

  it("a serialização canónica não depende da ordem das chaves", () => {
    expect(canonico({ b: 2, a: 1 })).toBe(canonico({ a: 1, b: 2 }));
    expect(canonico({ a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4}}');
    expect(canonico([1, { b: 1, a: 2 }])).toBe('[1,{"a":2,"b":1}]');
  });

  it("a impressão digital é dos dados: os mesmos dados, o mesmo digest", async () => {
    const a = await digestDados({ liquido: 1850, dependentes: 1 });
    const b = await digestDados({ dependentes: 1, liquido: 1850 });
    const c = await digestDados({ liquido: 1850.01, dependentes: 1 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("o digest curto mantém as pontas, que é o que se compara a olho", () => {
    const digest = "a".repeat(60) + "b91c";
    expect(digestCurto(digest)).toBe(`${"a".repeat(12)}…b91c`);
  });

  it("a proveniência traz motor, ano fiscal e URL de verificação", async () => {
    const p = await criarProveniencia("vencimento", { liquido: 1850 });
    expect(p.referencia).toMatch(/^RC-\d{4}-VNC-/);
    expect(p.motor).toMatch(/^\d+\.\d+\.\d+$/);
    expect(p.anoFiscal).toBe(2026);
    expect(p.verificacao).toContain(`/v/${p.referencia}`);
    expect(() => new Date(p.emitidoEm).toISOString()).not.toThrow();
  });
});

// ── Nomes de ficheiro ────────────────────────────────────────────────────────

describe("nomes de ficheiro", () => {
  it("sem acentos, sem espaços, com a referência lá dentro", () => {
    const nome = nomeFicheiro({
      assunto: "Relatório de vencimento",
      periodo: "Julho de 2026",
      referencia: "RC-2026-VNC-8F3K2M",
      extensao: "pdf",
    });
    expect(nome).toBe("recibocerto-relatorio-de-vencimento-julho-de-2026-RC-2026-VNC-8F3K2M.pdf");
  });

  it("os quatro formatos partilham a referência", () => {
    const base = { assunto: "Relatório de vencimento", periodo: "Julho de 2026", referencia: "RC-2026-VNC-8F3K2M" };
    const nomes = [
      nomeFicheiro({ ...base, extensao: "pdf" }),
      nomeFicheiro({ ...base, extensao: "xlsx" }),
      nomeFicheiro({ ...base, extensao: "csv" }),
      nomeFicheiro({ ...base, variante: "dados", extensao: "csv" }),
    ];
    expect(nomes.every((nome) => nome.includes("RC-2026-VNC-8F3K2M"))).toBe(true);
    expect(new Set(nomes).size).toBe(4);
    expect(nomes[3]).toContain("-dados-");
  });

  it("ascii reduz sem deixar hífenes soltos", () => {
    expect(ascii("  Ação — Simulação  ")).toBe("acao-simulacao");
    expect(ascii("Já/Não")).toBe("ja-nao");
  });

  it("o Content-Disposition traz as duas formas do nome", () => {
    const cabecalho = contentDisposition("recibocerto-relatorio-RC-2026-VNC-8F3K2M.pdf");
    expect(cabecalho).toContain('filename="recibocerto-relatorio-RC-2026-VNC-8F3K2M.pdf"');
    expect(cabecalho).toContain("filename*=UTF-8''");
  });
});

describe("repartição de cêntimos", () => {
  it("faz a soma das parcelas dar exatamente o total", () => {
    // O caso real que a motivou: oito escalões de IRS que, arredondados um a
    // um, davam 17 622,53 € contra os 17 622,52 € da coleta.
    const exatos = [1042.75, 666.465, 1113.212, 1265.4855, 1961.788, 4778.857, 1498.156, 5295.797];
    const total = exatos.reduce((s, v) => s + v, 0);
    const partes = repartirCentimos(exatos, total);
    expect(arredondar(partes.reduce((s, v) => s + v, 0))).toBe(cent(total));
  });

  it("nunca afasta uma parcela mais de um cêntimo do valor exato", () => {
    const exatos = [10.004, 10.004, 10.004, 10.004, 10.004];
    for (const [i, parte] of repartirCentimos(exatos, 50.02).entries()) {
      expect(Math.abs(parte - exatos[i])).toBeLessThan(0.01);
    }
  });

  it("aguenta valores negativos e listas de um só elemento", () => {
    expect(repartirCentimos([-3.333, -3.333, -3.334], -10)).toHaveLength(3);
    expect(arredondar(repartirCentimos([-3.333, -3.333, -3.334], -10).reduce((s, v) => s + v, 0))).toBe(-10);
    expect(repartirCentimos([7.5], 7.5)).toEqual([7.5]);
    expect(repartirCentimos([], 0)).toEqual([]);
  });

  it("não esconde um erro de cálculo: se o total não é a soma, não o inventa", () => {
    // Repartir uma diferença grande transformaria um defeito de motor num
    // documento bonito e errado. Aqui devolve o arredondamento simples.
    expect(repartirCentimos([1, 1], 500)).toEqual([1, 1]);
  });
});

describe("reagrupamento de milhares dentro de frases", () => {
  // O separador é um espaço INQUEBRÁVEL (U+00A0), não um espaço normal —
  // escrito aqui como escape para o teste não passar por acidente com o
  // caractere errado, que é indistinguível a olho.
  const NB = "\u00A0";

  it("agrupa o que o CLDR do pt-PT deixa sem separador", () => {
    expect(regruparMilhares(`46${NB}000,00 € − contribuições 5060,00 €`)).toBe(
      `46${NB}000,00 € − contribuições 5${NB}060,00 €`,
    );
    expect(regruparMilhares("8450,00 € × 15,0%")).toBe(`8${NB}450,00 € × 15,0%`);
    expect(regruparMilhares("1234567,89 €")).toBe(`1${NB}234${NB}567,89 €`);
  });

  it("não toca em percentagens nem em referências legais", () => {
    // As percentagens têm UMA casa decimal e os artigos não têm vírgula —
    // é isso que os mantém fora do alcance da expressão.
    expect(regruparMilhares("18 000,00 € × coef. 75,0%")).toBe("18 000,00 € × coef. 75,0%");
    expect(regruparMilhares("Art. 25.º n.º 2 CIRS")).toBe("Art. 25.º n.º 2 CIRS");
    expect(regruparMilhares("2800,00 € × 28,0%")).toBe(`2${NB}800,00 € × 28,0%`);
  });

  it("deixa quieto o que já está agrupado", () => {
    const ja = `mín(imposto pago 600,00 €; fração da coleta 1${NB}206,20 €)`;
    expect(regruparMilhares(ja)).toBe(ja);
  });
});
