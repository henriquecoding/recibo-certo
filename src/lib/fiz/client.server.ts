// ═══════════════════════════════════════════════════════════════════════
//  CLIENTE HTTP DA PARTNER API DA FIZ
//  ---------------------------------------------------------------------
//  Único ponto do código que fala com partners-api.fiz.co. Trata de:
//    · token de parceiro (Client Credentials) com cache e renovação;
//    · Idempotency-Key e X-Request-Id em todas as escritas;
//    · timeout, circuito de proteção e erros RFC 7807;
//    · registo sem payload fiscal (ponto 15.2 da arquitetura).
// ═══════════════════════════════════════════════════════════════════════

import { randomUUID } from "node:crypto";
import { estadoIntegracao, fizServerConfig } from "./config";
import { FizError, codigoDeStatus, circuitoAberto, registarFalha, registarSucesso } from "./errors";
import type { Problem } from "./contracts";

const CIRCUITO = "fiz:partner-api";

interface TokenParceiro {
  accessToken: string;
  expiraEm: number;
}

let tokenCache: TokenParceiro | null = null;

/** Só para testes. */
export function limparTokenParceiro(): void {
  tokenCache = null;
}

async function obterTokenParceiro(scopes: string[]): Promise<string> {
  const cfg = fizServerConfig();
  const agora = Date.now();
  if (tokenCache && tokenCache.expiraEm > agora + cfg.margemExpiracaoSegundos * 1000) {
    return tokenCache.accessToken;
  }

  const corpo = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: scopes.join(" "),
  });

  const resposta = await fetchComTimeout(`${cfg.apiBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: corpo.toString(),
  });

  if (!resposta.ok) {
    throw new FizError(codigoDeStatus(resposta.status), "Não foi possível autenticar o parceiro na FIZ.", {
      status: resposta.status,
    });
  }

  const dados = (await resposta.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: dados.access_token,
    expiraEm: agora + (dados.expires_in ?? 300) * 1000,
  };
  return tokenCache.accessToken;
}

async function fetchComTimeout(url: string, init: RequestInit): Promise<Response> {
  const { timeoutMs } = fizServerConfig();
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controlador.signal, cache: "no-store" });
  } catch (erro) {
    const abortado = erro instanceof Error && erro.name === "AbortError";
    throw new FizError("indisponivel", abortado ? "A FIZ não respondeu a tempo." : "Não foi possível contactar a FIZ.");
  } finally {
    clearTimeout(temporizador);
  }
}

export interface PedidoFiz {
  caminho: string;
  metodo?: "GET" | "POST" | "DELETE";
  /** Scopes de parceiro. Omitir quando se usa `accessTokenUtilizador`. */
  scopes?: string[];
  /** Token delegado do utilizador (fluxo Authorization Code). */
  accessTokenUtilizador?: string;
  corpo?: unknown;
  /** Obrigatória em POST/DELETE pelo contrato. */
  idempotencyKey?: string;
  query?: Record<string, string | number | undefined>;
  /** 304 é uma resposta legítima do catálogo de capacidades. */
  aceitarNaoModificado?: boolean;
  cabecalhosExtra?: Record<string, string>;
}

export interface RespostaFiz<T> {
  dados: T | null;
  naoModificado: boolean;
  requestId?: string;
}

/**
 * Executa um pedido à Partner API.
 * Lança sempre `FizError` — quem chama decide se degrada ou propaga.
 */
export async function pedirFiz<T>(pedido: PedidoFiz): Promise<RespostaFiz<T>> {
  const estado = estadoIntegracao();
  if (estado !== "pronta") {
    throw new FizError(estado === "desligada" ? "desligada" : "sem_credenciais", "Integração FIZ não configurada.");
  }
  if (circuitoAberto(CIRCUITO)) {
    throw new FizError("circuito_aberto", "Integração FIZ em pausa após falhas consecutivas.");
  }

  const cfg = fizServerConfig();
  const metodo = pedido.metodo ?? "GET";
  const requestId = randomUUID();

  const url = new URL(`${cfg.apiBaseUrl}${pedido.caminho}`);
  for (const [chave, valor] of Object.entries(pedido.query ?? {})) {
    if (valor !== undefined) url.searchParams.set(chave, String(valor));
  }

  const cabecalhos: Record<string, string> = {
    accept: "application/json",
    "x-request-id": requestId,
    ...pedido.cabecalhosExtra,
  };

  if (pedido.accessTokenUtilizador) {
    cabecalhos.authorization = `Bearer ${pedido.accessTokenUtilizador}`;
  } else {
    cabecalhos.authorization = `Bearer ${await obterTokenParceiro(pedido.scopes ?? [])}`;
  }

  if (metodo !== "GET") {
    // O contrato exige Idempotency-Key com pelo menos 16 caracteres.
    cabecalhos["idempotency-key"] = pedido.idempotencyKey ?? randomUUID();
  }
  if (pedido.corpo !== undefined) cabecalhos["content-type"] = "application/json";

  let resposta: Response;
  try {
    resposta = await fetchComTimeout(url.toString(), {
      method: metodo,
      headers: cabecalhos,
      body: pedido.corpo === undefined ? undefined : JSON.stringify(pedido.corpo),
    });
  } catch (erro) {
    registarFalha(CIRCUITO);
    throw erro;
  }

  const respostaRequestId = resposta.headers.get("x-request-id") ?? requestId;

  if (resposta.status === 304 && pedido.aceitarNaoModificado) {
    registarSucesso(CIRCUITO);
    return { dados: null, naoModificado: true, requestId: respostaRequestId };
  }
  if (resposta.status === 204) {
    registarSucesso(CIRCUITO);
    return { dados: null, naoModificado: false, requestId: respostaRequestId };
  }

  if (!resposta.ok) {
    // Só 5xx contam para o circuito: um 404 ou um 422 são respostas válidas
    // da API, não sinal de que a API está em baixo.
    if (resposta.status >= 500) registarFalha(CIRCUITO);
    else registarSucesso(CIRCUITO);

    let detalhe = `A FIZ respondeu ${resposta.status}.`;
    try {
      const problema = (await resposta.json()) as Problem;
      if (problema?.title) detalhe = problema.detail ? `${problema.title}: ${problema.detail}` : problema.title;
    } catch {
      /* corpo não era problem+json */
    }
    throw new FizError(codigoDeStatus(resposta.status), detalhe, {
      status: resposta.status,
      requestId: respostaRequestId,
    });
  }

  registarSucesso(CIRCUITO);
  const dados = (await resposta.json()) as T;
  return { dados, naoModificado: false, requestId: respostaRequestId };
}
