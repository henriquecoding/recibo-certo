import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { proximosPrazos, diasAte } from "@/lib/prazos";
import { enviarEmail } from "@/lib/email/send";
import { emailAlertaPrazo } from "@/lib/email/templates";

const DIAS_ALERTA = 7;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ erro: "Supabase não configurado." }, { status: 500 });
  }

  const agora = new Date();
  const prazos = proximosPrazos(agora, 10)
    .map((p) => ({ ...p, diasAte: diasAte(p.data, agora) }))
    .filter((p) => p.diasAte >= 0 && p.diasAte <= DIAS_ALERTA);

  if (prazos.length === 0) {
    return NextResponse.json({ msg: "Sem prazos nos próximos 7 dias.", enviados: 0 });
  }

  const { data: subs } = await sb
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ msg: "Sem subscritores Pro ativos.", enviados: 0 });
  }

  const userIds = subs.map((s) => s.user_id);
  const { data: profiles } = await sb
    .from("profiles")
    .select("email")
    .in("id", userIds);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ msg: "Sem perfis encontrados.", enviados: 0 });
  }

  const template = emailAlertaPrazo(prazos);
  let enviados = 0;

  for (const perfil of profiles) {
    if (!perfil.email) continue;
    const res = await enviarEmail({ to: perfil.email, ...template });
    if (!res.erro) enviados++;
  }

  return NextResponse.json({ enviados, totalPrazos: prazos.length });
}
