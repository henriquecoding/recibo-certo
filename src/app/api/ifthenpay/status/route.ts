// GET /api/ifthenpay/status?orderId=X
// Polling de estado do pagamento (cada 5s pelo frontend, timeout 3 min)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb  = createClient(url, key);
  const { data } = await sb.from("pagamentos").select("estado").eq("order_id", orderId).single();
  return NextResponse.json({ status: (data?.estado as string) ?? "pending" });
}
