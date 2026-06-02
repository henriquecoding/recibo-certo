"use client";

import { useMemo } from "react";
import { fmt } from "@/lib/format";

interface TimelineFiscalProps {
  ssAnualMensal: number; // valor SS por mês (0 se isento)
  isencaoSS: boolean;
  acertoIRS: number; // acerto IRS anual (positivo = a pagar, negativo = reembolso)
  temIva: boolean;
  ivaTotal: number; // total IVA anual estimado
  faturacaoAnual: number;
  className?: string;
}

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MESES_IVA = new Set([0, 3, 6, 9]); // Jan, Abr, Jul, Out (trimestral)
const MES_IRS = 5; // Junho

interface Evento {
  tipo: "ss" | "irs" | "iva";
  texto: string;
}

/**
 * Calendário anual dos eventos fiscais obrigatórios (SS mensal, IRS em junho,
 * IVA trimestral) com estimativa do total de saídas anuais.
 */
export default function TimelineFiscal({
  ssAnualMensal,
  isencaoSS,
  acertoIRS,
  temIva,
  ivaTotal,
  faturacaoAnual,
  className = "",
}: TimelineFiscalProps) {
  const ivaTrim = temIva ? ivaTotal / 4 : 0;
  // acertoIRS positivo (na simulação) significa reembolso (retenção > IRS).
  // A pagar em junho só quando o acerto é negativo.
  const irsAPagar = acertoIRS < 0 ? Math.abs(acertoIRS) : 0;

  const { meses, totalSaidas } = useMemo(() => {
    let total = 0;
    const arr = MESES.map((nome, idx) => {
      const eventos: Evento[] = [];
      let intensidade = 0;

      if (!isencaoSS && ssAnualMensal > 0) {
        eventos.push({ tipo: "ss", texto: `SS −${fmt(ssAnualMensal)}` });
        total += ssAnualMensal;
        intensidade += 1;
      }
      if (temIva && MESES_IVA.has(idx) && ivaTrim > 0) {
        eventos.push({ tipo: "iva", texto: `IVA −${fmt(ivaTrim)}` });
        total += ivaTrim;
        intensidade += 1;
      }
      if (idx === MES_IRS && irsAPagar > 0) {
        eventos.push({ tipo: "irs", texto: `IRS −${fmt(irsAPagar)}` });
        total += irsAPagar;
        intensidade += 1;
      }

      return { nome, eventos, intensidade };
    });
    return { meses: arr, totalSaidas: total };
  }, [isencaoSS, ssAnualMensal, temIva, ivaTrim, irsAPagar]);

  const dotCor: Record<Evento["tipo"], string> = {
    ss: "bg-amber-400",
    irs: "bg-red-400",
    iva: "bg-stone-400",
  };

  if (faturacaoAnual <= 0) return null;

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">
          Calendário fiscal do ano
        </h4>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> SS
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" /> IRS
          </span>
          {temIva && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-stone-400" /> IVA
            </span>
          )}
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-[640px] gap-1.5 px-1">
          {meses.map((m) => (
            <div
              key={m.nome}
              className={`flex-1 rounded-xl border p-2 text-center transition-colors ${
                m.intensidade >= 2
                  ? "border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
                  : "border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900"
              }`}
            >
              <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                {m.nome}
              </div>
              <div className="mt-1.5 space-y-1">
                {m.eventos.length === 0 ? (
                  <div className="text-[10px] text-stone-300 dark:text-stone-600">
                    —
                  </div>
                ) : (
                  m.eventos.map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center gap-1"
                    >
                      <span
                        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotCor[ev.tipo]}`}
                        aria-hidden
                      />
                      <span className="text-[9px] font-medium tabular-nums text-stone-500 dark:text-stone-400">
                        {ev.texto}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-2.5 dark:border-stone-700 dark:bg-stone-950">
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
          Total de saídas no ano
        </span>
        <span className="text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">
          {fmt(totalSaidas)}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
        Estimativas baseadas na tua simulação. SS paga-se mensalmente até dia 20;
        o acerto de IRS é apurado na declaração anual (junho).
      </p>
    </div>
  );
}
