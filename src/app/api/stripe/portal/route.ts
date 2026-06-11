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

    const stripe = getStripe();
    const clientes = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (clientes.data.length === 0) {
      return NextResponse.json({ erro: "Cliente Stripe não encontrado." }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: clientes.data[0].id,
      return_url: STRIPE_CONFIG.portalReturnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    return NextResponse.json(
      { erro: "Não foi possível abrir o portal de faturação." },
      { status: 500 },
    );
  }
}
