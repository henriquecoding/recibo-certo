// GET+POST /api/ifthenpay/callback
// Recebe confirmação de pagamento do Ifthenpay
// Valida assinatura com IFTHENPAY_CALLBACK_SECRET e ativa plano Pro
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}
async function processar(orderId: string, val: string, chave: string) {
  const esperada = process.env.IFTHENPAY_CALLBACK_SECRET;
  if (chave !== esperada) return false;
  const sb = getAdmin();
  const { data: pag } = await sb.from("pagamentos").select("user_id").eq("order_id", orderId).single();
  if (!pag) return false;
  await sb.from("pagamentos").update({ estado: "paid", pago_em: new Date().toISOString() }).eq("order_id", orderId);
  await sb.from("subscriptions").upsert({
    user_id:  pag.user_id,
    status:   "active",
    intervalo: "annual",
    inicio:   new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "user_id" });
  return true;
}
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const ok = await processar(p.get("orderId") ?? "", p.get("val") ?? "", p.get("chave") ?? "");
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { orderId: string; val: string; chave: string };
  const ok = await processar(body.orderId, body.val, body.chave);
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
