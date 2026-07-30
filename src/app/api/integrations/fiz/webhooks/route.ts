import { NextResponse, type NextRequest } from "next/server";
import { verificarEvento, jaProcessado, marcarProcessado } from "@/lib/fiz/webhooks.server";
import { servicoSupabase } from "@/lib/fiz/session.server";
import { processar, sujeitoDe } from "@/lib/fiz/webhook-processar.server";
import type { WebhookEvent } from "@/lib/fiz/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receção de eventos da FIZ.
 *
 * Responde depressa (202) e processa o mínimo indispensável em linha. A
 * entrega é at-least-once, por isso tudo aqui é idempotente: a chave real é
 * a restrição UNIQUE (partner, partner_event_id) em `partner_events`.
 *
 * A assinatura é verificada sobre os BYTES BRUTOS — daí ler `req.text()` e
 * nunca `req.json()`.
 */
/** Nenhum evento legítimo da FIZ se aproxima disto. */
const TAMANHO_MAXIMO_BYTES = 256 * 1024;

export async function POST(req: NextRequest) {
  // A assinatura só pode ser verificada sobre os bytes brutos, o que obriga a
  // ter o corpo inteiro em memória ANTES de saber se é legítimo. Este ponto é
  // público e não autenticado, por isso o tamanho é travado à entrada — senão
  // qualquer pessoa consegue fazer-nos alocar e assinar megabytes por pedido.
  const declarado = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declarado) && declarado > TAMANHO_MAXIMO_BYTES) {
    return NextResponse.json({ recebido: false }, { status: 413 });
  }

  const corpoBruto = await req.text();
  if (corpoBruto.length > TAMANHO_MAXIMO_BYTES) {
    // O `content-length` pode faltar ou mentir (por exemplo em chunked).
    return NextResponse.json({ recebido: false }, { status: 413 });
  }

  const verificacao = verificarEvento(req.headers, corpoBruto);

  if (!verificacao.valido) {
    // Sem detalhes na resposta: não damos pistas a quem esteja a sondar.
    console.warn("[fiz] webhook recusado:", verificacao.motivo);
    return NextResponse.json({ recebido: false }, { status: verificacao.estado });
  }

  const evento = verificacao.evento;
  if (jaProcessado(evento.id)) return NextResponse.json({ recebido: true, repetido: true }, { status: 200 });

  const sb = servicoSupabase();
  if (sb) {
    const { error } = await sb.from("partner_events").insert({
      partner: "fiz",
      partner_event_id: evento.id,
      event_type: evento.type,
      event_version: 1,
      subject_id: sujeitoDe(evento),
      payload: evento.data,
    });
    // Violação de unicidade = já recebemos este evento. Mas RECEBIDO não é o
    // mesmo que PROCESSADO: se a tentativa anterior falhou a aplicar o efeito,
    // a linha está lá com `processed_at` a NULL. Tratar as duas da mesma
    // maneira era o que fazia uma revogação de ligação falhada nunca ser
    // reaplicada — a repetição da FIZ, que era a segunda oportunidade,
    // respondia «já temos» e ia-se embora.
    if (error && error.code === "23505") {
      const { data: existente } = await sb
        .from("partner_events")
        .select("processed_at")
        .eq("partner", "fiz")
        .eq("partner_event_id", evento.id)
        .maybeSingle();

      if (existente?.processed_at) {
        marcarProcessado(evento.id);
        return NextResponse.json({ recebido: true, repetido: true }, { status: 200 });
      }
      // Sem `processed_at`: cai para o processamento em baixo e tenta outra vez.
      console.warn("[fiz] evento repetido ainda não processado, a tentar de novo:", evento.id);
    } else if (error) {
      // Não conseguimos registar o evento. Sem linha não há reprocessamento
      // possível, por isso NÃO se pode confirmar a receção: 500 para a FIZ
      // reenviar. Confirmar aqui era perder o evento em silêncio.
      console.error("[fiz] evento não registado:", error.message);
      return NextResponse.json({ recebido: false }, { status: 500 });
    }
  }

  try {
    await processar(evento);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "erro desconhecido";
    console.error("[fiz] falha ao processar evento", evento.type, mensagem);
    if (sb) {
      await sb
        .from("partner_events")
        .update({ processing_error: mensagem })
        .eq("partner", "fiz")
        .eq("partner_event_id", evento.id);
    }
    // ⚠️ NÃO se marca como processado e NÃO se confirma a receção.
    //
    // Isto respondia 202 com a justificação de que «o evento está guardado e
    // pode ser reprocessado». Podia, mas nada o reprocessava: não havia
    // consumidor nenhum a ler as linhas com `processing_error`. O efeito —
    // apagar tokens de uma ligação revogada, por exemplo — ficava por aplicar
    // para sempre, e a entrega at-least-once da FIZ não ajudava, porque a
    // repetição era respondida como duplicado.
    //
    // Agora há duas redes: o 5xx faz a FIZ reenviar, e
    // `/api/integrations/fiz/webhooks/reprocessar` apanha o que sobrar.
    return NextResponse.json({ recebido: false, retentar: true }, { status: 500 });
  }

  if (sb) {
    await sb
      .from("partner_events")
      .update({ processed_at: new Date().toISOString(), processing_error: null })
      .eq("partner", "fiz")
      .eq("partner_event_id", evento.id);
  }

  // Só aqui, depois de o efeito estar aplicado.
  marcarProcessado(evento.id);
  return NextResponse.json({ recebido: true }, { status: 202 });
}
