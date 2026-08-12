// ═══════════════════════════════════════════════════════════════════════
//  A purga corre aqui — uma vez por dia, chamada pelo Vercel Cron.
//  ---------------------------------------------------------------------
//  A decisão de QUEM apagar é da base de dados (`purgar_dados_expirados`),
//  que também tem a salvaguarda de não apagar nada a quem voltou a ter
//  Plus. Esta rota só a acorda.
//
//  Protegida por `CRON_SECRET`: uma rota que apaga dados não pode estar
//  aberta à internet. Sem o segredo configurado, recusa — falhar fechado é
//  o único comportamento aceitável aqui.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    console.error("[cron/purgar-dados] CRON_SECRET não configurado — recusado.");
    return NextResponse.json({ erro: "Não configurado." }, { status: 503 });
  }

  // O Vercel Cron envia `Authorization: Bearer <CRON_SECRET>`.
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

  const { data, error } = await sb.rpc("purgar_dados_expirados");
  if (error) {
    console.error("[cron/purgar-dados] Falha:", error);
    return NextResponse.json({ erro: "Falha ao purgar." }, { status: 500 });
  }

  const r = (Array.isArray(data) ? data[0] : data) ?? {};
  // Contagens, nunca identidades: este registo fica nos logs.
  console.info("[cron/purgar-dados] Purga concluída:", r);
  return NextResponse.json({ ok: true, ...r });
}
