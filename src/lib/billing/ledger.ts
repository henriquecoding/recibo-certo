import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export type ClaimDecision = "process" | "processed" | "busy";

export async function claimStripeEvent(input: {
  id: string;
  type: string;
  created: number;
  objectId: string | null;
}): Promise<{ decision: ClaimDecision; attempt: number }> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const { data, error } = await sb.rpc("billing_claim_stripe_event", {
    p_event_id: input.id,
    p_event_type: input.type,
    p_stripe_created: input.created,
    p_object_id: input.objectId,
  });
  if (error) throw new Error(`Falha ao reivindicar webhook: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.decision) throw new Error("Ledger Stripe devolveu uma decisão vazia.");
  return { decision: row.decision as ClaimDecision, attempt: Number(row.attempt) };
}

export async function finishStripeEvent(
  eventId: string,
  status: "processed" | "failed" | "dead_letter",
  error?: unknown,
): Promise<void> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const message = error instanceof Error ? error.message : error ? String(error) : null;
  const { error: dbError } = await sb.rpc("billing_finish_stripe_event", {
    p_event_id: eventId,
    p_status: status,
    p_error: message?.replace(/[\r\n]+/g, " ").slice(0, 500) ?? null,
  });
  if (dbError) throw new Error(`Falha ao concluir webhook: ${dbError.message}`);
}
