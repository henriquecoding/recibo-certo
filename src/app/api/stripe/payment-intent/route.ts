// POST /api/stripe/payment-intent
//
// Cria um SetupIntent para o Stripe Payment Elements com suporte a MB WAY.
// Usado pelo EmbeddedCheckout quando o utilizador escolhe pagar via MB WAY
// em vez do checkout hosted da Lemon Squeezy.
//
// Fluxo MB WAY (Stripe):
//   1. Cliente → POST /api/stripe/payment-intent (obtém client_secret)
//   2. Cliente → renderiza <PaymentElement> com client_secret
//   3. Utilizador → confirma no telemóvel em 3 minutos
//   4. Stripe → webhook payment_intent.succeeded → libertar acesso Pro

import { NextResponse, type NextRequest } from "next/server";
import { getStripe, stripeConfigurado } from "@/lib/stripe/server";
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
  if (!stripeConfigurado()) {
    return NextResponse.json({ erro: "Stripe não configurado." }, { status: 500 });
  }

  const user = await obterUtilizador(req);
  if (!user) {
    return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  }

  const stripe = getStripe();

  // Encontrar ou criar cliente Stripe
  const existentes = await stripe.customers.list({ email: user.email, limit: 1 });
  const customer = existentes.data.length > 0
    ? existentes.data[0]
    : await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_uid: user.id },
      });

  // SetupIntent — confirma o método de pagamento sem cobrar imediatamente
  // O MB WAY exige allow_redirects: "always" para o fluxo de confirmação push
  const intent = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ["mb_way", "multibanco", "card"],
    // Timeout do MB WAY: 3 minutos (180 segundos)
    // Configurado no dashboard Stripe → Payment Methods → MB WAY
    metadata: {
      supabase_uid: user.id,
      checkout_type: "mbway_embedded",
    },
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    customerId: customer.id,
  });
}
