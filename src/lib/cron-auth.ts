import { type NextRequest } from "next/server";

/**
 * Verifica o bearer de um endpoint de cron.
 *
 * Fail-closed: exige `CRON_SECRET` definido. Se faltar, NEGA — ao contrário do
 * comportamento anterior (`Bearer ${CRON_SECRET ?? STRIPE_WEBHOOK_SECRET}`), que
 * aceitava "Bearer undefined" quando ambos os segredos faltavam e reutilizava o
 * segredo do webhook Stripe (má higiene de segredos).
 */
export function cronAutorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return comparaTempoConstante(header, `Bearer ${secret}`);
}

/** Comparação de strings em tempo (quase) constante — evita timing leaks. */
function comparaTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
