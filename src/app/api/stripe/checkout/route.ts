import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { STRIPE_CONFIG } from "@/lib/stripe/config";
import { createClient } from "@supabase/supabase-js";

async function obterUtilizador(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const sb = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data } = await sb.auth.getUser();
  return data.user;
}

export async function POST(req: NextRequest) {
  try {
    const user = await obterUtilizador(req);
    if (!user) {
      return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
    }

    // Continua a não haver escadaria de planos: há UM conjunto de
    // funcionalidades (o Plus) e duas formas de o pagar — todos os meses,
    // ou uma vez para sempre. O corpo do pedido só escolhe a forma.
    const corpo = await req.json().catch(() => ({}));
    const vitalicio = corpo?.modalidade === "vitalicio";

    const priceId = vitalicio ? STRIPE_CONFIG.prices.vitalicio : STRIPE_CONFIG.prices.plus;

    if (!priceId) {
      return NextResponse.json(
        {
          erro: vitalicio
            ? "O preço vitalício não está configurado (STRIPE_PRICE_PLUS_LIFETIME)."
            : "Preço não configurado.",
        },
        { status: 500 },
      );
    }

    const stripe = getStripe();

    const existentes = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId: string;
    if (existentes.data.length > 0) {
      customerId = existentes.data[0].id;
    } else {
      const novo = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_uid: user.id },
      });
      customerId = novo.id;
    }

    // Uma compra única NÃO cria uma subscrição no Stripe — logo não há
    // `subscription_data`, não há `customer.subscription.created`, e o que
    // chega ao webhook é `checkout.session.completed` com `mode=payment`.
    // O `supabase_uid` viaja nos metadados da sessão E do pagamento, porque
    // é por lá que o webhook sabe a quem conceder.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: vitalicio ? "payment" : "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: STRIPE_CONFIG.checkoutSuccessUrl,
      cancel_url: STRIPE_CONFIG.checkoutCancelUrl,
      client_reference_id: user.id,
      metadata: { supabase_uid: user.id, modalidade: vitalicio ? "vitalicio" : "mensal" },
      ...(vitalicio
        ? { payment_intent_data: { metadata: { supabase_uid: user.id, price_id: priceId } } }
        : { subscription_data: { metadata: { supabase_uid: user.id } } }),
      locale: "pt",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json(
      { erro: "Não foi possível criar a sessão de pagamento." },
      { status: 500 },
    );
  }
}
