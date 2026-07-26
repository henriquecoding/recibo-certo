// ═══════════════════════════════════════════════════════════════════════
//  LIGAÇÃO DE CONTA — OAuth 2.0 Authorization Code + PKCE
//  ---------------------------------------------------------------------
//  Ponto 7.1 da arquitetura. O Recibo Certo NUNCA recebe a palavra-passe da
//  FIZ, da AT ou da Segurança Social. Recebe apenas um código de uso único,
//  trocado no servidor por tokens.
//
//  O `state` e o `code_verifier` viajam num cookie assinado e efémero
//  (httpOnly, SameSite=Lax, 10 minutos) — nunca no localStorage, nunca no
//  URL de retorno.
// ═══════════════════════════════════════════════════════════════════════

import { createHash, randomBytes, createHmac } from "node:crypto";
import { fizServerConfig, redirectUri } from "./config";
import { FizError, codigoDeStatus } from "./errors";
import { comparaSegura } from "./tokens.server";
import { SCOPES_LIGACAO_BASICA } from "./contracts";

export const COOKIE_ESTADO = "fiz_oauth_state";
export const DURACAO_COOKIE_SEGUNDOS = 600;

export interface EstadoAutorizacao {
  state: string;
  nonce: string;
  codeVerifier: string;
  /** Quem iniciou a ligação. O callback é uma navegação do browser, sem
      cabeçalho Authorization — a identidade vem daqui, do estado assinado. */
  userId: string;
  /** Para onde voltar depois de ligar (rota interna, nunca absoluta). */
  regressoInterno: string;
}

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

/** Assina o pacote de estado para que não possa ser forjado no cliente. */
function assinar(carga: string): string {
  const segredo = fizServerConfig().clientSecret || fizServerConfig().tokenEncryptionKey;
  return createHmac("sha256", segredo).update(carga).digest("base64url");
}

export function selarEstado(estado: EstadoAutorizacao): string {
  const carga = base64url(Buffer.from(JSON.stringify(estado), "utf8"));
  return `${carga}.${assinar(carga)}`;
}

export function abrirEstado(selado: string): EstadoAutorizacao {
  const [carga, assinatura] = selado.split(".");
  if (!carga || !assinatura || !comparaSegura(assinatura, assinar(carga))) {
    throw new FizError("nao_autorizado", "Estado de autorização inválido ou adulterado.");
  }
  return JSON.parse(Buffer.from(carga, "base64url").toString("utf8")) as EstadoAutorizacao;
}

/** Só aceitamos regressar a rotas internas — evita redirecionamento aberto. */
export function regressoSeguro(destino: string | null | undefined): string {
  if (!destino) return "/dashboard";
  if (!destino.startsWith("/") || destino.startsWith("//")) return "/dashboard";
  return destino;
}

export interface InicioAutorizacao {
  url: string;
  cookie: string;
}

export function iniciarAutorizacao(
  userId: string,
  regresso: string,
  scopes: readonly string[] = SCOPES_LIGACAO_BASICA,
): InicioAutorizacao {
  const cfg = fizServerConfig();
  if (!cfg.clientId) throw new FizError("sem_credenciais", "FIZ_CLIENT_ID não está definido.");

  const codeVerifier = base64url(randomBytes(64));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  const estado: EstadoAutorizacao = {
    state: base64url(randomBytes(24)),
    nonce: base64url(randomBytes(16)),
    codeVerifier,
    userId,
    regressoInterno: regressoSeguro(regresso),
  };

  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", estado.state);
  url.searchParams.set("nonce", estado.nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return { url: url.toString(), cookie: selarEstado(estado) };
}

export interface TokensDelegados {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scopes: string[];
  partnerUserId?: string;
}

export async function trocarCodigo(codigo: string, codeVerifier: string): Promise<TokensDelegados> {
  const cfg = fizServerConfig();
  const corpo = new URLSearchParams({
    grant_type: "authorization_code",
    code: codigo,
    redirect_uri: redirectUri(),
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code_verifier: codeVerifier,
  });

  const resposta = await fetch(`${cfg.apiBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: corpo.toString(),
    cache: "no-store",
  });

  if (!resposta.ok) {
    throw new FizError(codigoDeStatus(resposta.status), "Não foi possível concluir a ligação à FIZ.", {
      status: resposta.status,
    });
  }

  const dados = (await resposta.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    user_id?: string;
  };

  return {
    accessToken: dados.access_token,
    refreshToken: dados.refresh_token,
    expiresIn: dados.expires_in ?? 3600,
    scopes: (dados.scope ?? "").split(" ").filter(Boolean),
    partnerUserId: dados.user_id,
  };
}

export async function renovarTokens(refreshToken: string): Promise<TokensDelegados> {
  const cfg = fizServerConfig();
  const corpo = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });

  const resposta = await fetch(`${cfg.apiBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: corpo.toString(),
    cache: "no-store",
  });

  if (!resposta.ok) {
    // 400/401 aqui significa que a ligação foi revogada do lado da FIZ.
    throw new FizError(codigoDeStatus(resposta.status), "A ligação à FIZ precisa de ser autorizada outra vez.", {
      status: resposta.status,
    });
  }

  const dados = (await resposta.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  return {
    accessToken: dados.access_token,
    refreshToken: dados.refresh_token ?? refreshToken,
    expiresIn: dados.expires_in ?? 3600,
    scopes: (dados.scope ?? "").split(" ").filter(Boolean),
  };
}
