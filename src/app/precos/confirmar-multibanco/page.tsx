// Página mobile-first para mostrar dados de pagamento Multibanco
// Acedida após confirmPayment Stripe ou callback Ifthenpay
"use client";
import { useState } from "react";
import { fmt } from "@/lib/format";
import { Check, Copy } from "@/components/ui/Icons";
function Row({ label, value, copiavel }: { label: string; value: string; copiavel?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };
  return (
    <div className="flex items-center justify-between gap-3 py-4 border-b border-stone-100 dark:border-stone-800 last:border-0">
      <span className="text-sm text-stone-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-base font-semibold text-stone-800 dark:text-stone-100">{value}</span>
        {copiavel && (
          <button type="button" onClick={copiar}
            className="flex h-7 w-7 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-brand/10 hover:text-brand transition-all">
            {copiado ? <Check size={13} /> : <Copy size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}
export default function ConfirmarMultibanco({
  searchParams,
}: {
  searchParams: { entity?: string; reference?: string; amount?: string; expires_at?: string };
}) {
  const { entity = "—", reference = "—", amount, expires_at } = searchParams;
  const expira = expires_at
    ? new Date(parseInt(expires_at) * 1000).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-start justify-center pt-8 px-4">
      <div className="w-full max-w-sm rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-card">
        <h2 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100 mb-1 text-center">
          Paga via Multibanco
        </h2>
        {amount && (
          <p className="text-center font-display text-4xl font-bold text-brand mb-6 mt-2">
            {fmt(parseFloat(amount))}
          </p>
        )}
        <div>
          <Row label="Entidade"   value={entity}    copiavel />
          <Row label="Referência" value={reference} copiavel />
          <Row label="Montante"   value={amount ? fmt(parseFloat(amount)) : "—"} />
          <Row label="Válido até" value={expira} />
        </div>
        <p className="mt-6 text-sm text-center text-stone-500 leading-relaxed">
          Paga em qualquer caixa Multibanco, homebanking ou app do teu banco.
          O acesso Pro é ativado automaticamente após confirmação.
        </p>
        <p className="mt-2 text-xs text-center text-stone-400">
          O Multibanco é a opção mais segura para valores elevados — sem risco de estorno.
        </p>
      </div>
    </main>
  );
}
