// ═══════════════════════════════════════════════════════════════════════
//  POST /api/stripe/connect-webhook — eventos das contas dos contabilistas
//  ---------------------------------------------------------------------
//  Endpoint SEPARADO do `/api/stripe/webhook`, e não é arrumação: são dois
//  segredos de assinatura diferentes. Aceitar um evento de conta ligada com
//  a assinatura da plataforma seria aceitar o que não se consegue verificar.
//
//  O que chega aqui:
//   · `checkout.session.completed` — uma consulta paga na conta de um
//     contabilista. Liquida o pagamento, gasta o benefício de fidelidade e
//     confirma o agendamento se era pré-pago.
//   · `checkout.session.expired`   — o cliente desistiu. Liberta o
//     benefício reservado, que é a razão de ele não ser gasto na abertura.
//   · `account.updated`            — o onboarding avançou. É a ÚNICA fonte
//     de `charges_enabled`: sem ela, o painel diria que se pode cobrar
//     quando a Stripe ainda não deixa.
//
//  A idempotência é a mesma do outro webhook, pelo ledger da migração de
//  billing: a Stripe repete eventos por desenho, e sem isto uma consulta
//  podia ser liquidada duas vezes.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { claimStripeEvent, finishStripeEvent } from "@/lib/billing/ledger";
import {
  encerrarConsulta, liquidarConsulta, sincronizarContaConnect, tipoDaSessao,
} from "@/lib/stripe/pagamentos-contabilistas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function processar(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const sessao = event.data.object as Stripe.Checkout.Session;
      if (tipoDaSessao(sessao) !== "consulta") return;
      await liquidarConsulta(sessao);
      return;
    }
    case "checkout.session.expired": {
      const sessao = event.data.object as Stripe.Checkout.Session;
      if (tipoDaSessao(sessao) !== "consulta") return;
      await encerrarConsulta(sessao.id, "expirado");
      return;
    }
    case "checkout.session.async_payment_failed": {
      const sessao = event.data.object as Stripe.Checkout.Session;
      if (tipoDaSessao(sessao) !== "consulta") return;
      await encerrarConsulta(sessao.id, "falhado", "Pagamento recusado.");
      return;
    }
    case "account.updated": {
      await sincronizarContaConnect(event.data.object as Stripe.Account);
      return;
    }
    default:
      return;
  }
}

export async function POST(req: Request) {
  const assinatura = req.headers.get("stripe-signature");
  const segredo = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  // ⚠️ As duas recusas estavam na mesma linha, e a mesma frase saía nos dois
  // casos. Parece um pormenor e não é: um pedido sem assinatura é ruído da
  // internet, e um secret em falta é o sistema de recebimentos INTEIRO
  // parado — `account.updated` nunca é processado, `charges_enabled` nunca
  // sobe, e todos os contabilistas ficam em «a Stripe está a verificar»
  // para sempre.
  //
  // Com a mesma mensagem para os dois, a única forma de distinguir era
  // enviar uma assinatura falsa e ver se a resposta mudava. Foi assim que
  // isto se encontrou, e não devia ter sido preciso.
  if (!segredo) {
    console.error(
      "[stripe/connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET não está definido. " +
        "Nenhum evento de conta ligada é processado: as contas dos contabilistas " +
        "nunca passam a poder cobrar e os pagamentos nunca são dados por pagos.",
    );
    return NextResponse.json({ erro: "Webhook não configurado." }, { status: 500 });
  }
  if (!assinatura) {
    return NextResponse.json({ erro: "Assinatura em falta." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const corpo = await req.text();
    event = getStripe().webhooks.constructEvent(corpo, assinatura, segredo);
  } catch {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 400 });
  }

  let claim: Awaited<ReturnType<typeof claimStripeEvent>>;
  try {
    claim = await claimStripeEvent({
      id: event.id,
      type: event.type,
      created: event.created,
      objectId: (event.data.object as { id?: string }).id ?? null,
    });
  } catch (erro) {
    console.error("[stripe/connect] Ledger indisponível:", erro);
    return NextResponse.json({ erro: "Ledger indisponível." }, { status: 503 });
  }

  if (claim.decision === "processed") {
    return NextResponse.json({ recebido: true, duplicado: true });
  }
  if (claim.decision === "busy") {
    return NextResponse.json({ erro: "Evento já está a ser processado." }, { status: 503 });
  }

  try {
    await processar(event);
    await finishStripeEvent(event.id, "processed");
    return NextResponse.json({ recebido: true });
  } catch (erro) {
    const morto = claim.attempt >= 8;
    console.error("[stripe/connect] Falha de processamento:", {
      event: event.id,
      type: event.type,
      conta: event.account,
      attempt: claim.attempt,
      dead_letter: morto,
      erro: erro instanceof Error ? erro.message : String(erro),
    });
    try {
      await finishStripeEvent(event.id, morto ? "dead_letter" : "failed", erro);
    } catch (erroLedger) {
      console.error("[stripe/connect] Falha ao registar erro:", erroLedger);
    }
    // 500 faz a Stripe repetir. Um `dead_letter` já não deve ser repetido.
    return NextResponse.json({ erro: "Falha de processamento." }, { status: morto ? 200 : 500 });
  }
}
