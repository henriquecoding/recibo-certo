// ═══════════════════════════════════════════════════════════════════════
//  O PACK DE MERCADO TEM PRAZO — E A BUILD NÃO DEPENDE DO INE
//  ---------------------------------------------------------------------
//  Esta rota falava com o INE, o Eurostat e o dados.gov durante o
//  `next build`. Nove séries do INE em fila, três tentativas de oito
//  segundos cada: quando a fonte estava lenta, a compilação passava dos
//  sessenta segundos e falhava — o repositório inteiro ficava vermelho
//  porque um servidor de terceiros estava mal disposto naquele minuto.
//
//  São duas regras, e ambas se verificam aqui em vez de se prometerem:
//  a rota não é prerenderizada, e uma execução tem um teto.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { loadPilotMarketEvidence } from "@/lib/negocio/market/pilot-loader";
import { MARKET_PILOTS } from "@/lib/negocio/market/pilots";

const ROTA = "src/app/api/market/pilots/route.ts";

describe("mercado: a build não fica refém de uma fonte externa", () => {
  it("declara a rota dinâmica, para não a prerenderizar", () => {
    const fonte = readFileSync(ROTA, "utf-8");
    expect(fonte).toMatch(/export const dynamic = "force-dynamic"/);
  });

  it("não volta a exportar `revalidate` ao nível do segmento", () => {
    // É este export que faz o Next prerenderizar a rota no build. O cache
    // de seis horas continua a existir — na borda, pelo `Cache-Control`, e
    // no Data Cache, pelo `next: { revalidate }` de cada `fetch` — mas
    // nenhum deles obriga a compilação a esperar pelo INE.
    const fonte = readFileSync(ROTA, "utf-8");
    expect(fonte).not.toMatch(/^export const revalidate\b/m);
    expect(fonte).toMatch(/next: \{ revalidate: TTL_SEGUNDOS \}/);
  });
});

describe("mercado: uma execução tem orçamento", () => {
  it("desiste em vez de insistir quando o prazo já passou", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const controlo = new AbortController();
    controlo.abort();

    const pilotos = MARKET_PILOTS.slice(0, 1);
    const resultado = await loadPilotMarketEvidence({
      fetchImpl,
      signal: controlo.signal,
      pilots: pilotos,
      now: () => "2026-08-22T00:00:00.000Z",
    });

    // Nem uma tentativa: com o prazo gasto, repetir três vezes por série
    // só atrasava a resposta que já se sabe que vai ser degradada.
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(resultado).toHaveLength(1);
  });

  it("degrada com honestidade em vez de inventar números", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const controlo = new AbortController();
    controlo.abort();

    const [piloto] = await loadPilotMarketEvidence({
      fetchImpl,
      signal: controlo.signal,
      pilots: MARKET_PILOTS.slice(0, 1),
      now: () => "2026-08-22T00:00:00.000Z",
    });

    expect(piloto.observations).toEqual([]);
    expect(piloto.sourceHealth.every((saude) => saude.state !== "healthy")).toBe(true);
  });
});
