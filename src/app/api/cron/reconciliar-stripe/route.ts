import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-auth";
import { getStripe } from "@/lib/stripe/server";
import { syncCheckoutSession, syncSubscription } from "@/lib/billing/projection";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONCURRENCY = 10;

async function emLotes<T>(
  items: readonly T[],
  run: (item: T) => Promise<void>,
): Promise<void> {
  for (let index = 0; index < items.length; index += CONCURRENCY) {
    await Promise.all(items.slice(index, index + CONCURRENCY).map(run));
  }
}

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const stripe = getStripe();
  let subscriptions = 0;
  let lifetimeSessions = 0;
  const errors: string[] = [];

  const current = await stripe.subscriptions
    .list({ status: "all", limit: 100 })
    .autoPagingToArray({ limit: 500 });
  await emLotes(current, async (subscription) => {
    try {
      await syncSubscription(subscription.id);
      subscriptions += 1;
    } catch (error) {
      errors.push(`subscription:${subscription.id}:${error instanceof Error ? error.message : String(error)}`);
    }
  });

  const recent = await stripe.checkout.sessions.list({
    created: { gte: Math.floor(Date.now() / 1000) - 2 * 86_400 },
    limit: 100,
  });
  const paidLifetime = recent.data.filter((session) => (
    session.mode === "payment" && session.payment_status === "paid"
  ));
  await emLotes(paidLifetime, async (session) => {
    try {
      await syncCheckoutSession(session.id);
      lifetimeSessions += 1;
    } catch (error) {
      errors.push(`checkout:${session.id}:${error instanceof Error ? error.message : String(error)}`);
    }
  });

  if (errors.length) {
    console.error("[cron/reconciliar-stripe]", errors.slice(0, 20));
    return NextResponse.json({ subscriptions, lifetimeSessions, errors: errors.length }, { status: 503 });
  }
  return NextResponse.json({ subscriptions, lifetimeSessions, errors: 0 });
}
