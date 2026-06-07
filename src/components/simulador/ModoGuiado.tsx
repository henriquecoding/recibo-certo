"use client";

import { useState, useMemo } from "react";
import { m, AnimatePresence } from "motion/react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import InfoTip from "@/components/ui/InfoTip";
import {
  Check,
  Warning,
  ArrowRight,
  ArrowLeft,
  Laptop,
  ShoppingBag,
  Home,
  Briefcase,
  PenLine,
  ChevronDown,
} from "@/components/ui/Icons";
import EuroBreakdown from "@/components/simulador/EuroBreakdown";
import { pct, fmt } from "@/lib/format";
import {
  IVA_TAXAS,
  efeitoFiscal,
  META_TIPO,
  RETENCAO,
  COEFICIENTE_POR_TIPO,
  type Atividade,
  type Regiao,
} from "@/lib/fiscal-data";
import { calcular, simularIRSAnual, type RegimeIVA } from "@/lib/fiscal";

// ─── Constantes locais ────────────────────────────────────────────────────────

const IVA_LIMITE = 15_000;
const IVA_LIMITE_IMEDIATO = 18_750;
const SS_TAXA = 0.214;
const SS_BASE_SERVICOS = 0.7;
const IRS_JOVEM_ISENCAO: Record<number, number> = {
  1: 1.0,
  2: 0.75,
  3: 0.75,
  4: 0.75,
  5: 0.5,
  6: 0.5,
  7: 0.5,
  8: 0.25,
  9: 0.25,
  10: 0.25,
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoAtiv = "art151" | "vendas" | "hosped" | "outras" | "prop_int";
type Passo = 1 | 2 | 3 | "resultado";

interface CardAtiv {
  id: TipoAtiv;
  titulo: string;
  sub: string;
  exemplos: string;
  coef: number;
  ret: number;
  baseSS: "bens" | "servicos";
  tipoFiscal: "art151" | "outros" | "vendas" | "diretosAutor";
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const CARDS_ATIV: CardAtiv[] = [
  {
    id: "art151",
    titulo: "Consultor, Programador ou Designer",
    sub: "Profissão liberal (Art. 151.º CIRS)",
    exemplos: "Dev, designer, advogado, arquiteto, engenheiro…",
    coef: 0.75,
    ret: 0.23,
    baseSS: "servicos",
    tipoFiscal: "art151",
    Icon: Laptop,
  },
  {
    id: "vendas",
    titulo: "Vendo produtos",
    sub: "Comércio, produção e revenda de mercadorias",
    exemplos: "E-commerce, artesanato, manufatura…",
    coef: 0.15,
    ret: 0,
    baseSS: "bens",
    tipoFiscal: "vendas",
    Icon: ShoppingBag,
  },
  {
    id: "hosped",
    titulo: "Alojamento ou Hostelaria",
    sub: "Alojamento local, hotel ou restauração",
    exemplos: "Airbnb, hostel, restaurante, café…",
    coef: 0.35,
    ret: 0,
    baseSS: "bens",
    tipoFiscal: "vendas",
    Icon: Home,
  },
  {
    id: "outras",
    titulo: "Outros serviços",
    sub: "Serviços não listados no Art. 151.º",
    exemplos: "Explicações, motorista, jardinagem…",
    coef: 0.35,
    ret: 0.115,
    baseSS: "servicos",
    tipoFiscal: "outros",
    Icon: Briefcase,
  },
  {
    id: "prop_int",
    titulo: "Direitos de autor ou Royalties",
    sub: "Propriedade intelectual e licenciamento",
    exemplos: "Livros, música, software, patentes…",
    coef: 0.75,
    ret: 0.165,
    baseSS: "servicos",
    tipoFiscal: "diretosAutor",
    Icon: PenLine,
  },
];

const PRESETS_BRUTO = [500, 800, 1_000, 1_500, 2_000, 3_000, 5_000];
const PRESETS_RECIBOS = [1, 2, 4, 6, 8, 12];

// Metadados explicativos por tipo de atividade
const ATIV_META: Record<
  TipoAtiv,
  {
    descricao: string;
    ivaEsperado: "isento" | "reduzida" | "intermedia" | "normal";
    nota: string | null;
  }
> = {
  art151: {
    descricao:
      "Profissões da tabela da Portaria 1011/2001 (programadores, designers, engenheiros, advogados, etc.). Coef. 0,75 · Ret. 23% · SS sobre 70% do rendimento.",
    ivaEsperado: "normal",
    nota: "15% do rendimento bruto deve ser justificado com despesas (regra dos 15%). O excesso não justificado é acrescido ao tributável.",
  },
  vendas: {
    descricao:
      "Comércio, produção e revenda de mercadorias. Coef. 0,15 porque as margens brutas são reduzidas. Sem retenção na fonte. SS sobre 20%.",
    ivaEsperado: "normal",
    nota: "A Segurança Social incide sobre apenas 20% do rendimento — base reduzida para vendas e produção.",
  },
  hosped: {
    descricao:
      "Alojamento local em moradia/apartamento. Coef. 0,35. Sem retenção na fonte. SS sobre 20%.",
    ivaEsperado: "intermedia",
    nota: "Em zona de pressão urbanística o coeficiente sobe para 0,50 (Anexo 13F da Mod. 3). Confirma sempre o enquadramento com o teu contabilista.",
  },
  outras: {
    descricao:
      "Serviços enquadrados no código 1519 — não listados no Art. 151.º CIRS. Ret. 11,5% · Coef. 0,35 · SS sobre 70%.",
    ivaEsperado: "normal",
    nota: null,
  },
  prop_int: {
    descricao:
      "Royalties, licenciamento de software, obras originais (livros, música, arte). Coef. 0,75 · Ret. 16,5% · SS sobre 70%.",
    ivaEsperado: "normal",
    nota: "Só para titulares da obra original. Coef. 0,95 quando o autor cede a obra a uma única entidade — verificar com contabilista.",
  },
};

// Metadados explicativos por regime de IVA
const IVA_META = {
  isento: {
    titulo: "Isenção Art. 53.º CIVA",
    quando:
      "Faturação anual abaixo de €15.000. Não cobras IVA ao cliente nem podes deduzir IVA das tuas compras. Regime mais simples e comum para quem começa.",
    compativel: "Qualquer atividade com faturação abaixo do limiar anual",
    incompativel: null as string | null,
  },
  reduzida: {
    titulo: "Taxa reduzida",
    quando:
      "Bens e serviços das Listas I e II do CIVA: medicamentos, produtos alimentares básicos, livros, assistência médica específica, alguns bens agrícolas.",
    compativel:
      "Farmacêuticos, saúde (serviços específicos), produção agrícola, bens alimentares básicos",
    incompativel:
      "Maioria das profissões liberais Art. 151.º e serviços de consultoria — aplicam taxa normal" as
        | string
        | null,
  },
  intermedia: {
    titulo: "Taxa intermédia",
    quando:
      "Lista II-A do CIVA: serviços de restauração e bebidas, alojamento turístico, alguns produtos agrícolas.",
    compativel:
      "Restauração, alojamento local e hotelaria, alguns produtos agrícolas",
    incompativel:
      "Profissões liberais Art. 151.º, consultoria, TI, engenharia — aplicam taxa normal" as
        | string
        | null,
  },
  normal: {
    titulo: "Taxa normal",
    quando:
      "Todos os bens e serviços que não constam das listas de taxa reduzida ou intermédia. É a taxa geral e a mais comum nos serviços.",
    compativel:
      "Profissões liberais Art. 151.º, consultoria, TI, engenharia, advocacia e a maioria dos serviços",
    incompativel: null as string | null,
  },
} as const;

// ─── Interface de saída (para sincronizar com o modo profissional) ─────────────

export interface EstadoGuiadoSaida {
  tipoAtiv: TipoAtiv;
  atividade: Atividade | null;
  bruto: number;
  brutoAnual: number;
  regiao: Regiao;
  regimeIVA: RegimeIVA;
  acumulaEmprego: boolean;
  isencaoSSPrimeiroAno: boolean;
  irsJovemAno: number;
  despSaude: number;
  despEducacao: number;
  despGerais: number;
  despRendas: number;
  ifici: boolean;
  deficiencia: boolean;
}

interface ModoGuiadoProps {
  onIrParaSimuladorCompleto: (estado: EstadoGuiadoSaida) => void;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ModoGuiado({
  onIrParaSimuladorCompleto,
}: ModoGuiadoProps) {
  // ── Navegação ─────────────────────────────────────────────────────────────
  const [passo, setPasso] = useState<Passo>(1);

  // ── Passo 1: Atividade ────────────────────────────────────────────────────
  const [tipoAtiv, setTipoAtiv] = useState<TipoAtiv>("art151");
  const [atividadeEspecifica, setAtividadeEspecifica] =
    useState<Atividade | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(false);

  // ── Passo 2: Faturação ────────────────────────────────────────────────────
  const [bruto, setBruto] = useState(1_500);
  const [brutoInput, setBrutoInput] = useState("1500");
  const [recibosAno, setRecibosAno] = useState(12);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [regimeIVA, setRegimeIVA] = useState<RegimeIVA>("isento");

  // ── Passo 3: Situação ─────────────────────────────────────────────────────
  const [acumulaEmprego, setAcumulaEmprego] = useState(false);
  const [isencaoSSPrimeiroAno, setIsencaoSSPrimeiroAno] = useState(false);
  const [irsJovemOn, setIrsJovemOn] = useState(false);
  const [irsJovemAno, setIrsJovemAno] = useState(1);
  const [ifici, setIfici] = useState(false);
  const [deficiencia, setDeficiencia] = useState(false);
  const [mostrarDeducoes, setMostrarDeducoes] = useState(false);
  const [despSaude, setDespSaude] = useState(0);
  const [despEducacao, setDespEducacao] = useState(0);
  const [despRendas, setDespRendas] = useState(0);
  const [despGerais, setDespGerais] = useState(0);

  // ── Dados da atividade selecionada ────────────────────────────────────────
  const card = CARDS_ATIV.find((c) => c.id === tipoAtiv)!;
  const isencaoSS = isencaoSSPrimeiroAno || acumulaEmprego;
  const jovemAno = irsJovemOn ? irsJovemAno : 0;

  // ── Faturação anual ───────────────────────────────────────────────────────
  const brutoAnual = bruto * recibosAno;

  // ── Cálculo ao vivo ───────────────────────────────────────────────────────
  const resultRecibo = useMemo(
    () =>
      calcular({
        bruto,
        tipo: card.tipoFiscal,
        regiao,
        regimeIVA,
        baseSS: card.baseSS,
        dispensaRetencao: false,
        isencaoSSPrimeiroAno,
        acumulaEmprego,
        irsJovemAno: jovemAno,
      }),
    [
      bruto,
      card.tipoFiscal,
      card.baseSS,
      regiao,
      regimeIVA,
      isencaoSSPrimeiroAno,
      acumulaEmprego,
      jovemAno,
    ],
  );

  const irsAnual = resultRecibo.retencaoIRS * recibosAno;
  const ssAnual = isencaoSS
    ? 0
    : Math.min(bruto * SS_BASE_SERVICOS * SS_TAXA, 1_379) * recibosAno;
  const ivaAnual = resultRecibo.iva * recibosAno;
  const liquidoAnual = brutoAnual - irsAnual - ssAnual;

  // ── Estado de saída ───────────────────────────────────────────────────────
  const estadoSaida: EstadoGuiadoSaida = {
    tipoAtiv,
    atividade: atividadeEspecifica,
    bruto,
    brutoAnual,
    regiao,
    regimeIVA,
    acumulaEmprego,
    isencaoSSPrimeiroAno,
    irsJovemAno: jovemAno,
    despSaude,
    despEducacao,
    despGerais,
    despRendas,
    ifici,
    deficiencia,
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  function selecionarTipo(id: TipoAtiv) {
    setTipoAtiv(id);
    setTipoSelecionado(true);
    setAtividadeEspecifica(null);
  }

  function avancar() {
    if (passo === 1) setPasso(2);
    else if (passo === 2) setPasso(3);
    else if (passo === 3) setPasso("resultado");
  }

  function recuar() {
    if (passo === 2) setPasso(1);
    else if (passo === 3) setPasso(2);
    else if (passo === "resultado") setPasso(3);
  }

  const passoNum = passo === "resultado" ? 4 : passo;
  const PASSOS = ["Atividade", "Faturação", "Situação", "Resultado"];

  return (
    <div className="min-h-0 bg-white dark:bg-stone-950">
      {/* ── Barra de progresso ──────────────────────────────────────────────── */}
      <div className="border-b border-stone-100 px-6 py-4 dark:border-stone-800 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-0">
            {PASSOS.map((label, i) => {
              const n = i + 1;
              const done = passoNum > n;
              const active = passoNum === n;
              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        done
                          ? "bg-brand text-white"
                          : active
                            ? "bg-brand text-white shadow-sm ring-4 ring-brand/20"
                            : "bg-stone-100 text-stone-400 dark:bg-stone-800"
                      }`}
                    >
                      {done ? <Check size={12} /> : n}
                    </div>
                    <span
                      className={`mt-1 hidden text-[10px] font-semibold sm:block ${
                        done || active
                          ? "text-brand-dark dark:text-brand"
                          : "text-stone-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < PASSOS.length - 1 && (
                    <div
                      className={`mx-1 mb-4 h-0.5 w-8 transition-colors sm:mx-2 sm:w-16 ${
                        passoNum > n
                          ? "bg-brand"
                          : "bg-stone-200 dark:bg-stone-700"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Corpo principal: conteúdo + painel ao vivo ──────────────────────── */}
      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          {/* ── Conteúdo do passo ─────────────────────────────────────────── */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {passo === 1 && (
                <m.div
                  key="p1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PassoAtividade
                    tipoAtiv={tipoAtiv}
                    tipoSelecionado={tipoSelecionado}
                    atividadeEspecifica={atividadeEspecifica}
                    onSelecionarTipo={selecionarTipo}
                    onAtividadeEspecifica={(a) => {
                      setAtividadeEspecifica(a);
                      if (a) {
                        setTipoSelecionado(true);
                        const mapa: Record<string, TipoAtiv> = {
                          art151: "art151",
                          vendas: "vendas",
                          outros: "outras",
                          diretosAutor: "prop_int",
                        };
                        setTipoAtiv(mapa[a.tipo] ?? "art151");
                      }
                    }}
                  />
                </m.div>
              )}
              {passo === 2 && (
                <m.div
                  key="p2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PassoFaturacao
                    bruto={bruto}
                    brutoInput={brutoInput}
                    recibosAno={recibosAno}
                    brutoAnual={brutoAnual}
                    regiao={regiao}
                    regimeIVA={regimeIVA}
                    tipoAtiv={tipoAtiv}
                    onBrutoChange={(v) => {
                      setBruto(v);
                      setBrutoInput(String(v));
                      // Auto-detecta regime IVA
                      const anual = v * recibosAno;
                      if (anual <= IVA_LIMITE) setRegimeIVA("isento");
                    }}
                    onBrutoInputChange={(s) => {
                      setBrutoInput(s);
                      const v = parseFloat(s) || 0;
                      if (v > 0) setBruto(v);
                    }}
                    onRecibosAnoChange={(r) => {
                      setRecibosAno(r);
                      const anual = bruto * r;
                      if (anual <= IVA_LIMITE) setRegimeIVA("isento");
                    }}
                    onRegiaoChange={setRegiao}
                    onRegimeIVAChange={setRegimeIVA}
                  />
                </m.div>
              )}
              {passo === 3 && (
                <m.div
                  key="p3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PassoSituacao
                    acumulaEmprego={acumulaEmprego}
                    setAcumulaEmprego={setAcumulaEmprego}
                    isencaoSSPrimeiroAno={isencaoSSPrimeiroAno}
                    setIsencaoSSPrimeiroAno={setIsencaoSSPrimeiroAno}
                    irsJovemOn={irsJovemOn}
                    setIrsJovemOn={setIrsJovemOn}
                    irsJovemAno={irsJovemAno}
                    setIrsJovemAno={setIrsJovemAno}
                    ifici={ifici}
                    setIfici={setIfici}
                    deficiencia={deficiencia}
                    setDeficiencia={setDeficiencia}
                    mostrarDeducoes={mostrarDeducoes}
                    setMostrarDeducoes={setMostrarDeducoes}
                    despSaude={despSaude}
                    setDespSaude={setDespSaude}
                    despEducacao={despEducacao}
                    setDespEducacao={setDespEducacao}
                    despRendas={despRendas}
                    setDespRendas={setDespRendas}
                    despGerais={despGerais}
                    setDespGerais={setDespGerais}
                    ssAnualPoupanca={
                      isencaoSS
                        ? Math.min(bruto * SS_BASE_SERVICOS * SS_TAXA, 1_379) *
                          recibosAno
                        : 0
                    }
                  />
                </m.div>
              )}
              {passo === "resultado" && (
                <m.div
                  key="resultado"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ResultadoFinal
                    brutoAnual={brutoAnual}
                    liquidoAnual={liquidoAnual}
                    irsAnual={irsAnual}
                    ssAnual={ssAnual}
                    ivaAnual={ivaAnual}
                    recibosAno={recibosAno}
                    resultRecibo={resultRecibo}
                    card={card}
                    regiao={regiao}
                    tipoAtiv={tipoAtiv}
                    isencaoSS={isencaoSS}
                    irsJovemAno={jovemAno}
                    ifici={ifici}
                    deficiencia={deficiencia}
                    despSaude={despSaude}
                    despEducacao={despEducacao}
                    despGerais={despGerais}
                    despRendas={despRendas}
                    onIrParaSimuladorCompleto={() =>
                      onIrParaSimuladorCompleto(estadoSaida)
                    }
                    onRecomecar={() => {
                      setPasso(1);
                      setTipoSelecionado(false);
                    }}
                  />
                </m.div>
              )}
            </AnimatePresence>

            {/* ── Navegação ───────────────────────────────────────────────── */}
            {passo !== "resultado" && (
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={recuar}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    passo === 1
                      ? "invisible"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
                  }`}
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={avancar}
                  disabled={passo === 1 && !tipoSelecionado}
                  className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-float disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {passo === 3 ? "Ver o meu resultado" : "Continuar"}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* ── Painel de resultado ao vivo ──────────────────────────────── */}
          {passo !== "resultado" && (
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <PainelResultadoVivo
                  brutoAnual={brutoAnual}
                  liquidoAnual={liquidoAnual}
                  irsAnual={irsAnual}
                  ssAnual={ssAnual}
                  ivaAnual={ivaAnual}
                  recibosAno={recibosAno}
                  tipoAtiv={tipoSelecionado ? tipoAtiv : null}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Rodapé do wizard ────────────────────────────────────────────────── */}
      {passo !== "resultado" && (
        <div className="border-t border-stone-100 px-6 py-3 dark:border-stone-800">
          <div className="mx-auto max-w-3xl text-center">
            <button
              type="button"
              onClick={() => onIrParaSimuladorCompleto(estadoSaida)}
              className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
            >
              Ignorar guia e ir para o simulador completo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Passo 1: Atividade ───────────────────────────────────────────────────────

function PassoAtividade({
  tipoAtiv,
  tipoSelecionado,
  atividadeEspecifica,
  onSelecionarTipo,
  onAtividadeEspecifica,
}: {
  tipoAtiv: TipoAtiv;
  tipoSelecionado: boolean;
  atividadeEspecifica: Atividade | null;
  onSelecionarTipo: (id: TipoAtiv) => void;
  onAtividadeEspecifica: (a: Atividade | null) => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          O que fazes?
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Escolhe a categoria que melhor descreve a tua atividade — isto
          determina a retenção na fonte, o coeficiente fiscal e a base da
          Segurança Social.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {CARDS_ATIV.map(({ id, titulo, sub, exemplos, coef, ret, Icon }) => {
          const active = tipoAtiv === id && tipoSelecionado;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelecionarTipo(id)}
              className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                active
                  ? "border-brand bg-brand-light shadow-lift"
                  : "border-stone-200 bg-white hover:border-brand/30 hover:bg-stone-50 hover:shadow-card dark:border-stone-700 dark:bg-stone-900/60 dark:hover:border-brand/30"
              }`}
            >
              {active && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                  <Check size={10} className="text-white" />
                </div>
              )}
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                    active
                      ? "bg-brand text-white"
                      : "bg-stone-100 text-stone-500 group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800 dark:text-stone-400"
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[13px] font-bold leading-snug ${active ? "text-brand-dark" : "text-stone-800 dark:text-stone-100"}`}
                  >
                    {titulo}
                  </div>
                  <div
                    className={`mt-0.5 text-xs leading-relaxed ${active ? "text-brand-dark/70" : "text-stone-500 dark:text-stone-400"}`}
                  >
                    {sub}
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] italic ${active ? "text-brand/70" : "text-stone-400"}`}
                  >
                    {exemplos}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? "bg-brand/15 text-brand-dark" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`}
                >
                  Ret. {pct(ret)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? "bg-brand/15 text-brand-dark" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`}
                >
                  Coef. {pct(coef)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Atividade específica */}
      <div className="mt-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
          <span className="text-xs font-medium text-stone-400">
            ou escolhe a tua atividade específica
          </span>
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
        </div>
        <ActivityCombobox
          value={atividadeEspecifica}
          onChange={onAtividadeEspecifica}
        />
        {atividadeEspecifica && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-light/40 px-3 py-2">
            <Check size={13} className="flex-shrink-0 text-brand" />
            <span className="text-xs font-semibold text-brand-dark">
              {atividadeEspecifica.label}
            </span>
          </div>
        )}
      </div>

      {/* Painel contextual da atividade selecionada */}
      {tipoSelecionado &&
        (() => {
          const meta = ATIV_META[tipoAtiv];
          const card = CARDS_ATIV.find((c) => c.id === tipoAtiv)!;
          return (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/60">
              <div className="mb-2 flex items-center gap-2">
                <card.Icon size={14} className="flex-shrink-0 text-brand" />
                <span className="text-xs font-bold uppercase tracking-wider text-brand-dark dark:text-brand">
                  {card.titulo}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                {meta.descricao}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
                  Coef. {pct(card.coef)}
                </span>
                {card.ret > 0 && (
                  <span className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
                    Ret. {pct(card.ret)}
                  </span>
                )}
                <span className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
                  SS base {card.baseSS === "bens" ? "20%" : "70%"}
                </span>
                <span className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
                  IVA típico:{" "}
                  {meta.ivaEsperado === "isento"
                    ? "isento"
                    : meta.ivaEsperado === "reduzida"
                      ? "taxa reduzida"
                      : meta.ivaEsperado === "intermedia"
                        ? "taxa intermédia"
                        : "taxa normal"}
                </span>
              </div>
              {meta.nota && (
                <div className="mt-2.5 flex items-start gap-1.5 border-t border-stone-200 pt-2.5 dark:border-stone-700">
                  <Warning
                    size={11}
                    className="mt-0.5 flex-shrink-0 text-alert-text"
                  />
                  <p className="text-[11px] leading-relaxed text-alert-text">
                    {meta.nota}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

      {/* ── ComparadorCAE: painel fiscal da atividade específica ─────────── */}
      {atividadeEspecifica &&
        (() => {
          const ef = efeitoFiscal(atividadeEspecifica);
          const tipo = atividadeEspecifica.tipo;
          const metaTipo = META_TIPO[tipo];
          const cardAtiv = CARDS_ATIV.find((c) => c.id === tipoAtiv)!;
          const TIPO_LABEL: Record<string, string> = {
            art151: "Art. 151.º CIRS",
            outros: "Cat. B — outros serviços",
            vendas: "Comércio / produção",
            diretosAutor: "Direitos de autor",
          };
          const implicacoes: string[] = [];
          if (ef.retencao > 0)
            implicacoes.push(
              `Retenção de ${pct(ef.retencao)} em cada recibo (clientes empresas)`,
            );
          else implicacoes.push("Sem retenção na fonte");
          implicacoes.push(
            `Coeficiente ${pct(ef.coef)} no regime simplificado`,
          );
          implicacoes.push(
            `Base SS: ${ef.baseSS === "servicos" ? "70%" : "20%"} do rendimento`,
          );
          if (ef.nota) implicacoes.push(ef.nota);
          return (
            <div className="mt-4 rounded-2xl border border-brand/20 bg-brand-light/20 p-4 dark:border-brand/30 dark:bg-brand/5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-dark dark:text-brand">
                  Parâmetros fiscais · {atividadeEspecifica.label}
                </span>
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                  {TIPO_LABEL[tipo] ?? tipo}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Retenção",
                    val: pct(RETENCAO[tipo]?.value ?? ef.retencao),
                    note: "Art. 101.º CIRS",
                  },
                  {
                    label: "Coeficiente",
                    val: pct(COEFICIENTE_POR_TIPO[tipo] ?? ef.coef),
                    note: ef.legalCoef,
                  },
                  {
                    label: "Base SS",
                    val: ef.baseSS === "servicos" ? "70%" : "20%",
                    note: "Cód. Contributivo",
                  },
                ].map(({ label, val, note }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-brand/10 bg-white/60 p-2.5 text-center dark:bg-stone-900/40"
                  >
                    <div className="text-sm font-bold text-brand">{val}</div>
                    <div className="text-[10px] font-semibold text-stone-500">
                      {label}
                    </div>
                    <div className="text-[9px] text-stone-400">{note}</div>
                  </div>
                ))}
              </div>
              <ul className="space-y-1">
                {implicacoes.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400"
                  >
                    <Check
                      size={10}
                      className="mt-0.5 flex-shrink-0 text-brand"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              {(ef.coef !== cardAtiv.coef || ef.retencao !== cardAtiv.ret) && (
                <div className="mt-2.5 flex items-start gap-1.5 border-t border-brand/10 pt-2.5">
                  <Warning
                    size={10}
                    className="mt-0.5 flex-shrink-0 text-alert-text"
                  />
                  <p className="text-[10px] leading-relaxed text-alert-text">
                    Esta atividade específica tem parâmetros diferentes da
                    categoria genérica selecionada acima — os valores desta
                    tabela têm precedência.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

      {!tipoSelecionado && (
        <p className="mt-4 text-center text-xs text-stone-400">
          Seleciona uma categoria para continuar
        </p>
      )}
    </div>
  );
}

// ─── Passo 2: Faturação ───────────────────────────────────────────────────────

function PassoFaturacao({
  bruto,
  brutoInput,
  recibosAno,
  brutoAnual,
  regiao,
  regimeIVA,
  tipoAtiv,
  onBrutoChange,
  onBrutoInputChange,
  onRecibosAnoChange,
  onRegiaoChange,
  onRegimeIVAChange,
}: {
  bruto: number;
  brutoInput: string;
  recibosAno: number;
  brutoAnual: number;
  regiao: Regiao;
  regimeIVA: RegimeIVA;
  tipoAtiv: TipoAtiv;
  onBrutoChange: (v: number) => void;
  onBrutoInputChange: (s: string) => void;
  onRecibosAnoChange: (v: number) => void;
  onRegiaoChange: (v: Regiao) => void;
  onRegimeIVAChange: (v: RegimeIVA) => void;
}) {
  const taxasIVA = IVA_TAXAS[regiao].value;

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          Quanto faturarás?
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Valor por recibo, antes de IVA. Se ainda não sabes, usa o valor que
          gostarias de receber por mês.
        </p>
      </div>

      {/* Presets de valor */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Valor por recibo (€)
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS_BRUTO.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={bruto === v}
              onClick={() => onBrutoChange(v)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                bruto === v
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 bg-stone-50 text-stone-600 hover:border-brand/40 hover:bg-brand-light hover:text-brand-dark dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {v >= 1_000
                ? `${(v / 1_000).toFixed(1).replace(".0", "")}k€`
                : `${v}€`}
            </button>
          ))}
          <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 dark:border-stone-700 dark:bg-stone-800">
            <span className="text-sm text-stone-400">€</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={50}
              value={brutoInput}
              onChange={(e) => onBrutoInputChange(e.target.value)}
              onBlur={() => onBrutoChange(parseFloat(brutoInput) || bruto)}
              placeholder="outro"
              className="w-20 bg-transparent py-2 text-sm font-semibold text-stone-700 outline-none dark:text-stone-200"
            />
          </div>
        </div>
      </div>

      {/* Frequência */}
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Recibos por mês
          </label>
          <InfoTip>
            Determina a faturação anual. Se emites um recibo grande por mês,
            escolhe 1. Se tens vários clientes pequenos, escolhe mais.
          </InfoTip>
        </div>
        <div className="flex gap-2">
          {PRESETS_RECIBOS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={recibosAno === r}
              onClick={() => onRecibosAnoChange(r)}
              className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${
                recibosAno === r
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-stone-400">
          {fmt(brutoAnual)} / ano estimados
        </p>
      </div>

      {/* IVA */}
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Situação de IVA
          </span>
          <InfoTip>
            Com faturação abaixo de €15.000/ano estás isento de IVA (Art. 53.º
            CIVA). Acima disso, deves cobrar IVA ao cliente.
          </InfoTip>
        </div>
        <ZonaIVA
          brutoAnual={brutoAnual}
          regimeIVA={regimeIVA}
          regiao={regiao}
          tipoAtiv={tipoAtiv}
          onRegimeIVAChange={onRegimeIVAChange}
        />
      </div>

      {/* Região */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Região fiscal
          </span>
          <InfoTip>
            Determina as taxas de IVA (Art. 18.º CIVA). Continente, Madeira e
            Açores têm escalões distintos.
          </InfoTip>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["continente", "madeira", "acores"] as Regiao[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={regiao === r}
              onClick={() => onRegiaoChange(r)}
              className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                regiao === r
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {
                {
                  continente: "Continente",
                  madeira: "Madeira",
                  acores: "Açores",
                }[r]
              }
            </button>
          ))}
        </div>
        {regimeIVA !== "isento" && (
          <p className="mt-1.5 text-[11px] text-stone-400">
            IVA normal nesta região: {pct(taxasIVA.normal)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Passo 3: Situação ────────────────────────────────────────────────────────

function PassoSituacao({
  acumulaEmprego,
  setAcumulaEmprego,
  isencaoSSPrimeiroAno,
  setIsencaoSSPrimeiroAno,
  irsJovemOn,
  setIrsJovemOn,
  irsJovemAno,
  setIrsJovemAno,
  ifici,
  setIfici,
  deficiencia,
  setDeficiencia,
  mostrarDeducoes,
  setMostrarDeducoes,
  despSaude,
  setDespSaude,
  despEducacao,
  setDespEducacao,
  despRendas,
  setDespRendas,
  despGerais,
  setDespGerais,
  ssAnualPoupanca,
}: {
  acumulaEmprego: boolean;
  setAcumulaEmprego: (v: boolean) => void;
  isencaoSSPrimeiroAno: boolean;
  setIsencaoSSPrimeiroAno: (v: boolean) => void;
  irsJovemOn: boolean;
  setIrsJovemOn: (v: boolean) => void;
  irsJovemAno: number;
  setIrsJovemAno: (v: number) => void;
  ifici: boolean;
  setIfici: (v: boolean) => void;
  deficiencia: boolean;
  setDeficiencia: (v: boolean) => void;
  mostrarDeducoes: boolean;
  setMostrarDeducoes: (v: boolean) => void;
  despSaude: number;
  setDespSaude: (v: number) => void;
  despEducacao: number;
  setDespEducacao: (v: number) => void;
  despRendas: number;
  setDespRendas: (v: number) => void;
  despGerais: number;
  setDespGerais: (v: number) => void;
  ssAnualPoupanca: number;
}) {
  const isencaoSS = isencaoSSPrimeiroAno || acumulaEmprego;
  const deducoesTotal =
    despSaude * 0.15 +
    despEducacao * 0.3 +
    despRendas * 0.15 +
    despGerais * 0.35;
  const ificiJovemConflito = ifici && irsJovemOn;

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          A tua situação
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Alguns fatores podem reduzir significativamente o teu imposto.
          Responde ao que se aplica ao teu caso.
        </p>
      </div>

      <div className="space-y-3">
        {/* Emprego por conta de outrem */}
        <ToggleCard
          titulo="Já trabalhas por conta de outrem?"
          descricao="Se tens um contrato de trabalho com SS ≥ €537/mês, podes ficar isento de SS como independente."
          ativo={acumulaEmprego}
          onToggle={() => {
            if (!acumulaEmprego) setIsencaoSSPrimeiroAno(false);
            setAcumulaEmprego(!acumulaEmprego);
          }}
          badge={
            isencaoSS && acumulaEmprego && ssAnualPoupanca > 0
              ? `Poupa ${fmt(Math.round(ssAnualPoupanca))}/ano em SS`
              : undefined
          }
          badgeTipo="positivo"
        >
          <div className="mt-2 space-y-1 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-start gap-2">
              <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
              <span>SS do emprego ≥ €537/mês (1×IAS)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
              <span>Rendimento como TI &lt; €2.149/mês em média</span>
            </div>
          </div>
        </ToggleCard>

        {/* 1.º ano */}
        <ToggleCard
          titulo="É o teu 1.º ano como independente?"
          descricao="No primeiro ano de atividade, estás automaticamente isento de Segurança Social durante 12 meses."
          ativo={isencaoSSPrimeiroAno}
          onToggle={() => {
            if (!isencaoSSPrimeiroAno) setAcumulaEmprego(false);
            setIsencaoSSPrimeiroAno(!isencaoSSPrimeiroAno);
          }}
          desativado={acumulaEmprego}
          desativadoMensagem="Já tens isenção por acumulação com emprego"
          badge={
            isencaoSS && isencaoSSPrimeiroAno && ssAnualPoupanca > 0
              ? `Poupa ${fmt(Math.round(ssAnualPoupanca))}/ano em SS`
              : undefined
          }
          badgeTipo="positivo"
        >
          <div className="mt-2 space-y-1 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-start gap-2">
              <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
              <span>Automático — não precisas de pedir</span>
            </div>
            <div className="flex items-start gap-2">
              <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
              <span>
                Só se nunca tiveste atividade independente nos últimos 3 anos
              </span>
            </div>
          </div>
        </ToggleCard>

        {/* IRS Jovem */}
        <ToggleCard
          titulo="Tens menos de 35 anos?"
          descricao="O IRS Jovem isenta uma parte crescente do teu rendimento durante até 10 anos de atividade."
          ativo={irsJovemOn}
          onToggle={() => {
            if (!irsJovemOn && ifici) setIfici(false);
            setIrsJovemOn(!irsJovemOn);
          }}
          desativado={ifici}
          desativadoMensagem="Incompatível com IFICI/NHR 2.0"
          badge={
            irsJovemOn
              ? `Isenção ${pct(IRS_JOVEM_ISENCAO[irsJovemAno] ?? 0)} — ${irsJovemAno}.º ano`
              : undefined
          }
          badgeTipo="positivo"
        >
          {irsJovemOn && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
                Em que ano de benefício estás?
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((ano) => (
                  <button
                    key={ano}
                    type="button"
                    aria-pressed={irsJovemAno === ano}
                    onClick={() => setIrsJovemAno(ano)}
                    className={`rounded-lg border py-1.5 text-center text-xs font-bold transition-all ${
                      irsJovemAno === ano
                        ? "border-brand bg-brand text-white"
                        : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800"
                    }`}
                  >
                    {ano}.º
                    <div className="text-[9px] font-normal">
                      {((IRS_JOVEM_ISENCAO[ano] ?? 0) * 100).toFixed(0)}%
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-stone-400">
                1.º ano: 100% isento · Anos 2–4: 75% · Anos 5–7: 50% · Anos
                8–10: 25%
              </p>
            </div>
          )}
        </ToggleCard>

        {/* IFICI / NHR 2.0 */}
        <ToggleCard
          titulo="Tens estatuto IFICI / NHR 2.0?"
          descricao="Regime fiscal para residentes não habituais (Art. 58.º-A EBF). Taxa flat de 20% sobre rendimentos Cat. B elegíveis."
          ativo={ifici}
          onToggle={() => {
            if (!ifici && irsJovemOn) setIrsJovemOn(false);
            setIfici(!ifici);
          }}
          desativado={irsJovemOn}
          desativadoMensagem="Incompatível com IRS Jovem — desativa primeiro"
          badge={ifici ? "Taxa flat 20%" : undefined}
          badgeTipo="neutro"
        >
          <div className="mt-2 space-y-1 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-start gap-2">
              <Warning
                size={11}
                className="mt-0.5 flex-shrink-0 text-alert-text"
              />
              <span>
                Exige estatuto aprovado pela AT e não ter sido residente nos
                últimos 5 anos
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Warning
                size={11}
                className="mt-0.5 flex-shrink-0 text-alert-text"
              />
              <span>Incompatível com IRS Jovem — escolhe um dos dois</span>
            </div>
          </div>
        </ToggleCard>

        {/* Deficiência */}
        <ToggleCard
          titulo="Tens deficiência permanente ≥ 60%?"
          descricao="Art. 56.º-A + Art. 87.º CIRS: exclusão de 15% do rendimento Cat. B (máx €2.500) e dedução adicional à coleta de €2.148."
          ativo={deficiencia}
          onToggle={() => setDeficiencia(!deficiencia)}
          badge={deficiencia ? "Exclusão 15% + ded. €2.148" : undefined}
          badgeTipo="positivo"
        />

        {/* Deduções ao IRS */}
        <div
          className={`rounded-2xl border transition-all ${mostrarDeducoes ? "border-brand bg-brand-light/30" : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900/60"}`}
        >
          <button
            type="button"
            aria-expanded={mostrarDeducoes}
            onClick={() => setMostrarDeducoes(!mostrarDeducoes)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <div>
              <div
                className={`text-sm font-semibold ${mostrarDeducoes ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}
              >
                Tens despesas que abatam ao IRS?
              </div>
              <p
                className={`mt-0.5 text-xs ${mostrarDeducoes ? "text-brand" : "text-stone-400"}`}
              >
                Saúde, educação, rendas, despesas gerais — opcional
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {deducoesTotal > 0 && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                  −{fmt(Math.round(deducoesTotal))}
                </span>
              )}
              <ChevronDown
                size={14}
                className={`flex-shrink-0 text-stone-400 transition-transform ${mostrarDeducoes ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          <AnimatePresence>
            {mostrarDeducoes && (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4">
                  {[
                    {
                      label: "Saúde",
                      sublabel: "ded. 15%",
                      val: despSaude,
                      set: setDespSaude,
                      max: 6_670,
                    },
                    {
                      label: "Educação",
                      sublabel: "ded. 30%",
                      val: despEducacao,
                      set: setDespEducacao,
                      max: 2_667,
                    },
                    {
                      label: "Rendas",
                      sublabel: "ded. 15%",
                      val: despRendas,
                      set: setDespRendas,
                      max: 3_347,
                    },
                    {
                      label: "Gerais",
                      sublabel: "ded. 35%",
                      val: despGerais,
                      set: setDespGerais,
                      max: 714,
                    },
                  ].map(({ label, sublabel, val, set, max }) => (
                    <div key={label}>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        {label}
                        <span className="ml-1 font-normal normal-case text-stone-400">
                          ({sublabel})
                        </span>
                      </label>
                      <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 dark:border-stone-700 dark:bg-stone-900">
                        <span className="text-xs text-stone-400">€</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={max}
                          step={50}
                          value={val || ""}
                          onChange={(e) => set(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full bg-transparent py-2 text-sm font-semibold text-stone-700 outline-none dark:text-stone-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Resultado final ──────────────────────────────────────────────────────────

// Inline decisor ato isolado (sem dependência externa)
type DecisaoId =
  | "ATO_ISOLADO"
  | "ABRIR_ATIVIDADE"
  | "RECIBO_VERDE"
  | "CONSIDERAR";

const DECISOR_PERGUNTAS = [
  {
    id: "q1",
    texto: "Quantas vezes vais faturar este ano?",
    opcoes: [
      {
        id: "uma",
        texto: "Apenas uma vez",
        proximo: "q2" as string | null,
        decisao: null as DecisaoId | null,
      },
      {
        id: "multi",
        texto: "Mais do que uma vez",
        proximo: null,
        decisao: "ABRIR_ATIVIDADE" as DecisaoId,
      },
    ],
  },
  {
    id: "q2",
    texto: "Esta situação vai repetir-se no futuro?",
    opcoes: [
      {
        id: "nao",
        texto: "Não, é mesmo pontual",
        proximo: "q3" as string | null,
        decisao: null as DecisaoId | null,
      },
      {
        id: "sim",
        texto: "Sim, vai repetir-se",
        proximo: null,
        decisao: "ABRIR_ATIVIDADE" as DecisaoId,
      },
    ],
  },
  {
    id: "q3",
    texto: "Já tens atividade aberta nas Finanças?",
    opcoes: [
      {
        id: "sim",
        texto: "Sim, já tenho atividade",
        proximo: null as string | null,
        decisao: "RECIBO_VERDE" as DecisaoId,
      },
      {
        id: "nao",
        texto: "Não, não tenho",
        proximo: "q4",
        decisao: null as DecisaoId | null,
      },
    ],
  },
  {
    id: "q4",
    texto: "É um serviço realmente único e inesperado?",
    opcoes: [
      {
        id: "sim",
        texto: "Sim, não prevejo repetir",
        proximo: null as string | null,
        decisao: "ATO_ISOLADO" as DecisaoId,
      },
      {
        id: "talvez",
        texto: "Talvez se repita",
        proximo: null,
        decisao: "CONSIDERAR" as DecisaoId,
      },
    ],
  },
];

const DECISAO_TEXTOS: Record<
  DecisaoId,
  { titulo: string; desc: string; badge: string }
> = {
  ATO_ISOLADO: {
    titulo: "Ato isolado",
    badge: "Recomendado",
    desc: "Fatura sem abrir atividade no Portal das Finanças. Pagas IVA (23%) e só usas uma vez por ano.",
  },
  ABRIR_ATIVIDADE: {
    titulo: "Abre atividade",
    badge: "Recomendado",
    desc: "Vais faturar regularmente. Abertura gratuita e imediata online. 1.º ano isento de SS.",
  },
  RECIBO_VERDE: {
    titulo: "Recibo verde normal",
    badge: "Já estás preparado",
    desc: "Já tens atividade — emite diretamente com as regras habituais de retenção e IVA.",
  },
  CONSIDERAR: {
    titulo: "Considera abrir atividade",
    badge: "Pensa bem",
    desc: "Se pode repetir-se, é mais seguro abrir já. A abertura é gratuita e imediata online.",
  },
};

function DecisorAtoIsoladoInline() {
  const [perguntaId, setPerguntaId] = useState("q1");
  const [decisao, setDecisao] = useState<DecisaoId | null>(null);
  const [historico, setHistorico] = useState<string[]>([]);

  const pergunta = DECISOR_PERGUNTAS.find((p) => p.id === perguntaId);

  function escolher(opcao: (typeof DECISOR_PERGUNTAS)[0]["opcoes"][0]) {
    if (opcao.decisao) {
      setDecisao(opcao.decisao);
    } else if (opcao.proximo) {
      setHistorico((h) => [...h, perguntaId]);
      setPerguntaId(opcao.proximo);
    }
  }

  function reiniciar() {
    setPerguntaId("q1");
    setDecisao(null);
    setHistorico([]);
  }
  function voltar() {
    if (!historico.length) return;
    setPerguntaId(historico[historico.length - 1]);
    setHistorico((h) => h.slice(0, -1));
    setDecisao(null);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/60">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
        Precisas mesmo de abrir atividade?
      </p>
      {decisao ? (
        <div>
          <span className="mb-1.5 inline-block rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
            {DECISAO_TEXTOS[decisao].badge}
          </span>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            {DECISAO_TEXTOS[decisao].titulo}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {DECISAO_TEXTOS[decisao].desc}
          </p>
          <button
            type="button"
            onClick={reiniciar}
            className="mt-2.5 text-xs font-medium text-brand hover:text-brand-dark transition-colors"
          >
            ← Recomeçar decisor
          </button>
        </div>
      ) : pergunta ? (
        <div>
          <p className="mb-2 text-xs text-stone-400">
            Pergunta {historico.length + 1} de {DECISOR_PERGUNTAS.length}
          </p>
          <p className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100">
            {pergunta.texto}
          </p>
          <div className="flex flex-col gap-1.5">
            {pergunta.opcoes.map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                onClick={() => escolher(opcao)}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-stone-700 transition-all hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                {opcao.texto}
                <ArrowRight size={12} className="flex-shrink-0 opacity-40" />
              </button>
            ))}
          </div>
          {historico.length > 0 && (
            <button
              type="button"
              onClick={voltar}
              className="mt-2 text-[11px] text-stone-400 hover:text-stone-600 transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ResultadoFinal({
  brutoAnual,
  liquidoAnual,
  irsAnual,
  ssAnual,
  ivaAnual,
  recibosAno,
  resultRecibo,
  card,
  regiao,
  tipoAtiv,
  isencaoSS,
  irsJovemAno,
  ifici,
  deficiencia,
  despSaude,
  despEducacao,
  despGerais,
  despRendas,
  onIrParaSimuladorCompleto,
  onRecomecar,
}: {
  brutoAnual: number;
  liquidoAnual: number;
  irsAnual: number;
  ssAnual: number;
  ivaAnual: number;
  recibosAno: number;
  resultRecibo: {
    liquido: number;
    retencaoIRS: number;
    segSocial: number;
    iva: number;
    bruto: number;
  };
  card: CardAtiv;
  regiao: Regiao;
  tipoAtiv: TipoAtiv;
  isencaoSS: boolean;
  irsJovemAno: number;
  ifici: boolean;
  deficiencia: boolean;
  despSaude: number;
  despEducacao: number;
  despGerais: number;
  despRendas: number;
  onIrParaSimuladorCompleto: () => void;
  onRecomecar: () => void;
}) {
  // Cálculo anual completo via simularIRSAnual para regime simplificado detalhado
  const simAnual = useMemo(
    () =>
      simularIRSAnual({
        brutoAnual,
        tipo: card.tipoFiscal,
        irsJovemAno: irsJovemAno > 0 ? irsJovemAno : undefined,
        ifici,
        deficiencia,
        deducoes: {
          saude: despSaude,
          educacao: despEducacao,
          gerais: despGerais,
          rendas: despRendas,
        },
      }),
    [
      brutoAnual,
      card.tipoFiscal,
      irsJovemAno,
      isencaoSS,
      ifici,
      deficiencia,
      despSaude,
      despEducacao,
      despGerais,
      despRendas,
    ],
  );

  const taxaEfetiva =
    brutoAnual > 0 ? (simAnual.irsEstimado + ssAnual) / brutoAnual : 0;
  const liquidoFinal = brutoAnual - simAnual.irsEstimado - ssAnual;

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          O teu resultado
        </h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Estimativa para {recibosAno} recibo{recibosAno > 1 ? "s" : ""}/mês com
          a tua configuração.
        </p>
      </div>

      {/* Líquido anual — destaque */}
      <div className="mb-6 rounded-3xl border border-brand/20 bg-brand-light/40 p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-dark/60">
          Líquido anual estimado
        </div>
        <div className="mt-1 font-display text-5xl font-bold text-brand">
          <AnimatedNumber value={Math.max(0, liquidoFinal)} />
        </div>
        <div className="mt-1 text-sm text-brand-dark/60">
          de {fmt(brutoAnual)} faturados ·{" "}
          <span className="font-semibold">
            {fmt(Math.round(liquidoFinal / 12))}/mês
          </span>
        </div>
      </div>

      {/* Regime simplificado — breakdown coeficiente */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Regime simplificado — como chegámos ao IRS
          </p>
        </div>
        {[
          { label: "Faturação bruta", val: brutoAnual, cor: "", note: null },
          {
            label: `Rendimento coletável (coef. ${pct(simAnual.coeficiente)})`,
            val: simAnual.rendimentoCoeficiente,
            cor: "text-stone-600 dark:text-stone-300",
            note: `${pct(simAnual.coeficiente)} × ${fmt(brutoAnual)}`,
          },
          ...(simAnual.exclusaoDeficiencia > 0
            ? [
                {
                  label: "Exclusão deficiência (Art. 56.º-A)",
                  val: -simAnual.exclusaoDeficiencia,
                  cor: "text-brand dark:text-brand",
                  note: "15% do rendimento Cat. B",
                },
              ]
            : []),
          {
            label: "SS deduzida ao tributável",
            val: -ssAnual,
            cor: "text-amber-600 dark:text-amber-400",
            note: null,
          },
          ...(simAnual.isencaoJovem > 0
            ? [
                {
                  label: `IRS Jovem (isenção ${pct(simAnual.isencaoJovem)})`,
                  val: -simAnual.rendimentoIsentoJovem,
                  cor: "text-brand dark:text-brand",
                  note: null,
                },
              ]
            : []),
          {
            label: ifici
              ? "Rendimento tributável (IFICI 20%)"
              : "Rendimento tributável",
            val: simAnual.rendimentoTributavel,
            cor: "text-stone-700 dark:text-stone-200",
            note: "base do IRS",
          },
          {
            label: simAnual.ificiAplicado
              ? `IRS estimado (taxa flat ${pct(0.2)})`
              : "IRS estimado (escalões progressivos)",
            val: -simAnual.irsEstimado,
            cor: "text-red-500 dark:text-red-400",
            note: null,
          },
          ...(simAnual.deducaoDespesas > 0 || simAnual.deducaoDeficiencia > 0
            ? [
                {
                  label: "Deduções à coleta",
                  val: -(
                    simAnual.deducaoDespesas + simAnual.deducaoDeficiencia
                  ),
                  cor: "text-brand dark:text-brand",
                  note: "saúde, educação, deficiência…",
                },
              ]
            : []),
        ].map(({ label, val, cor, note }, i, arr) => (
          <div
            key={label}
            className={`flex items-center justify-between gap-2 px-4 py-2.5 ${i < arr.length - 1 ? "border-b border-stone-100 dark:border-stone-800" : ""}`}
          >
            <div className="min-w-0">
              <span className="text-xs text-stone-600 dark:text-stone-400">
                {label}
              </span>
              {note && (
                <span className="ml-1.5 text-[10px] text-stone-400">
                  ({note})
                </span>
              )}
            </div>
            <span
              className={`flex-shrink-0 text-xs font-semibold tabular-nums ${cor || (val < 0 ? "text-red-500" : "text-stone-800 dark:text-stone-100")}`}
            >
              {val < 0 ? "−" : ""}
              {fmt(Math.abs(val))}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between bg-stone-50 px-4 py-3 dark:bg-stone-800/50">
          <div>
            <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
              Líquido disponível
            </span>
            <span className="ml-2 text-xs text-stone-400">
              Taxa efectiva {pct(taxaEfetiva)}
            </span>
          </div>
          <span className="font-display text-lg font-bold text-brand">
            <AnimatedNumber value={Math.max(0, liquidoFinal)} />
          </span>
        </div>
      </div>

      {/* Breakdown visual */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Como se distribui cada euro faturado
        </p>
        <EuroBreakdown
          faturacao={brutoAnual}
          liquido={Math.max(0, liquidoFinal)}
          irs={simAnual.irsEstimado}
          ss={ssAnual}
          iva={ivaAnual}
        />
      </div>

      {/* Decisor ato isolado */}
      <div className="mb-6">
        <DecisorAtoIsoladoInline />
      </div>

      {/* Aviso */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg px-4 py-3">
        <Warning size={13} className="mt-0.5 flex-shrink-0 text-alert-text" />
        <p className="text-xs leading-relaxed text-alert-text">
          Estimativa informativa. IRS e SS são adiantamentos — o apuramento
          final depende da tua declaração de rendimentos. Verifica com o teu
          contabilista.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onIrParaSimuladorCompleto}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-float"
        >
          Simulador completo
          <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={onRecomecar}
          className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-600 transition-all hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          Recomeçar
        </button>
      </div>
    </div>
  );
}

// ─── Painel lateral ao vivo ───────────────────────────────────────────────────

function PainelResultadoVivo({
  brutoAnual,
  liquidoAnual,
  irsAnual,
  ssAnual,
  ivaAnual,
  recibosAno,
  tipoAtiv,
}: {
  brutoAnual: number;
  liquidoAnual: number;
  irsAnual: number;
  ssAnual: number;
  ivaAnual: number;
  recibosAno: number;
  tipoAtiv: TipoAtiv | null;
}) {
  if (!tipoAtiv) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5 text-center dark:border-stone-700 dark:bg-stone-900/60">
        <p className="text-xs text-stone-400">
          Seleciona a tua atividade para ver o resultado ao vivo
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
        Resultado ao vivo
      </p>

      {/* Líquido mensal */}
      <div className="mb-4">
        <div className="text-[11px] font-medium text-stone-400">
          Líquido mensal
        </div>
        <div className="font-display text-3xl font-bold text-brand">
          <AnimatedNumber value={Math.max(0, Math.round(liquidoAnual / 12))} />
        </div>
        <div className="text-[11px] text-stone-400">
          {fmt(brutoAnual > 0 ? Math.round(brutoAnual / recibosAno) : 0)}/recibo
          faturado
        </div>
      </div>

      {/* Mini breakdown */}
      <div className="mb-4 space-y-1.5">
        {[
          {
            label: "Faturação anual",
            val: brutoAnual,
            cor: "text-stone-700 dark:text-stone-200",
          },
          {
            label: "IRS (retenção)",
            val: -irsAnual,
            cor: "text-red-500 dark:text-red-400",
          },
          {
            label: "Seg. Social",
            val: -ssAnual,
            cor: "text-amber-600 dark:text-amber-400",
          },
          ...(ivaAnual > 0
            ? [{ label: "IVA", val: -ivaAnual, cor: "text-stone-400" }]
            : []),
          {
            label: "Líquido anual",
            val: Math.max(0, liquidoAnual),
            cor: "text-brand font-bold",
          },
        ].map(({ label, val, cor }, i, arr) => (
          <div
            key={label}
            className={`flex items-center justify-between ${i === arr.length - 1 ? "border-t border-stone-100 pt-1.5 dark:border-stone-800" : ""}`}
          >
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {label}
            </span>
            <span className={`text-[11px] tabular-nums ${cor}`}>
              {val < 0 ? "−" : ""}
              {fmt(Math.abs(val))}
            </span>
          </div>
        ))}
      </div>

      {/* Mini bars */}
      {brutoAnual > 0 && (
        <EuroBreakdown
          faturacao={brutoAnual}
          liquido={Math.max(0, liquidoAnual)}
          irs={irsAnual}
          ss={ssAnual}
          iva={ivaAnual}
          className="mt-3"
          compact
        />
      )}
    </div>
  );
}

// ─── Zona IVA inline ──────────────────────────────────────────────────────────

function ZonaIVA({
  brutoAnual,
  regimeIVA,
  regiao,
  tipoAtiv,
  onRegimeIVAChange,
}: {
  brutoAnual: number;
  regimeIVA: RegimeIVA;
  regiao: Regiao;
  tipoAtiv: TipoAtiv;
  onRegimeIVAChange: (r: RegimeIVA) => void;
}) {
  const taxasIVA = IVA_TAXAS[regiao].value;
  const ivaEsperado = ATIV_META[tipoAtiv].ivaEsperado;
  // Aviso quando a taxa escolhida é incomum para o tipo de atividade
  const ivaIncoerente = regimeIVA !== "isento" && regimeIVA !== ivaEsperado;

  function BotoesIVA({ cor }: { cor: "amber" | "red" }) {
    const base =
      cor === "amber"
        ? {
            sel: "border-amber-600 bg-amber-100 text-amber-800",
            def: "border-amber-300 bg-white/60 text-alert-text hover:border-amber-500",
          }
        : {
            sel: "border-red-600 bg-red-100 text-red-800",
            def: "border-red-300 bg-white/60 text-red-700 hover:border-red-500 dark:border-red-800 dark:bg-transparent",
          };
    return (
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {(["reduzida", "intermedia", "normal"] as const).map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={regimeIVA === e}
            onClick={() => onRegimeIVAChange(e)}
            className={`rounded-lg border p-2 text-center text-[10px] font-bold transition-all ${regimeIVA === e ? base.sel : base.def}`}
          >
            {e === "reduzida"
              ? "Reduzida"
              : e === "intermedia"
                ? "Intermédia"
                : "Normal"}
            <br />
            {pct(taxasIVA[e])}
          </button>
        ))}
      </div>
    );
  }

  function PainelCompatibilidade() {
    const meta =
      IVA_META[regimeIVA as keyof typeof IVA_META] ?? IVA_META.normal;
    return (
      <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 dark:border-stone-700 dark:bg-stone-900/60">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
          {meta.titulo}
        </p>
        <p className="mb-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          {meta.quando}
        </p>
        <div className="space-y-1">
          <div className="flex items-start gap-1.5">
            <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
            <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              <strong className="text-stone-700 dark:text-stone-200">
                Compatível com:
              </strong>{" "}
              {meta.compativel}
            </p>
          </div>
          {meta.incompativel && (
            <div className="flex items-start gap-1.5">
              <Warning
                size={11}
                className="mt-0.5 flex-shrink-0 text-alert-text"
              />
              <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                <strong className="text-stone-700 dark:text-stone-200">
                  Incompatível com:
                </strong>{" "}
                {meta.incompativel}
              </p>
            </div>
          )}
        </div>
        {ivaIncoerente && (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-alert-border bg-alert-bg px-2.5 py-2">
            <Warning
              size={11}
              className="mt-0.5 flex-shrink-0 text-alert-text"
            />
            <p className="text-[11px] leading-relaxed text-alert-text">
              O regime de IVA selecionado (
              {regimeIVA === "reduzida" ? "taxa reduzida" : "taxa intermédia"})
              pode não ser o habitual para a tua atividade. Confirma com o teu
              contabilista.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (brutoAnual <= IVA_LIMITE) {
    return (
      <div className="space-y-0">
        <div className="flex items-start gap-2.5 rounded-xl border border-brand/30 bg-brand-light/60 p-3.5">
          <Check size={14} className="mt-0.5 flex-shrink-0 text-brand" />
          <div>
            <span className="text-sm font-bold text-brand-dark">
              Estás isento de IVA
            </span>
            <p className="mt-0.5 text-xs leading-relaxed text-brand-dark/70">
              Com {fmt(brutoAnual)}/ano estás abaixo de {fmt(IVA_LIMITE)} — Art.
              53.º CIVA. Não cobras IVA nem o entregas ao Estado.
            </p>
          </div>
        </div>
        <PainelCompatibilidade />
      </div>
    );
  }

  if (brutoAnual <= IVA_LIMITE_IMEDIATO) {
    return (
      <div className="space-y-0">
        <div className="rounded-xl border border-alert-border bg-alert-bg p-3.5">
          <div className="flex items-start gap-2.5">
            <Warning
              size={14}
              className="mt-0.5 flex-shrink-0 text-alert-text"
            />
            <div className="flex-1">
              <span className="text-sm font-bold text-alert-text">
                Vais perder a isenção em janeiro
              </span>
              <p className="mt-0.5 text-xs leading-relaxed text-alert-text">
                Com {fmt(brutoAnual)}/ano entre {fmt(IVA_LIMITE)} e{" "}
                {fmt(IVA_LIMITE_IMEDIATO)}, perdes a isenção no 1 de janeiro do
                ano seguinte.
              </p>
              <p className="mt-2 text-xs font-semibold text-alert-text">
                Que taxa de IVA vais cobrar?
              </p>
              <BotoesIVA cor="amber" />
            </div>
          </div>
        </div>
        {regimeIVA !== "isento" && <PainelCompatibilidade />}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 dark:border-red-900/50 dark:bg-red-950/20">
        <div className="flex items-start gap-2.5">
          <Warning
            size={14}
            className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400"
          />
          <div className="flex-1">
            <span className="text-sm font-bold text-red-700 dark:text-red-300">
              Perdes a isenção imediatamente
            </span>
            <p className="mt-0.5 text-xs leading-relaxed text-red-700 dark:text-red-300">
              Com {fmt(brutoAnual)}/ano ultrapassaste {fmt(IVA_LIMITE_IMEDIATO)}
              . Deves contactar o teu contabilista com urgência.
            </p>
            <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">
              Que taxa de IVA cobras?
            </p>
            <BotoesIVA cor="red" />
          </div>
        </div>
      </div>
      {regimeIVA !== "isento" && <PainelCompatibilidade />}
    </div>
  );
}

// ─── Toggle card ──────────────────────────────────────────────────────────────

function ToggleCard({
  titulo,
  descricao,
  ativo,
  onToggle,
  badge,
  badgeTipo,
  desativado,
  desativadoMensagem,
  children,
}: {
  titulo: string;
  descricao: string;
  ativo: boolean;
  onToggle: () => void;
  badge?: string;
  badgeTipo?: "positivo" | "neutro";
  desativado?: boolean;
  desativadoMensagem?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        desativado
          ? "border-stone-100 bg-stone-50 opacity-60 dark:border-stone-800 dark:bg-stone-900/40"
          : ativo
            ? "border-brand bg-brand-light/40"
            : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900/60"
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        disabled={desativado}
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div
            className={`text-sm font-semibold ${ativo ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}
          >
            {titulo}
          </div>
          <p
            className={`mt-0.5 text-xs leading-relaxed ${ativo ? "text-brand-dark/70" : "text-stone-400 dark:text-stone-500"}`}
          >
            {desativado ? desativadoMensagem : descricao}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {badge && !desativado && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
              {badge}
            </span>
          )}
          <span
            className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${ativo && !desativado ? "bg-brand" : "bg-stone-200 dark:bg-stone-700"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${ativo && !desativado ? "left-[1.125rem]" : "left-0.5"}`}
            />
          </span>
        </div>
      </button>
      {ativo && !desativado && children && (
        <div className="mt-2">{children}</div>
      )}
    </div>
  );
}
