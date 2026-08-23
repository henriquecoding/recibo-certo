import { NextResponse } from "next/server";
import { carregarOferta } from "@/lib/negocio/market/oferta";
import { MATRIZ_CONCELHOS } from "@/lib/negocio/market/oferta-concelhos";

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
    // ── A matriz ao concelho vem do instantâneo, não do INE ─────────
    //  Não é uma segunda chamada: é um `import` de um ficheiro commitado
    //  (ver `scripts/gen-oferta-concelhos.mjs` para o que foi medido —
    //  19,7 MB não cabem no caminho de um pedido). Vai INTEIRA para o
    //  browser porque a zona de quem pergunta nunca sai do dispositivo:
    //  o servidor não pode filtrar por um concelho que não conhece, e
    //  não o deve conhecer. Nove KB comprimidos é o preço de não
    //  perguntar onde a pessoa mora.
    const comConcelhos = MATRIZ_CONCELHOS ? { ...pack, concelhos: MATRIZ_CONCELHOS } : pack;
    return NextResponse.json(comConcelhos, {
      headers: {
        "Cache-Control": completo ? CACHE_SAUDAVEL : CACHE_DEGRADADO,
        "X-Divisoes": String(pack.divisoes.length),
        "X-Divisoes-Em-Falta": String(pack.emFalta.length),
        "X-Concelhos": String(MATRIZ_CONCELHOS?.ordem.length ?? 0),
      },
    });
  } catch {
    // Um pack vazio é honesto: o motor volta a dizer «lacuna por apurar»,
    // que é o que dizia antes desta rota existir. Um 500 não dizia nada e
    // deixava o cartão sem explicação nenhuma no ecrã.
    //
    // A matriz ao concelho SOBREVIVE a esta falha, e é o ponto de ela ser
    // um instantâneo commitado: o INE estar em baixo deixou de apagar a
    // leitura de oferta inteira. Quem tem concelho fixado continua a ver
    // a comparação; só quem tem apenas a região é que fica sem ela.
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
        ...(MATRIZ_CONCELHOS ? { concelhos: MATRIZ_CONCELHOS } : {}),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": CACHE_DEGRADADO,
          "X-Concelhos": String(MATRIZ_CONCELHOS?.ordem.length ?? 0),
        },
      },
    );
  }
}
