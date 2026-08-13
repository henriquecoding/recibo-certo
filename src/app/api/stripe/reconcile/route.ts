import { NextResponse } from "next/server";
import { syncCheckoutSession } from "@/lib/billing/projection";
import { userDoPedido } from "@/lib/supabase/verify-request-user";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await userDoPedido(req);
  if (!user) return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!sessionId.match(/^cs_(?:live|test)_[A-Za-z0-9]+$/)) {
    return NextResponse.json({ erro: "Sessão de pagamento inválida." }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const owner = session.metadata?.supabase_uid ?? session.client_reference_id;
    if (owner !== user.id) {
      return NextResponse.json({ erro: "Esta sessão não pertence à tua conta." }, { status: 403 });
    }
    const result = await syncCheckoutSession(sessionId);
    if (result.kind === "pending") {
      return NextResponse.json({ pendente: true, status: result.status }, { status: 202 });
    }
    if (result.kind === "refunded") {
      return NextResponse.json({ reembolsado: true, mensagem: result.reason }, { status: 409 });
    }
    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    console.error("[stripe/reconcile]", error);
    return NextResponse.json({ erro: "Não foi possível confirmar o pagamento." }, { status: 503 });
  }
}
