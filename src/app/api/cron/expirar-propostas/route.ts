// ═══════════════════════════════════════════════════════════════════════
//  As propostas fora da validade fecham-se aqui, uma vez por dia.
//  ---------------------------------------------------------------------
//  `decidir_proposta` já recusava depois da validade. O que faltava era a
//  lista deixar de dizer «à espera da tua decisão» sobre algo que já não
//  se pode aceitar — uma interface que promete o que o servidor recusa é
//  pior do que uma que não promete nada.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    console.error("[cron/expirar-propostas] CRON_SECRET não configurado — recusado.");
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

  const { data, error } = await sb.rpc("expirar_propostas");
  if (error) {
    console.error("[cron/expirar-propostas]", error.message);
    return NextResponse.json({ erro: "Falha ao expirar." }, { status: 500 });
  }

  console.info("[cron/expirar-propostas]", { expiradas: data ?? 0 });
  return NextResponse.json({ ok: true, expiradas: data ?? 0 });
}
