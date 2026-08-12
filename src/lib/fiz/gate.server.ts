// ═══════════════════════════════════════════════════════════════════════
//  A PORTA DO SERVIDOR PARA A INTEGRAÇÃO FIZ — RC-FIZ-002
//  ---------------------------------------------------------------------
//  As rotas `/api/integrations/fiz/*` não consultavam bandeira nenhuma.
//  Aceitavam pedidos — incluindo handoffs, que enviam dados de uma pessoa
//  para um terceiro — independentemente de a integração estar ligada ou não.
//
//  E não bastava passarem a ler `NEXT_PUBLIC_FIZ_ENABLED`: essa variável é
//  inlined NO BUILD. Um build publicado enquanto a integração estava ligada
//  continuaria a dizer "ligada" para sempre, mesmo depois de alguém a
//  desligar no painel. Uma bandeira que não se consegue baixar sem um deploy
//  não é um interruptor de segurança.
//
//  Por isso são DUAS variáveis, com papéis distintos:
//
//    NEXT_PUBLIC_FIZ_ENABLED  o que o browser MOSTRA (build time)
//    FIZ_ENABLED              o que o servidor ACEITA (runtime)
//
//  As duas falham fechadas. Baixar a do servidor tem efeito imediato, sem
//  rebuild — que é o que se quer de um travão.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { NextResponse } from "next/server";
import { semCache } from "./route-helpers.server";

/**
 * O servidor aceita pedidos da integração?
 *
 * Falha fechada, e só a string exata `"true"` abre. Note-se que NÃO lê a
 * variável do cliente: é intencional, e está explicado no cabeçalho.
 */
export function fizAtivaNoServidor(): boolean {
  return process.env.FIZ_ENABLED === "true";
}

/**
 * Resposta para uma rota da integração com a porta fechada.
 *
 * 503 e não 404: o recurso existe e volta a existir quando a integração for
 * ligada. E nada de detalhes de configuração no corpo — quem está do lado de
 * fora não precisa de saber que variável falta.
 */
export function portaFechada(): NextResponse {
  return NextResponse.json(
    {
      erro: "A integração com a FIZ está desligada.",
      codigo: "desligada" as const,
      silencioso: true,
    },
    { status: 503, headers: semCache },
  );
}

/* ── Diagnóstico ─────────────────────────────────────────────────────────
   A readiness anterior podia ficar verde com client id, secret e chave de
   cifra — sem webhook secret, sem service role e sem versão de contrato. Ou
   seja, dizia "pronta" a uma integração que não conseguia receber um webhook
   nem provar durabilidade.

   Aqui a pergunta é feita capacidade a capacidade, e cada uma diz O QUE LHE
   FALTA. Nomes de variáveis, nunca valores. */

export type Capacidade = "connect" | "read" | "handoff" | "webhook" | "revoke";

/** Que variáveis cada capacidade exige para poder sequer ser tentada. */
const EXIGENCIAS: Record<Capacidade, string[]> = {
  // Ligar uma conta: OAuth completo + cifra dos refresh tokens em repouso.
  connect: ["FIZ_CLIENT_ID", "FIZ_CLIENT_SECRET", "FIZ_TOKEN_ENCRYPTION_KEY", "FIZ_API_BASE_URL"],
  // Ler obrigações/prazos: precisa da ligação já feita.
  read: ["FIZ_CLIENT_ID", "FIZ_CLIENT_SECRET", "FIZ_API_BASE_URL"],
  // Enviar dados de uma pessoa exige, além da API, onde gravar a prova local
  // do consentimento ANTES de a rede ser tocada.
  handoff: ["FIZ_CLIENT_ID", "FIZ_CLIENT_SECRET", "FIZ_API_BASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  // Receber webhooks sem segredo de assinatura é aceitar o que qualquer um
  // enviar; sem persistência, é processar sem auditoria.
  webhook: ["FIZ_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY"],
  // Revogar precisa de chegar à API e de conseguir decifrar o token guardado.
  revoke: ["FIZ_CLIENT_ID", "FIZ_CLIENT_SECRET", "FIZ_API_BASE_URL", "FIZ_TOKEN_ENCRYPTION_KEY"],
};

export interface EstadoCapacidade {
  pronta: boolean;
  /** Nomes das variáveis em falta. NUNCA os valores. */
  emFalta: string[];
}

export interface DiagnosticoFiz {
  /** A porta do servidor está aberta? */
  ativa: boolean;
  /** A bandeira de apresentação (do build) concorda com a do servidor? */
  bandeiraClienteAtiva: boolean;
  /** Todas as capacidades prontas. */
  pronta: boolean;
  capacidades: Record<Capacidade, EstadoCapacidade>;
  /**
   * Versão do contrato partner acordada com a FIZ.
   *
   * ⚠️ RC-FIZ-001: enquanto isto for `null`, não existe contrato bilateral
   * verificado e nenhuma capacidade deve ser considerada pronta, por mais
   * credenciais que estejam definidas. A API pública da FIZ documentada hoje
   * usa `x-api-key` por conta; o que este código implementa (OAuth, hosts
   * partner, handoffs, webhooks) não está publicado como contrato.
   */
  versaoContrato: string | null;
}

function definida(nome: string): boolean {
  const v = process.env[nome];
  return typeof v === "string" && v.trim().length > 0;
}

export function diagnosticoFiz(): DiagnosticoFiz {
  const versaoContrato = process.env.FIZ_CONTRACT_VERSION?.trim() || null;

  const capacidades = Object.fromEntries(
    (Object.keys(EXIGENCIAS) as Capacidade[]).map((cap) => {
      const emFalta = EXIGENCIAS[cap].filter((nome) => !definida(nome));
      // Sem contrato acordado, nenhuma capacidade fica pronta — ainda que
      // todas as variáveis estejam lá. É a diferença entre "consigo chamar" e
      // "estou autorizado a chamar".
      const pronta = emFalta.length === 0 && versaoContrato !== null;
      return [cap, { pronta, emFalta: versaoContrato === null ? [...emFalta, "FIZ_CONTRACT_VERSION"] : emFalta }];
    }),
  ) as Record<Capacidade, EstadoCapacidade>;

  return {
    ativa: fizAtivaNoServidor(),
    bandeiraClienteAtiva: process.env.NEXT_PUBLIC_FIZ_ENABLED === "true",
    pronta: Object.values(capacidades).every((c) => c.pronta),
    capacidades,
    versaoContrato,
  };
}

/**
 * Guarda para o topo de uma rota da integração.
 *
 * Devolve a resposta a enviar quando a porta está fechada, ou `null` para
 * seguir. Usa-se assim, e é a primeira linha do handler:
 *
 *     const fechada = guardaFiz();
 *     if (fechada) return fechada;
 */
export function guardaFiz(): NextResponse | null {
  return fizAtivaNoServidor() ? null : portaFechada();
}
