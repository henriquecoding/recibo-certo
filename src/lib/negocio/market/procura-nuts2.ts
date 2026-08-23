// ═══════════════════════════════════════════════════════════════════════
//  O INSTANTÂNEO DE PROCURA — o chão por baixo do carregamento ao vivo
//  ---------------------------------------------------------------------
//  `scripts/gen-procura-nuts2.mjs` escreve-o; este módulo é o único sítio
//  por onde a aplicação o lê, e lê-o UMA vez, à carga.
//
//  ── O QUE ISTO MUDA, EM UMA LINHA ──────────────────────────────────
//  O eixo da procura vale dezassete pontos em cem e vinha inteiro de
//  `fetch` feito no pedido do utilizador. Num mau dia das fontes, os
//  cinco pilotos chegavam vazios e `procura` ficava `null` em TODAS as
//  hipóteses — sem nada no ecrã a dizer porquê. O eixo da oferta nunca
//  teve esse problema, porque lê de um ficheiro commitado. Isto é o
//  mesmo padrão, aplicado ao lado que faltava.
//
//      ANTES:  fetch ao vivo → falhou? → nada
//      DEPOIS: instantâneo (há sempre) → fetch ao vivo → substitui
//
//  ── O INSTANTÂNEO NUNCA MENTE SOBRE A SUA IDADE ────────────────────
//  As observações guardadas trazem o `referencePeriod` e o `retrievedAt`
//  do dia em que foram colhidas. Nada aqui os reescreve para parecerem
//  frescos: a classificação de frescura continua a ser calculada sobre
//  esses carimbos, e um instantâneo velho é apresentado como velho. É a
//  regra da casa — uma fonte que falha perde o número, não recebe um
//  substituto plausível — e um instantâneo declarado NÃO é um
//  substituto plausível: é a mesma leitura, colhida noutro dia, com a
//  data à vista.
// ═══════════════════════════════════════════════════════════════════════

import bruto from "./bulk/dados/procura-nuts2.json";
import type { MarketPilotEvidence } from "./opportunities";

export interface InstantaneoProcura {
  schemaVersion: 1;
  id: "procura-nuts2";
  /** Quando o job correu. NÃO é o período dos dados. */
  geradoEm: string;
  /** A granularidade real destas séries: NUTS II e país, nunca concelho. */
  granularidade: string;
  /** Pilotos que vieram sem uma única leitura. Declarados, não escondidos. */
  semObservacoes: readonly string[];
  pilotos: readonly MarketPilotEvidence[];
  contentHash: string;
}

/**
 * Um instantâneo que não passe fica de fora INTEIRO.
 *
 * Meio instantâneo é pior do que nenhum: o motor leria alguns pilotos e
 * daria «não sabemos» nos outros, sem nada a distinguir a falha real da
 * falha de leitura do ficheiro.
 */
function valida(documento: unknown): InstantaneoProcura | null {
  if (typeof documento !== "object" || documento === null) return null;
  const alvo = documento as Record<string, unknown>;
  if (alvo.schemaVersion !== 1) return null;
  if (typeof alvo.geradoEm !== "string" || alvo.geradoEm.length === 0) return null;

  const pilotos = alvo.pilotos;
  if (!Array.isArray(pilotos) || pilotos.length === 0) return null;

  for (const piloto of pilotos) {
    if (typeof piloto !== "object" || piloto === null) return null;
    const item = piloto as Record<string, unknown>;
    if (typeof item.templateId !== "string" || item.templateId.length === 0) return null;
    if (typeof item.gate !== "object" || item.gate === null) return null;
    if (!Array.isArray(item.observations)) return null;
    if (!Array.isArray(item.sourceHealth)) return null;

    // Uma observação sem valor utilizável não serve para pontuar nada, e
    // deixá-la passar poria `NaN` a meio de um percentil.
    for (const observacao of item.observations) {
      if (typeof observacao !== "object" || observacao === null) return null;
      const leitura = observacao as Record<string, unknown>;
      if (typeof leitura.seriesId !== "string") return null;
      if (typeof leitura.geography !== "object" || leitura.geography === null) return null;
      const valor = leitura.value;
      if (typeof valor !== "number" && typeof valor !== "string" && typeof valor !== "boolean") {
        return null;
      }
    }
  }

  // Um instantâneo sem uma única observação é o ecrã que ele existe para
  // evitar. Recusá-lo devolve o comportamento anterior, que é honesto.
  const total = pilotos.reduce(
    (soma: number, item: { observations?: unknown[] }) => soma + (item.observations?.length ?? 0),
    0,
  );
  if (total === 0) return null;

  return documento as unknown as InstantaneoProcura;
}

/** O instantâneo validado, ou `null`. Avaliado uma vez à carga do módulo. */
export const PROCURA_COMMITADA: InstantaneoProcura | null = valida(bruto);

/**
 * O pack ao vivo com o instantâneo por baixo, piloto a piloto.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ PORQUE É PILOTO A PILOTO E NÃO TUDO-OU-NADA                         │
 * │                                                                    │
 * │ As fontes falham em separado: o Eurostat pode responder e o INE     │
 * │ não. Substituir o pack inteiro por causa de um piloto vazio         │
 * │ deitaria fora leituras frescas que chegaram bem — e substituir      │
 * │ nenhum deixaria o buraco. A regra é a que o carregador de pilotos   │
 * │ já segue para as séries: cada um degrada sozinho.                    │
 * │                                                                    │
 * │ O ao vivo GANHA sempre que trouxe alguma coisa. O instantâneo só    │
 * │ entra onde não veio nada — nunca por cima de uma leitura fresca,    │
 * │ mesmo quando é mais completo.                                       │
 * └────────────────────────────────────────────────────────────────────┘
 */
export function comInstantaneoPorBaixo(
  aoVivo: readonly MarketPilotEvidence[],
): { pilotos: readonly MarketPilotEvidence[]; doInstantaneo: readonly string[] } {
  if (!PROCURA_COMMITADA) return { pilotos: aoVivo, doInstantaneo: [] };

  const guardados = new Map(PROCURA_COMMITADA.pilotos.map((item) => [item.templateId, item]));
  const doInstantaneo: string[] = [];

  const pilotos = aoVivo.map((piloto) => {
    if (piloto.observations.length > 0) return piloto;
    const guardado = guardados.get(piloto.templateId);
    if (!guardado || guardado.observations.length === 0) return piloto;
    doInstantaneo.push(piloto.templateId);
    return guardado;
  });

  // Um piloto que o carregamento ao vivo nem chegou a produzir — porque
  // rebentou antes — continua a existir no instantâneo, e entra.
  const presentes = new Set(pilotos.map((item) => item.templateId));
  for (const guardado of PROCURA_COMMITADA.pilotos) {
    if (presentes.has(guardado.templateId)) continue;
    if (guardado.observations.length === 0) continue;
    pilotos.push(guardado);
    doInstantaneo.push(guardado.templateId);
  }

  return { pilotos, doInstantaneo: doInstantaneo.sort() };
}
