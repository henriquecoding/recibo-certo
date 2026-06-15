import GuiaPayout from "@/components/dashboard/GuiaPayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guia do Payout MoR — ReciboCerto",
  description:
    "Como configurar a faturação do payout Lemon Squeezy no Portal das Finanças: autoliquidação de IVA e sem retenção na fonte.",
};

export default function PayoutPage() {
  return (
    <div>
      <header className="mb-8">
        <div className="eyebrow mb-2 text-brand">Merchant of Record</div>
        <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">
          Guia do Payout
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-500">
          Configuração passo a passo para declarar o payout mensal do Lemon Squeezy no
          Portal das Finanças — arbitragem fiscal zero, 100% conforme.
        </p>
      </header>
      <GuiaPayout />
    </div>
  );
}
