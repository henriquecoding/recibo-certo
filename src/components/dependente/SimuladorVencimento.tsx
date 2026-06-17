"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { calcularVencimento, calcularVencimentoAnual, mealheiroDependente } from "@/lib/fiscal-dependente";
import { SS_DEPENDENTE, SUBSIDIO_REFEICAO, type EstadoCivilRet } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { useVencimentos, gerarCSVCenarios, type CenarioVencimento } from "@/lib/store/vencimentos";
import { History, Trash, Plus, ShieldCheck, Export } from "@/components/ui/Icons";

const DEPENDENTES = [0, 1, 2, 3, 4];

// Aceita vírgula ou ponto como separador decimal (pt-PT); nunca devolve NaN.
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
// Sanitização ao escrever: dígitos + separador decimal (euros) ou só dígitos.
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");
const soInteiro = (s: string) => s.replace(/\D/g, "").slice(0, 2);

export function SimuladorVencimento() {
  const [brutoStr, setBrutoStr] = useState("1500");
  const [dependentes, setDependentes] = useState(0);
  const [temSubsidio, setTemSubsidio] = useState(true);
  const [subsidioDiaStr, setSubsidioDiaStr] = useState("6");
  const [cartao, setCartao] = useState(true);
  const [diasUteisStr, setDiasUteisStr] = useState("22");
  // Como são pagos os subsídios de férias/Natal: por inteiro (nos meses
  // próprios) ou diluídos em duodécimos (frequente nos contratos a termo).
  const [duodecimos, setDuodecimos] = useState(false);
  // Rendimentos variáveis anuais (comissões, prémios, horas extra) para o mealheiro.
  const [variavelStr, setVariavelStr] = useState("");
  // Situação familiar para escolher a tabela de retenção (Despacho 233-A/2026).
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivilRet>("naoCasado");
  const [deficiencia, setDeficiencia] = useState(false);

  // Valores numéricos derivados — tolerantes a vírgula e a campo vazio.
  const bruto = num(brutoStr);
  const subsidioDia = num(subsidioDiaStr);
  const diasUteis = Math.min(31, Math.round(num(diasUteisStr)));

  const r = useMemo(
    () =>
      calcularVencimento({
        salarioBruto: bruto,
        dependentes,
        subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
        subsidioRefeicaoCartao: cartao,
        diasUteis,
        estadoCivil,
        deficiencia,
      }),
    [bruto, dependentes, temSubsidio, subsidioDia, cartao, diasUteis, estadoCivil, deficiencia]
  );
  const ra = useMemo(
    () =>
      calcularVencimentoAnual({
        salarioBruto: bruto,
        dependentes,
        subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
        subsidioRefeicaoCartao: cartao,
        diasUteis,
        estadoCivil,
        deficiencia,
      }),
    [bruto, dependentes, temSubsidio, subsidioDia, cartao, diasUteis, estadoCivil, deficiencia]
  );

  const variavelAnual = num(variavelStr);
  const meal = useMemo(
    () => mealheiroDependente({ salarioBruto: bruto, dependentes, variavelAnual, estadoCivil, deficiencia }),
    [bruto, dependentes, variavelAnual, estadoCivil, deficiencia]
  );

  const limiteSubsidio = cartao ? SUBSIDIO_REFEICAO.cartao.value : SUBSIDIO_REFEICAO.dinheiro.value;
  const subsidioExcede = temSubsidio && subsidioDia > limiteSubsidio;

  // Em duodécimos o líquido distribui-se por 12 meses iguais; por inteiro, o
  // mês normal não traz subsídio (esse recebe-se em junho/novembro).
  const liquidoMostrado = duodecimos ? ra.liquidoMedioMes : r.liquido;

  // Cenários guardados (modo duplo: local no grátis, nuvem no Pro).
  const { cenarios, carregado: cenariosProntos, naNuvem, plano, limite, limiteAtingido, guardar, remover } = useVencimentos();
  const [avisoGuardar, setAvisoGuardar] = useState<string | null>(null);

  function exportarCSV() {
    const csv = gerarCSVCenarios(cenarios);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recibocerto-cenarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function guardarCenario() {
    const res = guardar({
      salarioBruto: bruto,
      dependentes,
      subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
      subsidioRefeicaoCartao: cartao,
      diasUteis,
      duodecimos,
    });
    setAvisoGuardar(res.erro ?? null);
  }

  function carregarCenario(c: CenarioVencimento) {
    setBrutoStr(String(c.salarioBruto));
    setDependentes(c.dependentes);
    setTemSubsidio(c.subsidioRefeicaoDia > 0);
    setSubsidioDiaStr(String(c.subsidioRefeicaoDia || 6));
    setCartao(c.subsidioRefeicaoCartao);
    setDiasUteisStr(String(c.diasUteis));
    setDuodecimos(c.duodecimos);
    setAvisoGuardar(null);
  }

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        Simulador de recibo de vencimento
      </p>

      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <div>
          <label htmlFor="bruto" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Salário bruto mensal
          </label>
          <div className="relative">
            <input
              id="bruto"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={brutoStr}
              onChange={(e) => setBrutoStr(soDecimal(e.target.value))}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
          </div>
          <input
            type="range"
            aria-label="Salário bruto mensal"
            min={0}
            max={6000}
            step={50}
            value={Math.min(bruto, 6000)}
            onChange={(e) => setBrutoStr(e.target.value)}
            className="w-full mt-2 accent-brand"
          />
        </div>

        <div>
          <span className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Dependentes
          </span>
          <div className="flex gap-2" role="group" aria-label="Número de dependentes">
            {DEPENDENTES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dependentes === d}
                onClick={() => setDependentes(d)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                  dependentes === d
                    ? "border-brand bg-brand text-white shadow-glow"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
                }`}
              >
                {d === 4 ? "4+" : d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Situação familiar — define a tabela de retenção */}
      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <div>
          <span className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Situação{" "}
            <InfoTip label="Tabela de retenção">
              "Casado, único titular" aplica-se quando o cônjuge não tem rendimentos (ou tem menos de 5%).
              Define a tabela de retenção do Despacho 233-A/2026.
            </InfoTip>
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação familiar">
            {([
              ["naoCasado", "Não casado"],
              ["casadoDois", "Casado, 2 titulares"],
              ["casadoUnico", "Casado, 1 titular"],
            ] as [EstadoCivilRet, string][]).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={estadoCivil === k}
                onClick={() => setEstadoCivil(k)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  estadoCivil === k
                    ? "border-brand bg-brand text-white shadow-glow"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Deficiência{" "}
            <InfoTip label="Grau ≥ 60%">
              Titular com grau de incapacidade permanente igual ou superior a 60% — usa as tabelas IV a VII.
            </InfoTip>
          </span>
          <label className="flex items-center gap-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 cursor-pointer">
            <input type="checkbox" checked={deficiencia} onChange={(e) => setDeficiencia(e.target.checked)} className="h-4 w-4 accent-brand" />
            <span className="text-sm text-stone-700 dark:text-stone-300">Tenho grau de incapacidade ≥ 60%</span>
          </label>
        </div>
      </div>

      {/* Subsídio de refeição */}
      <div className="mb-6 rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={temSubsidio}
            onChange={(e) => setTemSubsidio(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Tenho subsídio de refeição
          </span>
          <InfoTip label="Limites de isenção 2026">
            Isento até {fmt(SUBSIDIO_REFEICAO.dinheiro.value)}/dia em dinheiro e {fmt(SUBSIDIO_REFEICAO.cartao.value)}/dia em cartão.
          </InfoTip>
        </label>

        {temSubsidio && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="subdia" className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                Valor por dia
              </label>
              <div className="relative">
                <input
                  id="subdia"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={subsidioDiaStr}
                  onChange={(e) => setSubsidioDiaStr(soDecimal(e.target.value))}
                  className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Forma</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  aria-pressed={cartao}
                  onClick={() => setCartao(true)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-all ${cartao ? "border-brand bg-brand text-white" : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-brand"}`}
                >
                  Cartão
                </button>
                <button
                  type="button"
                  aria-pressed={!cartao}
                  onClick={() => setCartao(false)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-all ${!cartao ? "border-brand bg-brand text-white" : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-brand"}`}
                >
                  Dinheiro
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="dias" className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                Dias úteis
              </label>
              <input
                id="dias"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={diasUteisStr}
                onChange={(e) => setDiasUteisStr(soInteiro(e.target.value))}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        )}
      </div>

      {/* Resultado */}
      <m.div
        key={`${bruto}-${dependentes}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="space-y-3"
      >
        {/* Subsídios de férias e Natal — por inteiro vs. duodécimos */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5">
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
            Subsídios de férias e Natal
            <InfoTip label="Como recebes os subsídios">
              Por inteiro: recebes 14 meses (o de férias e o de Natal nos meses próprios).
              Em duodécimos, cada subsídio é diluído por 12 meses — comum nos contratos a termo.
              O IRS anual é igual nos dois casos; só muda a distribuição.
            </InfoTip>
          </span>
          <div className="flex gap-1.5" role="group" aria-label="Pagamento dos subsídios">
            <button
              type="button"
              aria-pressed={!duodecimos}
              onClick={() => setDuodecimos(false)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${!duodecimos ? "border-brand bg-brand text-white" : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-brand"}`}
            >
              Por inteiro
            </button>
            <button
              type="button"
              aria-pressed={duodecimos}
              onClick={() => setDuodecimos(true)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${duodecimos ? "border-brand bg-brand text-white" : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-brand"}`}
            >
              Em duodécimos
            </button>
          </div>
        </div>

        {/* Líquido — número-herói */}
        <div className="rounded-2xl bg-brand/8 dark:bg-brand/10 border border-brand/20 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-1">
            Vencimento líquido estimado
          </p>
          <p className="font-display text-4xl font-semibold text-brand tabular-nums">
            {fmt(liquidoMostrado)}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {duodecimos
              ? "por mês, em média (subsídios em duodécimos)"
              : "num mês normal, sem subsídio · compara com o teu recibo"}
          </p>
        </div>

        {/* Decomposição */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
            <p className="text-xs text-stone-400 mb-1">Bruto</p>
            <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">{fmt(r.bruto)}</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
            <p className="text-xs text-stone-400 mb-1">
              Seg. Social{" "}
              <InfoTip label="Taxa do trabalhador">{pct(SS_DEPENDENTE.trabalhador.value)} sobre o bruto.</InfoTip>
            </p>
            <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">−{fmt(r.ssTrabalhador)}</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
            <p className="text-xs text-stone-400 mb-1">
              Retenção IRS{" "}
              <InfoTip label="Base legal">Despacho 233-A/2026 — tabelas de retenção na fonte.</InfoTip>
            </p>
            <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">−{fmt(r.irsRetido)}</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
            <p className="text-xs text-stone-400 mb-1">Taxa efetiva</p>
            <p className="font-display text-lg font-semibold text-brand tabular-nums">{pct(r.taxaEfetiva)}</p>
            <p className="text-xs text-stone-400 mt-0.5">IRS + SS / bruto</p>
          </div>
        </div>

        {/* Subsídio + custo empresa */}
        <div className="grid gap-3 sm:grid-cols-2">
          {temSubsidio && (
            <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4 text-sm">
              <p className="text-xs text-stone-400 mb-1">Subsídio de refeição</p>
              <p className="text-stone-700 dark:text-stone-300">
                {fmt(r.subsidioRefeicaoTotal)} <span className="text-stone-400">· {fmt(r.subsidioRefeicaoIsento)} isento</span>
              </p>
              {subsidioExcede && (
                <p className="text-xs text-alert-text dark:text-amber-400 mt-1">
                  {fmt(r.subsidioRefeicaoTributado)} acima do limite ({fmt(limiteSubsidio)}/dia) — sujeito a IRS/SS.
                </p>
              )}
            </div>
          )}
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4 text-sm">
            <p className="text-xs text-stone-400 mb-1">
              Custo para a empresa{" "}
              <InfoTip label="TSU">Bruto + {pct(SS_DEPENDENTE.entidade.value)} de contribuição da entidade.</InfoTip>
            </p>
            <p className="text-stone-700 dark:text-stone-300 tabular-nums">{fmt(r.custoEmpresa)}/mês</p>
          </div>
        </div>

        {/* Visão anual — 14 meses */}
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              Ao ano (14 meses)
              <InfoTip label="Retenção autónoma">
                Os subsídios de férias e de Natal são tributados em separado do salário
                (Art. 99.º-C CIRS): a fórmula da tabela aplica-se ao valor de cada um.
              </InfoTip>
            </p>
            <span className="text-xs text-stone-400">líquido {fmt(ra.liquidoAnual)}/ano</span>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-stone-400">Bruto anual</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(ra.brutoAnual)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Subsídio de férias</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">
                {fmt(ra.subsidioFerias)} <span className="text-xs text-stone-400">· −{fmt(ra.irsFerias)} IRS</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Subsídio de Natal</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">
                {fmt(ra.subsidioNatal)} <span className="text-xs text-stone-400">· −{fmt(ra.irsNatal)} IRS</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">IRS + SS no ano</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">−{fmt(ra.irsAnual + ra.ssAnual)}</dd>
            </div>
          </dl>
        </div>

        {/* Mealheiro fiscal — acerto anual de IRS */}
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              Mealheiro fiscal · acerto anual
              <InfoTip label="Rendimentos variáveis">
                Comissões, prémios e horas extra são muitas vezes sub-retidos: a retenção mensal
                segue o salário base, mas o IRS anual incide sobre o total. Mostramos quanto reservar.
              </InfoTip>
            </p>
            <div className="relative w-36">
              <input
                id="variavel"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={variavelStr}
                onChange={(e) => setVariavelStr(soDecimal(e.target.value))}
                placeholder="Variável/ano"
                aria-label="Rendimentos variáveis anuais"
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-stone-400">IRS apurado/ano</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(meal.irsApurado)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">IRS retido/ano</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(meal.irsRetido)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">{meal.acerto > 0 ? "A reservar/mês" : "Reembolso estimado"}</dt>
              <dd className={`font-semibold tabular-nums ${meal.acerto > 0 ? "text-alert-text dark:text-amber-400" : "text-brand"}`}>
                {meal.acerto > 0 ? fmt(meal.reservaMensal) : fmt(Math.abs(meal.acerto))}
              </dd>
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-2">
            {meal.acerto > 0
              ? `Reserva ${fmt(meal.reservaMensal)}/mês (${fmt(meal.acerto)} no ano) para o acerto de IRS.`
              : "Pela estimativa, não deverás IRS adicional no acerto anual."}
          </p>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed pt-1">
          Estimativa para o Continente (Tabelas I a VII do Despacho 233-A/2026, conforme a situação
          e a deficiência), ano completo de trabalho e ambos os subsídios iguais ao salário base.
          Não cobre as Regiões Autónomas (Açores/Madeira) nem o excesso do subsídio de refeição.
          Não substitui o teu recibo oficial nem aconselhamento de um contabilista.
        </p>
      </m.div>

      {/* Guardar / histórico de cenários (modo duplo + tiering) */}
      <div className="mt-5 border-t border-stone-100 dark:border-stone-800 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
            <History size={14} /> Cenários guardados
            <span className="text-stone-400 font-normal">
              {naNuvem ? "· sincronizados (Pro)" : `· ${cenarios.length}/${limite} grátis`}
            </span>
          </span>
          <button
            type="button"
            onClick={guardarCenario}
            disabled={limiteAtingido}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark transition-all hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} /> Guardar este cenário
          </button>
        </div>

        {avisoGuardar && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand-light p-3">
            <span className="text-brand-dark mt-0.5"><ShieldCheck size={14} /></span>
            <p className="text-xs text-brand-dark">
              {avisoGuardar}{" "}
              <Link href="/precos" className="font-semibold underline underline-offset-2">Ver o plano Pro</Link>
            </p>
          </div>
        )}

        {cenariosProntos && cenarios.length > 0 && (
          <ul className="mt-3 space-y-2">
            {cenarios.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => carregarCenario(c)}
                  className="flex-1 text-left"
                >
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-100 tabular-nums">
                    {fmt(c.salarioBruto)}/mês
                  </span>
                  <span className="text-xs text-stone-400">
                    {" "}· {c.dependentes} dep.{c.duodecimos ? " · duodécimos" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => remover(c.id)}
                  aria-label="Remover cenário"
                  className="flex-shrink-0 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-alert-text"
                >
                  <Trash size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {cenariosProntos && cenarios.length > 0 && (
          <div className="mt-3 flex justify-end">
            {plano === "pro" ? (
              <button
                type="button"
                onClick={exportarCSV}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 transition-colors hover:text-brand"
              >
                <Export size={14} /> Exportar CSV
              </button>
            ) : (
              <Link
                href="/precos"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 transition-colors hover:text-brand"
              >
                <Export size={14} /> Exportar CSV (Pro)
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
