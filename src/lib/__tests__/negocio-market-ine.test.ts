import { describe, expect, it, vi } from "vitest";
import {
  buildIneIndicatorUrl,
  fetchIneIndicator,
  IneConnectorError,
  normalizeIneAnnualIndicator,
  parseIneIndicatorPayload,
  type IneAnnualIndicatorManifest,
} from "@/lib/negocio/market";

const fixture = [
  {
    IndicadorCod: "0000540",
    IndicadorDsg:
      "Efetivo caprino (N.º) por Localização geográfica (NUTS - 2013) e Categoria; Anual - INE",
    MetaInfUrl: "https://www.ine.pt/bddXplorer/htdocs/minfo.jsp?var_cd=0000540&lingua=PT",
    DataExtracao: "2026-08-20T04:38:50.190+01:00",
    DataUltimoAtualizacao: "2026-05-16",
    UltimoPref: "2025",
    Dados: {
      "2025": [
        { geocod: "17", geodsg: "Área Metropolitana de Lisboa", dim_3: "T", dim_3_t: "Total", valor: "10" },
        { geocod: "PT", geodsg: "Portugal", dim_3: "T", dim_3_t: "Total", valor: "295" },
        {
          geocod: "30",
          geodsg: "Região Autónoma da Madeira",
          dim_3: "2",
          dim_3_t: "Outros caprinos",
          sinal_conv: "o",
          sinal_conv_desc: "Dado inferior a metade do módulo da unidade utilizada",
          ind_string: "o",
        },
      ],
    },
    Sucesso: { Verdadeiro: [{ Msg: "OK" }] },
  },
];

const manifest: IneAnnualIndicatorManifest = {
  indicatorCode: "0000540",
  metricId: "livestock.goats.total",
  unit: "animals",
  maxReferenceAgeDays: 730,
  geographyByCode: {
    "17": { level: "nuts2", classificationVersion: "NUTS 2013", expectedName: "Área Metropolitana de Lisboa" },
    PT: { level: "country", expectedName: "Portugal" },
  },
  dimensionFilters: { dim_3: ["T"] },
  decimalSeparator: ".",
  observationStatus: "observed",
  semanticMapping: "approved",
};

const fetched = {
  payload: parseIneIndicatorPayload(fixture, "0000540"),
  sourceUrl: buildIneIndicatorUrl("0000540"),
  retrievedAt: "2026-08-20T10:00:00Z",
  checksum: `sha256:${"b".repeat(64)}`,
};

describe("market: conector INE", () => {
  it("constrói apenas URLs do endpoint oficial e rejeita injeção", () => {
    const url = new URL(buildIneIndicatorUrl("0000540", "PT"));
    expect(url.origin).toBe("https://www.ine.pt");
    expect(url.pathname).toBe("/ine/json_indicador/pindica.jsp");
    expect(Object.fromEntries(url.searchParams)).toEqual({ op: "2", varcd: "0000540", lang: "PT" });
    expect(() => buildIneIndicatorUrl("0000540&lang=EN")).toThrow(IneConnectorError);
  });

  it("valida o envelope documentado em vez de fazer cast cego", () => {
    expect(parseIneIndicatorPayload(fixture, "0000540").UltimoPref).toBe("2025");
    expect(() => parseIneIndicatorPayload(fixture, "9999999")).toThrowError(/contrato esperado/);
    expect(() => parseIneIndicatorPayload({ Dados: {} }, "0000540")).toThrow(IneConnectorError);
  });

  it("faz transporte real injetável e calcula SHA-256 da resposta", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(fixture), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const result = await fetchIneIndicator("0000540", {
      fetchImpl: fetchImpl as typeof fetch,
      now: () => "2026-08-20T10:00:00Z",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.payload.IndicadorCod).toBe("0000540");
    expect(result.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("normaliza somente unidade, dimensão e geografias declaradas no manifesto", () => {
    const result = normalizeIneAnnualIndicator(fetched, manifest);
    expect(result.quarantined).toEqual([]);
    expect(result.observations).toHaveLength(2);
    expect(result.observations[0]).toMatchObject({
      id: "ine:livestock.goats.total:2025:17",
      sourceId: "ine",
      metricId: "livestock.goats.total",
      value: 10,
      unit: "animals",
      validUntil: "2027-12-31",
      geography: { code: "17", level: "nuts2" },
    });
    expect(result.observations[1].value).toBe(295);
  });

  it("preserva uma licença específica do dataset", () => {
    const result = normalizeIneAnnualIndicator(fetched, {
      ...manifest,
      datasetLicense: {
        status: "approved",
        scope: "dataset",
        identifier: "CC BY 4.0",
        url: "https://creativecommons.org/licenses/by/4.0/",
        attribution: "Fonte: INE, I.P. via dados.gov.pt",
      },
    });
    expect(result.observations[0]?.license).toMatchObject({
      status: "approved",
      scope: "dataset",
      identifier: "CC BY 4.0",
    });
  });

  it("uma geografia que o manifesto não pede fica fora do âmbito, não em quarentena", () => {
    // Vários indicadores publicam as 347 unidades territoriais até ao
    // concelho. Contá-las como quarentena fazia a interface anunciar
    // centenas de «linhas não atravessaram a quarentena» — alarmante, e
    // falso: nenhuma foi rejeitada, nenhuma foi sequer pedida.
    const comConcelhos = structuredClone(fetched);
    comConcelhos.payload.Dados = {
      "2025": [
        { geocod: "PT", geodsg: "Portugal", dim_3: "T", valor: "295" },
        { geocod: "1111601", geodsg: "Arcos de Valdevez", dim_3: "T", valor: "3" },
        { geocod: "1111602", geodsg: "Caminha", dim_3: "T", valor: "4" },
      ],
    };
    const result = normalizeIneAnnualIndicator(comConcelhos, manifest);
    expect(result.observations).toHaveLength(1);
    expect(result.quarantined).toEqual([]);
    expect(result.outOfScope).toBe(2);
  });

  it("uma linha sem geografia identificável continua a ser quarentena", () => {
    const semGeo = structuredClone(fetched);
    semGeo.payload.Dados = { "2025": [{ dim_3: "T", valor: "295" }] };
    const result = normalizeIneAnnualIndicator(semGeo, manifest);
    expect(result.observations).toEqual([]);
    expect(result.outOfScope).toBe(0);
    expect(result.quarantined.map((row) => row.reason)).toEqual(["unmapped-geography"]);
  });

  it("põe mudança semântica e números ambíguos em quarentena", () => {
    const changed = structuredClone(fetched);
    changed.payload.Dados = {
      "2025": [
        { geocod: "17", geodsg: "Lisboa alterada", dim_3: "T", valor: "10" },
        { geocod: "PT", geodsg: "Portugal", dim_3: "T", valor: "1.234,5" },
      ],
    };
    const result = normalizeIneAnnualIndicator(changed, manifest);
    expect(result.observations).toEqual([]);
    expect(result.quarantined.map((row) => row.reason)).toEqual([
      "geography-name-changed",
      "ambiguous-number",
    ]);
  });

  it("remove também a primeira linha quando o manifesto deixa passar um duplicado", () => {
    const duplicated = structuredClone(fetched);
    duplicated.payload.Dados = {
      "2025": [
        { geocod: "PT", geodsg: "Portugal", dim_3: "T", valor: "295" },
        { geocod: "PT", geodsg: "Portugal", dim_3: "T", valor: "296" },
      ],
    };
    const result = normalizeIneAnnualIndicator(duplicated, manifest);
    expect(result.observations).toEqual([]);
    expect(result.quarantined.map((row) => row.reason)).toContain("duplicate-observation");
  });

  it("quarentena sinais convencionais quando a dimensão selecionada os inclui", () => {
    const conventional = normalizeIneAnnualIndicator(fetched, {
      ...manifest,
      geographyByCode: {
        "30": { level: "nuts2", expectedName: "Região Autónoma da Madeira" },
      },
      dimensionFilters: { dim_3: ["2"] },
    });
    expect(conventional.observations).toEqual([]);
    expect(conventional.quarantined[0]?.reason).toBe("conventional-sign");
  });

  it("falha fechado em HTTP e JSON inválido", async () => {
    await expect(
      fetchIneIndicator("0000540", {
        fetchImpl: (async () => new Response("erro", { status: 503 })) as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "http-error" });
    await expect(
      fetchIneIndicator("0000540", {
        fetchImpl: (async () => new Response("<html>não é json</html>")) as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "invalid-json" });
  });
});
