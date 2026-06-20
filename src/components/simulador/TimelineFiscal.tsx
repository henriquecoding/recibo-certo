"use client";

import { useMemo } from "react";
import { fmt } from "@/lib/format";
import { Calendar, Warning } from "@/components/ui/Icons";

interface TimelineFiscalProps {
  ssAnualMensal: number;
  isencaoSS: boolean;
  acertoIRS: number;
  temIva: boolean;
  ivaTotal: number;
  faturacaoAnual: number;
  className?: string;
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_IVA = new Set([0, 3, 6, 9]);
const MES_IRS = 5;

interface Evento {
  tipo: "ss" | "irs" | "iva";
  label: string;
  valor: number;
}

const EVENTO_META: Record<Evento["tipo"], { cor: string; corDot: string; corBadge: string; corBadgeDark: string }> = {
  ss:  { cor: "amber", corDot: "bg-amber-400", corBadge: "bg-amber-50 text-amber-700 ring-amber-200/60", corBadgeDark: "dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800/40" },
  irs: { cor: "red",   corDot: "bg-red-400",   corBadge: "bg-red-50 text-red-700 ring-red-200/60",     corBadgeDark: "dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800/40" },
  iva: { cor: "blue",  corDot: "bg-blue-400",   corBadge: "bg-blue-50 text-blue-700 ring-blue-200/60",   corBadgeDark: "dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800/40" },
};

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
  const irsAPagar = acertoIRS < 0 ? Math.abs(acertoIRS) : 0;
  const mesAtual = new Date().getMonth();

  const { meses, totalSaidas, totalSS, totalIRS, totalIVA } = useMemo(() => {
    let total = 0;
    let somaSS = 0;
    let somaIRS = 0;
    let somaIVA = 0;
    const arr = MESES.map((nome, idx) => {
      const eventos: Evento[] = [];

      if (!isencaoSS && ssAnualMensal > 0) {
        eventos.push({ tipo: "ss", label: "SS", valor: ssAnualMensal });
        total += ssAnualMensal;
        somaSS += ssAnualMensal;
      }
      if (temIva && MESES_IVA.has(idx) && ivaTrim > 0) {
        eventos.push({ tipo: "iva", label: "IVA", valor: ivaTrim });
        total += ivaTrim;
        somaIVA += ivaTrim;
      }
      if (idx === MES_IRS && irsAPagar > 0) {
        eventos.push({ tipo: "irs", label: "IRS", valor: irsAPagar });
        total += irsAPagar;
        somaIRS += irsAPagar;
      }

      return { nome, eventos, idx };
    });
    return { meses: arr, totalSaidas: total, totalSS: somaSS, totalIRS: somaIRS, totalIVA: somaIVA };
  }, [isencaoSS, ssAnualMensal, temIva, ivaTrim, irsAPagar]);

  const ssAlto = !isencaoSS && ssAnualMensal > 300;
  const progressoAno = ((mesAtual + 1) / 12) * 100;

  if (faturacaoAnual <= 0) return null;

  return (
    <div className={className}>
      {/* ── Cabeçalho ── */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand/15">
            <Calendar size={16} className="text-brand" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-100 leading-tight">
              Calendário fiscal
            </h4>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-tight">
              {new Date().getFullYear()} · {MESES[mesAtual]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-400 dark:text-stone-500">
          {Object.entries(EVENTO_META).map(([tipo, meta]) => {
            if (tipo === "iva" && !temIva) return null;
            return (
              <span key={tipo} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${meta.corDot}`} />
                {tipo.toUpperCase()}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Barra de progresso do ano ── */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand/40 transition-all duration-500"
            style={{ width: `${progressoAno}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 tabular-nums flex-shrink-0">
          {Math.round(progressoAno)}% do ano
        </span>
      </div>

      {/* ── Grelha de meses ── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {meses.map((m) => {
          const ehAtual = m.idx === mesAtual;
          const isPassado = m.idx < mesAtual;
          const temEventos = m.eventos.length > 0;
          const ehJunhoComIRS = m.idx === MES_IRS && irsAPagar > 0;
          const ehPrimeiroIsento = m.idx === 0 && isencaoSS;

          return (
            <div
              key={m.nome}
              aria-current={ehAtual ? "date" : undefined}
              className={`relative rounded-2xl border p-3 transition-all duration-200 ${
                ehAtual
                  ? "border-brand/50 bg-brand/5 shadow-card ring-1 ring-brand/20 dark:border-brand/40 dark:bg-brand/8"
                  : ehJunhoComIRS && !isPassado
                    ? "border-red-200/80 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/15"
                    : isPassado
                      ? "border-stone-100 bg-white/60 dark:border-stone-800/60 dark:bg-stone-900/40"
                      : "border-stone-200/70 bg-white dark:border-stone-800 dark:bg-stone-900/60"
              }`}
            >
              {/* Cabeçalho do mês */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider leading-none ${
                    ehAtual
                      ? "text-brand-dark dark:text-brand"
                      : isPassado
                        ? "text-stone-300 dark:text-stone-600"
                        : "text-stone-500 dark:text-stone-400"
                  }`}
                >
                  {m.nome}
                </span>
                {ehAtual && (
                  <span className="rounded-md bg-brand px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white leading-none">
                    Agora
                  </span>
                )}
              </div>

              {/* Eventos do mês */}
              <div className="space-y-1.5 min-h-[28px]">
                {ehPrimeiroIsento && !temEventos && (
                  <span className="inline-flex items-center rounded-lg bg-brand/8 px-2 py-0.5 text-[9px] font-bold text-brand-dark dark:text-brand ring-1 ring-brand/15">
                    SS isento
                  </span>
                )}
                {!temEventos && !ehPrimeiroIsento && (
                  <span className={`text-[10px] ${isPassado ? "text-stone-200 dark:text-stone-800" : "text-stone-300 dark:text-stone-700"}`}>
                    Sem obrigações
                  </span>
                )}
                {m.eventos.map((ev, i) => {
                  const meta = EVENTO_META[ev.tipo];
                  return (
                    <div
                      key={i}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ring-inset ${meta.corBadge} ${meta.corBadgeDark} ${isPassado ? "opacity-50" : ""}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.corDot} flex-shrink-0`} aria-hidden />
                      <span>{ev.label}</span>
                      <span className="opacity-70">−{fmt(ev.valor)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Indicador de deadline */}
              {temEventos && !isPassado && (
                <div className={`mt-2 text-[9px] font-medium tabular-nums ${
                  ehAtual ? "text-brand/50" : "text-stone-400 dark:text-stone-600"
                }`}>
                  até dia 20
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Resumo anual ── */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="group rounded-2xl border border-stone-200/70 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              Segurança Social
            </span>
          </div>
          <div className="text-base font-bold tabular-nums text-stone-800 dark:text-stone-100">
            {isencaoSS ? (
              <span className="text-brand font-semibold text-sm">Isento</span>
            ) : (
              fmt(totalSS)
            )}
          </div>
          {!isencaoSS && totalSS > 0 && (
            <div className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
              {fmt(ssAnualMensal)}/mês × 12
            </div>
          )}
        </div>
        <div className="group rounded-2xl border border-stone-200/70 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              Acerto IRS
            </span>
          </div>
          <div className="text-base font-bold tabular-nums text-stone-800 dark:text-stone-100">
            {totalIRS > 0 ? (
              <span className="text-red-600 dark:text-red-400">{fmt(totalIRS)}</span>
            ) : (
              <span className="text-brand font-semibold text-sm">Sem acerto</span>
            )}
          </div>
          <div className="text-[10px] text-stone-400 dark:text-stone-500">
            {totalIRS > 0 ? "a pagar em junho" : "retenção cobre o IRS"}
          </div>
        </div>
        <div className="group rounded-2xl border border-stone-200/70 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
            <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              IVA previsto
            </span>
          </div>
          <div className="text-base font-bold tabular-nums text-stone-800 dark:text-stone-100">
            {temIva && totalIVA > 0 ? (
              fmt(totalIVA)
            ) : (
              <span className="text-brand font-semibold text-sm">Isento</span>
            )}
          </div>
          {temIva && totalIVA > 0 && (
            <div className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
              {fmt(ivaTrim)}/trimestre
            </div>
          )}
        </div>
      </div>

      {/* ── Total anual ── */}
      <div className="mt-2 rounded-2xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          Total de saídas no ano
        </span>
        <span className="text-lg font-bold tabular-nums text-stone-800 dark:text-stone-100">
          {fmt(totalSaidas)}
        </span>
      </div>

      {/* ── Avisos contextuais ── */}
      {ssAlto && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-alert-border bg-alert-bg px-4 py-3 text-xs leading-relaxed text-alert-text">
          <span className="mt-0.5 flex-shrink-0"><Warning size={14} /></span>
          <span>
            A tua Segurança Social ronda os <strong>{fmt(ssAnualMensal)}/mês</strong> — um valor
            considerável. Reserva esta quantia todos os meses para nunca seres apanhado de surpresa no dia 20.
          </span>
        </div>
      )}
      {irsAPagar > 0 && (
        <div className="mt-2 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <span className="mt-0.5 flex-shrink-0"><Warning size={14} /></span>
          <span>
            Em junho terás um acerto de IRS de cerca de <strong>{fmt(irsAPagar)}</strong> a pagar.
            Vai reservando ao longo do ano para o teres preparado.
          </span>
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-stone-400 dark:text-stone-600">
        Estimativas baseadas na tua simulação. SS paga-se mensalmente até dia 20;
        o acerto de IRS é apurado na declaração anual (junho). Datas e valores podem variar.
      </p>
    </div>
  );
}
