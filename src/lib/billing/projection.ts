import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { associarCustomer } from "@/lib/billing/customers";
import { validarPrecoQueConcedePlus } from "@/lib/billing/prices";
import { foiLimiteAtingido } from "@/lib/plus/vitalicio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BillingOrphanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingOrphanError";
  }
}

export interface ProjectionResult {
  kind: "subscription" | "lifetime" | "pending" | "refunded";
  userId: string | null;
  email: string | null;
  status: string;
  recognized: boolean;
  reason?: string;
}

function objectId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function userForCustomer(customerId: string, hint?: string | null): Promise<{
  userId: string;
  email: string | null;
}> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const hintedUserId = hint?.match(UUID) ? hint : null;
  let userId: string | null = null;
  let email: string | null = null;

  const { data: mapped, error: mappedError } = await sb.from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (mappedError) throw new Error(`Falha ao resolver Customer: ${mappedError.message}`);
  userId = (mapped?.user_id as string | undefined) ?? null;

  // O caminho normal não precisa de uma chamada Stripe por subscrição. A
  // associação customer→user é única e a Auth/Profile já contém o email.
  if (userId) {
    const { data: profile, error: profileError } = await sb.from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new Error(`Falha ao ler email de faturação: ${profileError.message}`);
    return { userId, email: (profile?.email as string | undefined) ?? null };
  }

  userId = hintedUserId;

  const customer = await getStripe().customers.retrieve(customerId);
  if (!("deleted" in customer && customer.deleted)) {
    email = customer.email ?? null;
    if (!userId && customer.metadata?.supabase_uid?.match(UUID)) {
      userId = customer.metadata.supabase_uid;
    }
  }

  // Migração de clientes antigos sem metadata. O email da Auth é único, mas
  // este é apenas o último recurso; a associação estável fica guardada logo a seguir.
  if (!userId && email) {
    const { data, error } = await sb.from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (error) throw new Error(`Falha ao resolver perfil de faturação: ${error.message}`);
    userId = (data?.id as string | undefined) ?? null;
  }

  if (!userId) throw new BillingOrphanError(`Customer ${customerId} sem utilizador correspondente.`);
  await associarCustomer(userId, customerId);
  return { userId, email };
}

async function purga(userId: string, cancel: boolean): Promise<void> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const { error } = await sb.rpc(cancel ? "cancelar_purga" : "agendar_purga", {
    p_user_id: userId,
  });
  if (error) throw new Error(`Falha ao ${cancel ? "cancelar" : "agendar"} purga: ${error.message}`);
}

function currentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const end = Math.max(0, ...subscription.items.data.map((item) => item.current_period_end ?? 0));
  return end ? new Date(end * 1000).toISOString() : null;
}

export async function syncSubscription(subscriptionId: string): Promise<ProjectionResult> {
  const stripe = getStripe();
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = objectId(subscription.customer);
  if (!customerId) throw new BillingOrphanError(`Subscrição ${subscription.id} sem Customer.`);
  const owner = await userForCustomer(customerId, subscription.metadata.supabase_uid);
  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;
  const recurring = item?.price?.recurring?.interval;
  const recognized = priceId
    ? await validarPrecoQueConcedePlus(priceId, recurring === "month" ? "mensal" : undefined)
    : false;

  const { data: previous, error: previousError } = await sb.from("subscriptions")
    .select("revogacao_motivo")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (previousError) throw new Error(`Falha ao ler projeção anterior: ${previousError.message}`);
  const disputed = String(previous?.revogacao_motivo ?? "").startsWith("dispute_");
  const projectedStatus = disputed ? (previous?.revogacao_motivo === "dispute_open" ? "paused" : "canceled") : subscription.status;

  const row: Record<string, unknown> = {
    user_id: owner.userId,
    origem: "stripe",
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: projectedStatus,
    price_id: priceId,
    intervalo: recurring === "year" ? "annual" : "monthly",
    inicio: new Date(subscription.start_date * 1000).toISOString(),
    cancelado_em: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    periodo_atual_termina_em: currentPeriodEnd(subscription),
    stripe_sincronizado_em: new Date().toISOString(),
  };
  if (projectedStatus !== "past_due") row.periodo_graca_termina_em = null;
  if (!disputed) {
    row.revogado_em = null;
    row.revogacao_motivo = null;
  }

  const { error } = await sb.from("subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) throw new Error(`Falha ao persistir subscrição: ${error.message}`);

  const accessNow = recognized && ["active", "trialing"].includes(projectedStatus);
  await purga(owner.userId, accessNow);
  if (!recognized) {
    console.error("[billing] Subscrição sem preço reconhecido; guardada sem acesso.", {
      subscription: subscription.id,
      price_id: priceId,
    });
  }
  return {
    kind: "subscription",
    userId: owner.userId,
    email: owner.email,
    status: projectedStatus,
    recognized,
  };
}

async function refundLifetime(paymentIntent: string, reason: string): Promise<void> {
  await getStripe().refunds.create({
    payment_intent: paymentIntent,
    reason: "requested_by_customer",
    metadata: { app: "recibocerto", reason },
  }, { idempotencyKey: `recibocerto-lifetime-refund-${paymentIntent}` });
}

async function cancelRecurringAfterLifetime(userId: string): Promise<void> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const { data, error } = await sb.from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .eq("origem", "stripe")
    .in("status", ["active", "trialing", "past_due"])
    .not("stripe_subscription_id", "is", null);
  if (error) throw new Error(`Falha ao procurar mensalidade anterior: ${error.message}`);

  await Promise.all((data ?? []).map(async (row) => {
    const id = row.stripe_subscription_id as string;
    await getStripe().subscriptions.update(id, { cancel_at_period_end: true }, {
      idempotencyKey: `recibocerto-lifetime-cancel-${id}`,
    });
  }));
}

async function syncLifetime(session: Stripe.Checkout.Session): Promise<ProjectionResult> {
  const stripe = getStripe();
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const paymentIntent = objectId(session.payment_intent);
  const customerId = objectId(session.customer);
  if (!paymentIntent || !customerId) {
    throw new BillingOrphanError(`Checkout ${session.id} sem pagamento ou Customer.`);
  }
  const owner = await userForCustomer(
    customerId,
    session.metadata?.supabase_uid ?? session.client_reference_id,
  );

  let priceId = session.line_items?.data[0]?.price?.id ?? null;
  if (!priceId) {
    const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
    priceId = lines.data[0]?.price?.id ?? null;
  }
  const recognized = priceId
    ? await validarPrecoQueConcedePlus(priceId, "vitalicio")
    : false;
  if (!recognized) {
    await refundLifetime(paymentIntent, "unrecognized_price");
    return {
      kind: "refunded", userId: owner.userId, email: owner.email,
      status: "refunded", recognized: false, reason: "Preço não reconhecido; reembolso automático.",
    };
  }

  const { data: samePayment, error: sameError } = await sb.from("subscriptions")
    .select("user_id")
    .eq("stripe_payment_intent", paymentIntent)
    .maybeSingle();
  if (sameError) throw new Error(`Falha ao verificar pagamento repetido: ${sameError.message}`);
  if (samePayment) {
    if (samePayment.user_id !== owner.userId) throw new BillingOrphanError("Pagamento associado a outra conta.");
    return { kind: "lifetime", userId: owner.userId, email: owner.email, status: "active", recognized: true };
  }

  const { data: previousLifetime, error: previousError } = await sb.from("subscriptions")
    .select("id")
    .eq("user_id", owner.userId)
    .in("origem", ["vitalicio", "manual"])
    .in("status", ["active", "trialing", "past_due", "paused"])
    .limit(1);
  if (previousError) throw new Error(`Falha ao verificar acesso vitalício: ${previousError.message}`);
  if (previousLifetime?.length) {
    await refundLifetime(paymentIntent, "duplicate_lifetime");
    return {
      kind: "refunded", userId: owner.userId, email: owner.email,
      status: "refunded", recognized: true, reason: "A conta já tinha acesso vitalício.",
    };
  }

  const { error } = await sb.from("subscriptions").upsert({
    user_id: owner.userId,
    origem: "vitalicio",
    status: "active",
    intervalo: "lifetime",
    price_id: priceId,
    stripe_payment_intent: paymentIntent,
    stripe_checkout_session_id: session.id,
    stripe_customer_id: customerId,
    concessao_termina_em: null,
    stripe_sincronizado_em: new Date().toISOString(),
    revogado_em: null,
    revogacao_motivo: null,
  }, { onConflict: "stripe_payment_intent" });

  if (error) {
    if (foiLimiteAtingido(error) || error.code === "23505") {
      await refundLifetime(paymentIntent, foiLimiteAtingido(error) ? "capacity_reached" : "duplicate_lifetime");
      return {
        kind: "refunded", userId: owner.userId, email: owner.email,
        status: "refunded", recognized: true,
        reason: "O lugar deixou de estar disponível; o pagamento foi reembolsado automaticamente.",
      };
    }
    throw new Error(`Falha ao persistir compra vitalícia: ${error.message}`);
  }

  await purga(owner.userId, true);
  await cancelRecurringAfterLifetime(owner.userId);
  return { kind: "lifetime", userId: owner.userId, email: owner.email, status: "active", recognized: true };
}

export async function syncCheckoutSession(sessionId: string): Promise<ProjectionResult> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price"],
  });
  if (session.mode === "subscription") {
    const subscriptionId = objectId(session.subscription);
    if (!subscriptionId) return {
      kind: "pending", userId: null, email: null,
      status: session.payment_status, recognized: false,
    };
    return syncSubscription(subscriptionId);
  }
  if (session.mode !== "payment" || session.payment_status !== "paid") return {
    kind: "pending", userId: null, email: null,
    status: session.payment_status, recognized: false,
  };
  return syncLifetime(session);
}

async function paymentIntentOfCharge(charge: Stripe.Charge): Promise<string | null> {
  return objectId(charge.payment_intent);
}

async function userIdsForPaymentIntent(paymentIntent: string): Promise<string[]> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const { data, error } = await sb.from("subscriptions")
    .select("user_id")
    .eq("stripe_payment_intent", paymentIntent)
    .eq("origem", "vitalicio");
  if (error) throw new Error(`Falha ao procurar compra vitalícia: ${error.message}`);
  return [...new Set((data ?? []).map((row) => row.user_id as string))];
}

export async function revokeRefundedLifetime(charge: Stripe.Charge): Promise<void> {
  // Webhooks podem chegar fora de ordem; a consulta atual impede que uma
  // fotografia antiga de reembolso parcial esconda um reembolso total posterior.
  const current = await getStripe().charges.retrieve(charge.id);
  if (!current.refunded && current.amount_refunded < current.amount) return;
  const paymentIntent = await paymentIntentOfCharge(current);
  if (!paymentIntent) return;
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const users = await userIdsForPaymentIntent(paymentIntent);
  const { error } = await sb.from("subscriptions").update({
    status: "canceled",
    cancelado_em: new Date().toISOString(),
    revogado_em: new Date().toISOString(),
    revogacao_motivo: "refund",
  }).eq("stripe_payment_intent", paymentIntent).eq("origem", "vitalicio");
  if (error) throw new Error(`Falha ao revogar reembolso: ${error.message}`);
  await Promise.all(users.map((userId) => purga(userId, false)));
}

async function invoiceSubscription(invoiceId: string): Promise<string | null> {
  const invoice = await getStripe().invoices.retrieve(invoiceId);
  if (invoice.parent?.type === "subscription_details") {
    return objectId(invoice.parent.subscription_details?.subscription);
  }
  return objectId((invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription);
}

async function invoiceForPaymentIntent(paymentIntent: string): Promise<string | null> {
  const payments = await getStripe().invoicePayments.list({
    limit: 1,
    payment: { type: "payment_intent", payment_intent: paymentIntent },
  });
  return objectId(payments.data[0]?.invoice);
}

export async function handleDispute(dispute: Stripe.Dispute): Promise<void> {
  const stripe = getStripe();
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  // Tal como nas subscrições, projetamos o estado canónico atual e não a
  // fotografia potencialmente atrasada transportada pelo evento.
  const currentDispute = await stripe.disputes.retrieve(dispute.id);
  const chargeId = objectId(currentDispute.charge);
  if (!chargeId) return;
  const charge = await stripe.charges.retrieve(chargeId);
  const paymentIntent = await paymentIntentOfCharge(charge);
  const restored = currentDispute.status === "won" || currentDispute.status === "warning_closed";
  const open = !["won", "warning_closed", "lost"].includes(currentDispute.status);

  if (paymentIntent) {
    const users = await userIdsForPaymentIntent(paymentIntent);
    const { error } = await sb.from("subscriptions").update(restored ? {
      status: "active", revogado_em: null, revogacao_motivo: null, cancelado_em: null,
    } : {
      status: open ? "paused" : "canceled",
      revogado_em: new Date().toISOString(),
      revogacao_motivo: open ? "dispute_open" : "dispute_lost",
      ...(open ? {} : { cancelado_em: new Date().toISOString() }),
    }).eq("stripe_payment_intent", paymentIntent).eq("origem", "vitalicio");
    if (error) throw new Error(`Falha ao projetar disputa vitalícia: ${error.message}`);
    if (restored) await Promise.all(users.map((userId) => purga(userId, true)));
    if (!open && !restored) await Promise.all(users.map((userId) => purga(userId, false)));
  }

  const invoiceId = paymentIntent ? await invoiceForPaymentIntent(paymentIntent) : null;
  if (!invoiceId) return;
  const subscriptionId = await invoiceSubscription(invoiceId);
  if (!subscriptionId) return;
  const { data: row, error: rowError } = await sb.from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (rowError) throw new Error(`Falha ao localizar subscrição disputada: ${rowError.message}`);
  if (restored) {
    const { error } = await sb.from("subscriptions").update({ revogado_em: null, revogacao_motivo: null })
      .eq("stripe_subscription_id", subscriptionId);
    if (error) throw new Error(`Falha ao limpar disputa: ${error.message}`);
    await syncSubscription(subscriptionId);
  } else {
    if (!open) {
      // Uma disputa perdida não pode deixar uma subscrição a cobrar enquanto
      // a projeção local permanece revogada. A leitura antes do cancelamento
      // torna a repetição segura mesmo depois de expirar a idempotência HTTP.
      const current = await stripe.subscriptions.retrieve(subscriptionId);
      if (current.status !== "canceled") {
        await stripe.subscriptions.cancel(subscriptionId, {
          invoice_now: false,
          prorate: false,
        }, { idempotencyKey: `recibocerto-dispute-lost-${currentDispute.id}` });
      }
    }
    const { error } = await sb.from("subscriptions").update({
      status: open ? "paused" : "canceled",
      revogado_em: new Date().toISOString(),
      revogacao_motivo: open ? "dispute_open" : "dispute_lost",
      ...(open ? {} : { cancelado_em: new Date().toISOString() }),
    }).eq("stripe_subscription_id", subscriptionId);
    if (error) throw new Error(`Falha ao suspender subscrição disputada: ${error.message}`);
    if (!open && row?.user_id) await purga(row.user_id as string, false);
  }
}

export function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  if (invoice.parent?.type === "subscription_details") {
    return objectId(invoice.parent.subscription_details?.subscription);
  }
  return objectId((invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription);
}
