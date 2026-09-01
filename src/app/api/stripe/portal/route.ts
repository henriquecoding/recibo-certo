import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { STRIPE_CONFIG } from "@/lib/stripe/config";
import { customerIdDoUtilizador } from "@/lib/billing/customers";
import { userDoPedido } from "@/lib/supabase/verify-request-user";

export const runtime = "nodejs";

let portalConfigCache: { id: string; expires: number } | null = null;

/** O título editorial do portal. Escrito uma vez: era o sítio onde a marca
 *  se desencontrava — a configuração ao vivo anunciou durante meses um
 *  «Recibo Certo Pro» que nunca existiu. */
const HEADLINE = "Gere o teu Recibo Certo Plus";

/** A configuração desejada do portal, numa expressão só.
 *
 *  Antes existia duas vezes: uma no `if` que decidia se era preciso
 *  atualizar, outra no corpo da atualização. Duas listas a dizer a mesma
 *  coisa divergem — e divergiram: a atualização punha coisas que a
 *  verificação não olhava, por isso nunca eram repostas se alguém as
 *  mudasse no painel. Agora a verificação lê ESTE objeto. */
function configuracaoDesejada() {
  return {
    business_profile: {
      headline: HEADLINE,
      privacy_policy_url: STRIPE_CONFIG.privacyUrl,
      terms_of_service_url: STRIPE_CONFIG.termsUrl,
    },
    default_return_url: STRIPE_CONFIG.portalReturnUrl,
    features: {
      // Em Portugal, poder corrigir o NIF e a morada na fatura não é um
      // extra: é o que faz a diferença entre um recibo utilizável na
      // contabilidade e um papel que não serve para nada. Sem isto, a
      // única via era escrever para o apoio.
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address", "name", "tax_id"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        proration_behavior: "none",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "missing_features", "switched_service", "unused", "other"],
        },
      },
    },
  } as const satisfies Stripe.BillingPortal.ConfigurationUpdateParams;
}

/** Verdadeiro quando a configuração ao vivo já diz o que queremos. */
function estaEmDia(atual: Stripe.BillingPortal.Configuration): boolean {
  const querida = configuracaoDesejada();
  const permitidos = [...atual.features.customer_update.allowed_updates].sort();
  return atual.business_profile.headline === querida.business_profile.headline
    && atual.business_profile.privacy_policy_url === querida.business_profile.privacy_policy_url
    && atual.business_profile.terms_of_service_url === querida.business_profile.terms_of_service_url
    && atual.default_return_url === querida.default_return_url
    && atual.features.subscription_cancel.cancellation_reason.enabled
    && atual.features.invoice_history.enabled
    && atual.features.payment_method_update.enabled
    && atual.features.customer_update.enabled
    && permitidos.join(",") === [...querida.features.customer_update.allowed_updates].sort().join(",");
}

async function configuracaoPortal(): Promise<string> {
  if (portalConfigCache && portalConfigCache.expires > Date.now()) return portalConfigCache.id;
  const stripe = getStripe();
  const listed = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
  const current = listed.data[0];
  if (!current) throw new Error("A Stripe não tem uma configuração de portal ativa.");

  if (!estaEmDia(current)) {
    try {
      await stripe.billingPortal.configurations.update(current.id, configuracaoDesejada());
    } catch (error) {
      // A configuração editorial não pode impedir o cliente de cancelar:
      // por isso isto engole o erro e segue. Mas NÃO em silêncio — a
      // versão anterior deixava o portal estagnado sem ninguém saber.
      console.error("[stripe/portal] Não foi possível atualizar a configuração:", error);
    }
  }
  portalConfigCache = { id: current.id, expires: Date.now() + 60 * 60_000 };
  return current.id;
}

export async function POST(req: Request) {
  const user = await userDoPedido(req);
  if (!user) return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  try {
    const customer = await customerIdDoUtilizador(user.id);
    if (!customer) {
      return NextResponse.json({ erro: "Ainda não existe faturação para esta conta." }, { status: 404 });
    }
    const configuration = await configuracaoPortal();
    const session = await getStripe().billingPortal.sessions.create({
      customer,
      configuration,
      return_url: STRIPE_CONFIG.portalReturnUrl,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/portal]", error);
    return NextResponse.json({ erro: "Não foi possível abrir o portal de faturação." }, { status: 503 });
  }
}
