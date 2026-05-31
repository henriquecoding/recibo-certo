"use client";

import { useState } from "react";
import Link from "next/link";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Check, Warning } from "@/components/ui/Icons";
import { pct } from "@/lib/format";
import { calcular, taxaIVAEfetiva, type RegimeIVA } from "@/lib/fiscal";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import InfoTip from "@/components/ui/InfoTip";
import {
  SS_TAXA,
  IVA_TAXAS,
  ATIVIDADES,
  efeitoFiscal,
  BASE_SS_POR_TIPO,
  META_TIPO,
  META_REGIAO,
  META_BASE_SS,
  IRS_JOVEM,
  DISPENSA_RETENCAO_LIMITE,
  type Atividade,
  type Regiao,
  type BaseSS,
  type EscalaoIVA,
} from "@/lib/fiscal-data";

const ATIVIDADE_DEFAULT = ATIVIDADES.find((a) => a.label.includes("Programador")) ?? ATIVIDADES[0];

const REGIOES = Object.keys(META_REGIAO) as Regiao[];
const BASES_SS = Object.keys(META_BASE_SS) as BaseSS[];
const ESCALOES: EscalaoIVA[] = ["reduzida", "intermedia", "normal"];
const ESCALAO_LABEL: Record<EscalaoIVA, string> = {
  reduzida: "Reduzida",
  intermedia: "Intermédia",
  normal: "Normal",
};

export default function Calculadora() {
  const [bruto, setBruto] = useState(1500);
  const [inputVal, setInputVal] = useState("1500");
  const [atividade, setAtividade] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [regimeIVA, setRegimeIVA] = useState<RegimeIVA>("isento");
  const [baseSS, setBaseSS] = useState<BaseSS>(BASE_SS_POR_TIPO[ATIVIDADE_DEFAULT.tipo]);
  const tipo = atividade.tipo;
  const ef = efeitoFiscal(atividade);

  const escolherAtividade = (a: Atividade) => {
    setAtividade(a);
    setBaseSS(efeitoFiscal(a).baseSS);
  };
  const [dispensaRetencao, setDispensaRetencao] = useState(false);
  const [isencaoSSPrimeiroAno, setIsencaoSSPrimeiroAno] = useState(false);
  const [acumulaEmprego, setAcumulaEmprego] = useState(false);
  const [irsJovemAno, setIrsJovemAno] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  // Por defeito, assumimos que o valor escrito é o TOTAL que o cliente paga (IVA
  // incluído): extraímos o IVA por dentro (base = total / (1 + taxa)), pelo que o
  // IVA reduz o disponível. Quem fatura "honorário + IVA por cima" desliga o toggle.
  const [ivaIncluido, setIvaIncluido] = useState(true);

  const taxaIva = taxaIVAEfetiva(regiao, regimeIVA);
  const temIva = taxaIva > 0;
  const base = ivaIncluido && temIva ? bruto / (1 + taxaIva) : bruto;
  const labelValor = !temIva
    ? "Valor do serviço (€)"
    : ivaIncluido
      ? "Valor cobrado ao cliente, com IVA (€)"
      : "O teu honorário, sem IVA (€)";

  const result = calcular({
    bruto: base,
    tipo,
    regiao,
    regimeIVA,
    baseSS,
    dispensaRetencao,
    isencaoSSPrimeiroAno,
    acumulaEmprego,
    irsJovemAno,
    retencaoOverride: ef.retencao,
  });

  const handleInput = (v: string) => {
    setInputVal(v);
    const n = parseFloat(v.replace(",", "."));
    setBruto(!isNaN(n) && n >= 0 ? n : 0);
  };

  const barsTotal = result.retencaoIRS + result.iva + result.segSocial + result.liquido || 1;
  const barW = (v: number) => `${Math.max(0, (v / barsTotal) * 100).toFixed(1)}%`;

  const ivaOptions: { id: RegimeIVA; label: string; sub: string }[] = [
    { id: "isento", label: "Isento", sub: "Art. 53.º" },
    ...ESCALOES.map((e) => ({
      id: e as RegimeIVA,
      label: pct(IVA_TAXAS[regiao].value[e]),
      sub: ESCALAO_LABEL[e],
    })),
  ];

  const checkboxes = [
    {
      id: "dispensa",
      label: "Dispensa de retenção na fonte",
      sub: `1.º ano ou faturação anual < ${DISPENSA_RETENCAO_LIMITE.value.toLocaleString("pt-PT")} € (Art. 101.º-B)`,
      val: dispensaRetencao,
      set: setDispensaRetencao,
    },
    {
      id: "ss1ano",
      label: "1.º ano de atividade (Seg. Social)",
      sub: "Isenção de contribuições nos primeiros 12 meses",
      val: isencaoSSPrimeiroAno,
      set: setIsencaoSSPrimeiroAno,
    },
    {
      id: "acumula",
      label: "Acumulo com trabalho dependente",
      sub: "Trabalho por conta de outrem já cobre a Segurança Social",
      val: acumulaEmprego,
      set: setAcumulaEmprego,
    },
  ];

  return (
    <div id="calculadora" className="relative scroll-mt-24">
      <div
        className="absolute inset-0 rounded-3xl opacity-30 pointer-events-none dark:opacity-0"
        style={{ background: "radial-gradient(ellipse at 80% 20%, #E1F5EE 0%, transparent 60%)" }}
      />

      <div className="relative grid lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-stone-200 shadow-lift">
        {/* ── Inputs ── */}
        <div className="bg-white p-8 lg:p-10">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] mb-1 text-brand">Calculadora 2026</div>
            <h3 className="font-display text-2xl font-semibold text-stone-800">Quanto fica realmente teu?</h3>
          </div>

          {/* Valor do serviço */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-1.5">
              <label htmlFor="valor-recibo" className="text-sm font-medium uppercase tracking-wider text-stone-500">
                {labelValor}
              </label>
              <InfoTip label="O que indicar aqui">
                Assumimos que o valor que escreves é o total que o cliente te paga, com IVA incluído — separamos o IVA
                por dentro, por isso ele reduz o que te sobra. Se preferires indicar só o teu honorário e somar o IVA
                por cima, escolhe &quot;IVA à parte&quot;.
              </InfoTip>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg font-medium">€</span>
              <input
                id="valor-recibo"
                type="number"
                inputMode="decimal"
                value={inputVal}
                onChange={(e) => handleInput(e.target.value)}
                className="font-display w-full pl-9 pr-4 py-3.5 text-xl font-semibold text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                placeholder="1500"
                min={0}
                step={50}
              />
            </div>
            {temIva && (
              <div role="group" aria-label="O valor inclui IVA?" className="mt-2 inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
                {([
                  { incl: true, label: "Com IVA incluído" },
                  { incl: false, label: "IVA à parte" },
                ] as const).map((o) => {
                  const active = ivaIncluido === o.incl;
                  return (
                    <button
                      key={o.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setIvaIncluido(o.incl)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${active ? "bg-white text-brand-dark shadow-card" : "text-stone-500 hover:text-stone-700"}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tipo de atividade */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-sm font-medium uppercase tracking-wider text-stone-500">Tipo de atividade</span>
              <InfoTip label="O que é o tipo de atividade">
                Procura a tua profissão na lista oficial (Art. 151.º do CIRS). Define a taxa de retenção na fonte, o
                coeficiente do regime simplificado e a base da Segurança Social.
              </InfoTip>
            </div>
            <ActivityCombobox value={atividade} onChange={escolherAtividade} />
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-brand-light px-2.5 py-1 font-semibold text-brand-dark">
                Retenção {pct(ef.retencao)}
              </span>
              <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-medium text-stone-500">
                Coeficiente {pct(ef.coef)}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">{ef.nota ?? META_TIPO[tipo].info}</p>
          </div>

          {/* Regime de IVA */}
          <fieldset className="mb-6">
            <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-stone-500">
              Regime de IVA · {META_REGIAO[regiao]}
              <InfoTip label="O que é o regime de IVA">
                Abaixo de 15.000 €/ano de faturação ficas isento (Art. 53.º). Acima, cobras IVA à taxa da tua atividade e
                região. O IVA cobrado pertence ao Estado — entra na conta mas é entregue depois, por isso não altera o
                &quot;disponível para gastar&quot;.
              </InfoTip>
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ivaOptions.map((op) => {
                const active = regimeIVA === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRegimeIVA(op.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      active ? "border-brand bg-brand-light" : "border-stone-200 hover:border-stone-300 bg-stone-50"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700"}`}>
                      {op.label}
                    </div>
                    <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{op.sub}</div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Opções (situação fiscal) */}
          <div className="space-y-3">
            {checkboxes.map((cb) => (
              <button
                key={cb.id}
                type="button"
                role="checkbox"
                aria-checked={cb.val}
                onClick={() => cb.set(!cb.val)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  cb.val ? "border-brand bg-brand-light" : "border-stone-200 hover:border-stone-300 bg-stone-50"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    cb.val ? "bg-brand border-brand text-white" : "border-stone-300 text-transparent"
                  }`}
                >
                  <Check size={12} />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${cb.val ? "text-brand-dark" : "text-stone-700"}`}>
                    {cb.label}
                  </div>
                  <div className={`text-xs ${cb.val ? "text-brand" : "text-stone-400"}`}>{cb.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Opções avançadas (divulgação progressiva) */}
          <div className="mt-5 pt-5 border-t border-stone-100">
            <button
              type="button"
              aria-expanded={advanced}
              onClick={() => setAdvanced((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-700 transition-colors"
            >
              <span>Opções avançadas</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`transition-transform ${advanced ? "rotate-180" : ""}`} aria-hidden>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {advanced && (
              <div className="mt-4 space-y-5">
                {/* Região */}
                <div>
                  <span className="text-sm font-medium text-stone-500 uppercase tracking-wider block mb-2">Região</span>
                  <div className="grid grid-cols-3 gap-2">
                    {REGIOES.map((r) => {
                      const active = regiao === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setRegiao(r)}
                          className={`p-2.5 rounded-xl border text-center text-sm font-semibold transition-all ${
                            active ? "border-brand bg-brand-light text-brand-dark" : "border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-600"
                          }`}
                        >
                          {META_REGIAO[r]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Base da Segurança Social */}
                <div>
                  <span className="text-sm font-medium text-stone-500 uppercase tracking-wider block mb-2">
                    Natureza para a Segurança Social
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {BASES_SS.map((b) => {
                      const active = baseSS === b;
                      return (
                        <button
                          key={b}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setBaseSS(b)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            active ? "border-brand bg-brand-light" : "border-stone-200 hover:border-stone-300 bg-stone-50"
                          }`}
                        >
                          <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700"}`}>
                            {META_BASE_SS[b].label}
                          </div>
                          <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{META_BASE_SS[b].sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* IRS Jovem */}
                <div>
                  <label htmlFor="irs-jovem" className="text-sm font-medium text-stone-500 uppercase tracking-wider block mb-2">
                    IRS Jovem (até {IRS_JOVEM.idadeMax.value} anos)
                  </label>
                  <select
                    id="irs-jovem"
                    value={irsJovemAno}
                    onChange={(e) => setIrsJovemAno(Number(e.target.value))}
                    className="w-full px-4 py-3 text-sm font-semibold text-stone-700 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                  >
                    <option value={0}>Não aplicável</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((ano) => (
                      <option key={ano} value={ano}>
                        {`${ano}.º ano de rendimentos — isenção ${pct(IRS_JOVEM.isencaoPorAno.value[ano])}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Resultado ── */}
        <div className="bg-cream p-8 lg:p-10 flex flex-col">
          <div className="mb-8">
            <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">O que é realmente teu</div>
            <div className="font-display text-5xl font-semibold leading-none mb-1 text-brand">
              <AnimatedNumber value={result.liquido} />
            </div>
            <div className="text-sm text-stone-400 mt-1">
              de <AnimatedNumber value={result.bruto} /> faturados
              {result.taxaIVA > 0 && (
                <span>
                  {" · "}entra na conta: <AnimatedNumber value={result.entradaConta} />
                </span>
              )}
            </div>
          </div>

          {/* Barra visual */}
          <div className="mb-6">
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
              <div className="transition-all duration-500 rounded-l-full" style={{ width: barW(result.liquido), background: "#1D9E75" }} />
              {result.retencaoIRS > 0 && (
                <div className="transition-all duration-500" style={{ width: barW(result.retencaoIRS), background: "#9FE1CB" }} />
              )}
              {result.iva > 0 && (
                <div className="transition-all duration-500" style={{ width: barW(result.iva), background: "#FFF8A0" }} />
              )}
              {result.segSocial > 0 && (
                <div className="transition-all duration-500 rounded-r-full" style={{ width: barW(result.segSocial), background: "#D3D1C7" }} />
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Teu", color: "#1D9E75", show: true },
                { label: "Retenção IRS", color: "#9FE1CB", show: result.retencaoIRS > 0 },
                { label: "IVA", color: "#E8D97A", show: result.iva > 0 },
                { label: "Seg. Social", color: "#B4B2A9", show: result.segSocial > 0 },
              ]
                .filter((l) => l.show)
                .map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
                    <span className="text-xs text-stone-500">{l.label}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-1 flex-1">
            <DetalheRow label="Valor do serviço" value={result.bruto} type="neutral" note="O que faturaste" />
            {result.isencaoJovem > 0 && (
              <DetalheRow
                label={`IRS Jovem (isenção ${pct(result.isencaoJovem)})`}
                value={0}
                type="neutral"
                note="Reduz a base de retenção"
                hideValue
              />
            )}
            {result.taxaIVA > 0 && (
              <DetalheRow label={`IVA cobrado (${pct(result.taxaIVA)})`} value={result.iva} type="warning" note="Pertence ao Estado" />
            )}
            {result.taxaIVA > 0 && (
              <DetalheRow label="O cliente paga" value={result.bruto + result.iva} type="neutral" note="Valor base + IVA" />
            )}
            {result.retencaoIRS > 0 && (
              <DetalheRow
                label={`Retenção na fonte (${pct(result.taxaRetencao)})`}
                value={-result.retencaoIRS}
                type="deducao"
                note="Adiantamento de IRS"
              />
            )}
            <DetalheRow
              label="Entra na tua conta"
              value={result.entradaConta}
              type="subtotal"
              note={result.taxaIVA > 0 ? "Bruto + IVA − Retenção" : "Após retenção"}
            />
            {result.taxaIVA > 0 && (
              <DetalheRow label="Reservar para IVA" value={-result.iva} type="warning" note="Entrega trimestral" />
            )}
            {result.segSocial > 0 && (
              <DetalheRow label={`Reservar para SS (${pct(SS_TAXA.value)})`} value={-result.segSocial} type="deducao" note="Pagamento mensal" />
            )}

            {/* Resultado final */}
            <div className="mt-4 p-4 rounded-2xl border-2 border-brand bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-semibold text-stone-700">Disponível para gastar</div>
                    <InfoTip>
                      O que é mesmo teu: bruto menos IRS e Segurança Social. O IVA não entra aqui — é dinheiro do Estado
                      que só passa pela tua conta. Por isso mudar o regime de IVA altera o que recebes e o que reservas,
                      mas não o que é teu.
                    </InfoTip>
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    {result.taxaIVA > 0 ? "O IVA é do Estado — não conta aqui" : "Sem culpa, sem surpresas"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-semibold text-brand">
                    <AnimatedNumber value={result.liquido} />
                  </div>
                  <div className="text-xs text-stone-400">{pct(result.liquido / (result.bruto || 1))} do bruto</div>
                </div>
              </div>
            </div>

            {/* Avisos contextuais */}
            {result.avisos.length > 0 && (
              <div className="mt-3 space-y-2">
                {result.avisos.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border bg-alert-bg border-alert-border">
                    <span className="text-alert-text mt-0.5 flex-shrink-0">
                      <Warning size={14} />
                    </span>
                    <span className="text-xs leading-relaxed text-alert-text">{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-stone-400 mt-5 leading-relaxed">
            Estimativa de tesouraria por recibo. Taxas de 2026. Não substitui aconselhamento de um contabilista
            certificado.
          </p>
          <Link
            href="/dashboard/simulador"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
          >
            Ver o apuramento anual de IRS (regime simplificado e escalões)
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

type RowType = "neutral" | "deducao" | "warning" | "subtotal";

function DetalheRow({
  label,
  value,
  type,
  note,
  hideValue = false,
}: {
  label: string;
  value: number;
  type: RowType;
  note?: string;
  hideValue?: boolean;
}) {
  const styles: Record<RowType, string> = {
    neutral: "bg-white border-stone-100 text-stone-700",
    deducao: "bg-clay-bg border-clay-border text-clay-text",
    warning: "bg-alert-bg border-alert-border text-alert-text",
    subtotal: "bg-stone-100 border-stone-200 text-stone-800 font-semibold",
  };

  return (
    <div className={`flex justify-between items-center px-4 py-2.5 rounded-xl border transition-all ${styles[type]}`}>
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        {note && <span className="text-[11px] opacity-60 mt-0.5">{note}</span>}
      </div>
      {!hideValue && (
        <span className="text-sm font-semibold tabular-nums">
          <AnimatedNumber value={value} />
        </span>
      )}
    </div>
  );
}
