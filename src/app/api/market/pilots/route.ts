import { NextResponse } from "next/server";
import { loadPilotMarketEvidence } from "@/lib/negocio/market/pilot-loader";

export const revalidate = 21_600;

/** Uma fonte que não respondeu não pode ficar seis horas colada à borda. */
const CACHE_SAUDAVEL = "public, s-maxage=21600, stale-while-revalidate=86400";
const CACHE_DEGRADADO = "public, s-maxage=300, stale-while-revalidate=3600";

/**
 * O pack público de mercado. Não recebe nem devolve nada do perfil de quem
 * pergunta: o browser pede o mesmo objeto para toda a gente.
 *
 * `loadPilotMarketEvidence` já degrada cada piloto sozinho quando a fonte
 * falha. Esta guarda existe para o que corre mal ANTES disso — Web Crypto
 * ausente, `AbortSignal.timeout` indisponível, um registo mal formado — em
 * que a rota inteira rebentaria com 500 e o cartão ficaria sem explicação
 * nenhuma no ecrã. Uma lista vazia é honesta; um 500 não diz nada.
 */
export async function GET() {
  const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, next: { revalidate } })) as typeof fetch;

  try {
    const pilots = await loadPilotMarketEvidence({ fetchImpl });

    // Uma build pode apanhar o INE sob carga e prerenderizar um pack com
    // metade das séries em falta. Guardar isso durante seis horas fazia um
    // problema de trinta segundos durar uma tarde: quando alguma fonte
    // ficou por confirmar, a borda volta a tentar dentro de minutos.
    const degradado = pilots.some((pilot) =>
      pilot.sourceHealth.some((health) => health.state !== "healthy"),
    );

    return NextResponse.json(
      { schemaVersion: 1, generatedAt: new Date().toISOString(), pilots },
      { headers: { "Cache-Control": degradado ? CACHE_DEGRADADO : CACHE_SAUDAVEL } },
    );
  } catch {
    return NextResponse.json(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        pilots: [],
        degraded: "Não foi possível montar o pack de mercado nesta execução.",
      },
      { status: 200, headers: { "Cache-Control": CACHE_DEGRADADO } },
    );
  }
}
