"use client";

import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import type { AuditoriaResult } from "@/lib/fiscal-dependente";
import { fmt, pct } from "@/lib/format";
import { Check, Warning, ArrowRight, Sparkle } from "@/components/ui/Icons";
import { StatTile, cx } from "@/components/dependente/ui";

// Frase curta de uma divergência ("IRS: 16,97 € a menos").
function fraseDiv(titulo: string, dif: number) {
  return `${titulo}: ${fmt(Math.abs(dif))} ${dif < 0 ? "a menos" : "a mais"}`;
}

// Linha de comparação: rubrica · no recibo → esperado · estado.
function LinhaComparacao({
  titulo,
  declarado,
  esperado,
  diferenca,
  ok,
}: {
  titulo: string;
  declarado: number;
  esperado: number;
  diferenca: number; // declarado − esperado
  ok: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cx(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
            ok ? "bg-brand-light text-brand-dark" : "bg-alert-bg text-alert-text"
          )}
        >
          {ok ? <Check size={15} /> : <Warning size={14} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{titulo}</p>
          <p className={cx("text-[11px]", ok ? "text-stone-400" : "text-alert-text")}>
            {ok ? "Corresponde à tabela de 2026" : `${fmt(Math.abs(diferenca))} ${diferenca < 0 ? "a menos" : "a mais"} do esperado`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 tabular-nums">
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">No recibo</p>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{fmt(declarado)}</p>
        </div>
        <ArrowRight size={13} className="text-stone-300 dark:text-stone-600" />
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-brand">Esperado</p>
          <p className="text-sm font-semibold text-brand-dark">{fmt(esperado)}</p>
        </div>
        <span
          className={cx(
            "ml-1 inline-flex min-w-[3.5rem] justify-center rounded-lg px-2 py-1 text-[11px] font-semibold",
            ok ? "bg-brand-light text-brand-dark" : "bg-alert-bg text-alert-text"
          )}
        >
          {ok ? "OK" : `${diferenca < 0 ? "−" : "+"}${fmt(Math.abs(diferenca))}`}
        </span>
      </div>
    </div>
  );
}

// Apresentação do resultado de uma auditoria de recibo (partilhada entre a
// página dedicada e o painel dentro do simulador). Não contém lógica fiscal —
// recebe o resultado já calculado pelo motor verificado `auditarRecibo`.
export function ResultadoAuditoria({ resultado }: { resultado: AuditoriaResult }) {
  const divergencias = [
    !resultado.irsOk && fraseDiv("IRS", resultado.irsDiferenca),
    !resultado.ssOk && fraseDiv("Segurança Social", resultado.ssDiferenca),
  ].filter(Boolean) as string[];
  const nDiv = divergencias.length;
  const difLiquido = resultado.liquidoDeclarado - resultado.liquidoEsperado;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="space-y-3"
    >
      {/* Veredicto */}
      <div
        className={cx(
          "flex items-start gap-3 rounded-2xl border p-4",
          resultado.tudoOk ? "border-brand/30 bg-brand-light" : "border-alert-border bg-alert-bg"
        )}
      >
        <span
          className={cx(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
            resultado.tudoOk ? "bg-brand text-white" : "bg-alert-text/15 text-alert-text"
          )}
        >
          {resultado.tudoOk ? <Check size={18} /> : <Warning size={16} />}
        </span>
        <div className="min-w-0">
          <p className={cx("text-sm font-semibold", resultado.tudoOk ? "text-brand-dark" : "text-alert-text")}>
            {resultado.tudoOk
              ? "O teu recibo está de acordo com as tabelas de 2026."
              : `Encontrámos ${nDiv} ${nDiv === 1 ? "divergência" : "divergências"} face às tabelas de 2026.`}
          </p>
          <p className={cx("mt-0.5 text-xs leading-relaxed", resultado.tudoOk ? "text-brand-dark/80" : "text-alert-text/90")}>
            {resultado.tudoOk
              ? "A retenção de IRS e o desconto da Segurança Social conferem com o esperado."
              : divergencias.join(" · ")}
          </p>
        </div>
      </div>

      {/* Comparação esperado vs. recibo */}
      <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800">
        <div className="border-b border-stone-100 dark:border-stone-700 px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">O teu recibo vs. as tabelas de 2026</p>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-700">
          <LinhaComparacao
            titulo="Retenção de IRS"
            declarado={resultado.irsEsperado + resultado.irsDiferenca}
            esperado={resultado.irsEsperado}
            diferenca={resultado.irsDiferenca}
            ok={resultado.irsOk}
          />
          <LinhaComparacao
            titulo="Segurança Social (11%)"
            declarado={resultado.ssEsperado + resultado.ssDiferenca}
            esperado={resultado.ssEsperado}
            diferenca={resultado.ssDiferenca}
            ok={resultado.ssOk}
          />
        </div>
      </div>

      {/* IRS Jovem — só quando o regime está ativo na simulação/recibo. */}
      {resultado.isencaoJovemPct > 0 && (
        <div className="rounded-2xl border border-brand/25 bg-brand-light p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-dark">
              <Sparkle size={13} /> IRS Jovem · isenção de {pct(resultado.isencaoJovemPct)}
            </p>
            <p className="font-display text-sm font-semibold text-brand-dark tabular-nums">{fmt(resultado.rendimentoIsentoJovem)} isentos</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-brand-dark/80">
            O IRS esperado já reflete a isenção do ano de benefício indicado. Confirma que o teu recibo aplica a mesma percentagem.
            {resultado.excedeTetoJovem ? " Parte do rendimento ultrapassa o teto mensal e volta a ser tributada." : ""}
          </p>
        </div>
      )}

      {/* Métricas adicionais — base, custo da entidade, taxa efetiva e líquido. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Base de incidência" value={fmt(resultado.baseIncidencia)} sub="remuneração sujeita" />
        <StatTile label="Custo p/ empresa" value={fmt(resultado.custoEmpresa)} sub="base + TSU 23,75%" />
        <StatTile label="Taxa efetiva" value={pct(resultado.taxaEfetiva)} sub="IRS + SS / base" />
        <StatTile
          tone={Math.abs(difLiquido) > 2 ? "alert" : "brand"}
          label="Líquido esperado"
          value={fmt(resultado.liquidoEsperado)}
          sub={Math.abs(difLiquido) > 2 ? `recibo: ${fmt(resultado.liquidoDeclarado)} (${difLiquido > 0 ? "+" : "−"}${fmt(Math.abs(difLiquido))})` : "após IRS e SS"}
        />
      </div>

      {resultado.alertas.length > 0 && (
        <ul className="space-y-2">
          {resultado.alertas.map((a, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-3 text-xs leading-relaxed text-alert-text">
              <span className="mt-0.5 flex-shrink-0"><Warning size={12} /></span>
              {a}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-stone-400">
        Estimativa pelas tabelas do Despacho 233-A/2026 (Continente), conforme a situação familiar. Pequenas diferenças
        podem resultar de arredondamentos ou de acertos a meio do ano.
      </p>
    </m.div>
  );
}
