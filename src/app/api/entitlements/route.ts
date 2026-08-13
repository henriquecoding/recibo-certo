import { NextResponse } from "next/server";
import { estadoAcessoDoUtilizador } from "@/lib/billing/access";
import { userDoPedido } from "@/lib/supabase/verify-request-user";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await userDoPedido(req);
  if (!user) return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  try {
    const state = await estadoAcessoDoUtilizador(user.id);
    return NextResponse.json(state, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[entitlements]", error);
    return NextResponse.json({ erro: "Não foi possível confirmar o plano." }, { status: 503 });
  }
}
