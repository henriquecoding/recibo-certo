"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { simularIRSAnual, calcularCategoriaF } from "@/lib/fiscal";
import { useRecibos } from "@/lib/store/recibos";
import { fmt, pct } from "@/lib/format";
import { Warning, Check, ChartProjection } from "@/components/ui/Icons";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import InfoTip from "@/components/ui/InfoTip";
import ProHint from "@/components/ui/ProHint";
import {
  ATIVIDADES,
  efeitoFiscal,
  IRS_JOVEM,
  REGIME_SIMPLIFICADO,
  DEDUCAO_ESPECIFICA_CATB,
  MINIMO_EXISTENCIA,
  CATEGORIA_F,
  META_DURACAO,
  type Atividade,
  type DuracaoArrendamento,
} from "@/lib/fiscal-data";

const ATIVIDADE_DEFAULT = ATIVIDADES.find((a) => a.label.includes("Programador")) ?? ATIVIDADES[0];
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

const campo =
  "w-full px-3.5 py-2.5 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all";
const rotulo = "text-xs font-medium text-stone-500 uppercase tracking-wider";

export default function SimuladorPage() {
  const { recibos, carregado, resumo } = useRecibos();

  // Categoria de rendimento: B (recibos verdes) ou F (rendas prediais).
  const [categoria, setCategoria] = useState<"B" | "F">("B");

  const [atividade, setAtividade] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [brutoStr, setBrutoStr] = useState("25000");
  const [retStr, setRetStr] = useState("");
  const [despesasStr, setDespesasStr] = useState("");
  const [regimeC, setRegimeC] = useState<"simplificado" | "organizada">("simplificado");
  const [anoAtividade, setAnoAtividade] = useState(3);
  const [irsJovemAno, setIrsJovemAno] = useState(0);

  // Módulos opcionais.
  const [famOn, setFamOn] = useState(false);
  const [conjunta, setConjunta] = useState(false);
  const [dependentesStr, setDependentesStr] = useState("0");
  const [outrosOn, setOutrosOn] = useState(false);
  const [outrosStr, setOutrosStr] = useState("");
  const [deducoesOn, setDeducoesOn] = useState(false);
  const [saudeStr, setSaudeStr] = useState("");
  const [educacaoStr, setEducacaoStr] = useState("");
  const [geraisStr, setGeraisStr] = useState("");

  // Categoria F (rendas prediais).
  const [rendaStr, setRendaStr] = useState("12000");
  const [despesasFStr, setDespesasFStr] = useState("");
  const [habitacao, setHabitacao] = useState(true);
  const [duracao, setDuracao] = useState<DuracaoArrendamento>("curto");
  const [retFStr, setRetFStr] = useState("");

  useEffect(() => {
    if (carregado && recibos.length > 0) {
      setBrutoStr(String(Math.round(resumo.bruto)));
      setRetStr(String(Math.round(resumo.retencao)));
    }
  }, [carregado, recibos.length, resumo.bruto, resumo.retencao]);

  const ef = efeitoFiscal(atividade);

  const sim = useMemo(
    () =>
      simularIRSAnual({
        brutoAnual: num(brutoStr),
        tipo: atividade.tipo,
        coefOverride: ef.coef,
        aplicaRegra15Override: ef.regra15,
        anoAtividade,
        irsJovemAno,
        despesasJustificadas: num(despesasStr),
        retencoesPagas: num(retStr),
        regimeContabilidade: regimeC,
        conjunta: famOn ? conjunta : false,
        dependentes: famOn ? Math.floor(num(dependentesStr)) : 0,
        outrosRendimentos: outrosOn ? num(outrosStr) : 0,
        deducoes: deducoesOn ? { saude: num(saudeStr), educacao: num(educacaoStr), gerais: num(geraisStr) } : undefined,
      }),
    [atividade, ef.coef, ef.regra15, brutoStr, retStr, despesasStr, regimeC, anoAtividade, irsJovemAno, famOn, conjunta, dependentesStr, outrosOn, outrosStr, deducoesOn, saudeStr, educacaoStr, geraisStr]
  );

  const reembolso = sim.saldo >= 0;

  const simF = useMemo(
    () =>
      calcularCategoriaF({
        rendaAnual: num(rendaStr),
        despesas: num(despesasFStr),
        habitacao,
        duracao: habitacao ? duracao : undefined,
        retencoesPagas: num(retFStr),
      }),
    [rendaStr, despesasFStr, habitacao, duracao, retFStr]
  );
  const reembolsoF = simF.saldo >= 0;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-stone-800">Simulador de IRS anual</h1>
        <p className="mt-1 text-sm text-stone-500">Ajusta ao detalhe da tua situação. Ativa só os módulos que te dizem respeito.</p>
      </header>

      {/* Seletor de categoria de rendimento */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className={rotulo}>Categoria de rendimento</span>
          <InfoTip>A categoria B abrange os recibos verdes (trabalho independente). A categoria F são as rendas de imóveis (arrendamento puro, sem alojamento local), tributadas a uma taxa autónoma, sem Segurança Social nem IVA.</InfoTip>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "B", label: "Categoria B", sub: "Recibos verdes" },
            { id: "F", label: "Categoria F", sub: "Rendas de imóveis" },
          ] as const).map((c) => {
            const active = categoria === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategoria(c.id)}
                className={`rounded-xl border p-3 text-center transition-all ${active ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300"}`}
              >
                <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700"}`}>{c.label}</div>
                <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{c.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {categoria === "F" ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Entradas — categoria F */}
          <div className="space-y-4 rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
            <div>
              <label htmlFor="renda" className={`mb-1.5 block ${rotulo}`}>Rendas brutas anuais (€)</label>
              <input id="renda" type="number" inputMode="decimal" min={0} step={500} value={rendaStr} onChange={(e) => setRendaStr(e.target.value)} className={campo} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label htmlFor="despesasF" className={rotulo}>Despesas dedutíveis (€)</label>
                <InfoTip>Gastos suportados e pagos com o imóvel (Art. 41.º): conservação e manutenção, IMI, imposto do selo, condomínio e seguros. Não incluem mobiliário, eletrodomésticos nem juros de financiamento.</InfoTip>
              </div>
              <input id="despesasF" type="number" inputMode="decimal" min={0} step={100} value={despesasFStr} onChange={(e) => setDespesasFStr(e.target.value)} placeholder="0" className={campo} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className={rotulo}>Tipo de arrendamento</span>
                <InfoTip>O arrendamento para habitação é tributado a {pct(CATEGORIA_F.taxaHabitacao.value)}; o não habitacional (comércio, escritórios) a {pct(CATEGORIA_F.taxaNaoHabitacao.value)}.</InfoTip>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { hab: true, label: "Habitação", sub: pct(CATEGORIA_F.taxaHabitacao.value) },
                  { hab: false, label: "Não habitacional", sub: pct(CATEGORIA_F.taxaNaoHabitacao.value) },
                ] as const).map((t) => {
                  const active = habitacao === t.hab;
                  return (
                    <button
                      key={t.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setHabitacao(t.hab)}
                      className={`rounded-xl border p-3 text-center transition-all ${active ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300"}`}
                    >
                      <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700"}`}>{t.label}</div>
                      <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{t.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {habitacao && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <label htmlFor="duracao" className={rotulo}>Duração do contrato</label>
                  <InfoTip>Contratos de arrendamento habitacional mais longos, comunicados à AT, reduzem a taxa: 5–10 anos −10 p.p., 10–20 anos −15 p.p., 20+ anos −20 p.p. (Art. 72.º CIRS).</InfoTip>
                </div>
                <select id="duracao" value={duracao} onChange={(e) => setDuracao(e.target.value as DuracaoArrendamento)} className={campo}>
                  {(Object.keys(META_DURACAO) as DuracaoArrendamento[]).map((d) => (
                    <option key={d} value={d}>{`${META_DURACAO[d].label} — ${META_DURACAO[d].sub}`}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="retF" className={`mb-1.5 block ${rotulo}`}>Retenções já pagas (€)</label>
              <input id="retF" type="number" inputMode="decimal" min={0} step={100} value={retFStr} onChange={(e) => setRetFStr(e.target.value)} placeholder="0" className={campo} />
            </div>
          </div>

          {/* Resultado — categoria F */}
          <div className="rounded-4xl border border-stone-200 bg-cream p-6 shadow-card lg:sticky lg:top-6">
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
              {reembolsoF ? "Reembolso estimado" : "Imposto a pagar estimado"}
            </div>
            <div className={`mb-4 font-display text-4xl font-semibold ${reembolsoF ? "text-brand" : "text-alert-text"}`}>
              <AnimatedNumber value={Math.abs(simF.saldo)} />
            </div>

            <div className="space-y-1">
              <Row label="Rendas brutas" value={simF.rendaAnual} />
              {simF.despesas > 0 && <Row label="Despesas dedutíveis" value={simF.despesas} sinal="−" />}
              <Row label="Rendimento tributável" value={simF.rendimentoLiquido} forte />
              <Row
                label={`Taxa autónoma (${pct(simF.taxa)})`}
                value={simF.imposto}
                note={simF.reducao > 0 ? `Taxa base ${pct(simF.taxaBase)}, reduzida ${pct(simF.reducao)} pela duração` : `Taxa base ${pct(simF.taxaBase)}`}
                forte
              />
              <Row label="Retenções já pagas" value={simF.retencoesPagas} sinal="−" />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-brand bg-white p-3">
              <span className="text-sm font-semibold text-stone-700">{reembolsoF ? "A receber" : "A pagar"}</span>
              <span className={`font-display text-xl font-semibold ${reembolsoF ? "text-brand" : "text-alert-text"}`}>
                <AnimatedNumber value={Math.abs(simF.saldo)} />
              </span>
            </div>

            {simF.avisos.map((aviso) => (
              <div key={aviso} className="mt-3 flex items-start gap-2 rounded-xl bg-brand-light p-3">
                <span className="mt-0.5 flex-shrink-0 text-brand"><Check size={14} /></span>
                <span className="text-xs leading-relaxed text-brand-dark">{aviso}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Entradas */}
        <div className="space-y-4">
          <div className="space-y-4 rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
            <div>
              <label htmlFor="bruto" className={`mb-1.5 block ${rotulo}`}>Faturação anual bruta (€)</label>
              <input id="bruto" type="number" inputMode="decimal" min={0} step={500} value={brutoStr} onChange={(e) => setBrutoStr(e.target.value)} className={campo} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className={rotulo}>Regime de contabilidade</span>
                <InfoTip>No simplificado, o imposto incide sobre uma percentagem (coeficiente) do rendimento. Na contabilidade organizada, incide sobre o lucro real (receita − despesas), por isso as despesas reduzem diretamente o imposto.</InfoTip>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "simplificado", label: "Simplificado", sub: "Coeficiente" },
                  { id: "organizada", label: "Contab. organizada", sub: "Receita − despesas" },
                ] as const).map((r) => {
                  const active = regimeC === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRegimeC(r.id)}
                      className={`rounded-xl border p-3 text-center transition-all ${active ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300"}`}
                    >
                      <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700"}`}>{r.label}</div>
                      <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{r.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className={rotulo}>Tipo de atividade</span>
                <InfoTip>Procura a tua profissão na tabela oficial do Art. 151.º. Determina o coeficiente e a retenção.</InfoTip>
              </div>
              <ActivityCombobox value={atividade} onChange={setAtividade} />
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-brand-light px-2.5 py-1 font-semibold text-brand-dark">Retenção {pct(ef.retencao)}</span>
                <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-medium text-stone-500">Coeficiente {pct(ef.coef)}</span>
              </div>
              {ef.nota && <p className="mt-2 text-xs leading-relaxed text-stone-400">{ef.nota}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <label htmlFor="ano" className={rotulo}>Ano de atividade</label>
                  <InfoTip>No 1.º ano o coeficiente reduz 50% e no 2.º ano 25% (Art. 31.º, n.º 10).</InfoTip>
                </div>
                <select id="ano" value={anoAtividade} onChange={(e) => setAnoAtividade(Number(e.target.value))} className={campo}>
                  <option value={1}>1.º ano (−50%)</option>
                  <option value={2}>2.º ano (−25%)</option>
                  <option value={3}>3.º ano ou seguinte</option>
                </select>
              </div>
              <div>
                <label htmlFor="ret" className={`mb-1.5 block ${rotulo}`}>Retenções já pagas (€)</label>
                <input id="ret" type="number" inputMode="decimal" min={0} step={100} value={retStr} onChange={(e) => setRetStr(e.target.value)} placeholder="0" className={campo} />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label htmlFor="despesas" className={rotulo}>
                  {regimeC === "organizada" ? "Despesas reais da atividade (€)" : "Despesas de atividade (€)"}
                </label>
                <InfoTip>
                  {regimeC === "organizada"
                    ? "Na contabilidade organizada, as despesas dedutíveis reduzem diretamente o lucro tributável."
                    : `Faturas com NIF da atividade (e-fatura, rendas, pessoal). Reduzem a majoração da regra dos 15%. A dedução específica de ${fmt(DEDUCAO_ESPECIFICA_CATB.value)} já é considerada — por isso pode não ter efeito em faturações mais baixas.`}
                </InfoTip>
              </div>
              <input id="despesas" type="number" inputMode="decimal" min={0} step={100} value={despesasStr} onChange={(e) => setDespesasStr(e.target.value)} placeholder="0" className={campo} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label htmlFor="jovem" className={rotulo}>IRS Jovem</label>
                <InfoTip>Até aos {IRS_JOVEM.idadeMax.value} anos. Isenta parte do rendimento: 100% no 1.º ano, depois 75%/50%/25%, até 55 × IAS.</InfoTip>
              </div>
              <select id="jovem" value={irsJovemAno} onChange={(e) => setIrsJovemAno(Number(e.target.value))} className={campo}>
                <option value={0}>Não aplicável</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((ano) => (
                  <option key={ano} value={ano}>{`${ano}.º ano — isenção ${pct(IRS_JOVEM.isencaoPorAno.value[ano])}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Módulos opcionais */}
          <Modulo
            titulo="Família (estado civil e dependentes)"
            info="A tributação conjunta divide o rendimento por 2. Cada dependente vale 600 € de dedução à coleta."
            on={famOn}
            setOn={setFamOn}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={conjunta}
              onClick={() => setConjunta((v) => !v)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${conjunta ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50"}`}
            >
              <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${conjunta ? "border-brand bg-brand text-white" : "border-stone-300 text-transparent"}`}>
                <Check size={12} />
              </span>
              <span className={`text-sm font-medium ${conjunta ? "text-brand-dark" : "text-stone-600"}`}>Tributação conjunta (casado / unido de facto)</span>
            </button>
            <div className="mt-3">
              <label htmlFor="dep" className={`mb-1.5 block ${rotulo}`}>Número de dependentes</label>
              <input id="dep" type="number" inputMode="numeric" min={0} step={1} value={dependentesStr} onChange={(e) => setDependentesStr(e.target.value)} className={campo} />
            </div>
          </Modulo>

          <Modulo
            titulo="Outros rendimentos (englobamento)"
            info="Rendimentos de trabalho dependente (cat. A) ou outros, somados ao rendimento da atividade para o IRS anual."
            on={outrosOn}
            setOn={setOutrosOn}
          >
            <label htmlFor="outros" className={`mb-1.5 block ${rotulo}`}>Outros rendimentos líquidos anuais (€)</label>
            <input id="outros" type="number" inputMode="decimal" min={0} step={500} value={outrosStr} onChange={(e) => setOutrosStr(e.target.value)} placeholder="0" className={campo} />
          </Modulo>

          <Modulo
            titulo="Deduções à coleta"
            info="Despesas que reduzem o imposto: saúde (15%, máx 1.000 €), educação (30%, máx 800 €) e despesas gerais (35%, máx 250 €). Sujeitas a um limite global."
            on={deducoesOn}
            setOn={setDeducoesOn}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { id: "saude", label: "Saúde", v: saudeStr, set: setSaudeStr },
                { id: "educacao", label: "Educação", v: educacaoStr, set: setEducacaoStr },
                { id: "gerais", label: "Desp. gerais", v: geraisStr, set: setGeraisStr },
              ].map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className={`mb-1.5 block ${rotulo}`}>{f.label} (€)</label>
                  <input id={f.id} type="number" inputMode="decimal" min={0} step={50} value={f.v} onChange={(e) => f.set(e.target.value)} placeholder="0" className={campo} />
                </div>
              ))}
            </div>
          </Modulo>

          {carregado && recibos.length > 0 && (
            <p className="rounded-xl bg-brand-light p-3 text-xs text-brand-dark">
              Faturação e retenções preenchidas com os teus {recibos.length} recibos registados.
            </p>
          )}
        </div>

        {/* Resultado */}
        <div className="rounded-4xl border border-stone-200 bg-cream p-6 shadow-card lg:sticky lg:top-6">
          <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
            {reembolso ? "Reembolso estimado" : "Imposto a pagar estimado"}
          </div>
          <div className={`mb-4 font-display text-4xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}>
            <AnimatedNumber value={Math.abs(sim.saldo)} />
          </div>

          <div className="space-y-1">
            <Row label="Faturação bruta" value={sim.brutoAnual} />
            {sim.regimeContabilidade === "organizada" ? (
              <>
                {sim.despesasJustificadas > 0 && <Row label="Despesas reais" value={sim.despesasJustificadas} sinal="−" />}
                <Row label="Rendimento tributável" value={sim.rendimentoTributavel} note="Lucro real (contab. organizada)" />
              </>
            ) : (
              <>
                <Row
                  label={`Coeficiente (${pct(sim.coeficiente)})`}
                  value={sim.rendimentoCoeficiente}
                  note={sim.reducaoAno > 0 ? `Reduzido ${pct(sim.reducaoAno)} (início de atividade)` : "Regime simplificado"}
                />
                {sim.acrescimo15 > 0 && <Row label="Acréscimo (regra dos 15%)" value={sim.acrescimo15} sinal="+" />}
              </>
            )}
            {sim.rendimentoIsentoJovem > 0 && <Row label={`Isenção IRS Jovem (${pct(sim.isencaoJovem)})`} value={sim.rendimentoIsentoJovem} sinal="−" />}
            {sim.outrosRendimentos > 0 && <Row label="Outros rendimentos" value={sim.outrosRendimentos} sinal="+" />}
            <Row label="Rendimento coletável" value={sim.rendimentoColetavel} forte />
            <Row label={sim.conjunta ? "Coleta (tributação conjunta)" : "Coleta"} value={sim.coletaBruta} />
            {sim.deducaoDependentes > 0 && <Row label="Dedução por dependentes" value={sim.deducaoDependentes} sinal="−" />}
            {sim.deducaoDespesas > 0 && <Row label="Deduções de despesas" value={sim.deducaoDespesas} sinal="−" />}
            <Row label="IRS estimado" value={sim.irsEstimado} note={`Taxa média ${pct(sim.taxaMediaEfetiva)}`} forte />
            <Row label="Retenções já pagas" value={sim.retencoesPagas} sinal="−" />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-brand bg-white p-3">
            <span className="text-sm font-semibold text-stone-700">{reembolso ? "A receber" : "A pagar"}</span>
            <span className={`font-display text-xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}>
              <AnimatedNumber value={Math.abs(sim.saldo)} />
            </span>
          </div>

          {sim.minimoExistenciaAplicado && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-brand-light p-3">
              <span className="mt-0.5 flex-shrink-0 text-brand"><Check size={14} /></span>
              <span className="text-xs leading-relaxed text-brand-dark">
                Protegido pelo mínimo de existência ({fmt(MINIMO_EXISTENCIA.value)}).
              </span>
            </div>
          )}
        </div>
      </div>
      )}

      <ProHint id="guardar-cenario" icon={<ChartProjection size={18} />} cta="Conhecer o Pro" className="mt-6">
        Gostavas de guardar esta simulação e compará-la com outros cenários ao longo do ano? Isso faz parte do Pro.
      </ProHint>

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-4">
        <span className="mt-0.5 flex-shrink-0 text-alert-text"><Warning size={14} /></span>
        <p className="text-xs leading-relaxed text-alert-text">
          {categoria === "F"
            ? "Estimativa da tributação autónoma dos rendimentos prediais (categoria F). Não modela a opção pelo englobamento (taxas progressivas) nem o regime de renda moderada (10%) do OE2026, pendente de regulamentação. Não substitui o apuramento oficial nem o aconselhamento de um contabilista certificado."
            : `Estimativa para o regime simplificado (limite ${fmt(REGIME_SIMPLIFICADO.limite.value)}). Mesmo com os módulos ativos, não cobre todos os benefícios fiscais nem casos especiais. Não substitui o apuramento oficial nem o aconselhamento de um contabilista certificado.`}
        </p>
      </div>
    </div>
  );
}

function Modulo({
  titulo,
  info,
  on,
  setOn,
  children,
}: {
  titulo: string;
  info: string;
  on: boolean;
  setOn: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-4xl border bg-white p-5 shadow-card transition-colors ${on ? "border-brand" : "border-stone-100"}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setOn(!on)}
          className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-stone-200"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`} />
        </button>
        <span className="text-sm font-semibold text-stone-700">{titulo}</span>
        <InfoTip>{info}</InfoTip>
      </div>
      {on && <div className="mt-4">{children}</div>}
    </div>
  );
}

function Row({ label, value, note, sinal, forte = false }: { label: string; value: number; note?: string; sinal?: "+" | "−"; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200/60 py-1.5 last:border-0">
      <div>
        <span className={`text-sm ${forte ? "font-semibold text-stone-800" : "text-stone-600"}`}>{label}</span>
        {note && <div className="text-[11px] text-stone-400">{note}</div>}
      </div>
      <span className={`text-sm font-semibold tabular-nums ${forte ? "text-brand" : "text-stone-700"}`}>
        {sinal && `${sinal} `}
        <AnimatedNumber value={value} />
      </span>
    </div>
  );
}
