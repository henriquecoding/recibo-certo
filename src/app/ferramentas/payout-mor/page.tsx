import type { Metadata } from "next";
import Wizard from "./Wizard";

export const metadata: Metadata = {
  title: "Recibo verde ao Merchant of Record | ReciboCerto",
  description:
    "Guia passo-a-passo para emitir o recibo mensal ao Paddle ou Lemon Squeezy com IVA em autoliquidação e 100 % do payout líquido.",
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas/payout-mor" },
};

export default function PayoutMorPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="eyebrow mb-2 text-brand">Ferramentas</div>
      <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
        Recibo ao Merchant of Record
      </h1>
      <p className="mb-10 text-sm leading-relaxed text-stone-500 max-w-lg">
        Emite o recibo verde mensal ao Paddle ou Lemon Squeezy com IVA em
        autoliquidação. Resultado: 100 % do payout líquido, sem burocracia fiscal.
      </p>
      <Wizard />
    </main>
  );
}
