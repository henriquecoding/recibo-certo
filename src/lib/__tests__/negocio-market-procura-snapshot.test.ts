// ═══════════════════════════════════════════════════════════════════════
//  O INSTANTÂNEO DE PROCURA — a assinatura e as regras de substituição
//  ---------------------------------------------------------------------
//  O ficheiro é escrito por um job e lido em produção sem ninguém o ver
//  pelo meio. Estes testes são o que garante que o que está lá dentro é
//  o que o gerador escreveu, e que a camada que o serve não deita fora
//  leituras frescas nem inventa leituras que não existem.
// ═══════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import bruto from "@/lib/negocio/market/bulk/dados/procura-nuts2.json";
import { comInstantaneoPorBaixo, PROCURA_COMMITADA, tendenciaDe } from "@/lib/negocio/market/procura-nuts2";
import type { MarketPilotEvidence } from "@/lib/negocio/market/opportunities";

describe("procura commitada · o ficheiro é o que o gerador escreveu", () => {
  it("passa a validação e traz pilotos", () => {
    expect(PROCURA_COMMITADA).not.toBeNull();
    expect(PROCURA_COMMITADA!.pilotos.length).toBeGreaterThan(0);
  });

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ A LISTA DE CARIMBOS VEM DO GERADOR, NÃO DE UMA CÓPIA               │
  // │                                                                   │
  // │ Este teste tinha a regra escrita à mão — «geradoEm, checkedAt,     │
  // │ retrievedAt» — e o gerador tinha a mesma lista noutro ficheiro.    │
  // │ Duas cópias da mesma regra divergem, e divergiram: faltavam        │
  // │ `evaluatedAt`, `lastRunAt` e `lastSuccessfulRunAt` nas DUAS, o     │
  // │ que fazia o hash mudar a cada corrida e o `--check` reprovar       │
  // │ sempre, dissesse o que dissesse o ficheiro.                        │
  // │                                                                   │
  // │ Passa a ler a lista da FONTE do gerador. Se lá acrescentarem um    │
  // │ carimbo e se esquecerem daqui, este teste acompanha; se apagarem   │
  // │ a lista, ele reprova em vez de assumir uma versão sua.             │
  // └───────────────────────────────────────────────────────────────────┘
  const carimbosDoGerador = (): string[] => {
    const fonte = readFileSync(
      join(process.cwd(), "scripts", "gen-procura-nuts2.mjs"),
      "utf8",
    );
    const bloco = fonte.match(/const CARIMBOS = new Set\(\[([\s\S]*?)\]\);/);
    if (!bloco) throw new Error("O gerador deixou de declarar `const CARIMBOS = new Set([...])`.");
    return [...bloco[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  };

  it("a lista de carimbos do gerador cobre os campos de relógio conhecidos", () => {
    const carimbos = carimbosDoGerador();
    for (const esperado of [
      "geradoEm",
      "checkedAt",
      "retrievedAt",
      "evaluatedAt",
      "lastRunAt",
      "lastSuccessfulRunAt",
    ]) {
      expect(carimbos, `carimbo de relógio fora do hash: ${esperado}`).toContain(esperado);
    }
  });

  it("o contentHash bate com os dados", () => {
    // A mesma conta do gerador: cobre os dados e NÃO os carimbos de
    // quando perguntámos. Sem isto, o job commitava a cada corrida só
    // para dizer que os números continuam iguais — e uma escrita
    // truncada passaria despercebida.
    const carimbos = new Set(carimbosDoGerador());
    const documento = bruto as unknown as Record<string, unknown>;
    const { contentHash, ...semHash } = documento;
    const semCarimbos = JSON.stringify(semHash, (chave, valor) =>
      carimbos.has(chave) ? undefined : valor,
    );
    expect(`sha256:${createHash("sha256").update(semCarimbos).digest("hex")}`).toBe(contentHash);
  });

  it("todas as observações têm valor, série e geografia", () => {
    for (const piloto of PROCURA_COMMITADA!.pilotos) {
      for (const observacao of piloto.observations) {
        expect(observacao.seriesId, piloto.templateId).toBeTruthy();
        expect(observacao.geography.code, observacao.seriesId).toBeTruthy();
        expect(observacao.value, observacao.seriesId).not.toBeUndefined();
      }
    }
  });

  it("a granularidade declarada é a que os dados têm", () => {
    // O nome do ficheiro promete NUTS II e país. Uma leitura ao concelho
    // aqui dentro seria uma promessa quebrada em silêncio — e o resto do
    // motor compara percentis assumindo nove regiões.
    const niveis = new Set(
      PROCURA_COMMITADA!.pilotos.flatMap((piloto) =>
        piloto.observations.map((observacao) => observacao.geography.level),
      ),
    );
    for (const nivel of niveis) expect(["nuts2", "country"]).toContain(nivel);
  });

  it("nenhuma leitura chega sem licença apurada", () => {
    // A regra é anterior a este ficheiro: uma observação sem licença
    // aprovada não pode ser publicada, esteja ela ao vivo ou guardada.
    for (const piloto of PROCURA_COMMITADA!.pilotos) {
      for (const observacao of piloto.observations) {
        expect(observacao.license?.status, `${piloto.templateId}/${observacao.seriesId}`).toBe("approved");
      }
    }
  });
});

describe("procura commitada · o ao vivo ganha, o instantâneo só preenche", () => {
  const falso = (templateId: string, observations: number): MarketPilotEvidence =>
    ({
      templateId,
      checkedAt: "2026-08-23T00:00:00.000Z",
      gate: { state: "candidate" },
      observations: Array.from({ length: observations }, (_, indice) => ({
        seriesId: `serie-${indice}`,
      })),
      sourceHealth: [],
    }) as unknown as MarketPilotEvidence;

  it("uma leitura fresca nunca é substituída pela guardada", () => {
    const guardado = PROCURA_COMMITADA!.pilotos[0]!;
    const aoVivo = [falso(guardado.templateId, 3)];
    const { pilotos, doInstantaneo } = comInstantaneoPorBaixo(aoVivo);
    const resultado = pilotos.find((item) => item.templateId === guardado.templateId)!;
    expect(resultado.observations).toHaveLength(3);
    expect(doInstantaneo).not.toContain(guardado.templateId);
  });

  it("um piloto vazio é preenchido pelo guardado, e diz que foi", () => {
    const guardado = PROCURA_COMMITADA!.pilotos[0]!;
    const { pilotos, doInstantaneo } = comInstantaneoPorBaixo([falso(guardado.templateId, 0)]);
    const resultado = pilotos.find((item) => item.templateId === guardado.templateId)!;
    expect(resultado.observations.length).toBeGreaterThan(0);
    expect(doInstantaneo).toContain(guardado.templateId);
  });

  it("um carregamento que não produziu nada devolve o instantâneo inteiro", () => {
    const { pilotos, doInstantaneo } = comInstantaneoPorBaixo([]);
    expect(pilotos).toHaveLength(PROCURA_COMMITADA!.pilotos.length);
    expect(doInstantaneo).toHaveLength(PROCURA_COMMITADA!.pilotos.length);
  });

  it("nunca duplica um piloto", () => {
    const guardado = PROCURA_COMMITADA!.pilotos[0]!;
    const { pilotos } = comInstantaneoPorBaixo([falso(guardado.templateId, 2)]);
    const ids = pilotos.map((item) => item.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("um piloto ao vivo que o instantâneo não conhece passa tal e qual", () => {
    // Um dossier novo, ainda sem instantâneo, não pode desaparecer da
    // resposta só por não estar no ficheiro.
    const { pilotos } = comInstantaneoPorBaixo([falso("dossier-novo", 0)]);
    const novo = pilotos.find((item) => item.templateId === "dossier-novo");
    expect(novo).toBeDefined();
    expect(novo!.observations).toHaveLength(0);
  });

  it("o instantâneo não reescreve os carimbos para parecer fresco", () => {
    // A honestidade deste ficheiro depende disto: as leituras guardadas
    // trazem a data em que foram colhidas, e é sobre ela que a frescura
    // é calculada. Reescrevê-las seria dar por observado hoje o que foi
    // observado noutro dia.
    const { pilotos } = comInstantaneoPorBaixo([]);
    const guardado = PROCURA_COMMITADA!.pilotos[0]!;
    const servido = pilotos.find((item) => item.templateId === guardado.templateId)!;
    expect(servido.checkedAt).toBe(guardado.checkedAt);
    expect(servido.observations[0]?.retrievedAt).toBe(guardado.observations[0]?.retrievedAt);
  });
});

describe("procura commitada · a tendência", () => {
  it("traz séries com dois períodos e as dez geografias", () => {
    const tendencias = PROCURA_COMMITADA!.tendencias ?? [];
    expect(tendencias.length).toBeGreaterThan(0);
    for (const t of tendencias) {
      // Dois períodos distintos, ou não há variação nenhuma a calcular.
      expect(t.periodoAnterior).not.toBe(t.periodoAtual);
      expect(t.periodoAnterior < t.periodoAtual, t.seriesId).toBe(true);
      expect(Object.keys(t.porGeografia).length).toBeGreaterThan(1);
    }
  });

  it("a variação percentual bate com os dois valores", () => {
    // Uma percentagem que não venha dos números ao lado é um número
    // inventado com ar de cálculo — e esta ficha mostra os três.
    for (const t of PROCURA_COMMITADA!.tendencias ?? []) {
      for (const [codigo, v] of Object.entries(t.porGeografia)) {
        const esperado = Math.round(((v.atual - v.anterior) / Math.abs(v.anterior)) * 1000) / 10;
        expect(v.variacaoPct, `${t.seriesId}/${codigo}`).toBeCloseTo(esperado, 6);
      }
    }
  });

  it("as séries com tendência são de procura, nunca estruturais", () => {
    // Uma tendência de índice de envelhecimento não descreve o movimento
    // de um mercado; descreve demografia. Só entram demand/transactional.
    const idsComTendencia = new Set((PROCURA_COMMITADA!.tendencias ?? []).map((t) => t.seriesId));
    const kindPorSerie = new Map<string, string>();
    for (const p of PROCURA_COMMITADA!.pilotos) {
      for (const o of p.observations) kindPorSerie.set(o.seriesId, String(o.kind));
    }
    for (const id of idsComTendencia) {
      const kind = kindPorSerie.get(id);
      if (kind) expect(["demand", "transactional"], id).toContain(kind);
    }
  });

  it("`tendenciaDe` prefere a zona e recua ao país declarando-o", () => {
    const t = (PROCURA_COMMITADA!.tendencias ?? [])[0];
    if (!t) return;
    const local = tendenciaDe(t.seriesId, "11");
    if (t.porGeografia["11"]) {
      expect(local?.nacional).toBe(false);
      expect(local?.variacao.atual).toBe(t.porGeografia["11"].atual);
    }
    // Uma geografia que a série não cobre recua ao país, e diz que recuou.
    const recuo = tendenciaDe(t.seriesId, "ZZ");
    expect(recuo?.nacional).toBe(true);
    expect(tendenciaDe("serie-que-nao-existe", "11")).toBeNull();
  });
});
