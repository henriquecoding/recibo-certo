// ═══════════════════════════════════════════════════════════════════════
//  OS SINAIS DECLARADOS — e a ponte que estava desligada
//  ---------------------------------------------------------------------
//  Cada problema do grafo diz, em `sinais`, que séries oficiais o medem.
//  O campo existia desde o início e só o PLANEADOR o lia, para marcar uma
//  consulta como «já ligada». A evidência, essa, era resolvida por outro
//  caminho — o dossier curado — e cobria cinco dossiers.
//
//  Resultado medido antes desta ligação: 16 % das hipóteses com sinal de
//  procura. O plano dizia «esta fonte está ligada» e o dossier ao lado
//  não mostrava observação nenhuma. Duas partes do mesmo motor a
//  discordar, e nenhum teste a notar.
//
//  Ligada a ponte, a mesma medição dá 70 %.
//
//  O que estes testes guardam é a coerência que tornou isso possível: um
//  `sinal` que não corresponda a nenhuma série publicada não dá erro
//  nenhum — dá silêncio, que é pior.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { PROBLEMAS } from "@/lib/negocio/descoberta/conhecimento/dados/problemas";
import { MARKET_PILOTS } from "@/lib/negocio/market/pilots";
import { avaliarProcura } from "@/lib/negocio/descoberta/motor/procura";

const SERIES_PUBLICADAS = new Set(
  MARKET_PILOTS.flatMap((piloto) => piloto.series.map((serie) => serie.id)),
);

describe("sinais: cada um aponta para uma série que existe", () => {
  it("nenhum problema declara um sinal desconhecido", () => {
    const orfaos: string[] = [];
    for (const problema of PROBLEMAS) {
      for (const sinal of problema.sinais) {
        if (!SERIES_PUBLICADAS.has(sinal)) orfaos.push(`${problema.id} → ${sinal}`);
      }
    }
    expect(orfaos).toEqual([]);
  });

  it("nenhum problema repete o mesmo sinal", () => {
    for (const problema of PROBLEMAS) {
      expect(new Set(problema.sinais).size, problema.id).toBe(problema.sinais.length);
    }
  });

  it("um sinal de problema não observável fica fora da evidência", () => {
    // Três problemas declaram sinais E declaram-se não observáveis. Não é
    // descuido: a ocupação hoteleira não mede se um produtor tem tempo
    // para o lado comercial. São contexto para o planeador, não medida da
    // necessidade — e anexá-los como procura punha o motor a contradizer
    // a sua própria nota («nenhuma fonte pública mede isto»).
    const contextuais = PROBLEMAS.filter(
      (problema) => problema.sinais.length > 0 && !problema.procuraObservavel,
    );
    expect(contextuais.length).toBeGreaterThan(0);

    for (const problema of contextuais) {
      const candidato = {
        problema,
        regiao: "algarve" as const,
        dominante: { id: "sem-conceito" },
        seedTemplateId: undefined,
      } as unknown as Parameters<typeof avaliarProcura>[0]["candidato"];
      const pilotos = new Map(
        MARKET_PILOTS.map((piloto) => [
          piloto.templateId,
          {
            templateId: piloto.templateId,
            // O gate governa: uma observação que ele não liste em
            // `usableObservationIds` não entra na evidência nem no score.
            gate: {
              state: "evidence_qualified",
              usableObservationIds: piloto.series.map((serie) => `falso:${serie.id}`),
            },
            observations: piloto.series.map((serie) => ({
              id: `falso:${serie.id}`,
              seriesId: serie.id,
              seriesLabel: serie.label,
              kind: serie.kind,
              value: 1,
              unit: "x",
              geography: { country: "PT", level: "country", code: "PT", name: "Portugal" },
              referencePeriod: { start: "2025-01-01", end: "2025-12-31", label: "2025" },
              retrievedAt: "2026-08-23T00:00:00.000Z",
              sourceId: serie.sourceId,
              license: { status: "approved", scope: "dataset", identifier: "CC BY 4.0", url: "u" },
              reading: serie.reading,
            })),
          },
        ]),
      ) as unknown as Parameters<typeof avaliarProcura>[0]["evidencePorTemplate"];

      const resultado = avaliarProcura({ candidato, evidencePorTemplate: pilotos, agora: "2026-08-23" });
      expect(resultado.evidencias, problema.id).toEqual([]);
    }
  });

  it("a maioria dos problemas tem pelo menos um sinal ligado", () => {
    const comSinal = PROBLEMAS.filter((problema) => problema.sinais.length > 0).length;
    // Não é uma meta de produto — é um alarme. Se isto descer muito,
    // alguém apagou sinais ou acrescentou problemas sem os ligar, e a
    // cobertura de procura cai sem ninguém dar por nada.
    expect(comSinal).toBeGreaterThanOrEqual(Math.ceil(PROBLEMAS.length / 2));
  });

  it("um problema sem sinais assume que não é observável", () => {
    // `procuraObservavel: true` sem sinais é a promessa que o motor não
    // pode cumprir — e é exatamente o que a nota do dossier evita dizer.
    // Aqui não se exige `false`, exige-se que a contradição seja rara e
    // consciente: um problema medível cuja série ainda não foi ligada.
    const porLigar = PROBLEMAS.filter(
      (problema) => problema.sinais.length === 0 && problema.procuraObservavel,
    );
    expect(porLigar.length).toBeLessThanOrEqual(PROBLEMAS.length / 3);
  });
});
