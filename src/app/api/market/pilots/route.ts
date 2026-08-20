import { NextResponse } from "next/server";
import { loadPilotMarketEvidence } from "@/lib/negocio/market/pilot-loader";

export const revalidate = 21_600;

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
    return NextResponse.json(
      { schemaVersion: 1, generatedAt: new Date().toISOString(), pilots },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        pilots: [],
        degraded: "Não foi possível montar o pack de mercado nesta execução.",
      },
      // Sem cache longo: um erro nosso não pode ficar seis horas colado à
      // borda a servir uma lista vazia como se fosse a verdade do dia.
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
