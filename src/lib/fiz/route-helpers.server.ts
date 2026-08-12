// ═══════════════════════════════════════════════════════════════════════
//  AUXILIARES DAS ROTAS /api/integrations/fiz/*
//  ---------------------------------------------------------------------
//  Um erro da FIZ nunca deve virar um 500 opaco: traduz-se num estado que a
//  interface sabe apresentar. Os registos não incluem payload fiscal
//  (ponto 15.2 da arquitetura) — só código, estado e request id.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";

import { NextResponse } from "next/server";
import { FizError, MENSAGEM_UTILIZADOR, type CodigoErroFiz } from "./errors";

const STATUS_HTTP: Record<CodigoErroFiz, number> = {
  desligada: 503,
  sem_credenciais: 503,
  nao_autorizado: 401,
  nao_encontrado: 404,
  conflito: 409,
  invalido: 400,
  limite_excedido: 429,
  indisponivel: 503,
  circuito_aberto: 503,
  destino_recusado: 502,
};

/** Estas rotas leem estado por utilizador — nunca podem ser cacheadas.
    Vale para os erros tanto como para os sucessos: um 401 guardado num
    intermediário deixa o utilizador trancado fora depois de se autenticar. */
export const semCache = { "cache-control": "no-store, max-age=0" } as const;

export interface CorpoErro {
  erro: string;
  codigo: CodigoErroFiz;
  /** true quando a interface deve degradar em silêncio, sem alarmar. */
  silencioso: boolean;
  requestId?: string;
}

export function respostaErro(erro: unknown): NextResponse<CorpoErro> {
  if (erro instanceof FizError) {
    if (!erro.silencioso) {
      console.warn("[fiz] erro", { codigo: erro.codigo, status: erro.status, requestId: erro.requestId });
    }
    return NextResponse.json(
      {
        erro: MENSAGEM_UTILIZADOR[erro.codigo],
        codigo: erro.codigo,
        silencioso: erro.silencioso,
        requestId: erro.requestId,
      },
      { status: STATUS_HTTP[erro.codigo], headers: semCache },
    );
  }

  console.error("[fiz] erro inesperado", erro instanceof Error ? erro.message : "desconhecido");
  return NextResponse.json(
    { erro: MENSAGEM_UTILIZADOR.indisponivel, codigo: "indisponivel" as const, silencioso: false },
    { status: 503, headers: semCache },
  );
}

export const naoAutenticado = () =>
  NextResponse.json(
    { erro: "Autenticação necessária.", codigo: "nao_autorizado" as const, silencioso: false },
    { status: 401, headers: semCache },
  );
