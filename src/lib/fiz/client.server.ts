// ═══════════════════════════════════════════════════════════════════════
//  CLIENTE HTTP DA PARTNER API DA FIZ
//  ---------------------------------------------------------------------
//  Único ponto do código que fala com partners-api.fiz.co. Trata de:
//    · token de parceiro (Client Credentials) com cache e renovação;
//    · Idempotency-Key e X-Request-Id em todas as escritas;
//    · timeout, circuito de proteção e erros RFC 7807;
//    · registo sem payload fiscal (ponto 15.2 da arquitetura).
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { randomUUID } from "node:crypto";
import { estadoIntegracao, fizServerConfig } from "./config";
import { FizError, codigoDeStatus, circuitoAberto, registarFalha, registarSucesso } from "./errors";
import type { Problem } from "./contracts";

const CIRCUITO = "fiz:partner-api";

interface TokenParceiro {
  accessToken: string;
  expiraEm: number;
}

// Um token por CONJUNTO DE SCOPES, não um só para tudo.
//
// Com uma cache única, o primeiro pedido fixava o token e todos os seguintes
// reutilizavam-no — incluindo os que precisavam de scopes que esse token não
// tinha. Resultado: 403 da FIZ em metade das operações, e só depois de
// existirem credenciais reais é que se veria. Nove chamadas neste módulo
// pedem nove conjuntos diferentes.
const tokensPorScope = new Map<string, TokenParceiro>();

/** Só para testes. */
export function limparTokenParceiro(): void {
  tokensPorScope.clear();
}

async function obterTokenParceiro(scopes: string[]): Promise<string> {
  const cfg = fizServerConfig();
  const agora = Date.now();
  const chaveCache = [...scopes].sort().join(" ");

  const guardado = tokensPorScope.get(chaveCache);
  if (guardado && guardado.expiraEm > agora + cfg.margemExpiracaoSegundos * 1000) {
    return guardado.accessToken;
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
    // Falhar a autenticação do parceiro é um sintoma de FIZ indisponível
    // tanto quanto qualquer 5xx — conta para o circuito, senão continuamos a
    // bater à porta a cada pedido.
    if (resposta.status >= 500) registarFalha(CIRCUITO);
    throw new FizError(codigoDeStatus(resposta.status), "Não foi possível autenticar o parceiro na FIZ.", {
      status: resposta.status,
    });
  }

  const dados = (await resposta.json()) as { access_token: string; expires_in: number };
  const token: TokenParceiro = {
    accessToken: dados.access_token,
    expiraEm: agora + (dados.expires_in ?? 300) * 1000,
  };
  tokensPorScope.set(chaveCache, token);
  return token.accessToken;
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

  // Este pedido leva credenciais — o token de parceiro ou o token delegado do
  // utilizador. Se alguma vez um caminho for construído de forma a mudar o
  // anfitrião, essas credenciais saem para fora da FIZ. Hoje todos os caminhos
  // são literais com `encodeURIComponent` nas partes dinâmicas; esta guarda
  // existe para que continue a ser verdade sem depender de vigilância.
  //
  // A comparação é com a ORIGEM CONFIGURADA e não com a lista de domínios da
  // FIZ: é mais apertada (uma origem exata, não um domínio inteiro) e não
  // impede apontar `FIZ_API_BASE_URL` a um servidor de simulação local.
  if (url.origin !== new URL(cfg.apiBaseUrl).origin) {
    throw new FizError("destino_recusado", "O pedido saía da origem configurada para a API da FIZ.");
  }

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
