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
  portalReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/conta`,
  checkoutSuccessUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard?plano=ativo`,
  checkoutCancelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/upgrade`,
} as const;

export type PlanoIntervalo = "monthly" | "annual" | "quiz_master";
