"use client";

import { useEffect, useState } from "react";
import { Check, Warning, Spinner } from "@/components/ui/Icons";

type Estado = "aguardar" | "confirmar" | "sucesso" | "erro" | "expirado";

interface MBWayPollingProps {
  telefone: string;
  paymentId: string;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export default function MBWayPolling({
  telefone,
  paymentId,
  onSuccess,
  onError,
}: MBWayPollingProps) {
  const [estado, setEstado] = useState<Estado>("aguardar");
  const [tentativas, setTentativas] = useState(0);
  const MAX_TENTATIVAS = 30;

  useEffect(() => {
    if (estado !== "aguardar" && estado !== "confirmar") return;

    const intervalo = setInterval(async () => {
      try {
        const res = await fetch(`/api/ifthenpay/status?id=${paymentId}`);
        if (!res.ok) throw new Error("Erro ao verificar estado");
        const data = await res.json();

        if (data.status === "paid" || data.status === "succeeded") {
          setEstado("sucesso");
          clearInterval(intervalo);
          onSuccess?.();
        } else if (data.status === "failed" || data.status === "cancelled") {
          setEstado("erro");
          clearInterval(intervalo);
          onError?.(data.message ?? "Pagamento recusado");
        } else {
          setEstado("confirmar");
          setTentativas((t) => {
            if (t + 1 >= MAX_TENTATIVAS) {
              setEstado("expirado");
              clearInterval(intervalo);
            }
            return t + 1;
          });
        }
      } catch {
        setTentativas((t) => {
          if (t + 1 >= MAX_TENTATIVAS) {
            setEstado("expirado");
            clearInterval(intervalo);
          }
          return t + 1;
        });
      }
    }, 3000);

    return () => clearInterval(intervalo);
  }, [estado, paymentId, onSuccess, onError]);

  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-stone-100 bg-white p-6 text-center shadow-card dark:border-stone-800 dark:bg-stone-900">
      {estado === "aguardar" || estado === "confirmar" ? (
        <>
          <div className="mb-4 flex justify-center">
            <Spinner size={32} className="text-brand" />
          </div>
          <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
            Confirma no teu telemovel
          </h3>
          <p className="mt-1.5 text-sm text-stone-500">
            Abre a app MB WAY no numero <strong className="text-stone-700 dark:text-stone-300">{telefone}</strong> e aceita o pagamento.
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${Math.min(100, (tentativas / MAX_TENTATIVAS) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-stone-400">
            A verificar... ({MAX_TENTATIVAS - tentativas} tentativas restantes)
          </p>
        </>
      ) : estado === "sucesso" ? (
        <>
          <div className="mb-4 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
              <Check size={28} />
            </span>
          </div>
          <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
            Pagamento confirmado
          </h3>
          <p className="mt-1.5 text-sm text-stone-500">
            O pagamento via MB WAY foi aceite com sucesso.
          </p>
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-clay-bg text-clay-text">
              <Warning size={28} />
            </span>
          </div>
          <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
            {estado === "expirado" ? "Tempo expirado" : "Pagamento falhado"}
          </h3>
          <p className="mt-1.5 text-sm text-stone-500">
            {estado === "expirado"
              ? "O tempo para confirmar no MB WAY expirou. Tenta novamente."
              : "O pagamento foi recusado ou cancelado."}
          </p>
        </>
      )}
    </div>
  );
}
