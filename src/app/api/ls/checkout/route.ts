// POST /api/ls/checkout
//
// Cria uma sessão de checkout no Lemon Squeezy (MoR) e devolve a URL
// de redirecionamento. A LS trata de todo o IVA, cumprimento fiscal e
// emissão de faturas para o cliente.

import { NextResponse, type NextRequest } from "next/server";
import { criarCheckoutLS } from "@/lib/lemonsqueezy/server";
import { LS_CONFIG, variantIdParaIntervalo, type PlanoIntervalo } from "@/lib/lemonsqueezy/config";
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

    if (!LS_CONFIG.storeId || !LS_CONFIG.variantMonthly) {
      return NextResponse.json(
        { erro: "Lemon Squeezy não configurado. Define LS_STORE_ID e LS_VARIANT_* no .env." },
        { status: 500 },
      );
    }

    const body = (await req.json()) as { intervalo?: PlanoIntervalo };
    const intervalo = body.intervalo ?? "annual";
    const variantId = variantIdParaIntervalo(intervalo);

    const url = await criarCheckoutLS({
      storeId:     LS_CONFIG.storeId,
      variantId,
      email:       user.email ?? undefined,
      supabaseUid: user.id,
      buttonColor: LS_CONFIG.checkoutButtonColor,
      successUrl:  LS_CONFIG.successUrl,
      cancelUrl:   LS_CONFIG.cancelUrl,
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[ls/checkout]", err);
    return NextResponse.json(
      { erro: "Não foi possível criar o checkout." },
      { status: 500 },
    );
  }
}
