import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { claimStripeEvent, finishStripeEvent } from "@/lib/billing/ledger";
import {
  BillingOrphanError,
  handleDispute,
  revokeRefundedCharge,
  subscriptionIdFromInvoice,
  syncCheckoutSession,
  syncSubscription,
} from "@/lib/billing/projection";
import { enviarEmail } from "@/lib/email/send";
import { emailSubscricaoAtivada, emailSubscricaoCancelada } from "@/lib/email/templates";

export const runtime = "nodejs";

function eventObjectId(event: Stripe.Event): string | null {
  const object = event.data.object as { id?: string };
  return object.id ?? null;
}

async function processEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const incoming = event.data.object as Stripe.Subscription;
      const result = await syncSubscription(incoming.id);
      const previousStatus = (event.data.previous_attributes as { status?: string } | undefined)?.status;
      const becameActive = event.type === "customer.subscription.created"
        || (
          event.type === "customer.subscription.updated"
          && Boolean(previousStatus)
          && !["active", "trialing"].includes(previousStatus ?? "")
        );
      if (
        becameActive
        && result.recognized
        && ["active", "trialing"].includes(result.status)
        && result.email
      ) {
        const interval = incoming.items.data[0]?.price?.recurring?.interval === "year" ? "annual" : "monthly";
        const template = emailSubscricaoAtivada(interval);
        const sent = await enviarEmail({
          to: result.email,
          ...template,
          idempotencyKey: `stripe-${event.id}-activated`,
        });
        if (sent.erro) throw new Error(`Email de ativação falhou: ${sent.erro}`);
      }
      if (event.type === "customer.subscription.deleted" && result.email) {
        const template = emailSubscricaoCancelada();
        const sent = await enviarEmail({
          to: result.email,
          ...template,
          idempotencyKey: `stripe-${event.id}-canceled`,
        });
        if (sent.erro) throw new Error(`Email de cancelamento falhou: ${sent.erro}`);
      }
      return;
    }
    case "invoice.payment_failed":
    case "invoice.paid": {
      const subscriptionId = subscriptionIdFromInvoice(event.data.object as Stripe.Invoice);
      if (subscriptionId) await syncSubscription(subscriptionId);
      return;
    }
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      await syncCheckoutSession((event.data.object as Stripe.Checkout.Session).id);
      return;
    }
    case "checkout.session.async_payment_failed":
      return;
    case "charge.refunded":
      await revokeRefundedCharge(event.data.object as Stripe.Charge);
      return;
    case "charge.dispute.created":
    case "charge.dispute.closed":
      await handleDispute(event.data.object as Stripe.Dispute);
      return;
    default:
      return;
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ erro: "Assinatura ou secret em falta." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 400 });
  }

  let claim: Awaited<ReturnType<typeof claimStripeEvent>>;
  try {
    claim = await claimStripeEvent({
      id: event.id,
      type: event.type,
      created: event.created,
      objectId: eventObjectId(event),
    });
  } catch (error) {
    console.error("[stripe/webhook] Ledger indisponível:", error);
    return NextResponse.json({ erro: "Ledger indisponível." }, { status: 503 });
  }

  if (claim.decision === "processed") {
    return NextResponse.json({ recebido: true, duplicado: true });
  }
  if (claim.decision === "busy") {
    return NextResponse.json({ erro: "Evento já está a ser processado." }, { status: 503 });
  }

  try {
    await processEvent(event);
    await finishStripeEvent(event.id, "processed");
    return NextResponse.json({ recebido: true });
  } catch (error) {
    const maxAttempts = error instanceof BillingOrphanError ? 3 : 8;
    const deadLetter = claim.attempt >= maxAttempts;
    console.error("[stripe/webhook] Falha de processamento:", {
      event: event.id,
      type: event.type,
      attempt: claim.attempt,
      dead_letter: deadLetter,
      error: error instanceof Error ? error.message : String(error),
    });
    try {
      await finishStripeEvent(event.id, deadLetter ? "dead_letter" : "failed", error);
    } catch (ledgerError) {
      console.error("[stripe/webhook] Falha ao registar erro:", ledgerError);
      return NextResponse.json({ erro: "Falha ao registar o processamento." }, { status: 503 });
    }
    if (deadLetter) return NextResponse.json({ recebido: true, dead_letter: true });
    return NextResponse.json({ erro: "Processamento temporariamente indisponível." }, { status: 503 });
  }
}
