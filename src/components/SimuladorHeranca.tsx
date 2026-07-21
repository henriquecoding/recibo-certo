"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { fmt, pct } from "@/lib/format";
import { haReabertura } from "@/lib/store/cenarios";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import InfoTip from "@/components/ui/InfoTip";
import {
  Scale, Heart, Home, Gift, FileSign, Coin, Sparkle, LayoutGrid, ArrowRight,
  ShieldCheck, Warning, Info, Building, Plus, Minus,
} from "@/components/ui/Icons";
import {
  simularHeranca, impostoSeloDoacao, compararHerancaVsDoacao, maisValiasImovelHerdado,
  type ConfigFamiliar, type Patrimonio, type RegimeBens, type Ascendentes, type ImovelHeranca,
  type DoacaoBem, type RelacaoSucessoria,
} from "@/lib/fiscal-heranca";
import {
  IS_TRANSMISSAO_GRATUITA, IS_DOACAO_IMOVEL, IS_DOACAO_MINIMO_ISENTO, PRAZO_MODELO1_MESES,
} from "@/lib/fiscal-data";

const ModoGuiadoHeranca = dynamic(() => import("@/components/simulador/ModoGuiadoHeranca"), {
  ssr: false,
  loading: () => <div className="h-96 w-full animate-pulse rounded-4xl bg-stone-100 dark:bg-stone-900" />,
});

const LEI = {
  tgis: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx",
  cisArt6: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/selo6.aspx",
  cc: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1966-34509075",
};

function LeiRef({ artigo, url }: { artigo: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={`Ver legislação: ${artigo}`}
      className="inline-flex items-center gap-0.5 rounded bg-stone-100 px-1 py-0.5 text-[9px] font-semibold text-stone-500 transition-colors hover:bg-brand-light hover:text-brand dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-brand/10 dark:hover:text-brand">
      {artigo}
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>
    </a>
  );
}

// ── Controlos compactos ───────────────────────────────────────────────────────

function Campo({ label, value, onChange, tooltip }: { label: string; value: number; onChange: (v: number) => void; tooltip?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-300">{label}{tooltip && <InfoTip>{tooltip}</InfoTip>}</span>
      <div className="relative">
        <input type="number" inputMode="decimal" min={0} value={value === 0 ? "" : value} placeholder="0"
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-stone-800 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
      </div>
    </label>
  );
}

function Conta({ label, value, onChange, min = 0, max = 20 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900">
      <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label={`− ${label}`} onClick={() => set(value - 1)} disabled={value <= min} className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:border-brand hover:text-brand disabled:opacity-40 dark:border-stone-700"><Minus size={12} /></button>
        <span className="w-5 text-center text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">{value}</span>
        <button type="button" aria-label={`+ ${label}`} onClick={() => set(value + 1)} disabled={value >= max} className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:border-brand hover:text-brand disabled:opacity-40 dark:border-stone-700"><Plus size={12} /></button>
      </div>
    </div>
  );
}

function Pills<T extends string>({ opcoes, valor, onChange }: { opcoes: { id: T; label: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => (
        <button key={o.id} type="button" aria-pressed={valor === o.id} onClick={() => onChange(o.id)}
          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${valor === o.id ? "border-brand bg-brand-light text-brand-dark dark:bg-brand/10 dark:text-brand" : "border-stone-200 bg-white text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Seccao({ titulo, icon, children }: { titulo: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500">{icon}{titulo}</h3>
      {children}
    </section>
  );
}

// ── Onboarding gate (herança) ─────────────────────────────────────────────────

function GateHeranca({ onSelect }: { onSelect: (m: "guiado" | "completo") => void }) {
  return (
    <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="grain bg-cream px-6 py-12 dark:bg-stone-950 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-3 text-brand">Heranças e sucessões · 2026</div>
        <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">Como queres simular?</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Descobre quem herda o quê e quanto (se algo) se paga de Imposto do Selo — com base no Código Civil e no Código do Imposto do Selo.
        </p>
      </div>
      <div className="mx-auto mt-9 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
        <button type="button" onClick={() => onSelect("guiado")} className="group relative flex flex-col rounded-4xl border-2 border-brand bg-white p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:bg-stone-900 sm:p-7">
          <span className="absolute right-4 top-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Recomendado</span>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-glow"><Sparkle size={22} /></span>
          <h3 className="mt-5 font-display text-xl font-semibold text-ink">Passo a passo</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">Respondes a algumas perguntas sobre a família e o património e vemos a partilha e o imposto, sem te perderes.</p>
          <span className="mt-6 inline-flex items-center gap-1.5 self-start rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all group-hover:bg-brand-dark">Guia-me <ArrowRight size={14} /></span>
        </button>
        <button type="button" onClick={() => onSelect("completo")} className="group flex flex-col rounded-4xl border border-stone-200/80 bg-white p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-800 dark:bg-stone-900 sm:p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800 dark:text-stone-300"><LayoutGrid size={22} /></span>
          <h3 className="mt-5 font-display text-xl font-semibold text-ink">Modo completo</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">Todos os campos numa página: família, património, testamento, doação em vida e mais-valias.</p>
          <span className="mt-6 inline-flex items-center gap-1.5 self-start rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors group-hover:border-stone-300 group-hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">Modo completo <ArrowRight size={14} /></span>
        </button>
      </div>
      <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center gap-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-400"><ShieldCheck size={13} className="text-brand" /> Código Civil + Imposto do Selo 2026 · grátis, sem registo</p>
      </div>
    </m.div>
  );
}

// ── Wrapper ───────────────────────────────────────────────────────────────────

const REGIMES = [
  { id: "comunhao_adquiridos" as RegimeBens, label: "Com. adquiridos" },
  { id: "comunhao_geral" as RegimeBens, label: "Com. geral" },
  { id: "separacao" as RegimeBens, label: "Separação" },
];
const MODO_KEY = "rc-modo-herancas";

export default function SimuladorHeranca({ vista = "ambos" }: { vista?: "ambos" | "guiado" | "completo" } = {}) {
  // Estado inicial DETERMINÍSTICO (igual no servidor e na 1.ª renderização do
  // cliente) para não haver mismatch de hidratação. A preferência guardada em
  // localStorage só é aplicada depois da montagem, no useEffect abaixo.
  const [modo, setModo] = useState<"nao_selecionado" | "guiado" | "completo">(
    vista === "completo" ? "completo" : vista === "guiado" ? "guiado" : "nao_selecionado",
  );

  useEffect(() => {
    if (vista !== "ambos") return;
    if (haReabertura("herancas")) { setModo("guiado"); return; }
    try {
      const saved = window.localStorage.getItem(MODO_KEY);
      if (saved === "guiado" || saved === "completo") setModo(saved);
    } catch { /* ignore */ }
  }, [vista]);

  const escolher = (m: "guiado" | "completo") => {
    setModo(m);
    try { window.localStorage.setItem(MODO_KEY, m); } catch { /* ignore */ }
  };

  if (modo === "nao_selecionado") return <GateHeranca onSelect={escolher} />;
  if (modo === "guiado") {
    return (
      <div>
        <ModoGuiadoHeranca />
        {vista === "ambos" && (
          <div className="border-t border-stone-100 py-4 text-center dark:border-stone-800">
            <button type="button" onClick={() => escolher("completo")} className="text-xs font-medium text-stone-400 transition-colors hover:text-brand">
              Prefiro o modo completo →
            </button>
          </div>
        )}
      </div>
    );
  }
  return <ModoCompleto onGuiado={vista === "ambos" ? () => escolher("guiado") : undefined} />;
}

// ── Modo completo ─────────────────────────────────────────────────────────────

function ModoCompleto({ onGuiado }: { onGuiado?: () => void }) {
  // Família
  const [temConjuge, setTemConjuge] = useState(true);
  const [vinculoConjuge, setVinculoConjuge] = useState<"casado" | "unido_facto">("casado");
  const [regimeBens, setRegimeBens] = useState<RegimeBens>("comunhao_adquiridos");
  const [nFilhos, setNFilhos] = useState(2);
  const [nRamosNetos, setNRamosNetos] = useState(0);
  const [ascendentes, setAscendentes] = useState<Ascendentes>("nenhum");
  // Testamento
  const [temTestamento, setTemTestamento] = useState(false);
  const [beneficiario, setBeneficiario] = useState<RelacaoSucessoria>("filho");
  // Património
  const [imovelPrincipal, setImovelPrincipal] = useState(200_000);
  const [imovelComum, setImovelComum] = useState(true);
  const [outrosImoveis, setOutrosImoveis] = useState(0);
  const [depositos, setDepositos] = useState(30_000);
  const [depositosComuns, setDepositosComuns] = useState(true);
  const [outros, setOutros] = useState(0);
  const [dividas, setDividas] = useState(0);
  // Doação
  const [doacaoRelacao, setDoacaoRelacao] = useState<RelacaoSucessoria>("filho");
  // Mais-valias
  const [valorVenda, setValorVenda] = useState(0);
  const [rendimentoAnual, setRendimentoAnual] = useState(0);

  const regimeEfetivo: RegimeBens = temConjuge ? regimeBens : "sem_conjuge";
  const semComum = !temConjuge || vinculoConjuge !== "casado" || regimeBens === "separacao";

  const config: ConfigFamiliar = useMemo(() => ({
    temConjuge, vinculoConjuge, regimeBens: regimeEfetivo, nFilhos, nRamosNetos,
    ascendentes: nFilhos + nRamosNetos > 0 ? "nenhum" : ascendentes,
    testamento: temTestamento ? { usaQuotaDisponivel: true, beneficiario } : undefined,
  }), [temConjuge, vinculoConjuge, regimeEfetivo, nFilhos, nRamosNetos, ascendentes, temTestamento, beneficiario]);

  const patrimonio: Patrimonio = useMemo(() => {
    const imoveis: ImovelHeranca[] = [];
    if (imovelPrincipal > 0) imoveis.push({ rotulo: "Habitação", vpt: imovelPrincipal, comum: !semComum && imovelComum });
    if (outrosImoveis > 0) imoveis.push({ rotulo: "Outros imóveis", vpt: outrosImoveis, comum: false });
    return {
      imoveis,
      outrosBensComuns: !semComum && depositosComuns ? depositos : 0,
      outrosBensProprios: (!semComum && depositosComuns ? 0 : depositos) + outros,
      dividas,
    };
  }, [imovelPrincipal, imovelComum, outrosImoveis, depositos, depositosComuns, outros, dividas, semComum]);

  const r = useMemo(() => simularHeranca(config, patrimonio), [config, patrimonio]);

  const bensDoacao: DoacaoBem[] = useMemo(() => {
    const bens: DoacaoBem[] = [];
    const imv = imovelPrincipal + outrosImoveis;
    if (imv > 0) bens.push({ tipo: "imovel", valor: imv });
    if (depositos + outros > 0) bens.push({ tipo: "outro", valor: depositos + outros });
    return bens;
  }, [imovelPrincipal, outrosImoveis, depositos, outros]);

  const doacao = useMemo(() => impostoSeloDoacao(bensDoacao, doacaoRelacao), [bensDoacao, doacaoRelacao]);
  const comparacao = useMemo(() => compararHerancaVsDoacao(bensDoacao, doacaoRelacao), [bensDoacao, doacaoRelacao]);
  const maisValias = useMemo(() => maisValiasImovelHerdado({ vptHeranca: imovelPrincipal, valorVenda, rendimentoBase: rendimentoAnual }), [imovelPrincipal, valorVenda, rendimentoAnual]);

  return (
    <div className="mx-auto max-w-6xl overflow-x-hidden px-5 py-8 sm:px-8 lg:overflow-x-visible">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow text-brand">Modo completo</div>
          <h2 className="font-display text-2xl font-semibold text-ink">Heranças e sucessões</h2>
        </div>
        {onGuiado && (
          <button type="button" onClick={onGuiado} className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-brand hover:text-brand dark:border-stone-700">
            <Sparkle size={13} className="mr-1 inline" /> Modo guiado
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Inputs */}
        <div className="space-y-4">
          <Seccao titulo="Família" icon={<Heart size={14} className="text-brand" />}>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-2 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                Existe cônjuge/companheiro?
                <input type="checkbox" checked={temConjuge} onChange={(e) => setTemConjuge(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand" />
              </label>
              {temConjuge && (
                <div className="space-y-2">
                  <Pills opcoes={[{ id: "casado" as const, label: "Casado(a)" }, { id: "unido_facto" as const, label: "União de facto" }]} valor={vinculoConjuge} onChange={setVinculoConjuge} />
                  {vinculoConjuge === "casado" && <Pills opcoes={REGIMES} valor={regimeBens} onChange={setRegimeBens} />}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Conta label="Filhos vivos" value={nFilhos} onChange={setNFilhos} />
                <Conta label="Ramos de netos" value={nRamosNetos} onChange={setNRamosNetos} />
              </div>
              {nFilhos + nRamosNetos === 0 && (
                <Pills opcoes={[{ id: "nenhum" as Ascendentes, label: "Sem ascendentes" }, { id: "pais" as Ascendentes, label: "Pais" }, { id: "avos" as Ascendentes, label: "Avós" }]} valor={ascendentes} onChange={setAscendentes} />
              )}
            </div>
          </Seccao>

          <Seccao titulo="Testamento" icon={<FileSign size={14} className="text-brand" />}>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                Há testamento (usa a quota disponível de {r.partilha.configLegitima ? pct(r.partilha.disponivelFracao) : "toda a herança"})?
                <input type="checkbox" checked={temTestamento} onChange={(e) => setTemTestamento(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand" />
              </label>
              {temTestamento && (
                <Pills opcoes={[{ id: "filho" as RelacaoSucessoria, label: "A um filho" }, { id: "conjuge" as RelacaoSucessoria, label: "Ao cônjuge" }, { id: "irmao" as RelacaoSucessoria, label: "A um irmão" }, { id: "outro" as RelacaoSucessoria, label: "A um terceiro" }]} valor={beneficiario} onChange={setBeneficiario} />
              )}
            </div>
          </Seccao>

          <Seccao titulo="Património (VPT dos imóveis)" icon={<Home size={14} className="text-brand" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Habitação (VPT)" value={imovelPrincipal} onChange={setImovelPrincipal} tooltip="Valor Patrimonial Tributário da caderneta predial." />
              <Campo label="Outros imóveis (VPT)" value={outrosImoveis} onChange={setOutrosImoveis} />
              <Campo label="Depósitos / poupanças / veículos" value={depositos} onChange={setDepositos} />
              <Campo label="Outros bens próprios" value={outros} onChange={setOutros} />
              <Campo label="Dívidas e encargos" value={dividas} onChange={setDividas} />
            </div>
            {!semComum && (
              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-[11px] text-stone-600 dark:text-stone-300"><input type="checkbox" checked={imovelComum} onChange={(e) => setImovelComum(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand" /> Habitação é bem comum</label>
                <label className="flex items-center gap-2 text-[11px] text-stone-600 dark:text-stone-300"><input type="checkbox" checked={depositosComuns} onChange={(e) => setDepositosComuns(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand" /> Depósitos são comuns</label>
              </div>
            )}
          </Seccao>

          <Seccao titulo="Doação em vida (comparação)" icon={<Gift size={14} className="text-brand" />}>
            <p className="mb-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              Doar os mesmos bens em vida em vez de os deixar por herança. A doação de imóveis paga {pct(IS_DOACAO_IMOVEL.value)} (Verba 1.1) mesmo entre família; a herança é isenta. Doações até {fmt(IS_DOACAO_MINIMO_ISENTO.value)} não são tributadas.
            </p>
            <span className="mb-1.5 block text-[11px] font-semibold text-stone-600 dark:text-stone-300">Relação do beneficiário</span>
            <Pills opcoes={[{ id: "filho" as RelacaoSucessoria, label: "Filho/neto" }, { id: "conjuge" as RelacaoSucessoria, label: "Cônjuge" }, { id: "pai" as RelacaoSucessoria, label: "Pai/avô" }, { id: "irmao" as RelacaoSucessoria, label: "Irmão" }, { id: "sobrinho" as RelacaoSucessoria, label: "Sobrinho" }, { id: "outro" as RelacaoSucessoria, label: "Sem parentesco" }]} valor={doacaoRelacao} onChange={setDoacaoRelacao} />
          </Seccao>

          <Seccao titulo="Vender um imóvel herdado (mais-valias IRS)" icon={<Building size={14} className="text-brand" />}>
            <p className="mb-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              Valor de aquisição = VPT à data do óbito ({fmt(imovelPrincipal)}) — Art. 45.º CIRS. Só 50% do ganho entra no IRS, à tua taxa marginal.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Valor de venda estimado" value={valorVenda} onChange={setValorVenda} />
              <Campo label="O teu rendimento coletável anual" value={rendimentoAnual} onChange={setRendimentoAnual} tooltip="Para estimar a taxa marginal do IRS sobre a mais-valia." />
            </div>
          </Seccao>
        </div>

        {/* Painel de resultados */}
        <aside>
          <div className="sticky top-24 space-y-4">
            <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <div className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Partilha</div>
              {r.meacao.meacaoConjuge > 0 && <Linha label="Meação do cônjuge" valor={r.meacao.meacaoConjuge} />}
              <Linha label="Herança líquida" valor={r.meacao.herancaLiquida} forte />
              <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3 dark:border-stone-800">
                {r.partilha.quinhoes.map((q) => {
                  const s = r.selo.linhas.find((l) => l.id === q.id);
                  return (
                    <div key={q.id} className="flex items-start justify-between gap-2 text-[11px]">
                      <span className="min-w-0 flex-1 break-words text-stone-500 dark:text-stone-400">{q.rotulo} <span className="text-stone-400">· {pct(q.fracao)}</span></span>
                      <span className="flex-shrink-0 text-right tabular-nums font-semibold text-stone-700 dark:text-stone-200">
                        {fmt(q.valor)}
                        {s && !s.isento && <span className="block text-amber-600 dark:text-amber-400">Selo {fmt(s.imposto)}</span>}
                      </span>
                    </div>
                  );
                })}
                {r.partilha.quinhoes.length === 0 && <div className="text-[11px] text-stone-400">Sem herdeiros diretos — ver avisos.</div>}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Imposto do Selo <LeiRef artigo="Art. 6.º CIS" url={LEI.cisArt6} /></span>
                <span className={`font-display text-xl font-semibold tabular-nums ${r.selo.todosIsentos ? "text-brand" : "text-amber-600 dark:text-amber-400"}`}><AnimatedNumber value={r.selo.total} /></span>
              </div>
              {r.selo.todosIsentos && <p className="mt-1 text-[10px] font-medium text-brand">Família direta — nada a pagar.</p>}
            </div>

            {/* Comparação */}
            <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-stone-400">Herança vs doação em vida</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-brand/30 bg-brand-light/30 p-2.5 text-center dark:bg-brand/10">
                  <div className="text-[9px] font-semibold uppercase text-stone-500">Herdar</div>
                  <div className="font-display text-lg font-bold text-brand tabular-nums">{fmt(comparacao.impostoHeranca)}</div>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-2.5 text-center dark:border-stone-700 dark:bg-stone-950">
                  <div className="text-[9px] font-semibold uppercase text-stone-500">Doar</div>
                  <div className="font-display text-lg font-bold text-stone-700 dark:text-stone-200 tabular-nums">{fmt(doacao.total)}</div>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">{comparacao.nota}</p>
            </div>

            {/* Mais-valias */}
            {valorVenda > 0 && (
              <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-stone-400">Mais-valias na venda</div>
                <Linha label="Ganho (venda − VPT)" valor={maisValias.ganho} />
                <Linha label="Base tributável (50%)" valor={maisValias.incluido} />
                {rendimentoAnual > 0 ? <Linha label="IRS estimado" valor={maisValias.impostoEstimado} forte /> : <p className="pt-1 text-[10px] text-stone-400">Indica o teu rendimento anual para estimar o IRS.</p>}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Avisos + notas legais */}
      {r.avisos.length > 0 && (
        <div className="mt-6 space-y-2">
          {r.avisos.map((a, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800/30 dark:bg-amber-900/10">
              <Warning size={13} className="mt-0.5 flex-shrink-0 text-amber-500" />
              <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">{a}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-stone-400">
        <Info size={12} className="mt-0.5 flex-shrink-0 text-brand" />
        Herança: família direta isenta (Verba 1.2 · <LeiRef artigo="Art. 6.º CIS" url={LEI.cisArt6} />); não-família {pct(IS_TRANSMISSAO_GRATUITA.value)}. Participar ao Fisco (Modelo 1) até ao fim do {PRAZO_MODELO1_MESES.value}.º mês após o óbito. Partilha conforme o <LeiRef artigo="Código Civil" url={LEI.cc} /> e as taxas da <LeiRef artigo="Tabela do Selo" url={LEI.tgis} />. Estimativa — não substitui um notário/advogado.
      </p>
      <div className="mt-4">
        <Link href="/dashboard/herancas" className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-brand hover:text-brand dark:border-stone-700">
          <Scale size={13} /> Guardar cenários (área pessoal) <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function Linha({ label, valor, forte }: { label: string; valor: number; forte?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${forte ? "mt-1" : ""}`}>
      <span className={`text-[11px] ${forte ? "font-semibold text-stone-700 dark:text-stone-200" : "text-stone-500 dark:text-stone-400"}`}>{label}</span>
      <span className={`tabular-nums ${forte ? "font-display text-base font-bold text-stone-800 dark:text-stone-100" : "text-[11px] font-semibold text-stone-600 dark:text-stone-300"}`}>{fmt(valor)}</span>
    </div>
  );
}
