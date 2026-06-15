// POST /api/ifthenpay/multibanco
// Gera referência Multibanco via Ifthenpay
// { valor: number, userId: string, orderId: string }
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}
export async function POST(req: NextRequest) {
  const { valor, userId, orderId } = (await req.json()) as {
    valor: number; userId: string; orderId: string;
  };
  if (!valor || !userId || !orderId)
    return NextResponse.json({ erro: "Parâmetros em falta." }, { status: 400 });
  const res = await fetch("https://ifthenpay.com/api/multibanco/reference/json/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      MbKey:      process.env.IFTHENPAY_MB_KEY,
      orderId,
      amount:     valor.toFixed(2),
      expiryDays: 2, // 48h — confiança elevada + risco nulo de chargeback
    }),
  });
  if (!res.ok) return NextResponse.json({ erro: "Falha na API Ifthenpay." }, { status: 502 });
  const data = (await res.json()) as { Entidade: string; Referencia: string; RequestId: string };
  await getAdmin().from("pagamentos").insert({
    order_id:   orderId,
    user_id:    userId,
    metodo:     "multibanco",
    valor,
    entidade:   data.Entidade,
    referencia: data.Referencia,
    estado:     "pending",
    criado_em:  new Date().toISOString(),
  });
  return NextResponse.json({ entidade: data.Entidade, referencia: data.Referencia, valor });
}
