// ═══════════════════════════════════════════════════════════════════════
//  POST /api/integrations/fiz/webhooks/reprocessar — o consumidor que faltava
//  ---------------------------------------------------------------------
//  A migração 022 criou este índice:
//
//    CREATE INDEX partner_events_por_processar_idx
//      ON partner_events(received_at) WHERE processed_at IS NULL;
//
//  … e nunca ninguém o usou. O webhook escrevia `processing_error` numa falha,
//  respondia 202 («o evento pode ser reprocessado») e o assunto morria ali:
//  não existia nada no repositório que voltasse a ler essas linhas. Um evento
//  de revogação de ligação que falhasse a apagar tokens ficava por aplicar
//  indefinidamente, e a repetição da FIZ era respondida como duplicado.
//
//  Esta rota é esse consumidor. Corre por cron (mesmo padrão do
//  `/api/email/guardiao`: bearer com `CRON_SECRET`, fail-closed) e pode
//  também ser chamada à mão quando se quer forçar a recuperação.
//
//  Só reprocessa o que é ACIONÁVEL. Os eventos que não têm efeito local —
//  atribuição, comissões, estados de declarações — são marcados como
//  processados sem mais: ficaram registados, que é tudo o que deles se
//  espera, e deixá-los na fila fazia a fila crescer para sempre.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { cronAutorizado } from "@/lib/cron-auth";
import { servicoSupabase } from "@/lib/fiz/session.server";
import { processar } from "@/lib/fiz/webhook-processar.server";
import { EVENTOS_ACIONAVEIS } from "@/lib/fiz/webhooks.server";
import type { WebhookEvent, WebhookEventType } from "@/lib/fiz/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quantos eventos por passagem. Mantém a execução dentro do tempo da função. */
const LOTE = 50;

/**
 * Tentativas antes de desistir.
 *
 * Um evento que falha sempre — porque se refere a uma ligação que já não
 * existe, por exemplo — não pode ficar a ser tentado de minuto a minuto para
 * sempre. Depois disto fica com `processed_at` preenchido e o erro guardado,
 * o que o tira da fila e o deixa visível para inspeção.
 */
const TENTATIVAS_MAXIMAS = 5;

export async function POST(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const sb = servicoSupabase();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  const { data: pendentes, error } = await sb
    .from("partner_events")
    .select("id, partner_event_id, event_type, payload, tentativas, processing_error")
    .eq("partner", "fiz")
    .is("processed_at", null)
    .order("received_at", { ascending: true })
    .limit(LOTE);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  if (!pendentes || pendentes.length === 0) {
    return NextResponse.json({ ok: true, pendentes: 0, aplicados: 0, desistidos: 0 });
  }

  let aplicados = 0;
  let desistidos = 0;
  let falhados = 0;

  for (const linha of pendentes) {
    const tipo = linha.event_type as WebhookEventType;
    const tentativas = Number(linha.tentativas ?? 0);

    // Sem efeito local: já cumpriu o seu propósito ao ficar registado.
    if (!(EVENTOS_ACIONAVEIS as readonly string[]).includes(tipo)) {
      await sb
        .from("partner_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", linha.id);
      aplicados += 1;
      continue;
    }

    if (tentativas >= TENTATIVAS_MAXIMAS) {
      await sb
        .from("partner_events")
        .update({
          processed_at: new Date().toISOString(),
          processing_error: `desistido após ${tentativas} tentativas: ${linha.processing_error ?? "sem detalhe"}`,
        })
        .eq("id", linha.id);
      desistidos += 1;
      continue;
    }

    const evento = {
      id: String(linha.partner_event_id),
      type: tipo,
      data: linha.payload,
    } as WebhookEvent;

    try {
      await processar(evento);
      await sb
        .from("partner_events")
        .update({ processed_at: new Date().toISOString(), processing_error: null })
        .eq("id", linha.id);
      aplicados += 1;
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "erro desconhecido";
      await sb
        .from("partner_events")
        .update({ tentativas: tentativas + 1, processing_error: mensagem })
        .eq("id", linha.id);
      falhados += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    pendentes: pendentes.length,
    aplicados,
    desistidos,
    falhados,
  });
}
