import { NextResponse } from "next/server";
import { carregarOferta } from "@/lib/negocio/market/oferta";

/**
 * O pack público de OFERTA — quantos operadores já existem por zona.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ PORQUE É UMA ROTA SEPARADA DE `/api/market/pilots`                  │
 * │                                                                    │
 * │ São dois eixos independentes e falham de maneiras diferentes. O    │
 * │ pack de pilotos traz PROCURA para cinco dossiers curados; este     │
 * │ traz OFERTA para qualquer hipótese que a ontologia consiga         │
 * │ classificar numa divisão da CAE — que é a maioria delas. Juntá-los │
 * │ numa só rota faria a procura desaparecer quando a oferta falhasse, │
 * │ e ao contrário.                                                     │
 * │                                                                    │
 * │ Também têm cadências diferentes: as contas integradas das empresas │
 * │ saem uma vez por ano, os inquéritos de turismo são mensais.        │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Como a rota das outras séries, fala com o INE em tempo de PEDIDO e não
 * de compilação: uma build não pode depender de um servidor de terceiros
 * estar bem disposto naquele minuto.
 *
 * Não recebe nem devolve nada do perfil de quem pergunta. É o mesmo
 * objeto para toda a gente, e é por isso que pode viver na borda.
 */
export const dynamic = "force-dynamic";

/** Doze horas: estas séries são anuais, medem-se em meses. */
const TTL_SEGUNDOS = 43_200;

const CACHE_SAUDAVEL = "public, s-maxage=43200, stale-while-revalidate=86400";
/** Uma leitura incompleta não fica meio dia colada à borda. */
const CACHE_DEGRADADO = "public, s-maxage=600, stale-while-revalidate=3600";

export async function GET() {
  const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, next: { revalidate: TTL_SEGUNDOS } })) as typeof fetch;

  try {
    const pack = await carregarOferta({ fetchImpl });
    const completo = pack.emFalta.length === 0 && pack.populacao.length > 0;
    return NextResponse.json(pack, {
      headers: {
        "Cache-Control": completo ? CACHE_SAUDAVEL : CACHE_DEGRADADO,
        "X-Divisoes": String(pack.divisoes.length),
        "X-Divisoes-Em-Falta": String(pack.emFalta.length),
      },
    });
  } catch {
    // Um pack vazio é honesto: o motor volta a dizer «lacuna por apurar»,
    // que é o que dizia antes desta rota existir. Um 500 não dizia nada e
    // deixava o cartão sem explicação nenhuma no ecrã.
    return NextResponse.json(
      {
        schemaVersion: 1 as const,
        geradoEm: new Date().toISOString(),
        indicadorEmpresas: "",
        indicadorPopulacao: "",
        licenca: null,
        divisoes: [],
        populacao: [],
        emFalta: [],
      },
      { status: 200, headers: { "Cache-Control": CACHE_DEGRADADO } },
    );
  }
}
