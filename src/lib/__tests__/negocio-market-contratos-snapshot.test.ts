// ═══════════════════════════════════════════════════════════════════════
//  O INSTANTÂNEO COMMITADO — o que tem de continuar verdadeiro
//  ---------------------------------------------------------------------
//  Este ficheiro é gerado por `npm run mercado:ingerir` e depois vive no
//  repositório, onde qualquer pessoa lhe pode mexer. Estes testes existem
//  para que uma edição à mão — ou uma ingestão que correu mal — não passe
//  a um número publicado.
//
//  A verificação forte é o `contentHash`: recalculado aqui a partir das
//  próprias observações. Mudar um valor sem correr o job faz este teste
//  falhar, que é exatamente o que se quer.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";

import { fontesEmBloco, METRICAS_EM_BLOCO } from "@/lib/negocio/market/bulk/fontes";
import { calcularContentHash } from "@/lib/negocio/market/bulk/snapshot-local";
import { listarSnapshotsBulk, obterSnapshotBulk } from "@/lib/negocio/market/bulk/snapshots";
import { MARKET_REGIONS } from "@/lib/negocio/market/geografia";
import { validateMarketObservation } from "@/lib/negocio/market/integridade";
import { loadPilotMarketEvidence } from "@/lib/negocio/market/pilot-loader";
import { MARKET_PILOTS } from "@/lib/negocio/market/pilots";
import { getMarketSource } from "@/lib/negocio/market/source-registry";

const contratos = obterSnapshotBulk("contratos-publicos");

describe("mercado:instantâneo de contratos", () => {
  it("está commitado e atravessa a validação de forma", () => {
    expect(contratos, "corre `npm run mercado:ingerir`").toBeDefined();
    expect(listarSnapshotsBulk()).toHaveLength(1);
  });

  it("tem a assinatura que corresponde às observações que traz", async () => {
    // Editar um número à mão e commitar passa aqui a ser impossível sem
    // que se note: o hash deixa de bater.
    expect(await calcularContentHash(contratos!.observations)).toBe(contratos!.contentHash);
  });

  it("traz a proveniência inteira, com licença e checksum da origem", () => {
    const { proveniencia } = contratos!;
    expect(proveniencia.paginaUrl).toMatch(/^https:\/\/dados\.gov\.pt\//);
    expect(proveniencia.licenca).toBeTruthy();
    expect(proveniencia.publicador).toMatch(/IMPIC/i);
    expect(proveniencia.checksumOrigem).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(proveniencia.recurso.url).toMatch(/^https:\/\/.+\.zip$/);
    expect(proveniencia.registosLidos).toBeGreaterThan(100_000);
  });

  it("declara a mesma transformação que a fonte em vigor", () => {
    const [fonte] = fontesEmBloco();
    expect(contratos!.id).toBe(fonte.id);
    expect(contratos!.transformVersion).toBe(fonte.transformVersion);
  });

  it("publica as duas métricas para Portugal e para as nove NUTS II", () => {
    const nuts2 = MARKET_REGIONS.filter((regiao) => regiao.nutsCode !== null);
    for (const metricId of Object.values(METRICAS_EM_BLOCO)) {
      const daMetrica = contratos!.observations.filter((o) => o.metricId === metricId);
      const codigos = daMetrica.map((o) => o.geography.code).sort();
      expect(codigos, metricId).toEqual(
        ["PT", ...nuts2.map((regiao) => regiao.nutsCode as string)].sort(),
      );
    }
  });

  it("passa cada observação pelo mesmo gate de integridade das outras fontes", () => {
    for (const observacao of contratos!.observations) {
      const veredicto = validateMarketObservation(observacao, {
        asOf: contratos!.geradoEm,
        expiringWithinDays: 45,
      });
      expect(veredicto.publishable, `${observacao.id}: ${JSON.stringify(veredicto.issues)}`).toBe(
        true,
      );
    }
  });

  it("nunca publica um valor monetário, só contagens", () => {
    // O valor anunciado de um contrato não é receita provável. A garantia
    // não é uma convenção de nomes: é que nenhuma observação traz euros.
    for (const observacao of contratos!.observations) {
      expect(["contratos", "procedimentos"]).toContain(observacao.unit);
      expect(typeof observacao.value).toBe("number");
      expect(JSON.stringify(observacao)).not.toMatch(/€|EUR|preco|precoContratual/i);
    }
  });

  it("não deixa uma zona reclamar mais contratos do que o país inteiro", () => {
    for (const metricId of Object.values(METRICAS_EM_BLOCO)) {
      const daMetrica = contratos!.observations.filter((o) => o.metricId === metricId);
      const pais = daMetrica.find((o) => o.geography.level === "country")!.value as number;
      for (const observacao of daMetrica.filter((o) => o.geography.level === "nuts2")) {
        expect(observacao.value as number, `${metricId} ${observacao.geography.code}`)
          .toBeLessThanOrEqual(pais);
      }
    }
  });

  it("nunca conta mais procedimentos abertos do que contratos celebrados", () => {
    const porZona = new Map<string, Record<string, number>>();
    for (const observacao of contratos!.observations) {
      const zona = porZona.get(observacao.geography.code) ?? {};
      zona[observacao.metricId] = observacao.value as number;
      porZona.set(observacao.geography.code, zona);
    }
    for (const [codigo, valores] of porZona) {
      expect(valores[METRICAS_EM_BLOCO.procedimentosAbertos], codigo).toBeLessThanOrEqual(
        valores[METRICAS_EM_BLOCO.contratosDeServicos],
      );
    }
  });

  it("diz a verdade sobre a completude: o país é inteiro, as zonas não", () => {
    // 15% dos contratos não trazem concelho legível. Declarar completude 1
    // nas zonas seria afirmar uma cobertura que a fonte não dá.
    for (const observacao of contratos!.observations) {
      const { completeness, flags } = observacao.quality;
      if (observacao.geography.level === "country") {
        expect(completeness).toBe(1);
        expect(flags).toEqual([]);
      } else {
        expect(completeness).toBeGreaterThan(0.5);
        expect(completeness).toBeLessThan(1);
        expect(flags).toContain("cobertura-regional-parcial");
      }
    }
  });

  it("escreve na própria observação o que a contagem inclui e exclui", () => {
    const abertos = contratos!.observations.find(
      (o) => o.metricId === METRICAS_EM_BLOCO.procedimentosAbertos,
    )!;
    expect(abertos.transform?.description).toMatch(/ajuste direto/i);
    expect(abertos.transform?.description).toMatch(/acordo-quadro/i);
    expect(abertos.transform?.description).toMatch(/não se somam valores contratuais/i);
  });
});

describe("mercado:pilotos ligados ao instantâneo", () => {
  const emBloco = MARKET_PILOTS.flatMap((pilot) =>
    pilot.series.filter((serie) => serie.source.connector === "bulk"),
  );

  it("aponta cada série em bloco para uma métrica que existe mesmo", () => {
    expect(emBloco.length).toBeGreaterThan(0);
    for (const serie of emBloco) {
      const fonte = serie.source as { snapshotId: string; metricId: string };
      const guardado = obterSnapshotBulk(fonte.snapshotId);
      expect(guardado, `${serie.id} → ${fonte.snapshotId}`).toBeDefined();
      expect(
        guardado!.observations.some((o) => o.metricId === fonte.metricId),
        `${serie.id} → ${fonte.metricId}`,
      ).toBe(true);
    }
  });

  it("usa uma fonte declarada no registo, com licença aprovada", () => {
    for (const serie of emBloco) {
      const fonte = getMarketSource(serie.sourceId);
      expect(fonte, serie.sourceId).toBeDefined();
      expect(fonte!.license.status).toBe("approved");
      expect(fonte!.connectorStatus).toBe("ready");
      expect(fonte!.allowedUses).toContain("transactional");
    }
  });

  it("dá ao radar de concursos o sinal transacional que lhe faltava", async () => {
    // Este piloto vivia em «sinal a investigar» porque só tinha sinais
    // estruturais: sem procura nem transação, o gate não triangula. É o
    // Portal BASE que fecha essa lacuna.
    const pilot = MARKET_PILOTS.find((item) => item.templateId === "public-tender-support")!;
    const transacionais = pilot.series.filter((serie) => serie.kind === "transactional");
    expect(transacionais.length).toBeGreaterThan(0);
    expect(new Set(pilot.series.map((serie) => serie.independenceKey)).size).toBeGreaterThan(1);
  });

  it("continua a mostrar os números com a rede toda em baixo", async () => {
    // O ponto de ler em bloco fora do produto é este: o instantâneo não
    // depende de o INE ou o Eurostat responderem agora.
    const semRede = (async () => {
      throw new Error("rede indisponível");
    }) as unknown as typeof fetch;

    const [evidencia] = await loadPilotMarketEvidence({
      fetchImpl: semRede,
      now: () => contratos!.geradoEm,
      pilots: MARKET_PILOTS.filter((item) => item.templateId === "public-tender-support"),
    });

    const dadosGov = evidencia.sourceHealth.find((saude) => saude.sourceId === "dados-gov")!;
    expect(dadosGov.state).toBe("healthy");
    expect(dadosGov.message).toMatch(/Extração em bloco de \d{4}-\d{2}-\d{2}/);
    // A data da extração, não a do pedido: dizer «consultado agora» sobre
    // um ficheiro descarregado há semanas seria falso.
    expect(dadosGov.lastSuccessfulRunAt).toBe(contratos!.geradoEm);

    const ine = evidencia.sourceHealth.find((saude) => saude.sourceId === "ine")!;
    expect(ine.state).toBe("delayed");

    const doBloco = evidencia.observations.filter((o) => o.sourceId === "dados-gov");
    expect(doBloco.length).toBe(20);
    expect(evidencia.observations.every((o) => o.sourceId === "dados-gov")).toBe(true);
  }, 30_000);
});
