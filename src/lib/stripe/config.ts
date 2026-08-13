import "server-only";
import { appUrl } from "@/lib/origem";

export const STRIPE_CONFIG = {
  lookupKeys: {
    plus: "recibocerto_plus_monthly",
    vitalicio: "recibocerto_plus_lifetime",
  },
  portalReturnUrl: `${appUrl()}/dashboard/conta`,
  privacyUrl: `${appUrl()}/privacidade`,
  termsUrl: `${appUrl()}/termos`,
  checkoutSuccessUrl: `${appUrl()}/dashboard?plano=ativo&session_id={CHECKOUT_SESSION_ID}`,
  checkoutCancelUrl: `${appUrl()}/dashboard/upgrade`,
} as const;
