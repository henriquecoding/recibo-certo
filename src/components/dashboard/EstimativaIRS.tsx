"use client";

import { useMemo } from "react";
import Link from "next/link";
import { simularIRSAnual, type SimulacaoIRS } from "@/lib/fiscal";
import { ATIVIDADES, efeitoFiscal, COEFICIENTE_POR_TIPO, type TipoAtividade } from "@/lib/fiscal-data";
import { type Recibo, calcularRecibo } from "@/lib/store/recibos";
import { type PreferenciasFiscais } from "@/lib/store/preferencias-fiscais";
import { fmt, pct } from "@/lib/format";
import { ArrowRight, Calculator, Check, Warning } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";
import AnimatedNumber from "@/components/ui/AnimatedNumber";

function tipoDoRecibo(r: Recibo): TipoAtividade {
  if (r.atividade) {
    const ativ = ATIVIDADES.find((a) => a.label === r.atividade);
    if (ativ) return ativ.tipo;
  }
  return r.tipo;
}

function tipoDominante(recibos: Recibo[]): TipoAtividade {
  if (recibos.length === 0) return "art151";
  const contagem: Record<string, number> = {};
  for (const r of recibos) {
    const t = tipoDoRecibo(r);
    contagem[t] = (contagem[t] ?? 0) + 1;
  }
  let max = 0;
  let tipo: TipoAtividade = "art151";
  for (const [t, n] of Object.entries(contagem)) {
    if (n > max) { max = n; tipo = t as TipoAtividade; }
  }
  return tipo;
}

function coeficienteDoRecibo(r: Recibo): number {
  if (r.atividade) {
    const ativ = ATIVIDADES.find((a) => a.label === r.atividade);
    if (ativ) {
      const ef = efeitoFiscal(ativ);
      return ef.coef;
    }
  }
  return COEFICIENTE_POR_TIPO[r.tipo];
}

export default function EstimativaIRS({
  recibos,
  prefs,
}: {
  recibos: Recibo[];
  prefs: PreferenciasFiscais;
}) {
  const sim = useMemo(() => {
    const ano = new Date().getFullYear();
    const doAno = recibos.filter(
      (r) => new Date(r.data + "T00:00:00").getFullYear() === ano,
    );
    if (doAno.length === 0) return null;

    const brutoAnual = doAno.reduce((s, r) => s + r.valor, 0);
    const tipo = tipoDominante(doAno);

    const retencoesPagas = doAno.reduce((s, r) => {
      const c = calcularRecibo(r);
      return s + c.retencaoIRS;
    }, 0);

    const coefMedia = doAno.reduce((s, r) => s + coeficienteDoRecibo(r) * r.valor, 0) / brutoAnual;

    return simularIRSAnual({
      brutoAnual,
      tipo,
      anoAtividade: prefs.anoAtividade,
      irsJovemAno: prefs.irsJovemAno > 0 ? prefs.irsJovemAno : undefined,
      despesasJustificadas: prefs.despesasJustificadas,
      retencoesPagas,
      conjunta: prefs.conjunta,
      dependentes: prefs.dependentes,
      acumulaEmprego: prefs.acumulaEmprego,
      isencaoSSPrimeiroAno: prefs.isencaoSSPrimeiroAno,
      regimeContabilidade: prefs.regimeContabilidade,
      coefOverride: Math.abs(coefMedia - COEFICIENTE_POR_TIPO[tipo]) > 0.01 ? coefMedia : undefined,
      deducoes: {
        saude: prefs.despSaude,
        educacao: prefs.despEducacao,
        gerais: prefs.despGerais,
        rendas: prefs.despRendas,
      },
      deficiencia: prefs.deficiencia,
      ifici: prefs.ifici,
    });
  }, [recibos, prefs]);

  if (!sim) {
    return (
      <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-1.5 mb-3">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Estimativa IRS Anual</h2>
          <InfoTip>Regista recibos para veres a estimativa do teu IRS anual com base nas taxas oficiais de 2026.</InfoTip>
        </div>
        <p className="text-xs text-stone-400">Regista o primeiro recibo deste ano para ativar a estimativa.</p>
      </div>
    );
  }

  const positivo = sim.saldo >= 0;

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Estimativa IRS Anual</h2>
          <InfoTip>
            Estimativa baseada nos teus recibos e no regime simplificado (Art. 31.º CIRS).
            Inclui escalões progressivos, deduções e mínimo de existência. Não substitui o apuramento oficial.
          </InfoTip>
        </div>
        <Link
          href="/dashboard/simulador"
          className="flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:underline"
        >
          Simulador completo
          <ArrowRight size={11} />
        </Link>
      </div>

      {/* Saldo principal */}
      <div className={`rounded-2xl p-4 mb-4 ${positivo ? "bg-brand-light dark:bg-brand/10" : "bg-alert-bg"}`}>
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-0.5">
          {positivo ? "Reembolso estimado" : "A pagar ao Estado"}
        </p>
        <div className={`font-display text-3xl font-semibold ${positivo ? "text-brand-dark dark:text-brand" : "text-alert-text"}`}>
          <AnimatedNumber value={Math.abs(sim.saldo)} />
        </div>
        <p className="mt-1 text-[11px] text-stone-400">
          {positivo
            ? "Retiveste mais do que o IRS estimado — deves receber reembolso."
            : "As retenções não cobrem o IRS estimado — espera um acerto a pagar."}
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50">
        <LinhaDetalhe label="Faturação bruta" value={sim.brutoAnual} />
        <LinhaDetalhe label={`Coeficiente (${pct(sim.coeficiente)})`} value={sim.rendimentoCoeficiente} />
        {sim.acrescimo15 > 0 && (
          <LinhaDetalhe label="Acréscimo regra 15%" value={sim.acrescimo15} />
        )}
        <LinhaDetalhe label="Rend. tributável" value={sim.rendimentoTributavel} />
        {sim.rendimentoIsentoJovem > 0 && (
          <LinhaDetalhe label="Isenção IRS Jovem" value={-sim.rendimentoIsentoJovem} />
        )}
        <div className="border-t border-stone-200 pt-2 dark:border-stone-700">
          <LinhaDetalhe label="IRS estimado" value={sim.irsEstimado} destaque />
          <LinhaDetalhe label="Retenções já pagas" value={sim.retencoesPagas} />
        </div>
        <div className="border-t border-stone-200 pt-2 dark:border-stone-700">
          <LinhaDetalhe label="SS anual estimado" value={sim.ssAnual} />
          <LinhaDetalhe label="Taxa média efetiva" value={sim.taxaMediaEfetiva} percentagem />
        </div>
      </div>

      {/* Avisos */}
      {sim.minimoExistenciaAplicado && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand-light p-3 dark:bg-brand/10">
          <Check size={13} className="mt-0.5 flex-shrink-0 text-brand" />
          <span className="text-xs text-brand-dark dark:text-brand">Mínimo de existência aplicado — IRS reduzido ou anulado.</span>
        </div>
      )}

      {/* Link para configurar */}
      <p className="mt-3 text-[10px] leading-relaxed text-stone-400">
        Os valores dependem do teu perfil fiscal (ano de atividade, dependentes, deduções).{" "}
        <Link href="/dashboard/simulador" className="font-medium text-brand hover:underline">
          Ajustar no simulador
        </Link>
      </p>
    </div>
  );
}

function LinhaDetalhe({
  label,
  value,
  destaque = false,
  percentagem = false,
}: {
  label: string;
  value: number;
  destaque?: boolean;
  percentagem?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-xs ${destaque ? "font-semibold text-stone-700 dark:text-stone-200" : "text-stone-500 dark:text-stone-400"}`}>
        {label}
      </span>
      <span className={`text-xs font-semibold tabular-nums ${destaque ? "text-stone-800 dark:text-stone-100" : "text-stone-600 dark:text-stone-300"}`}>
        {percentagem ? pct(value) : fmt(value)}
      </span>
    </div>
  );
}
