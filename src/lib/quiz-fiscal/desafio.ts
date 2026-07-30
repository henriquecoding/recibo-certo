// ═══════════════════════════════════════════════════════════════════════
//  CONSTANTES DO DESAFIO, PARTILHADAS PELOS DOIS LADOS
//  ---------------------------------------------------------------------
//  O cliente precisa de saber que dificuldades abrem bilhete (para o pedir);
//  o servidor precisa de saber as mesmas (para o emitir e validar). Viviam só
//  em `server.ts`, que arrasta o `service_role` e não pode entrar num bundle
//  de browser.
//
//  Ficheiro sem dependências de propósito: é seguro importá-lo de qualquer
//  lado, e é o único sítio onde estes números existem.
// ═══════════════════════════════════════════════════════════════════════

/** Dificuldades que abrem sessão de desafio e dão prémio. */
export const DIFICULDADES_DE_DESAFIO = [2, 3] as const;

export type DificuldadeDesafio = (typeof DIFICULDADES_DE_DESAFIO)[number];

/** Perguntas por sessão de desafio. Espelhado no CHECK da migração 028. */
export const PERGUNTAS_SESSAO_DESAFIO = 10;

export function éDificuldadeDeDesafio(v: unknown): v is DificuldadeDesafio {
  return (DIFICULDADES_DE_DESAFIO as readonly unknown[]).includes(v);
}
