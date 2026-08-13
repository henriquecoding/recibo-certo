import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { STRIPE_CONFIG } from "@/lib/stripe/config";
import { lugaresVitalicios } from "@/lib/plus/vitalicio-server";
import { userDoPedido } from "@/lib/supabase/verify-request-user";
import { estadoAcessoDoUtilizador } from "@/lib/billing/access";
import { obterOuCriarCustomer } from "@/lib/billing/customers";
import {
  resolverPrecoCheckout,
  STRIPE_INTEGRATION_IDENTIFIER,
  type ModalidadeCheckout,
} from "@/lib/billing/prices";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await userDoPedido(req);
  if (!user) return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.modalidade !== "mensal" && body?.modalidade !== "vitalicio") {
      return NextResponse.json({ erro: "Modalidade de pagamento inválida." }, { status: 400 });
    }
    const modalidade: ModalidadeCheckout = body.modalidade;
    const state = await estadoAcessoDoUtilizador(user.id);

    if (state.vitalicio) {
      return NextResponse.json({ erro: "A tua conta já tem Plus vitalício." }, { status: 409 });
    }
    if (modalidade === "mensal" && state.plano === "plus" && state.origem !== "cupao") {
      return NextResponse.json({ erro: "A tua conta já tem Plus ativo." }, { status: 409 });
    }
    if (
      modalidade === "mensal"
      && state.origem === "stripe"
      && ["active", "trialing", "past_due", "unpaid", "paused"].includes(state.status ?? "")
    ) {
      return NextResponse.json({
        erro: "Já existe faturação nesta conta. Atualiza o pagamento no portal em vez de criares outra subscrição.",
      }, { status: 409 });
    }
    if (modalidade === "vitalicio") {
      const places = await lugaresVitalicios();
      if (places.esgotado) {
        return NextResponse.json({
          erro: "Os lugares vitalícios não estão disponíveis. O Plus mensal continua disponível.",
          esgotado: true,
        }, { status: 409 });
      }
    }

    const [price, customer] = await Promise.all([
      resolverPrecoCheckout(modalidade),
      obterOuCriarCustomer(user),
    ]);
    const stripe = getStripe();

    // A projeção local pode estar alguns segundos atrás da Stripe. Confirmar
    // também na origem impede duas mensalidades quando a pessoa abre dois
    // separadores ou o primeiro webhook ainda está em trânsito.
    if (modalidade === "mensal") {
      const subscriptions = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
      const alreadyBilling = subscriptions.data.some((subscription) =>
        ["active", "trialing", "past_due", "unpaid", "paused"].includes(subscription.status));
      if (alreadyBilling) {
        return NextResponse.json({
          erro: "Já existe faturação nesta conta. Gere-a no portal em vez de criares outra subscrição.",
        }, { status: 409 });
      }
    }

    // Reutiliza uma sessão ainda aberta. Em conjunto com a chave idempotente,
    // isto cobre tanto pedidos simultâneos como um segundo clique minutos depois.
    const openSessions = await stripe.checkout.sessions.list({ customer, status: "open", limit: 20 });
    const reusable = openSessions.data.find((candidate) =>
      candidate.metadata?.supabase_uid === user.id
      && candidate.metadata?.modalidade === modalidade
      && candidate.metadata?.price_id === price.id
      && candidate.expires_at > Math.floor(Date.now() / 1000)
      && Boolean(candidate.url));
    if (reusable?.url) return NextResponse.json({ url: reusable.url, reutilizada: true });

    const bucket = Math.floor(Date.now() / (10 * 60_000));
    const session = await stripe.checkout.sessions.create({
      customer,
      customer_update: { address: "auto", name: "auto" },
      billing_address_collection: "auto",
      mode: modalidade === "vitalicio" ? "payment" : "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: STRIPE_CONFIG.checkoutSuccessUrl,
      cancel_url: STRIPE_CONFIG.checkoutCancelUrl,
      client_reference_id: user.id,
      integration_identifier: STRIPE_INTEGRATION_IDENTIFIER,
      metadata: { supabase_uid: user.id, modalidade, price_id: price.id },
      ...(modalidade === "vitalicio" ? {
        payment_intent_data: {
          metadata: { supabase_uid: user.id, price_id: price.id, modalidade },
        },
      } : {
        subscription_data: {
          metadata: { supabase_uid: user.id, price_id: price.id, modalidade },
        },
      }),
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      locale: "pt",
    }, {
      idempotencyKey: `recibocerto-checkout-${user.id}-${modalidade}-${bucket}`,
    });

    if (!session.url) throw new Error("A Stripe não devolveu o URL do checkout.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout]", error);
    return NextResponse.json({ erro: "Não foi possível iniciar o pagamento." }, { status: 503 });
  }
}
