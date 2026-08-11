import "server-only";
import { appUrl } from "@/lib/origem";

export const STRIPE_CONFIG = {
  prices: {
    // Único preço vendido hoje (ponto 11 da arquitetura da parceria — ver
    // src/lib/entitlements.ts). `monthly`/`annual`/`quiz_master` ficam como
    // chaves legadas, só para subscrições antigas já existentes na Stripe;
    // nenhum checkout novo as usa.
    plus: process.env.STRIPE_PRICE_PLUS_MONTHLY ?? "",
    monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
    annual: process.env.STRIPE_PRICE_ANNUAL ?? "",
    quiz_master: process.env.STRIPE_PRICE_QUIZ_MASTER ?? "",
  },
  // RC-CFG-001: a origem passa por `appUrl()` — normaliza a barra final e
  // corrige o apex para o www, que é o host registado na Stripe.
  portalReturnUrl: `${appUrl()}/dashboard/conta`,
  checkoutSuccessUrl: `${appUrl()}/dashboard?plano=ativo`,
  checkoutCancelUrl: `${appUrl()}/dashboard/upgrade`,
} as const;

export type PlanoIntervalo = "monthly" | "annual" | "quiz_master";
