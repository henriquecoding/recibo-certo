// ═══════════════════════════════════════════════════════════════════════
//  SNAPSHOT EM FICHEIRO — o que fica no repositório, e porquê
//  ---------------------------------------------------------------------
//  A fonte são 36 MB comprimidos que descomprimem para 261 MB. Isso não
//  se descarrega a pedido: nem numa rota que revalida de seis em seis
//  horas, nem — muito menos — no browser de quem abre a página.
//
//  Por isso a ingestão corre FORA do produto, num job agendado, e deixa
//  aqui o resultado: umas dezenas de contagens, com a proveniência toda
//  agarrada. O ficheiro é commitado, como já acontece com o índice de
//  busca e com os dados do popup de novidades. Três consequências, e as
//  três são o ponto:
//
//   · o histórico do git mostra exatamente quando cada número mudou;
//   · uma revisão vê o diff das contagens, não um blob de 261 MB;
//   · em produção não há infraestrutura nova nenhuma — é um ficheiro.
//
//  O `contentHash` cobre só as observações. Se o job correr outra vez e
//  os dados não tiverem mudado, o hash é igual e o commit não acontece:
//  é isso que impede um PR automático por semana a dizer que nada mudou.
// ═══════════════════════════════════════════════════════════════════════

import type { MarketObservation } from "../tipos";

export const SNAPSHOT_BULK_VERSAO = 1;

export interface ProveniencaDoSnapshot {
  /** Slug do dataset no dados.gov. */
  dataset: string;
  paginaUrl: string;
  publicador?: string;
  /** Identificador de licença declarado pelo portal. */
  licenca?: string;
  /** O recurso concreto que foi lido, com o URL daquele instante. */
  recurso: {
    id: string;
    ficheiro: string;
    url: string;
    atualizadoEm?: string;
    bytes?: number;
  };
  /** SHA-256 do ficheiro descarregado, calculado durante a leitura. */
  checksumOrigem: string;
  /** Quantos registos o ficheiro tinha, e quantos não foram usados. */
  registosLidos: number;
  /**
   * Quantos contratos relevantes foram colocados numa zona.
   *
   * Fica aqui — e não só na `completeness` de cada observação — porque é o
   * número que uma revisão precisa de ver mudar: uma queda súbita quer
   * dizer que a fonte mudou a forma de escrever o local de execução.
   */
  contratosLocalizados?: number;
  descartes: Readonly<Record<string, number>>;
}

export interface SnapshotBulk {
  schemaVersion: typeof SNAPSHOT_BULK_VERSAO;
  id: string;
  /** Quando o job correu. Não é o período dos dados. */
  geradoEm: string;
  /** Versão do agregador: muda quando a contagem muda de significado. */
  transformVersion: string;
  proveniencia: ProveniencaDoSnapshot;
  observations: readonly MarketObservation[];
  /** SHA-256 só das observações — o que decide se há algo para commitar. */
  contentHash: string;
}

function canonico(valor: unknown): string {
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor) ?? "null";
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  const objeto = valor as Record<string, unknown>;
  return `{${Object.keys(objeto)
    .sort()
    .filter((chave) => objeto[chave] !== undefined)
    .map((chave) => `${JSON.stringify(chave)}:${canonico(objeto[chave])}`)
    .join(",")}}`;
}

/**
 * Impressão digital das observações, e só delas.
 *
 * `geradoEm` e `retrievedAt` mudam a cada execução por definição.
 * Metê-los no hash faria o job commitar todas as semanas para dizer que
 * os números continuam iguais — que é ruído com aparência de trabalho.
 */
export async function calcularContentHash(
  observations: readonly MarketObservation[],
): Promise<string> {
  const semInstante = observations.map(({ retrievedAt: _ignorado, ...resto }) => resto);
  const texto = canonico([...semInstante].sort((a, b) => a.id.localeCompare(b.id)));
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto é obrigatório para assinar o snapshot.");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

const SHA256 = /^sha256:[a-f0-9]{64}$/i;

/**
 * Lê um snapshot vindo do disco ou da rede.
 *
 * Devolve `null` a qualquer sinal de estranheza. Um snapshot ilegível
 * nunca pode impedir a ferramenta de abrir — degrada para «sem sinal»,
 * que é a resposta honesta, e não para uma página em branco.
 */
export function lerSnapshotBulk(bruto: unknown): SnapshotBulk | null {
  if (!bruto || typeof bruto !== "object") return null;
  const item = bruto as Partial<SnapshotBulk>;
  if (item.schemaVersion !== SNAPSHOT_BULK_VERSAO) return null;
  if (typeof item.id !== "string" || !item.id) return null;
  if (typeof item.geradoEm !== "string") return null;
  if (typeof item.contentHash !== "string" || !SHA256.test(item.contentHash)) return null;
  if (!Array.isArray(item.observations)) return null;
  if (!item.proveniencia || typeof item.proveniencia !== "object") return null;

  const observations = item.observations.filter(
    (observacao): observacao is MarketObservation =>
      Boolean(observacao) &&
      typeof observacao === "object" &&
      typeof (observacao as MarketObservation).id === "string" &&
      typeof (observacao as MarketObservation).metricId === "string",
  );
  if (observations.length === 0) return null;

  return { ...(item as SnapshotBulk), observations };
}
