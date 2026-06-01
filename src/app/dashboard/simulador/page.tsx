"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { simularIRSAnual, calcularCategoriaF, type DependentesDetalhe } from "@/lib/fiscal";
import { useRecibos } from "@/lib/store/recibos";
import { fmt, pct } from "@/lib/format";
import { Warning, Check, ChartProjection, ArrowRight } from "@/components/ui/Icons";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import InfoTip from "@/components/ui/InfoTip";
import ProHint from "@/components/ui/ProHint";
import PartnerSpot from "@/components/dashboard/PartnerSpot";
import {
  ATIVIDADES,
  efeitoFiscal,
  IRS_JOVEM,
  REGIME_SIMPLIFICADO,
  DEDUCAO_ESPECIFICA_CATB,
  MINIMO_EXISTENCIA,
  CATEGORIA_F,
  META_DURACAO,
  IVA_TAXAS,
  IVA_ISENCAO_LIMITE,
  IVA_ISENCAO_EXCESSO,
  DISPENSA_RETENCAO_LIMITE,
  SS_TAXA,
  SS_COEFICIENTE,
  SS_BASE_MAX_MENSAL,
  SS_MIN_MENSAL,
  IAS,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_BEBE,
  DEDUCAO_DEPENDENTE_3MAIS,
  DEDUCAO_DEPENDENTE_DEFICIENCIA,
  EXCLUSAO_DEFICIENCIA_TAXA,
  EXCLUSAO_DEFICIENCIA_MAX,
  DEDUCAO_DEFICIENCIA_COLETA,
  DEDUCAO_DEFICIENCIA_GRAU_MINIMO,
  DEDUCAO_SAUDE,
  DEDUCAO_EDUCACAO,
  DEDUCAO_DESP_GERAIS,
  DEDUCAO_RENDAS,
  IFICI_TAXA,
  IFICI_PRAZO_ANOS,
  type Atividade,
  type DuracaoArrendamento,
  type Regiao,
  type EscalaoIVA,
} from "@/lib/fiscal-data";

// ─── Tipos locais ─────────────────────────────────────────────────────────────
type RegimeIVA = "isento" | EscalaoIVA;
type PrioridadeRegra = "erro" | "aviso" | "info" | "oportunidade";

interface RegraFiscal {
  id: string;
  prioridade: PrioridadeRegra;
  mensagem: string;
  detalhe: string;
}

// ─── Constantes de UI ────────────────────────────────────────────────────────
const ATIVIDADE_DEFAULT =
  ATIVIDADES.find((a) => a.label.includes("Programador")) ?? ATIVIDADES[0];

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

const campo =
  "w-full px-3.5 py-2.5 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 " +
  "focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all " +
  "dark:bg-stone-800/50 dark:text-stone-100 dark:border-stone-700";

const rotulo =
  "text-xs font-medium text-stone-500 uppercase tracking-wider dark:text-stone-400";

// ─── Motor de Regras ──────────────────────────────────────────────────────────
interface EstadoMotor {
  categoria: "B" | "F";
  atividade: Atividade;
  bruto: number;
  regimeIVA: RegimeIVA;
  regiao: Regiao;
  dispensaRetencao: boolean;
  anoAtividade: number;
  irsJovemAno: number;
  regimeC: "simplificado" | "organizada";
  conjunta: boolean;
  ifici: boolean;
  deficiencia: boolean;
  isencaoSSPrimeiroAno: boolean;
  acumulaEmprego: boolean;
}

function avaliarRegras(s: EstadoMotor): RegraFiscal[] {
  if (s.categoria === "F") return [];
  const r: RegraFiscal[] = [];

  // IVA isento + faturação acima do limite imediato
  if (s.regimeIVA === "isento" && s.bruto > IVA_ISENCAO_EXCESSO.value) {
    r.push({
      id: "iva-excesso",
      prioridade: "erro",
      mensagem: "Isenção de IVA incompatível com esta faturação",
      detalhe: `Com ${fmt(s.bruto)}/ano ultrapassas ${fmt(IVA_ISENCAO_EXCESSO.value)} — transição para IVA normal obrigatória (Art. 53.º / Art. 58.º CIVA).`,
    });
  } else if (s.regimeIVA === "isento" && s.bruto > IVA_ISENCAO_LIMITE.value) {
    r.push({
      id: "iva-transicao",
      prioridade: "aviso",
      mensagem: "Zona de transição do limiar de isenção de IVA",
      detalhe: `Com ${fmt(s.bruto)}/ano ultrapassas os €15 000 do Art. 53.º CIVA. Perdes a isenção no ano seguinte; se ultrapassares €18 750, a mudança é imediata.`,
    });
  }

  // IVA intermédia/reduzida com Art. 151.º
  if ((s.regimeIVA === "intermedia" || s.regimeIVA === "reduzida") && s.atividade.tipo === "art151") {
    r.push({
      id: "iva-taxa-atividade",
      prioridade: "aviso",
      mensagem: `IVA ${s.regimeIVA === "intermedia" ? "intermédia" : "reduzida"} improvável para a atividade selecionada`,
      detalhe: `As profissões do Art. 151.º aplicam normalmente IVA normal (${pct(IVA_TAXAS[s.regiao].value.normal)}). Verifica se a tua atividade específica está na lista do CIVA para a taxa ${s.regimeIVA === "intermedia" ? "intermédia" : "reduzida"}.`,
    });
  }

  // IFICI + IRS Jovem — incompatíveis
  if (s.ifici && s.irsJovemAno > 0) {
    r.push({
      id: "ifici-jovem",
      prioridade: "erro",
      mensagem: "IFICI e IRS Jovem são regimes incompatíveis",
      detalhe: "Não podes beneficiar simultaneamente do IFICI/NHR 2.0 (taxa flat 20%) e do IRS Jovem (isenção progressiva). Escolhe um dos dois regimes e desativa o outro.",
    });
  }

  // Dispensa de retenção acima do limite legal
  if (s.dispensaRetencao && s.bruto > DISPENSA_RETENCAO_LIMITE.value) {
    r.push({
      id: "dispensa-limite",
      prioridade: "aviso",
      mensagem: "Dispensa de retenção inválida à tua faturação estimada",
      detalhe: `A dispensa (Art. 101.º-B CIRS) só é válida com faturação prevista inferior a ${fmt(DISPENSA_RETENCAO_LIMITE.value)}/ano. Com ${fmt(s.bruto)} estimados, deves fazer retenção na fonte.`,
    });
  }

  // Regime simplificado acima do limite legal
  if (s.regimeC === "simplificado" && s.bruto > REGIME_SIMPLIFICADO.limite.value) {
    r.push({
      id: "simplificado-excede",
      prioridade: "erro",
      mensagem: "Regime simplificado não disponível acima de €200 000",
      detalhe: `Com faturação superior a ${fmt(REGIME_SIMPLIFICADO.limite.value)}, a contabilidade organizada é obrigatória (Art. 28.º CIRS). Altera o regime abaixo.`,
    });
  }

  // Isenção SS dupla ativa (informativa)
  if (s.isencaoSSPrimeiroAno && s.acumulaEmprego) {
    r.push({
      id: "ss-dupla",
      prioridade: "info",
      mensagem: "Dois motivos de isenção SS ativos — só um é suficiente",
      detalhe: "Isenção do 1.º ano e acumulação com emprego dão o mesmo resultado (SS = 0). Podes desativar um dos dois.",
    });
  }

  // IFICI ativo — nota de elegibilidade
  if (s.ifici) {
    r.push({
      id: "ifici-info",
      prioridade: "info",
      mensagem: `IFICI ativo — taxa flat ${pct(IFICI_TAXA.value)} sobre rendimentos elegíveis`,
      detalhe: `O IFICI (ex-NHR 2.0) aplica ${pct(IFICI_TAXA.value)} ao rendimento coletável por ${IFICI_PRAZO_ANOS.value} exercícios. Exige estatuto aprovado pela AT e não teres sido residente em Portugal nos últimos 5 anos.`,
    });
  }

  // Deficiência ativa — nota dos dois benefícios cumulativos
  if (s.deficiencia) {
    r.push({
      id: "deficiencia-info",
      prioridade: "oportunidade",
      mensagem: "Dois benefícios fiscais por deficiência ≥ 60% em simultâneo",
      detalhe: `Art. 56.º-A: exclui até ${fmt(EXCLUSAO_DEFICIENCIA_MAX.value)} do rendimento tributável. Art. 87.º: deduz ${fmt(DEDUCAO_DEFICIENCIA_COLETA.value)} (4×IAS) diretamente à coleta. Ambos se acumulam.`,
    });
  }

  return r;
}

// ─── Metadados IVA ────────────────────────────────────────────────────────────
function metaIVA(r: RegimeIVA, regiao: Regiao) {
  const t = IVA_TAXAS[regiao].value;
  return {
    isento: {
      titulo: "Isento Art. 53.º CIVA",
      quando: `Faturação anual inferior a ${fmt(IVA_ISENCAO_LIMITE.value)}. Não cobras IVA; não deduzes IVA de compras. Acima de ${fmt(IVA_ISENCAO_EXCESSO.value)}, a transição é imediata.`,
      compativel: "Qualquer atividade com faturação abaixo do limiar",
      incompativel: `Faturação ≥ ${fmt(IVA_ISENCAO_EXCESSO.value)} — saída imediata obrigatória`,
    },
    reduzida: {
      titulo: `Taxa reduzida — ${pct(t.reduzida)}`,
      quando: "Listas I e II do CIVA: medicamentos, alimentação básica, livros, assistência médica específica, alguns produtos agrícolas.",
      compativel: "Farmacêuticos, saúde (serviços específicos), bens alimentares, produção agrícola",
      incompativel: "Maioria das profissões liberais (Art. 151.º) — aplicam taxa normal",
    },
    intermedia: {
      titulo: `Taxa intermédia — ${pct(t.intermedia)}`,
      quando: "Lista II-A do CIVA: restauração, alojamento turístico, alguns produtos agrícolas.",
      compativel: "Restauração, alojamento local / hotelaria, alguns produtos agrícolas",
      incompativel: "Profissões liberais (Art. 151.º), consultoria, TI, engenharia — aplicam taxa normal",
    },
    normal: {
      titulo: `Taxa normal — ${pct(t.normal)}`,
      quando: "Todos os bens/serviços não constantes das listas de taxa reduzida ou intermédia. Taxa geral aplicável à maioria dos serviços.",
      compativel: "Profissões liberais (Art. 151.º), consultoria, TI, engenharia, advocacia",
      incompativel: null,
    },
  }[r];
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SimuladorPage() {
  const { recibos, carregado, resumo } = useRecibos();

  // ── Categoria e perfil ────────────────────────────────────────────────────
  const [categoria, setCategoria] = useState<"B" | "F">("B");
  const [atividade, setAtividade] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [brutoStr, setBrutoStr] = useState("25000");
  const [retStr, setRetStr] = useState("");
  const [anoAtividade, setAnoAtividade] = useState(3);
  const [regimeC, setRegimeC] = useState<"simplificado" | "organizada">("simplificado");
  const [despesasStr, setDespesasStr] = useState("");
  const [irsJovemAno, setIrsJovemAno] = useState(0);

  // ── Enquadramento ─────────────────────────────────────────────────────────
  const [regimeIVA, setRegimeIVA] = useState<RegimeIVA>("normal");
  const [dispensaRetencao, setDispensaRetencao] = useState(false);

  // ── Situação fiscal ────────────────────────────────────────────────────────
  const [isencaoSSPrimeiroAno, setIsencaoSSPrimeiroAno] = useState(false);
  const [acumulaEmprego, setAcumulaEmprego] = useState(false);

  // ── Particularidades ──────────────────────────────────────────────────────
  const [deficiencia, setDeficiencia] = useState(false);
  const [ifici, setIfici] = useState(false);

  // ── Família ───────────────────────────────────────────────────────────────
  const [famOn, setFamOn] = useState(false);
  const [conjunta, setConjunta] = useState(false);
  const [depNormaisStr, setDepNormaisStr] = useState("0");
  const [depBebeStr, setDepBebeStr] = useState("0");
  const [depDeficStr, setDepDeficStr] = useState("0");

  // ── Deduções à coleta ─────────────────────────────────────────────────────
  const [deducoesOn, setDeducoesOn] = useState(false);
  const [saudeStr, setSaudeStr] = useState("");
  const [educacaoStr, setEducacaoStr] = useState("");
  const [geraisStr, setGeraisStr] = useState("");
  const [rendasStr, setRendasStr] = useState("");

  // ── Outros rendimentos ────────────────────────────────────────────────────
  const [outrosOn, setOutrosOn] = useState(false);
  const [outrosStr, setOutrosStr] = useState("");

  // ── Painéis contextuais ───────────────────────────────────────────────────
  const [painelIVA, setPainelIVA] = useState(false);
  const [painelAtividade, setPainelAtividade] = useState(true);
  const [painelRetencao, setPainelRetencao] = useState(false);

  // ── Categoria F ───────────────────────────────────────────────────────────
  const [rendaStr, setRendaStr] = useState("12000");
  const [despesasFStr, setDespesasFStr] = useState("");
  const [habitacao, setHabitacao] = useState(true);
  const [duracao, setDuracao] = useState<DuracaoArrendamento>("curto");
  const [retFStr, setRetFStr] = useState("");

  // ── Pré-preenchimento com recibos ─────────────────────────────────────────
  useEffect(() => {
    if (carregado && recibos.length > 0) {
      setBrutoStr(String(Math.round(resumo.bruto)));
      setRetStr(String(Math.round(resumo.retencao)));
    }
  }, [carregado, recibos.length, resumo.bruto, resumo.retencao]);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const ef = efeitoFiscal(atividade);
  const bruto = num(brutoStr);
  const isencaoSS = isencaoSSPrimeiroAno || acumulaEmprego;

  // Dependentes detalhados
  const dependentesDetalhe: DependentesDetalhe = {
    normais: Math.max(0, Math.floor(num(depNormaisStr))),
    bebe: Math.max(0, Math.floor(num(depBebeStr))),
    deficientes: Math.max(0, Math.floor(num(depDeficStr))),
  };
  const totalDependentes =
    (dependentesDetalhe.normais ?? 0) +
    (dependentesDetalhe.bebe ?? 0);

  // ── Simulação IRS anual ───────────────────────────────────────────────────
  const sim = useMemo(
    () =>
      simularIRSAnual({
        brutoAnual: bruto,
        tipo: atividade.tipo,
        coefOverride: ef.coef,
        aplicaRegra15Override: ef.regra15,
        anoAtividade,
        irsJovemAno,
        despesasJustificadas: num(despesasStr),
        retencoesPagas: num(retStr),
        regimeContabilidade: regimeC,
        conjunta: famOn ? conjunta : false,
        dependentesDetalhe: famOn ? dependentesDetalhe : undefined,
        outrosRendimentos: outrosOn ? num(outrosStr) : 0,
        deducoes: deducoesOn
          ? {
              saude: num(saudeStr),
              educacao: num(educacaoStr),
              gerais: num(geraisStr),
              rendas: num(rendasStr),
            }
          : undefined,
        ifici,
        deficiencia,
        acumulaEmprego,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      atividade, ef.coef, ef.regra15, bruto, retStr, despesasStr,
      regimeC, anoAtividade, irsJovemAno,
      famOn, conjunta, depNormaisStr, depBebeStr, depDeficStr,
      outrosOn, outrosStr,
      deducoesOn, saudeStr, educacaoStr, geraisStr, rendasStr,
      ifici, deficiencia, acumulaEmprego,
    ]
  );

  // ── Categoria F ───────────────────────────────────────────────────────────
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

  // ── Motor de regras ───────────────────────────────────────────────────────
  const regras = useMemo(
    () =>
      avaliarRegras({
        categoria,
        atividade,
        bruto,
        regimeIVA,
        regiao,
        dispensaRetencao,
        anoAtividade,
        irsJovemAno,
        regimeC,
        conjunta: famOn ? conjunta : false,
        ifici,
        deficiencia,
        isencaoSSPrimeiroAno,
        acumulaEmprego,
      }),
    [categoria, atividade, bruto, regimeIVA, regiao, dispensaRetencao, anoAtividade, irsJovemAno, regimeC, famOn, conjunta, ifici, deficiencia, isencaoSSPrimeiroAno, acumulaEmprego]
  );

  const regrasErro = regras.filter((r) => r.prioridade === "erro");
  const regrasAviso = regras.filter((r) => r.prioridade === "aviso");
  const regrasInfo = regras.filter((r) => r.prioridade === "info" || r.prioridade === "oportunidade");

  // ── Metadados para painéis ────────────────────────────────────────────────
  const ivaInfo = metaIVA(regimeIVA, regiao);
  const taxasIVA = IVA_TAXAS[regiao].value;
  const ivaAlertaAtividade = (regimeIVA === "intermedia" || regimeIVA === "reduzida") && atividade.tipo === "art151";
  const ivaAlertaFaturacao = regimeIVA === "isento" && bruto > IVA_ISENCAO_LIMITE.value;

  // ── Estado de resultado ───────────────────────────────────────────────────
  const reembolso = sim.saldo >= 0;
  const reembolsoF = simF.saldo >= 0;
  const liquidoAnual = Math.max(0, bruto - sim.irsEstimado - sim.ssAnual);
  const totalFiscal = sim.irsEstimado + sim.ssAnual;

  // ── Deduções à coleta display ────────────────────────────────────────────
  const deducaoDependentesDisplay = (() => {
    const d = dependentesDetalhe;
    return famOn
      ? (d.bebe ?? 0) * DEDUCAO_DEPENDENTE_BEBE.value +
        Math.min(d.normais ?? 0, Math.max(0, 2 - (d.bebe ?? 0))) * DEDUCAO_DEPENDENTE.value +
        Math.max(0, (d.normais ?? 0) - Math.max(0, 2 - (d.bebe ?? 0))) * DEDUCAO_DEPENDENTE_3MAIS.value +
        (d.deficientes ?? 0) * DEDUCAO_DEPENDENTE_DEFICIENCIA.value
      : 0;
  })();

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabeçalho */}
      <header className="mb-6">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">
          Simulação anual · 2026
        </div>
        <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">
          Simulador de IRS
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          IRS, Segurança Social, deduções e particularidades individuais — dados legais verificados.
          Cada seleção explica as condições e valida a coerência do teu perfil.
        </p>
      </header>

      {/* Indicador de progresso */}
      <div className="mb-6 flex items-center">
        {([
          { n: 1, label: "Perfil", done: bruto > 0 },
          { n: 2, label: "Enquadramento", done: bruto > 0 },
          { n: 3, label: "Particularidades", done: deficiencia || ifici || isencaoSSPrimeiroAno || acumulaEmprego },
          { n: 4, label: "Resultado", done: bruto > 0 },
        ] as const).map((passo, i) => (
          <div key={passo.n} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  passo.done ? "bg-brand text-white" : "bg-stone-100 text-stone-400 dark:bg-stone-800"
                }`}
              >
                {passo.done ? <Check size={11} /> : passo.n}
              </span>
              <span className={`hidden text-xs font-medium sm:block ${passo.done ? "text-brand-dark dark:text-brand" : "text-stone-400"}`}>
                {passo.label}
              </span>
            </div>
            {i < 3 && <div className="mx-2 h-px w-8 bg-stone-200 dark:bg-stone-700 sm:w-12" />}
          </div>
        ))}
      </div>

      {/* Seletor de categoria */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className={rotulo}>Categoria de rendimento</span>
          <InfoTip>Categoria B = recibos verdes (trabalho independente). Categoria F = rendas de imóveis (arrendamento puro), tributação autónoma sem SS nem IVA.</InfoTip>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "B", label: "Categoria B", sub: "Recibos verdes / trabalho independente" },
            { id: "F", label: "Categoria F", sub: "Rendas de imóveis" },
          ] as const).map((c) => {
            const active = categoria === c.id;
            return (
              <button key={c.id} type="button" aria-pressed={active} onClick={() => setCategoria(c.id)}
                className={`rounded-xl border p-3 text-center transition-all ${active ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"}`}
              >
                <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{c.label}</div>
                <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{c.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {categoria === "F" ? (
        /* ══ CATEGORIA F ═══════════════════════════════════════════════════════ */
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
            <SeccaoTitulo numero={1} titulo="Rendimentos prediais" />
            <Campo id="renda" label="Rendas brutas anuais (€)" value={rendaStr} onChange={setRendaStr} step={500} />
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label htmlFor="despesasF" className={rotulo}>Despesas dedutíveis (€)</label>
                <InfoTip>Conservação, IMI, imposto do selo, condomínio, seguros (Art. 41.º CIRS). Não incluem mobiliário, eletrodomésticos nem juros.</InfoTip>
              </div>
              <input id="despesasF" type="number" inputMode="decimal" min={0} step={100} value={despesasFStr} onChange={(e) => setDespesasFStr(e.target.value)} placeholder="0" className={campo} />
            </div>
            <SeletorDuplo
              label="Tipo de arrendamento"
              tooltip={`Habitação: ${pct(CATEGORIA_F.taxaHabitacao.value)}. Não habitacional (comércio, escritórios): ${pct(CATEGORIA_F.taxaNaoHabitacao.value)}.`}
              opcoes={[
                { id: true, label: "Habitação", sub: pct(CATEGORIA_F.taxaHabitacao.value) },
                { id: false, label: "Não habitacional", sub: pct(CATEGORIA_F.taxaNaoHabitacao.value) },
              ]}
              valor={habitacao}
              onChange={setHabitacao}
            />
            {habitacao && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <label htmlFor="duracao" className={rotulo}>Duração do contrato</label>
                  <InfoTip>Contratos habitacionais mais longos comunicados à AT reduzem a taxa: 5–10 anos −10 p.p.; 10–20 −15 p.p.; 20+ −20 p.p. (Art. 72.º CIRS).</InfoTip>
                </div>
                <select id="duracao" value={duracao} onChange={(e) => setDuracao(e.target.value as DuracaoArrendamento)} className={campo}>
                  {(Object.keys(META_DURACAO) as DuracaoArrendamento[]).map((d) => (
                    <option key={d} value={d}>{`${META_DURACAO[d].label} — ${META_DURACAO[d].sub}`}</option>
                  ))}
                </select>
              </div>
            )}
            <Campo id="retF" label="Retenções já pagas (€)" value={retFStr} onChange={setRetFStr} step={100} placeholder="0" />
          </div>
          <PainelResultadoF simF={simF} reembolso={reembolsoF} />
        </div>
      ) : (
        /* ══ CATEGORIA B ═══════════════════════════════════════════════════════ */
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">

            {/* ── 1. PERFIL DA ATIVIDADE ─────────────────────────────────────── */}
            <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
              <SeccaoTitulo numero={1} titulo="Perfil da atividade" />
              <div className="mt-5 space-y-5">

                {/* Região */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={rotulo}>Região</span>
                    <InfoTip>Determina as taxas de IVA (Art. 18.º CIVA). Continente, Madeira e Açores têm escalões distintos.</InfoTip>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([{ id: "continente", label: "Continente" }, { id: "madeira", label: "Madeira" }, { id: "acores", label: "Açores" }] as const).map((r) => {
                      const active = regiao === r.id;
                      return (
                        <button key={r.id} type="button" aria-pressed={active} onClick={() => setRegiao(r.id)}
                          className={`rounded-xl border p-2.5 text-center text-sm transition-all ${active ? "border-brand bg-brand-light font-semibold text-brand-dark" : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-300"}`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Atividade */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={rotulo}>Tipo de atividade</span>
                    <InfoTip>Tabela do Art. 151.º (Portaria 1011/2001). Determina coeficiente (regime simplificado), retenção na fonte e base de SS.</InfoTip>
                  </div>
                  <ActivityCombobox value={atividade} onChange={(a) => { setAtividade(a); setPainelAtividade(true); }} />
                  {/* Badges */}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-brand-light px-2.5 py-1 font-semibold text-brand-dark">Ret. {pct(ef.retencao)}</span>
                    <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">Coef. {pct(ef.coef)}</span>
                    <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">SS base {ef.baseSS === "bens" ? "20%" : "70%"}</span>
                  </div>
                  {ef.nota && <p className="mt-2 text-xs leading-relaxed text-stone-400">{ef.nota}</p>}
                  {/* Painel contextual da atividade */}
                  {painelAtividade && (
                    <PainelAtividade atividade={atividade} regimeIVA={regimeIVA} regiao={regiao} onFechar={() => setPainelAtividade(false)} />
                  )}
                </div>

                {/* Faturação + Retenções */}
                <div className="grid grid-cols-2 gap-3">
                  <Campo id="bruto" label="Faturação anual (€)" value={brutoStr} onChange={setBrutoStr} step={500} />
                  <Campo id="ret" label="Retenções pagas (€)" value={retStr} onChange={setRetStr} step={100} placeholder="0" />
                </div>

                {/* Ano de atividade */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <label htmlFor="ano" className={rotulo}>Ano de atividade</label>
                    <InfoTip>1.º ano: coeficiente reduzido 50%. 2.º ano: reduzido 25%. A partir do 3.º, coeficiente integral (Art. 31.º, n.º 10 CIRS).</InfoTip>
                  </div>
                  <select id="ano" value={anoAtividade} onChange={(e) => setAnoAtividade(Number(e.target.value))} className={campo}>
                    <option value={1}>1.º ano — coeficiente reduzido em 50%</option>
                    <option value={2}>2.º ano — coeficiente reduzido em 25%</option>
                    <option value={3}>3.º ano ou seguinte — coeficiente integral</option>
                  </select>
                </div>

                {/* Regime + Despesas */}
                <SeletorDuplo
                  label="Regime de contabilidade"
                  tooltip="Simplificado: imposto sobre coeficiente do rendimento. Contabilidade organizada: sobre lucro real (receitas − despesas). Obrigatória acima de €200 000/2 anos consecutivos."
                  opcoes={[
                    { id: "simplificado" as const, label: "Simplificado", sub: `Coef. ${pct(ef.coef)}` },
                    { id: "organizada" as const, label: "Contab. organizada", sub: "Receitas − despesas reais" },
                  ]}
                  valor={regimeC}
                  onChange={setRegimeC}
                />
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <label htmlFor="despesas" className={rotulo}>
                      {regimeC === "organizada" ? "Despesas reais da atividade (€)" : "Despesas da atividade (€)"}
                    </label>
                    <InfoTip>
                      {regimeC === "organizada"
                        ? "Na contabilidade organizada, as despesas documentadas reduzem diretamente o lucro tributável."
                        : `Faturas com NIF (e-fatura, rendas, pessoal). Reduzem o acréscimo da regra dos 15%. A dedução específica de ${fmt(DEDUCAO_ESPECIFICA_CATB.value)} já é considerada automaticamente.`}
                    </InfoTip>
                  </div>
                  <input id="despesas" type="number" inputMode="decimal" min={0} step={100} value={despesasStr} onChange={(e) => setDespesasStr(e.target.value)} placeholder="0" className={campo} />
                </div>
              </div>
            </div>

            {/* ── 2. ENQUADRAMENTO FISCAL ────────────────────────────────────── */}
            <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
              <SeccaoTitulo numero={2} titulo="Enquadramento fiscal" />
              <div className="mt-5 space-y-5">

                {/* IVA */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={rotulo}>Regime de IVA</span>
                    <InfoTip>Informativo — o regime de IVA não altera o cálculo do IRS. Serve para validar a coerência do teu perfil fiscal e identificar incompatibilidades.</InfoTip>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["isento", "reduzida", "intermedia", "normal"] as RegimeIVA[]).map((r) => {
                      const active = regimeIVA === r;
                      const label = r === "isento" ? "Isento" : pct(taxasIVA[r as EscalaoIVA]);
                      const sub = { isento: "Art. 53.º", reduzida: "Reduzida", intermedia: "Intermédia", normal: "Normal" }[r];
                      return (
                        <button key={r} type="button" aria-pressed={active}
                          onClick={() => { setRegimeIVA(r); setPainelIVA(true); }}
                          className={`rounded-xl border p-3 text-center transition-all ${active ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"}`}
                        >
                          <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{label}</div>
                          <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{sub}</div>
                        </button>
                      );
                    })}
                  </div>
                  {painelIVA && (
                    <PainelContextual titulo={ivaInfo.titulo} onFechar={() => setPainelIVA(false)}>
                      <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">{ivaInfo.quando}</p>
                      <div className="mt-3 space-y-1.5 text-xs text-stone-500 dark:text-stone-400">
                        <div className="flex items-start gap-2"><Check size={11} className="mt-0.5 flex-shrink-0 text-brand" /><span><strong className="text-stone-700 dark:text-stone-200">Compatível:</strong> {ivaInfo.compativel}</span></div>
                        {ivaInfo.incompativel && <div className="flex items-start gap-2"><Warning size={11} className="mt-0.5 flex-shrink-0 text-alert-text" /><span><strong className="text-stone-700 dark:text-stone-200">Incompatível:</strong> {ivaInfo.incompativel}</span></div>}
                        {ivaAlertaAtividade && <div className="mt-2 rounded-lg border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">A atividade selecionada aplica normalmente IVA normal ({pct(taxasIVA.normal)}). Verifica com o teu contabilista.</div>}
                        {ivaAlertaFaturacao && <div className="mt-2 rounded-lg border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">A tua faturação ({fmt(bruto)}) ultrapassa o limiar de €{IVA_ISENCAO_LIMITE.value.toLocaleString("pt-PT")}. Verifica se ainda tens isenção.</div>}
                      </div>
                    </PainelContextual>
                  )}
                </div>

                {/* Retenção */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={rotulo}>Retenção na fonte</span>
                    <InfoTip>Taxa {pct(ef.retencao)} para esta atividade. A dispensa aplica-se quando a faturação prevista é inferior a {fmt(DISPENSA_RETENCAO_LIMITE.value)}/ano (Art. 101.º-B CIRS).</InfoTip>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-lg bg-brand-light px-2.5 py-1.5 text-xs font-semibold text-brand-dark">{pct(ef.retencao)} · {ef.legalCoef}</span>
                    <button type="button" role="switch" aria-checked={dispensaRetencao}
                      onClick={() => { setDispensaRetencao((v) => !v); setPainelRetencao(true); }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${dispensaRetencao ? "border-brand bg-brand-light text-brand-dark" : "border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-300"}`}
                    >
                      <ToggleSwitch on={dispensaRetencao} />
                      Dispensar retenção
                    </button>
                  </div>
                  {painelRetencao && (
                    <PainelContextual titulo="Dispensa de retenção (Art. 101.º-B CIRS)" onFechar={() => setPainelRetencao(false)}>
                      <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                        Válida quando a faturação anual prevista é inferior a <strong>{fmt(DISPENSA_RETENCAO_LIMITE.value)}</strong>. Deves comunicar a intenção por escrito ao cliente no início do ano ou da atividade. Clientes estrangeiros (não residentes) nunca fazem retenção.
                      </p>
                      {dispensaRetencao && bruto > DISPENSA_RETENCAO_LIMITE.value && (
                        <div className="mt-2 rounded-lg border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">Com {fmt(bruto)} estimados, a dispensa não é aplicável. Deves fazer retenção à taxa de {pct(ef.retencao)}.</div>
                      )}
                    </PainelContextual>
                  )}
                </div>

                {/* IRS Jovem */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <label htmlFor="jovem" className={rotulo}>IRS Jovem</label>
                    <InfoTip>Até {IRS_JOVEM.idadeMax.value} anos. Isenção: 100% (1.º), 75% (2.º–4.º), 50% (5.º–7.º), 25% (8.º–10.º). Teto: 55×IAS = {fmt(Math.round(55 * IAS.value))}/ano. Art. 12.º-B CIRS. Incompatível com IFICI.</InfoTip>
                  </div>
                  <select id="jovem" value={irsJovemAno} onChange={(e) => setIrsJovemAno(Number(e.target.value))} className={campo}>
                    <option value={0}>Não aplicável</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((ano) => (
                      <option key={ano} value={ano}>{`${ano}.º ano — isenção ${pct(IRS_JOVEM.isencaoPorAno.value[ano])}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── 3. SITUAÇÃO FISCAL E PARTICULARIDADES ─────────────────────── */}
            <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
              <SeccaoTitulo numero={3} titulo="Situação fiscal e particularidades" />
              <div className="mt-5 space-y-4">

                {/* Isenção SS */}
                <div>
                  <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">Segurança Social — situação especial</p>
                  <div className="space-y-2">
                    <Checkbox
                      checked={isencaoSSPrimeiroAno}
                      onChange={setIsencaoSSPrimeiroAno}
                      label="1.º ano de atividade — isenção SS"
                      sub="Isenção automática de contribuições nos primeiros 12 meses (Art. 157.º Código Contributivo). Válida se não tiveste atividade independente nos últimos 3 anos."
                    />
                    <Checkbox
                      checked={acumulaEmprego}
                      onChange={setAcumulaEmprego}
                      label="Acumulação com trabalho dependente"
                      sub={`Isento SS se o emprego cobre ≥ 1×IAS (${fmt(IAS.value)}/mês) e o rendimento médio mensal como TI < 4×IAS (${fmt(Math.round(4 * IAS.value))}/mês).`}
                    />
                  </div>
                </div>

                <hr className="border-stone-100 dark:border-stone-800" />

                {/* Deficiência */}
                <div>
                  <Checkbox
                    checked={deficiencia}
                    onChange={setDeficiencia}
                    label={`Deficiência permanente ≥ ${DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value}% (Art. 56.º-A + 87.º CIRS)`}
                    sub={`Art. 56.º-A: exclui ${pct(EXCLUSAO_DEFICIENCIA_TAXA.value)} dos rendimentos Cat. B (máx ${fmt(EXCLUSAO_DEFICIENCIA_MAX.value)}) do tributável. Art. 87.º: deduz ${fmt(DEDUCAO_DEFICIENCIA_COLETA.value)} (4×IAS) à coleta.`}
                  />
                  {deficiencia && (
                    <div className="mt-2 rounded-2xl border border-brand/20 bg-brand-light/40 p-3 text-xs leading-relaxed text-brand-dark">
                      Dois benefícios cumulativos: exclusão de rendimento ({pct(EXCLUSAO_DEFICIENCIA_TAXA.value)} do tributável, máx {fmt(EXCLUSAO_DEFICIENCIA_MAX.value)}) + dedução à coleta ({fmt(DEDUCAO_DEFICIENCIA_COLETA.value)} = 4×IAS). Exige atestado médico com grau ≥ {DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value}%.
                    </div>
                  )}
                </div>

                {/* IFICI */}
                <div>
                  <Checkbox
                    checked={ifici}
                    onChange={setIfici}
                    label={`IFICI / NHR 2.0 — taxa flat ${pct(IFICI_TAXA.value)} (Art. 58.º-A EBF)`}
                    sub={`Substitui o NHR desde 2024. ${pct(IFICI_TAXA.value)} sobre rendimentos elegíveis Cat. B por ${IFICI_PRAZO_ANOS.value} exercícios. Exige estatuto AT + não ser residente há 5 anos. Incompatível com IRS Jovem.`}
                  />
                  {ifici && (
                    <div className="mt-2 rounded-xl border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">
                      Taxa flat {pct(IFICI_TAXA.value)} sobre o rendimento coletável (em substituição dos escalões progressivos). Incompatível com IRS Jovem — desativa um dos dois.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── MÓDULOS OPCIONAIS ──────────────────────────────────────────── */}
            <div className="mb-2">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500 dark:bg-stone-800 mr-2 inline-flex`}>4</div>
              <span className="text-sm font-medium text-stone-500 dark:text-stone-400">Módulos opcionais</span>
            </div>

            {/* Família e dependentes */}
            <Modulo titulo="Família e dependentes" info={`Tributação conjunta (quociente conjugal ÷2). Dependentes > 3 anos: ${fmt(DEDUCAO_DEPENDENTE.value)}/dep. (3.º+: ${fmt(DEDUCAO_DEPENDENTE_3MAIS.value)}). Bebés ≤ 3 anos: ${fmt(DEDUCAO_DEPENDENTE_BEBE.value)}. Dep. deficientes: +${fmt(DEDUCAO_DEPENDENTE_DEFICIENCIA.value)} (2,5×IAS).`} on={famOn} setOn={setFamOn}>
              <div className="space-y-4">
                <Checkbox checked={conjunta} onChange={setConjunta} label="Tributação conjunta (casado / unido de facto)" sub="Divide o rendimento coletável por 2, aplica os escalões e multiplica o imposto por 2 (quociente conjugal — Art. 69.º CIRS)." />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="dep-normais" className={`mb-1 block ${rotulo}`}>Dep. &gt; 3 anos</label>
                    <div className="mb-0.5 text-[10px] text-stone-400">{fmt(DEDUCAO_DEPENDENTE.value)}/€{DEDUCAO_DEPENDENTE_3MAIS.value} (3.º+)</div>
                    <input id="dep-normais" type="number" min={0} step={1} value={depNormaisStr} onChange={(e) => setDepNormaisStr(e.target.value)} className={campo} />
                  </div>
                  <div>
                    <label htmlFor="dep-bebe" className={`mb-1 block ${rotulo}`}>Bebés ≤ 3 anos</label>
                    <div className="mb-0.5 text-[10px] text-stone-400">{fmt(DEDUCAO_DEPENDENTE_BEBE.value)}/dep.</div>
                    <input id="dep-bebe" type="number" min={0} step={1} value={depBebeStr} onChange={(e) => setDepBebeStr(e.target.value)} className={campo} />
                  </div>
                  <div>
                    <label htmlFor="dep-defic" className={`mb-1 block ${rotulo}`}>Dep. deficientes</label>
                    <div className="mb-0.5 text-[10px] text-stone-400">+{fmt(Math.round(DEDUCAO_DEPENDENTE_DEFICIENCIA.value))}/dep.</div>
                    <input id="dep-defic" type="number" min={0} step={1} value={depDeficStr} onChange={(e) => setDepDeficStr(e.target.value)} className={campo} />
                  </div>
                </div>
                {totalDependentes > 0 && (
                  <div className="rounded-lg border border-brand/20 bg-brand-light/40 px-3 py-2 text-xs text-brand-dark">
                    Dedução estimada por dependentes: {fmt(Math.round(deducaoDependentesDisplay))}
                  </div>
                )}
              </div>
            </Modulo>

            {/* Deduções à coleta */}
            <Modulo titulo="Deduções à coleta" info={`Saúde: ${pct(DEDUCAO_SAUDE.value.taxa)} (máx ${fmt(DEDUCAO_SAUDE.value.limite)}). Educação: ${pct(DEDUCAO_EDUCACAO.value.taxa)} (máx ${fmt(DEDUCAO_EDUCACAO.value.limite)}). Gerais: ${pct(DEDUCAO_DESP_GERAIS.value.taxa)} (máx ${fmt(DEDUCAO_DESP_GERAIS.value.limite)}). Rendas: ${pct(DEDUCAO_RENDAS.value.taxa)} (máx ${fmt(DEDUCAO_RENDAS.value.limite)}). Sujeitas a limite global (Art. 78.º, n.º 7 CIRS).`} on={deducoesOn} setOn={setDeducoesOn}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { id: "saude", label: "Saúde (€)", v: saudeStr, set: setSaudeStr, nota: `${pct(DEDUCAO_SAUDE.value.taxa)} → máx ${fmt(DEDUCAO_SAUDE.value.limite)}` },
                  { id: "educacao", label: "Educação (€)", v: educacaoStr, set: setEducacaoStr, nota: `${pct(DEDUCAO_EDUCACAO.value.taxa)} → máx ${fmt(DEDUCAO_EDUCACAO.value.limite)}` },
                  { id: "gerais", label: "Desp. gerais (€)", v: geraisStr, set: setGeraisStr, nota: `${pct(DEDUCAO_DESP_GERAIS.value.taxa)} → máx ${fmt(DEDUCAO_DESP_GERAIS.value.limite)}` },
                  { id: "rendas", label: "Rendas hab. (€)", v: rendasStr, set: setRendasStr, nota: `${pct(DEDUCAO_RENDAS.value.taxa)} → máx ${fmt(DEDUCAO_RENDAS.value.limite)}` },
                ].map((f) => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className={`mb-1 block ${rotulo}`}>{f.label}</label>
                    <div className="mb-1 text-[10px] text-stone-400">{f.nota}</div>
                    <input id={f.id} type="number" inputMode="decimal" min={0} step={50} value={f.v} onChange={(e) => f.set(e.target.value)} placeholder="0" className={campo} />
                  </div>
                ))}
              </div>
            </Modulo>

            {/* Outros rendimentos */}
            <Modulo titulo="Outros rendimentos (cat. A / pensões)" info="Rendimentos de trabalho dependente, pensões ou outros, somados ao rendimento Cat. B para o cálculo do IRS anual." on={outrosOn} setOn={setOutrosOn}>
              <label htmlFor="outros" className={`mb-1.5 block ${rotulo}`}>Outros rendimentos líquidos anuais (€)</label>
              <input id="outros" type="number" inputMode="decimal" min={0} step={500} value={outrosStr} onChange={(e) => setOutrosStr(e.target.value)} placeholder="0" className={campo} />
            </Modulo>

            {/* Motor de regras */}
            {regras.length > 0 && (
              <div className="space-y-2">
                {[...regrasErro, ...regrasAviso, ...regrasInfo].map((r) => (
                  <CartaoRegra key={r.id} regra={r} />
                ))}
              </div>
            )}

            {carregado && recibos.length > 0 && (
              <p className="rounded-xl bg-brand-light px-3 py-2.5 text-xs text-brand-dark">
                Faturação e retenções preenchidas com os teus {recibos.length} recibos registados.
              </p>
            )}
          </div>

          {/* ══ PAINEL DE RESULTADO ═════════════════════════════════════════ */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-4xl border border-stone-200 bg-cream p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
              {/* Resultado principal */}
              <div className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {reembolso ? "Reembolso estimado" : "Imposto a pagar estimado"}
              </div>
              <div className={`mb-4 font-display text-4xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}>
                <AnimatedNumber value={Math.abs(sim.saldo)} />
              </div>

              {/* Breakdown IRS */}
              <div className="space-y-1">
                <Row label="Faturação bruta" value={sim.brutoAnual} />
                {sim.regimeContabilidade === "organizada" ? (
                  <>
                    {sim.despesasJustificadas > 0 && <Row label="Despesas reais" value={sim.despesasJustificadas} sinal="−" />}
                    <Row label="Rendimento tributável" value={sim.rendimentoTributavel} note="Lucro real (contab. organizada)" />
                  </>
                ) : (
                  <>
                    <Row label={`Coeficiente (${pct(sim.coeficiente)})`} value={sim.rendimentoCoeficiente}
                      note={sim.reducaoAno > 0 ? `Reduzido ${pct(sim.reducaoAno)} (início de atividade)` : "Regime simplificado"} />
                    {sim.acrescimo15 > 0 && <Row label="Acréscimo (regra 15%)" value={sim.acrescimo15} sinal="+" />}
                  </>
                )}
                {sim.exclusaoDeficiencia > 0 && <Row label={`Exclusão deficiência (Art. 56.º-A)`} value={sim.exclusaoDeficiencia} sinal="−" note={`${pct(EXCLUSAO_DEFICIENCIA_TAXA.value)} rendimento, máx ${fmt(EXCLUSAO_DEFICIENCIA_MAX.value)}`} />}
                {sim.rendimentoIsentoJovem > 0 && <Row label={`Isenção IRS Jovem (${pct(sim.isencaoJovem)})`} value={sim.rendimentoIsentoJovem} sinal="−" />}
                {sim.outrosRendimentos > 0 && <Row label="Outros rendimentos" value={sim.outrosRendimentos} sinal="+" />}
                <Row label="Rendimento coletável" value={sim.rendimentoColetavel} forte />
                <Row label={sim.ificiAplicado ? `Coleta IFICI (${pct(IFICI_TAXA.value)} flat)` : sim.conjunta ? "Coleta (tributação conjunta)" : "Coleta"} value={sim.coletaBruta} />
                {sim.deducaoDependentes > 0 && <Row label="Dedução dependentes" value={sim.deducaoDependentes} sinal="−" />}
                {sim.deducaoDespesas > 0 && <Row label="Deduções despesas" value={sim.deducaoDespesas} sinal="−" />}
                {sim.deducaoDeficiencia > 0 && <Row label={`Dedução deficiência Art. 87.º (4×IAS)`} value={sim.deducaoDeficiencia} sinal="−" />}
                <Row label="IRS estimado" value={sim.irsEstimado} note={`Taxa média ${pct(sim.taxaMediaEfetiva)}`} forte />
                <Row label="Retenções já pagas" value={sim.retencoesPagas} sinal="−" />
              </div>

              {/* Acerto IRS */}
              <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-brand bg-white p-3 dark:bg-stone-800">
                <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                  {reembolso ? "A receber" : "A pagar"}
                </span>
                <span className={`font-display text-xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}>
                  <AnimatedNumber value={Math.abs(sim.saldo)} />
                </span>
              </div>

              {sim.minimoExistenciaAplicado && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-brand-light p-3">
                  <Check size={14} className="mt-0.5 flex-shrink-0 text-brand" />
                  <span className="text-xs leading-relaxed text-brand-dark">
                    Protegido pelo mínimo de existência ({fmt(MINIMO_EXISTENCIA.value)}). O IRS não pode deixar-te abaixo deste rendimento.
                  </span>
                </div>
              )}

              {/* SS e carga fiscal total */}
              <div className="mt-5 space-y-1 border-t border-stone-200/60 pt-4 dark:border-stone-700/60">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Carga fiscal anual completa</div>
                <Row label="IRS estimado" value={sim.irsEstimado} />
                <Row
                  label={isencaoSS ? "Segurança Social (isenta)" : `SS (${pct(SS_TAXA.value)} × ${ef.baseSS === "bens" ? "20%" : "70%"})`}
                  value={sim.ssAnual}
                  note={isencaoSS ? (acumulaEmprego ? "Acumulação com emprego" : "Isenção 1.º ano") : undefined}
                />
                <Row label="Total fiscal" value={totalFiscal} forte />
                <Row label="Líquido disponível" value={liquidoAnual} forte />
                <div className="mt-2 rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                  Taxa efectiva total: {bruto > 0 ? pct(totalFiscal / bruto) : "—"}
                </div>
              </div>
            </div>

            {/* Oportunidades */}
            {regrasInfo.length > 0 && (
              <div className="rounded-4xl border border-brand/20 bg-brand-light/50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-dark">Oportunidades</div>
                <div className="space-y-2">
                  {regrasInfo.map((r) => (
                    <div key={r.id} className="flex items-start gap-2">
                      <ArrowRight size={12} className="mt-1 flex-shrink-0 text-brand" />
                      <div>
                        <p className="text-xs font-medium text-brand-dark">{r.mensagem}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-brand">{r.detalhe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ProHint id="guardar-cenario" icon={<ChartProjection size={18} />} cta="Conhecer o Pro" className="mt-6">
        Gostavas de guardar esta simulação e compará-la com outros cenários ao longo do ano? Isso faz parte do Pro.
      </ProHint>
      <div className="mt-4"><PartnerSpot context="simulador" /></div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-4">
        <Warning size={14} className="mt-0.5 flex-shrink-0 text-alert-text" />
        <p className="text-xs leading-relaxed text-alert-text">
          {categoria === "F"
            ? "Estimativa da tributação autónoma Cat. F. Não modela englobamento nem renda moderada (OE2026, pendente de regulamentação). Não substitui apuramento oficial nem aconselhamento de contabilista certificado."
            : `Estimativa para o regime simplificado (limite ${fmt(REGIME_SIMPLIFICADO.limite.value)}). IRS e SS são adiantamentos/estimativas — o apuramento final depende da declaração de rendimentos. Não substitui aconselhamento de contabilista certificado.`}
        </p>
      </div>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function SeccaoTitulo({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{numero}</span>
      <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{titulo}</h2>
    </div>
  );
}

function Campo({ id, label, value, onChange, step = 100, placeholder = "0", tooltip }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  step?: number; placeholder?: string; tooltip?: string;
}) {
  const rotulo = "text-xs font-medium text-stone-500 uppercase tracking-wider dark:text-stone-400";
  const campo = "w-full px-3.5 py-2.5 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all dark:bg-stone-800/50 dark:text-stone-100 dark:border-stone-700";
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={id} className={rotulo}>{label}</label>
        {tooltip && <InfoTip>{tooltip}</InfoTip>}
      </div>
      <input id={id} type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={campo} />
    </div>
  );
}

function SeletorDuplo<T extends string | boolean>({
  label, tooltip, opcoes, valor, onChange
}: {
  label: string; tooltip?: string;
  opcoes: { id: T; label: string; sub?: string }[];
  valor: T; onChange: (v: T) => void;
}) {
  const rotulo = "text-xs font-medium text-stone-500 uppercase tracking-wider dark:text-stone-400";
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={rotulo}>{label}</span>
        {tooltip && <InfoTip>{tooltip}</InfoTip>}
      </div>
      <div className={`grid grid-cols-${opcoes.length} gap-2`}>
        {opcoes.map((o) => {
          const active = valor === o.id;
          return (
            <button key={String(o.id)} type="button" aria-pressed={active} onClick={() => onChange(o.id)}
              className={`rounded-xl border p-3 text-center transition-all ${active ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"}`}
            >
              <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{o.label}</div>
              {o.sub && <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{o.sub}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${checked ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"}`}
    >
      <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${checked ? "border-brand bg-brand text-white" : "border-stone-300 text-transparent"}`}>
        <Check size={12} />
      </span>
      <div>
        <div className={`text-sm font-semibold ${checked ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{label}</div>
        <div className={`mt-0.5 text-xs leading-relaxed ${checked ? "text-brand" : "text-stone-400 dark:text-stone-500"}`}>{sub}</div>
      </div>
    </button>
  );
}

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span className={`relative h-4 w-7 flex-shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-stone-300"}`}>
      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${on ? "left-[0.875rem]" : "left-0.5"}`} />
    </span>
  );
}

function PainelContextual({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="mt-3 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/60">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{titulo}</span>
        <button type="button" onClick={onFechar} aria-label="Fechar painel" className="flex-shrink-0 text-xs text-stone-400 hover:text-stone-600 transition-colors">fechar</button>
      </div>
      {children}
    </div>
  );
}

function PainelAtividade({ atividade, regimeIVA, regiao, onFechar }: { atividade: Atividade; regimeIVA: RegimeIVA; regiao: Regiao; onFechar: () => void }) {
  const ef = efeitoFiscal(atividade);
  const taxasIVA = IVA_TAXAS[regiao].value;
  const ivaEsperado = atividade.tipo === "vendas" || atividade.tipo === "art151" ? "normal" : "intermedia";
  const ivaCoerente = regimeIVA === ivaEsperado || regimeIVA === "isento";
  const regimeIVAEscalao: EscalaoIVA | null =
    regimeIVA === "reduzida" || regimeIVA === "intermedia" || regimeIVA === "normal" ? regimeIVA : null;
  return (
    <div className="mt-3 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/60">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Condições fiscais desta atividade</span>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="flex-shrink-0 text-xs text-stone-400 hover:text-stone-600 transition-colors">fechar</button>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "Coeficiente", value: pct(ef.coef), note: "tributável" },
          { label: "Retenção", value: pct(ef.retencao), note: "pelo cliente" },
          { label: "Base SS", value: ef.baseSS === "bens" ? "20%" : "70%", note: "do rendimento" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-stone-200 bg-white p-2 text-center dark:border-stone-600 dark:bg-stone-900">
            <div className="text-base font-bold text-stone-800 dark:text-stone-100">{m.value}</div>
            <div className="text-[10px] font-medium text-stone-500">{m.label}</div>
            <div className="text-[10px] text-stone-400">{m.note}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 text-xs text-stone-500 dark:text-stone-400">
        <div className="flex items-start gap-2"><Check size={11} className="mt-0.5 flex-shrink-0 text-brand" /><span><strong className="text-stone-600 dark:text-stone-300">Base legal:</strong> {ef.legalCoef}</span></div>
        <div className="flex items-start gap-2"><Check size={11} className="mt-0.5 flex-shrink-0 text-brand" /><span><strong className="text-stone-600 dark:text-stone-300">IVA típico:</strong> taxa normal ({pct(taxasIVA.normal)}) ou isenção Art. 53.º se faturação &lt; €15 000</span></div>
        {ef.regra15 && <div className="flex items-start gap-2"><Check size={11} className="mt-0.5 flex-shrink-0 text-brand" /><span>Regra dos 15%: 15% do rendimento bruto deve ser justificado com despesas; excesso acrescido ao tributável.</span></div>}
        {!ivaCoerente && regimeIVAEscalao && <div className="mt-2 rounded-lg border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">O regime de IVA selecionado ({pct(taxasIVA[regimeIVAEscalao])}) pode não ser habitual para esta atividade. Verifica com o teu contabilista.</div>}
        {ef.nota && <div className="mt-2 rounded-lg border border-brand/20 bg-brand-light/50 px-3 py-2 text-xs leading-relaxed text-brand-dark">{ef.nota}</div>}
      </div>
    </div>
  );
}

function CartaoRegra({ regra }: { regra: RegraFiscal }) {
  const estilos: Record<PrioridadeRegra, { wrapper: string; icon: ReactNode; cor: string }> = {
    erro: { wrapper: "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20", icon: <Warning size={13} className="text-red-600 dark:text-red-400" />, cor: "text-red-700 dark:text-red-300" },
    aviso: { wrapper: "border-alert-border bg-alert-bg", icon: <Warning size={13} className="text-alert-text" />, cor: "text-alert-text" },
    info: { wrapper: "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/60", icon: <Check size={13} className="text-stone-400" />, cor: "text-stone-600 dark:text-stone-300" },
    oportunidade: { wrapper: "border-brand/20 bg-brand-light/50", icon: <ArrowRight size={13} className="text-brand" />, cor: "text-brand-dark" },
  };
  const { wrapper, icon, cor } = estilos[regra.prioridade];
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-3.5 ${wrapper}`}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className={`text-xs font-semibold ${cor}`}>{regra.mensagem}</p>
        <p className={`mt-0.5 text-xs leading-relaxed ${cor} opacity-80`}>{regra.detalhe}</p>
      </div>
    </div>
  );
}

function Modulo({ titulo, info, on, setOn, children }: { titulo: string; info: string; on: boolean; setOn: (v: boolean) => void; children: ReactNode }) {
  return (
    <div className={`rounded-4xl border bg-white p-5 shadow-card transition-colors dark:bg-stone-900 ${on ? "border-brand" : "border-stone-100 dark:border-stone-700"}`}>
      <div className="flex items-center gap-2">
        <button type="button" role="switch" aria-checked={on} onClick={() => setOn(!on)}
          className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-stone-200 dark:bg-stone-700"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`} />
        </button>
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{titulo}</span>
        <InfoTip>{info}</InfoTip>
      </div>
      {on && <div className="mt-4">{children}</div>}
    </div>
  );
}

function PainelResultadoF({ simF, reembolso }: { simF: ReturnType<typeof calcularCategoriaF>; reembolso: boolean }) {
  const pct2 = pct;
  return (
    <div className="rounded-4xl border border-stone-200 bg-cream p-6 shadow-card lg:sticky lg:top-6 dark:border-stone-700 dark:bg-stone-900">
      <div className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">{reembolso ? "Reembolso estimado" : "Imposto a pagar estimado"}</div>
      <div className={`mb-4 font-display text-4xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}><AnimatedNumber value={Math.abs(simF.saldo)} /></div>
      <div className="space-y-1">
        <Row label="Rendas brutas" value={simF.rendaAnual} />
        {simF.despesas > 0 && <Row label="Despesas dedutíveis" value={simF.despesas} sinal="−" />}
        <Row label="Rendimento tributável" value={simF.rendimentoLiquido} forte />
        <Row label={`Taxa autónoma (${pct2(simF.taxa)})`} value={simF.imposto}
          note={simF.reducao > 0 ? `Taxa base ${pct2(simF.taxaBase)}, reduzida ${pct2(simF.reducao)} pela duração` : `Taxa base ${pct2(simF.taxaBase)}`} forte />
        <Row label="Retenções já pagas" value={simF.retencoesPagas} sinal="−" />
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-brand bg-white p-3 dark:bg-stone-800">
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{reembolso ? "A receber" : "A pagar"}</span>
        <span className={`font-display text-xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}><AnimatedNumber value={Math.abs(simF.saldo)} /></span>
      </div>
      {simF.avisos.map((aviso) => (
        <div key={aviso} className="mt-3 flex items-start gap-2 rounded-xl bg-brand-light p-3">
          <Check size={14} className="mt-0.5 flex-shrink-0 text-brand" />
          <span className="text-xs leading-relaxed text-brand-dark">{aviso}</span>
        </div>
      ))}
    </div>
  );
}

function Row({ label, value, note, sinal, forte = false }: { label: string; value: number; note?: string; sinal?: "+" | "−"; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200/60 py-1.5 last:border-0 dark:border-stone-700/60">
      <div>
        <span className={`text-sm ${forte ? "font-semibold text-stone-800 dark:text-stone-100" : "text-stone-600 dark:text-stone-400"}`}>{label}</span>
        {note && <div className="text-[11px] text-stone-400">{note}</div>}
      </div>
      <span className={`text-sm font-semibold tabular-nums ${forte ? "text-brand" : "text-stone-700 dark:text-stone-300"}`}>
        {sinal && `${sinal} `}<AnimatedNumber value={value} />
      </span>
    </div>
  );
}
