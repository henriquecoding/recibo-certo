// ═══════════════════════════════════════════════════════════════════════
//  RECEÇÃO DE EVENTOS DA FIZ
//  ---------------------------------------------------------------------
//  Ponto 14 da arquitetura. Entrega at-least-once, por isso:
//    · assinatura HMAC sobre os BYTES BRUTOS (nunca sobre o JSON reserializado);
//    · tolerância de relógio limitada e proteção contra repetição;
//    · idempotência por `partner_event_id`;
//    · resposta rápida — o processamento pesado fica para depois.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fizServerConfig } from "./config";
import { WEBHOOK_HEADERS, WEBHOOK_EVENT_TYPES, type WebhookEvent, type WebhookEventType } from "./contracts";

export type ResultadoVerificacao =
  | { valido: true; evento: WebhookEvent }
  | { valido: false; motivo: string; estado: 400 | 401 };

interface CabecalhosWebhook {
  get(nome: string): string | null;
}

/** Assinatura esperada: "v1=<hex sha256>" sobre `<timestamp>.<corpo>`. */
function assinaturaEsperada(timestamp: string, corpoBruto: string, segredo: string): string {
  const hmac = createHmac("sha256", segredo).update(`${timestamp}.${corpoBruto}`).digest("hex");
  return `v1=${hmac}`;
}

function igualEmTempoConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Verifica um evento recebido. `corpoBruto` TEM de ser o texto exato do
 * pedido — reserializar o JSON quebra a assinatura.
 */
export function verificarEvento(cabecalhos: CabecalhosWebhook, corpoBruto: string): ResultadoVerificacao {
  const segredo = fizServerConfig().webhookSecret;
  if (!segredo) return { valido: false, motivo: "Webhook não configurado.", estado: 401 };

  const id = cabecalhos.get(WEBHOOK_HEADERS.id);
  const timestamp = cabecalhos.get(WEBHOOK_HEADERS.timestamp);
  const assinatura = cabecalhos.get(WEBHOOK_HEADERS.signature);

  if (!id || !timestamp || !assinatura) {
    return { valido: false, motivo: "Faltam cabeçalhos de assinatura.", estado: 400 };
  }
  if (!/^v1=[a-f0-9]{64}$/.test(assinatura)) {
    return { valido: false, motivo: "Formato de assinatura inválido.", estado: 400 };
  }

  // Proteção contra repetição: um evento antigo reenviado por um atacante
  // deixa de ser aceite depois da janela de tolerância.
  const enviadoEm = Number(timestamp);
  if (!Number.isFinite(enviadoEm)) {
    return { valido: false, motivo: "Timestamp inválido.", estado: 400 };
  }
  const desvioSegundos = Math.abs(Date.now() / 1000 - enviadoEm);
  if (desvioSegundos > fizServerConfig().toleranciaWebhookSegundos) {
    return { valido: false, motivo: "Evento fora da janela de tolerância.", estado: 401 };
  }

  if (!igualEmTempoConstante(assinatura, assinaturaEsperada(timestamp, corpoBruto, segredo))) {
    return { valido: false, motivo: "Assinatura inválida.", estado: 401 };
  }

  let evento: WebhookEvent;
  try {
    evento = JSON.parse(corpoBruto) as WebhookEvent;
  } catch {
    return { valido: false, motivo: "Corpo não é JSON válido.", estado: 400 };
  }

  if (!evento?.id || !evento?.type) {
    return { valido: false, motivo: "Envelope incompleto.", estado: 400 };
  }
  if (!WEBHOOK_EVENT_TYPES.includes(evento.type)) {
    return { valido: false, motivo: `Tipo de evento desconhecido: ${evento.type}.`, estado: 400 };
  }
  if (evento.id !== id) {
    return { valido: false, motivo: "O id do envelope não coincide com o cabeçalho.", estado: 400 };
  }

  return { valido: true, evento };
}

// ─── Registo de eventos já processados ─────────────────────────────────
//  Camada em memória por instância. A garantia real de idempotência é a
//  restrição UNIQUE (partner, partner_event_id) em `partner_events` — esta
//  cache só evita trabalho repetido dentro do mesmo processo.

const processados = new Map<string, number>();
const JANELA_MS = 60 * 60 * 1000;

export function jaProcessado(eventoId: string): boolean {
  const visto = processados.get(eventoId);
  if (visto === undefined) return false;
  if (Date.now() - visto > JANELA_MS) {
    processados.delete(eventoId);
    return false;
  }
  return true;
}

export function marcarProcessado(eventoId: string): void {
  processados.set(eventoId, Date.now());
  if (processados.size > 5_000) {
    const limite = Date.now() - JANELA_MS;
    for (const [chave, quando] of processados) if (quando < limite) processados.delete(chave);
  }
}

export function limparEventosProcessados(): void {
  processados.clear();
}

/** Eventos que exigem ação imediata do nosso lado. */
export const EVENTOS_ACIONAVEIS: readonly WebhookEventType[] = [
  "partner.capability.changed", // invalidar o catálogo em cache
  "user.connection.revoked", // apagar tokens da ligação
  "partner.handoff.accepted",
  "partner.handoff.expired",
  "user.obligation.action_required",
  "user.declaration.status_changed",
  "user.invoice.status_changed",
];
