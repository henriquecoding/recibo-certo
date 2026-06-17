// POST /api/email/auditoria
//
// Envia ao próprio utilizador (Pro) o relatório da auditoria ao recibo de
// vencimento. Recalcula no servidor (não confia no cliente) e valida que o
// utilizador tem subscrição ativa.

import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { enviarEmail } from "@/lib/email/send";
import { emailAuditoriaRecibo } from "@/lib/email/templates";
import { auditarRecibo } from "@/lib/fiscal-dependente";

function clienteAutenticado(req: NextRequest): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = req.headers.get("authorization");
  if (!url || !anonKey || !authHeader) return null;
  return createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
}

export async function POST(req: NextRequest) {
  const sb = clienteAutenticado(req);
  if (!sb) return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });

  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user?.email) return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });

  // Verificar plano Pro (RLS limita a subscrição ao próprio utilizador).
  const { data: subs } = await sb
    .from("subscriptions")
    .select("status")
    .in("status", ["active", "trialing"])
    .limit(1);
  if (!subs || subs.length === 0) {
    return NextResponse.json({ erro: "Funcionalidade Pro." }, { status: 403 });
  }

  const body = (await req.json()) as {
    salarioBruto?: number;
    dependentes?: number;
    irsDeclarado?: number;
    ssDeclarado?: number;
  };

  const salarioBruto = Math.max(0, Number(body.salarioBruto) || 0);
  const dependentes = Math.max(0, Math.floor(Number(body.dependentes) || 0));
  const irsDeclarado = Math.max(0, Number(body.irsDeclarado) || 0);
  const ssDeclarado = Math.max(0, Number(body.ssDeclarado) || 0);

  const r = auditarRecibo({ salarioBruto, dependentes, irsDeclarado, ssDeclarado });
  const tpl = emailAuditoriaRecibo({
    salarioBruto,
    ssEsperado: r.ssEsperado,
    irsEsperado: r.irsEsperado,
    ssDeclarado,
    irsDeclarado,
    tudoOk: r.tudoOk,
    alertas: r.alertas,
  });

  const res = await enviarEmail({ to: user.email, ...tpl });
  if (res.erro) return NextResponse.json({ erro: res.erro }, { status: 500 });
  return NextResponse.json({ ok: true });
}
