"use client";

import { m } from "motion/react";
import { IVA_ISENCAO_LIMITE, IVA_ISENCAO_EXCESSO } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import { type Recibo } from "@/lib/store/recibos";
import { EASE } from "@/lib/motion";
import Link from "next/link";

export default function IvaProgresso({ recibos }: { recibos: Recibo[] }) {
  const ano = new Date().getFullYear();
  const faturado = recibos
    .filter((r) => new Date(r.data + "T00:00:00").getFullYear() === ano)
    .reduce((a, r) => a + r.valor, 0);

  const limite = IVA_ISENCAO_LIMITE.value;
  const limiteExcesso = IVA_ISENCAO_EXCESSO.value;
  const alerta80 = limite * 0.8;

  const pctv = Math.min(100, (faturado / limite) * 100);
  const restante = Math.max(0, limite - faturado);

  // Nível 3 — URGENTE: excedeu 18 750 € — mudança imediata
  const nivelUrgente = faturado >= limiteExcesso;
  // Nível 2 — ALERTA: entre 15 000 € e 18 750 €
  const nivelAlerta = !nivelUrgente && faturado >= limite;
  // Nível 1 — AVISO: entre 12 000 € e 15 000 €
  const nivelAviso = !nivelAlerta && !nivelUrgente && faturado >= alerta80;

  const barColor = nivelUrgente
    ? "bg-clay-text"
    : nivelAlerta
    ? "bg-alert-text"
    : nivelAviso
    ? "bg-amber-400"
    : "bg-brand";

  const textColor = nivelUrgente
    ? "text-clay-text"
    : nivelAlerta
    ? "text-alert-text"
    : nivelAviso
    ? "text-amber-600 dark:text-amber-400"
    : "text-brand";

  const mensagem = nivelUrgente
    ? "Passas ao regime normal de IVA imediatamente — age já."
    : nivelAlerta
    ? `Ultrapassaste ${fmt(limite)} — passas ao regime normal de IVA em janeiro.`
    : nivelAviso
    ? `Faltam ${fmt(restante)} para o limite — prepara-te para cobrar IVA.`
    : `Faltam ${fmt(restante)} para teres de cobrar IVA.`;

  return (
    <div className={`rounded-4xl border p-6 shadow-card ${
      nivelUrgente
        ? "border-clay-text/30 bg-clay-bg dark:bg-red-950/20"
        : nivelAlerta
        ? "border-alert-text/30 bg-alert-bg dark:bg-amber-950/20"
        : "border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900"
    }`}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Limite de isenção de IVA
        </h2>
        {nivelUrgente && (
          <span className="text-xs font-bold text-clay-text uppercase tracking-wide">Urgente</span>
        )}
        {nivelAlerta && (
          <span className="text-xs font-bold text-alert-text uppercase tracking-wide">Alerta</span>
        )}
        {nivelAviso && (
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Aviso</span>
        )}
      </div>
      <p className={`mb-4 text-xs ${nivelUrgente || nivelAlerta ? "font-medium " + textColor : "text-stone-400"}`}>
        {mensagem}
      </p>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          {fmt(faturado)}
        </span>
        <span className="text-xs text-stone-400">de {fmt(limite)}</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
        <m.div
          initial={{ width: "0%" }}
          whileInView={{ width: `${pctv}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
      <div className={`mt-2 text-right text-xs font-semibold ${textColor}`}>
        {pctv.toFixed(0).replace(".", ",")}%
      </div>

      {(nivelUrgente || nivelAlerta || nivelAviso) && (
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Link
            href="/guias/iva-recibos-verdes"
            className="text-xs text-brand hover:underline font-semibold"
          >
            Ver guia de IVA →
          </Link>
        </div>
      )}
    </div>
  );
}
