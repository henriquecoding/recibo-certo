// POST /api/ifthenpay/mbway
// Inicia pagamento MB WAY via Ifthenpay (Caminho B — gateway nativo PT)
// { telefone: string, valor: number, userId: string, orderId: string }
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}
export async function POST(req: NextRequest) {
  const { telefone, valor, userId, orderId } = (await req.json()) as {
    telefone: string; valor: number; userId: string; orderId: string;
  };
  if (!telefone || !valor || !userId || !orderId)
    return NextResponse.json({ erro: "Parâmetros em falta." }, { status: 400 });
  if (!/^(9[1236]\d{7})$/.test(telefone))
    return NextResponse.json({ erro: "Número de telemóvel inválido (9 dígitos PT)." }, { status: 400 });
  const res = await fetch("https://ifthenpay.com/api/mbway/set/json/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      MbWayKey:     process.env.IFTHENPAY_MBWAY_KEY,
      orderId,
      amount:       valor.toFixed(2),
      mobileNumber: `351#${telefone}`,
      email:        "",
      description:  "Recibo Certo Pro",
    }),
  });
  if (!res.ok) return NextResponse.json({ erro: "Falha na API Ifthenpay." }, { status: 502 });
  const data = (await res.json()) as { IdPedido: string; RequestId: string; Message: string };
  // Guardar pedido no Supabase para validação posterior
  await getAdmin().from("pagamentos").insert({
    order_id:   orderId,
    user_id:    userId,
    metodo:     "mbway",
    valor,
    request_id: data.RequestId,
    estado:     "pending",
    criado_em:  new Date().toISOString(),
  });
  return NextResponse.json({ requestId: data.RequestId, mensagem: data.Message });
}
