// ═══════════════════════════════════════════════════════════════════════
//  A MATRIZ AO CONCELHO — leitura validada do instantâneo commitado
//  ---------------------------------------------------------------------
//  `scripts/gen-oferta-concelhos.mjs` escreve o instantâneo; este módulo
//  é o único sítio por onde a aplicação o lê, e lê-o UMA vez, à carga.
//
//  ── PORQUE A VALIDAÇÃO NÃO É PARANOIA ──────────────────────────────
//  Os arrays alinham por índice: `porDivisao["81"][7]` é a contagem do
//  concelho `ordem[7]`. Um array com um elemento a menos não dá erro —
//  desloca todos os concelhos seguintes por uma posição e atribui a
//  Lisboa os números de Loures. O resultado continua a parecer uma
//  análise. É o modo de falhar mais caro que esta camada podia ter, e
//  por isso o alinhamento é verificado antes de qualquer leitura.
//
//  Um instantâneo que não passe fica de fora inteiro, e o motor volta a
//  ler ao nível da NUTS II — que é o que lia antes de isto existir.
// ═══════════════════════════════════════════════════════════════════════

import bruto from "./bulk/dados/oferta-concelhos.json";
import { CONCELHO_POR_CODIGO } from "./concelhos";

export interface MatrizOfertaConcelhos {
  schemaVersion: 1;
  /** Quando o job correu. Não é o período dos dados. */
  geradoEm: string;
  indicadorEmpresas: string;
  indicadorPopulacao: string;
  /** Ano das contagens de empresas. As contas integradas saem com desfasamento. */
  periodoEmpresas: string;
  periodoPopulacao: string;
  /** Códigos INE dos 308 concelhos. Todos os arrays alinham por índice. */
  ordem: readonly string[];
  /** Divisão CAE → contagem de empresas por concelho. */
  porDivisao: Readonly<Record<string, readonly number[]>>;
  /** População residente por concelho. */
  populacao: readonly number[];
  /** Divisões pedidas que a fonte não devolveu. */
  emFalta: readonly string[];
  contentHash: string;
}

function valida(documento: unknown): MatrizOfertaConcelhos | null {
  if (typeof documento !== "object" || documento === null) return null;
  const alvo = documento as Record<string, unknown>;
  if (alvo.schemaVersion !== 1) return null;

  const ordem = alvo.ordem;
  const populacao = alvo.populacao;
  const porDivisao = alvo.porDivisao;
  if (!Array.isArray(ordem) || !Array.isArray(populacao)) return null;
  if (typeof porDivisao !== "object" || porDivisao === null) return null;

  const total = ordem.length;
  if (total === 0) return null;

  // Cada código tem de existir na lista gerada dos 308 — senão a
  // conversão concelho → região não tem resposta e a comparação sai
  // enviesada sem dar sinal.
  for (const codigo of ordem) {
    if (typeof codigo !== "string" || !CONCELHO_POR_CODIGO.has(codigo)) return null;
  }
  if (new Set(ordem).size !== total) return null;

  // Sem população não há rácio, e uma população a zero seria uma divisão
  // por zero a produzir `Infinity` com ar de densidade altíssima.
  if (populacao.length !== total) return null;
  if (!populacao.every((valor) => typeof valor === "number" && Number.isFinite(valor) && valor > 0)) {
    return null;
  }

  for (const contagens of Object.values(porDivisao as Record<string, unknown>)) {
    if (!Array.isArray(contagens) || contagens.length !== total) return null;
    if (!contagens.every((valor) => typeof valor === "number" && Number.isFinite(valor) && valor >= 0)) {
      return null;
    }
  }

  return documento as unknown as MatrizOfertaConcelhos;
}

/**
 * O instantâneo validado, ou `null`.
 *
 * Avaliado uma vez à carga do módulo: a validação percorre 308 × 23
 * números e não tem por que correr a cada pedido.
 */
export const MATRIZ_CONCELHOS: MatrizOfertaConcelhos | null = valida(bruto);

/** Índice do concelho na ordem canónica, ou `-1`. */
export function indiceDoConcelho(matriz: MatrizOfertaConcelhos, codigo: string): number {
  return matriz.ordem.indexOf(codigo);
}
