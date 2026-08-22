// ═══════════════════════════════════════════════════════════════════════
//  CONECTOR RNAL — o que ele conta, e porque ainda não é publicado
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from "vitest";
import {
  buildRnalStatisticsUrl,
  fetchRnalStatistics,
  normalizeRnalStatistics,
  parseRnalStatistics,
  resolverPeriodo,
  RnalConnectorError,
  type RnalManifest,
} from "@/lib/negocio/market/connectors/rnal";
import { RNAL_STOCK_MANIFEST, RNAL_NOVOS_MANIFEST, MARKET_PILOTS } from "@/lib/negocio/market/pilots";
import { getMarketSource } from "@/lib/negocio/market/source-registry";
import { validateMarketObservation } from "@/lib/negocio/market/integridade";

const AGORA = "2026-08-22T09:00:00.000Z";

const AGREGADO = {
  features: [
    { attributes: { NUTSII: "Algarve", total: 44818 } },
    { attributes: { NUTSII: "Norte", total: 23267 } },
    { attributes: { NUTSII: "Grande Lisboa", total: 18121 } },
  ],
};

function responder(corpo: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(corpo), { status })) as unknown as typeof fetch;
}

async function ler(manifest: RnalManifest, corpo: unknown = AGREGADO) {
  const fetched = await fetchRnalStatistics(manifest, { fetchImpl: responder(corpo), now: () => AGORA });
  return { fetched, normalizado: normalizeRnalStatistics(fetched, manifest) };
}

describe("RNAL: a contagem é feita na fonte", () => {
  it("pede um agregado, nunca as linhas", async () => {
    const url = buildRnalStatisticsUrl(RNAL_STOCK_MANIFEST, resolverPeriodo(RNAL_STOCK_MANIFEST, AGORA));
    const parametros = new URL(url).searchParams;

    // O registo é NOMINATIVO: nome, morada e coordenadas de 111 mil
    // alojamentos. O conector nunca pode ter um caminho que os traga.
    expect(parametros.get("groupByFieldsForStatistics")).toBe("NUTSII");
    expect(parametros.get("outStatistics")).toContain('"statisticType":"count"');
    expect(parametros.get("returnGeometry")).toBe("false");
    expect(url).not.toContain("outFields");
    expect(url).not.toContain("resultRecordCount");
  });

  it("recorta a janela do último ano civil FECHADO, nunca o ano a meio", () => {
    const periodo = resolverPeriodo(RNAL_NOVOS_MANIFEST, AGORA);
    expect(periodo.label).toBe("2025");
    const where = new URL(
      buildRnalStatisticsUrl(RNAL_NOVOS_MANIFEST, periodo),
    ).searchParams.get("where");
    expect(where).toBe("DataRegisto >= DATE '2025-01-01' AND DataRegisto < DATE '2026-01-01'");
  });

  it("o instantâneo declara-se instantâneo, sem fingir período de referência", () => {
    const periodo = resolverPeriodo(RNAL_STOCK_MANIFEST, AGORA);
    expect(periodo).toEqual({ start: "2026-08-22", end: "2026-08-22", label: "2026-08-22" });
  });
});

describe("RNAL: normalização fail-closed", () => {
  it("traduz cada nome NUTS 2024 para o código que o resto do produto usa", async () => {
    const { normalizado } = await ler(RNAL_STOCK_MANIFEST);
    expect(normalizado.observations.map((o) => [o.geography.code, o.value])).toEqual([
      ["11", 23267],
      ["15", 44818],
      ["1A", 18121],
    ]);
    expect(normalizado.observations.every((o) => o.geography.classificationVersion === "NUTS 2024")).toBe(true);
    expect(normalizado.quarantined).toHaveLength(0);
  });

  it("põe em quarentena um nome que não conhece, em vez de o ignorar", async () => {
    // Se o Turismo de Portugal renomear uma região ou passar a incluir os
    // Açores, isso NÃO pode desaparecer numa contagem silenciosamente
    // diferente: tem de aparecer.
    const { normalizado } = await ler(RNAL_STOCK_MANIFEST, {
      features: [
        { attributes: { NUTSII: "Algarve", total: 44818 } },
        { attributes: { NUTSII: "Região Autónoma dos Açores", total: 900 } },
      ],
    });
    expect(normalizado.observations).toHaveLength(1);
    expect(normalizado.quarantined).toEqual([
      expect.objectContaining({ regiao: "Região Autónoma dos Açores", reason: "unmapped-geography" }),
    ]);
  });

  it("um erro do serviço não é lido como zero alojamentos", () => {
    // O ArcGIS devolve HTTP 200 com o erro no corpo. Sem a guarda, uma
    // falha do servidor virava a contagem mais baixa possível.
    expect(() =>
      parseRnalStatistics({ error: { message: "Unable to complete operation." } }, "NUTSII"),
    ).toThrow(RnalConnectorError);
  });

  it("recusa uma contagem que não seja um inteiro não negativo", () => {
    expect(() =>
      parseRnalStatistics({ features: [{ attributes: { NUTSII: "Norte", total: "23267" } }] }, "NUTSII"),
    ).toThrow(RnalConnectorError);
  });

  it("recusa uma resposta sem o campo de agregação — é mudança de esquema", () => {
    expect(() =>
      parseRnalStatistics({ features: [{ attributes: { REGIAO: "Norte", total: 1 } }] }, "NUTSII"),
    ).toThrow(/esquema da camada mudou/);
  });

  it("assina o conteúdo recebido e agarra a assinatura a cada observação", async () => {
    const { fetched, normalizado } = await ler(RNAL_STOCK_MANIFEST);
    expect(fetched.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(normalizado.observations.every((o) => o.checksum === fetched.checksum)).toBe(true);
  });

  it("uma janela datada sem campo de data é manifesto inválido, não um pedido a adivinhar", () => {
    const partido: RnalManifest = { ...RNAL_NOVOS_MANIFEST, dateField: undefined };
    expect(() => buildRnalStatisticsUrl(partido, resolverPeriodo(partido, AGORA))).toThrow(
      RnalConnectorError,
    );
  });
});

describe("RNAL: a licença é o que trava a publicação", () => {
  it("a fonte está por rever e diz o que falta", () => {
    const fonte = getMarketSource("turismo-portugal");
    expect(fonte?.license.status).toBe("review_required");
    expect(fonte?.license.reviewNote).toMatch(/2026-08-22/);
  });

  it("enquanto a licença não for aprovada, nenhuma observação é publicável", async () => {
    const { normalizado } = await ler(RNAL_STOCK_MANIFEST);
    for (const observacao of normalizado.observations) {
      const resultado = validateMarketObservation(observacao, { asOf: AGORA, expiringWithinDays: 45 });
      expect(resultado.publishable, observacao.id).toBe(false);
      expect(resultado.issues.some((problema) => problema.code === "license-review")).toBe(true);
    }
  });

  it("por isso nenhum piloto usa esta fonte — ligá-la só produzia avisos de quarentena", () => {
    // Este é o guarda da decisão, não uma proibição permanente: no dia em
    // que o Turismo de Portugal confirmar os termos, acrescenta-se a
    // licença de dataset (como as séries do INE já têm), este teste passa
    // a exigir isso mesmo, e as séries entram no piloto.
    const series = MARKET_PILOTS.flatMap((piloto) => piloto.series);
    const daFonte = series.filter((serie) => serie.sourceId === "turismo-portugal");
    const fonte = getMarketSource("turismo-portugal");

    if (fonte?.license.status === "approved") {
      expect(daFonte.length).toBeGreaterThan(0);
    } else {
      expect(daFonte).toHaveLength(0);
    }
  });

  it("os manifestos ficam prontos, para a ligação ser uma linha e não um projeto", () => {
    expect(RNAL_STOCK_MANIFEST.metricId).toBe("tourism.local_accommodation.registered");
    expect(RNAL_NOVOS_MANIFEST.metricId).toBe("tourism.local_accommodation.new_registrations");
    // Metricids diferentes: um stock e um fluxo nunca se somam.
    expect(RNAL_STOCK_MANIFEST.metricId).not.toBe(RNAL_NOVOS_MANIFEST.metricId);
    expect(RNAL_STOCK_MANIFEST.unit).not.toBe(RNAL_NOVOS_MANIFEST.unit);
  });
});
