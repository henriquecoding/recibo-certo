// ═══════════════════════════════════════════════════════════════════════
//  LEITURA EM BLOCO — os testes que impedem números errados com ar de certos
//  ---------------------------------------------------------------------
//  Cada caso aqui existe porque a versão anterior do código o errava, e
//  errava-o em silêncio: um ZIP truncado dá menos contratos, não dá erro;
//  um concelho homónimo põe o número na região errada; um contrato com
//  dois tipos declarados desaparece por causa da ordem dos rótulos.
// ═══════════════════════════════════════════════════════════════════════

import { Readable } from "node:stream";
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import {
  acumularContratos,
  ehConcurso,
  PROCEDIMENTOS_ABERTOS,
  TIPOS_DE_SERVICO,
} from "@/lib/negocio/market/bulk/contratos";
import {
  aliasesPendentes,
  construirMapaDeConcelhos,
  GRAFIAS_ALTERNATIVAS,
  normalizarNome,
  regiaoDoCodigoIne,
  resolverLocalExecucao,
} from "@/lib/negocio/market/bulk/geografia-concelhos";
import { JsonArrayError, percorrerArrayJson } from "@/lib/negocio/market/bulk/json-array";
import { abrirEntradaUnica, lerCabecalhoZip, ZipError } from "@/lib/negocio/market/bulk/zip";
import { fontesEmBloco, METRICAS_EM_BLOCO, ultimoAnoCompleto } from "@/lib/negocio/market/bulk/fontes";
import {
  calcularContentHash,
  lerSnapshotBulk,
  SNAPSHOT_BULK_VERSAO,
} from "@/lib/negocio/market/bulk/snapshot-local";
import { escolherRecurso, normalizarDataset } from "@/lib/negocio/market/connectors/dados-gov";
import type { MarketObservation } from "@/lib/negocio/market/tipos";

// ── ZIP ───────────────────────────────────────────────────────────────

/** Um ZIP de uma entrada, montado byte a byte para não fingir nada. */
function montarZip(
  nome: string,
  conteudo: Buffer,
  { metodo = 8, flags = 0 }: { metodo?: number; flags?: number } = {},
): Buffer {
  const dados = metodo === 8 ? deflateRawSync(conteudo) : conteudo;
  const nomeBytes = Buffer.from(nome, "utf8");
  const cabecalho = Buffer.alloc(30);
  cabecalho.writeUInt32LE(0x0403_4b50, 0);
  cabecalho.writeUInt16LE(20, 4);
  cabecalho.writeUInt16LE(flags, 6);
  cabecalho.writeUInt16LE(metodo, 8);
  cabecalho.writeUInt32LE(0, 14);
  cabecalho.writeUInt32LE(dados.length, 18);
  cabecalho.writeUInt32LE(conteudo.length, 22);
  cabecalho.writeUInt16LE(nomeBytes.length, 26);
  cabecalho.writeUInt16LE(0, 28);
  return Buffer.concat([cabecalho, nomeBytes, dados]);
}

async function lerTudo(fluxo: Readable): Promise<string> {
  const pedacos: Buffer[] = [];
  for await (const pedaco of fluxo) pedacos.push(Buffer.from(pedaco));
  return Buffer.concat(pedacos).toString("utf8");
}

describe("bulk:zip", () => {
  it("descomprime uma entrada deflate e reporta o nome do ficheiro", async () => {
    const texto = "Contratos com «aspas», chavetas { } e acentuação.";
    const zip = montarZip("Contratos2025.json", Buffer.from(texto, "utf8"));
    const { entrada, conteudo } = abrirEntradaUnica(Readable.from(zip));

    expect((await entrada).nome).toBe("Contratos2025.json");
    expect((await entrada).metodo).toBe(8);
    await expect(lerTudo(conteudo)).resolves.toBe(texto);
  });

  it("lê uma entrada guardada sem compressão sem a mandar ao inflate", async () => {
    // A primeira versão mandava estes bytes ao `createInflateRaw` e o
    // resultado era um erro de dados — ou, pior, lixo silencioso.
    const texto = "[{\"Ano\":2025}]";
    const zip = montarZip("dados.json", Buffer.from(texto, "utf8"), { metodo: 0 });
    const { conteudo } = abrirEntradaUnica(Readable.from(zip));
    await expect(lerTudo(conteudo)).resolves.toBe(texto);
  });

  it("aceita o cabeçalho partido por vários pedaços", async () => {
    const zip = montarZip("d.json", Buffer.from("[]", "utf8"));
    const aosBocados = Readable.from(
      (function* () {
        for (let i = 0; i < zip.length; i += 7) yield zip.subarray(i, i + 7);
      })(),
    );
    const { entrada, conteudo } = abrirEntradaUnica(aosBocados);
    expect((await entrada).nome).toBe("d.json");
    await expect(lerTudo(conteudo)).resolves.toBe("[]");
  });

  it("recusa tamanhos diferidos, cifra e métodos que não sabe ler", () => {
    const comDescritor = montarZip("d.json", Buffer.from("x"), { flags: 0b1000 });
    expect(() => lerCabecalhoZip(comDescritor)).toThrow(ZipError);
    expect(() => lerCabecalhoZip(comDescritor)).toThrow(/diferidos/);

    const cifrado = montarZip("d.json", Buffer.from("x"), { flags: 0b1 });
    expect(() => lerCabecalhoZip(cifrado)).toThrow(/cifrado/);

    const bzip = montarZip("d.json", Buffer.from("x"), { metodo: 12 });
    expect(() => lerCabecalhoZip(bzip)).toThrow(/12/);
  });

  it("não confunde falta de bytes com ficheiro inválido", () => {
    const zip = montarZip("d.json", Buffer.from("x"));
    expect(lerCabecalhoZip(zip.subarray(0, 20))).toBeNull();
    expect(() => lerCabecalhoZip(Buffer.from("nada disto"))).toThrow(/cabeçalho local/);
  });

  it("falha quando o ZIP acaba antes do cabeçalho estar completo", async () => {
    const zip = montarZip("ficheiro-de-nome-comprido.json", Buffer.from("x"));
    const { entrada, conteudo } = abrirEntradaUnica(Readable.from(zip.subarray(0, 32)));
    await expect(entrada).rejects.toThrow(/terminou antes/);
    // Quem já sabe que o ficheiro não serve não vai ler o conteúdo. Isso
    // não pode derrubar o processo com um `error` sem ouvinte.
    await expect(lerTudo(conteudo)).rejects.toThrow(/terminou antes/);
  });
});

// ── JSON ──────────────────────────────────────────────────────────────

describe("bulk:json-array", () => {
  const registos = [
    { id: 1, nome: 'Empresa "Alfa" & Filhos, Lda.' },
    { id: 2, nota: "Artigo 95.º, n.º 1, a) — chaveta { aberta e barra \\ no meio" },
    { id: 3, aninhado: { a: [1, 2, { b: "}" }] } },
  ];
  const texto = JSON.stringify(registos);

  it("devolve cada objeto seja qual for a fronteira dos pedaços", async () => {
    // O risco real não é o conteúdo — é o corte. Um objeto partido entre
    // dois pedaços era exatamente o que a primeira versão perdia, e
    // perdia-o sem erro nenhum.
    for (let tamanho = 1; tamanho <= texto.length; tamanho += 1) {
      const lidos: unknown[] = [];
      await percorrerArrayJson(
        Readable.from(
          (function* () {
            for (let i = 0; i < texto.length; i += tamanho) {
              yield Buffer.from(texto.slice(i, i + tamanho), "utf8");
            }
          })(),
        ),
        (objeto) => {
          lidos.push(objeto);
        },
      );
      expect(lidos, `pedaços de ${tamanho} bytes`).toEqual(registos);
    }
  });

  it("conta os objetos e permite parar a meio sem ler o resto", async () => {
    const lidos: number[] = [];
    const total = await percorrerArrayJson<{ id: number }>(
      Readable.from([Buffer.from(texto, "utf8")]),
      (objeto) => {
        lidos.push(objeto.id);
        return objeto.id < 2;
      },
    );
    expect(lidos).toEqual([1, 2]);
    expect(total).toBe(2);
  });

  it("recusa conteúdo que não seja um array de topo", async () => {
    await expect(
      percorrerArrayJson(Readable.from([Buffer.from('{"a":1}')]), () => {}),
    ).rejects.toMatchObject({ code: "not-an-array" });
  });

  it("recusa um array que acaba a meio de um objeto", async () => {
    await expect(
      percorrerArrayJson(Readable.from([Buffer.from('[{"a":1},{"b":')]), () => {}),
    ).rejects.toBeInstanceOf(JsonArrayError);
  });

  it("aceita espaço em branco antes do array e um array vazio", async () => {
    const total = await percorrerArrayJson(Readable.from([Buffer.from("\n  []")]), () => {});
    expect(total).toBe(0);
  });
});

// ── GEOGRAFIA ─────────────────────────────────────────────────────────

/**
 * Linhas copiadas da resposta real do indicador `0012909` do INE.
 *
 * Os códigos não são inventados: `1500806` é a Lagoa do Algarve e
 * `2004201` a dos Açores, e é essa diferença que o teste protege.
 */
const LINHAS_INE = [
  { geocod: "PT", geodsg: "Portugal" },
  { geocod: "11", geodsg: "Norte" },
  { geocod: "11D0404", geodsg: "Freixo de Espada à Cinta" },
  { geocod: "11D1711", geodsg: "Santa Marta de Penaguião" },
  { geocod: "11D1714", geodsg: "Vila Real" },
  { geocod: "1500806", geodsg: "Lagoa" },
  { geocod: "1500816", geodsg: "Vila Real de Santo António" },
  { geocod: "1960904", geodsg: "Figueira de Castelo Rodrigo" },
  { geocod: "1B01503", geodsg: "Almada" },
  { geocod: "1C11513", geodsg: "Sines" },
  { geocod: "1D01002", geodsg: "Alcobaça" },
  { geocod: "2004201", geodsg: "Lagoa (R.A.A.)" },
  { geocod: "2004302", geodsg: "Vila da Praia da Vitória" },
  { geocod: "2004501", geodsg: "Calheta (R.A.A.)" },
  { geocod: "3003101", geodsg: "Calheta (R.A.M.)" },
];

const MAPA = construirMapaDeConcelhos(LINHAS_INE);
const resolver = (local: string) => resolverLocalExecucao(local, MAPA);

describe("bulk:geografia-concelhos", () => {
  it("deriva a NUTS II do prefixo do código, sem mapa escrito à mão", () => {
    expect(regiaoDoCodigoIne("1B01503")).toBe("peninsula-setubal");
    expect(regiaoDoCodigoIne("1C11513")).toBe("alentejo");
    expect(regiaoDoCodigoIne("1D01002")).toBe("oeste-vale-tejo");
    expect(regiaoDoCodigoIne("11D1714")).toBe("norte");
    expect(regiaoDoCodigoIne("1960904")).toBe("centro");
    expect(regiaoDoCodigoIne("XX00000")).toBeNull();
  });

  it("ignora país, NUTS I, II e III ao construir o mapa de concelhos", () => {
    expect(MAPA.total).toBe(13);
    expect(MAPA.porNome.has("portugal")).toBe(false);
    expect(MAPA.porNome.has("norte")).toBe(false);
  });

  it("não manda a Lagoa dos Açores para o Algarve", () => {
    // O INE escreve a do Algarve sem qualificador. Um mapa de um-para-um
    // fazia «Portugal, Região Autónoma dos Açores, Lagoa» resolver para
    // Algarve — 422 contratos de 2025 na região errada, sem aviso nenhum.
    expect(resolver("Portugal, Faro, Lagoa")).toMatchObject({
      estado: "resolvido",
      regiao: "algarve",
    });
    expect(resolver("Portugal, Região Autónoma dos Açores, Lagoa")).toMatchObject({
      estado: "resolvido",
      regiao: "acores",
      concelho: "Lagoa (R.A.A.)",
    });
  });

  it("desempata homónimos das regiões autónomas pela região declarada", () => {
    expect(resolver("Portugal, Região Autónoma da Madeira, Calheta")).toMatchObject({
      estado: "resolvido",
      regiao: "madeira",
    });
    expect(resolver("Portugal, Região Autónoma dos Açores, Calheta")).toMatchObject({
      estado: "resolvido",
      regiao: "acores",
    });
  });

  it("deixa por resolver o homónimo que a fonte não desambigua", () => {
    // Ambas as Calhetas são de região autónoma: sem a região declarada não
    // há nada de onde escolher, e escolher à sorte era pôr o número numa
    // ilha ao calhas.
    expect(resolver("Portugal, Distrito qualquer, Calheta")).toMatchObject({
      estado: "concelho-ambiguo",
      nome: "Calheta",
    });
  });

  it("aceita a grafia do INE tal e qual", () => {
    expect(resolver("Portugal, Açores, Calheta (R.A.A.)")).toMatchObject({
      estado: "resolvido",
      regiao: "acores",
    });
  });

  it("resolve as abreviaturas do Portal BASE pelo nome oficial do INE", () => {
    const casos: readonly [string, string][] = [
      ["Portugal, Faro, Vila Real Sto Antonio", "algarve"],
      ["Portugal, Região Autónoma dos Açores, Praia da Vitória", "acores"],
      ["Portugal, Braganca, Freixo Espada a Cinta", "norte"],
      ["Portugal, Vila Real, Sta Marta de Penaguião", "norte"],
      ["Portugal, Guarda, Fig. Castelo Rodrigo", "centro"],
    ];
    for (const [local, regiao] of casos) {
      expect(resolver(local), local).toMatchObject({ estado: "resolvido", regiao });
    }
  });

  it("não deixa uma abreviatura apontar para um concelho que já não existe", () => {
    expect(aliasesPendentes(MAPA)).toEqual([]);
    const semAlgarve = construirMapaDeConcelhos(
      LINHAS_INE.filter((linha) => linha.geocod !== "1500816"),
    );
    expect(aliasesPendentes(semAlgarve)).toEqual([
      "vila real sto antonio → Vila Real de Santo António",
    ]);
  });

  it("distingue não ter concelho de ter um que não se reconhece", () => {
    expect(resolver("Portugal")).toMatchObject({ estado: "sem-concelho" });
    expect(resolver("Portugal, Lisboa")).toMatchObject({ estado: "sem-concelho" });
    expect(resolver("Portugal, Distrito não determinado, Concelho não determinado")).toMatchObject({
      estado: "concelho-desconhecido",
    });
  });

  it("normaliza acentos, maiúsculas e espaços a mais", () => {
    expect(normalizarNome("  Vila Real   de  Santo António ")).toBe("vila real de santo antonio");
  });

  it("aponta cada grafia alternativa para um nome oficial e não para outra grafia", () => {
    for (const [grafia, oficial] of Object.entries(GRAFIAS_ALTERNATIVAS)) {
      expect(normalizarNome(grafia), grafia).toBe(grafia);
      expect(GRAFIAS_ALTERNATIVAS[normalizarNome(oficial)], oficial).toBeUndefined();
    }
  });
});

// ── AGREGAÇÃO ─────────────────────────────────────────────────────────

const contrato = (extra: Record<string, unknown> = {}) => ({
  Ano: 2025,
  tipoContrato: ["Aquisição de serviços"],
  tipoprocedimento: "Concurso público",
  localExecucao: ["Portugal, Setúbal, Almada"],
  ...extra,
});

describe("bulk:contratos", () => {
  it("conta um contrato cujo tipo relevante não vem em primeiro lugar", () => {
    // `tipoContrato` é sempre um array e 1 838 contratos de 2025 declaram
    // mais do que um tipo. Olhar só para o primeiro deitava fora o
    // contrato por causa da ordem por que a fonte escreveu os rótulos.
    const acumulador = acumularContratos(2025, MAPA);
    acumulador.aceitar(
      contrato({ tipoContrato: ["Empreitadas de obras públicas", "Aquisição de serviços"] }),
    );
    acumulador.aceitar(contrato({ tipoContrato: ["Empreitadas de obras públicas"] }));
    const resumo = acumulador.concluir();

    expect(resumo.nacional.contratos).toBe(1);
    expect(resumo.descartes.tipoNaoRelevante).toBe(1);
  });

  it("só conta como aberto o que está na lista de permissão", () => {
    expect(ehConcurso("Concurso público")).toBe(true);
    expect(ehConcurso("Concurso limitado por prévia qualificação")).toBe(true);
    expect(ehConcurso("Concurso público simplificado")).toBe(true);
    expect(ehConcurso("Diálogo concorrencial")).toBe(true);

    // Estes quatro somavam 46 mil contratos de 2025 que a versão anterior
    // contava como «abertos à concorrência» — 86 019 em vez de 33 825.
    expect(ehConcurso("Ajuste Direto Regime Geral")).toBe(false);
    expect(ehConcurso("Consulta Prévia")).toBe(false);
    expect(ehConcurso("Ao abrigo de acordo-quadro (art.º 259.º)")).toBe(false);
    expect(ehConcurso("Contratação excluída II")).toBe(false);

    // Um tipo de procedimento novo fica de fora até alguém o olhar.
    expect(ehConcurso("Procedimento inventado em 2030")).toBe(false);
    expect(ehConcurso("")).toBe(false);
  });

  it("conta um contrato uma vez por zona distinta, nunca duas na mesma", () => {
    const acumulador = acumularContratos(2025, MAPA);
    acumulador.aceitar(
      contrato({
        localExecucao: [
          "Portugal, Setúbal, Almada",
          "Portugal, Setúbal, Sines",
          "Portugal, Setúbal, Almada",
        ],
      }),
    );
    const resumo = acumulador.concluir();

    expect(resumo.nacional.contratos).toBe(1);
    expect(resumo.porRegiao.get("peninsula-setubal")?.contratos).toBe(1);
    expect(resumo.porRegiao.get("alentejo")?.contratos).toBe(1);
    expect(resumo.localizados).toBe(1);
  });

  it("conta no país o contrato sem concelho legível e em zona nenhuma", () => {
    const acumulador = acumularContratos(2025, MAPA);
    acumulador.aceitar(contrato({ localExecucao: [] }));
    acumulador.aceitar(contrato({ localExecucao: ["Portugal, Braga, Concelho inexistente"] }));
    const resumo = acumulador.concluir();

    expect(resumo.nacional.contratos).toBe(2);
    expect(resumo.localizados).toBe(0);
    expect(resumo.porRegiao.size).toBe(0);
    expect(resumo.descartes.semConcelho).toBe(1);
    expect(resumo.descartes.concelhoDesconhecido).toBe(1);
    expect(resumo.naoResolvidos.get("Concelho inexistente")).toBe(1);
  });

  it("descarta os registos de outro ano sem os deixar entrar em contagem nenhuma", () => {
    const acumulador = acumularContratos(2025, MAPA);
    acumulador.aceitar(contrato({ Ano: 2024 }));
    const resumo = acumulador.concluir();

    expect(resumo.totalLido).toBe(1);
    expect(resumo.nacional.contratos).toBe(0);
    expect(resumo.descartes.anoDiferente).toBe(1);
  });

  it("guarda todos os tipos de procedimento vistos, abertos ou não", () => {
    const acumulador = acumularContratos(2025, MAPA);
    acumulador.aceitar(contrato({ tipoprocedimento: "Ajuste Direto Regime Geral" }));
    acumulador.aceitar(contrato());
    const resumo = acumulador.concluir();

    expect(resumo.nacional.contratos).toBe(2);
    expect(resumo.nacional.concursos).toBe(1);
    expect([...resumo.procedimentos.keys()].sort()).toEqual([
      "Ajuste Direto Regime Geral",
      "Concurso público",
    ]);
  });

  it("não expõe nenhuma contagem de valor contratual nem de adjudicatário", () => {
    // O relatório mestre proíbe tratar o valor anunciado como receita
    // provável. A garantia é estrutural: o resumo não tem onde o pôr.
    const resumo = acumularContratos(2025, MAPA).concluir();
    const chaves = JSON.stringify(resumo.nacional);
    expect(chaves).not.toMatch(/preco|valor|adjudicatario|nif/i);
    expect(Object.keys(resumo.nacional).sort()).toEqual(["concursos", "contratos"]);
  });

  it("mantém os tipos de serviço fora das empreitadas e das concessões", () => {
    expect(TIPOS_DE_SERVICO).not.toContain("Empreitadas de obras públicas");
    expect(PROCEDIMENTOS_ABERTOS.every((termo) => termo === termo.toLowerCase())).toBe(true);
  });
});

// ── DECLARAÇÃO DAS FONTES ─────────────────────────────────────────────

describe("bulk:fontes", () => {
  it("pede sempre o último ano civil completo", () => {
    expect(ultimoAnoCompleto(new Date("2026-08-21T00:00:00Z"))).toBe(2025);
    expect(ultimoAnoCompleto(new Date("2027-01-01T00:00:00Z"))).toBe(2026);
    expect(ultimoAnoCompleto(new Date("2026-12-31T23:59:59Z"))).toBe(2025);
  });

  it("roda o ficheiro a descarregar com o calendário, sem editar código", () => {
    const [fonte] = fontesEmBloco(new Date("2027-03-04T00:00:00Z"));
    expect(fonte.ano).toBe(2026);
    expect(fonte.recurso.ficheiro).toBe("contratos2026.zip");
    // O id não leva o ano: é o mesmo ficheiro no repositório todos os
    // anos, e o histórico do git é que mostra a viragem.
    expect(fonte.id).toBe("contratos-publicos");
  });

  it("declara as métricas que emite, para um id errado não passar despercebido", () => {
    const [fonte] = fontesEmBloco();
    expect([...fonte.metricas].sort()).toEqual(
      [METRICAS_EM_BLOCO.contratosDeServicos, METRICAS_EM_BLOCO.procedimentosAbertos].sort(),
    );
  });
});

// ── INSTANTÂNEO ───────────────────────────────────────────────────────

const observacao = (extra: Partial<MarketObservation> = {}): MarketObservation => ({
  id: "dados-gov:procurement.contracts.services:2025:PT",
  sourceId: "dados-gov",
  metricId: "procurement.contracts.services",
  value: 230709,
  unit: "contratos",
  geography: { country: "PT", level: "country", code: "PT", name: "Portugal" },
  classifications: {},
  referencePeriod: { start: "2025-01-01", end: "2025-12-31", label: "2025" },
  retrievedAt: "2026-08-21T02:00:00.000Z",
  validUntil: "2027-12-31",
  license: {
    status: "approved",
    scope: "dataset",
    url: "https://dados.gov.pt/pt/datasets/x/",
  },
  quality: { status: "observed", completeness: 1, semanticMapping: "approved", flags: [] },
  checksum: `sha256:${"a".repeat(64)}`,
  ...extra,
});

describe("bulk:snapshot-local", () => {
  it("ignora o instante da recolha ao assinar as observações", async () => {
    // Se `retrievedAt` entrasse no hash, o job commitava todas as semanas
    // para dizer que os números continuam iguais.
    const antes = await calcularContentHash([observacao()]);
    const depois = await calcularContentHash([
      observacao({ retrievedAt: "2026-12-01T00:00:00.000Z" }),
    ]);
    expect(depois).toBe(antes);
  });

  it("não depende da ordem por que as observações chegam", async () => {
    const a = observacao();
    const b = observacao({ id: "dados-gov:procurement.open_procedures:2025:PT", value: 33825 });
    expect(await calcularContentHash([a, b])).toBe(await calcularContentHash([b, a]));
  });

  it("muda quando um número muda", async () => {
    const antes = await calcularContentHash([observacao()]);
    const depois = await calcularContentHash([observacao({ value: 230710 })]);
    expect(depois).not.toBe(antes);
  });

  it("devolve null a qualquer sinal de estranheza, em vez de meio ler", () => {
    const valido = {
      schemaVersion: SNAPSHOT_BULK_VERSAO,
      id: "contratos-publicos",
      geradoEm: "2026-08-21T02:00:00.000Z",
      transformVersion: "base-contratos-por-nuts2@1",
      proveniencia: { dataset: "x", paginaUrl: "https://dados.gov.pt/", recurso: {} },
      observations: [observacao()],
      contentHash: `sha256:${"b".repeat(64)}`,
    };
    expect(lerSnapshotBulk(valido)).not.toBeNull();
    expect(lerSnapshotBulk({ ...valido, schemaVersion: 99 })).toBeNull();
    expect(lerSnapshotBulk({ ...valido, contentHash: "md5:abc" })).toBeNull();
    expect(lerSnapshotBulk({ ...valido, observations: [] })).toBeNull();
    expect(lerSnapshotBulk({ ...valido, proveniencia: undefined })).toBeNull();
    expect(lerSnapshotBulk(null)).toBeNull();
  });
});

// ── CATÁLOGO DADOS.GOV ────────────────────────────────────────────────

describe("bulk:dados-gov", () => {
  const bruto = {
    title: "Contratos públicos",
    license: "other-pd",
    last_update: "2026-08-16T09:11:35.437000+00:00",
    organization: { name: "IMPIC, I.P." },
    resources: [
      {
        id: "a",
        title: "Exportar para JSON",
        format: "ZIP",
        url: "https://dados.gov.pt/s/resources/x/20250101-000000-aaaa/contratos2025.zip",
        last_modified: "2025-01-01T00:00:00",
        filesize: 10,
      },
      {
        id: "b",
        title: "Exportar para JSON",
        format: "ZIP",
        url: "https://dados.gov.pt/s/resources/x/20260816-091135-bbbb/contratos2025.zip",
        last_modified: "2026-08-16T09:11:35",
        filesize: 54461325,
      },
      { id: "c", title: "2026", format: "zip", url: "https://exemplo.pt/contratos2026.zip" },
      { title: "sem id", url: "https://exemplo.pt/x.zip" },
    ],
  };
  const dataset = normalizarDataset(bruto, "contratos-publicos-portal-base-impic");

  it("normaliza licença, publicador e recursos, descartando os inúteis", () => {
    expect(dataset.licenca).toBe("other-pd");
    expect(dataset.publicador).toBe("IMPIC, I.P.");
    expect(dataset.paginaUrl).toMatch(/^https:\/\/dados\.gov\.pt\/pt\/datasets\//);
    // O recurso sem id não é utilizável e não entra.
    expect(dataset.recursos.map((recurso) => recurso.id)).toEqual(["a", "b", "c"]);
  });

  it("escolhe pelo nome do ficheiro, não pelo título, e fica com o mais recente", () => {
    // Os dois primeiros recursos têm títulos iguais e conteúdos de anos
    // diferentes: casar pelo título dava o ficheiro errado, em silêncio.
    const escolhido = escolherRecurso(dataset, { ficheiro: "contratos2025.zip", formato: "zip" });
    expect(escolhido.id).toBe("b");
    expect(escolhido.bytes).toBe(54461325);
  });

  it("falha a dizer o que falta quando o ano pedido não está publicado", () => {
    expect(() => escolherRecurso(dataset, { ficheiro: "contratos2099.zip", formato: "zip" })).toThrow(
      /contratos2099\.zip/,
    );
  });
});
