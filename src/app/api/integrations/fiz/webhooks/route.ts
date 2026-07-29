import { NextResponse, type NextRequest } from "next/server";
import { verificarEvento, jaProcessado, marcarProcessado } from "@/lib/fiz/webhooks.server";
import { invalidarCatalogo } from "@/lib/fiz/capabilities.server";
import { servicoSupabase, revogarPorPartnerUserId } from "@/lib/fiz/session.server";
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
    // Violação de unicidade = evento repetido. É sucesso, não erro.
    if (error && error.code === "23505") {
      marcarProcessado(evento.id);
      return NextResponse.json({ recebido: true, repetido: true }, { status: 200 });
    }
    if (error) console.warn("[fiz] evento não registado:", error.message);
  }

  try {
    await processar(evento);
    if (sb) {
      await sb
        .from("partner_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("partner", "fiz")
        .eq("partner_event_id", evento.id);
    }
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
    // 202 na mesma: o evento está guardado e pode ser reprocessado. Devolver
    // 5xx só faria a FIZ reenviar um evento que já temos.
  }

  marcarProcessado(evento.id);
  return NextResponse.json({ recebido: true }, { status: 202 });
}

function sujeitoDe(evento: WebhookEvent): string | null {
  const dados = evento.data as Record<string, unknown>;
  for (const chave of ["userId", "partnerUserId", "referralId", "handoffId", "declarationId", "obligationId"]) {
    const valor = dados?.[chave];
    if (typeof valor === "string") return valor;
  }
  return null;
}

async function processar(evento: WebhookEvent): Promise<void> {
  switch (evento.type) {
    case "partner.capability.changed":
      // O catálogo em cache deixou de ser verdade.
      invalidarCatalogo();
      return;

    case "user.connection.revoked": {
      const partnerUserId = (evento.data as { partnerUserId?: string }).partnerUserId;
      if (partnerUserId) await revogarPorPartnerUserId(partnerUserId);
      return;
    }

    case "partner.handoff.accepted":
    case "partner.handoff.expired": {
      const sb = servicoSupabase();
      const id = (evento.data as { handoffId?: string; externalHandoffId?: string }).externalHandoffId;
      if (!sb || !id) return;
      await sb
        .from("partner_handoffs")
        .update({
          status: evento.type === "partner.handoff.accepted" ? "accepted" : "expired",
          accepted_at: evento.type === "partner.handoff.accepted" ? new Date().toISOString() : null,
        })
        .eq("external_handoff_id", id);
      return;
    }

    default:
      // Os restantes eventos (atribuição, comissões, estados de obrigações e
      // declarações) ficam registados em `partner_events` para reconciliação
      // e leitura sob procura. Não há estado local a atualizar: o Recibo
      // Certo não replica o livro fiscal da FIZ (ponto 13.5).
      return;
  }
}
