import { loadStripe, type Stripe } from "@stripe/stripe-js";

let promise: Promise<Stripe | null> | null = null;

export function getStripeClient(): Promise<Stripe | null> {
  if (promise) return promise;

  const chave = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!chave) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY não definida.");
  }

  promise = loadStripe(chave);
  return promise;
}
