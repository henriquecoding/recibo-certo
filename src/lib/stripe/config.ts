export const STRIPE_CONFIG = {
  prices: {
    monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
    annual: process.env.STRIPE_PRICE_ANNUAL ?? "",
  },
  portalReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/conta`,
  checkoutSuccessUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard?plano=ativo`,
  checkoutCancelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/upgrade`,
} as const;

export type PlanoIntervalo = "monthly" | "annual";
