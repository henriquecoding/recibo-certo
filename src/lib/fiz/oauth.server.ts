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

import "server-only";
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
  /** Instante de emissão, em segundos. Ver `abrirEstado`. */
  emitidoEm?: number;
}

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

/**
 * Assina o pacote de estado para que não possa ser forjado no cliente.
 *
 * Sem segredo NÃO se assina com string vazia: um HMAC com chave "" é
 * perfeitamente reproduzível por qualquer pessoa, o que transformaria o
 * estado selado — que carrega o `userId` — em algo forjável à vontade.
 */
function assinar(carga: string): string {
  const cfg = fizServerConfig();
  const segredo = cfg.clientSecret || cfg.tokenEncryptionKey;
  if (!segredo) {
    throw new FizError("sem_credenciais", "Não há segredo para assinar o estado de autorização.");
  }
  return createHmac("sha256", segredo).update(carga).digest("base64url");
}

export function selarEstado(estado: EstadoAutorizacao): string {
  const carga = base64url(
    Buffer.from(JSON.stringify({ ...estado, emitidoEm: Math.floor(Date.now() / 1000) }), "utf8"),
  );
  return `${carga}.${assinar(carga)}`;
}

/**
 * Abre e valida o estado selado.
 *
 * O `Max-Age` do cookie não serve de prazo: é uma instrução ao browser, não
 * uma verificação do servidor. Quem obtenha o valor do cookie pode
 * reapresentá-lo mais tarde e a assinatura continua a bater certo. Por isso o
 * prazo vive DENTRO da carga assinada, onde não pode ser alterado.
 */
export function abrirEstado(selado: string): EstadoAutorizacao {
  const [carga, assinatura] = selado.split(".");
  if (!carga || !assinatura || !comparaSegura(assinatura, assinar(carga))) {
    throw new FizError("nao_autorizado", "Estado de autorização inválido ou adulterado.");
  }

  let estado: EstadoAutorizacao;
  try {
    estado = JSON.parse(Buffer.from(carga, "base64url").toString("utf8")) as EstadoAutorizacao;
  } catch {
    throw new FizError("nao_autorizado", "Estado de autorização ilegível.");
  }

  const idadeSegundos = Math.floor(Date.now() / 1000) - (estado.emitidoEm ?? 0);
  if (!estado.emitidoEm || idadeSegundos > DURACAO_COOKIE_SEGUNDOS || idadeSegundos < -60) {
    throw new FizError("nao_autorizado", "O pedido de ligação expirou. Tenta outra vez.");
  }
  if (!estado.userId || !estado.state || !estado.codeVerifier) {
    throw new FizError("nao_autorizado", "Estado de autorização incompleto.");
  }
  // Defesa em profundidade: o destino foi filtrado ao criar, mas quem o lê é
  // que redireciona — volta a passar pelo mesmo crivo.
  estado.regressoInterno = regressoSeguro(estado.regressoInterno);
  return estado;
}

const REGRESSO_POR_OMISSAO = "/dashboard";
/** Origem descartável, só para testar a resolução do caminho. */
const ORIGEM_DE_PROVA = "https://recibo-certo.invalid";

/**
 * Só aceitamos regressar a rotas internas — evita redirecionamento aberto.
 *
 * A versão anterior verificava `startsWith("/")` e `!startsWith("//")`, o que
 * parece suficiente e não é: o WHATWG URL normaliza a BARRA INVERTIDA para
 * barra em esquemas especiais, por isso `/\evil.com` passava no teste e
 * resolvia para `https://evil.com/`. Isto alimentava dois sítios — o
 * redirecionamento do callback de OAuth (phishing depois de uma ligação
 * legítima) e o `returnUrl` que entregamos à FIZ.
 *
 * Em vez de acrescentar mais um caso especial, passámos a decidir pela
 * resolução: se o caminho, resolvido contra uma origem de prova, sair dessa
 * origem, não é interno. É a mesma pergunta que o browser vai fazer.
 */
export function regressoSeguro(destino: string | null | undefined): string {
  if (!destino || destino.length > 512) return REGRESSO_POR_OMISSAO;
  // Barras invertidas, tabulações, quebras de linha e outros caracteres de
  // controlo são normalizados ou ignorados de forma diferente em cada
  // camada — não há motivo legítimo para os aceitar num caminho interno.
  if (/[\\\u0000-\u001f\u007f]/.test(destino)) return REGRESSO_POR_OMISSAO;
  if (!destino.startsWith("/") || destino.startsWith("//")) return REGRESSO_POR_OMISSAO;

  try {
    const resolvido = new URL(destino, ORIGEM_DE_PROVA);
    if (resolvido.origin !== ORIGEM_DE_PROVA) return REGRESSO_POR_OMISSAO;

    const normalizado = `${resolvido.pathname}${resolvido.search}${resolvido.hash}`;
    // A normalização pode PRODUZIR um caminho perigoso a partir de um inócuo:
    // `/..//evil.com` resolve para o caminho `//evil.com`, que é
    // protocolo-relativo e volta a apontar para fora quando for usado a
    // seguir. Por isso a verificação é feita sobre o resultado, não sobre a
    // entrada.
    if (normalizado.startsWith("//")) return REGRESSO_POR_OMISSAO;
    return normalizado;
  } catch {
    return REGRESSO_POR_OMISSAO;
  }
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

/**
 * As trocas de token são `fetch` direto (não passam pelo cliente de parceiro,
 * que exige a integração "pronta"). Sem prazo, uma FIZ pendurada pendura
 * também o nosso pedido — e o utilizador fica num ecrã de ligação que nunca
 * responde.
 */
async function pedirToken(corpo: URLSearchParams, mensagemErro: string): Promise<Response> {
  const cfg = fizServerConfig();
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), cfg.timeoutMs);
  try {
    return await fetch(`${cfg.apiBaseUrl}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: corpo.toString(),
      cache: "no-store",
      signal: controlador.signal,
    });
  } catch {
    throw new FizError("indisponivel", mensagemErro);
  } finally {
    clearTimeout(temporizador);
  }
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

  const resposta = await pedirToken(corpo, "Não foi possível concluir a ligação à FIZ.");

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

  const resposta = await pedirToken(corpo, "A ligação à FIZ precisa de ser autorizada outra vez.");

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
