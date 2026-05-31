"use client";

import { useMemo, useState } from "react";
import { compararRegimes } from "@/lib/fiscal";
import { fmt } from "@/lib/format";
import { Warning, Check } from "@/components/ui/Icons";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import InfoTip from "@/components/ui/InfoTip";
import { META_TIPO, DERRAMA_MAX, type TipoAtividade } from "@/lib/fiscal-data";

export default function ComparadorPage() {
  const [brutoStr, setBrutoStr] = useState("40000");
  const [despesasStr, setDespesasStr] = useState("2000");
  const [custosStr, setCustosStr] = useState("1800");
  const [tipo, setTipo] = useState<TipoAtividade>("art151");

  const r = useMemo(
    () =>
      compararRegimes({
        brutoAnual: parseFloat(brutoStr.replace(",", ".")) || 0,
        tipo,
        despesas: parseFloat(despesasStr.replace(",", ".")) || 0,
        custosEmpresa: parseFloat(custosStr.replace(",", ".")) || 0,
      }),
    [brutoStr, despesasStr, custosStr, tipo]
  );

  const empresaVence = r.diferenca > 0;
  const campo =
    "w-full px-3.5 py-2.5 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all";
  const rotulo = "text-xs font-medium text-stone-500 uppercase tracking-wider block mb-1.5";

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-stone-800">Recibos verdes vs empresa</h1>
        <p className="mt-1 text-sm text-stone-500">A partir de que rendimento pode compensar abrir uma sociedade?</p>
      </header>

      {/* Entradas */}
      <div className="mb-6 grid gap-4 rounded-4xl border border-stone-100 bg-white p-6 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="bruto" className={rotulo}>Faturação anual (€)</label>
          <input id="bruto" type="number" inputMode="decimal" min={0} step={1000} value={brutoStr} onChange={(e) => setBrutoStr(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="tipo" className={rotulo}>Atividade</label>
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoAtividade)} className={campo}>
            {(Object.keys(META_TIPO) as TipoAtividade[]).map((t) => (
              <option key={t} value={t}>{META_TIPO[t].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="despesas" className={rotulo}>Despesas (€)</label>
          <input id="despesas" type="number" inputMode="decimal" min={0} step={100} value={despesasStr} onChange={(e) => setDespesasStr(e.target.value)} className={campo} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="custos" className={rotulo}>Custos extra empresa (€)</label>
            <InfoTip>Custos que só a empresa tem: contabilista certificado obrigatório, administração, etc. Tipicamente 1.500–2.500 €/ano.</InfoTip>
          </div>
          <input id="custos" type="number" inputMode="decimal" min={0} step={100} value={custosStr} onChange={(e) => setCustosStr(e.target.value)} className={campo} />
        </div>
      </div>

      {/* Veredicto */}
      <div className={`mb-6 flex items-center gap-3 rounded-2xl border-2 p-4 ${empresaVence ? "border-brand bg-brand-light" : "border-stone-200 bg-white"}`}>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Check size={16} />
        </span>
        <div>
          <div className="text-sm font-semibold text-stone-800">
            {empresaVence ? "A empresa pode compensar" : "Os recibos verdes compensam"}
          </div>
          <div className="text-xs text-stone-500">
            Diferença estimada de <strong>{fmt(Math.abs(r.diferenca))}</strong>/ano a favor de{" "}
            {empresaVence ? "uma sociedade" : "recibos verdes"}.
          </div>
        </div>
      </div>

      {/* Duas colunas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`rounded-4xl border bg-white p-6 shadow-card ${!empresaVence ? "border-brand" : "border-stone-100"}`}>
          <h2 className="font-display text-lg font-semibold text-stone-800">Recibos verdes</h2>
          <div className="mt-1 mb-4 text-xs text-stone-400">Trabalhador independente · categoria B</div>
          <Linha label="IRS estimado" value={r.freelancer.irs} sinal="−" />
          <Linha label="Segurança Social" value={r.freelancer.ss} sinal="−" />
          <Linha label="Despesas" value={r.freelancer.despesas} sinal="−" />
          <div className="mt-3 border-t border-stone-100 pt-3">
            <Linha label="Líquido para ti" value={r.freelancer.liquido} forte />
          </div>
        </div>

        <div className={`rounded-4xl border bg-white p-6 shadow-card ${empresaVence ? "border-brand" : "border-stone-100"}`}>
          <h2 className="font-display text-lg font-semibold text-stone-800">Empresa (sociedade)</h2>
          <div className="mt-1 mb-4 text-xs text-stone-400">IRC + distribuição de dividendos</div>
          <Linha label="Lucro tributável" value={r.empresa.lucroTributavel} />
          <Linha label="IRC" value={r.empresa.irc} sinal="−" />
          <Linha label="Derrama municipal" value={r.empresa.derrama} sinal="−" />
          <Linha label="Imposto sobre dividendos (28%)" value={r.empresa.dividendos} sinal="−" />
          <div className="mt-3 border-t border-stone-100 pt-3">
            <Linha label="Líquido para ti" value={r.empresa.liquido} forte />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-4">
        <span className="mt-0.5 flex-shrink-0 text-alert-text"><Warning size={14} /></span>
        <p className="text-xs leading-relaxed text-alert-text">
          Estimativa de ordem de grandeza. O modelo da empresa assume distribuição de todo o lucro como dividendos e
          derrama de {pctMax()}. <strong>Não</strong> considera salário/Segurança Social do gerente, tributação autónoma,
          a opção de englobamento dos dividendos, custos de constituição, nem otimizações salário/dividendos. A decisão de
          abrir uma sociedade deve ser sempre validada com um contabilista certificado.
        </p>
      </div>
    </div>
  );
}

function pctMax() {
  return `${(DERRAMA_MAX.value * 100).toFixed(1).replace(".", ",")}%`;
}

function Linha({ label, value, sinal, forte = false }: { label: string; value: number; sinal?: "−" | "+"; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${forte ? "font-semibold text-stone-800" : "text-stone-500"}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${forte ? "text-brand" : "text-stone-700"}`}>
        {sinal && `${sinal} `}
        <AnimatedNumber value={value} />
      </span>
    </div>
  );
}
