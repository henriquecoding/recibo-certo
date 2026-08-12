// ═══════════════════════════════════════════════════════════════════════
//  CIFRA DE TOKENS DELEGADOS EM REPOUSO
//  ---------------------------------------------------------------------
//  Ponto 15.2 da arquitetura: "cifragem em trânsito e repouso". Os refresh
//  tokens da FIZ nunca ficam em claro na base de dados.
//
//  AES-256-GCM com nonce aleatório por operação. Formato guardado:
//    v1.<iv base64url>.<tag base64url>.<ciphertext base64url>
//
//  A chave vem de FIZ_TOKEN_ENCRYPTION_KEY (32 bytes em base64) e existe
//  apenas no servidor. Sem chave, a ligação de conta é recusada — nunca se
//  guarda um token em claro como alternativa.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { fizServerConfig } from "./config";
import { FizError } from "./errors";

const ALGORITMO = "aes-256-gcm";
const PREFIXO = "v1";
const TAMANHO_IV = 12;

function chave(): Buffer {
  const bruta = fizServerConfig().tokenEncryptionKey;
  if (!bruta) {
    throw new FizError("sem_credenciais", "FIZ_TOKEN_ENCRYPTION_KEY não está definida.");
  }
  const buffer = Buffer.from(bruta, "base64");
  if (buffer.length !== 32) {
    throw new FizError("sem_credenciais", "FIZ_TOKEN_ENCRYPTION_KEY tem de ter 32 bytes codificados em base64.");
  }
  return buffer;
}

export function cifrarToken(valor: string): string {
  const iv = randomBytes(TAMANHO_IV);
  const cifra = createCipheriv(ALGORITMO, chave(), iv);
  const cifrado = Buffer.concat([cifra.update(valor, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return [PREFIXO, iv.toString("base64url"), tag.toString("base64url"), cifrado.toString("base64url")].join(".");
}

export function decifrarToken(guardado: string): string {
  const partes = guardado.split(".");
  if (partes.length !== 4 || partes[0] !== PREFIXO) {
    throw new FizError("invalido", "Token guardado em formato desconhecido.");
  }
  const [, ivB64, tagB64, cifradoB64] = partes;
  try {
    const decifra = createDecipheriv(ALGORITMO, chave(), Buffer.from(ivB64, "base64url"));
    decifra.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([decifra.update(Buffer.from(cifradoB64, "base64url")), decifra.final()]).toString("utf8");
  } catch {
    // Falha de autenticação do GCM: o valor foi adulterado ou a chave mudou.
    throw new FizError("nao_autorizado", "Não foi possível decifrar o token da ligação FIZ.");
  }
}

/** Comparação em tempo constante — usada em `state` de OAuth e nonces. */
export function comparaSegura(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
