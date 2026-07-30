import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";
import { enviarEmail } from "@/lib/email/send";
import { emailSubscricaoAtivada, emailSubscricaoCancelada } from "@/lib/email/templates";
import type Stripe from "stripe";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

async function obterEmailCliente(customerId: string): Promise<string | null> {
  try {
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return customer.email ?? null;
  } catch {
    return null;
  }
}

async function atualizarSubscricao(
  supabaseUid: string,
  subscription: Stripe.Subscription,
) {
  const sb = getSupabaseAdmin();
  if (!sb) {
    // Mesma lição que a escrita rejeitada, abaixo — e aqui era pior: um
    // `return` silencioso respondia 200 à Stripe, que dava o evento por
    // entregue e nunca mais o repetia. O cliente ficava a pagar todos os
    // meses sem nunca receber o acesso, e só se descobria pela reclamação.
    //
    // Uma configuração em falta é reparável: lançar faz o handler responder
    // 500, a Stripe reenvia durante ~3 dias, e assim que a variável existir o
    // evento entra sozinho. Falhar alto é a única opção segura quando já
    // houve cobrança.
    console.error(
      "[stripe/webhook] SUPABASE_SERVICE_ROLE_KEY em falta — impossível registar a subscrição. " +
        "A devolver 500 para a Stripe repetir o evento.",
    );
    throw new Error("SUPABASE_SERVICE_ROLE_KEY em falta — subscrição não persistida.");
  }

  const item = subscription.items.data[0];
  const dados = {
    user_id: supabaseUid,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    status: subscription.status,
    price_id: item?.price?.id ?? null,
    intervalo: item?.price?.recurring?.interval === "year" ? "annual" : "monthly",
    inicio: new Date(subscription.start_date * 1000).toISOString(),
    cancelado_em: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  };

  // O erro TEM de ser lido. Sem isto, uma escrita rejeitada devolvia 200 à
  // Stripe, que nunca voltava a tentar — e um cliente que pagou ficava sem
  // subscrição registada, em silêncio. Lançar faz o handler responder 500 e
  // a Stripe reenviar o evento.
  const { error } = await sb
    .from("subscriptions")
    .upsert(dados, { onConflict: "stripe_subscription_id" });
  if (error) {
    console.error("[stripe/webhook] Falha ao persistir a subscrição:", error.message);
    throw new Error(`Falha ao persistir a subscrição: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ erro: "Assinatura ou secret em falta." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        let uid = sub.metadata.supabase_uid;
        if (!uid) {
          const email = await obterEmailCliente(sub.customer as string);
          if (email) {
            const sb = getSupabaseAdmin();
            if (sb) {
              const { data: perfil } = await sb
                .from("profiles")
                .select("id")
                .eq("email", email)
                .maybeSingle();
              if (perfil) uid = perfil.id;
            }
          }
        }
        if (uid) {
          await atualizarSubscricao(uid, sub);
        } else {
          // Não se lança aqui: ao contrário da chave em falta, repetir não
          // resolve — se não há utilizador que corresponda, não haverá daqui
          // a três dias. Mas tem de ficar registado como ERRO: alguém está a
          // pagar sem receber acesso, e isto é a única pista.
          console.error(
            `[stripe/webhook] Subscrição ${sub.id} sem utilizador correspondente ` +
              `(sem metadata.supabase_uid e sem perfil com o email do cliente). ` +
              `O cliente está a pagar sem acesso — atribuir à mão.`,
          );
        }

        if (event.type === "customer.subscription.created" && sub.status === "active") {
          const customerEmail = await obterEmailCliente(sub.customer as string);
          const item = sub.items.data[0];
          const int = item?.price?.recurring?.interval === "year" ? "annual" as const : "monthly" as const;
          if (customerEmail) {
            const tpl = emailSubscricaoAtivada(int);
            enviarEmail({ to: customerEmail, ...tpl }).catch(() => {});
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        let uid = sub.metadata.supabase_uid;
        if (!uid) {
          const email = await obterEmailCliente(sub.customer as string);
          if (email) {
            const sb = getSupabaseAdmin();
            if (sb) {
              const { data: perfil } = await sb
                .from("profiles")
                .select("id")
                .eq("email", email)
                .maybeSingle();
              if (perfil) uid = perfil.id;
            }
          }
        }
        if (uid) {
          (sub as Stripe.Subscription).status = "canceled";
          await atualizarSubscricao(uid, sub);
        }
        const customerEmail = await obterEmailCliente(sub.customer as string);
        if (customerEmail) {
          const tpl = emailSubscricaoCancelada();
          enviarEmail({ to: customerEmail, ...tpl }).catch(() => {});
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn("[stripe/webhook] Pagamento falhado:", invoice.id);
        break;
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] Erro ao processar evento:", err);
    return NextResponse.json({ erro: "Erro interno." }, { status: 500 });
  }

  return NextResponse.json({ recebido: true });
}
