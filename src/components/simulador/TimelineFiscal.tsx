"use client";

import { useMemo } from "react";
import { fmt } from "@/lib/format";
import { Warning } from "@/components/ui/Icons";

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
  const mesAtual = new Date().getMonth(); // 0–11

  const { meses, totalSaidas, totalSS, totalIRS, totalIVA } = useMemo(() => {
    let total = 0;
    let somaSS = 0;
    let somaIRS = 0;
    let somaIVA = 0;
    const arr = MESES.map((nome, idx) => {
      const eventos: Evento[] = [];
      let intensidade = 0;

      if (!isencaoSS && ssAnualMensal > 0) {
        eventos.push({ tipo: "ss", texto: `SS −${fmt(ssAnualMensal)}` });
        total += ssAnualMensal;
        somaSS += ssAnualMensal;
        intensidade += 1;
      }
      if (temIva && MESES_IVA.has(idx) && ivaTrim > 0) {
        eventos.push({ tipo: "iva", texto: `IVA −${fmt(ivaTrim)}` });
        total += ivaTrim;
        somaIVA += ivaTrim;
        intensidade += 1;
      }
      if (idx === MES_IRS && irsAPagar > 0) {
        eventos.push({ tipo: "irs", texto: `IRS −${fmt(irsAPagar)}` });
        total += irsAPagar;
        somaIRS += irsAPagar;
        intensidade += 1;
      }

      return { nome, eventos, intensidade };
    });
    return {
      meses: arr,
      totalSaidas: total,
      totalSS: somaSS,
      totalIRS: somaIRS,
      totalIVA: somaIVA,
    };
  }, [isencaoSS, ssAnualMensal, temIva, ivaTrim, irsAPagar]);

  const dotCor: Record<Evento["tipo"], string> = {
    ss: "bg-amber-400",
    irs: "bg-red-400",
    iva: "bg-stone-400",
  };

  const ssAlto = !isencaoSS && ssAnualMensal > 300;

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
        <div className="flex min-w-[680px] gap-1.5 px-1">
          {meses.map((m, idx) => {
            const ehAtual = idx === mesAtual;
            const ehJunhoComIRS = idx === MES_IRS && irsAPagar > 0;
            const ehPrimeiroIsento = idx === 0 && isencaoSS;
            return (
              <div
                key={m.nome}
                aria-current={ehAtual ? "date" : undefined}
                className={`relative flex-1 rounded-xl border p-2 text-center transition-colors ${
                  ehAtual
                    ? "border-brand bg-brand-light shadow-card ring-1 ring-brand/40 dark:bg-brand/10"
                    : ehJunhoComIRS
                      ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20"
                      : m.intensidade >= 2
                        ? "border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
                        : "border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900"
                }`}
              >
                <div
                  className={`flex items-center justify-center gap-1 text-[11px] font-semibold ${
                    ehAtual
                      ? "text-brand-dark"
                      : "text-stone-600 dark:text-stone-300"
                  }`}
                >
                  {m.nome}
                  {ehAtual && (
                    <span className="rounded-full bg-brand px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-white">
                      agora
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1">
                  {ehPrimeiroIsento && (
                    <span className="inline-block rounded-full bg-brand-light px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-brand-dark">
                      SS isento
                    </span>
                  )}
                  {m.eventos.length === 0 && !ehPrimeiroIsento ? (
                    <div className="text-[11px] text-stone-300 dark:text-stone-600">
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
                        <span className="text-[11px] font-semibold tabular-nums text-stone-600 dark:text-stone-300">
                          {ev.texto}
                        </span>
                      </div>
                    ))
                  )}
                  {ehJunhoComIRS && (
                    <span className="inline-block rounded-full bg-red-100 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      Acerto IRS
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totais por categoria */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-700 dark:bg-stone-950">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> SS no ano
          </div>
          <div className="mt-0.5 text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">
            {isencaoSS ? "Isento" : fmt(totalSS)}
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-700 dark:bg-stone-950">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">
            <span className="h-2 w-2 rounded-full bg-red-400" /> IRS em junho
          </div>
          <div className="mt-0.5 text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">
            {totalIRS > 0 ? fmt(totalIRS) : "Sem acerto"}
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-700 dark:bg-stone-950">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">
            <span className="h-2 w-2 rounded-full bg-stone-400" /> IVA previsto
          </div>
          <div className="mt-0.5 text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">
            {temIva && totalIVA > 0 ? fmt(totalIVA) : "Isento"}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-2.5 dark:border-stone-700 dark:bg-stone-950">
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
          Total de saídas no ano
        </span>
        <span className="text-base font-bold tabular-nums text-stone-800 dark:text-stone-100">
          {fmt(totalSaidas)}
        </span>
      </div>

      {/* Avisos contextuais */}
      {ssAlto && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-alert-border bg-alert-bg px-3 py-2 text-xs leading-relaxed text-alert-text">
          <span className="mt-0.5 flex-shrink-0">
            <Warning size={13} />
          </span>
          <span>
            A tua Segurança Social ronda os {fmt(ssAnualMensal)}/mês — um valor
            considerável. Reserva esta quantia todos os meses para nunca seres
            apanhado de surpresa no dia 20.
          </span>
        </div>
      )}
      {irsAPagar > 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <span className="mt-0.5 flex-shrink-0">
            <Warning size={13} />
          </span>
          <span>
            Em junho terás um acerto de IRS de cerca de {fmt(irsAPagar)} a pagar.
            Vai reservando ao longo do ano para o teres preparado.
          </span>
        </div>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
        Estimativas baseadas na tua simulação. SS paga-se mensalmente até dia 20;
        o acerto de IRS é apurado na declaração anual (junho).
      </p>
    </div>
  );
}
