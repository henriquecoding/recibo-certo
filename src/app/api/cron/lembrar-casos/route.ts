// ═══════════════════════════════════════════════════════════════════════
//  Os casos encaminhados que ninguém respondeu, uma vez por dia.
//  ---------------------------------------------------------------------
//  Um convite ficava 'convidado' para sempre se nenhum dos contabilistas
//  escolhidos respondesse, e ninguém — nem eles, nem o cliente — era
//  avisado disso. Aqui lembram-se os convidados e, mais tarde, diz-se ao
//  cliente que ninguém respondeu, para ele poder escolher outra pessoa.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    console.error("[cron/lembrar-casos] CRON_SECRET não configurado — recusado.");
    return NextResponse.json({ erro: "Não configurado." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    return NextResponse.json({ erro: "Supabase não configurado." }, { status: 503 });
  }

  const sb = createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb.rpc("lembrar_casos_sem_resposta");
  if (error) {
    console.error("[cron/lembrar-casos]", error.message);
    return NextResponse.json({ erro: "Falha ao lembrar." }, { status: 500 });
  }

  const r = (data ?? {}) as { lembrados?: number; avisados?: number };
  console.info("[cron/lembrar-casos]", r);
  return NextResponse.json({ ok: true, ...r });
}
