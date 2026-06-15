// POST /api/ls/portal
//
// Devolve a URL do portal de cliente do Lemon Squeezy, guardada no
// Supabase quando o webhook subscription_created é processado.
// O utilizador pode gerir a subscrição, cancelar, mudar método de
// pagamento, etc. — tudo na interface nativa da LS.

import { NextResponse, type NextRequest } from "next/server";
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

    // Procurar a URL do portal na subscrição ativa
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!sbUrl || !sbKey) {
      return NextResponse.json({ erro: "Supabase não configurado." }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization")!;
    const sb = createClient(sbUrl, sbKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data } = await sb
      .from("subscriptions")
      .select("customer_portal_url, ls_subscription_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .not("ls_subscription_id", "is", null)
      .order("criado_em", { ascending: false })
      .limit(1)
      .single();

    if (!data?.customer_portal_url) {
      return NextResponse.json(
        { erro: "Portal não disponível. A subscrição pode ainda não ter sido processada." },
        { status: 404 },
      );
    }

    return NextResponse.json({ url: data.customer_portal_url });
  } catch (err) {
    console.error("[ls/portal]", err);
    return NextResponse.json(
      { erro: "Não foi possível obter o portal." },
      { status: 500 },
    );
  }
}
