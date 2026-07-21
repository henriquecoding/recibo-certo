"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { EASE } from "@/lib/motion";
import { fmt, pct } from "@/lib/format";
import { useScrollTopOnStep } from "@/lib/scroll";
import { useCenarios, consumirReabertura, type ResumoCenario } from "@/lib/store/cenarios";
import GuardarCenarioDialog from "@/components/ui/GuardarCenarioDialog";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import InfoTip from "@/components/ui/InfoTip";
import {
  GuiadoStepper,
  GuiadoCabecalho,
  GuiadoOpcao,
  GuiadoNav,
} from "@/components/simulador/guiado-ui";
import {
  Scale,
  Heart,
  Home,
  Gift,
  FileSign,
  Coin,
  Calendar,
  Check,
  Warning,
  Plus,
  Minus,
  ArrowRight,
  Sparkle,
  Info,
  Building,
  ChevronDown,
} from "@/components/ui/Icons";
import {
  simularHeranca,
  compararHerancaVsDoacao,
  maisValiasImovelHerdado,
  type ConfigFamiliar,
  type Patrimonio,
  type RegimeBens,
  type Ascendentes,
  type ImovelHeranca,
  type DoacaoBem,
  type RelacaoSucessoria,
} from "@/lib/fiscal-heranca";
import { IS_TRANSMISSAO_GRATUITA, IS_DOACAO_IMOVEL, PRAZO_MODELO1_MESES } from "@/lib/fiscal-data";

// ── URLs legais (todas verificadas 200) ──────────────────────────────────────
const LEI = {
  tgis: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx",
  cisArt6: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/selo6.aspx",
  cisArt26: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/selo26.aspx",
  cc: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1966-34509075",
  modelo1: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/Folheto_Participacao_Imposto_Selo_Obito.pdf",
  art45cirs: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs45.aspx",
};

function LeiRef({ artigo, url }: { artigo: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 rounded bg-stone-100 px-1 py-0.5 text-[9px] font-semibold text-stone-500 transition-colors hover:bg-brand-light hover:text-brand dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-brand/10 dark:hover:text-brand"
      title={`Ver legislação: ${artigo}`}
    >
      {artigo}
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
      </svg>
    </a>
  );
}

// ── Controlos locais ─────────────────────────────────────────────────────────

function CampoEuro({
  label,
  value,
  onChange,
  tooltip,
  placeholder = "0",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tooltip?: ReactNode;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
        {label}
        {tooltip && <InfoTip>{tooltip}</InfoTip>}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value === 0 ? "" : value}
          placeholder={placeholder}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-stone-800 shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">
          €
        </span>
      </div>
    </label>
  );
}

function ContaStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
  tooltip,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  tooltip?: ReactNode;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 dark:border-stone-700 dark:bg-stone-900">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
        {label}
        {tooltip && <InfoTip>{tooltip}</InfoTip>}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          onClick={() => set(value - 1)}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-brand hover:text-brand disabled:opacity-40 dark:border-stone-700"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">{value}</span>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => set(value + 1)}
          disabled={value >= max}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-brand hover:text-brand disabled:opacity-40 dark:border-stone-700"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function OpcaoPill<T extends string>({
  opcoes,
  valor,
  onChange,
  label,
  tooltip,
}: {
  opcoes: { id: T; label: string; sub?: string }[];
  valor: T;
  onChange: (v: T) => void;
  label?: string;
  tooltip?: ReactNode;
}) {
  return (
    <div>
      {label && (
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
          {label}
          {tooltip && <InfoTip>{tooltip}</InfoTip>}
        </span>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {opcoes.map((o) => {
          const ativo = valor === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => onChange(o.id)}
              className={`rounded-2xl border-2 p-3 text-left transition-all ${
                ativo
                  ? "border-brand bg-brand-light/40 dark:bg-brand/10"
                  : "border-stone-100 bg-white hover:border-brand/30 dark:border-stone-800 dark:bg-stone-900"
              }`}
            >
              <div className={`text-xs font-bold ${ativo ? "text-brand-dark dark:text-brand" : "text-stone-700 dark:text-stone-200"}`}>
                {o.label}
              </div>
              {o.sub && <div className="mt-0.5 text-[10px] text-stone-400">{o.sub}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [aberto, setAberto] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{title}</span>
        <ChevronDown size={16} className={`flex-shrink-0 text-stone-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-0">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tipos de passo ────────────────────────────────────────────────────────────

type Passo = 0 | "familia" | "patrimonio" | "testamento" | "resultado" | "aseguir";
type Perspetiva = "receber" | "planear";

const REGIMES: { id: RegimeBens; label: string; sub: string }[] = [
  { id: "comunhao_adquiridos", label: "Comunhão de adquiridos", sub: "O mais comum (por defeito)" },
  { id: "comunhao_geral", label: "Comunhão geral", sub: "Todos os bens são comuns" },
  { id: "separacao", label: "Separação de bens", sub: "Sem meação" },
];

const RELACOES_BENEFICIARIO: { id: RelacaoSucessoria; label: string }[] = [
  { id: "filho", label: "Um dos filhos" },
  { id: "conjuge", label: "O cônjuge" },
  { id: "irmao", label: "Um irmão" },
  { id: "sobrinho", label: "Um sobrinho" },
  { id: "outro", label: "Alguém sem parentesco" },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function ModoGuiadoHeranca() {
  const [passo, setPasso] = useState<Passo>(0);
  const [perspetiva, setPerspetiva] = useState<Perspetiva>("receber");
  useScrollTopOnStep(passo);

  // Família
  const [temConjuge, setTemConjuge] = useState(true);
  const [vinculoConjuge, setVinculoConjuge] = useState<"casado" | "unido_facto">("casado");
  const [regimeBens, setRegimeBens] = useState<RegimeBens>("comunhao_adquiridos");
  const [nFilhos, setNFilhos] = useState(2);
  const [nRamosNetos, setNRamosNetos] = useState(0);
  const [ascendentes, setAscendentes] = useState<Ascendentes>("nenhum");

  // Património
  const [imovelPrincipal, setImovelPrincipal] = useState(200_000);
  const [imovelComum, setImovelComum] = useState(true);
  const [outrosImoveis, setOutrosImoveis] = useState(0);
  const [depositos, setDepositos] = useState(30_000);
  const [depositosComuns, setDepositosComuns] = useState(true);
  const [outros, setOutros] = useState(0);
  const [dividas, setDividas] = useState(0);

  // Testamento
  const [temTestamento, setTemTestamento] = useState(false);
  const [beneficiario, setBeneficiario] = useState<RelacaoSucessoria>("filho");

  // Mais-valias (passo a seguir)
  const [valorVenda, setValorVenda] = useState(0);

  // Guardar cenário
  const cenariosStore = useCenarios();
  const [dialogGuardar, setDialogGuardar] = useState(false);
  const [cenarioFeedback, setCenarioFeedback] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const regimeEfetivo: RegimeBens = temConjuge ? regimeBens : "sem_conjuge";

  const config: ConfigFamiliar = useMemo(
    () => ({
      temConjuge,
      vinculoConjuge,
      regimeBens: regimeEfetivo,
      nFilhos,
      nRamosNetos,
      ascendentes: nFilhos + nRamosNetos > 0 ? "nenhum" : ascendentes,
      testamento: temTestamento ? { usaQuotaDisponivel: true, beneficiario } : undefined,
    }),
    [temConjuge, vinculoConjuge, regimeEfetivo, nFilhos, nRamosNetos, ascendentes, temTestamento, beneficiario],
  );

  const patrimonio: Patrimonio = useMemo(() => {
    const imoveis: ImovelHeranca[] = [];
    if (imovelPrincipal > 0) imoveis.push({ rotulo: "Habitação", vpt: imovelPrincipal, comum: temConjuge && imovelComum });
    if (outrosImoveis > 0) imoveis.push({ rotulo: "Outro imóvel", vpt: outrosImoveis, comum: false });
    return {
      imoveis,
      outrosBensComuns: temConjuge && depositosComuns ? depositos : 0,
      outrosBensProprios: (temConjuge && depositosComuns ? 0 : depositos) + outros,
      dividas,
    };
  }, [imovelPrincipal, imovelComum, outrosImoveis, depositos, depositosComuns, outros, dividas, temConjuge]);

  const resultado = useMemo(() => simularHeranca(config, patrimonio), [config, patrimonio]);

  const bensDoacao: DoacaoBem[] = useMemo(() => {
    const bens: DoacaoBem[] = [];
    if (imovelPrincipal > 0) bens.push({ tipo: "imovel", valor: imovelPrincipal });
    if (outrosImoveis > 0) bens.push({ tipo: "imovel", valor: outrosImoveis });
    if (depositos + outros > 0) bens.push({ tipo: "outro", valor: depositos + outros });
    return bens;
  }, [imovelPrincipal, outrosImoveis, depositos, outros]);

  const comparacao = useMemo(() => compararHerancaVsDoacao(bensDoacao, "filho"), [bensDoacao]);
  // Sem rendimentoBase: no modo guiado mostramos só o ganho e a base tributável
  // (50%); a estimativa em euros do IRS — que depende do rendimento — vive no
  // modo completo, onde há um campo para o rendimento anual.
  const maisValias = useMemo(
    () => maisValiasImovelHerdado({ vptHeranca: imovelPrincipal, valorVenda }),
    [imovelPrincipal, valorVenda],
  );

  // Reabertura de cenário guardado
  useEffect(() => {
    const d = consumirReabertura("herancas") as Record<string, unknown> | null;
    if (!d) return;
    const set = <T,>(v: unknown, fn: (x: T) => void) => { if (v !== undefined) fn(v as T); };
    set(d.temConjuge, setTemConjuge); set(d.vinculoConjuge, setVinculoConjuge); set(d.regimeBens, setRegimeBens);
    set(d.nFilhos, setNFilhos); set(d.nRamosNetos, setNRamosNetos); set(d.ascendentes, setAscendentes);
    set(d.imovelPrincipal, setImovelPrincipal); set(d.imovelComum, setImovelComum); set(d.outrosImoveis, setOutrosImoveis);
    set(d.depositos, setDepositos); set(d.depositosComuns, setDepositosComuns); set(d.outros, setOutros); set(d.dividas, setDividas);
    set(d.temTestamento, setTemTestamento); set(d.beneficiario, setBeneficiario);
    setPasso("resultado");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function montarSnapshot() {
    return {
      temConjuge, vinculoConjuge, regimeBens, nFilhos, nRamosNetos, ascendentes,
      imovelPrincipal, imovelComum, outrosImoveis, depositos, depositosComuns, outros, dividas,
      temTestamento, beneficiario,
    };
  }

  function guardarCenario(nome: string) {
    const resumo: ResumoCenario = {
      destaque: resultado.selo.total,
      destaqueLabel: "Imposto do Selo total",
      destaqueFmt: "eur",
      linhas: [
        { label: "Herança líquida", valor: resultado.meacao.herancaLiquida, fmt: "eur" },
        { label: "Meação do cônjuge", valor: resultado.meacao.meacaoConjuge, fmt: "eur" },
        { label: "N.º de herdeiros", valor: resultado.partilha.quinhoes.length },
      ],
    };
    const r = cenariosStore.guardar({ tipo: "herancas", nome: nome || "Herança", resumo, dados: montarSnapshot() });
    setCenarioFeedback(r.erro ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: "Cenário guardado em «Os meus cenários»." });
    setDialogGuardar(false);
  }

  // Navegação
  const ORDEM: Passo[] = ["familia", "patrimonio", "testamento", "resultado", "aseguir"];
  function avancar() {
    if (passo === 0) { setPasso("familia"); return; }
    const i = ORDEM.indexOf(passo as Passo);
    if (i >= 0 && i < ORDEM.length - 1) setPasso(ORDEM[i + 1]);
  }
  function recuar() {
    if (passo === "familia") { setPasso(0); return; }
    const i = ORDEM.indexOf(passo as Passo);
    if (i > 0) setPasso(ORDEM[i - 1]);
  }

  const PASSOS_LABEL = ["Família", "Património", "Testamento", "Resultado", "A seguir"];
  const passoNum = passo === 0 ? 0 : ORDEM.indexOf(passo as Passo) + 1;

  // ── Passo 0: bifurcação ─────────────────────────────────────────────────────
  if (passo === 0) {
    return (
      <div className="bg-white dark:bg-stone-950">
        <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 py-12 sm:px-8">
          <div className="w-full max-w-lg">
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-light/60 px-3 py-1 text-xs font-semibold text-brand-dark">
              <Scale size={13} /> Heranças e sucessões · 2026
            </span>
            <h2 className="font-display mb-2 text-3xl font-semibold text-stone-800 sm:text-4xl dark:text-stone-100">
              O que te traz aqui?
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Em Portugal não há imposto sobre heranças — a família direta é isenta. Vamos ver quem herda o quê e
              quanto (se algo) se paga de Imposto do Selo.
            </p>
            <div className="space-y-3">
              <GuiadoOpcao
                leading={<Heart size={20} />}
                titulo="Vou receber uma herança"
                descricao="Quero saber a minha parte e se tenho de pagar Imposto do Selo."
                onClick={() => { setPerspetiva("receber"); setPasso("familia"); }}
                destaque
              />
              <GuiadoOpcao
                leading={<FileSign size={20} />}
                titulo="Estou a planear a minha sucessão"
                descricao="Quero perceber a legítima, a quota disponível e se compensa doar em vida."
                onClick={() => { setPerspetiva("planear"); setPasso("familia"); }}
              />
            </div>
            <p className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-400">
              <Info size={13} className="text-brand" /> Baseado no Código Civil e no Código do Imposto do Selo · estimativa, não substitui um notário
            </p>
          </div>
        </div>
      </div>
    );
  }

  const planeamento = perspetiva === "planear";

  return (
    <div className="bg-white dark:bg-stone-950">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="mb-8">
          <GuiadoStepper passos={PASSOS_LABEL} atual={passoNum} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {/* ── Família ─────────────────────────────────────────────── */}
              {passo === "familia" && (
                <m.div key="familia" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28, ease: EASE }}>
                  <GuiadoCabecalho
                    eyebrow="Passo 1 de 4"
                    titulo={planeamento ? "A tua família" : "A família do falecido"}
                    subtitulo="Quem herda depende de quem fica. Indica o cônjuge, os filhos e — só se não houver filhos nem netos — os pais ou avós."
                  />
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                          <Heart size={14} className="text-brand" /> Existe cônjuge ou companheiro?
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={temConjuge}
                          onClick={() => setTemConjuge((v) => !v)}
                          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${temConjuge ? "bg-brand" : "bg-stone-300 dark:bg-stone-700"}`}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${temConjuge ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                      {temConjuge && (
                        <div className="space-y-3">
                          <OpcaoPill
                            label="Vínculo"
                            tooltip="O casamento dá direitos sucessórios e meação. A união de facto NÃO herda automaticamente (só por testamento), mas é isenta de Imposto do Selo."
                            opcoes={[
                              { id: "casado" as const, label: "Casado(a)", sub: "Herdeiro legitimário" },
                              { id: "unido_facto" as const, label: "União de facto", sub: "Só herda por testamento" },
                            ]}
                            valor={vinculoConjuge}
                            onChange={setVinculoConjuge}
                          />
                          {vinculoConjuge === "casado" && (
                            <OpcaoPill label="Regime de bens" opcoes={REGIMES} valor={regimeBens} onChange={setRegimeBens} tooltip="Em comunhão, o cônjuge retira primeiro a meação (metade dos bens comuns), que não é herança." />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <ContaStepper label="Filhos vivos" value={nFilhos} onChange={setNFilhos} tooltip="Descendentes de 1.º grau vivos." />
                      <ContaStepper label="Ramos de netos (representação)" value={nRamosNetos} onChange={setNRamosNetos} tooltip="Netos que representam um filho já falecido. Cada filho pré-falecido com netos conta como 1 ramo." />
                    </div>

                    {nFilhos + nRamosNetos === 0 && (
                      <OpcaoPill
                        label="Há pais ou avós vivos?"
                        tooltip="Os ascendentes só herdam quando não há descendentes."
                        opcoes={[
                          { id: "nenhum" as Ascendentes, label: "Não" },
                          { id: "pais" as Ascendentes, label: "Pais" },
                          { id: "avos" as Ascendentes, label: "Avós" },
                        ]}
                        valor={ascendentes}
                        onChange={setAscendentes}
                      />
                    )}
                  </div>
                  <GuiadoNav onVoltar={recuar} onAvancar={avancar} />
                </m.div>
              )}

              {/* ── Património ──────────────────────────────────────────── */}
              {passo === "patrimonio" && (
                <m.div key="patrimonio" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28, ease: EASE }}>
                  <GuiadoCabecalho
                    eyebrow="Passo 2 de 4"
                    titulo="O património"
                    subtitulo={<>Os imóveis contam pelo <strong>VPT</strong> (Valor Patrimonial Tributário) da caderneta predial, não pelo valor de mercado. <LeiRef artigo="Art. 13.º CIS" url={LEI.tgis} /></>}
                  />
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                      <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500">
                        <Home size={14} className="text-brand" /> Imóveis (VPT)
                      </div>
                      <div className="space-y-3">
                        <CampoEuro label="Habitação principal" value={imovelPrincipal} onChange={setImovelPrincipal} tooltip="Valor Patrimonial Tributário na caderneta predial." />
                        {temConjuge && vinculoConjuge === "casado" && regimeBens !== "separacao" && (
                          <label className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-stone-300">
                            <input type="checkbox" checked={imovelComum} onChange={(e) => setImovelComum(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand" />
                            É um bem comum do casal (metade é meação do cônjuge)
                          </label>
                        )}
                        <CampoEuro label="Outros imóveis (VPT total)" value={outrosImoveis} onChange={setOutrosImoveis} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                      <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500">
                        <Coin size={14} className="text-brand" /> Outros bens e dívidas
                      </div>
                      <div className="space-y-3">
                        <CampoEuro label="Depósitos, poupanças, veículos" value={depositos} onChange={setDepositos} />
                        {temConjuge && vinculoConjuge === "casado" && regimeBens !== "separacao" && (
                          <label className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-stone-300">
                            <input type="checkbox" checked={depositosComuns} onChange={(e) => setDepositosComuns(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-brand" />
                            São bens comuns do casal
                          </label>
                        )}
                        <CampoEuro label="Outros bens próprios do falecido" value={outros} onChange={setOutros} tooltip="Bens que não são comuns: herdados, anteriores ao casamento, doados só a ele." />
                        <CampoEuro label="Dívidas e encargos da herança" value={dividas} onChange={setDividas} tooltip="Deduzem-se ao acervo antes da partilha." />
                      </div>
                    </div>
                  </div>
                  <GuiadoNav onVoltar={recuar} onAvancar={avancar} />
                </m.div>
              )}

              {/* ── Testamento ──────────────────────────────────────────── */}
              {passo === "testamento" && (
                <m.div key="testamento" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28, ease: EASE }}>
                  <GuiadoCabecalho
                    eyebrow="Passo 3 de 4"
                    titulo="Há testamento?"
                    subtitulo={<>Mesmo com testamento, a lei reserva a <strong>legítima</strong> aos herdeiros legitimários. Só a <strong>quota disponível</strong> pode ser deixada livremente. <LeiRef artigo="Código Civil" url={LEI.cc} /></>}
                  />
                  <div className="space-y-4">
                    <OpcaoPill
                      opcoes={[
                        { id: "nao", label: "Sem testamento", sub: "Aplica-se a sucessão legítima" },
                        { id: "sim", label: "Com testamento", sub: "Define a quota disponível" },
                      ]}
                      valor={temTestamento ? "sim" : "nao"}
                      onChange={(v) => setTemTestamento(v === "sim")}
                    />
                    {temTestamento && (
                      <div className="rounded-2xl border border-brand/20 bg-brand-light/20 p-4 dark:bg-brand/5">
                        <div className="mb-3 text-xs font-semibold text-stone-600 dark:text-stone-300">
                          A quota disponível ({resultado.partilha.configLegitima ? pct(resultado.partilha.disponivelFracao) : "toda a herança"}) é deixada a:
                        </div>
                        <OpcaoPill
                          opcoes={RELACOES_BENEFICIARIO.map((r) => ({ id: r.id, label: r.label }))}
                          valor={beneficiario}
                          onChange={setBeneficiario}
                        />
                        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                          <Info size={12} className="mt-0.5 flex-shrink-0 text-brand" />
                          Se deixares a quota disponível a quem não é família direta (ex.: um amigo), essa parte paga {pct(IS_TRANSMISSAO_GRATUITA.value)} de Imposto do Selo.
                        </p>
                      </div>
                    )}
                  </div>
                  <GuiadoNav onVoltar={recuar} onAvancar={avancar} avancarLabel="Ver resultado" />
                </m.div>
              )}

              {/* ── Resultado ───────────────────────────────────────────── */}
              {passo === "resultado" && (
                <m.div key="resultado" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28, ease: EASE }}>
                  <GuiadoCabecalho eyebrow="Resultado" titulo="Quem herda o quê" subtitulo="Primeiro separa-se a meação do cônjuge; o que resta é a herança, partilhada pelos herdeiros." />

                  {/* Cascata meação → herança */}
                  <div className="space-y-1.5">
                    {resultado.meacao.meacaoConjuge > 0 && (
                      <LinhaResumo label="Meação do cônjuge (não é herança)" valor={resultado.meacao.meacaoConjuge} cor="text-stone-500" />
                    )}
                    {resultado.meacao.dividas > 0 && (
                      <LinhaResumo label="Dívidas e encargos" valor={-resultado.meacao.dividas} cor="text-red-500 dark:text-red-400" />
                    )}
                    <LinhaResumo label="Herança líquida a partilhar" valor={resultado.meacao.herancaLiquida} cor="text-stone-800 dark:text-stone-100 font-semibold" sep />
                  </div>

                  {/* Quinhões */}
                  {resultado.partilha.quinhoes.length > 0 && (
                    <div className="mt-5 space-y-2">
                      {resultado.partilha.quinhoes.map((q) => {
                        const selo = resultado.selo.linhas.find((l) => l.id === q.id);
                        return (
                          <div key={q.id} className="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-stone-800 dark:text-stone-100">{q.rotulo}</div>
                                <div className="mt-0.5 text-[11px] text-stone-400">{pct(q.fracao)} da herança · {q.fundamento}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">{fmt(q.valor)}</div>
                                {selo && (
                                  <div className={`text-[11px] font-semibold ${selo.isento ? "text-brand" : "text-amber-600 dark:text-amber-400"}`}>
                                    {selo.isento ? "Isento de Imposto do Selo" : `Selo: ${fmt(selo.imposto)} (${pct(selo.taxa)})`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Total do Selo */}
                  <div className="mt-4 rounded-3xl border-2 border-brand bg-white p-5 shadow-card dark:bg-stone-950">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">Imposto do Selo total</div>
                        <div className="mt-0.5 text-[11px] text-stone-400">
                          {resultado.selo.todosIsentos ? "Família direta — nada a pagar" : `Só sobre herdeiros não isentos · Verba 1.2`}
                        </div>
                      </div>
                      <div className="font-display text-3xl font-semibold text-brand tabular-nums">
                        <AnimatedNumber value={resultado.selo.total} />
                      </div>
                    </div>
                  </div>

                  {/* Avisos */}
                  {resultado.avisos.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {resultado.avisos.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800/30 dark:bg-amber-900/10">
                          <Warning size={13} className="mt-0.5 flex-shrink-0 text-amber-500" />
                          <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">{a}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-4 px-1 text-[10px] leading-relaxed text-stone-400">
                    Estimativa com base no Código Civil (partilha) e na Verba 1.2 da Tabela Geral do Imposto do Selo (isenção da família direta — <LeiRef artigo="Art. 6.º CIS" url={LEI.cisArt6} />). Não substitui um notário/advogado.
                  </p>
                  <GuiadoNav onVoltar={recuar} onAvancar={avancar} avancarLabel="O que fazer a seguir" />
                </m.div>
              )}

              {/* ── A seguir ────────────────────────────────────────────── */}
              {passo === "aseguir" && (
                <m.div key="aseguir" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28, ease: EASE }}>
                  <GuiadoCabecalho eyebrow="A seguir" titulo="Passos e planeamento" subtitulo="Mesmo isento, é obrigatório declarar a herança. E há decisões de planeamento que podem poupar imposto." />

                  {/* Modelo 1 / prazo */}
                  <div className="rounded-2xl border border-brand/20 bg-brand-light/20 p-4 dark:bg-brand/5">
                    <div className="flex items-start gap-2.5">
                      <Calendar size={16} className="mt-0.5 flex-shrink-0 text-brand" />
                      <div>
                        <div className="text-sm font-bold text-stone-800 dark:text-stone-100">Participar ao Fisco: Modelo 1 do Imposto do Selo</div>
                        <p className="mt-1 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                          O cabeça-de-casal entrega o Modelo 1 (ISTG) até ao fim do <strong>{PRAZO_MODELO1_MESES.value}.º mês</strong> seguinte ao do óbito, mesmo quando a herança é isenta. <LeiRef artigo="Art. 26.º CIS" url={LEI.cisArt26} /> <LeiRef artigo="Modelo 1" url={LEI.modelo1} />
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Comparação herança vs doação */}
                  <div className="mt-4">
                    <Collapsible title={<span className="flex items-center gap-1.5"><Gift size={15} className="text-brand" /> Herança vs doação em vida</span>} defaultOpen>
                      <p className="mb-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                        Doar imóveis em vida à família direta paga <strong>{pct(IS_DOACAO_IMOVEL.value)}</strong> de Imposto do Selo (Verba 1.1); herdá-los é totalmente isento. Fora dos imóveis, ambas são isentas para a família.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-brand/30 bg-brand-light/30 p-3 text-center dark:bg-brand/10">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Herdar (por morte)</div>
                          <div className="font-display text-xl font-bold text-brand tabular-nums">{fmt(comparacao.impostoHeranca)}</div>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-white p-3 text-center dark:border-stone-700 dark:bg-stone-900">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Doar em vida</div>
                          <div className="font-display text-xl font-bold text-stone-700 dark:text-stone-200 tabular-nums">{fmt(comparacao.impostoDoacao)}</div>
                          <div className="text-[9px] text-stone-400">0,8% sobre {fmt(comparacao.detalheDoacao.imoveis)} de imóveis</div>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{comparacao.nota}</p>
                    </Collapsible>
                  </div>

                  {/* Mais-valias futuras */}
                  <div className="mt-3">
                    <Collapsible title={<span className="flex items-center gap-1.5"><Building size={15} className="text-brand" /> E se vender o imóvel herdado?</span>}>
                      <p className="mb-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                        Ao vender, o valor de aquisição é o <strong>VPT à data do óbito</strong> ({fmt(imovelPrincipal)}) — Art. 45.º CIRS. Só 50% do ganho é tributado em IRS. <LeiRef artigo="Art. 45.º CIRS" url={LEI.art45cirs} />
                      </p>
                      <CampoEuro label="Valor de venda estimado" value={valorVenda} onChange={setValorVenda} />
                      {valorVenda > 0 && (
                        <div className="mt-3 space-y-1.5 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
                          <LinhaMini label="Ganho (venda − VPT)" valor={maisValias.ganho} />
                          <LinhaMini label="Base tributável (50% do ganho)" valor={maisValias.incluido} forte />
                          <p className="pt-1 text-[10px] leading-relaxed text-stone-400">
                            Esta base soma-se ao teu rendimento e é tributada à tua taxa marginal de IRS. Vê o valor exato no simulador completo ou no <Link href="/ferramentas/simulador-irs" className="font-medium text-brand-dark underline-offset-2 hover:underline dark:text-brand">Simulador de IRS</Link>.
                          </p>
                        </div>
                      )}
                    </Collapsible>
                  </div>

                  {/* Guardar cenário */}
                  <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-900/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">Guardar esta simulação</div>
                        <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">Reabre em <Link href="/dashboard/cenarios" className="font-medium text-brand-dark underline-offset-2 hover:underline dark:text-brand">Os meus cenários</Link>.</p>
                      </div>
                      <button type="button" onClick={() => setDialogGuardar(true)} disabled={cenariosStore.limiteAtingido} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50">
                        <Check size={15} /> Guardar
                      </button>
                    </div>
                    {cenarioFeedback && (
                      <div className={`mt-3 flex items-start gap-2.5 rounded-xl border p-3 text-xs ${cenarioFeedback.tipo === "ok" ? "border-brand/20 bg-brand-light text-brand-dark" : "border-alert-border bg-alert-bg text-alert-text"}`}>
                        {cenarioFeedback.tipo === "ok" ? <Check size={13} className="mt-0.5 flex-shrink-0" /> : <Warning size={13} className="mt-0.5 flex-shrink-0" />}
                        <span>{cenarioFeedback.texto}</span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link href="/ferramentas/mapa-contabilistas" className="group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:border-brand/40 hover:shadow-card dark:border-stone-800 dark:bg-stone-900">
                      <Sparkle size={18} className="flex-shrink-0 text-brand" />
                      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-stone-800 dark:text-stone-100">Falar com um profissional</span><span className="text-xs text-stone-500 dark:text-stone-400">Notário, advogado ou contabilista</span></span>
                      <ArrowRight size={16} className="flex-shrink-0 text-stone-300 group-hover:text-brand" />
                    </Link>
                    <Link href="/guias/mais-valias" className="group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:border-brand/40 hover:shadow-card dark:border-stone-800 dark:bg-stone-900">
                      <Building size={18} className="flex-shrink-0 text-brand" />
                      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-stone-800 dark:text-stone-100">Guia de mais-valias</span><span className="text-xs text-stone-500 dark:text-stone-400">Vender um imóvel herdado</span></span>
                      <ArrowRight size={16} className="flex-shrink-0 text-stone-300 group-hover:text-brand" />
                    </Link>
                  </div>

                  <div className="mt-6">
                    <button type="button" onClick={recuar} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-400">
                      Voltar ao resultado
                    </button>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Painel lateral vivo */}
          {passo !== "resultado" && passo !== "aseguir" && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-3xl border border-stone-100 bg-stone-50/60 p-5 dark:border-stone-800 dark:bg-stone-900/40">
                <div className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Em tempo real</div>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-[11px] text-stone-400">Herança líquida</div>
                    <div className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100 tabular-nums"><AnimatedNumber value={resultado.meacao.herancaLiquida} /></div>
                  </div>
                  {resultado.meacao.meacaoConjuge > 0 && (
                    <div>
                      <div className="text-[11px] text-stone-400">Meação do cônjuge</div>
                      <div className="text-sm font-semibold text-stone-600 dark:text-stone-300 tabular-nums">{fmt(resultado.meacao.meacaoConjuge)}</div>
                    </div>
                  )}
                  <div className="border-t border-stone-200 pt-3 dark:border-stone-700">
                    <div className="text-[11px] text-stone-400">Imposto do Selo</div>
                    <div className={`font-display text-2xl font-semibold tabular-nums ${resultado.selo.todosIsentos ? "text-brand" : "text-amber-600 dark:text-amber-400"}`}>
                      <AnimatedNumber value={resultado.selo.total} />
                    </div>
                    {resultado.selo.todosIsentos && <div className="mt-0.5 text-[10px] font-medium text-brand">Família direta isenta</div>}
                  </div>
                  <div className="text-[11px] text-stone-400">{resultado.partilha.quinhoes.length} herdeiro(s)</div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      <GuardarCenarioDialog
        aberto={dialogGuardar}
        nomePadrao="Herança"
        onGuardar={guardarCenario}
        onFechar={() => setDialogGuardar(false)}
      />
    </div>
  );
}

// ── Sub-componentes de linha ──────────────────────────────────────────────────

function LinhaResumo({ label, valor, cor, sep }: { label: string; valor: number; cor: string; sep?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${sep ? "mt-1 border-t border-stone-100 bg-stone-50/50 dark:border-stone-800 dark:bg-stone-900/30" : ""}`}>
      <span className="text-[11px] text-stone-500 dark:text-stone-400">{label}</span>
      <span className={`text-[11px] tabular-nums ${cor}`}>{valor < 0 ? "−" : ""}{fmt(Math.abs(valor))}</span>
    </div>
  );
}

function LinhaMini({ label, valor, forte }: { label: string; valor: number; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[11px] ${forte ? "font-semibold text-stone-700 dark:text-stone-200" : "text-stone-500 dark:text-stone-400"}`}>{label}</span>
      <span className={`text-[11px] tabular-nums ${forte ? "font-bold text-stone-800 dark:text-stone-100" : "text-stone-600 dark:text-stone-300"}`}>{fmt(valor)}</span>
    </div>
  );
}
