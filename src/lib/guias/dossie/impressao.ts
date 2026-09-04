// ═══════════════════════════════════════════════════════════════════════
//  A IMPRESSÃO — provar o que seguiu sem guardar duas cópias
//  ---------------------------------------------------------------------
//  É o `payload_hash` dos handoffs da FIZ, aplicado aqui. Serve uma frase
//  concreta que sem ele é impossível dizer:
//
//    «este dossiê foi feito sobre a versão de 26/07; o guia mudou a 06/08
//     — vê o que mudou.»
//
//  Duas regras de construção, e as duas são a diferença entre uma
//  impressão útil e uma impressão decorativa:
//
//   1. É SOBRE OS DADOS, não sobre a apresentação. Dois dossiês do mesmo
//      guia, com as mesmas respostas, dão a mesma impressão mesmo que o
//      markdown mude de formato.
//
//   2. NÃO INCLUI O INSTANTE DA COMPOSIÇÃO nem o consentimento. Se
//      incluísse, cada abertura da folha daria uma impressão nova e a
//      pergunta «é o mesmo dossiê?» deixaria de ter resposta. O instante
//      vive em `fixado.compostoEm`, que é o sítio dele.
// ═══════════════════════════════════════════════════════════════════════

import type { DossieDeGuia, SeccaoDossie } from "./tipos";

/**
 * Serialização canónica: chaves ordenadas, `undefined` fora.
 *
 * `JSON.stringify` respeita a ordem de inserção das chaves — dois objetos
 * com os mesmos valores por ordem diferente dariam hashes diferentes, e a
 * impressão passaria a depender de em que ramo do código o objeto foi
 * construído.
 */
export function canonico(valor: unknown): string {
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor) ?? "null";
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  const entradas = Object.entries(valor as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${canonico(v)}`).join(",")}}`;
}

/** O que entra na impressão: o guia, a versão lida e as secções incluídas. */
export interface MateriaDaImpressao {
  slug: string;
  revistoEm: string;
  appVersion: string;
  seccoes: readonly SeccaoDossie[];
  nota?: string;
}

/**
 * sha-256, em hexadecimal minúsculo, sem prefixo.
 *
 * WebCrypto e não `node:crypto`: isto corre no browser, na folha de
 * composição, antes de haver servidor nenhum envolvido. `crypto.subtle`
 * existe no Node desde a 18 e em qualquer browser servido por HTTPS.
 */
export async function impressaoDe(materia: MateriaDaImpressao): Promise<string> {
  const texto = canonico({
    slug: materia.slug,
    revistoEm: materia.revistoEm,
    appVersion: materia.appVersion,
    nota: materia.nota ?? null,
    seccoes: materia.seccoes
      .filter((s) => s.incluida)
      .map((s) => ({ id: s.id, itens: s.itens })),
  });

  const cripto = globalThis.crypto;
  if (!cripto?.subtle) {
    throw new Error("WebCrypto indisponível: não é possível calcular a impressão do dossiê.");
  }
  const buffer = await cripto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Abreviada para leitura humana: `8f3k2m…a91c`. */
export const impressaoCurta = (impressao: string): string =>
  impressao.length <= 16 ? impressao : `${impressao.slice(0, 12)}…${impressao.slice(-4)}`;

/** A forma que a base de dados exige (`^[0-9a-f]{64}$`). */
export const IMPRESSAO_VALIDA = /^[0-9a-f]{64}$/;

/**
 * Recalcula a impressão de um dossiê e compara-a com a que ele declara.
 *
 * É o que permite à consola dizer «este dossiê não foi alterado desde que
 * foi enviado» sem ter de guardar uma segunda cópia para comparar.
 */
export async function impressaoConfere(dossie: DossieDeGuia): Promise<boolean> {
  const recalculada = await impressaoDe({
    slug: dossie.guia.slug,
    revistoEm: dossie.fixado.revistoEm,
    appVersion: dossie.fixado.appVersion,
    seccoes: dossie.seccoes,
    nota: dossie.nota,
  });
  return recalculada === dossie.fixado.impressao;
}
