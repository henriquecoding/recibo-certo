"use client";

import { useMemo } from "react";
import Link from "next/link";
import { simularIRSAnual } from "@/lib/fiscal";
import { ATIVIDADES, efeitoFiscal, COEFICIENTE_POR_TIPO, type TipoAtividade } from "@/lib/fiscal-data";
import { recibosDoAno, resultadoDoRecibo, mesDoRecibo, type Recibo } from "@/lib/recibos-contrato";
import { type PreferenciasFiscais } from "@/lib/store/preferencias-fiscais";
import { fmt, pct } from "@/lib/format";
import { ArrowRight, Check, Warning } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";
import AnimatedNumber from "@/components/ui/AnimatedNumber";

/**
 * Estado de confiança da estimativa.
 *
 * O cartão anterior devolvia sempre um número único (RC-P0-05). Quando a
 * pessoa acumulava emprego, ele sabia que existia salário mas não quanto — e a
 * progressividade do IRS não se calcula assim. O mesmo com a tributação
 * conjunta sem os rendimentos do cônjuge. O resultado podia subestimar
 * significativamente o imposto e, com ele, a reserva.
 */
type Confianca = "completo" | "estimado" | "fora-de-escopo";

function tipoDoRecibo(r: Recibo): TipoAtividade {
  if (r.atividade) {
    const ativ = ATIVIDADES.find((a) => a.label === r.atividade);
    if (ativ) return ativ.tipo;
  }
  return r.tipo;
}

/** Tipo com maior peso por VALOR faturado (não por contagem de recibos). */
function tipoPredominante(recibos: Recibo[]): TipoAtividade {
  if (recibos.length === 0) return "art151";
  const peso = new Map<TipoAtividade, number>();
  for (const r of recibos) {
    const t = tipoDoRecibo(r);
    peso.set(t, (peso.get(t) ?? 0) + r.valor);
  }
  return [...peso.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function coeficienteDoRecibo(r: Recibo): number {
  if (r.atividade) {
    const ativ = ATIVIDADES.find((a) => a.label === r.atividade);
    if (ativ) return efeitoFiscal(ativ).coef;
  }
  return COEFICIENTE_POR_TIPO[r.tipo];
}

export default function EstimativaIRS({
  recibos,
  prefs,
  ano,
}: {
  recibos: Recibo[];
  prefs: PreferenciasFiscais;
  ano: number;
}) {
  const analise = useMemo(() => {
    const doAno = recibosDoAno(recibos, ano);
    if (doAno.length === 0) return null;

    // ── Inputs em falta que MUDAM DE ESCALÃO ────────────────────────
    // Não é a mesma coisa faltar uma dedução (desloca o resultado) e faltar um
    // rendimento (muda a taxa marginal). Só os segundos retiram a certeza.
    const emFalta: string[] = [];
    if (prefs.acumulaEmprego && prefs.rendimentoCategoriaA === null) {
      emFalta.push("o teu rendimento anual de trabalho dependente (categoria A)");
    }
    if (prefs.conjunta && prefs.rendimentoConjuge === null) {
      emFalta.push("os rendimentos do teu cônjuge");
    }

    const brutoObservado = doAno.reduce((s, r) => s + r.valor, 0);

    // ── Período observado vs projeção anual ─────────────────────────
    // A faturação até hoje não é a faturação do ano. Dizê-lo é o mínimo.
    const hoje = new Date();
    const anoCorrente = ano === hoje.getFullYear();
    const ultimoMes = anoCorrente
      ? hoje.getMonth() + 1
      : Math.max(...doAno.map(mesDoRecibo));
    const mesesObservados = Math.max(1, ultimoMes);
    const projecaoAnual = anoCorrente ? (brutoObservado / mesesObservados) * 12 : brutoObservado;

    const tipo = tipoPredominante(doAno);
    // Retenções efetivamente feitas — a grandeza certa para o acerto.
    const retencoesPagas = doAno.reduce((s, r) => s + resultadoDoRecibo(r).retencaoEfetiva, 0);
    const coefMedia = doAno.reduce((s, r) => s + coeficienteDoRecibo(r) * r.valor, 0) / brutoObservado;
    // Atividades com coeficientes diferentes: enquanto o motor anual não
    // aceitar várias em paralelo, a média ponderada é usada mas o resultado
    // deixa de ser dado como certo.
    const coeficientesDistintos = new Set(doAno.map(coeficienteDoRecibo)).size > 1;

    const base = {
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
    };

    const simObservado = simularIRSAnual({ ...base, brutoAnual: brutoObservado });
    const simProjetado = anoCorrente
      ? simularIRSAnual({ ...base, brutoAnual: projecaoAnual })
      : simObservado;

    const confianca: Confianca =
      emFalta.length > 0 ? "fora-de-escopo" : coeficientesDistintos || anoCorrente ? "estimado" : "completo";

    return {
      sim: simObservado,
      simProjetado,
      confianca,
      emFalta,
      brutoObservado,
      projecaoAnual,
      mesesObservados,
      anoCorrente,
      coeficientesDistintos,
      retencoesPagas,
    };
  }, [recibos, prefs, ano]);

  if (!analise) {
    return (
      <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-3 flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Estimativa IRS de {ano}</h2>
          <InfoTip>Regista recibos para veres a estimativa do teu IRS anual com base nas taxas oficiais de 2026.</InfoTip>
        </div>
        <p className="text-xs text-stone-400">Regista o primeiro recibo de {ano} para ativar a estimativa.</p>
      </div>
    );
  }

  const { sim, simProjetado, confianca, emFalta, brutoObservado, projecaoAnual, mesesObservados, anoCorrente } = analise;

  // ── Faltam rendimentos que mudam de escalão: nada de valor único ──
  if (confianca === "fora-de-escopo") {
    return (
      <div className="rounded-4xl border border-amber-200 bg-amber-50 p-6 shadow-card dark:border-amber-800/40 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Estimativa IRS de {ano}</h2>
          <InfoTip>
            O IRS é progressivo: a taxa depende do rendimento TOTAL do agregado. Sem os rendimentos em falta, qualquer
            número que mostrássemos estaria provavelmente abaixo do real.
          </InfoTip>
        </div>
        <div className="mb-3 flex items-start gap-2">
          <span className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"><Warning size={15} /></span>
          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            Não conseguimos estimar o teu IRS com confiança: falta {emFalta.join(" e ")}. Como o imposto é
            progressivo, mostrar um número só com a categoria B iria subestimá-lo.
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3 dark:bg-stone-900/40">
          <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">O que já sabemos</p>
          <LinhaDetalhe label={`Faturação de ${ano}`} value={brutoObservado} />
          <LinhaDetalhe label="Retenções já feitas" value={analise.retencoesPagas} />
        </div>
        <Link
          href="/dashboard/simulador"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Completar o cenário no simulador <ArrowRight size={11} />
        </Link>
      </div>
    );
  }

  const positivo = sim.saldo >= 0;

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Estimativa IRS de {ano}</h2>
          <InfoTip>
            Estimativa baseada nos teus recibos e no regime simplificado (Art. 31.º CIRS). Inclui escalões
            progressivos, deduções e mínimo de existência. Não substitui o apuramento oficial.
          </InfoTip>
        </div>
        <Link
          href="/dashboard/simulador"
          className="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-brand transition-colors hover:underline"
        >
          Simulador completo
          <ArrowRight size={11} />
        </Link>
      </div>

      {/* Período observado — dito, não implícito. */}
      <p className="mb-3 text-[11px] leading-relaxed text-stone-400">
        {anoCorrente
          ? `Com base nos ${mesesObservados} meses já faturados de ${ano} (${fmt(brutoObservado)}). Ao ritmo atual, o ano fecharia perto de ${fmt(projecaoAnual)}.`
          : `Com base no ano completo de ${ano} (${fmt(brutoObservado)}).`}
      </p>

      {/* Saldo principal */}
      <div className={`mb-4 rounded-2xl p-4 ${positivo ? "bg-brand-light dark:bg-brand/10" : "bg-alert-bg"}`}>
        <p className="mb-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">
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
        {/* Intervalo: o que já foi faturado e o que o ano pode fechar. Um único
            número escondia a diferença entre os dois. */}
        {anoCorrente && Math.abs(simProjetado.irsEstimado - sim.irsEstimado) > 1 && (
          <p className="mt-2 border-t border-white/40 pt-2 text-[11px] text-stone-500 dark:border-stone-700 dark:text-stone-400">
            Se o ano fechar ao ritmo atual, o IRS ronda os{" "}
            <strong className="text-stone-700 dark:text-stone-200">{fmt(simProjetado.irsEstimado)}</strong> em vez de{" "}
            {fmt(sim.irsEstimado)}.
          </p>
        )}
      </div>

      {/* Breakdown */}
      <div className="space-y-2 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50">
        <LinhaDetalhe label="Faturação bruta" value={sim.brutoAnual} />
        <LinhaDetalhe label={`Coeficiente (${pct(sim.coeficiente)})`} value={sim.rendimentoCoeficiente} />
        {sim.acrescimo15 > 0 && <LinhaDetalhe label="Acréscimo regra 15%" value={sim.acrescimo15} />}
        <LinhaDetalhe label="Rend. tributável" value={sim.rendimentoTributavel} />
        {sim.rendimentoIsentoJovem > 0 && (
          <LinhaDetalhe label="Isenção IRS Jovem" value={-sim.rendimentoIsentoJovem} />
        )}
        <div className="border-t border-stone-200 pt-2 dark:border-stone-700">
          <LinhaDetalhe label="IRS estimado" value={sim.irsEstimado} destaque />
          <LinhaDetalhe label="Retenções efetivamente feitas" value={sim.retencoesPagas} />
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

      {analise.coeficientesDistintos && (
        <p className="mt-3 text-[10px] leading-relaxed text-stone-400">
          Tens atividades com coeficientes diferentes. Aplicámos a média ponderada pela faturação — para o apuramento
          exato, separa-as no simulador completo.
        </p>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-stone-400">
        Os valores dependem do teu perfil fiscal (ano de atividade, dependentes, deduções).{" "}
        <Link href="/dashboard/perfil" className="font-medium text-brand hover:underline">
          Ajustar no perfil fiscal
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
