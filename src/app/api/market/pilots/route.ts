import { NextResponse } from "next/server";
import { loadPilotMarketEvidence } from "@/lib/negocio/market/pilot-loader";
import { comInstantaneoPorBaixo, PROCURA_COMMITADA } from "@/lib/negocio/market/procura-nuts2";
import type { MarketSourceHealthState } from "@/lib/negocio/market/tipos";

/**
 * Esta rota fala com o INE, o Eurostat e o portal de dados abertos. Isso é
 * trabalho de tempo de pedido, não de tempo de compilação.
 *
 * Com `revalidate` ao nível do segmento, o Next prerenderizava-a durante o
 * `next build`: nove séries do INE em fila, três tentativas cada, e uma
 * build que rebentava aos sessenta segundos quando a fonte estava lenta —
 * a compilação inteira dependia de um servidor de terceiros estar bem
 * disposto naquele minuto.
 *
 * O cache não desaparece, só muda de sítio. Continua em dois:
 *  - a borda guarda a RESPOSTA seis horas (`Cache-Control` abaixo);
 *  - o Data Cache do Next guarda cada PEDIDO à fonte outras seis
 *    (`next: { revalidate }` no `fetch`), que sobrevive a `force-dynamic`
 *    por ser configuração explícita por pedido.
 */
export const dynamic = "force-dynamic";

/** Seis horas: o passo destas séries mede-se em meses, não em minutos. */
const TTL_SEGUNDOS = 21_600;

/** Uma fonte que não respondeu não pode ficar seis horas colada à borda. */
const CACHE_SAUDAVEL = "public, s-maxage=21600, stale-while-revalidate=86400";
const CACHE_DEGRADADO = "public, s-maxage=300, stale-while-revalidate=3600";

/**
 * Os estados que uma nova tentativa pode resolver — e só esses.
 *
 * `license_review` e `disabled` ficam de fora de propósito: não são
 * falhas de execução, são decisões. Repetir o pedido não as muda.
 */
const ESTADOS_TRANSITORIOS: readonly MarketSourceHealthState[] = [
  "delayed",
  "stale",
  "schema_changed",
  "quarantined",
];

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
    fetch(input, { ...init, next: { revalidate: TTL_SEGUNDOS } })) as typeof fetch;

  try {
    const aoVivo = await loadPilotMarketEvidence({ fetchImpl });
    // ── O instantâneo commitado por baixo do ao vivo ────────────────
    //  Piloto a piloto: o fresco ganha sempre, o guardado só entra onde
    //  não veio nada. Sem isto, um mau dia das fontes apagava o eixo da
    //  procura inteiro — dezassete pontos em cem — e o ecrã dizia «não
    //  sabemos» sobre tudo, sem nada a explicar porquê.
    const { pilotos: pilots, doInstantaneo } = comInstantaneoPorBaixo(aoVivo);

    // Uma execução pode apanhar o INE sob carga e montar um pack com
    // metade das séries em falta. Guardar isso durante seis horas fazia um
    // problema de trinta segundos durar uma tarde: quando alguma fonte
    // ficou por confirmar, a borda volta a tentar dentro de minutos.
    //
    // Mas nem toda a não-saúde é transitória. Uma fonte retida por
    // licença por confirmar está no mesmo estado hoje e daqui a um mês —
    // tratá-la como falha punha a borda a repetir o pedido de cinco em
    // cinco minutos, para sempre, à espera de uma coisa que só muda
    // quando alguém assinar um papel. Só os estados que uma nova tentativa
    // pode mesmo resolver encurtam o cache.
    const degradado = pilots.some((pilot) =>
      pilot.sourceHealth.some((health) => ESTADOS_TRANSITORIOS.includes(health.state)),
    );

    // ── Cabeçalhos de saúde: dar por fora o que se via por dentro ───
    //  Quatro pilotos vazios eram indistinguíveis de quatro pilotos
    //  cheios sem abrir o corpo da resposta. Estes três contadores são
    //  o que permite ver, de fora, que a procura secou — que é a
    //  situação que gerou o relatório.
    const observacoes = pilots.reduce((total, pilot) => total + pilot.observations.length, 0);
    const degradadas = new Set(
      pilots.flatMap((pilot) =>
        pilot.sourceHealth.filter((health) => health.state !== "healthy").map((health) => health.sourceId),
      ),
    );

    return NextResponse.json(
      { schemaVersion: 1, generatedAt: new Date().toISOString(), pilots },
      {
        headers: {
          "Cache-Control": degradado ? CACHE_DEGRADADO : CACHE_SAUDAVEL,
          "X-Pilotos": String(pilots.length),
          "X-Observacoes": String(observacoes),
          "X-Pilotos-Vazios": String(pilots.filter((pilot) => pilot.observations.length === 0).length),
          "X-Fontes-Degradadas": degradadas.size > 0 ? [...degradadas].sort().join(",") : "",
          "X-Do-Instantaneo": doInstantaneo.join(","),
        },
      },
    );
  } catch {
    // O que rebenta ANTES do carregador degradar cada piloto sozinho —
    // Web Crypto ausente, um registo mal formado. Antes disto a resposta
    // era uma lista vazia; agora o instantâneo commitado ainda responde,
    // pela mesma razão que a matriz de oferta sobrevive à queda do INE.
    const guardados = PROCURA_COMMITADA?.pilotos ?? [];
    return NextResponse.json(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        pilots: guardados,
        degraded:
          guardados.length > 0
            ? `Não foi possível falar com as fontes nesta execução. As leituras são do instantâneo de ${PROCURA_COMMITADA?.geradoEm ?? "data desconhecida"}.`
            : "Não foi possível montar o pack de mercado nesta execução.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": CACHE_DEGRADADO,
          "X-Pilotos": String(guardados.length),
          "X-Observacoes": String(
            guardados.reduce((total, pilot) => total + pilot.observations.length, 0),
          ),
          "X-Do-Instantaneo": guardados.map((pilot) => pilot.templateId).join(","),
        },
      },
    );
  }
}
