// ═══════════════════════════════════════════════════════════════════════
//  Os anexos órfãos e as vagas gastas varrem-se aqui, uma vez por dia.
//  ---------------------------------------------------------------------
//  Um órfão é um objeto sem linha que o descreva. Nascem de um envio que
//  morre a meio — a vaga abriu, o ficheiro subiu, o separador fechou-se
//  antes de o servidor verificar os bytes. Ninguém os vê, e ocupam o plano
//  em silêncio até alguém reparar na fatura.
//
//  Duas horas de tolerância: menos do que isso apanharia envios ainda a
//  decorrer, e apagar o ficheiro de alguém a meio do envio é pior do que
//  deixá-lo mais um bocado.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    console.error("[cron/purgar-anexos] CRON_SECRET não configurado — recusado.");
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

  // A função apaga as linhas de `storage.objects`; os bytes saem com elas
  // pela mesma via que o Storage usa para qualquer remoção.
  const { data: orfaos, error } = await sb.rpc("purgar_anexos_orfaos", { p_idade: "2 hours" });
  if (error) {
    console.error("[cron/purgar-anexos] órfãos:", error.message);
    return NextResponse.json({ erro: "Falha ao purgar." }, { status: 500 });
  }

  const { data: vagas, error: erroVagas } = await sb.rpc("purgar_vagas_velhas");
  if (erroVagas) console.error("[cron/purgar-anexos] vagas:", erroVagas.message);

  // Contagens, nunca caminhos: este registo fica nos logs, e um caminho
  // diz a que vínculo pertence o ficheiro.
  const n = Array.isArray(orfaos) ? orfaos.length : 0;
  console.info("[cron/purgar-anexos]", { orfaos: n, vagas: vagas ?? 0 });
  return NextResponse.json({ ok: true, orfaos: n, vagas: vagas ?? 0 });
}
