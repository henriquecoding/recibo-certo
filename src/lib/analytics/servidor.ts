// ═══════════════════════════════════════════════════════════════════════
//  EVENTOS DE SERVIDOR — os que o browser não pode afirmar
//  ---------------------------------------------------------------------
//  Quatro factos comerciais só são verdade quando um sistema fora do
//  browser o diz: um pagamento confirmado por webhook, um postback do
//  parceiro, uma lead aceite, uma lead ganha. O catálogo marca-os como
//  `origem: "servidor"` e a rota `/api/analytics` recusa-os; é aqui que
//  entram, chamados a partir dos webhooks e das rotas que os processam.
//
//  A diferença prática: `plus_checkout_start` mede intenção e pode vir do
//  cliente; `plus_checkout_complete` mede RECEITA e só o Stripe a pode
//  confirmar. Misturar os dois é como o §17.1 avisa — «separar checkout de
//  retenção» começa por separar quem tem autoridade para declarar cada um.
//
//  `click_id` também nasce aqui (§8.2: «gerar click_id server-side para o
//  FIZ e parceiros»), porque um identificador de atribuição gerado no
//  cliente é um identificador que qualquer pessoa pode repetir.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { CATALOGO, type NomeEvento, type PayloadsEvento } from "./eventos";
import { verificarSemPII } from "./pii";

/** Ator para eventos que não pertencem a uma sessão de navegação. */
export const ATOR_SISTEMA = "sistema";

/**
 * Regista um evento a partir do servidor. Nunca lança: falhar a medir uma
 * receita não pode fazer falhar o webhook que a confirmou — o dinheiro já
 * entrou, e devolver erro ao Stripe só provocaria uma repetição inútil.
 */
export async function registarNoServidor<N extends NomeEvento>(
  nome: N,
  props: PayloadsEvento[N],
  contexto: { ator?: string; sessao?: string } = {},
): Promise<void> {
  try {
    if (!CATALOGO[nome]) return;

    const verificacao = verificarSemPII(props);
    if (!verificacao.ok) {
      console.warn(`[analytics] evento de servidor "${nome}" recusado: ${verificacao.motivo}`);
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !chave) return;

    const sb = createClient(url, chave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await sb.from("analytics_eventos").insert({
      nome,
      ator: contexto.ator ?? ATOR_SISTEMA,
      sessao: contexto.sessao ?? ATOR_SISTEMA,
      props: props as Record<string, unknown>,
      ocorrido_em: new Date().toISOString(),
    });
  } catch (erro) {
    console.warn("[analytics] evento de servidor não registado:", erro);
  }
}

/**
 * Gera um `click_id` para uma referência a parceiro.
 *
 * O §8.2 é explícito: «Não depender apenas do cookie do parceiro.» Este
 * identificador é nosso, viaja no link, é registado do nosso lado no
 * momento do clique e é a chave com que se reconcilia o postback. Se o
 * cookie do parceiro se perder — bloqueador, browser, dispositivo
 * diferente — a atribuição não desaparece connosco.
 */
export function novoClickId(): string {
  return randomUUID();
}

/**
 * Dias entre o clique e o desfecho — o `lag_days` do §8.1.
 *
 * Interessa porque define a janela de atribuição a negociar no contrato
 * (§13.1: «evento remunerado, janela, fraude, cancelamento, clawback»).
 * Sem o medir, a janela é uma adivinha.
 */
export function diasDeDesfasamento(clique: Date, desfecho: Date): number {
  const ms = desfecho.getTime() - clique.getTime();
  return ms > 0 ? Math.floor(ms / 86_400_000) : 0;
}
