// ═══════════════════════════════════════════════════════════════════════
//  EFEITO DE UM EVENTO DA FIZ
//  ---------------------------------------------------------------------
//  Vivia dentro do `route.ts` do webhook, o que tornava impossível voltar a
//  aplicar um evento que falhasse: o único caminho para `processar` era um
//  pedido HTTP da FIZ, e esse pedido já tinha sido respondido com 202.
//
//  Agora tem dois consumidores:
//   · o webhook, em linha, à chegada do evento;
//   · `/api/integrations/fiz/webhooks/reprocessar`, que apanha as linhas de
//     `partner_events` com `processed_at` a NULL — o índice
//     `partner_events_por_processar_idx` foi criado na 022 exatamente para
//     isto e nunca tinha sido usado por ninguém.
//
//  Tudo aqui é idempotente por construção: aplicar o mesmo evento duas vezes
//  dá o mesmo resultado que aplicá-lo uma. É o que permite reprocessar sem
//  medo, e o que a entrega at-least-once da FIZ exige de qualquer maneira.
// ═══════════════════════════════════════════════════════════════════════

import { invalidarCatalogo } from "@/lib/fiz/capabilities.server";
import { servicoSupabase, revogarPorPartnerUserId } from "@/lib/fiz/session.server";
import type { WebhookEvent } from "@/lib/fiz/contracts";

/** O identificador do sujeito do evento, para reconciliação. */
export function sujeitoDe(evento: WebhookEvent): string | null {
  const dados = evento.data as Record<string, unknown>;
  for (const chave of ["userId", "partnerUserId", "referralId", "handoffId", "declarationId", "obligationId"]) {
    const valor = dados?.[chave];
    if (typeof valor === "string") return valor;
  }
  return null;
}

export async function processar(evento: WebhookEvent): Promise<void> {
  switch (evento.type) {
    case "partner.capability.changed":
      // O catálogo em cache deixou de ser verdade.
      invalidarCatalogo();
      return;

    case "user.connection.revoked": {
      const partnerUserId = (evento.data as { partnerUserId?: string }).partnerUserId;
      if (partnerUserId) await revogarPorPartnerUserId(partnerUserId);
      return;
    }

    case "partner.handoff.accepted":
    case "partner.handoff.expired": {
      const sb = servicoSupabase();
      const id = (evento.data as { handoffId?: string; externalHandoffId?: string }).externalHandoffId;
      if (!sb || !id) return;
      await sb
        .from("partner_handoffs")
        .update({
          status: evento.type === "partner.handoff.accepted" ? "accepted" : "expired",
          accepted_at: evento.type === "partner.handoff.accepted" ? new Date().toISOString() : null,
        })
        .eq("external_handoff_id", id);
      return;
    }

    default:
      // Os restantes eventos (atribuição, comissões, estados de obrigações e
      // declarações) ficam registados em `partner_events` para reconciliação
      // e leitura sob procura. Não há estado local a atualizar: o Recibo
      // Certo não replica o livro fiscal da FIZ (ponto 13.5).
      return;
  }
}
