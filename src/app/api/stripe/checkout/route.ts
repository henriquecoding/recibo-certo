import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { STRIPE_CONFIG, type PlanoIntervalo } from "@/lib/stripe/config";
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

    const body = (await req.json()) as { intervalo?: PlanoIntervalo };
    const intervalo = body.intervalo ?? "annual";
    const priceId = STRIPE_CONFIG.prices[intervalo];

    if (!priceId) {
      return NextResponse.json({ erro: "Preço não configurado." }, { status: 500 });
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_types: ["card", "mb_way", "multibanco"],
      success_url: STRIPE_CONFIG.checkoutSuccessUrl,
      cancel_url: STRIPE_CONFIG.checkoutCancelUrl,
      subscription_data: {
        metadata: { supabase_uid: user.id },
      },
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
