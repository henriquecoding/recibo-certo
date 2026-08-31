"use client";

import { useState } from "react";
import type { EmploymentOfferInput, EmploymentOfferResult } from "../../../ReciboCerto-Fiscal-Engine/src";
import { useCenarios } from "@/lib/store/cenarios";
import { Check, Close, Lock, Warning } from "@/components/ui/Icons";
import { registar } from "@/lib/analytics/cliente";
import { contextoContratacao } from "@/lib/analytics/contratacao";

export default function GuardarCenarioContratacao({
  input,
  result,
  onClose,
}: {
  input: EmploymentOfferInput;
  result: EmploymentOfferResult;
  onClose: () => void;
}) {
  const { guardar, carregado, naNuvem } = useCenarios();
  const [name, setName] = useState("Nova contratação");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const save = async () => {
    setStatus("saving");
    const saved = await guardar({
      tipo: "contratacao",
      nome: name.trim() || "Nova contratação",
      resumo: {
        destaque: result.employerCost.annualStabilized.cents / 100,
        destaqueLabel: "Custo anual",
        linhas: [
          { label: "Vencimento base", valor: result.resolvedBaseSalaryMonthly.cents / 100 },
          { label: "Primeiro ano", valor: result.employerCost.firstYear.cents / 100 },
        ],
      },
      dados: {
        input,
        engineVersion: result.engineVersion,
        policyDate: result.policyDate,
      } as unknown as Record<string, unknown>,
    });
    if (saved.ok) {
      setStatus("saved");
      setMessage(naNuvem ? "Cenário sincronizado na tua conta." : "Cenário guardado neste dispositivo.");
      registar("hiring_scenario_saved", {
        ...contextoContratacao("ferramenta"),
        saved_destination: naNuvem ? "nuvem" : "dispositivo",
      });
    } else {
      setStatus("error");
      setMessage(saved.erro.mensagem);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-brand/30 bg-brand-light/60 p-4 dark:bg-brand/10 sm:p-5" role="dialog" aria-labelledby="save-hiring-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="save-hiring-title" className="font-display text-lg font-semibold text-ink">Guardar este cenário</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Lock size={13} /> Só acontece depois desta confirmação.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800"><Close size={16} /></button>
      </div>
      {status === "saved" ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-semibold text-brand-dark dark:bg-stone-900 dark:text-brand-mint"><Check size={16} /> {message}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1 text-sm font-semibold text-stone-700 dark:text-stone-300">Nome do cenário
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="mt-1.5 min-h-[46px] w-full rounded-xl border border-stone-200 bg-white px-3.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-900" />
          </label>
          <button type="button" disabled={!carregado || status === "saving"} onClick={save} className="mt-auto min-h-[46px] rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{status === "saving" ? "A guardar…" : "Confirmar gravação"}</button>
        </div>
      )}
      {status === "error" ? <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-alert-text"><Warning size={15} className="mt-0.5 flex-none" /> {message}</p> : null}
    </div>
  );
}
