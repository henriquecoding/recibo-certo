"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { gravarExportRecibosVerdes } from "@/lib/store/importacao-irs";
import { useCenarios, consumirReabertura, type ResumoCenario } from "@/lib/store/cenarios";
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
  Sparkle,
} from "@/components/ui/Icons";
import EuroBreakdown from "@/components/simulador/EuroBreakdown";
import { PassoContabilista } from "@/components/simulador/PassoContabilista";
import FizPlanoAcao from "@/components/fiz/FizPlanoAcao";
import { pct, fmt } from "@/lib/format";
import {
  IVA_TAXAS,
  IVA_ESPERADO_POR_CATEGORIA,
  remapTaxaIvaEntreRegioes,
  IVA_ISENCAO_LIMITE,
  IVA_ISENCAO_EXCESSO,
  IRS_JOVEM,
  DISPENSA_RETENCAO_LIMITE,
  efeitoFiscal,
  META_TIPO,
  RETENCAO,
  COEFICIENTE_POR_TIPO,
  SS_TAXA,
  SS_COEFICIENTE,
  SS_ACUMULACAO_LIMITE_MENSAL,
  IAS,
  MINIMO_EXISTENCIA,
  type Atividade,
  type Regiao,
} from "@/lib/fiscal-data";
import { calcular, simularIRSAnual, contribuicoesSSAnuais, type RegimeIVA, type SimulacaoIRS } from "@/lib/fiscal";
import { gerarPrazos, diasAte } from "@/lib/prazos";
import { useScrollTopOnStep } from "@/lib/scroll";
import {
  GuiadoStepper,
  GuiadoCabecalho,
  GuiadoOpcao,
  GuiadoVoltarLink,
  GuiadoNav,
} from "@/components/simulador/guiado-ui";
import GuardarCenarioDialog from "@/components/ui/GuardarCenarioDialog";
import LocalizedNumberInput from "@/components/ui/LocalizedNumberInput";
import { parseNumericDraft, sanitizeNumericDraft } from "@/lib/numeric-input";
import { situacaoIVA, type SituacaoIVA as SituacaoIVAResultado } from "@/lib/fiscal-iva";
import SituacaoIVAPainel from "@/components/simulador/SituacaoIVA";

// ─── Constantes ───────────────────────────────────────────────────────────────

const IVA_LIMITE = IVA_ISENCAO_LIMITE.value;
const IVA_LIMITE_IMEDIATO = IVA_ISENCAO_EXCESSO.value;
const IRS_JOVEM_ISENCAO = IRS_JOVEM.isencaoPorAno.value;

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoAtiv = "art151" | "vendas" | "hosped" | "outras" | "prop_int";
// Passo 0 = decisor; passos 1-3 = wizard; resultado = final; contabilista = passo 5
type Passo = 0 | 1 | 2 | 3 | "resultado" | "contabilista";

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
  /** Rendimento anual da Cat. A a englobar (0 quando não há acumulação). */
  outrosRendimentos: number;
  isencaoSSPrimeiroAno: boolean;
  isencaoCpas: boolean;
  anoAtividade: number;
  irsJovemAno: number;
  despSaude: number;
  despEducacao: number;
  despGerais: number;
  despRendas: number;
  ifici: boolean;
  rnhAntigo: boolean;
  exResidente: boolean;
  deficiencia: boolean;
}

interface ModoGuiadoProps {
  onIrParaSimuladorCompleto: (estado: EstadoGuiadoSaida) => void;
  onGuardarRecibo?: (recibo: ReciboGuiadoSaida, cliente: string) => void;
}

export interface ReciboGuiadoSaida {
  valor: number;
  tipo: "art151" | "outros" | "vendas" | "diretosAutor";
  atividade: string | undefined;
  regiao: Regiao;
  regimeIVA: RegimeIVA;
  baseSS: "bens" | "servicos";
  dispensaRetencao: boolean;
  _computed?: {
    irsEstimado: number;
    segSocial: number;
    iva: number;
    liquido: number;
  };
}

const CARDS_ATIV: CardAtiv[] = [
  {
    id: "art151",
    titulo: "Profissão liberal",
    sub: "Serviços técnicos e liberais (Art. 151.º CIRS)",
    exemplos: "Dev, designer, arquiteto, advogado, solicitador, médico, psicólogo, nutricionista, enfermeiro, engenheiro, consultor, gestor, contabilista, jornalista, ator, músico, professor…",
    coef: COEFICIENTE_POR_TIPO.art151,
    ret: RETENCAO.art151.value,
    baseSS: "servicos",
    tipoFiscal: "art151",
    Icon: Laptop,
  },
  {
    id: "vendas",
    titulo: "Vendo produtos",
    sub: "Comércio, produção e revenda",
    exemplos: "E-commerce, artesanato, manufatura…",
    coef: COEFICIENTE_POR_TIPO.vendas,
    ret: RETENCAO.vendas.value,
    baseSS: "bens",
    tipoFiscal: "vendas",
    Icon: ShoppingBag,
  },
  {
    id: "hosped",
    titulo: "Alojamento ou Hostelaria",
    sub: "Alojamento local, hotel, restauração",
    exemplos: "Airbnb, hostel, restaurante, café…",
    // Resolve para o tipo fiscal canónico "vendas" (Art. 31.º, n.º 1, al. a)
    // CIRS — restauração e atividades hoteleiras — coef. 0,15), que é o que o
    // motor usa por omissão sem um coefOverride específico. Alojamento local em
    // moradia/apartamento (0,35) ou zona de contenção (0,50) exige escolher a
    // atividade específica no ActivityCombobox — ver `ATIV_META.hosped`.
    coef: COEFICIENTE_POR_TIPO.vendas,
    ret: RETENCAO.vendas.value,
    baseSS: "bens",
    tipoFiscal: "vendas",
    Icon: Home,
  },
  {
    id: "outras",
    titulo: "Outros serviços",
    sub: "Serviços fora do Art. 151.º",
    exemplos: "Explicações, motorista, jardinagem…",
    coef: COEFICIENTE_POR_TIPO.outros,
    ret: RETENCAO.outros.value,
    baseSS: "servicos",
    tipoFiscal: "outros",
    Icon: Briefcase,
  },
  {
    id: "prop_int",
    titulo: "Direitos de autor / Royalties",
    sub: "Propriedade intelectual e licenciamento",
    exemplos: "Livros, música, software, patentes…",
    coef: COEFICIENTE_POR_TIPO.diretosAutor,
    ret: RETENCAO.diretosAutor.value,
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

/** Desdobramento da faturação de direitos de autor por regime de IVA. */
interface DesdobramentoAutor {
  /** Parcela mensal de obra própria (isenta de IVA — Art. 9.º/16 CIVA). */
  obra: number;
  /** Parcela mensal de royalties / licenciamento (taxa normal de IVA). */
  royalties: number;
  /** Faturação mensal total (obra + royalties). */
  total: number;
  /** IVA mensal (só a parte de royalties, se acima do limiar do Art. 53.º). */
  ivaRoyalties: number;
  /** Se a parte de royalties ultrapassa o limiar e cobra IVA. */
  cobraIvaRoyalties: boolean;
}

/**
 * Opções de taxa de IVA para o seletor "recibo a recibo", derivadas das taxas
 * reais da região (`IVA_TAXAS`) — nunca fixas ao continente, para Madeira/Açores
 * mostrarem as suas próprias taxas (Art. 18.º CIVA).
 */
function ivaOpcoesFat(regiao: Regiao) {
  const taxas = IVA_TAXAS[regiao].value;
  return [
    { taxa: 0, curto: "Isento", longo: "0%" },
    { taxa: taxas.reduzida, curto: "Reduzida", longo: pct(taxas.reduzida) },
    { taxa: taxas.intermedia, curto: "Intermédia", longo: pct(taxas.intermedia) },
    { taxa: taxas.normal, curto: "Normal", longo: pct(taxas.normal) },
  ];
}

const MESES_OPCOES_FAT = [1, 2, 3, 4, 6, 8, 10, 12] as const;

function parseMontante(s: string): number {
  return Math.max(0, parseNumericDraft(String(s)) ?? 0);
}

const ATIV_META: Record<
  TipoAtiv,
  {
    descricao: string;
    ivaEsperado: "isento" | "reduzida" | "intermedia" | "normal";
    nota: string | null;
    /**
     * Nota específica de IVA, mostrada no painel de situação de IVA quando a
     * atividade tem um enquadramento particular (ex.: direitos de autor, cujo
     * IVA depende de ser obra própria — isenta — ou royalties/licenciamento —
     * taxa normal). Neutra, não é um aviso de erro.
     */
    notaIVA?: string;
  }
> = {
  // `ivaEsperado` e `notaIVA` vêm da fonte única `IVA_ESPERADO_POR_CATEGORIA`
  // (fiscal-data.ts) — a mesma que o modo completo consome, para os dois modos
  // nunca divergirem. `descricao`/`nota` são copy da UI deste modo.
  //
  // Nota fiscal (direitos de autor): o IVA não tem um único valor "habitual" —
  // a obra própria é isenta (Art. 9.º/16) e o licenciamento/royalties é à taxa
  // normal. Marca-se "normal" (o caso tributável); a isenção é tratada no ramo
  // próprio do painel, pelo que tanto "isento" como "normal" ficam coerentes e
  // só as taxas reduzida/intermédia (que nunca se aplicam) avisam.
  art151: {
    descricao:
      "Profissões da tabela da Portaria 1011/2001. Coef. 0,75 · Ret. 23% · SS sobre 70%.",
    ivaEsperado: IVA_ESPERADO_POR_CATEGORIA.value.art151.esperado,
    nota: "15% do rendimento bruto deve ser justificado com despesas (regra dos 15%).",
    notaIVA: IVA_ESPERADO_POR_CATEGORIA.value.art151.notaIVA,
  },
  vendas: {
    descricao:
      "Comércio, produção e revenda. Coef. 0,15 porque as margens brutas são reduzidas. SS sobre 20%.",
    ivaEsperado: IVA_ESPERADO_POR_CATEGORIA.value.vendas.esperado,
    nota: null,
    notaIVA: IVA_ESPERADO_POR_CATEGORIA.value.vendas.notaIVA,
  },
  hosped: {
    descricao:
      "Restauração e atividades hoteleiras. Coef. 0,15 · sem retenção · SS sobre 20%. Alojamento local em moradia/apartamento tem coeficiente próprio (0,35) — escolhe a atividade específica para o aplicar.",
    ivaEsperado: IVA_ESPERADO_POR_CATEGORIA.value.hosped.esperado,
    nota: null,
    notaIVA: IVA_ESPERADO_POR_CATEGORIA.value.hosped.notaIVA,
  },
  outras: {
    descricao:
      "Serviços Cat. B não listados no Art. 151.º. Coef. 0,35 · Ret. 11,5% · SS sobre 70%.",
    ivaEsperado: IVA_ESPERADO_POR_CATEGORIA.value.outras.esperado,
    nota: null,
    notaIVA: IVA_ESPERADO_POR_CATEGORIA.value.outras.notaIVA,
  },
  prop_int: {
    descricao:
      "Direitos de autor e royalties. Coef. 0,95 · Ret. 16,5% · SS sobre 70%.",
    ivaEsperado: IVA_ESPERADO_POR_CATEGORIA.value.prop_int.esperado,
    nota: "A obra própria (titular originário, residente) pode ser englobada em IRS por apenas 50% do valor, até 10 000 € excluídos (Art. 58.º EBF, em vigor até 2026).",
    notaIVA: IVA_ESPERADO_POR_CATEGORIA.value.prop_int.notaIVA,
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
  onGuardarRecibo,
}: ModoGuiadoProps) {
  // Navegação — começa no pré-passo (decisor)
  const [passo, setPasso] = useState<Passo>(0);
  // Ao mudar de passo, rola até ao topo do simulador.
  const topoRef = useScrollTopOnStep(passo);

  // Gestão de cenários (guardar instantâneo completo + reabrir)
  const cenariosStore = useCenarios();
  const [cenarioFeedback, setCenarioFeedback] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [dialogGuardar, setDialogGuardar] = useState(false);

  // Passo 0: situação face à atividade
  // anoAtividade controla a redução do coeficiente (1.º −50%, 2.º −25%, 3.º+ integral).
  const [anoAtividade, setAnoAtividade] = useState(3);
  const [jaTemAtividade, setJaTemAtividade] = useState<null | "sim" | "nao">(
    null,
  );

  // Passo 1: Atividade
  const [tipoAtiv, setTipoAtiv] = useState<TipoAtiv>("art151");
  const [atividadeEspecifica, setAtividadeEspecifica] =
    useState<Atividade | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(false);
  const [mostrarDetalheAtiv, setMostrarDetalheAtiv] = useState(false);

  // Passo 2: Faturação — novo modelo recibos
  const [modoFat, setModoFat] = useState<"total" | "individual">("total");
  const [totalInput, setTotalInput] = useState("1500");
  // Como interpretar o valor introduzido no modo "total": é a faturação base à
  // qual o IVA é acrescentado (por omissão — é o que consta no recibo verde) ou
  // já inclui IVA (o que o cliente paga). Por omissão = base sem IVA, para que,
  // p.ex., 1500/mês corresponda a 18 000/ano de faturação.
  const [valorComIva, setValorComIva] = useState(false);
  const [recibosItems, setRecibosItems] = useState<ReciboItem[]>([
    // Taxa por omissão = normal do Continente (região inicial), da fonte fiscal.
    { id: 1, descricao: "", valorComIva: "", taxaIva: IVA_TAXAS.continente.value.normal },
  ]);
  const [mesesFat, setMesesFat] = useState(12);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [regimeIVA, setRegimeIVA] = useState<RegimeIVA>("isento");

  // Ao mudar de região, remapeia a taxa de IVA de cada recibo para o mesmo
  // escalão na nova região (preserva a escolha do utilizador; o valor numérico
  // passa a ser o da região — normal 23% Continente → 22% Madeira → 16% Açores).
  const regiaoAnteriorFat = useRef(regiao);
  useEffect(() => {
    const anterior = regiaoAnteriorFat.current;
    if (anterior === regiao) return;
    setRecibosItems((items) =>
      items.map((it) => ({ ...it, taxaIva: remapTaxaIvaEntreRegioes(it.taxaIva, anterior, regiao) })),
    );
    regiaoAnteriorFat.current = regiao;
  }, [regiao]);

  // Direitos de autor: a faturação pode misturar obra própria (isenta de IVA,
  // Art. 9.º/16 CIVA) e royalties/licenciamento (taxa normal). Guardam-se as
  // duas parcelas mensais em separado; o IVA é a soma ponderada (só a parte de
  // royalties é tributada). O IRS/SS incidem sobre o total (coef. 0,95).
  const [autorObraInput, setAutorObraInput] = useState("1500");
  const [autorRoyaltiesInput, setAutorRoyaltiesInput] = useState("0");
  const ehDireitosAutor = tipoAtiv === "prop_int";

  // Taxa de IVA derivada do regime — única fonte de verdade para extracção do IVA
  // ── IVA: regime EFETIVO, derivado reativamente ──────────────────────
  // Princípio único: abaixo de 15 000 €/ano de faturação → ISENTO (Art. 53.º
  // CIVA), logo SEM IVA. Acima, aplica-se o regime escolhido (ou a taxa habitual
  // da atividade). Tudo o resto — desdobramento, situação, resultado e motor —
  // usa isto, para o simulador estar sempre sincronizado.
  const taxasRegiao = IVA_TAXAS[regiao].value;
  const taxaDoRegime = (r: RegimeIVA): number =>
    r === "reduzida" ? taxasRegiao.reduzida : r === "intermedia" ? taxasRegiao.intermedia : r === "normal" ? taxasRegiao.normal : 0;
  const ivaEsperadoAtiv = ATIV_META[tipoAtiv].ivaEsperado;
  // Taxa "potencial" (se ultrapassar o limite de isenção): o regime escolhido ou,
  // se ainda estiver em "isento", a taxa habitual da atividade.
  const taxaPotencial =
    regimeIVA !== "isento"
      ? taxaDoRegime(regimeIVA)
      : ivaEsperadoAtiv !== "isento"
        ? taxasRegiao[ivaEsperadoAtiv]
        : taxasRegiao.normal;

  // Desdobramento de direitos de autor por regime de IVA (só quando aplicável).
  // Obra própria → isento (Art. 9.º/16 CIVA), sem limiar de faturação; royalties/
  // licenciamento → taxa normal, sujeita ao limiar do Art. 53.º (como qualquer
  // atividade tributada). Nada fixo: taxa e limiar vêm de fiscal-data.
  // Entrada do desdobramento. A regra — obra isenta pelo Art. 9.º, limiar do
  // Art. 53.º só sobre os royalties, transição do Art. 58.º — vive no motor.
  const entradaAutor = useMemo(() => {
    if (!ehDireitosAutor) return null;
    const obra = Math.max(0, parseMontante(autorObraInput));
    const royalties = Math.max(0, parseMontante(autorRoyaltiesInput));
    return { obraAnual: obra * mesesFat, royaltiesAnual: royalties * mesesFat };
  }, [ehDireitosAutor, autorObraInput, autorRoyaltiesInput, mesesFat]);

  const situacaoIvaAutor = useMemo(
    () =>
      entradaAutor
        ? situacaoIVA({
            faturacaoAnual: entradaAutor.obraAnual + entradaAutor.royaltiesAnual,
            regiao,
            regimeEscolhido: "isento",
            categoria: tipoAtiv,
            entidade: "ti",
            direitosAutor: entradaAutor,
          })
        : null,
    [entradaAutor, regiao, tipoAtiv],
  );

  const desdobramentoAutor = useMemo(() => {
    const d = situacaoIvaAutor?.desdobramentoAutor;
    if (!d || !entradaAutor) return null;
    const m = mesesFat || 1;
    return {
      obra: d.obraAnual / m,
      royalties: d.royaltiesAnual / m,
      total: (d.obraAnual + d.royaltiesAnual) / m,
      ivaRoyalties: d.ivaRoyaltiesAnual / m,
      cobraIvaRoyalties: d.royaltiesTributados,
    };
  }, [situacaoIvaAutor, entradaAutor, mesesFat]);

  const derivadoBase = useMemo(() => {
    // Quem decide se há IVA é o motor (`fiscal-iva.ts`), não uma comparação
    // solta com o limiar. A regra anterior — "acima de 15 000 € cobra IVA" —
    // ignorava o regime escolhido e ignorava o Art. 58.º, n.º 2, al. a): entre
    // 15 000 € e 18 750 € a isenção MANTÉM-SE até 1 de janeiro. O resultado era
    // escolher «Isento» e ver o simulador reservar IVA na mesma, ao lado de um
    // painel que dizia "continuas isento até lá".
    if (modoFat === "total") {
      const v = parseMontante(totalInput);
      // Dizer "o valor já inclui IVA" é afirmar que se cobra; aí é preciso a
      // taxa escolhida para chegar à base. Nos restantes casos o valor
      // introduzido é a própria base.
      const baseComoFaturacao =
        valorComIva && taxaPotencial > 0 ? v / (1 + taxaPotencial) : v;
      const sit = situacaoIVA({
        faturacaoAnual: baseComoFaturacao * mesesFat,
        regiao,
        regimeEscolhido: regimeIVA,
        categoria: tipoAtiv,
        entidade: "ti",
        isentoEfetivo: valorComIva ? false : undefined,
      });
      const cobraIva = sit.regimeEfetivo !== "isento";
      const taxaEf = sit.taxaEfetiva;
      let semIva: number;
      let comIva: number;
      if (!cobraIva) {
        semIva = v; // isento: o valor É a faturação (sem IVA a separar)
        comIva = v;
      } else if (valorComIva && taxaEf > 0) {
        comIva = v; // valor já inclui IVA → retirar para obter a base
        semIva = v / (1 + taxaEf);
      } else {
        semIva = v; // valor é a base → IVA acrescentado por cima
        comIva = v * (1 + taxaEf);
      }
      return { mensalSemIva: semIva, mensalComIva: comIva, mensalIva: comIva - semIva, isentoEfetivo: !cobraIva, taxaIvaEfetiva: taxaEf };
    }
    // Modo "recibo a recibo": cobra IVA se algum recibo tiver taxa > 0.
    let semIva = 0;
    let comIva = 0;
    let algumIva = false;
    for (const r of recibosItems) {
      const v = parseMontante(r.valorComIva);
      if (r.taxaIva > 0) {
        algumIva = true;
        semIva += v / (1 + r.taxaIva);
        comIva += v;
      } else {
        semIva += v;
        comIva += v;
      }
    }
    // Recibo a recibo: se algum tem taxa > 0, está a cobrar. Caso contrário
    // é o motor que decide, a partir da faturação e do regime escolhido.
    const sit = situacaoIVA({
      faturacaoAnual: semIva * mesesFat,
      regiao,
      regimeEscolhido: regimeIVA,
      categoria: tipoAtiv,
      entidade: "ti",
      isentoEfetivo: algumIva ? false : undefined,
    });
    const cobraIva = algumIva || sit.regimeEfetivo !== "isento";
    return {
      mensalSemIva: semIva,
      mensalComIva: comIva,
      mensalIva: cobraIva ? comIva - semIva : 0,
      isentoEfetivo: !cobraIva,
      taxaIvaEfetiva: cobraIva ? (algumIva ? taxaPotencial : sit.taxaEfetiva) : 0,
    };
  }, [modoFat, totalInput, valorComIva, recibosItems, taxaPotencial, mesesFat, regiao, regimeIVA, tipoAtiv]);

  // Para direitos de autor, o IVA é a mistura obra própria (isento) + royalties
  // (taxa normal); a taxa efetiva é o IVA total ÷ faturação. Para tudo o resto,
  // usa-se a derivação normal acima.
  const { mensalSemIva, mensalComIva, mensalIva, isentoEfetivo, taxaIvaEfetiva } =
    desdobramentoAutor
      ? {
          mensalSemIva: desdobramentoAutor.total,
          mensalComIva: desdobramentoAutor.total + desdobramentoAutor.ivaRoyalties,
          mensalIva: desdobramentoAutor.ivaRoyalties,
          isentoEfetivo: desdobramentoAutor.ivaRoyalties === 0,
          taxaIvaEfetiva:
            desdobramentoAutor.total > 0
              ? desdobramentoAutor.ivaRoyalties / desdobramentoAutor.total
              : 0,
        }
      : derivadoBase;

  // Regime efetivo, para o cálculo, a situação de IVA e o resultado.
  const regimeEfetivo: RegimeIVA = isentoEfetivo
    ? "isento"
    : regimeIVA !== "isento"
      ? regimeIVA
      : ivaEsperadoAtiv !== "isento"
        ? ivaEsperadoAtiv
        : "normal";

  // Regime de IVA no vocabulário do contrato da FIZ. Tem de derivar do regime
  // EFETIVO — usar a escolha crua do utilizador produzia a contradição de
  // anunciar "isento do Art. 53.º" ao mesmo tempo que se enviava IVA estimado.
  // A isenção também não é uma só: a do Art. 53.º vem do limiar de faturação,
  // a do Art. 9.º da natureza da operação (obra própria de autor, n.º 16).
  // Quando as duas coexistem — obra própria mais royalties abaixo do limiar —
  // não há resposta única e "UNKNOWN" é mais honesto do que escolher uma.
  const vatRegimeEstimateFiz: "EXEMPT_ART_53" | "EXEMPT_ART_9" | "NORMAL" | "UNKNOWN" =
    regimeEfetivo !== "isento"
      ? "NORMAL"
      : desdobramentoAutor && desdobramentoAutor.obra > 0
        ? desdobramentoAutor.royalties > 0
          ? "UNKNOWN"
          : "EXEMPT_ART_9"
        : ivaEsperadoAtiv === "isento"
          ? "EXEMPT_ART_9"
          : "EXEMPT_ART_53";

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
  /** Rendimento anual da Cat. A a englobar — só relevante com acumulação. */
  const [outrosRendimentos, setOutrosRendimentos] = useState(0);

  // Dados derivados
  const card = CARDS_ATIV.find((c) => c.id === tipoAtiv)!;
  const isencaoSS = isencaoSSPrimeiroAno || acumulaEmprego || isencaoCpas;
  const jovemAno = irsJovemOn ? irsJovemAno : 0;
  const brutoAnual = bruto * recibosAno;
  const efAtiv = atividadeEspecifica ? efeitoFiscal(atividadeEspecifica) : null;

  // Poupança de SS = o que se pagaria sem isenção MENOS o que se paga com ela.
  // Estava a passar-se a contribuição efetiva como se fosse a poupança: com a
  // isenção total dava 0 (e o badge nunca aparecia) e, agora que a acumulação
  // acima de 4 × IAS deixa contribuição a pagar, daria o número ao contrário —
  // anunciar como poupança aquilo que a pessoa desembolsa.
  const ssAnualPoupanca = useMemo(() => {
    if (!isencaoSS) return 0;
    const semIsencao = contribuicoesSSAnuais(brutoAnual, card.baseSS);
    const comIsencao = isencaoCpas
      ? 0 // CPAS/CGA: sai do Regime Geral por inteiro; a caixa própria tem taxas suas.
      : contribuicoesSSAnuais(brutoAnual, card.baseSS, {
          primeiroAno: isencaoSSPrimeiroAno,
          acumulaEmprego,
        });
    return Math.max(0, semIsencao - comIsencao);
  }, [isencaoSS, isencaoCpas, isencaoSSPrimeiroAno, acumulaEmprego, brutoAnual, card.baseSS]);

  const resultRecibo = useMemo(
    () =>
      calcular({
        bruto,
        tipo: card.tipoFiscal,
        regiao,
        regimeIVA: regimeEfetivo,
        baseSS: card.baseSS,
        dispensaRetencao: brutoAnual < DISPENSA_RETENCAO_LIMITE.value,
        isencaoSSPrimeiroAno,
        acumulaEmprego,
        irsJovemAno: jovemAno,
        retencaoOverride: efAtiv?.retencao,
      }),
    [
      bruto,
      brutoAnual,
      card.tipoFiscal,
      card.baseSS,
      regiao,
      regimeEfetivo,
      isencaoSSPrimeiroAno,
      acumulaEmprego,
      jovemAno,
      efAtiv?.retencao,
    ],
  );

  const simPreview = useMemo(
    () =>
      simularIRSAnual({
        brutoAnual,
        tipo: card.tipoFiscal,
        anoAtividade,
        irsJovemAno: jovemAno > 0 ? jovemAno : undefined,
        ifici,
        rnhAntigo,
        programaRegressar: exResidente,
        deficiencia,
        coefOverride: efAtiv?.coef,
        aplicaRegra15Override: efAtiv?.regra15,
        // Englobamento (Art. 22.º CIRS): o IRS é único e incide sobre a soma.
        // Faltava aqui — o guiado desligava a SS pela acumulação e calculava o
        // imposto como se a pessoa só tivesse os recibos verdes.
        outrosRendimentos: acumulaEmprego ? outrosRendimentos : 0,
        // As isenções de SS entram no cálculo do IRS através da regra dos 15%
        // (Art. 31.º n.º 13): sem elas, o motor credita contribuições que a
        // pessoa não paga.
        acumulaEmprego,
        isencaoSSPrimeiroAno,
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
      anoAtividade,
      jovemAno,
      ifici,
      rnhAntigo,
      exResidente,
      deficiencia,
      efAtiv?.coef,
      efAtiv?.regra15,
      acumulaEmprego,
      isencaoSSPrimeiroAno,
      outrosRendimentos,
      despSaude,
      despEducacao,
      despGerais,
      despRendas,
    ],
  );
  // Com englobamento, `irsEstimado` é o imposto do agregado todo — salário
  // incluído. O que se subtrai à faturação da atividade é só a parte marginal
  // que ela acrescenta; senão o "líquido dos recibos verdes" pagaria também o
  // imposto do emprego.
  const irsAnual = simPreview.irsImputavelCatB;
  // Usa segSocial do calcular() que já aplica o coeficiente correto (bens=0,2 / serviços=0,7).
  // CPAS/CGA: quando isencaoCpas=true não há desconto para o Regime Geral → 0 para o simulador.
  const ssAnual = isencaoCpas ? 0 : resultRecibo.segSocial * recibosAno;
  const ivaAnual = mensalIva * mesesFat;
  const liquidoAnual = brutoAnual - irsAnual - ssAnual;

  // Instantâneo para o Simulador de IRS poder importar esta simulação.
  useEffect(() => {
    if (brutoAnual <= 0) return;
    gravarExportRecibosVerdes({
      faturacaoAnual: brutoAnual,
      tipoAtividade: card.tipoFiscal,
      anoAtividade,
      regimeContabilidade: "simplificado",
      irsJovemAno: jovemAno,
      acumulaEmprego,
      outrosRendimentos: acumulaEmprego ? outrosRendimentos : 0,
      isencaoSSPrimeiroAno,
      ifici,
      deficiencia,
      despSaude,
      despEducacao,
      despGerais,
      despRendas,
      atualizadoEm: Date.now(),
    });
  }, [brutoAnual, card.tipoFiscal, anoAtividade, jovemAno, acumulaEmprego, outrosRendimentos, isencaoSSPrimeiroAno, ifici, deficiencia, despSaude, despEducacao, despGerais, despRendas]);

  const estadoSaida: EstadoGuiadoSaida = {
    tipoAtiv,
    atividade: atividadeEspecifica,
    bruto,
    brutoAnual,
    regiao,
    regimeIVA: regimeEfetivo,
    acumulaEmprego,
    outrosRendimentos: acumulaEmprego ? outrosRendimentos : 0,
    isencaoSSPrimeiroAno,
    isencaoCpas,
    anoAtividade,
    irsJovemAno: jovemAno,
    despSaude,
    despEducacao,
    despGerais,
    despRendas,
    ifici,
    rnhAntigo,
    exResidente,
    deficiencia,
  };

  // ── Instantâneo COMPLETO dos campos (para reabrir/gerir) ──────────────────
  const montarSnapshot = () => ({
    anoAtividade, jaTemAtividade, tipoAtiv, atividadeEspecifica, tipoSelecionado,
    modoFat, totalInput, valorComIva, recibosItems, mesesFat, regiao, regimeIVA,
    autorObraInput, autorRoyaltiesInput,
    acumulaEmprego, outrosRendimentos, isencaoSSPrimeiroAno, isencaoCpas, irsJovemOn, irsJovemAno,
    ifici, rnhAntigo, exResidente, deficiencia, mostrarDeducoes,
    despSaude, despEducacao, despRendas, despGerais,
  });

  const nomePadraoCenario = `Recibos verdes · ${fmt(brutoAnual)}/ano`;

  function guardarCenario(nome: string) {
    const rotuloAtiv = atividadeEspecifica?.label ?? card.titulo;
    const cargaFiscal = brutoAnual > 0 ? (irsAnual + ssAnual) / brutoAnual : 0;
    const resumo: ResumoCenario = {
      destaque: Math.max(0, liquidoAnual),
      destaqueLabel: "Líquido anual",
      destaqueFmt: "eur",
      linhas: [
        { label: "Faturação anual", valor: brutoAnual, fmt: "eur" },
        { label: "IRS estimado", valor: irsAnual, fmt: "eur" },
        { label: "Segurança Social", valor: ssAnual, fmt: "eur" },
        { label: "Carga fiscal", valor: cargaFiscal, fmt: "pct" },
      ],
    };
    const r = cenariosStore.guardar({ tipo: "recibos", nome: nome || nomePadraoCenario, resumo, dados: { ...montarSnapshot(), _rotulo: rotuloAtiv } });
    setCenarioFeedback(r.erro ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: "Cenário guardado em «Os meus cenários»." });
    setDialogGuardar(false);
  }

  // Reabre um cenário marcado a partir da página de gestão (uma vez, na montagem).
  useEffect(() => {
    const d = consumirReabertura("recibos") as Partial<ReturnType<typeof montarSnapshot>> | null;
    if (!d) return;
    const set = <T,>(v: T | undefined, fn: (x: T) => void) => { if (v !== undefined) fn(v); };
    set(d.anoAtividade, setAnoAtividade); set(d.jaTemAtividade, setJaTemAtividade); set(d.tipoAtiv, setTipoAtiv);
    set(d.atividadeEspecifica, setAtividadeEspecifica); set(d.tipoSelecionado, setTipoSelecionado);
    set(d.modoFat, setModoFat);
    if (d.totalInput !== undefined) setTotalInput(sanitizeNumericDraft(d.totalInput));
    set(d.valorComIva, setValorComIva);
    if (d.recibosItems !== undefined) {
      setRecibosItems(d.recibosItems.map((item) => ({
        ...item,
        valorComIva: sanitizeNumericDraft(item.valorComIva),
      })));
    }
    if (d.autorObraInput !== undefined) setAutorObraInput(sanitizeNumericDraft(d.autorObraInput));
    if (d.autorRoyaltiesInput !== undefined) setAutorRoyaltiesInput(sanitizeNumericDraft(d.autorRoyaltiesInput));
    set(d.mesesFat, setMesesFat); set(d.regiao, setRegiao); set(d.regimeIVA, setRegimeIVA);
    set(d.acumulaEmprego, setAcumulaEmprego); set(d.outrosRendimentos, setOutrosRendimentos); set(d.isencaoSSPrimeiroAno, setIsencaoSSPrimeiroAno); set(d.isencaoCpas, setIsencaoCpas);
    set(d.irsJovemOn, setIrsJovemOn); set(d.irsJovemAno, setIrsJovemAno); set(d.ifici, setIfici);
    set(d.rnhAntigo, setRnhAntigo); set(d.exResidente, setExResidente); set(d.deficiencia, setDeficiencia);
    set(d.mostrarDeducoes, setMostrarDeducoes); set(d.despSaude, setDespSaude); set(d.despEducacao, setDespEducacao);
    set(d.despRendas, setDespRendas); set(d.despGerais, setDespGerais);
    setPasso("resultado"); // mostra logo o resultado guardado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    else if (passo === "contabilista") setPasso("resultado");
  }

  // Passo 0: situação face à atividade (+ decisor para quem ainda não abriu)
  if (passo === 0) {
    return (
      <div ref={topoRef} className="grain min-h-0 scroll-mt-20 bg-cream dark:bg-stone-950 sm:scroll-mt-24">
        <div className="mx-auto flex min-h-[58vh] max-w-md flex-col justify-center px-6 py-12 sm:px-8">
          <span className="mb-7 inline-flex items-center gap-1.5 self-start rounded-full border border-brand/20 bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark dark:bg-brand/10">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Simulador guiado
          </span>

          {/* ── Pergunta inicial: já tens atividade? ── */}
          {jaTemAtividade === null && (
            <>
              <GuiadoCabecalho
                titulo="Já tens atividade aberta?"
                subtitulo="Ajustamos o cálculo à tua situação — o 1.º e 2.º ano têm coeficiente reduzido e isenção de Segurança Social."
              />
              <div className="space-y-3">
                <GuiadoOpcao
                  leading={<Check size={18} />}
                  titulo="Sim, já trabalho como independente"
                  descricao="Vou simular os meus impostos"
                  onClick={() => setJaTemAtividade("sim")}
                />
                <GuiadoOpcao
                  leading={<Sparkle size={18} />}
                  titulo="Ainda não / estou a avaliar"
                  descricao="Ajuda-me a perceber o que preciso"
                  onClick={() => setJaTemAtividade("nao")}
                />
              </div>
            </>
          )}

          {/* ── Há quanto tempo? (define ano de atividade) ── */}
          {jaTemAtividade === "sim" && (
            <>
              <GuiadoCabecalho
                acima={<GuiadoVoltarLink onClick={() => setJaTemAtividade(null)} />}
                titulo="Há quanto tempo tens atividade?"
                subtitulo="Determina o coeficiente aplicável e a isenção de Segurança Social do 1.º ano."
              />
              <div className="space-y-3">
                {[
                  {
                    ano: 1,
                    titulo: "Estou no 1.º ano",
                    desc: "Coeficiente reduzido 50% · isenção de Segurança Social",
                  },
                  {
                    ano: 2,
                    titulo: "No 2.º ano",
                    desc: "Coeficiente reduzido 25% · já descontas para a SS",
                  },
                  {
                    ano: 3,
                    titulo: "Há 3 anos ou mais",
                    desc: "Coeficiente integral · Segurança Social normal",
                  },
                ].map((o) => (
                  <GuiadoOpcao
                    key={o.ano}
                    leading={o.ano === 3 ? "3+" : `${o.ano}.º`}
                    titulo={o.titulo}
                    descricao={o.desc}
                    onClick={() => {
                      setAnoAtividade(o.ano);
                      setIsencaoSSPrimeiroAno(o.ano === 1);
                      setPasso(1);
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Decisor: para quem ainda não abriu ── */}
          {jaTemAtividade === "nao" && (
            <>
              <GuiadoCabecalho
                acima={<GuiadoVoltarLink onClick={() => setJaTemAtividade(null)} />}
                titulo="Precisas de abrir atividade?"
                subtitulo="4 perguntas rápidas para perceber o teu caso."
              />
              <DecisorAtoIsoladoInline
                onDecisao={(d) => {
                  if (d === "RECIBO_VERDE") {
                    onIrParaSimuladorCompleto(estadoSaida);
                  } else if (d === "ABRIR_ATIVIDADE" || d === "CONSIDERAR") {
                    // Quem vai abrir agora está no 1.º ano: coef. reduzido + SS isenta.
                    setAnoAtividade(1);
                    setIsencaoSSPrimeiroAno(true);
                    setPasso(1);
                  }
                  // ATO_ISOLADO: fica no componente, mostra guia
                }}
              />
            </>
          )}

          <button
            type="button"
            onClick={() => onIrParaSimuladorCompleto(estadoSaida)}
            className="mt-5 w-full py-2.5 text-center text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
          >
            Saltar — já sei o que preciso →
          </button>
        </div>
      </div>
    );
  }

  const passoNum =
    passo === "resultado" ? 4 : passo === "contabilista" ? 5 : (passo as number);
  const PASSOS = ["Atividade", "Faturação", "Situação", "Resultado", "A seguir"];

  return (
    <div ref={topoRef} className="grain min-h-0 scroll-mt-20 bg-cream dark:bg-stone-950 sm:scroll-mt-24">
      {/* ── Cabeçalho: rótulo + stepper editorial ──────────────────────────── */}
      <div className="border-b border-stone-200/70 px-6 py-5 dark:border-stone-800 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="eyebrow mb-4 text-brand">Simulador guiado · 2026</div>
          <GuiadoStepper passos={PASSOS} atual={passoNum} />
        </div>
      </div>

      {/* ── Corpo ──────────────────────────────────────────────────────────── */}
      <div className={`mx-auto px-6 py-8 sm:px-8 ${passo === "resultado" || passo === "contabilista" || passo === 1 ? "max-w-5xl" : "max-w-3xl"}`}>
        <div className={`grid gap-8 ${passo === "resultado" || passo === "contabilista" ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_300px]"}`}>
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
                    isentoEfetivo={isentoEfetivo}
                    taxaIvaEfetiva={taxaIvaEfetiva}
                    tipoAtiv={tipoAtiv}
                    atividadeEspecifica={atividadeEspecifica}
                    autorObraInput={autorObraInput}
                    autorRoyaltiesInput={autorRoyaltiesInput}
                    desdobramentoAutor={desdobramentoAutor}
                    situacaoIvaAutor={situacaoIvaAutor}
                    onModoFat={setModoFat}
                    onTotalInput={(value) => setTotalInput(sanitizeNumericDraft(value))}
                    onValorComIva={setValorComIva}
                    onRecibosItems={setRecibosItems}
                    onMesesFat={setMesesFat}
                    onRegiaoChange={setRegiao}
                    onRegimeIVAChange={setRegimeIVA}
                    onAutorObra={(value) => setAutorObraInput(sanitizeNumericDraft(value))}
                    onAutorRoyalties={(value) => setAutorRoyaltiesInput(sanitizeNumericDraft(value))}
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
                    ssAnualPoupanca={ssAnualPoupanca}
                    outrosRendimentos={outrosRendimentos}
                    setOutrosRendimentos={setOutrosRendimentos}
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
                    simAnual={simPreview}
                    brutoAnual={brutoAnual}
                    liquidoAnual={liquidoAnual}
                    irsAnual={irsAnual}
                    ssAnual={ssAnual}
                    ivaAnual={ivaAnual}
                    taxaIVA={mensalSemIva > 0 ? mensalIva / mensalSemIva : 0}
                    regimeIVA={regimeEfetivo}
                    recibosAno={recibosAno}
                    resultRecibo={resultRecibo}
                    card={card}
                    atividadeEspecifica={atividadeEspecifica}
                    regiao={regiao}
                    tipoAtiv={tipoAtiv}
                    anoAtividade={anoAtividade}
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
                    onVoltar={() => setPasso(3)}
                    onProximosPassos={() => setPasso("contabilista")}
                    onGuardarRecibo={onGuardarRecibo ? (cliente: string) => onGuardarRecibo({
                      valor: bruto,
                      tipo: card.tipoFiscal,
                      atividade: atividadeEspecifica?.label,
                      regiao,
                      regimeIVA: regimeEfetivo,
                      baseSS: card.baseSS,
                      dispensaRetencao: brutoAnual < DISPENSA_RETENCAO_LIMITE.value,
                      _computed: {
                        irsEstimado: irsAnual / recibosAno,
                        segSocial: ssAnual / recibosAno,
                        iva: ivaAnual / recibosAno,
                        liquido: liquidoAnual / recibosAno,
                      },
                    }, cliente) : undefined}
                  />

                  {/* ── Guardar este cenário na página de gestão ── */}
                  <div className="mt-6 rounded-2xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Guardar este cenário</p>
                        <p className="text-xs text-stone-400">
                          Preserva todos os campos em{" "}
                          <Link href="/dashboard/cenarios" className="font-medium text-brand-dark underline-offset-2 hover:underline dark:text-brand">Os meus cenários</Link>
                          {" "}— para reabrir mais tarde.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDialogGuardar(true)}
                        disabled={cenariosStore.limiteAtingido}
                        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check size={15} /> Guardar cenário
                      </button>
                    </div>
                    {cenarioFeedback && (
                      <div className={`mt-3 flex items-start gap-2.5 rounded-xl border p-3 text-xs ${cenarioFeedback.tipo === "ok" ? "border-brand/20 bg-brand-light text-brand-dark" : "border-alert-border bg-alert-bg text-alert-text"}`}>
                        {cenarioFeedback.tipo === "ok" ? <Check size={13} className="mt-0.5 flex-shrink-0" /> : <Warning size={13} className="mt-0.5 flex-shrink-0" />}
                        <span>
                          {cenarioFeedback.texto}{" "}
                          {cenarioFeedback.tipo === "ok"
                            ? <Link href="/dashboard/cenarios" className="font-semibold underline underline-offset-2">Ver cenários</Link>
                            : <Link href="/dashboard/upgrade" className="font-semibold underline underline-offset-2">Ver o plano Plus</Link>}
                        </span>
                      </div>
                    )}
                  </div>
                </m.div>
              )}

              {passo === "contabilista" && (
                <m.div
                  key="contabilista"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Ponto 12.3 da arquitetura: o simulador mantém o resultado
                      e a memória de cálculo, e ganha um plano de ação com
                      handoff escolhido pelo utilizador. Não aparece nada
                      enquanto a integração estiver desligada.

                      Fica ANTES do mapa de contabilistas: quem chega aqui já
                      tem a conta feita e quer saber o que fazer a seguir — a
                      execução é o passo imediato, procurar contabilista é a
                      alternativa para quem prefere delegar tudo. */}
                  <FizPlanoAcao
                    className="mb-6"
                    simulador="recibos-verdes"
                    valores={{
                      entityType: "INDIVIDUAL",
                      activityCategory: atividadeEspecifica?.label,
                      vatTerritory:
                        regiao === "madeira" ? "MADEIRA" : regiao === "acores" ? "AZORES" : "CONTINENTAL",
                      vatRegimeEstimate: vatRegimeEstimateFiz,
                      period: "ANNUAL",
                      grossEstimate: Math.round(brutoAnual),
                      vatEstimate: Math.round(ivaAnual),
                      socialSecurityEstimate: Math.round(ssAnual),
                      irsEstimate: Math.round(irsAnual),
                    }}
                    passosPreparacao={[
                      "Atividade classificada e coeficiente confirmado.",
                      "Regime de IVA e retenção na fonte determinados.",
                      "Estimativa anual de IRS e Segurança Social calculada.",
                    ]}
                  />

                  <PassoContabilista
                    faturacaoAnual={brutoAnual}
                    onVoltar={() => setPasso("resultado")}
                  />
                </m.div>
              )}
            </AnimatePresence>

            {/* ── Navegação ────────────────────────────────────────────── */}
            {passo !== "resultado" && passo !== "contabilista" && (
              <GuiadoNav
                onVoltar={recuar}
                voltarLabel={passo === 1 ? "Recomeçar" : "Voltar"}
                onAvancar={avancar}
                avancarLabel={passo === 3 ? "Ver o meu resultado" : "Continuar"}
                avancarDisabled={passo === 1 && !tipoSelecionado}
                onSaltar={() => onIrParaSimuladorCompleto(estadoSaida)}
              />
            )}
          </div>

          {/* ── Painel em direto ───────────────────────────────────────── */}
          {passo !== "resultado" && passo !== "contabilista" && (
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

      <GuardarCenarioDialog
        aberto={dialogGuardar}
        nomePadrao={nomePadraoCenario}
        onGuardar={guardarCenario}
        onFechar={() => setDialogGuardar(false)}
        titulo="Guardar cenário"
      />
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
      <GuiadoCabecalho
        titulo="O que fazes?"
        subtitulo="Escolhe a categoria que melhor te representa — determina a retenção, o coeficiente e a Segurança Social."
      />

      {/* Grid de categorias */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARDS_ATIV.map(({ id, titulo, sub, exemplos, coef, ret, Icon }) => {
          const active = tipoAtiv === id && tipoSelecionado;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelecionarTipo(id)}
              className={`group relative overflow-hidden rounded-3xl border p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
                active
                  ? "border-brand bg-brand-light"
                  : "border-stone-200/80 bg-white hover:border-brand/40 dark:border-stone-800 dark:bg-stone-900"
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
        <div className="mb-3 flex items-center gap-2 sm:gap-3">
          <span className="h-px min-w-[12px] flex-1 bg-stone-200 dark:bg-stone-800" />
          <span className="whitespace-nowrap text-center text-[11px] font-medium text-stone-400 sm:text-xs">
            ou escolhe a tua atividade específica
          </span>
          <span className="h-px min-w-[12px] flex-1 bg-stone-200 dark:bg-stone-800" />
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
                    <div className="mt-3 rounded-3xl border border-stone-100 bg-white shadow-card p-4 dark:border-stone-800 dark:bg-stone-900">
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
  isentoEfetivo,
  taxaIvaEfetiva,
  tipoAtiv,
  atividadeEspecifica,
  autorObraInput,
  autorRoyaltiesInput,
  desdobramentoAutor,
  situacaoIvaAutor,
  onModoFat,
  onTotalInput,
  onValorComIva,
  onRecibosItems,
  onMesesFat,
  onRegiaoChange,
  onRegimeIVAChange,
  onAutorObra,
  onAutorRoyalties,
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
  isentoEfetivo: boolean;
  taxaIvaEfetiva: number;
  tipoAtiv: TipoAtiv;
  atividadeEspecifica: Atividade | null;
  autorObraInput: string;
  autorRoyaltiesInput: string;
  desdobramentoAutor: DesdobramentoAutor | null;
  /** Situação já resolvida pelo motor para o ramo dos direitos de autor. */
  situacaoIvaAutor: SituacaoIVAResultado | null;
  onModoFat: (m: "total" | "individual") => void;
  onTotalInput: (v: string) => void;
  onValorComIva: (v: boolean) => void;
  onRecibosItems: React.Dispatch<React.SetStateAction<ReciboItem[]>>;
  onMesesFat: (m: number) => void;
  onRegiaoChange: (v: Regiao) => void;
  onRegimeIVAChange: (v: RegimeIVA) => void;
  onAutorObra: (v: string) => void;
  onAutorRoyalties: (v: string) => void;
}) {
  const taxasIVA = IVA_TAXAS[regiao].value;
  // Taxa efetiva de IVA = a do componente-pai (regime EFETIVO: 0 quando isento
  // por estar abaixo do limite). É a única fonte de verdade, para o desdobramento
  // e o seletor "com/sem IVA" acompanharem a situação real.
  const taxaIvaAtual = taxaIvaEfetiva;

  function adicionarRecibo() {
    onRecibosItems((prev) => {
      const ultimaIva = prev[prev.length - 1]?.taxaIva ?? taxasIVA.normal;
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
    const normalized = campo === "valorComIva" && typeof valor === "string"
      ? sanitizeNumericDraft(valor)
      : valor;
    onRecibosItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [campo]: normalized } : r)),
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
      <GuiadoCabecalho
        titulo="Quanto faturaste?"
        subtitulo="Indica quanto faturas por mês e em quantos meses do ano. A situação de IVA é tratada mais abaixo."
      />

      {/* Direitos de autor: desdobramento obra própria (isento) + royalties (23%) */}
      {desdobramentoAutor && (
        <div className="mb-5 space-y-3 rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Divide a tua faturação por tipo
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
              A obra própria é isenta de IVA (Art. 9.º, n.º 16 CIVA); royalties e
              licenciamento são à taxa normal ({pct(taxasIVA.normal)}). Preenche o que
              tiveres de cada — podes ter os dois.
            </p>
          </div>

          {/* Obra própria */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">
              Obra própria <span className="font-normal text-stone-400">— livros, música, arte (isento)</span>
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={autorObraInput}
                onChange={(e) => onAutorObra(e.target.value)}
                placeholder="0,00"
                aria-label="Faturação mensal de obra própria (isento)"
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-stone-800 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
            </div>
          </label>

          {/* Royalties / licenciamento */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">
              Royalties / licenciamento <span className="font-normal text-stone-400">— software, marca, patente ({pct(taxasIVA.normal)})</span>
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={autorRoyaltiesInput}
                onChange={(e) => onAutorRoyalties(e.target.value)}
                placeholder="0,00"
                aria-label="Faturação mensal de royalties ou licenciamento"
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-stone-800 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
            </div>
          </label>

          {/* Resumo do desdobramento */}
          {desdobramentoAutor.total > 0 && (
            <div className="space-y-1.5 rounded-xl bg-stone-50 px-4 py-3 dark:bg-stone-800/60">
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">Faturação total/mês</span>
                <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">{fmt(desdobramentoAutor.total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                {/* Só o montante. O porquê — obra isenta pelo Art. 9.º,
                    limiar do Art. 53.º só sobre os royalties, transição do
                    Art. 58.º — está no painel de situação de IVA, escrito
                    pelo motor. Repeti-lo aqui era escrevê-lo a menos. */}
                <span className="text-stone-400">IVA a cobrar (só royalties)</span>
                <span className="font-semibold tabular-nums text-stone-400">{fmt(desdobramentoAutor.ivaRoyalties)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs modo */}
      {!desdobramentoAutor && (
      <div className="mb-5 flex gap-1 rounded-3xl bg-stone-100 p-1 dark:bg-stone-800">
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
      )}

      {/* Modo: total do mês */}
      {!desdobramentoAutor && modoFat === "total" && (
        <div className="mb-5 rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
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

          {/* Isento — não há IVA a separar; o valor introduzido é a faturação. */}
          {montanteTotal > 0 && isentoEfetivo && (
            <p className="rounded-xl bg-brand-light/60 px-4 py-2.5 text-[11px] leading-relaxed text-brand-dark dark:bg-brand/10">
              Isento de IVA (abaixo de {fmt(IVA_LIMITE)}/ano) — este valor é a tua faturação, sem IVA a separar.
            </p>
          )}
        </div>
      )}

      {/* Modo: recibo a recibo */}
      {!desdobramentoAutor && modoFat === "individual" && (
        <div className="mb-5">
          {recibosItems.map((r, i) => {
            const v = parseMontante(r.valorComIva);
            const base = r.taxaIva > 0 ? v / (1 + r.taxaIva) : v;
            const ivaItem = v - base;
            return (
              <div
                key={r.id}
                className="mb-3 rounded-3xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900"
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
                      {ivaOpcoesFat(regiao).map((o) => (
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
            className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-stone-300 bg-white py-3 text-sm font-semibold text-brand transition-all hover:border-brand/50 hover:bg-brand-light/30 dark:border-stone-700 dark:bg-transparent"
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

      {/* IVA.
          Sem rótulo próprio: o painel partilhado já traz o seu, com a região
          e a base legal. Haver os dois mostrava "Situação de IVA" duas vezes
          seguidas, uma sem região e outra com.

          Os direitos de autor deixaram de ter bloco à parte. Tinham-no porque
          a regra estava escrita aqui à mão — e escrita a menos: dizia
          "isento por ficar abaixo de 15 000 €/ano" a quem já tinha passado o
          limiar e só mantém a isenção até janeiro (Art. 58.º, n.º 2, al. a).
          A zona `autor_misto` do motor resolve os três estados e escreve a
          explicação; o painel desenha-a como desenha as outras. */}
      <div className="mb-6">
        <SituacaoIVAPainel
          situacao={
            situacaoIvaAutor ??
            situacaoIVA({
              faturacaoAnual: brutoAnual,
              regiao,
              regimeEscolhido: regimeIVA,
              categoria: tipoAtiv,
              entidade: "ti",
              isentoEfetivo,
            })
          }
          regiao={regiao}
          regimeEscolhido={regimeIVA}
          // Nos direitos de autor a taxa não é uma escolha: decorre da divisão
          // entre obra e royalties feita em cima.
          onRegimeChange={situacaoIvaAutor ? undefined : onRegimeIVAChange}
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
      <div className="mt-6 rounded-3xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900">
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
        <div className="mt-4 rounded-3xl border border-brand/25 bg-brand-light/40 p-4 dark:bg-brand/10">
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
  outrosRendimentos,
  setOutrosRendimentos,
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
  /** Rendimento anual bruto da Categoria A, para englobamento. */
  outrosRendimentos: number;
  setOutrosRendimentos: (v: number) => void;
}) {
  const isencaoSS = isencaoSSPrimeiroAno || acumulaEmprego || isencaoCpas;
  const deducoesTotal =
    despSaude * 0.15 +
    despEducacao * 0.3 +
    despRendas * 0.15 +
    despGerais * 0.35;

  return (
    <div>
      <GuiadoCabecalho
        titulo="A tua situação"
        subtitulo="Responde ao que se aplica — pode poupar centenas de euros por ano."
      />

      <div className="space-y-5">
        {/* ── Secção SS ─────────────────────────────────────────────────── */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
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
              descricao={`Se o teu empregador paga SS ≥ ${fmt(IAS.value)}/mês ficas dispensado como independente — mas só até ${fmt(SS_ACUMULACAO_LIMITE_MENSAL.value)}/mês de rendimento relevante. Acima disso contribuis sobre o excedente (Art. 157.º).`}
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
            >
              {/* O salário TEM de ser perguntado aqui.
                  Este toggle desligava a Segurança Social e mais nada: o IRS
                  continuava a ser calculado como se a pessoa só tivesse os
                  recibos verdes, a começar no primeiro escalão. Para 30 000 €
                  de salário e 15 000 € de recibos verdes, o simulador dizia
                  1 175 € de IRS quando o englobamento (Art. 22.º CIRS) dá
                  3 926 € — quase 2 800 € a menos, e sempre no sentido em que a
                  pessoa reserva a menos e é apanhada na liquidação. */}
              {acumulaEmprego && (
                <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 dark:border-stone-700 dark:bg-stone-800/60">
                  <label htmlFor="guiado-cat-a" className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">
                      Quanto ganhas por ano nesse emprego?{" "}
                      <span className="font-normal text-stone-400">— bruto anual, Cat. A</span>
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                        €
                      </span>
                      <LocalizedNumberInput
                        id="guiado-cat-a"
                        min={0}
                        value={outrosRendimentos}
                        onValueChange={setOutrosRendimentos}
                        placeholder="0"
                        className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                      />
                    </div>
                  </label>
                  <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    O IRS é único e incide sobre a soma dos rendimentos (Art. 22.º CIRS). Sem
                    este valor, a atividade independente seria tributada a começar no primeiro
                    escalão — e o imposto sairia bastante abaixo do real.
                  </p>
                </div>
              )}
            </ToggleCard>
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
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
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
                  <p className="mt-2 rounded-lg bg-stone-50 px-2.5 py-2 text-[10px] leading-relaxed text-stone-500 dark:bg-stone-800/60 dark:text-stone-400">
                    Além da idade (≤ 35 anos a 31 de dezembro), o Art. 12.º-B CIRS exige não seres considerado dependente, ter a situação fiscal e contributiva regularizada, e não teres beneficiado de IFICI/RNH no mesmo ano. O simulador não verifica estas condições — confirma o teu enquadramento antes de contar com esta isenção.
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
            className={`flex w-full items-center justify-between rounded-3xl border px-4 py-3.5 text-left transition-all ${
              mostrarDeducoes
                ? "border-brand bg-brand-light/30"
                : "border-stone-100 bg-white shadow-card hover:border-stone-200 dark:border-stone-800 dark:bg-stone-900"
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
                        <LocalizedNumberInput
                          value={val}
                          onValueChange={set}
                          min={0}
                          max={max}
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
    <div className="rounded-3xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900">
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

function GuardarReciboBtn({ onGuardar }: { onGuardar: (cliente: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [cliente, setCliente] = useState("");
  const [guardado, setGuardado] = useState(false);

  if (guardado) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-brand/30 bg-brand-light px-5 py-3 text-sm font-semibold text-brand-dark dark:bg-brand/10 dark:border-brand/20 dark:text-brand">
        <Check size={16} />
        Recibo guardado no painel
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand bg-white px-5 py-3 text-sm font-semibold text-brand transition-all hover:bg-brand-light dark:bg-stone-900 dark:hover:bg-brand/10"
      >
        <ArrowRight size={14} />
        Guardar no painel
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-brand/30 bg-brand-light/50 p-4 dark:bg-brand/5 dark:border-brand/20">
      <label className="block text-xs font-medium text-stone-600 dark:text-stone-300">
        Nome do cliente
      </label>
      <input
        type="text"
        value={cliente}
        onChange={(e) => setCliente(e.target.value)}
        placeholder="Ex: Empresa X"
        autoFocus
        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!cliente.trim()}
          onClick={() => {
            onGuardar(cliente.trim());
            setGuardado(true);
          }}
          className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => { setAberto(false); setCliente(""); }}
          className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-500 transition-all hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

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
  atividadeEspecifica,
  regiao,
  tipoAtiv,
  anoAtividade,
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
  simAnual,
  onIrParaSimuladorCompleto,
  onRecomecar,
  onVoltar,
  onProximosPassos,
  onGuardarRecibo,
}: {
  /** Apuramento anual já calculado pelo pai — não recalcular aqui. */
  simAnual: SimulacaoIRS;
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
  atividadeEspecifica: Atividade | null;
  regiao: Regiao;
  tipoAtiv: TipoAtiv;
  anoAtividade: number;
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
  onVoltar: () => void;
  onProximosPassos: () => void;
  onGuardarRecibo?: (cliente: string) => void;
}) {
  // `simAnual` chega calculado do componente-pai.
  //
  // Havia aqui uma segunda chamada a `simularIRSAnual` com a sua própria lista
  // de inputs — e a lista divergia: tinha `isencaoSS` nas dependências sem o
  // usar no cálculo, e não recebia o englobamento nem as isenções de SS que
  // entram na regra dos 15%. Duas execuções do mesmo motor com entradas
  // diferentes é uma divergência à espera de acontecer; o ecrã de resultado é
  // precisamente onde ela seria mais cara.
  const taxaEfetiva =
    brutoAnual > 0 ? (simAnual.irsImputavelCatB + ssAnual) / brutoAnual : 0;
  const liquidoFinal = brutoAnual - simAnual.irsImputavelCatB - ssAnual;

  // Deduções à coleta detalhadas (para mostrar no bloco IRS)
  const deducoesColeta = simAnual.deducaoDespesas + simAnual.deducaoDeficiencia;
  const temDeducoes = deducoesColeta > 0;

  // Escalões — expandir/colapsar
  const [mostrarEscaloes, setMostrarEscaloes] = useState(false);
  // Blocos de detalhe — colapsados por defeito
  const [mostrarBloco1, setMostrarBloco1] = useState(false);
  const [mostrarBloco2, setMostrarBloco2] = useState(false);

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
  const liquidoMes = liquidoFinal / Math.max(1, recibosAno);

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
      <GuiadoCabecalho
        eyebrow="Resultado"
        titulo="O teu resultado"
        subtitulo={`Estimativa para ${recibosAno} ${recibosAno === 1 ? "mês" : "meses"} de atividade.`}
      />

      {/* ── Layout 2 colunas ─────────────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-[1fr_280px] md:items-start">

        {/* ════ COLUNA PRINCIPAL ════════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* ── Hero: Líquido anual ──────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-4xl border border-brand-dark bg-brand-dark p-5 text-white shadow-glow">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
            <div className="relative">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-white/90">
                Líquido anual estimado
              </div>
              <div className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums sm:text-5xl">
                <AnimatedNumber value={Math.max(0, liquidoFinal)} />
              </div>
              <div className="mt-3">
                <div className="flex h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="rounded-full bg-white/70 transition-all duration-500"
                    style={{ width: `${Math.round(Math.max(0, liquidoFinal) / Math.max(1, brutoAnual) * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/85">
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

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-3xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">IRS anual</p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {fmt(simAnual.irsEstimado)}
              </p>
              <p className="mt-0.5 text-[11px] tabular-nums text-stone-400">{pct(pcIRS)} do faturado</p>
            </div>

            <div className="rounded-3xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                {isencaoCpas ? "SS*" : "Seg. Social"}
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {isencaoCpas ? "—" : fmt(ssAnual)}
              </p>
              <p className="mt-0.5 text-[11px] tabular-nums text-stone-400">
                {isencaoCpas ? "CPAS" : `${pct(pcSS)} do faturado`}
              </p>
            </div>

            {ivaAnual > 0 && (
              <div className="rounded-3xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900">
                <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">IVA cobrado</p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                  {fmt(ivaAnual)}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-stone-400">{pct(pcIVA)} do total</p>
              </div>
            )}

            <div className="rounded-3xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Líquido/mês</p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-brand">
                {fmt(liquidoMes)}
              </p>
              <p className="mt-0.5 text-[11px] tabular-nums text-stone-400">
                {fmt(brutoAnual / Math.max(1, recibosAno))} faturado
              </p>
            </div>
          </div>

          {/* ── Breakdown visual ─────────────────────────────────────────── */}
          <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
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

          {/* ── BLOCO 1: O teu líquido (colapsável) ─────────────────────── */}
          <div className="rounded-3xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900">
            <button
              type="button"
              aria-expanded={mostrarBloco1}
              onClick={() => setMostrarBloco1((v) => !v)}
              className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left hover:bg-stone-50/60 dark:hover:bg-stone-800/30"
            >
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                1
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">O teu dinheiro</p>
                <p className="text-[10px] text-stone-400">Faturação → SS → IRS → líquido</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold tabular-nums text-brand">{fmt(Math.max(0, liquidoFinal))}</span>
                <ChevronDown size={13} className={`text-stone-400 transition-transform ${mostrarBloco1 ? "rotate-180" : ""}`} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {mostrarBloco1 && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-stone-100 dark:border-stone-800">
                    {/* Faturação */}
                    <LinhaCalculo
                      label="Faturação bruta (sem IVA)"
                      valor={brutoAnual}
                      corValor="text-stone-800 dark:text-stone-100"
                      explicacao="A tua faturação no ano, sem IVA — é a base sobre a qual incidem a Segurança Social e o IRS. O IVA é cobrado ao cliente à parte (linha seguinte) e não é teu."
                    />
                    <div className="border-t border-stone-100 dark:border-stone-800" />

                    {/* IVA */}
                    {regimeIVA === "isento" ? (
                      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <div className="min-w-0">
                          <span className="text-xs text-stone-400 dark:text-stone-500">IVA</span>
                          <span className="ml-1.5 text-[10px] text-stone-400">(isento — Art. 53.º CIVA)</span>
                        </div>
                        <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-400">—</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                          <div className="min-w-0">
                            <span className="text-xs text-stone-600 dark:text-stone-400">IVA cobrado ao cliente</span>
                            <span className="ml-1.5 text-[10px] text-stone-400">({pct(taxaIVA)} × {fmt(brutoAnual)})</span>
                          </div>
                          <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-500 dark:text-stone-400">
                            +{fmt(ivaAnual)}
                          </span>
                        </div>
                        <div className="mx-3 mb-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-900/20">
                          <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                            <span className="font-semibold">O IVA não é teu.</span> Cobras {fmt(ivaAnual)} ao cliente, guardas numa conta separada, e entregas ao Estado trimestralmente.
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
                      nota={isencaoCpas ? "Não descontas para o Regime Geral" : `${pct(SS_TAXA.value)} × base SS`}
                      explicacao={isencaoCpas
                        ? "Advogados e solicitadores pagam para a CPAS em vez do Regime Geral. As contribuições CPAS têm regras próprias — consulta o teu painel CPAS."
                        : `Como trabalhador independente pagas ${pct(SS_TAXA.value)} de SS sobre ${pct(SS_COEFICIENTE[card.baseSS].value)} do que faturaste.`}
                    />
                    {isencaoCpas && (
                      <div className="mx-3 mb-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-800/60">
                        <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                          <span className="font-semibold">CPAS — não modelado.</span> O teu líquido real é inferior ao estimado.
                        </p>
                      </div>
                    )}
                    <div className="border-t border-stone-100 dark:border-stone-800" />

                    {/* IRS */}
                    <LinhaCalculo
                      label={
                        simAnual.ificiAplicado ? "IRS (taxa flat 20% — IFICI/RNH 2.0)"
                          : simAnual.rnhAntigoAplicado ? "IRS (taxa flat 20% — RNH antigo)"
                          : simAnual.programaRegressarAplicado ? "IRS (escalões sobre 50% — Programa Regressar)"
                          : "IRS (após deduções)"
                      }
                      valor={-simAnual.irsEstimado}
                      corValor="text-red-500 dark:text-red-400"
                      nota="ver cálculo detalhado abaixo"
                      explicacao={
                        simAnual.ificiAplicado || simAnual.rnhAntigoAplicado
                          ? `Taxa flat de 20% sobre o rendimento coletável (${fmt(simAnual.rendimentoColetavel)}).`
                          : `IRS calculado pelos escalões progressivos sobre o rendimento tributável.`
                      }
                    />
                    <div className="border-t border-stone-200 dark:border-stone-700" />

                    {/* Total */}
                    <LinhaCalculo
                      label="Líquido disponível"
                      valor={Math.max(0, liquidoFinal)}
                      corValor="text-brand"
                      isTotal
                      nota={`Taxa efectiva ${pct(taxaEfetiva)}`}
                      explicacao={`Faturação (${fmt(brutoAnual)}) − SS (${fmt(ssAnual)}) − IRS (${fmt(simAnual.irsEstimado)}) = ${fmt(Math.max(0, liquidoFinal))}.`}
                    />
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── BLOCO 2: Como se calculou o IRS (colapsável) ─────────────── */}
          <div className="rounded-3xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900">
        {/* Cabeçalho bloco — botão */}
        <button
          type="button"
          aria-expanded={mostrarBloco2}
          onClick={() => setMostrarBloco2((v) => !v)}
          className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left hover:bg-stone-50/60 dark:hover:bg-stone-800/30"
        >
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            2
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
              Como se calculou o IRS
            </p>
            <p className="text-[10px] text-stone-400">
              Da faturação ao imposto final, passo a passo
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold tabular-nums text-red-500 dark:text-red-400">{fmt(simAnual.irsEstimado)}</span>
            <ChevronDown size={13} className={`text-stone-400 transition-transform ${mostrarBloco2 ? "rotate-180" : ""}`} />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {mostrarBloco2 && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-stone-100 dark:border-stone-800">
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

        {/* Englobamento da Cat. A — o passo que faltava.
            Sem esta linha o utilizador via o coletável saltar sem explicação;
            e antes desta versão nem sequer saltava: o salário não entrava no
            cálculo, e a atividade era tributada a começar no 1.º escalão. */}
        {simAnual.outrosRendimentos > 0 && (
          <>
            <LinhaCalculo
              label="Salário anual (Categoria A)"
              valor={simAnual.outrosRendimentos}
              corValor="text-stone-700 dark:text-stone-200"
              nota="englobamento — Art. 22.º CIRS"
              explicacao={`O IRS é um imposto único sobre a soma dos rendimentos. O teu salário (${fmt(simAnual.outrosRendimentos)}) ocupa os escalões mais baixos, e a atividade independente é tributada por cima — a uma taxa marginal mais alta. É por isso que os mesmos recibos verdes pagam mais IRS a quem também tem emprego.`}
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
                  <div className="mx-3 mb-2 overflow-x-auto rounded-xl border border-stone-100 dark:border-stone-700">
                    <table className="w-full min-w-[300px] text-[11px]">
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
                              {fmt(e.rendimento)}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-stone-700 dark:text-stone-200">
                              {pct(e.taxa)}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-red-500 dark:text-red-400">
                              {fmt(e.imposto)}
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
                            {fmt(simAnual.coletaBruta)}
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
                  Abatimento de {fmt(simAnual.abatimentoMinimoExistencia)} ao
                  rendimento coletável, calculado pela fórmula por troços do
                  artigo 70.º: de {fmt(simAnual.rendimentoColetavelAntesMinimo)}
                  para {fmt(simAnual.rendimentoColetavel)} antes dos escalões.
                </p>
              </div>
            </div>
          </>
        )}

        {simAnual.minimoExistenciaDecision.status === "needs_input" && (
          <>
            <div className="border-t border-stone-100 dark:border-stone-800" />
            <div className="flex items-start gap-2.5 px-4 py-2.5">
              <Warning size={12} className="mt-0.5 flex-shrink-0 text-alert-text" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-alert-text">
                  Mínimo de existência por confirmar
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                  {simAnual.minimoExistenciaDecision.reason} O simulador não
                  aplicou um valor aproximado nem tratou dados desconhecidos
                  como zero.
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
              ? `IRS final = coleta bruta (${fmt(simAnual.coletaBruta)}) − deduções à coleta (${fmt(deducoesColeta)}) = ${fmt(simAnual.irsEstimado)}.${simAnual.outrosRendimentos > 0 ? " Inclui o imposto do salário." : " Este é o valor que aparece no Bloco 1."}`
              : `IRS final = coleta bruta calculada pelos escalões progressivos sobre o rendimento tributável de ${fmt(simAnual.rendimentoTributavel)}.`
          }
        />

        {/* Com englobamento há dois números de IRS e ambos são verdadeiros: o
            do agregado (acima) e a parte que os recibos verdes acrescentam.
            É esta segunda que se compara com a faturação e com as retenções —
            e é a única que faz sentido subtrair para chegar a um líquido da
            atividade. Mostrar só uma delas deixava o outro número por
            explicar no ecrã ao lado. */}
        {simAnual.outrosRendimentos > 0 && (
          <LinhaCalculo
            label="Parte imputável aos recibos verdes"
            valor={-simAnual.irsImputavelCatB}
            corValor="text-red-500 dark:text-red-400"
            nota={`${fmt(simAnual.irsEstimado)} − o que pagarias só com o salário`}
            explicacao={`Do IRS total do agregado (${fmt(simAnual.irsEstimado)}), esta é a parte que a atividade independente acrescenta: a diferença entre o imposto com e sem ela. É marginal, não proporcional — o salário já ocupa os escalões de baixo, por isso os recibos verdes são tributados por cima. É este o valor a comparar com as retenções que já fizeste.`}
          />
        )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
          </div>

          {/* ── Aviso ────────────────────────────────────────────────────── */}
          <div className="flex items-start gap-2.5 rounded-3xl border border-alert-border bg-alert-bg px-4 py-3">
            <Warning size={13} className="mt-0.5 flex-shrink-0 text-alert-text" />
            <p className="text-xs leading-relaxed text-alert-text">
              Estimativa informativa. IRS e SS são adiantamentos — o apuramento
              final depende da declaração de rendimentos. Verifica com o teu
              contabilista.
            </p>
          </div>
        </div>

        {/* ════ COLUNA LATERAL: prazos + ações ══════════════════════════════ */}
        <div className="min-w-0 space-y-4 md:sticky md:top-6">
          {/* ── CTAs ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2.5">
            {onGuardarRecibo && (
              <GuardarReciboBtn onGuardar={onGuardarRecibo} />
            )}
            <button
              type="button"
              onClick={onProximosPassos}
              className="btn-shine flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:bg-brand-dark hover:shadow-float"
            >
              <Sparkle size={14} />
              O que fazer a seguir
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={onIrParaSimuladorCompleto}
              className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            >
              Simulador completo <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={onVoltar}
              className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-600 transition-all hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            >
              <ArrowLeft size={14} />
              Alterar dados
            </button>
            <button
              type="button"
              onClick={onRecomecar}
              className="flex items-center justify-center gap-2 rounded-2xl px-5 py-2 text-xs text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
            >
              Recomeçar do início
            </button>
          </div>

          {/* ── Calendário fiscal ───────────────────────────────────────── */}
          <div className="rounded-3xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
              <Calendar size={14} className="flex-shrink-0 text-brand" />
              <div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                  Próximos prazos
                </p>
                <p className="text-[10px] text-stone-400">
                  Relevantes para a tua situação
                  {regimeIVA === "isento" ? " (sem IVA)" : ""}
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
        </div>
      </div>
    </div>
  );
}

// ─── Painel lateral em direto ───────────────────────────────────────────────────

const PASSO_DICA: Record<1 | 2 | 3, { titulo: string; desc: string }> = {
  1: {
    titulo: "A categoria importa",
    desc: "A retenção e o coeficiente variam bastante. Um programador (23%) vs outros serviços (11,5%).",
  },
  2: {
    titulo: "Isenção de IVA",
    desc: `Ficas isento se a tua faturação anual não passar os ${fmt(IVA_LIMITE)} (Art. 53.º CIVA). No 1.º ano conta o volume de negócios estimado até ao fim do ano (sem anualização); nos anos seguintes conta a faturação do ano civil anterior.`,
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
        <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 p-5 text-center dark:border-stone-700 dark:bg-stone-900/60">
          <p className="text-xs text-stone-400">
            Seleciona a tua atividade para ver o resultado em direto
          </p>
        </div>
        <div className="rounded-3xl border border-brand/15 bg-brand-light/20 p-4">
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
      <div className="relative overflow-hidden rounded-4xl border border-brand-dark bg-brand-dark p-5 text-white shadow-glow">
        <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/90">
            Resultado em direto
          </p>

          <div className="mb-1">
            <div className="text-[11px] text-white/90">
              {recibosAno >= 12 ? "Líquido mensal" : "Líquido por mês faturado"}
            </div>
            <div className="font-display text-3xl font-semibold leading-none tabular-nums">
              <AnimatedNumber
                value={Math.max(
                  0,
                  liquidoAnual / Math.max(1, recibosAno),
                )}
              />
            </div>
            <div className="mt-0.5 text-[11px] text-white/85">
              {fmt(brutoAnual > 0 ? brutoAnual / Math.max(1, recibosAno) : 0)}{" "}
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
              <div className="mt-1 text-[10px] text-white/85">
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
      <div className="rounded-3xl border border-brand/15 bg-brand-light/20 p-4">
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

// O `ZonaIVA` vivia aqui: uma segunda leitura das mesmas regras de IVA,
// mais pobre do que a do modo completo. Para os mesmos números, a mesma
// pessoa era tratada de maneira diferente consoante o modo.
//
// A decisão está agora em `src/lib/fiscal-iva.ts` e o desenho em
// `src/components/simulador/SituacaoIVA.tsx`, partilhados pelos dois modos.


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
      className={`rounded-3xl border p-4 transition-all ${
        desativado
          ? "border-stone-100 bg-stone-50 opacity-60 dark:border-stone-800 dark:bg-stone-900/40"
          : ativo
            ? "border-brand bg-brand-light/40"
            : "border-stone-100 bg-white shadow-card hover:border-stone-200 dark:border-stone-800 dark:bg-stone-900"
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
