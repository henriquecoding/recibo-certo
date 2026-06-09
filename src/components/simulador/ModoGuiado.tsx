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
  Swap,
  Calendar,
  Clock,
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
import { gerarPrazos, diasAte, META_CATEGORIA } from "@/lib/prazos";

// ─── Constantes ───────────────────────────────────────────────────────────────

const IVA_LIMITE = 15_000;
const IVA_LIMITE_IMEDIATO = 18_750;
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
// Passo 0 = decisor; passos 1-3 = wizard; resultado = final
type Passo = 0 | 1 | 2 | 3 | "resultado";

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

const CARDS_ATIV: CardAtiv[] = [
  {
    id: "art151",
    titulo: "Profissão liberal",
    sub: "Serviços técnicos e liberais (Art. 151.º CIRS)",
    exemplos: "Dev, designer, arquiteto, advogado, solicitador, médico, psicólogo, nutricionista, enfermeiro, engenheiro, consultor, gestor, contabilista, jornalista, ator, músico, professor…",
    coef: 0.75,
    ret: 0.23,
    baseSS: "servicos",
    tipoFiscal: "art151",
    Icon: Laptop,
  },
  {
    id: "vendas",
    titulo: "Vendo produtos",
    sub: "Comércio, produção e revenda",
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
    sub: "Alojamento local, hotel, restauração",
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
    sub: "Serviços fora do Art. 151.º",
    exemplos: "Explicações, motorista, jardinagem…",
    coef: 0.35,
    ret: 0.115,
    baseSS: "servicos",
    tipoFiscal: "outros",
    Icon: Briefcase,
  },
  {
    id: "prop_int",
    titulo: "Direitos de autor / Royalties",
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

// ─── Tipos e constantes para o novo PassoFaturacao ────────────────────────────

interface ReciboItem {
  id: number;
  descricao: string;
  valorComIva: string;
  taxaIva: number;
}

const IVA_OPCOES_FAT = [
  { taxa: 0, curto: "Isento", longo: "0%" },
  { taxa: 0.06, curto: "Reduzida", longo: "6%" },
  { taxa: 0.13, curto: "Intermédia", longo: "13%" },
  { taxa: 0.23, curto: "Normal", longo: "23%" },
] as const;

const MESES_OPCOES_FAT = [1, 2, 3, 4, 6, 8, 10, 12] as const;

function parseMontante(s: string): number {
  return parseFloat(String(s).replace(",", ".").replace(/\s/g, "")) || 0;
}

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
      "Profissões da tabela da Portaria 1011/2001. Coef. 0,75 · Ret. 23% · SS sobre 70%.",
    ivaEsperado: "normal",
    nota: "15% do rendimento bruto deve ser justificado com despesas (regra dos 15%).",
  },
  vendas: {
    descricao:
      "Comércio, produção e revenda. Coef. 0,15 porque as margens brutas são reduzidas. SS sobre 20%.",
    ivaEsperado: "normal",
    nota: null,
  },
  hosped: {
    descricao:
      "Alojamento local em moradia/apartamento. Coef. 0,35. Sem retenção. SS sobre 20%.",
    ivaEsperado: "reduzida",
    nota: null,
  },
  outras: {
    descricao:
      "Serviços Cat. B não listados no Art. 151.º. Coef. 0,35 · Ret. 11,5% · SS sobre 70%.",
    ivaEsperado: "normal",
    nota: null,
  },
  prop_int: {
    descricao:
      "Direitos de autor e royalties. Coef. 0,75 · Ret. 16,5% · SS sobre 70%.",
    ivaEsperado: "isento",
    nota: "Podem beneficiar de 50% de exclusão (Art. 50.º-A CIRS) se obra original.",
  },
};

const IVA_META = {
  isento: {
    titulo: "Regime de isenção — Art. 53.º CIVA",
    quando: "Não cobras IVA ao cliente nem entregas ao Estado.",
  },
  reduzida: {
    titulo: "Taxa reduzida",
    quando: "Aplica-se a bens essenciais e alguns serviços específicos.",
  },
  intermedia: {
    titulo: "Taxa intermédia",
    quando:
      "Aplica-se a determinados bens agrícolas e serviços de restauração.",
  },
  normal: {
    titulo: "Taxa normal",
    quando: "Aplica-se à generalidade dos bens e serviços.",
  },
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ModoGuiado({
  onIrParaSimuladorCompleto,
}: ModoGuiadoProps) {
  // Navegação — começa no pré-passo (decisor)
  const [passo, setPasso] = useState<Passo>(0);

  // Passo 1: Atividade
  const [tipoAtiv, setTipoAtiv] = useState<TipoAtiv>("art151");
  const [atividadeEspecifica, setAtividadeEspecifica] =
    useState<Atividade | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(false);
  const [mostrarDetalheAtiv, setMostrarDetalheAtiv] = useState(false);

  // Passo 2: Faturação — novo modelo recibos
  const [modoFat, setModoFat] = useState<"total" | "individual">("total");
  const [totalInput, setTotalInput] = useState("1500");
  // Como interpretar o valor introduzido no modo "total": já inclui IVA (o que o
  // cliente paga) ou é a faturação base à qual o IVA é acrescentado.
  const [valorComIva, setValorComIva] = useState(true);
  const [recibosItems, setRecibosItems] = useState<ReciboItem[]>([
    { id: 1, descricao: "", valorComIva: "", taxaIva: 0.23 },
  ]);
  const [mesesFat, setMesesFat] = useState(12);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [regimeIVA, setRegimeIVA] = useState<RegimeIVA>("isento");

  // Taxa de IVA derivada do regime — única fonte de verdade para extracção do IVA
  const totalIva = (() => {
    if (regimeIVA === "isento") return 0;
    const t = IVA_TAXAS[regiao].value;
    if (regimeIVA === "reduzida") return t.reduzida;
    if (regimeIVA === "intermedia") return t.intermedia;
    return t.normal;
  })();

  // Derivados de faturação: sempre SEM IVA para os cálculos fiscais
  const { mensalSemIva, mensalComIva, mensalIva } = useMemo(() => {
    let comIva = 0;
    let semIva = 0;
    if (modoFat === "total") {
      const v = parseMontante(totalInput);
      if (totalIva > 0 && !valorComIva) {
        // Valor introduzido é a base; o IVA é acrescentado por cima.
        semIva = v;
        comIva = v * (1 + totalIva);
      } else {
        // Valor introduzido já inclui IVA (ou regime isento).
        comIva = v;
        semIva = totalIva > 0 ? v / (1 + totalIva) : v;
      }
    } else {
      for (const r of recibosItems) {
        const v = parseMontante(r.valorComIva);
        comIva += v;
        semIva += r.taxaIva > 0 ? v / (1 + r.taxaIva) : v;
      }
    }
    return {
      mensalSemIva: semIva,
      mensalComIva: comIva,
      mensalIva: comIva - semIva,
    };
  }, [modoFat, totalInput, totalIva, valorComIva, recibosItems]);

  // bruto (sem IVA) e recibosAno mantidos para compatibilidade com o resto do componente
  const bruto = mensalSemIva;
  const recibosAno = mesesFat;

  // Passo 3: Situação
  const [acumulaEmprego, setAcumulaEmprego] = useState(false);
  const [isencaoSSPrimeiroAno, setIsencaoSSPrimeiroAno] = useState(false);
  const [isencaoCpas, setIsencaoCpas] = useState(false); // CPAS/CGA — paga outro regime
  const [irsJovemOn, setIrsJovemOn] = useState(false);
  const [irsJovemAno, setIrsJovemAno] = useState(1);
  const [ifici, setIfici] = useState(false);
  const [rnhAntigo, setRnhAntigo] = useState(false); // RNH antigo — ainda em vigência
  const [exResidente, setExResidente] = useState(false); // Programa Regressar
  const [deficiencia, setDeficiencia] = useState(false);
  const [mostrarDeducoes, setMostrarDeducoes] = useState(false);
  const [despSaude, setDespSaude] = useState(0);
  const [despEducacao, setDespEducacao] = useState(0);
  const [despRendas, setDespRendas] = useState(0);
  const [despGerais, setDespGerais] = useState(0);

  // Dados derivados
  const card = CARDS_ATIV.find((c) => c.id === tipoAtiv)!;
  const isencaoSS = isencaoSSPrimeiroAno || acumulaEmprego || isencaoCpas;
  const jovemAno = irsJovemOn ? irsJovemAno : 0;
  const brutoAnual = bruto * recibosAno;

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

  const simPreview = useMemo(
    () =>
      simularIRSAnual({
        brutoAnual,
        tipo: card.tipoFiscal,
        irsJovemAno: jovemAno > 0 ? jovemAno : undefined,
        ifici,
        rnhAntigo,
        programaRegressar: exResidente,
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
      jovemAno,
      ifici,
      rnhAntigo,
      exResidente,
      deficiencia,
      despSaude,
      despEducacao,
      despGerais,
      despRendas,
    ],
  );
  const irsAnual = simPreview.irsEstimado;
  // Usa segSocial do calcular() que já aplica o coeficiente correto (bens=0,2 / serviços=0,7).
  // CPAS/CGA: quando isencaoCpas=true não há desconto para o Regime Geral → 0 para o simulador.
  const ssAnual = isencaoCpas ? 0 : resultRecibo.segSocial * recibosAno;
  const ivaAnual = mensalIva * mesesFat;
  const liquidoAnual = brutoAnual - irsAnual - ssAnual;

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
    if (passo === 1) setPasso(0);
    else if (passo === 2) setPasso(1);
    else if (passo === 3) setPasso(2);
    else if (passo === "resultado") setPasso(3);
  }

  // Passo 0: decisor pré-wizard
  if (passo === 0) {
    return (
      <div className="min-h-0 bg-white dark:bg-stone-950">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-light/60 px-3 py-1 text-xs font-semibold text-brand-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Simulador guiado
            </span>
            <h2 className="font-display mb-2 text-3xl font-semibold text-stone-800 sm:text-4xl dark:text-stone-100">
              Precisas de abrir atividade?
            </h2>
            <p className="mb-8 text-sm text-stone-500 dark:text-stone-400">
              4 perguntas rápidas para perceber o teu caso.
            </p>
            <DecisorAtoIsoladoInline
              onDecisao={(d) => {
                if (d === "RECIBO_VERDE") {
                  onIrParaSimuladorCompleto(estadoSaida);
                } else if (d === "ABRIR_ATIVIDADE" || d === "CONSIDERAR") {
                  setPasso(1);
                }
                // ATO_ISOLADO: fica no componente, mostra guia
              }}
            />
            <button
              type="button"
              onClick={() => onIrParaSimuladorCompleto(estadoSaida)}
              className="mt-4 w-full text-center text-xs text-stone-400 transition-colors hover:text-stone-600"
            >
              Saltar — já sei o que preciso →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const passoNum = passo === "resultado" ? 4 : (passo as number);
  const PASSOS = ["Atividade", "Faturação", "Situação", "Resultado"];

  return (
    <div className="min-h-0 bg-white dark:bg-stone-950">
      {/* ── Barra de progresso ─────────────────────────────────────────────── */}
      <div className="border-b border-stone-100 px-6 py-4 dark:border-stone-800">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center">
            {PASSOS.map((label, i) => {
              const n = i + 1;
              const done = passoNum > n;
              const active = passoNum === n;
              return (
                <div key={label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        done
                          ? "bg-brand text-white"
                          : active
                            ? "bg-brand text-white ring-4 ring-brand/20"
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
                      className={`mx-2 mb-4 h-0.5 flex-1 transition-colors ${
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

      {/* ── Corpo ──────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_270px]">
          {/* ── Conteúdo do passo ────────────────────────────────────────── */}
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
                    mostrarDetalhe={mostrarDetalheAtiv}
                    onToggleDetalhe={() => setMostrarDetalheAtiv((v) => !v)}
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
                        // Advogados e solicitadores pagam CPAS, não SS geral — auto-detectar
                        setIsencaoCpas(/Advogad|Solicitad/i.test(a.label));
                      } else {
                        setIsencaoCpas(false);
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
                    modoFat={modoFat}
                    totalInput={totalInput}
                    valorComIva={valorComIva}
                    recibosItems={recibosItems}
                    mesesFat={mesesFat}
                    mensalSemIva={mensalSemIva}
                    mensalIva={mensalIva}
                    brutoAnual={brutoAnual}
                    regiao={regiao}
                    regimeIVA={regimeIVA}
                    tipoAtiv={tipoAtiv}
                    atividadeEspecifica={atividadeEspecifica}
                    onModoFat={setModoFat}
                    onTotalInput={setTotalInput}
                    onValorComIva={setValorComIva}
                    onRecibosItems={setRecibosItems}
                    onMesesFat={(m) => {
                      setMesesFat(m);
                      if (mensalSemIva * m <= IVA_LIMITE) {
                        setRegimeIVA("isento");
                      }
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
                    isencaoCpas={isencaoCpas}
                    setIsencaoCpas={setIsencaoCpas}
                    irsJovemOn={irsJovemOn}
                    setIrsJovemOn={setIrsJovemOn}
                    irsJovemAno={irsJovemAno}
                    setIrsJovemAno={setIrsJovemAno}
                    ifici={ifici}
                    setIfici={setIfici}
                    rnhAntigo={rnhAntigo}
                    setRnhAntigo={setRnhAntigo}
                    exResidente={exResidente}
                    setExResidente={setExResidente}
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
                    ssAnualPoupanca={resultRecibo.segSocial * recibosAno}
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
                    taxaIVA={mensalSemIva > 0 ? mensalIva / mensalSemIva : 0}
                    regimeIVA={regimeIVA}
                    recibosAno={recibosAno}
                    resultRecibo={resultRecibo}
                    card={card}
                    regiao={regiao}
                    tipoAtiv={tipoAtiv}
                    isencaoSS={isencaoSS}
                    isencaoCpas={isencaoCpas}
                    rnhAntigo={rnhAntigo}
                    exResidente={exResidente}
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

            {/* ── Navegação ────────────────────────────────────────────── */}
            {passo !== "resultado" && (
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={recuar}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-500 transition-all hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  <ArrowLeft size={14} />
                  {passo === 1 ? "Recomeçar" : "Voltar"}
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

            {/* ── Link saltar para completo ─────────────────────────── */}
            {passo !== "resultado" && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => onIrParaSimuladorCompleto(estadoSaida)}
                  className="text-xs text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                >
                  Saltar para o simulador completo →
                </button>
              </div>
            )}
          </div>

          {/* ── Painel ao vivo ───────────────────────────────────────── */}
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
                  passo={passo as 1 | 2 | 3}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pré-passo 0: Decisor de entrada ─────────────────────────────────────────

// ─── Passo 1: Atividade ───────────────────────────────────────────────────────

function PassoAtividade({
  tipoAtiv,
  tipoSelecionado,
  atividadeEspecifica,
  mostrarDetalhe,
  onToggleDetalhe,
  onSelecionarTipo,
  onAtividadeEspecifica,
}: {
  tipoAtiv: TipoAtiv;
  tipoSelecionado: boolean;
  atividadeEspecifica: Atividade | null;
  mostrarDetalhe: boolean;
  onToggleDetalhe: () => void;
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
          Escolhe a categoria que melhor te representa — determina retenção,
          coeficiente e SS.
        </p>
      </div>

      {/* Grid de categorias */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                  : "border-stone-200 bg-white hover:border-brand/30 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900/60 dark:hover:border-brand/30"
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
              {/* Badges compactos */}
              <div className="mt-2.5 flex gap-1.5">
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

      {/* Painel "saber mais" — toggle explícito, não automático */}
      {tipoSelecionado && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onToggleDetalhe}
            className="flex items-center gap-1.5 text-xs font-medium text-stone-500 transition-colors hover:text-brand dark:text-stone-400"
          >
            <ChevronDown
              size={13}
              className={`transition-transform ${mostrarDetalhe ? "rotate-180" : ""}`}
            />
            {mostrarDetalhe
              ? "Ocultar detalhes fiscais"
              : "Ver detalhes fiscais desta categoria"}
          </button>

          <AnimatePresence>
            {mostrarDetalhe &&
              (() => {
                const meta = ATIV_META[tipoAtiv];
                const cardAtiv = CARDS_ATIV.find((c) => c.id === tipoAtiv)!;

                // Se há atividade específica, mostra parâmetros dela
                const ef = atividadeEspecifica
                  ? efeitoFiscal(atividadeEspecifica)
                  : null;
                const tipo = atividadeEspecifica?.tipo;
                const TIPO_LABEL: Record<string, string> = {
                  art151: "Art. 151.º CIRS",
                  outros: "Cat. B — outros serviços",
                  vendas: "Comércio / produção",
                  diretosAutor: "Direitos de autor",
                };

                return (
                  <m.div
                    key="detalhe"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/60">
                      {/* Header */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <cardAtiv.Icon size={13} className="text-brand" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-dark dark:text-brand">
                            {cardAtiv.titulo}
                          </span>
                        </div>
                        {ef && tipo && (
                          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                            {TIPO_LABEL[tipo] ?? tipo}
                          </span>
                        )}
                      </div>

                      {/* Badges de parâmetros */}
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        {[
                          {
                            label: "Retenção",
                            val: ef
                              ? pct(
                                  RETENCAO[
                                    ef.baseSS === "servicos"
                                      ? (tipo as "art151")
                                      : "outros"
                                  ]?.value ?? ef.retencao,
                                )
                              : pct(cardAtiv.ret),
                            note: "Art. 101.º CIRS",
                          },
                          {
                            label: "Coeficiente",
                            val: ef
                              ? pct(
                                  COEFICIENTE_POR_TIPO[tipo as "art151"] ??
                                    ef.coef,
                                )
                              : pct(cardAtiv.coef),
                            note: "Regime simplificado",
                          },
                          {
                            label: "Base SS",
                            val: ef
                              ? ef.baseSS === "servicos"
                                ? "70%"
                                : "20%"
                              : cardAtiv.baseSS === "servicos"
                                ? "70%"
                                : "20%",
                            note: "Cód. Contributivo",
                          },
                        ].map(({ label, val, note }) => (
                          <div
                            key={label}
                            className="rounded-xl border border-stone-200 bg-white p-2.5 text-center dark:border-stone-700 dark:bg-stone-900"
                          >
                            <div className="text-sm font-bold text-brand">
                              {val}
                            </div>
                            <div className="text-[10px] font-semibold text-stone-500">
                              {label}
                            </div>
                            <div className="text-[9px] text-stone-400">
                              {note}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Descrição */}
                      <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                        {meta.descricao}
                      </p>
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
                  </m.div>
                );
              })()}
          </AnimatePresence>
        </div>
      )}

      {!tipoSelecionado && (
        <p className="mt-5 text-center text-xs text-stone-400">
          Seleciona uma categoria para continuar
        </p>
      )}
    </div>
  );
}

// ─── Passo 2: Faturação (novo) ────────────────────────────────────────────────

function TagComIvaBadge() {
  return (
    <span className="rounded-full border border-brand/30 bg-brand-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-dark">
      com IVA
    </span>
  );
}

function PassoFaturacao({
  modoFat,
  totalInput,
  valorComIva,
  recibosItems,
  mesesFat,
  mensalSemIva,
  mensalIva,
  brutoAnual,
  regiao,
  regimeIVA,
  tipoAtiv,
  atividadeEspecifica,
  onModoFat,
  onTotalInput,
  onValorComIva,
  onRecibosItems,
  onMesesFat,
  onRegiaoChange,
  onRegimeIVAChange,
}: {
  modoFat: "total" | "individual";
  totalInput: string;
  valorComIva: boolean;
  recibosItems: ReciboItem[];
  mesesFat: number;
  mensalSemIva: number;
  mensalIva: number;
  brutoAnual: number;
  regiao: Regiao;
  regimeIVA: RegimeIVA;
  tipoAtiv: TipoAtiv;
  atividadeEspecifica: Atividade | null;
  onModoFat: (m: "total" | "individual") => void;
  onTotalInput: (v: string) => void;
  onValorComIva: (v: boolean) => void;
  onRecibosItems: React.Dispatch<React.SetStateAction<ReciboItem[]>>;
  onMesesFat: (m: number) => void;
  onRegiaoChange: (v: Regiao) => void;
  onRegimeIVAChange: (v: RegimeIVA) => void;
}) {
  const taxasIVA = IVA_TAXAS[regiao].value;
  // Taxa efectiva derivada do regime — única fonte de verdade
  const taxaIvaAtual =
    regimeIVA === "isento"
      ? 0
      : regimeIVA === "reduzida"
        ? taxasIVA.reduzida
        : regimeIVA === "intermedia"
          ? taxasIVA.intermedia
          : taxasIVA.normal;

  function adicionarRecibo() {
    onRecibosItems((prev) => {
      const ultimaIva = prev[prev.length - 1]?.taxaIva ?? 0.23;
      const newId = Date.now();
      return [
        ...prev,
        { id: newId, descricao: "", valorComIva: "", taxaIva: ultimaIva },
      ];
    });
  }

  function removerRecibo(id: number) {
    onRecibosItems((prev) =>
      prev.length > 1 ? prev.filter((r) => r.id !== id) : prev,
    );
  }

  function atualizarRecibo(
    id: number,
    campo: keyof ReciboItem,
    valor: string | number,
  ) {
    onRecibosItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)),
    );
  }

  const montanteTotal = parseMontante(totalInput);
  // Desdobramento consoante o valor introduzido inclua ou não IVA.
  const baseTotalSemIva =
    taxaIvaAtual > 0 && valorComIva
      ? montanteTotal / (1 + taxaIvaAtual)
      : montanteTotal;
  const ivaTotalExtraido =
    taxaIvaAtual > 0
      ? valorComIva
        ? montanteTotal - baseTotalSemIva
        : montanteTotal * taxaIvaAtual
      : 0;
  const totalComIvaCliente = baseTotalSemIva + ivaTotalExtraido;

  // Deteção de cenário de ato isolado: uma única fatura no ano.
  const recibosComValor = recibosItems.filter(
    (r) => parseMontante(r.valorComIva) > 0,
  );
  const atoIsoladoProvavel =
    mesesFat === 1 &&
    (modoFat === "individual"
      ? recibosComValor.length === 1
      : montanteTotal > 0);

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          Quanto faturaste?
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Indica quanto faturas por mês e em quantos meses do ano. A situação de
          IVA é tratada mais abaixo.
        </p>
      </div>

      {/* Tabs modo */}
      <div className="mb-5 flex gap-1 rounded-2xl bg-stone-100 p-1 dark:bg-stone-800">
        {(["total", "individual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modoFat === m}
            onClick={() => onModoFat(m)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              modoFat === m
                ? "bg-white text-stone-800 shadow-sm dark:bg-stone-700 dark:text-white"
                : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            {m === "total" ? "Um valor total" : "Recibo a recibo"}
          </button>
        ))}
      </div>

      {/* Modo: total do mês */}
      {modoFat === "total" && (
        <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
          {/* Campo valor */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Total faturado por mês
              </label>
              {taxaIvaAtual > 0 && (
                <button
                  type="button"
                  onClick={() => onValorComIva(!valorComIva)}
                  aria-label={
                    valorComIva
                      ? "O valor inclui IVA. Clica para passar a sem IVA."
                      : "O valor é sem IVA. Clica para passar a com IVA."
                  }
                  title="Alternar entre valor com IVA e sem IVA"
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    valorComIva
                      ? "border-brand/30 bg-brand-light text-brand-dark hover:border-brand/50 dark:bg-brand/15 dark:text-brand"
                      : "border-stone-300 bg-stone-100 text-stone-500 hover:border-stone-400 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-300"
                  }`}
                >
                  <Swap size={11} />
                  {valorComIva ? "com IVA" : "sem IVA"}
                </button>
              )}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-stone-400">
                €
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={totalInput}
                onChange={(e) => onTotalInput(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-9 pr-4 text-lg font-semibold text-stone-800 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
            </div>
          </div>

          {/* Desdobramento (só visível quando há IVA) */}
          {montanteTotal > 0 && taxaIvaAtual > 0 && (
            <div className="space-y-1.5 rounded-xl bg-stone-50 px-4 py-3 dark:bg-stone-800/60">
              <div className="flex justify-between">
                <span className="text-xs text-stone-500">
                  A tua faturação (sem IVA)
                </span>
                <span className="text-xs font-semibold text-stone-800 tabular-nums dark:text-stone-100">
                  {fmt(baseTotalSemIva)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-stone-400">
                  IVA ({pct(taxaIvaAtual)}){" "}
                  {valorComIva ? "— já incluído" : "— a acrescentar"}
                </span>
                <span className="text-xs font-semibold text-stone-400 tabular-nums">
                  {valorComIva ? "" : "+"}
                  {fmt(ivaTotalExtraido)}
                </span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-1.5 dark:border-stone-700">
                <span className="text-xs text-stone-500">
                  Total pago pelo cliente
                </span>
                <span className="text-xs font-semibold text-stone-800 tabular-nums dark:text-stone-100">
                  {fmt(totalComIvaCliente)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modo: recibo a recibo */}
      {modoFat === "individual" && (
        <div className="mb-5">
          {recibosItems.map((r, i) => {
            const v = parseMontante(r.valorComIva);
            const base = r.taxaIva > 0 ? v / (1 + r.taxaIva) : v;
            const ivaItem = v - base;
            return (
              <div
                key={r.id}
                className="mb-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand">
                    Recibo {i + 1}
                  </span>
                  {recibosItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerRecibo(r.id)}
                      className="text-xs text-stone-400 transition-colors hover:text-red-500"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={r.descricao}
                  onChange={(e) =>
                    atualizarRecibo(r.id, "descricao", e.target.value)
                  }
                  placeholder="Descrição (opcional)"
                  className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                />

                <div className="grid grid-cols-[1fr_130px] gap-3">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Valor pago
                      </label>
                      <TagComIvaBadge />
                    </div>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                        €
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={r.valorComIva}
                        onChange={(e) =>
                          atualizarRecibo(r.id, "valorComIva", e.target.value)
                        }
                        placeholder="0,00"
                        className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-stone-800 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                    </div>
                    {v > 0 && r.taxaIva > 0 && (
                      <p className="mt-1.5 text-[11px] text-stone-400">
                        Base:{" "}
                        <strong className="text-stone-600 tabular-nums dark:text-stone-300">
                          {fmt(base)}
                        </strong>
                        {" · "}
                        IVA:{" "}
                        <strong className="text-stone-400 tabular-nums">
                          {fmt(ivaItem)}
                        </strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      IVA cobrado
                    </label>
                    <select
                      value={r.taxaIva}
                      onChange={(e) =>
                        atualizarRecibo(
                          r.id,
                          "taxaIva",
                          parseFloat(e.target.value),
                        )
                      }
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    >
                      {IVA_OPCOES_FAT.map((o) => (
                        <option key={o.taxa} value={o.taxa}>
                          {o.curto} ({o.longo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={adicionarRecibo}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white py-3 text-sm font-semibold text-brand transition-all hover:border-brand/50 hover:bg-brand-light/30 dark:border-stone-700 dark:bg-transparent"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M8 2v12M2 8h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Adicionar recibo
          </button>

          {/* Resumo total dos recibos */}
          {mensalSemIva > 0 && (
            <div className="mt-3 space-y-1.5 rounded-xl bg-stone-50 px-4 py-3 dark:bg-stone-800/60">
              <div className="flex justify-between">
                <span className="text-xs text-stone-500">
                  Total faturado (sem IVA)
                </span>
                <span className="text-xs font-semibold text-stone-800 tabular-nums dark:text-stone-100">
                  {fmt(mensalSemIva)}
                </span>
              </div>
              {mensalIva > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-stone-400">
                    IVA total — não é teu
                  </span>
                  <span className="text-xs font-semibold text-stone-400 tabular-nums">
                    {fmt(mensalIva)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* IVA */}
      <div className="mb-6">
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Situação de IVA
          </span>
          <InfoTip>
            Abaixo de €15.000/ano estás isento (Art. 53.º CIVA). Acima, cobras
            IVA ao cliente.
          </InfoTip>
        </div>
        <ZonaIVA
          brutoAnual={brutoAnual}
          regimeIVA={regimeIVA}
          regiao={regiao}
          tipoAtiv={tipoAtiv}
          atividadeEspecifica={atividadeEspecifica}
          onRegimeIVAChange={onRegimeIVAChange}
        />
      </div>

      {/* Região */}
      <div>
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Região fiscal
          </span>
          <InfoTip>
            Continente, Madeira e Açores têm escalões de IVA distintos (Art.
            18.º CIVA).
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

      {/* Meses faturados — depois de configurado o IVA e a região */}
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              Meses faturados este ano
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Emitiste recibos em{" "}
              <strong className="text-stone-700 tabular-nums dark:text-stone-200">
                {mesesFat}
              </strong>{" "}
              {mesesFat === 1 ? "mês" : "meses"} do ano
            </p>
          </div>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Meses faturados"
          >
            {MESES_OPCOES_FAT.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMesesFat(m)}
                aria-pressed={mesesFat === m}
                className={`h-9 w-9 rounded-xl border text-sm font-semibold transition-all ${
                  mesesFat === m
                    ? "border-brand bg-brand text-white"
                    : "border-stone-200 bg-white text-stone-500 hover:border-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        {mensalSemIva > 0 && (
          <p className="mt-2.5 text-[11px] text-stone-400">
            {mesesFat < 12
              ? `Faturação anual (sem IVA): ${fmt(mensalSemIva * mesesFat)} — ${mesesFat} ${mesesFat === 1 ? "mês" : "meses"} de atividade`
              : `Faturação anual (sem IVA): ${fmt(mensalSemIva * 12)}`}
          </p>
        )}
      </div>

      {/* Aviso: cenário de ato isolado (uma única fatura no ano) */}
      {atoIsoladoProvavel && (
        <div className="mt-4 rounded-2xl border border-brand/25 bg-brand-light/40 p-4 dark:bg-brand/10">
          <div className="flex gap-2.5">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-brand"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 5v3.5M8 10.5h.01"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-brand-dark dark:text-brand">
                Foi um serviço único?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-brand-dark/80 dark:text-brand/80">
                Se só vais emitir esta fatura uma vez no ano, podes não precisar
                de abrir atividade — o <strong>ato isolado</strong> costuma ser
                mais simples. Mas atenção: aí cobras IVA a 23% (sem a isenção dos{" "}
                {fmt(IVA_LIMITE)}) e não há contribuições para a Segurança
                Social. Estes números assumem atividade aberta.
              </p>
              <a
                href="/guias/ato-isolado"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
              >
                Comparar ato isolado vs recibos verdes
                <ArrowRight size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Passo 3: Situação ────────────────────────────────────────────────────────

function PassoSituacao({
  acumulaEmprego,
  setAcumulaEmprego,
  isencaoSSPrimeiroAno,
  setIsencaoSSPrimeiroAno,
  isencaoCpas,
  setIsencaoCpas,
  irsJovemOn,
  setIrsJovemOn,
  irsJovemAno,
  setIrsJovemAno,
  ifici,
  setIfici,
  rnhAntigo,
  setRnhAntigo,
  exResidente,
  setExResidente,
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
  isencaoCpas: boolean;
  setIsencaoCpas: (v: boolean) => void;
  irsJovemOn: boolean;
  setIrsJovemOn: (v: boolean) => void;
  irsJovemAno: number;
  setIrsJovemAno: (v: number) => void;
  ifici: boolean;
  setIfici: (v: boolean) => void;
  rnhAntigo: boolean;
  setRnhAntigo: (v: boolean) => void;
  exResidente: boolean;
  setExResidente: (v: boolean) => void;
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
  const isencaoSS = isencaoSSPrimeiroAno || acumulaEmprego || isencaoCpas;
  const deducoesTotal =
    despSaude * 0.15 +
    despEducacao * 0.3 +
    despRendas * 0.15 +
    despGerais * 0.35;

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          A tua situação
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Responde ao que se aplica — pode poupar centenas de euros por ano.
        </p>
      </div>

      <div className="space-y-4">
        {/* ── Secção SS ─────────────────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Segurança Social
          </p>
          <div className="space-y-2">
            <ToggleCard
              titulo="É o teu 1.º ano como independente?"
              descricao="Isenção automática de SS durante 12 meses — sem pedir, sem burocracia."
              ativo={isencaoSSPrimeiroAno}
              onToggle={() => {
                if (!isencaoSSPrimeiroAno) setAcumulaEmprego(false);
                setIsencaoSSPrimeiroAno(!isencaoSSPrimeiroAno);
              }}
              desativado={acumulaEmprego}
              desativadoMensagem="Já tens isenção por acumulação com emprego"
              badge={
                isencaoSS && isencaoSSPrimeiroAno && ssAnualPoupanca > 0
                  ? `Poupa ${fmt(Math.round(ssAnualPoupanca))}/ano`
                  : undefined
              }
              badgeTipo="positivo"
            />
            <ToggleCard
              titulo="Acumulas com emprego por conta de outrem?"
              descricao="Se o teu empregador paga SS ≥ €537/mês, podes ficar isento como independente."
              ativo={acumulaEmprego}
              onToggle={() => {
                if (!acumulaEmprego) setIsencaoSSPrimeiroAno(false);
                setAcumulaEmprego(!acumulaEmprego);
              }}
              desativado={isencaoSSPrimeiroAno}
              desativadoMensagem="Já tens isenção de 1.º ano"
              badge={
                isencaoSS && acumulaEmprego && ssAnualPoupanca > 0
                  ? `Poupa ${fmt(Math.round(ssAnualPoupanca))}/ano`
                  : undefined
              }
              badgeTipo="positivo"
            />
            <ToggleCard
              titulo="Advogado, solicitador ou funcionário público pré-2006?"
              descricao="Advogados e solicitadores descontam para a CPAS; funcionários públicos com vínculo anterior a jan/2006 descontam para a CGA — não para a Segurança Social geral."
              ativo={isencaoCpas}
              onToggle={() => {
                if (!isencaoCpas) {
                  setIsencaoSSPrimeiroAno(false);
                  setAcumulaEmprego(false);
                }
                setIsencaoCpas(!isencaoCpas);
              }}
              desativado={isencaoSSPrimeiroAno || acumulaEmprego}
              desativadoMensagem="Já tens outra isenção de SS ativa"
              badge={isencaoCpas ? "CPAS / CGA" : undefined}
              badgeTipo="neutro"
            >
              {isencaoCpas && (
                <div className="mt-2.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-800/60">
                  <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    A SS geral não é deduzida. As taxas da CPAS e CGA são
                    diferentes — consulta a tua caixa para o valor exacto.
                  </p>
                </div>
              )}
            </ToggleCard>
          </div>
        </div>

        {/* ── Secção IRS ────────────────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            IRS — benefícios fiscais
          </p>
          <div className="space-y-2">
            <ToggleCard
              titulo="Tens menos de 35 anos? (IRS Jovem)"
              descricao="Isenta uma parte crescente do rendimento nos primeiros 10 anos de atividade."
              ativo={irsJovemOn}
              onToggle={() => setIrsJovemOn(!irsJovemOn)}
              desativado={ifici || rnhAntigo}
              desativadoMensagem="Incompatível com IFICI ou RNH antigo — desativa primeiro"
              badge={
                irsJovemOn
                  ? `Isenção ${pct(IRS_JOVEM_ISENCAO[irsJovemAno] ?? 0)}`
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
                    1.º: 100% · 2–4: 75% · 5–7: 50% · 8–10: 25%
                  </p>
                </div>
              )}
            </ToggleCard>

            <ToggleCard
              titulo="Tens estatuto IFICI / RNH 2.0?"
              descricao="Taxa flat de 20% sobre rendimentos Cat. B (Art. 58.º-A EBF). Exige aprovação prévia da AT."
              ativo={ifici}
              onToggle={() => setIfici(!ifici)}
              desativado={irsJovemOn || rnhAntigo || exResidente}
              desativadoMensagem="Incompatível com IRS Jovem, RNH antigo ou Programa Regressar — desativa primeiro"
              badge={ifici ? "Taxa flat 20%" : undefined}
              badgeTipo="neutro"
            />

            <ToggleCard
              titulo="Ainda beneficias do RNH antigo (pré-2024)?"
              descricao="O antigo Residente Não Habitual (RNH) encerrou em 2023, mas quem já tinha o estatuto continua a beneficiar até completar os 10 anos — taxa flat de 20% sobre o rendimento de Cat. B."
              ativo={rnhAntigo}
              onToggle={() => setRnhAntigo(!rnhAntigo)}
              desativado={ifici || irsJovemOn || exResidente}
              desativadoMensagem="Incompatível com IFICI, IRS Jovem ou Programa Regressar — desativa primeiro"
              badge={rnhAntigo ? "RNH — 10 anos" : undefined}
              badgeTipo="neutro"
            >
              {rnhAntigo && (
                <div className="mt-2.5 rounded-lg border border-brand/20 bg-brand-light/40 px-3 py-2 dark:bg-brand/10">
                  <p className="text-[11px] leading-relaxed text-brand-dark dark:text-brand">
                    Aplicámos a taxa flat de 20% ao teu rendimento coletável, em
                    vez dos escalões progressivos. Confirma a elegibilidade e o
                    tratamento de rendimentos estrangeiros com um contabilista.
                  </p>
                </div>
              )}
            </ToggleCard>
            <ToggleCard
              titulo="Regressaste a Portugal? (Programa Regressar)"
              descricao="Ex-residentes que regressam podem beneficiar de uma exclusão de 50% dos rendimentos de trabalho (Cat. A e B), durante 5 anos."
              ativo={exResidente}
              onToggle={() => setExResidente(!exResidente)}
              desativado={ifici || rnhAntigo}
              desativadoMensagem="Incompatível com IFICI ou RNH antigo — desativa primeiro"
              badge={exResidente ? "Exclusão 50%" : undefined}
              badgeTipo="neutro"
            >
              {exResidente && (
                <div className="mt-2.5 rounded-lg border border-brand/20 bg-brand-light/40 px-3 py-2 dark:bg-brand/10">
                  <p className="text-[11px] leading-relaxed text-brand-dark dark:text-brand">
                    Aplicámos a exclusão de 50% dos rendimentos (Art. 12.º-A
                    CIRS); os escalões incidem apenas sobre a metade restante.
                    Confirma os anos de elegibilidade com um contabilista.
                  </p>
                </div>
              )}
            </ToggleCard>
            <ToggleCard
              titulo="Tens deficiência permanente ≥ 60%?"
              descricao="Exclusão de 15% do rendimento Cat. B (máx €2.500) + dedução de €2.148 à coleta."
              ativo={deficiencia}
              onToggle={() => setDeficiencia(!deficiencia)}
              badge={deficiencia ? "Exclusão 15% + ded. €2.148" : undefined}
              badgeTipo="positivo"
            />
          </div>
        </div>

        {/* ── Deduções ──────────────────────────────────────────────────── */}
        <div>
          <button
            type="button"
            aria-expanded={mostrarDeducoes}
            onClick={() => setMostrarDeducoes(!mostrarDeducoes)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${
              mostrarDeducoes
                ? "border-brand bg-brand-light/30"
                : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900/60"
            }`}
          >
            <div>
              <div
                className={`text-sm font-semibold ${mostrarDeducoes ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}
              >
                Despesas que abatam ao IRS?
              </div>
              <p
                className={`mt-0.5 text-xs ${mostrarDeducoes ? "text-brand" : "text-stone-400"}`}
              >
                Saúde · Educação · Rendas · Despesas gerais — opcional
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
                <div className="grid grid-cols-2 gap-3 px-1 pt-3 sm:grid-cols-4">
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
                        {label}{" "}
                        <span className="font-normal normal-case text-stone-400">
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
    desc: "Fatura sem abrir atividade. Pagas IVA (23%) e só podes usar uma vez por ano.",
  },
  ABRIR_ATIVIDADE: {
    titulo: "Abre atividade",
    badge: "Recomendado",
    desc: "Vais faturar regularmente. Abertura gratuita e imediata online. 1.º ano isento de SS.",
  },
  RECIBO_VERDE: {
    titulo: "Recibo verde normal",
    badge: "Já estás preparado",
    desc: "Já tens atividade — emite com as regras habituais de retenção e IVA.",
  },
  CONSIDERAR: {
    titulo: "Considera abrir atividade",
    badge: "Pensa bem",
    desc: "Se pode repetir-se, é mais seguro abrir já. A abertura é gratuita e imediata online.",
  },
};

function DecisorAtoIsoladoInline({
  onDecisao,
}: {
  onDecisao?: (d: DecisaoId) => void;
} = {}) {
  const [perguntaId, setPerguntaId] = useState("q1");
  const [decisao, setDecisao] = useState<DecisaoId | null>(null);
  const [historico, setHistorico] = useState<string[]>([]);
  const pergunta = DECISOR_PERGUNTAS.find((p) => p.id === perguntaId);

  function escolher(opcao: (typeof DECISOR_PERGUNTAS)[0]["opcoes"][0]) {
    if (opcao.decisao) {
      setDecisao(opcao.decisao);
    } else if (opcao.proximo) {
      setHistorico((h) => [...h, perguntaId]);
      setPerguntaId(opcao.proximo!);
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
        Precisas de abrir atividade?
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
          <div className="mt-3 flex flex-col gap-1.5">
            {onDecisao && decisao !== "ATO_ISOLADO" && (
              <button
                type="button"
                onClick={() => onDecisao(decisao)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-brand-dark"
              >
                {decisao === "RECIBO_VERDE"
                  ? "Ir para o simulador"
                  : "Continuar"}{" "}
                <ArrowRight size={12} />
              </button>
            )}
            {onDecisao && decisao === "ATO_ISOLADO" && (
              <a
                href="/guias/ato-isolado"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-brand-dark"
              >
                Ver guia Ato Isolado <ArrowRight size={12} />
              </a>
            )}
            <button
              type="button"
              onClick={reiniciar}
              className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-600"
            >
              ← Recomeçar
            </button>
          </div>
        </div>
      ) : pergunta ? (
        <div>
          <p className="mb-1 text-xs text-stone-400">
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
              className="mt-2 text-[11px] text-stone-400 transition-colors hover:text-stone-600"
            >
              ← Voltar
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Sub-componentes de ResultadoFinal ───────────────────────────────────────

/** Uma linha de cálculo numa cascata, com tooltip expansível ao clicar. */
function LinhaCalculo({
  label,
  valor,
  corValor,
  nota,
  explicacao,
  isResultado = false,
  isTotal = false,
  indent = false,
}: {
  label: string;
  valor: number;
  corValor?: string;
  nota?: string;
  explicacao?: string;
  isResultado?: boolean;
  isTotal?: boolean;
  indent?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const temExplicacao = !!explicacao;

  const corDefault =
    valor < 0
      ? "text-red-500 dark:text-red-400"
      : "text-stone-800 dark:text-stone-100";

  return (
    <div>
      <button
        type="button"
        onClick={() => temExplicacao && setAberto((v) => !v)}
        className={`w-full text-left ${isTotal ? "bg-stone-50 dark:bg-stone-800/50" : ""} ${temExplicacao ? "cursor-pointer" : "cursor-default"}`}
      >
        <div
          className={`flex items-center justify-between gap-2 px-4 ${isTotal ? "py-3" : "py-2.5"} ${indent ? "pl-7" : ""}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {temExplicacao && (
              <span
                className={`flex-shrink-0 text-stone-400 transition-transform duration-150 ${aberto ? "rotate-180" : ""}`}
              >
                <ChevronDown size={11} />
              </span>
            )}
            <div className="min-w-0">
              <span
                className={`${isTotal ? "text-sm font-bold text-stone-700 dark:text-stone-200" : isResultado ? "text-xs font-semibold text-stone-700 dark:text-stone-200" : "text-xs text-stone-600 dark:text-stone-400"}`}
              >
                {label}
              </span>
              {nota && !aberto && (
                <span className="ml-1.5 text-[10px] text-stone-400">
                  ({nota})
                </span>
              )}
            </div>
          </div>
          <span
            className={`flex-shrink-0 tabular-nums ${isTotal ? "font-display text-lg font-bold text-brand" : isResultado ? "text-sm font-bold" : "text-xs font-semibold"} ${corValor ?? corDefault}`}
          >
            {valor < 0 ? "−" : isResultado || isTotal ? "" : "+"}
            {fmt(Math.abs(valor))}
          </span>
        </div>
      </button>
      {aberto && explicacao && (
        <div className="mx-3 mb-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-800/60">
          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            {explicacao}
          </p>
        </div>
      )}
    </div>
  );
}

/** Separador entre blocos dentro do painel. */
function SeparadorBloco({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-y border-stone-100 bg-stone-50/70 px-4 py-2 dark:border-stone-800 dark:bg-stone-800/30">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
        {label}
      </span>
    </div>
  );
}

// ─── ResultadoFinal ───────────────────────────────────────────────────────────

function ResultadoFinal({
  brutoAnual,
  liquidoAnual,
  irsAnual,
  ssAnual,
  ivaAnual,
  taxaIVA,
  regimeIVA,
  recibosAno,
  resultRecibo,
  card,
  regiao,
  tipoAtiv,
  isencaoSS,
  isencaoCpas,
  rnhAntigo,
  exResidente,
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
  taxaIVA: number;
  regimeIVA: RegimeIVA;
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
  isencaoCpas: boolean;
  rnhAntigo: boolean;
  exResidente: boolean;
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
  const simAnual = useMemo(
    () =>
      simularIRSAnual({
        brutoAnual,
        tipo: card.tipoFiscal,
        irsJovemAno: irsJovemAno > 0 ? irsJovemAno : undefined,
        ifici,
        rnhAntigo,
        programaRegressar: exResidente,
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
      rnhAntigo,
      exResidente,
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

  // Deduções à coleta detalhadas (para mostrar no bloco IRS)
  const deducoesColeta = simAnual.deducaoDespesas + simAnual.deducaoDeficiencia;
  const temDeducoes = deducoesColeta > 0;

  // Escalões — expandir/colapsar
  const [mostrarEscaloes, setMostrarEscaloes] = useState(false);

  // ── Cálculo de prazos fiscais relevantes para este utilizador ──
  const prazosRel = useMemo(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const todos = [...gerarPrazos(ano), ...gerarPrazos(ano + 1)];
    return todos
      .filter((p) => diasAte(p.data, hoje) >= 0)
      .filter((p) => {
        // Ocultar prazos de IVA se isento
        if (p.categoria === "iva" && regimeIVA === "isento") return false;
        // Ocultar declarações SS periódicas se isento no primeiro ano (mas manter visíveis os outros)
        return true;
      })
      .slice(0, 8);
  }, [regimeIVA]);

  // ── Breakdowns para os stat cards ──
  const pcIRS = brutoAnual > 0 ? simAnual.irsEstimado / brutoAnual : 0;
  const pcSS = brutoAnual > 0 ? ssAnual / brutoAnual : 0;
  const pcIVA = (brutoAnual + ivaAnual) > 0 ? ivaAnual / (brutoAnual + ivaAnual) : 0;
  const liquidoMes = Math.round(liquidoFinal / Math.max(1, recibosAno));

  // Nomes dos meses para o calendário
  const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  function formatDataPrazo(dataIso: string): { dia: string; mes: string; ano: string } {
    const [y, m, d] = dataIso.split("-");
    return { dia: d, mes: MESES_PT[parseInt(m) - 1], ano: y };
  }

  function urgenciaPrazo(dias: number): "critico" | "proximo" | "normal" {
    if (dias <= 7) return "critico";
    if (dias <= 30) return "proximo";
    return "normal";
  }

  return (
    <div>
      {/* ── Título ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h3 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          O teu resultado
        </h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Estimativa para {recibosAno} {recibosAno === 1 ? "mês" : "meses"} de atividade.
        </p>
      </div>

      {/* ── Hero: Líquido anual ──────────────────────────────────────────── */}
      <div className="relative mb-4 overflow-hidden rounded-4xl border border-brand bg-brand p-6 text-white shadow-glow">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-green-100/60">
            Líquido anual estimado
          </div>
          <div className="mt-1 font-display text-5xl font-semibold leading-none tabular-nums sm:text-6xl">
            <AnimatedNumber value={Math.max(0, liquidoFinal)} />
          </div>
          <div className="mt-4">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="rounded-full bg-white/70 transition-all duration-500"
                style={{ width: `${Math.round(Math.max(0, liquidoFinal) / Math.max(1, brutoAnual) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-green-100/50">
              <span>de {fmt(brutoAnual)} faturados</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                {fmt(liquidoMes)}/mês
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                Taxa efectiva {pct(taxaEfetiva)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className={`mb-6 grid gap-3 ${ivaAnual > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
        {/* IRS */}
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-red-400 dark:text-red-500">IRS anual</p>
          <p className="font-display text-xl font-bold tabular-nums text-red-600 dark:text-red-400">
            {fmt(Math.round(simAnual.irsEstimado))}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-red-400 dark:text-red-500">
            {pct(pcIRS)} da faturação
          </p>
        </div>

        {/* SS */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-600">
            {isencaoCpas ? "Seg. Social*" : "Seg. Social"}
          </p>
          <p className="font-display text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
            {isencaoCpas ? "—" : fmt(Math.round(ssAnual))}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-amber-500 dark:text-amber-600">
            {isencaoCpas ? "CPAS — ver nota" : `${pct(pcSS)} da faturação`}
          </p>
        </div>

        {/* IVA — só se não isento */}
        {ivaAnual > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/40">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">IVA cobrado</p>
            <p className="font-display text-xl font-bold tabular-nums text-stone-700 dark:text-stone-200">
              {fmt(Math.round(ivaAnual))}
            </p>
            <p className="mt-0.5 text-[11px] tabular-nums text-stone-400">
              {pct(pcIVA)} do total c/ IVA
            </p>
          </div>
        )}

        {/* Líquido/mês */}
        <div className="rounded-2xl border border-brand/20 bg-brand-light/50 p-4 dark:border-brand/20 dark:bg-brand/10">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-brand-dark/60 dark:text-brand/60">
            Líquido/mês
          </p>
          <p className="font-display text-xl font-bold tabular-nums text-brand">
            {fmt(liquidoMes)}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-brand-dark/50 dark:text-brand/50">
            {fmt(Math.round(brutoAnual / Math.max(1, recibosAno)))} faturado/mês
          </p>
        </div>
      </div>

      {/* ── Breakdown visual ─────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Distribuição por euro faturado
        </p>
        <EuroBreakdown
          faturacao={brutoAnual}
          liquido={Math.max(0, liquidoFinal)}
          irs={simAnual.irsEstimado}
          ss={ssAnual}
          iva={ivaAnual}
        />
      </div>

      {/* ── Calendário fiscal ────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
          <Calendar size={14} className="flex-shrink-0 text-brand" />
          <div>
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
              Próximos prazos fiscais
            </p>
            <p className="text-[10px] text-stone-400">
              Obrigações relevantes para a tua situação
              {regimeIVA === "isento" ? " (IVA omitido — estás isento)" : ""}
            </p>
          </div>
        </div>

        {prazosRel.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-stone-400">
            Sem prazos próximos.
          </div>
        ) : (
          <div className="divide-y divide-stone-50 dark:divide-stone-800">
            {prazosRel.map((prazo) => {
              const dias = diasAte(prazo.data);
              const urgencia = urgenciaPrazo(dias);
              const { dia, mes, ano: anoP } = formatDataPrazo(prazo.data);
              const hoje = new Date();
              const isOutroAno = anoP !== String(hoje.getFullYear());
              const catMeta = META_CATEGORIA[prazo.categoria];

              const corCat =
                prazo.categoria === "iva"
                  ? "bg-amber-400"
                  : prazo.categoria === "irs"
                    ? "bg-brand-deep"
                    : "bg-brand";

              const corTextoUrgencia =
                urgencia === "critico"
                  ? "text-red-600 dark:text-red-400"
                  : urgencia === "proximo"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-stone-400";

              return (
                <div key={prazo.id} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50/60 dark:hover:bg-stone-800/30">
                  {/* Data visual */}
                  <div className="flex-shrink-0 text-center">
                    <div className={`w-10 rounded-lg ${urgencia === "critico" ? "bg-red-50 dark:bg-red-950/30" : urgencia === "proximo" ? "bg-amber-50 dark:bg-amber-950/20" : "bg-stone-50 dark:bg-stone-800"} py-1`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${urgencia === "critico" ? "text-red-500" : urgencia === "proximo" ? "text-amber-500" : "text-stone-400"}`}>
                        {mes}
                      </p>
                      <p className={`font-display text-base font-bold leading-none tabular-nums ${urgencia === "critico" ? "text-red-600 dark:text-red-400" : urgencia === "proximo" ? "text-amber-700 dark:text-amber-400" : "text-stone-700 dark:text-stone-200"}`}>
                        {dia}
                      </p>
                      {isOutroAno && (
                        <p className="text-[9px] text-stone-400">{anoP}</p>
                      )}
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${corCat}`} aria-hidden />
                      <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 truncate">
                        {prazo.titulo}
                      </p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400 line-clamp-2">
                      {prazo.descricao}
                    </p>
                  </div>

                  {/* Dias restantes */}
                  <div className="flex-shrink-0 text-right">
                    {dias === 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                        Hoje
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Clock size={10} className={corTextoUrgencia} />
                        <span className={`text-[11px] font-semibold tabular-nums ${corTextoUrgencia}`}>
                          {dias}d
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BLOCO 1: O teu líquido ───────────────────────────────────────── */}
      <div className="mb-3 rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        {/* Cabeçalho bloco */}
        <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
            1
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
              O teu dinheiro
            </p>
            <p className="text-[10px] text-stone-400">
              O que fica para ti depois de pagar impostos e SS
            </p>
          </div>
        </div>

        {/* Faturação */}
        <LinhaCalculo
          label="Faturação bruta"
          valor={brutoAnual}
          corValor="text-stone-800 dark:text-stone-100"
          explicacao="O total que faturaste durante o ano — o valor que os teus clientes te pagam, antes de qualquer desconto ou imposto."
        />

        <div className="border-t border-stone-100 dark:border-stone-800" />

        {/* IVA — bloco separado pois tem natureza diferente */}
        {regimeIVA === "isento" ? (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
            <div className="min-w-0">
              <span className="text-xs text-stone-400 dark:text-stone-500">
                IVA
              </span>
              <span className="ml-1.5 text-[10px] text-stone-400">
                (isento — Art. 53.º CIVA)
              </span>
            </div>
            <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-400">
              —
            </span>
          </div>
        ) : (
          <div>
            {/* Linha IVA cobrado */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <span className="text-xs text-stone-600 dark:text-stone-400">
                  IVA cobrado ao cliente
                </span>
                <span className="ml-1.5 text-[10px] text-stone-400">
                  ({pct(taxaIVA)} × {fmt(brutoAnual)})
                </span>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-500 dark:text-stone-400">
                +{fmt(ivaAnual)}
              </span>
            </div>
            {/* Caixa explicativa IVA — sempre visível pois é conceito crítico */}
            <div className="mx-3 mb-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-900/20">
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                <span className="font-semibold">O IVA não é teu.</span> Cobras{" "}
                {fmt(ivaAnual)} ao cliente, guardas numa conta separada, e
                entregas ao Estado trimestralmente. Não entra no teu líquido nem
                sai — passa pelo teu bolso.
              </p>
            </div>
          </div>
        )}

        <div className="border-t border-stone-100 dark:border-stone-800" />

        {/* SS */}
        <LinhaCalculo
          label={isencaoCpas ? "Segurança Social (CPAS/CGA)" : "Segurança Social"}
          valor={-ssAnual}
          corValor={isencaoCpas ? "text-stone-400 dark:text-stone-500" : "text-amber-600 dark:text-amber-400"}
          nota={isencaoCpas ? "Não descontas para o Regime Geral" : `${pct(0.214)} × base SS`}
          explicacao={isencaoCpas
            ? "Advogados e solicitadores pagam para a CPAS (Caixa de Previdência dos Advogados e Solicitadores) em vez do Regime Geral da Segurança Social. As contribuições CPAS têm regras e taxas próprias — consulta o teu painel CPAS para o valor exacto. Este simulador não modela a CPAS."
            : `Como trabalhador independente pagas 21,4% de SS sobre 70% do que faturaste. Isto garante acesso a subsídio de doença, parentalidade e reforma futura. O valor é pago trimestralmente à Segurança Social.`}
        />
        {isencaoCpas && (
          <div className="mx-3 mb-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-800/60">
            <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
              <span className="font-semibold">CPAS — não modelado.</span> O teu líquido real é inferior ao estimado: as contribuições para a CPAS ainda se aplicam. Consulta a tua caixa para o valor exacto.
            </p>
          </div>
        )}

        <div className="border-t border-stone-100 dark:border-stone-800" />

        {/* IRS (valor final, resumido) */}
        <LinhaCalculo
          label={
            simAnual.ificiAplicado
              ? "IRS (taxa flat 20% — IFICI/RNH 2.0)"
              : simAnual.rnhAntigoAplicado
                ? "IRS (taxa flat 20% — RNH antigo)"
                : simAnual.programaRegressarAplicado
                  ? "IRS (escalões sobre 50% — Programa Regressar)"
                  : "IRS (após deduções)"
          }
          valor={-simAnual.irsEstimado}
          corValor="text-red-500 dark:text-red-400"
          nota="ver cálculo detalhado abaixo"
          explicacao={
            simAnual.ificiAplicado || simAnual.rnhAntigoAplicado
              ? `Taxa flat de 20% sobre o rendimento coletável (${fmt(simAnual.rendimentoColetavel)}). Sem escalões progressivos.`
              : simAnual.programaRegressarAplicado
                ? `50% do rendimento é excluído (${fmt(simAnual.exclusaoProgramaRegressar)}). Os escalões progressivos aplicam-se apenas aos restantes 50% — ${fmt(simAnual.rendimentoColetavel)}.`
                : `Este é o IRS que pagas no final — já com todas as deduções aplicadas (saúde, educação, etc.). O cálculo detalhado de como se chegou a este valor está no Bloco 2 abaixo.`
          }
        />

        {/* Total líquido */}
        <div className="border-t border-stone-200 dark:border-stone-700" />
        <LinhaCalculo
          label="Líquido disponível"
          valor={Math.max(0, liquidoFinal)}
          corValor="text-brand"
          isTotal
          nota={`Taxa efectiva ${pct(taxaEfetiva)}`}
          explicacao={`Faturação (${fmt(brutoAnual)}) − SS (${fmt(ssAnual)}) − IRS (${fmt(simAnual.irsEstimado)}) = ${fmt(Math.max(0, liquidoFinal))}. O IVA não conta — é dinheiro que nunca foi teu. A taxa efectiva é a percentagem de SS + IRS sobre a faturação.`}
        />
      </div>

      {/* ── BLOCO 2: Como se calculou o IRS ─────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        {/* Cabeçalho bloco */}
        <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            2
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
              Como se calculou o IRS
            </p>
            <p className="text-[10px] text-stone-400">
              A base tributável não é o que faturaste — clica em cada linha para
              saber porquê
            </p>
          </div>
        </div>

        <SeparadorBloco label="Passo 1 — Da faturação ao rendimento tributável" />

        {/* Faturação bruta (referência) */}
        <LinhaCalculo
          label="Faturação bruta"
          valor={brutoAnual}
          corValor="text-stone-800 dark:text-stone-100"
          explicacao="Ponto de partida: o total faturado no ano."
        />

        <div className="border-t border-stone-100 dark:border-stone-800" />

        {/* Coeficiente */}
        <LinhaCalculo
          label={`Coeficiente fiscal (×${pct(simAnual.coeficiente)})`}
          valor={simAnual.rendimentoCoeficiente - brutoAnual}
          corValor="text-brand"
          nota={`${pct(simAnual.coeficiente)} × ${fmt(brutoAnual)} = ${fmt(simAnual.rendimentoCoeficiente)}`}
          explicacao={`No regime simplificado, o Estado assume que uma parte da tua faturação são "despesas" — e só tributa uma fração. Para a tua atividade, esse coeficiente é ${pct(simAnual.coeficiente)}. Isto significa que apenas ${fmt(simAnual.rendimentoCoeficiente)} são considerados rendimento, mesmo que tenhas faturado ${fmt(brutoAnual)}.`}
        />

        <div className="border-t border-stone-100 dark:border-stone-800" />

        {/* Exclusão deficiência, se aplicável */}
        {simAnual.exclusaoDeficiencia > 0 && (
          <>
            <LinhaCalculo
              label="Exclusão por deficiência (Art. 56.º-A)"
              valor={-simAnual.exclusaoDeficiencia}
              corValor="text-brand"
              nota="15% do rendimento Cat. B"
              explicacao="Contribuintes com deficiência igual ou superior a 60% beneficiam de uma exclusão adicional de 15% do rendimento da Categoria B, com limite definido por lei."
            />
            <div className="border-t border-stone-100 dark:border-stone-800" />
          </>
        )}

        {/* IRS Jovem, se aplicável */}
        {simAnual.isencaoJovem > 0 && (
          <>
            <LinhaCalculo
              label={`IRS Jovem — isenção ${pct(simAnual.isencaoJovem)}`}
              valor={-simAnual.rendimentoIsentoJovem}
              corValor="text-brand"
              explicacao={`O IRS Jovem isenta ${pct(simAnual.isencaoJovem)} do rendimento da Categoria B nos primeiros anos de trabalho. Aplica-se sobre o rendimento após coeficiente, até ao limite legal de 55 × IAS.`}
            />
            <div className="border-t border-stone-100 dark:border-stone-800" />
          </>
        )}

        {/* Programa Regressar — exclusão 50%, se aplicável */}
        {simAnual.programaRegressarAplicado && simAnual.exclusaoProgramaRegressar > 0 && (
          <>
            <LinhaCalculo
              label="Programa Regressar — exclusão 50%"
              valor={-simAnual.exclusaoProgramaRegressar}
              corValor="text-brand"
              nota="Art. 12.º-A CIRS"
              explicacao="O Programa Regressar (Art. 12.º-A CIRS) exclui 50% dos rendimentos Cat. A e B de tributação durante 5 anos a contar do regresso. Os escalões progressivos aplicam-se apenas à metade restante."
            />
            <div className="border-t border-stone-100 dark:border-stone-800" />
          </>
        )}

        {/* Rendimento coletável — resultado intercalar */}
        <LinhaCalculo
          label={
            (simAnual.ificiAplicado || simAnual.rnhAntigoAplicado)
              ? "Rendimento coletável (taxa flat 20%)"
              : simAnual.programaRegressarAplicado
                ? "Rendimento coletável (após exclusão 50%)"
                : "Rendimento coletável"
          }
          valor={simAnual.rendimentoColetavel}
          corValor="text-stone-700 dark:text-stone-200"
          isResultado
          nota="base sobre a qual se aplica a tabela de IRS"
          explicacao={`Este é o rendimento que entra na tabela do IRS — não o que faturaste. Resulta de aplicar o coeficiente ${pct(simAnual.coeficiente)} à tua faturação${simAnual.exclusaoDeficiencia > 0 ? ", com a exclusão por deficiência" : ""}${simAnual.isencaoJovem > 0 ? " e a isenção IRS Jovem" : ""}${simAnual.programaRegressarAplicado ? " e a exclusão de 50% do Programa Regressar" : ""}.`}
        />

        <SeparadorBloco label="Passo 2 — Da coleta bruta ao IRS final" />

        {/* Coleta bruta */}
        <LinhaCalculo
          label={
            (simAnual.ificiAplicado || simAnual.rnhAntigoAplicado)
              ? `Coleta (taxa flat ${pct(0.2)})`
              : simAnual.programaRegressarAplicado
                ? "Coleta (escalões sobre 50% do rendimento)"
                : "Coleta (escalões progressivos)"
          }
          valor={-simAnual.coletaBruta}
          corValor="text-red-400 dark:text-red-300"
          nota={
            (simAnual.ificiAplicado || simAnual.rnhAntigoAplicado)
              ? `20% × ${fmt(simAnual.rendimentoColetavel)}`
              : `tabela IRS sobre ${fmt(simAnual.rendimentoColetavel)}`
          }
          explicacao={
            simAnual.ificiAplicado
              ? `Com o estatuto IFICI (RNH 2.0), aplica-se uma taxa flat de 20% sobre o rendimento coletável (${fmt(simAnual.rendimentoColetavel)}), em vez dos escalões progressivos normais.`
              : simAnual.rnhAntigoAplicado
                ? `O RNH antigo (pré-2024) aplica uma taxa flat de 20% sobre o rendimento coletável (${fmt(simAnual.rendimentoColetavel)}). Os escalões progressivos não se aplicam durante o período de benefício.`
                : simAnual.programaRegressarAplicado
                  ? `Programa Regressar: 50% do rendimento foi excluído. Os escalões progressivos aplicam-se apenas ao rendimento coletável restante (${fmt(simAnual.rendimentoColetavel)}).`
                  : `O IRS em Portugal é progressivo: pagas percentagens crescentes consoante o escalão. A coleta bruta é o imposto calculado pela tabela, antes de subtrair as deduções a que tens direito (saúde, educação, etc.).`
          }
        />

        {/* ── Escalões IRS — expansível (só se não IFICI) ──────────────── */}
        {!simAnual.ificiAplicado && !simAnual.rnhAntigoAplicado && simAnual.escaloesAplicados.length > 0 && (
          <>
            <div className="border-t border-stone-100 dark:border-stone-800" />
            <button
              type="button"
              aria-expanded={mostrarEscaloes}
              onClick={() => setMostrarEscaloes((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800/40"
            >
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                {mostrarEscaloes
                  ? "Ocultar escalões"
                  : `Ver ${simAnual.escaloesAplicados.length} escalão${simAnual.escaloesAplicados.length > 1 ? "s" : ""} aplicado${simAnual.escaloesAplicados.length > 1 ? "s" : ""}`}
              </span>
              <ChevronDown
                size={12}
                className={`text-stone-400 transition-transform ${mostrarEscaloes ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {mostrarEscaloes && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mx-3 mb-2 overflow-hidden rounded-xl border border-stone-100 dark:border-stone-700">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/60">
                          <th className="px-3 py-1.5 text-left font-semibold text-stone-400">
                            Escalão
                          </th>
                          <th className="px-3 py-1.5 text-right font-semibold text-stone-400">
                            Rendimento
                          </th>
                          <th className="px-3 py-1.5 text-right font-semibold text-stone-400">
                            Taxa
                          </th>
                          <th className="px-3 py-1.5 text-right font-semibold text-stone-400">
                            Imposto
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {simAnual.escaloesAplicados.map((e, i) => (
                          <tr
                            key={i}
                            className="border-b border-stone-50 last:border-0 dark:border-stone-800"
                          >
                            <td className="px-3 py-1.5 text-stone-500 dark:text-stone-400">
                              {e.ate
                                ? `até ${fmt(e.ate)}`
                                : `acima de ${fmt(simAnual.escaloesAplicados[i - 1]?.ate ?? 0)}`}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-stone-600 dark:text-stone-300">
                              {fmt(Math.round(e.rendimento))}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-stone-700 dark:text-stone-200">
                              {pct(e.taxa)}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-red-500 dark:text-red-400">
                              {fmt(Math.round(e.imposto))}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-stone-200 bg-stone-50/80 dark:border-stone-700 dark:bg-stone-800/40">
                          <td
                            colSpan={3}
                            className="px-3 py-1.5 font-semibold text-stone-600 dark:text-stone-300"
                          >
                            Total coleta
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-bold text-red-500 dark:text-red-400">
                            {fmt(Math.round(simAnual.coletaBruta))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Deduções à coleta (se existirem) */}
        {temDeducoes && (
          <>
            <div className="border-t border-stone-100 dark:border-stone-800" />
            <LinhaCalculo
              label="Deduções à coleta"
              valor={-deducoesColeta}
              corValor="text-brand"
              nota="saúde, educação, rendas…"
              explicacao={`As deduções à coleta reduzem directamente o imposto a pagar — não o rendimento. Ou seja, subtraem ao valor da coleta bruta.${simAnual.deducaoDespesas > 0 ? ` Despesas dedutíveis: ${fmt(simAnual.deducaoDespesas)}.` : ""}${simAnual.deducaoDeficiencia > 0 ? ` Dedução por deficiência (Art. 87.º — 4×IAS): ${fmt(simAnual.deducaoDeficiencia)}.` : ""}`}
            />
          </>
        )}

        {/* Mínimo de existência — se aplicado */}
        {simAnual.minimoExistenciaAplicado && (
          <>
            <div className="border-t border-stone-100 dark:border-stone-800" />
            <div className="flex items-start gap-2.5 px-4 py-2.5">
              <Check
                size={12}
                className="mt-0.5 flex-shrink-0 text-brand"
              />
              <div className="flex-1">
                <p className="text-xs font-semibold text-brand-dark dark:text-brand">
                  Mínimo de existência aplicado (Art. 70.º CIRS)
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                  O teu rendimento coletável (
                  {fmt(simAnual.rendimentoColetavel)}) é igual ou inferior a{" "}
                  €12.880 — o Estado protege este montante de IRS. O imposto foi
                  reduzido ou anulado. Muda anualmente com o IAS.
                </p>
              </div>
            </div>
          </>
        )}

        {/* IRS final — resultado do bloco 2 */}
        <div className="border-t border-stone-200 dark:border-stone-700" />
        <LinhaCalculo
          label={
            simAnual.ificiAplicado
              ? "IRS a pagar (taxa flat 20%)"
              : simAnual.minimoExistenciaAplicado
                ? "IRS a pagar (mínimo de existência)"
                : "IRS a pagar"
          }
          valor={-simAnual.irsEstimado}
          corValor="text-red-500 dark:text-red-400"
          isTotal
          nota={
            temDeducoes
              ? `coleta (${fmt(simAnual.coletaBruta)}) − deduções (${fmt(deducoesColeta)})`
              : undefined
          }
          explicacao={
            temDeducoes
              ? `IRS final = coleta bruta (${fmt(simAnual.coletaBruta)}) − deduções à coleta (${fmt(deducoesColeta)}) = ${fmt(simAnual.irsEstimado)}. Este é o valor que aparece no Bloco 1.`
              : `IRS final = coleta bruta calculada pelos escalões progressivos sobre o rendimento tributável de ${fmt(simAnual.rendimentoTributavel)}.`
          }
        />
      </div>

      {/* Aviso */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg px-4 py-3">
        <Warning size={13} className="mt-0.5 flex-shrink-0 text-alert-text" />
        <p className="text-xs leading-relaxed text-alert-text">
          Estimativa informativa. IRS e SS são adiantamentos — o apuramento
          final depende da declaração de rendimentos. Verifica com o teu
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
          Simulador completo <ArrowRight size={14} />
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

const PASSO_DICA: Record<1 | 2 | 3, { titulo: string; desc: string }> = {
  1: {
    titulo: "A categoria importa",
    desc: "A retenção e o coeficiente variam bastante. Um programador (23%) vs outros serviços (11,5%).",
  },
  2: {
    titulo: "Isenção de IVA",
    desc: `Ficas isento se a tua faturação anual não passar os ${fmt(IVA_LIMITE)} (Art. 53.º). No 1.º ano, o limite é proporcional aos meses de atividade; nos anos seguintes conta a faturação do ano anterior.`,
  },
  3: {
    titulo: "Pode fazer diferença",
    desc: "IRS Jovem no 1.º ano elimina 100% do imposto. Primeiro ano sem SS poupa centenas.",
  },
};

function PainelResultadoVivo({
  brutoAnual,
  liquidoAnual,
  irsAnual,
  ssAnual,
  ivaAnual,
  recibosAno,
  tipoAtiv,
  passo,
}: {
  brutoAnual: number;
  liquidoAnual: number;
  irsAnual: number;
  ssAnual: number;
  ivaAnual: number;
  recibosAno: number;
  tipoAtiv: TipoAtiv | null;
  passo: 1 | 2 | 3;
}) {
  const dica = PASSO_DICA[passo];

  if (!tipoAtiv) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5 text-center dark:border-stone-700 dark:bg-stone-900/60">
          <p className="text-xs text-stone-400">
            Seleciona a tua atividade para ver o resultado ao vivo
          </p>
        </div>
        <div className="rounded-2xl border border-brand/15 bg-brand-light/20 p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-brand-dark/60">
            Sabia que…
          </p>
          <p className="text-xs font-semibold text-brand-dark">{dica.titulo}</p>
          <p className="mt-1 text-xs leading-relaxed text-brand-dark/70">
            {dica.desc}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-4xl border border-brand bg-brand p-5 text-white shadow-glow">
        <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-green-100/60">
            Resultado ao vivo
          </p>

          <div className="mb-1">
            <div className="text-[11px] text-green-100/60">
              {recibosAno >= 12 ? "Líquido mensal" : "Líquido por mês faturado"}
            </div>
            <div className="font-display text-3xl font-semibold leading-none tabular-nums">
              <AnimatedNumber
                value={Math.max(
                  0,
                  Math.round(liquidoAnual / Math.max(1, recibosAno)),
                )}
              />
            </div>
            <div className="mt-0.5 text-[11px] text-green-100/50">
              {fmt(brutoAnual > 0 ? Math.round(brutoAnual / Math.max(1, recibosAno)) : 0)}{" "}
              faturado/mês
            </div>
          </div>
          {brutoAnual > 0 && (
            <div className="mt-3">
              <div className="flex h-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="rounded-full bg-white/70"
                  style={{ width: `${Math.round(Math.max(0, liquidoAnual) / Math.max(1, brutoAnual) * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-green-100/40">
                {Math.round(Math.max(0, liquidoAnual) / Math.max(1, brutoAnual) * 100)}% de {fmt(brutoAnual)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown separado */}
      <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-900">
        <div className="space-y-1.5">
          {(ivaAnual > 0
            ? [
                {
                  label: "Faturado (com IVA)",
                  val: brutoAnual + ivaAnual,
                  cor: "text-stone-700 dark:text-stone-200",
                },
                {
                  label: "IVA (não é teu)",
                  val: -ivaAnual,
                  cor: "text-stone-400",
                },
                {
                  label: "A tua faturação",
                  val: brutoAnual,
                  cor: "text-stone-700 dark:text-stone-200",
                  sep: true,
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
                {
                  label: "Líquido anual",
                  val: Math.max(0, liquidoAnual),
                  cor: "text-brand font-bold",
                  total: true,
                },
              ]
            : [
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
                {
                  label: "Líquido anual",
                  val: Math.max(0, liquidoAnual),
                  cor: "text-brand font-bold",
                  total: true,
                },
              ]
          ).map(({ label, val, cor, sep, total }) => (
            <div
              key={label}
              className={`flex items-center justify-between ${sep || total ? "border-t border-stone-100 pt-1.5 dark:border-stone-800" : ""}`}
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

      {/* Dica contextual ao passo */}
      <div className="rounded-2xl border border-brand/15 bg-brand-light/20 p-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-brand-dark/60">
          Dica
        </p>
        <p className="text-xs font-semibold text-brand-dark">{dica.titulo}</p>
        <p className="mt-1 text-xs leading-relaxed text-brand-dark/70">
          {dica.desc}
        </p>
      </div>
    </div>
  );
}

// ─── Zona IVA inline ──────────────────────────────────────────────────────────

function ZonaIVA({
  brutoAnual,
  regimeIVA,
  regiao,
  tipoAtiv,
  atividadeEspecifica,
  onRegimeIVAChange,
}: {
  brutoAnual: number;
  regimeIVA: RegimeIVA;
  regiao: Regiao;
  tipoAtiv: TipoAtiv;
  atividadeEspecifica: Atividade | null;
  onRegimeIVAChange: (r: RegimeIVA) => void;
}) {
  const taxasIVA = IVA_TAXAS[regiao].value;
  const ivaEsperado = ATIV_META[tipoAtiv].ivaEsperado;
  const ivaIncoerente = regimeIVA !== "isento" && regimeIVA !== ivaEsperado;

  // Nome da atividade do utilizador: específica se escolhida, senão a categoria.
  const cardAtiv = CARDS_ATIV.find((c) => c.id === tipoAtiv)!;
  const nomeAtividade = atividadeEspecifica?.label ?? cardAtiv.titulo;

  // Rótulo legível da taxa de IVA habitual para a atividade.
  const ESPERADO_LABEL: Record<typeof ivaEsperado, string> = {
    isento: "isento",
    reduzida: `taxa reduzida (${pct(taxasIVA.reduzida)})`,
    intermedia: `taxa intermédia (${pct(taxasIVA.intermedia)})`,
    normal: `taxa normal (${pct(taxasIVA.normal)})`,
  };

  // Exemplos de bens/serviços que tipicamente usam cada taxa (Listas I e II do CIVA).
  const IVA_EXEMPLOS: Record<RegimeIVA, string> = {
    isento: "",
    reduzida:
      "alimentos essenciais, livros, medicamentos, alojamento e transporte de passageiros",
    intermedia:
      "restauração (refeições), vinhos comuns e alguns produtos agrícolas",
    normal: "consultoria, advocacia, design, programação e a maioria dos serviços",
  };

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

  function PainelCompatibilidade({ regime }: { regime: RegimeIVA }) {
    const meta = IVA_META[regime as keyof typeof IVA_META] ?? IVA_META.normal;
    const coerente = regime === ivaEsperado;
    return (
      <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 dark:border-stone-700 dark:bg-stone-900/60">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
          {meta.titulo}
        </p>
        <p className="mb-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          {meta.quando}
        </p>
        <div className="space-y-1.5">
          {/* Atividade do utilizador */}
          <div className="flex items-start gap-1.5">
            <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
            <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              <strong className="text-stone-700 dark:text-stone-200">
                A tua atividade:
              </strong>{" "}
              {nomeAtividade} — IVA habitual: {ESPERADO_LABEL[ivaEsperado]}.
            </p>
          </div>

          {/* Estado consoante o regime efetivo */}
          {regime === "isento" ? (
            <>
              <div className="flex items-start gap-1.5">
                <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
                <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                  A isenção mantém-se em <strong>cada ano</strong> em que ficares
                  abaixo de {fmt(IVA_LIMITE)} — não é só no 1.º ano.
                </p>
              </div>
              <p className="pl-[18px] text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
                No 1.º ano o limite é proporcional aos meses de atividade; nos
                anos seguintes conta a faturação do ano anterior.
              </p>
            </>
          ) : coerente ? (
            <div className="flex items-start gap-1.5">
              <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
              <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                A taxa selecionada é a habitual para a tua atividade.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-alert-border bg-alert-bg px-2.5 py-2">
              <div className="flex items-start gap-1.5">
                <Warning
                  size={11}
                  className="mt-0.5 flex-shrink-0 text-alert-text"
                />
                <p className="text-[11px] leading-relaxed text-alert-text">
                  Esta taxa não é a habitual para {nomeAtividade}. Confirma com o
                  teu contabilista.
                </p>
              </div>
              {IVA_EXEMPLOS[regime] && (
                <p className="mt-1 pl-[18px] text-[11px] leading-relaxed text-alert-text/80">
                  A {meta.titulo.toLowerCase()} costuma aplicar-se a:{" "}
                  {IVA_EXEMPLOS[regime]}.
                </p>
              )}
            </div>
          )}
        </div>
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
              53.º CIVA.
            </p>
          </div>
        </div>
        <PainelCompatibilidade regime="isento" />
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
                Entre {fmt(IVA_LIMITE)} e {fmt(IVA_LIMITE_IMEDIATO)}, perdes a
                isenção no 1 de janeiro seguinte.
              </p>
              <p className="mt-2 text-xs font-semibold text-alert-text">
                Que taxa de IVA vais cobrar?
              </p>
              <BotoesIVA cor="amber" />
            </div>
          </div>
        </div>
        {regimeIVA !== "isento" && <PainelCompatibilidade regime={regimeIVA} />}
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
              Ultrapassaste {fmt(IVA_LIMITE_IMEDIATO)}. Contacta o teu
              contabilista.
            </p>
            <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">
              Que taxa de IVA cobras?
            </p>
            <BotoesIVA cor="red" />
          </div>
        </div>
      </div>
      {regimeIVA !== "isento" && <PainelCompatibilidade regime={regimeIVA} />}
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
