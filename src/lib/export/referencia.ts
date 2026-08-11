// ─────────────────────────────────────────────────────────────────────
//  Proveniência — referência, impressão digital e versão do motor
//  ---------------------------------------------------------------------
//  Um relatório financeiro sem proveniência é uma folha impressa. Quem o
//  recebe não sabe quem o gerou, com que versão do motor, a partir de que
//  dados, nem como confirmar que é autêntico.
//
//  A resposta NÃO é assinar digitalmente. Um certificado qualificado obriga a
//  gerir chaves num ambiente efémero, e a faixa verde do Acrobat diz «este
//  ficheiro não foi alterado desde que a ReciboCerto o assinou» — não diz «os
//  números estão certos». Vender selo por exatidão é prometer o que não se
//  cumpre.
//
//  A resposta é uma referência legível, uma impressão digital dos DADOS e uma
//  página que confirma a emissão sem expor nada.
// ─────────────────────────────────────────────────────────────────────

import { APP_VERSION } from "@/lib/version";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { ORIGEM_CANONICA } from "@/lib/origem";

/**
 * Alfabeto sem I, O, 0 e 1 — os quatro carateres que as pessoas trocam ao ler
 * uma referência em voz alta ao telefone, que é exatamente o que acontece
 * quando alguém liga ao contabilista com o documento à frente.
 */
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const COMPRIMENTO_SUFIXO = 6;

/** Tipos de documento, no código da referência. */
export const TIPOS_DOCUMENTO = {
  vencimento: "VNC",
  irs: "IRS",
  recibos: "RCB",
  cenarios: "CEN",
  auditoria: "AUD",
} as const;

export type TipoDocumento = keyof typeof TIPOS_DOCUMENTO;

function bytesAleatorios(n: number): Uint8Array {
  const buffer = new Uint8Array(n);
  const cripto = globalThis.crypto;
  if (cripto?.getRandomValues) {
    cripto.getRandomValues(buffer);
    return buffer;
  }
  // Sem WebCrypto (ambientes antigos): a referência é um identificador, não
  // um segredo — a unicidade é garantida pelo registo de emissão.
  for (let i = 0; i < n; i++) buffer[i] = Math.floor(Math.random() * 256);
  return buffer;
}

/**
 * Referência legível e pronunciável: `RC-2026-VNC-8F3K2M`.
 * Marca · ano fiscal · tipo · sufixo aleatório.
 */
export function gerarReferencia(tipo: TipoDocumento, ano: number = FISCAL_YEAR): string {
  const bytes = bytesAleatorios(COMPRIMENTO_SUFIXO);
  let sufixo = "";
  for (let i = 0; i < COMPRIMENTO_SUFIXO; i++) sufixo += ALFABETO[bytes[i] % ALFABETO.length];
  return `RC-${ano}-${TIPOS_DOCUMENTO[tipo]}-${sufixo}`;
}

const RE_REFERENCIA = new RegExp(
  `^RC-\\d{4}-(${Object.values(TIPOS_DOCUMENTO).join("|")})-[${ALFABETO}]{${COMPRIMENTO_SUFIXO}}$`,
);

/** Valida o formato de uma referência (para a rota pública de verificação). */
export const referenciaValida = (referencia: string): boolean => RE_REFERENCIA.test(referencia);

/**
 * Serialização canónica: chaves ordenadas em profundidade, números já
 * arredondados pelo motor. Sem isto, `{a:1,b:2}` e `{b:2,a:1}` — os mesmos
 * dados — davam impressões digitais diferentes.
 */
export function canonico(valor: unknown): string {
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor) ?? "null";
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  const entradas = Object.entries(valor as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${canonico(v)}`).join(",")}}`;
}

/**
 * Impressão digital SHA-256 dos DADOS, não do PDF.
 *
 * Do PDF seria inútil: dois PDF do mesmo cálculo diferem porque a data de
 * criação muda, e a impressão digital deixaria de significar o que se quer que
 * signifique — «foi este cálculo que gerou este documento».
 */
export async function digestDados(dados: unknown): Promise<string> {
  const texto = canonico(dados);
  const cripto = globalThis.crypto;
  if (!cripto?.subtle) throw new Error("WebCrypto indisponível: não é possível calcular a impressão digital.");
  const buffer = await cripto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Impressão digital abreviada para impressão: `8f3k2m…a91c` (12 + 4). */
export const digestCurto = (digest: string): string =>
  digest.length <= 16 ? digest : `${digest.slice(0, 12)}…${digest.slice(-4)}`;

/** Proveniência completa, tal como aparece no bloco de verificação. */
export interface Proveniencia {
  referencia: string;
  digest: string;
  /** Versão da aplicação que produziu o documento. */
  motor: string;
  /** Ano das tabelas fiscais aplicadas. */
  anoFiscal: number;
  /** Instante da emissão, ISO 8601. */
  emitidoEm: string;
  /** URL público onde a emissão pode ser confirmada. */
  verificacao: string;
}

/**
 * Base pública do site, para o URL de verificação impresso nos documentos.
 *
 * RC-CFG-001: é a origem CANÓNICA, e não `appUrl()`. Um PDF sobrevive ao
 * ambiente que o produziu — quem o receber daqui a um ano tem de poder
 * escrever o endereço e chegar ao site. Um URL de pré-visualização, ou um
 * `localhost`, tornaria o documento inverificável no momento em que mais
 * conta. (Antes lia uma `NEXT_PUBLIC_SITE_URL` que ninguém definia em lado
 * nenhum, com o apex como recurso — ou seja, sempre o apex.)
 */
export const BASE_PUBLICA = ORIGEM_CANONICA;

export async function criarProveniencia(
  tipo: TipoDocumento,
  dados: unknown,
  agora: Date = new Date(),
): Promise<Proveniencia> {
  const referencia = gerarReferencia(tipo);
  return {
    referencia,
    digest: await digestDados(dados),
    motor: APP_VERSION,
    anoFiscal: FISCAL_YEAR,
    emitidoEm: agora.toISOString(),
    verificacao: `${BASE_PUBLICA}/v/${referencia}`,
  };
}
