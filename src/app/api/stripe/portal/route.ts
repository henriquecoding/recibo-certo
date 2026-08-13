import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { STRIPE_CONFIG } from "@/lib/stripe/config";
import { customerIdDoUtilizador } from "@/lib/billing/customers";
import { userDoPedido } from "@/lib/supabase/verify-request-user";

export const runtime = "nodejs";

let portalConfigCache: { id: string; expires: number } | null = null;

async function configuracaoPortal(): Promise<string> {
  if (portalConfigCache && portalConfigCache.expires > Date.now()) return portalConfigCache.id;
  const stripe = getStripe();
  const listed = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
  const current = listed.data[0];
  if (!current) throw new Error("A Stripe não tem uma configuração de portal ativa.");

  const needsUpdate = current.business_profile.headline !== "Gere o teu Recibo Certo Plus"
    || current.business_profile.privacy_policy_url !== STRIPE_CONFIG.privacyUrl
    || current.business_profile.terms_of_service_url !== STRIPE_CONFIG.termsUrl
    || current.default_return_url !== STRIPE_CONFIG.portalReturnUrl
    || !current.features.subscription_cancel.cancellation_reason.enabled;
  if (needsUpdate) {
    try {
      await stripe.billingPortal.configurations.update(current.id, {
        business_profile: {
          headline: "Gere o teu Recibo Certo Plus",
          privacy_policy_url: STRIPE_CONFIG.privacyUrl,
          terms_of_service_url: STRIPE_CONFIG.termsUrl,
        },
        default_return_url: STRIPE_CONFIG.portalReturnUrl,
        features: {
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
      });
    } catch (error) {
      // A configuração editorial não pode impedir o cliente de cancelar.
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
