"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { calcularVencimento, calcularVencimentoAnual, mealheiroDependente, calcularReciboMensal, IRS_JOVEM_TETO_MENSAL } from "@/lib/fiscal-dependente";
import { DEDUCAO_DEPENDENTE_DEFICIENCIA } from "@/lib/fiscal-data";
import { SS_DEPENDENTE, SUBSIDIO_REFEICAO, TRABALHO_SUPLEMENTAR, AJUDAS_CUSTO, HORARIO_SEMANAL_COMPLETO, type EstadoCivilRet } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import ProGate from "@/components/ui/ProGate";
import { Section, StatTile, Donut, SegBar, SegLegend, LinhaRecibo, segClass, cx, type Seg } from "@/components/dependente/ui";
import { type ReciboExtraido } from "@/lib/recibo-pdf";

// Funcionalidades pesadas carregadas sob procura — saem do chunk principal do
// simulador (que era ~1 MB). A auditoria e o importador de PDF só descem quando
// o utilizador os alcança; a exportação só quando clica em descarregar.
const PainelCarregando = () => (
  <div className="animate-pulse rounded-2xl border border-stone-100 bg-white p-5 dark:border-stone-800 dark:bg-stone-900" style={{ minHeight: 120 }} aria-hidden>
    <div className="h-5 w-40 max-w-full rounded-full bg-stone-100 dark:bg-stone-800" />
    <div className="mt-3 h-16 rounded-xl bg-stone-100 dark:bg-stone-800" />
  </div>
);
const AuditoriaPainel = dynamic(
  () => import("@/components/dependente/AuditoriaPainel").then((m) => m.AuditoriaPainel),
  { ssr: false, loading: () => <PainelCarregando /> }
);
const ImportarReciboPDF = dynamic(
  () => import("@/components/dependente/ImportarReciboPDF").then((m) => m.ImportarReciboPDF),
  { ssr: false, loading: () => <PainelCarregando /> }
);
import { gerarCSVCenarios, type CenarioVencimento } from "@/lib/store/vencimentos";
import { useCenarios, consumirReabertura, type ResumoCenario } from "@/lib/store/cenarios";
import { useExportacaoPro } from "@/lib/store/exportacao-pro";
import UpsellExportacao from "@/components/ui/UpsellExportacao";
import GuardarCenarioDialog from "@/components/ui/GuardarCenarioDialog";
import { History, Plus, ShieldCheck, Export, FileSign, Wallet, Gauge, Building, Coin, Sparkle, ArrowRight } from "@/components/ui/Icons";

// Espelha o último cenário no formato legado lido pela importação do Simulador
// de IRS («Importar dados → Recibo de vencimento»), para não perder essa ponte.
const KEY_VENC_LEGADO = "recibocerto:vencimentos:v1";
function espelharVencimentoLegado(c: { nome: string; salarioBruto: number; dependentes: number; subsidioRefeicaoDia: number; subsidioRefeicaoCartao: boolean; diasUteis: number }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_VENC_LEGADO, JSON.stringify([{ ...c, id: "atual", criadoEm: new Date().toISOString() }]));
  } catch {
    /* localStorage indisponível */
  }
}

const DEPENDENTES = [0, 1, 2, 3, 4];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Rótulos dos acréscimos de trabalho suplementar (Art. 268.º CT), na ordem de
// TRABALHO_SUPLEMENTAR.acrescimos.
const SUPLEMENTAR_LABELS = [
  "1.ª hora, dia útil",
  "Horas seguintes, dia útil",
  "Descanso ou feriado",
  "Descanso/feriado > 100h/ano",
];

const SITUACAO_LABEL: Record<EstadoCivilRet, string> = {
  naoCasado: "Não casado",
  casadoDois: "Casado, 2 titulares",
  casadoUnico: "Casado, 1 titular",
};

// Aceita vírgula ou ponto como separador decimal (pt-PT); nunca devolve NaN.
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");
const soInteiro = (s: string) => s.replace(/\D/g, "").slice(0, 2);

// Escala monocromática de verdes da marca: líquido = verde da marca (brand),
// IRS = mint claro, Seg. Social / descontos = verde profundo. Os gráficos
// (Donut, SegBar, SegLegend) e as primitivas (Section, StatTile, LinhaRecibo)
// vivem em `./ui`.
const COR_IRS = "#9FE1CB"; // brand-mint (segmento do IRS)
const CLS_SS = "text-brand-deep"; // Seg. Social / descontos — verde profundo (claro e escuro)

export function SimuladorVencimento() {
  const [brutoStr, setBrutoStr] = useState("1500");
  const [dependentes, setDependentes] = useState(0);
  const [temSubsidio, setTemSubsidio] = useState(true);
  const [subsidioDiaStr, setSubsidioDiaStr] = useState("6");
  const [cartao, setCartao] = useState(true);
  const [diasUteisStr, setDiasUteisStr] = useState("22");
  const [duodecimos, setDuodecimos] = useState(false);
  const [variavelStr, setVariavelStr] = useState("");
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivilRet>("naoCasado");
  const [deficiencia, setDeficiencia] = useState(false);
  const [depDeficientes, setDepDeficientes] = useState(0);
  const [regiao, setRegiao] = useState<"continente" | "madeira" | "acores">("continente");
  // ── IRS Jovem (Art. 12.º-B CIRS) ──
  const [irsJovem, setIrsJovem] = useState(false);
  const [irsJovemAno, setIrsJovemAno] = useState(1);
  const jovemAno = irsJovem ? irsJovemAno : undefined;

  // ── Importação de recibo em PDF (Pro) ──
  const [reciboPdf, setReciboPdf] = useState<ReciboExtraido | null>(null);
  const [pdfKey, setPdfKey] = useState(0);

  // ── Rendimentos adicionais e faltas (secção avançada) ──
  const [mostrarExtras, setMostrarExtras] = useState(false);
  const [mes, setMes] = useState(() => new Date().getMonth());
  const [horasAusenciaStr, setHorasAusenciaStr] = useState("");
  const [diasSemSubsidioStr, setDiasSemSubsidioStr] = useState("");
  const [horasSupStr, setHorasSupStr] = useState<string[]>(["", "", "", ""]);
  const [premioStr, setPremioStr] = useState("");
  const [premioRegular, setPremioRegular] = useState(true);
  const [subFeriasStr, setSubFeriasStr] = useState("");
  const [subNatalStr, setSubNatalStr] = useState("");
  const [outrosSujeitosStr, setOutrosSujeitosStr] = useState("");
  const [ajNDiasStr, setAjNDiasStr] = useState("");
  const [ajNValStr, setAjNValStr] = useState("");
  const [ajEDiasStr, setAjEDiasStr] = useState("");
  const [ajEValStr, setAjEValStr] = useState("");

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
        regiao,
        irsJovemAno: jovemAno,
      }),
    [bruto, dependentes, temSubsidio, subsidioDia, cartao, diasUteis, estadoCivil, deficiencia, regiao, jovemAno]
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
        regiao,
        irsJovemAno: jovemAno,
      }),
    [bruto, dependentes, temSubsidio, subsidioDia, cartao, diasUteis, estadoCivil, deficiencia, regiao, jovemAno]
  );

  const variavelAnual = num(variavelStr);
  const meal = useMemo(
    () => mealheiroDependente({ salarioBruto: bruto, dependentes, dependentesDeficientes: depDeficientes, variavelAnual, estadoCivil, deficiencia, regiao, irsJovemAno: jovemAno }),
    [bruto, dependentes, depDeficientes, variavelAnual, estadoCivil, deficiencia, regiao, jovemAno]
  );

  // Input estável para a auditoria embutida (reflete a simulação atual).
  const auditInput = useMemo(
    () => ({
      salarioBruto: bruto,
      dependentes,
      subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
      subsidioRefeicaoCartao: cartao,
      diasUteis,
      estadoCivil,
      deficiencia,
      regiao,
      irsJovemAno: jovemAno,
    }),
    [bruto, dependentes, temSubsidio, subsidioDia, cartao, diasUteis, estadoCivil, deficiencia, regiao, jovemAno]
  );

  // Recibo detalhado (com rendimentos adicionais e faltas).
  const diasSemSubsidio = Math.min(diasUteis, Math.max(0, Math.round(num(diasSemSubsidioStr))));
  const det = useMemo(
    () =>
      calcularReciboMensal({
        salarioBruto: bruto,
        dependentes,
        estadoCivil,
        deficiencia,
        regiao,
        irsJovemAno: jovemAno,
        subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
        subsidioRefeicaoCartao: cartao,
        diasSubsidio: Math.max(0, diasUteis - diasSemSubsidio),
        horasAusencia: num(horasAusenciaStr),
        horasSuplementares: horasSupStr.map(num),
        premio: num(premioStr),
        premioRegular,
        subsidioFerias: num(subFeriasStr),
        subsidioNatal: num(subNatalStr),
        outrosRendimentosSujeitos: num(outrosSujeitosStr),
        ajudasNacionalDias: Math.round(num(ajNDiasStr)),
        ajudasNacionalValorDia: num(ajNValStr),
        ajudasEstrangeiroDias: Math.round(num(ajEDiasStr)),
        ajudasEstrangeiroValorDia: num(ajEValStr),
      }),
    [
      bruto, dependentes, estadoCivil, deficiencia, regiao, jovemAno, temSubsidio, subsidioDia, cartao, diasUteis, diasSemSubsidio,
      horasAusenciaStr, horasSupStr, premioStr, premioRegular, subFeriasStr, subNatalStr, outrosSujeitosStr,
      ajNDiasStr, ajNValStr, ajEDiasStr, ajEValStr,
    ]
  );

  const limiteSubsidio = cartao ? SUBSIDIO_REFEICAO.cartao.value : SUBSIDIO_REFEICAO.dinheiro.value;
  const subsidioExcede = temSubsidio && subsidioDia > limiteSubsidio;
  const liquidoMostrado = duodecimos ? ra.liquidoMedioMes : r.liquido;

  // IRS Jovem e dependentes complementam-se: os dependentes reduzem a retenção
  // mensal pela parcela a abater; o IRS Jovem reduz proporcionalmente o que
  // sobra. Quando os dependentes já zeram a retenção, a poupança MENSAL do IRS
  // Jovem é 0 — mas a isenção continua a contar no acerto anual (rendimento
  // tributável). Distinguimos os dois casos para não parecer que «não atualiza».
  const poupancaJovemMes = Math.max(0, r.irsSemJovem - r.irsRetido);
  const retencaoJaZero = irsJovem && r.isencaoJovemPct > 0 && poupancaJovemMes <= 0.005;

  // Para onde vai o salário bruto: fica contigo, retenção de IRS, Segurança Social.
  const fica = Math.max(0, r.bruto - r.ssTrabalhador - r.irsRetido);
  const ficaPct = r.bruto > 0 ? fica / r.bruto : 0;
  const segBruto: Seg[] = [
    { label: "Fica contigo", value: fica, color: "", brand: true },
    { label: "Retenção IRS", value: r.irsRetido, color: COR_IRS },
    { label: "Segurança Social", value: r.ssTrabalhador, cls: CLS_SS },
  ];
  const descontosAnuais = ra.irsAnual + ra.ssAnual;
  const segAno: Seg[] = [
    { label: "Líquido", value: ra.liquidoAnual, color: "", brand: true },
    { label: "IRS + SS", value: descontosAnuais, cls: CLS_SS },
  ];

  const { naNuvem, limite, limiteAtingido, guardar } = useCenarios();
  const exportPro = useExportacaoPro();
  const [avisoGuardar, setAvisoGuardar] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [dialogGuardar, setDialogGuardar] = useState(false);

  function exportarCSV() {
    if (!exportPro.tentarExportar("vencimento")) return;
    // Inclui sempre a simulação atual (mesmo sem cenários guardados) e, a seguir,
    // o histórico guardado — para o CSV ser útil em qualquer situação.
    const cenarioAtual: CenarioVencimento = {
      id: "atual",
      nome: "Simulação atual",
      salarioBruto: bruto,
      dependentes,
      subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
      subsidioRefeicaoCartao: cartao,
      diasUteis,
      duodecimos,
      criadoEm: new Date().toISOString(),
    };
    const csv = gerarCSVCenarios([cenarioAtual]);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recibocerto-cenarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function descarregarRelatorio() {
    if (!exportPro.tentarExportar("vencimento")) return;
    const { printRelatorioVencimento } = await import("@/lib/export-vencimento");
    printRelatorioVencimento({
      situacao: SITUACAO_LABEL[estadoCivil],
      dependentes,
      dependentesDeficientes: depDeficientes,
      deficiencia,
      subsidioDia: temSubsidio ? subsidioDia : 0,
      subsidioForma: temSubsidio ? (cartao ? "Cartão" : "Dinheiro") : "—",
      diasUteis,
      duodecimos,
      bruto: r.bruto,
      ssTrabalhador: r.ssTrabalhador,
      irsRetido: r.irsRetido,
      subsidioRefeicaoTotal: r.subsidioRefeicaoTotal,
      subsidioRefeicaoIsento: r.subsidioRefeicaoIsento,
      subsidioRefeicaoTributado: r.subsidioRefeicaoTributado,
      liquido: r.liquido,
      liquidoMostrado,
      taxaEfetiva: r.taxaEfetiva,
      custoEmpresa: r.custoEmpresa,
      irsJovemAtivo: irsJovem,
      irsJovemPct: r.isencaoJovemPct,
      irsJovemAno,
      rendimentoIsentoJovem: r.rendimentoIsentoJovem,
      irsSemJovem: r.irsSemJovem,
      ssTaxaTrab: SS_DEPENDENTE.trabalhador.value,
      tsuTaxa: SS_DEPENDENTE.entidade.value,
      brutoAnual: ra.brutoAnual,
      subsidioFerias: ra.subsidioFerias,
      subsidioNatal: ra.subsidioNatal,
      irsFerias: ra.irsFerias,
      irsNatal: ra.irsNatal,
      irsAnual: ra.irsAnual,
      ssAnual: ra.ssAnual,
      liquidoAnual: ra.liquidoAnual,
      liquidoMedioMes: ra.liquidoMedioMes,
    });
  }

  // Instantâneo COMPLETO dos campos — para reabrir exatamente como ficou.
  const montarSnapshot = () => ({
    brutoStr, dependentes, temSubsidio, subsidioDiaStr, cartao, diasUteisStr, duodecimos,
    variavelStr, estadoCivil, deficiencia, depDeficientes, regiao, irsJovem, irsJovemAno,
    mostrarExtras, mes, horasAusenciaStr, diasSemSubsidioStr, horasSupStr, premioStr, premioRegular,
    subFeriasStr, subNatalStr, outrosSujeitosStr, ajNDiasStr, ajNValStr, ajEDiasStr, ajEValStr,
  });

  const nomePadraoCenario = `Vencimento · ${fmt(bruto)}/mês${dependentes > 0 ? ` · ${dependentes} dep.` : ""}`;

  function guardarCenario(nome: string) {
    const nomePadrao = nomePadraoCenario;
    const resumo: ResumoCenario = {
      destaque: r.liquido,
      destaqueLabel: "Líquido mensal",
      destaqueFmt: "eur",
      linhas: [
        { label: "Bruto mensal", valor: r.bruto, fmt: "eur" },
        { label: "IRS + Segurança Social", valor: r.irsRetido + r.ssTrabalhador, fmt: "eur" },
        { label: "Líquido anual", valor: ra.liquidoAnual, fmt: "eur" },
        { label: "Taxa efetiva", valor: r.taxaEfetiva, fmt: "pct" },
      ],
    };
    const res = guardar({ tipo: "vencimento", nome: nome || nomePadrao, resumo, dados: montarSnapshot() });
    if (res.erro) {
      setAvisoGuardar({ tipo: "erro", texto: res.erro });
    } else {
      espelharVencimentoLegado({
        nome: nome || nomePadrao,
        salarioBruto: bruto,
        dependentes,
        subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
        subsidioRefeicaoCartao: cartao,
        diasUteis,
      });
      setAvisoGuardar({ tipo: "ok", texto: "Cenário guardado em «Os meus cenários»." });
    }
    setDialogGuardar(false);
  }

  // Reabre um cenário marcado a partir da página de gestão (uma vez, na montagem).
  useEffect(() => {
    const d = consumirReabertura("vencimento") as Partial<ReturnType<typeof montarSnapshot>> | null;
    if (!d) return;
    const set = <T,>(v: T | undefined, fn: (x: T) => void) => { if (v !== undefined) fn(v); };
    set(d.brutoStr, setBrutoStr); set(d.dependentes, setDependentes); set(d.temSubsidio, setTemSubsidio);
    set(d.subsidioDiaStr, setSubsidioDiaStr); set(d.cartao, setCartao); set(d.diasUteisStr, setDiasUteisStr);
    set(d.duodecimos, setDuodecimos); set(d.variavelStr, setVariavelStr); set(d.estadoCivil, setEstadoCivil);
    set(d.deficiencia, setDeficiencia); set(d.depDeficientes, setDepDeficientes); set(d.regiao, setRegiao);
    set(d.irsJovem, setIrsJovem); set(d.irsJovemAno, setIrsJovemAno); set(d.mostrarExtras, setMostrarExtras);
    set(d.mes, setMes); set(d.horasAusenciaStr, setHorasAusenciaStr); set(d.diasSemSubsidioStr, setDiasSemSubsidioStr);
    set(d.horasSupStr, setHorasSupStr); set(d.premioStr, setPremioStr); set(d.premioRegular, setPremioRegular);
    set(d.subFeriasStr, setSubFeriasStr); set(d.subNatalStr, setSubNatalStr); set(d.outrosSujeitosStr, setOutrosSujeitosStr);
    set(d.ajNDiasStr, setAjNDiasStr); set(d.ajNValStr, setAjNValStr); set(d.ajEDiasStr, setAjEDiasStr); set(d.ajEValStr, setAjEValStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplica os dados extraídos de um recibo em PDF (Pro) ao simulador, decompondo
  // o recibo nos campos certos para a base de IRS/Segurança Social bater certo.
  function aplicarReciboPdf(e: ReciboExtraido) {
    const base = e.salarioBase ?? 0;
    if (e.salarioBase !== undefined) setBrutoStr(String(e.salarioBase).replace(".", ","));

    // ── Subsídio de refeição ──
    // Preferir valor/dia × nº de dias extraídos (preserva os valores reais do
    // recibo, ex.: 10,20 × 19 = 193,80); senão, repartir o total por 22 dias.
    const subTotal = e.subsidioRefeicaoTotal ?? 0;
    if ((e.subsidioRefeicaoDia ?? 0) > 0 && (e.subsidioRefeicaoDias ?? 0) > 0) {
      setTemSubsidio(true);
      if (e.subsidioRefeicaoCartao !== undefined) setCartao(e.subsidioRefeicaoCartao);
      setSubsidioDiaStr(String(e.subsidioRefeicaoDia).replace(".", ","));
      setDiasUteisStr(String(e.subsidioRefeicaoDias));
      setDiasSemSubsidioStr("");
    } else if (subTotal > 0) {
      setTemSubsidio(true);
      if (e.subsidioRefeicaoCartao !== undefined) setCartao(e.subsidioRefeicaoCartao);
      const dias = 22;
      setDiasUteisStr(String(dias));
      setSubsidioDiaStr((Math.round((subTotal / dias) * 100) / 100).toString().replace(".", ","));
      setDiasSemSubsidioStr("");
    } else if (e.subsidioRefeicaoCartao !== undefined) {
      setTemSubsidio(true);
      setCartao(e.subsidioRefeicaoCartao);
    }

    // ── Prémio ──
    // No recibo o prémio integra a base da Segurança Social → tratá-lo como
    // regular para a base bater certo.
    const premio = e.premio ?? 0;
    if (premio > 0) {
      setPremioStr(String(premio).replace(".", ","));
      setPremioRegular(true);
    } else {
      setPremioStr("");
    }

    // ── Feriados / outros rendimentos sujeitos ──
    // Tudo o que é sujeito a IRS/SS além do salário base e do prémio
    // (feriados trabalhados, diuturnidades, etc.). Garante que
    // base + prémio + outros = remuneração sujeita do recibo.
    let outros = 0;
    if (e.remuneracaoSujeita !== undefined && e.remuneracaoSujeita > base + 0.01) {
      outros = Math.round((e.remuneracaoSujeita - base - premio) * 100) / 100;
    } else if ((e.feriados ?? 0) > 0) {
      outros = e.feriados as number;
    }
    outros = Math.max(0, outros);
    setOutrosSujeitosStr(outros > 0 ? String(outros).replace(".", ",") : "");

    // ── Faltas — informativo (já refletido na remuneração sujeita). ──
    setHorasAusenciaStr("");

    if (premio > 0 || outros > 0 || subTotal > 0) setMostrarExtras(true);

    if (e.mes !== undefined) setMes(e.mes);
    setReciboPdf(e);
    setPdfKey((k) => k + 1);
  }

  // Estilos partilhados
  const subCard = "rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/40 p-4";
  const eyebrow = "text-[11px] font-semibold uppercase tracking-wide text-stone-400";
  const campoSm =
    "w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";
  const labelSm = "mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400";
  const seg = segClass;

  return (
    <div className="my-8 space-y-5">
      {/* Entrada principal: importar recibo em PDF (Pro) — preenche o simulador e a auditoria */}
      <div>
        <ImportarReciboPDF onAplicar={aplicarReciboPdf} />
        {reciboPdf && (reciboPdf.empresaNome || reciboPdf.funcao || reciboPdf.mes !== undefined) && (
          <p className="mt-2 px-1 text-[11px] text-stone-400">
            Recibo importado
            {reciboPdf.empresaNome ? ` · ${reciboPdf.empresaNome}` : ""}
            {reciboPdf.empresaNif ? ` (${reciboPdf.empresaNif})` : ""}
            {reciboPdf.funcao ? ` · ${reciboPdf.funcao}` : ""}
            {reciboPdf.mes !== undefined ? ` · ${MESES[reciboPdf.mes]}${reciboPdf.ano ? ` ${reciboPdf.ano}` : ""}` : ""}
          </p>
        )}
      </div>

      {/* Simulador */}
      <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-card sm:p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">
            <Wallet size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Simulador do recibo de vencimento</p>
            <p className="text-[11px] text-stone-400">Tabelas oficiais 2026 · estimativa</p>
          </div>
        </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ── Controlos ── */}
        <div className="space-y-5 lg:col-span-2">
          <div>
            <label htmlFor="bruto" className="mb-2 block text-xs font-semibold text-stone-600 dark:text-stone-400">
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
              className="mt-2 w-full accent-brand"
            />
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold text-stone-600 dark:text-stone-400">Dependentes</span>
            <div className="flex gap-2" role="group" aria-label="Número de dependentes">
              {DEPENDENTES.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dependentes === d}
                  onClick={() => { setDependentes(d); if (d < depDeficientes) setDepDeficientes(d); }}
                  className={`flex-1 ${seg(dependentes === d)}`}
                >
                  {d === 4 ? "4+" : d}
                </button>
              ))}
            </div>
            {dependentes > 0 && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-stone-600 dark:text-stone-300">
                    Com deficiência (≥ 60%)
                  </span>
                  <InfoTip label="Art. 87.º CIRS">
                    Cada dependente com grau de incapacidade permanente ≥ 60% (atestado multiúso) confere uma dedução adicional de {Math.round(DEDUCAO_DEPENDENTE_DEFICIENCIA.value)} € à coleta de IRS (2,5 × IAS). Acumula com a dedução normal por dependente.
                  </InfoTip>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setDepDeficientes(Math.max(0, depDeficientes - 1))}
                    disabled={depDeficientes <= 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand hover:text-brand transition-all disabled:opacity-30"
                  >
                    <span className="text-sm font-semibold leading-none">−</span>
                  </button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">{depDeficientes}</span>
                  <button
                    type="button"
                    onClick={() => setDepDeficientes(Math.min(dependentes, depDeficientes + 1))}
                    disabled={depDeficientes >= dependentes}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand hover:text-brand transition-all disabled:opacity-30"
                  >
                    <span className="text-sm font-semibold leading-none">+</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold text-stone-600 dark:text-stone-400">
              Situação{" "}
              <InfoTip label="Tabela de retenção">
                &quot;Casado, único titular&quot; aplica-se quando o cônjuge não tem rendimentos (ou tem menos de 5%).
                Define a tabela de retenção do Despacho 233-A/2026.
              </InfoTip>
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação familiar">
              {(
                [
                  ["naoCasado", "Não casado"],
                  ["casadoDois", "Casado, 2 titulares"],
                  ["casadoUnico", "Casado, 1 titular"],
                ] as [EstadoCivilRet, string][]
              ).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={estadoCivil === k} onClick={() => setEstadoCivil(k)} className={seg(estadoCivil === k)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5">
            <input type="checkbox" checked={deficiencia} onChange={(e) => setDeficiencia(e.target.checked)} className="h-4 w-4 accent-brand" />
            <span className="text-sm text-stone-700 dark:text-stone-300">Grau de incapacidade ≥ 60%</span>
            <InfoTip label="Tabelas IV a VII">
              Titular com grau de incapacidade permanente igual ou superior a 60% — usa as tabelas IV a VII.
            </InfoTip>
          </label>

          {/* Região */}
          <div>
            <span className="mb-2 block text-xs font-semibold text-stone-600 dark:text-stone-400">
              Região{" "}
              <InfoTip label="Tabelas de retenção">
                A Segurança Social (11%) é igual em todo o país. A retenção de IRS da Madeira e dos Açores segue tabelas
                próprias (em geral mais baixas); a estimativa aqui usa a tabela do Continente — confirma com o teu recibo.
              </InfoTip>
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Região">
              {(
                [
                  ["continente", "Continente"],
                  ["madeira", "Madeira"],
                  ["acores", "Açores"],
                ] as ["continente" | "madeira" | "acores", string][]
              ).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={regiao === k} onClick={() => setRegiao(k)} className={seg(regiao === k)}>
                  {label}
                </button>
              ))}
            </div>
            {regiao !== "continente" && (
              <p className="mt-2 rounded-lg border border-brand/20 bg-brand-light px-3 py-1.5 text-[11px] leading-relaxed text-brand-dark">
                A usar as tabelas de retenção de 2026 {regiao === "madeira" ? "da Madeira (Despacho n.º 19/2026)" : "dos Açores (Despacho n.º 1179/2026)"}.
                A Segurança Social (11%) é igual em todo o país.
              </p>
            )}
          </div>

          {/* IRS Jovem (Art. 12.º-B CIRS) */}
          <div className={cx("rounded-2xl border p-4 transition-colors", irsJovem ? "border-brand/30 bg-brand-light/50 dark:bg-brand/10" : "border-stone-100 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50")}>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={irsJovem} onChange={(e) => setIrsJovem(e.target.checked)} className="h-4 w-4 accent-brand" />
              <Sparkle size={15} className="text-brand" />
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">IRS Jovem</span>
              <InfoTip label="Art. 12.º-B CIRS">
                Isenção parcial de IRS para quem tem até 35 anos, nos 10 primeiros anos de rendimentos de trabalho: 100% no
                1.º ano, 75% no 2.º–4.º, 50% no 5.º–7.º e 25% no 8.º–10.º, até ao teto de 55 × IAS por ano. Não é automático:
                tens de comunicar à entidade empregadora que queres beneficiar do regime.
              </InfoTip>
              <span className="ml-auto text-[11px] text-stone-400">{irsJovem ? "ativo" : "isenção parcial"}</span>
            </label>
            {irsJovem && (
              <div className="mt-4 space-y-3">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Ano de benefício</span>
                  <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Ano de benefício do IRS Jovem">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((a) => (
                      <button key={a} type="button" aria-pressed={irsJovemAno === a} onClick={() => setIrsJovemAno(a)} className={seg(irsJovemAno === a)}>
                        {a}.º
                      </button>
                    ))}
                  </div>
                </div>
                <p className="rounded-lg border border-brand/20 bg-brand-light px-3 py-2 text-[11px] leading-relaxed text-brand-dark">
                  Isenção de {pct(r.isencaoJovemPct)} sobre a remuneração{r.rendimentoIsentoJovem > 0 ? ` — ${fmt(r.rendimentoIsentoJovem)} isentos este mês` : ""}.
                  {r.excedeTetoJovem ? ` Limitada ao teto mensal de ${fmt(IRS_JOVEM_TETO_MENSAL)} (55 × IAS ÷ 14).` : ""}
                  {" "}
                  {poupancaJovemMes > 0.005
                    ? `Poupas ${fmt(poupancaJovemMes)} de IRS por mês${dependentes > 0 ? ", já a contar com os teus dependentes" : ""} face a não ter o regime.`
                    : dependentes > 0
                      ? `Com ${dependentes} dependente${dependentes > 1 ? "s" : ""}, a retenção mensal já está em 0 € — o IRS Jovem e os dependentes complementam-se. A isenção continua a contar: reduz o rendimento tributável do ano (vê o acerto anual abaixo).`
                      : "A este salário a retenção mensal já é 0 € — a isenção continua a reduzir o rendimento tributável no acerto anual de IRS."}
                </p>
              </div>
            )}
          </div>

          {/* Subsídio de refeição */}
          <div className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50 p-4">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={temSubsidio} onChange={(e) => setTemSubsidio(e.target.checked)} className="h-4 w-4 accent-brand" />
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Subsídio de refeição</span>
              <InfoTip label="Limites de isenção 2026">
                Isento até {fmt(SUBSIDIO_REFEICAO.dinheiro.value)}/dia em dinheiro e {fmt(SUBSIDIO_REFEICAO.cartao.value)}/dia em cartão.
              </InfoTip>
            </label>
            {temSubsidio && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="subdia" className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">
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
                        className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="dias" className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Dias úteis
                    </label>
                    <input
                      id="dias"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={diasUteisStr}
                      onChange={(e) => setDiasUteisStr(soInteiro(e.target.value))}
                      className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Forma de pagamento</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" aria-pressed={cartao} onClick={() => setCartao(true)} className={seg(cartao)}>
                      Cartão
                    </button>
                    <button type="button" aria-pressed={!cartao} onClick={() => setCartao(false)} className={seg(!cartao)}>
                      Dinheiro
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rendimentos adicionais e faltas (secção avançada) */}
          <div className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50">
            <button
              type="button"
              onClick={() => setMostrarExtras((v) => !v)}
              aria-expanded={mostrarExtras}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
                <Coin size={15} className="text-brand" /> Rendimentos adicionais e faltas
              </span>
              <Plus size={16} className={`flex-shrink-0 text-stone-400 transition-transform ${mostrarExtras ? "rotate-45" : ""}`} />
            </button>

            {mostrarExtras && (
              <div className="space-y-4 border-t border-stone-100 dark:border-stone-700 px-4 pb-4 pt-3">
                {/* Mês e ano de referência (contexto) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="mes" className={labelSm}>Mês de referência</label>
                    <select id="mes" value={mes} onChange={(e) => setMes(Number(e.target.value))} className={campoSm}>
                      {MESES.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={labelSm}>Ano</span>
                    <div className={`${campoSm} flex items-center text-stone-500 dark:text-stone-400`}>2026 (atual)</div>
                  </div>
                </div>

                {/* Faltas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="faltas" className={labelSm}>
                      Horas de ausência{" "}
                      <InfoTip label="Faltas">Horas de falta não remuneradas. Descontam-se à taxa horária (retribuição × 12 ÷ (52 × {HORARIO_SEMANAL_COMPLETO.value}h)).</InfoTip>
                    </label>
                    <input id="faltas" type="text" inputMode="decimal" autoComplete="off" value={horasAusenciaStr} onChange={(e) => setHorasAusenciaStr(soDecimal(e.target.value))} placeholder="0" className={campoSm} />
                  </div>
                  <div>
                    <label htmlFor="dias-sem-sub" className={labelSm}>Dias sem subsídio refeição</label>
                    <input id="dias-sem-sub" type="text" inputMode="numeric" autoComplete="off" value={diasSemSubsidioStr} onChange={(e) => setDiasSemSubsidioStr(soInteiro(e.target.value))} placeholder="0" className={campoSm} />
                  </div>
                </div>

                {/* Trabalho suplementar */}
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400">
                    Trabalho suplementar (horas)
                    <InfoTip label="Art. 268.º do Código do Trabalho">
                      Acréscimos sobre a retribuição horária: 25% (1.ª hora) e 37,5% (seguintes) em dia útil; 50% em dia
                      de descanso ou feriado. Acima de 100h/ano sobem para 50%/75%/100%. A retenção de IRS sobre estas
                      horas é metade da taxa do mês.
                    </InfoTip>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {TRABALHO_SUPLEMENTAR.acrescimos.value.map((acrescimo, i) => (
                      <div key={i}>
                        <label htmlFor={`sup-${i}`} className="mb-1 block text-[11px] text-stone-400">
                          +{(acrescimo * 100).toString().replace(".", ",")}% · {SUPLEMENTAR_LABELS[i]}
                        </label>
                        <input
                          id={`sup-${i}`}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={horasSupStr[i]}
                          onChange={(e) =>
                            setHorasSupStr((arr) => arr.map((x, j) => (j === i ? soDecimal(e.target.value) : x)))
                          }
                          placeholder="0"
                          className={campoSm}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prémio */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="premio" className={labelSm}>Prémio / bónus (€)</label>
                    <label className="mb-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                      <input type="checkbox" checked={premioRegular} onChange={(e) => setPremioRegular(e.target.checked)} className="h-3.5 w-3.5 accent-brand" />
                      Regular
                      <InfoTip label="Segurança Social">Prémios de caráter regular integram a base de incidência da Segurança Social (Código Contributivo). Os pontuais/voluntários não.</InfoTip>
                    </label>
                  </div>
                  <input id="premio" type="text" inputMode="decimal" autoComplete="off" value={premioStr} onChange={(e) => setPremioStr(soDecimal(e.target.value))} placeholder="0" className={campoSm} />
                </div>

                {/* Subsídios pagos este mês */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sub-ferias" className={labelSm}>Subsídio de férias (€)</label>
                    <input id="sub-ferias" type="text" inputMode="decimal" autoComplete="off" value={subFeriasStr} onChange={(e) => setSubFeriasStr(soDecimal(e.target.value))} placeholder="0" className={campoSm} />
                  </div>
                  <div>
                    <label htmlFor="sub-natal" className={labelSm}>Subsídio de Natal (€)</label>
                    <input id="sub-natal" type="text" inputMode="decimal" autoComplete="off" value={subNatalStr} onChange={(e) => setSubNatalStr(soDecimal(e.target.value))} placeholder="0" className={campoSm} />
                  </div>
                </div>

                {/* Outros rendimentos sujeitos a IRS/SS (feriados, diuturnidades…) */}
                <div>
                  <label htmlFor="outros-sujeitos" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                    Outros rendimentos sujeitos (€)
                    <InfoTip label="O que é">
                      Rendimentos do recibo sujeitos a IRS e Segurança Social além do salário base — feriados
                      trabalhados, diuturnidades, etc. Ao importar um recibo em PDF, preenchemos isto com a diferença
                      entre a remuneração sujeita e o salário base, para os descontos baterem certo.
                    </InfoTip>
                  </label>
                  <input id="outros-sujeitos" type="text" inputMode="decimal" autoComplete="off" value={outrosSujeitosStr} onChange={(e) => setOutrosSujeitosStr(soDecimal(e.target.value))} placeholder="0" className={campoSm} />
                </div>

                {/* Ajudas de custo */}
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400">
                    Ajudas de custo (deslocações)
                    <InfoTip label="Limites de isenção 2026">
                      Isentas de IRS e Segurança Social até {fmt(AJUDAS_CUSTO.nacionalDia.value)}/dia em território
                      nacional e {fmt(AJUDAS_CUSTO.estrangeiroDia.value)}/dia no estrangeiro. O que exceder é tributado.
                    </InfoTip>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="aj-n-dias" className="mb-1 block text-[11px] text-stone-400">Dias (nacional)</label>
                      <input id="aj-n-dias" type="text" inputMode="numeric" autoComplete="off" value={ajNDiasStr} onChange={(e) => setAjNDiasStr(soInteiro(e.target.value))} placeholder="0" className={campoSm} />
                    </div>
                    <div>
                      <label htmlFor="aj-n-val" className="mb-1 block text-[11px] text-stone-400">€/dia (nacional)</label>
                      <input id="aj-n-val" type="text" inputMode="decimal" autoComplete="off" value={ajNValStr} onChange={(e) => setAjNValStr(soDecimal(e.target.value))} placeholder="0" className={campoSm} />
                    </div>
                    <div>
                      <label htmlFor="aj-e-dias" className="mb-1 block text-[11px] text-stone-400">Dias (estrangeiro)</label>
                      <input id="aj-e-dias" type="text" inputMode="numeric" autoComplete="off" value={ajEDiasStr} onChange={(e) => setAjEDiasStr(soInteiro(e.target.value))} placeholder="0" className={campoSm} />
                    </div>
                    <div>
                      <label htmlFor="aj-e-val" className="mb-1 block text-[11px] text-stone-400">€/dia (estrangeiro)</label>
                      <input id="aj-e-val" type="text" inputMode="decimal" autoComplete="off" value={ajEValStr} onChange={(e) => setAjEValStr(soDecimal(e.target.value))} placeholder="0" className={campoSm} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Painel de resultados ── */}
        <div className="space-y-4 lg:col-span-3">
          {/* Hero — líquido */}
          <div className="rounded-3xl border border-brand/15 bg-brand/8 dark:bg-brand/10 p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Vencimento líquido estimado</p>
                <p className="mt-1 font-display text-4xl font-semibold text-brand tabular-nums sm:text-5xl">{fmt(liquidoMostrado)}</p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  {duodecimos ? "por mês, em média (subsídios em duodécimos)" : "num mês normal · compara com o teu recibo"}
                </p>
              </div>
              <div className="flex gap-1.5" role="group" aria-label="Pagamento dos subsídios">
                <button type="button" aria-pressed={!duodecimos} onClick={() => setDuodecimos(false)} className={seg(!duodecimos)}>
                  Por inteiro
                </button>
                <button type="button" aria-pressed={duodecimos} onClick={() => setDuodecimos(true)} className={seg(duodecimos)}>
                  Duodécimos
                </button>
              </div>
            </div>
            <SegBar segs={segBruto} />
          </div>

          {/* Para onde vai o bruto — donut + legenda com espaço (sem cortes) */}
          <div className={subCard}>
            <p className={eyebrow}>Para onde vai o bruto</p>
            <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <Donut
                segs={segBruto}
                centro={r.bruto > 0 ? pct(ficaPct) : "—"}
                centroSub={r.bruto > 0 ? "é teu" : "sem dados"}
              />
              <div className="w-full sm:flex-1">
                <SegLegend segs={segBruto} format={fmt} />
              </div>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile icon={<Gauge size={15} />} label="Taxa efetiva" value={pct(r.taxaEfetiva)} sub="IRS + Segurança Social / bruto" />
            <StatTile
              icon={<Building size={15} />}
              label={
                <>
                  Custo para a empresa{" "}
                  <InfoTip label="TSU">Bruto + {pct(SS_DEPENDENTE.entidade.value)} de contribuição da entidade.</InfoTip>
                </>
              }
              value={fmt(r.custoEmpresa)}
              sub="por mês, com a Taxa Social Única"
            />
            {r.isencaoJovemPct > 0 && (
              <StatTile
                tone="brand"
                icon={<Coin size={15} />}
                label={
                  <>
                    {retencaoJaZero ? "Isenção IRS Jovem" : "Poupança IRS Jovem"}{" "}
                    <InfoTip label="Art. 12.º-B CIRS">
                      {retencaoJaZero
                        ? `Os teus dependentes já levam a retenção mensal a 0 €, por isso não há poupança adicional este mês. A isenção de ${pct(r.isencaoJovemPct)} continua a contar no acerto anual de IRS, reduzindo o rendimento tributável.`
                        : `Menos retenção de IRS por estares no regime IRS Jovem (${pct(r.isencaoJovemPct)} de isenção este ano).`}
                    </InfoTip>
                  </>
                }
                value={retencaoJaZero ? fmt(r.rendimentoIsentoJovem) : fmt(poupancaJovemMes)}
                sub={retencaoJaZero ? "isentos/mês · conta no acerto anual" : `por mês · ${fmt(r.rendimentoIsentoJovem)} isentos`}
              />
            )}
          </div>

          {/* Subsídio de refeição (quando aplicável) */}
          {temSubsidio && (
            <div className={subCard}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={eyebrow}>Subsídio de refeição</p>
                <p className="text-sm text-stone-700 dark:text-stone-300 tabular-nums">
                  {fmt(r.subsidioRefeicaoTotal)} <span className="text-stone-400">· {fmt(r.subsidioRefeicaoIsento)} isento</span>
                </p>
              </div>
              {subsidioExcede && (
                <p className="mt-1.5 rounded-lg border border-alert-border bg-alert-bg px-3 py-1.5 text-xs text-alert-text">
                  {fmt(r.subsidioRefeicaoTributado)} acima do limite ({fmt(limiteSubsidio)}/dia) — sujeito a IRS e Segurança Social.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Ano + mealheiro ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Visão anual */}
        <div className={subCard}>
          <div className="mb-3 flex items-center justify-between">
            <p className={`${eyebrow} flex items-center gap-1.5`}>
              Ao ano (14 meses)
              <InfoTip label="Retenção autónoma">
                Os subsídios de férias e de Natal são tributados em separado do salário (Art. 99.º-C CIRS): a fórmula da
                tabela aplica-se ao valor de cada um.
              </InfoTip>
            </p>
            <span className="text-xs font-semibold text-brand tabular-nums">{fmt(ra.liquidoAnual)}/ano</span>
          </div>
          <SegBar segs={segAno} />
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-stone-400">Bruto anual</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(ra.brutoAnual)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">IRS + SS no ano</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">−{fmt(descontosAnuais)}</dd>
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
          </dl>
        </div>

        {/* Mealheiro fiscal — acerto anual de IRS */}
        <div className={subCard}>
          <div className="mb-3 flex items-center gap-1.5">
            <Coin size={14} className="text-brand" />
            <p className={eyebrow}>Mealheiro · acerto anual de IRS</p>
            <InfoTip label="Como funciona">
              A retenção mensal segue o salário base, mas o IRS do ano incide sobre tudo o que recebeste. Rendimentos
              variáveis (comissões, prémios, horas extra) são muitas vezes sub-retidos — aqui estimamos se vais pagar ou
              receber no acerto, e quanto convém reservar por mês. É uma estimativa.
            </InfoTip>
          </div>

          {/* Input claro, com rótulo e ajuda — para se perceber o que preencher. */}
          <label htmlFor="variavel" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400">
            Rendimentos variáveis recebidos no ano
          </label>
          <div className="relative">
            <input
              id="variavel"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={variavelStr}
              onChange={(e) => setVariavelStr(soDecimal(e.target.value))}
              placeholder="Ex.: 3000"
              aria-label="Rendimentos variáveis recebidos no ano"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€/ano</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
            Comissões, prémios, horas extra e outros extras pagos ao longo do ano, além do salário base.
          </p>

          {variavelAnual <= 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 px-3 py-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Indica os teus rendimentos variáveis acima para estimar o acerto anual de IRS — quanto deverás pagar ou
              receber, e quanto reservar por mês para não seres apanhado de surpresa.
            </div>
          ) : (
            <>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs text-stone-400">Bruto considerado no ano</dt>
                  <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(meal.brutoAnual)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs text-stone-400">IRS apurado no ano</dt>
                  <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(meal.irsApurado)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs text-stone-400">IRS retido no ano (estimado)</dt>
                  <dd className="font-medium text-stone-800 dark:text-stone-100 tabular-nums">{fmt(meal.irsRetido)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-800 pt-1.5">
                  <dt className="text-xs font-semibold text-stone-500 dark:text-stone-300">
                    {meal.acerto > 0 ? "Falta pagar no acerto" : "Reembolso estimado"}
                  </dt>
                  <dd className={`font-semibold tabular-nums ${meal.acerto > 0 ? "text-alert-text dark:text-amber-400" : "text-brand"}`}>
                    {fmt(Math.abs(meal.acerto))}
                  </dd>
                </div>
              </dl>
              <p
                className={`mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  meal.acerto > 0
                    ? "border border-alert-border bg-alert-bg text-alert-text"
                    : "border border-brand/20 bg-brand-light text-brand-dark"
                }`}
              >
                {meal.acerto > 0
                  ? `Reserva ${fmt(meal.reservaMensal)}/mês (${fmt(meal.acerto)} no ano) para cobrires o acerto de IRS sem sustos.`
                  : `Pela estimativa, não deverás IRS adicional — deverás até receber cerca de ${fmt(Math.abs(meal.acerto))} no acerto anual.`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Recibo detalhado do mês — só aparece quando há rendimentos adicionais ou faltas */}
      {det.temExtras && (
        <div className="mt-4">
          <div className={subCard}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className={`${eyebrow} flex items-center gap-1.5`}>
                <Wallet size={14} className="text-brand" /> Recibo de {MESES[mes]} 2026 · com extras
              </p>
              <span className="text-xs font-semibold text-brand tabular-nums">{fmt(det.brutoTotal)} bruto</span>
            </div>
            <dl className="space-y-1.5">
              <LinhaRecibo label="Salário base" value={fmt(det.baseRemunerada)} sub={det.descontoFaltas > 0 ? `após ${det.horasAusencia} h de ausência` : undefined} />
              {det.suplementarTotal > 0 && (
                <LinhaRecibo
                  label="Trabalho suplementar"
                  value={`+ ${fmt(det.suplementarTotal)}`}
                  sub={det.suplementarDetalhe
                    .filter((d) => d.horas > 0)
                    .map((d) => `${d.horas}h a +${(d.acrescimo * 100).toString().replace(".", ",")}%`)
                    .join(" · ")}
                />
              )}
              {det.premio > 0 && (
                <LinhaRecibo label={`Prémio${det.premioRegular ? " (regular)" : " (pontual)"}`} value={`+ ${fmt(det.premio)}`} sub={det.premioRegular ? "integra a base da Segurança Social" : "fora da base da Segurança Social"} />
              )}
              {det.subsidioFerias > 0 && <LinhaRecibo label="Subsídio de férias" value={`+ ${fmt(det.subsidioFerias)}`} />}
              {det.subsidioNatal > 0 && <LinhaRecibo label="Subsídio de Natal" value={`+ ${fmt(det.subsidioNatal)}`} />}
              {det.outrosSujeitos > 0 && <LinhaRecibo label="Outros rendimentos sujeitos" value={`+ ${fmt(det.outrosSujeitos)}`} sub="feriados, diuturnidades, etc." />}
              {det.ajudasTotal > 0 && (
                <LinhaRecibo
                  label="Ajudas de custo"
                  value={`+ ${fmt(det.ajudasTotal)}`}
                  sub={det.ajudasTributadas > 0 ? `${fmt(det.ajudasIsentas)} isentas · ${fmt(det.ajudasTributadas)} tributadas` : `${fmt(det.ajudasIsentas)} isentas`}
                />
              )}
              {det.subsidioRefeicaoTotal > 0 && (
                <LinhaRecibo label="Subsídio de refeição" value={`+ ${fmt(det.subsidioRefeicaoTotal)}`} sub={det.subsidioRefeicaoTributado > 0 ? `${fmt(det.subsidioRefeicaoTributado)} acima do limite (tributado)` : undefined} />
              )}
              <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
              <LinhaRecibo label="Segurança Social" value={`− ${fmt(det.ssTrabalhador)}`} muted sub={`11% sobre ${fmt(det.baseSS)}`} />
              <LinhaRecibo
                label="IRS retido"
                value={`− ${fmt(det.irsTotal)}`}
                muted
                sub={det.suplementarIRS > 0 || det.irsSubsidios > 0 ? "inclui retenção autónoma do suplementar e subsídios" : undefined}
              />
            </dl>
            <div className="mt-3 flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-2.5">
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Líquido total do mês</span>
              <span className="font-display text-xl font-semibold text-brand tabular-nums">{fmt(det.liquido)}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
              Estimativa. Horas extra à taxa horária (Art. 271.º CT) com os acréscimos do Art. 268.º; retenção do
              suplementar a 50% da taxa do mês; subsídios de férias/Natal com retenção autónoma; ajudas de custo isentas
              até ao limite legal. Não substitui o recibo oficial.
            </p>
          </div>
        </div>
      )}

      {/* Auditoria do recibo — gratuita */}
      <div className="mt-4">
        <AuditoriaPainel
          key={pdfKey}
          input={auditInput}
          irsInicial={reciboPdf?.irsRetido !== undefined ? String(reciboPdf.irsRetido).replace(".", ",") : ""}
          ssInicial={reciboPdf?.ssDesconto !== undefined ? String(reciboPdf.ssDesconto).replace(".", ",") : ""}
          remuneracaoSujeita={reciboPdf?.remuneracaoSujeita}
        />
      </div>

      {/* Relatório PDF + exportação CSV — extra Pro (bloqueio misto desbloqueia ambos) */}
      <div className="mt-4">
        <ProGate
          title="Relatório em PDF e exportação CSV"
          description="Descarrega esta simulação como relatório PDF — estrutura de custos e visão anual — e exporta os dados em CSV para Excel. Tudo incluído no plano Pro."
        >
          <div className={subCard}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <FileSign size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Relatório financeiro · PDF e CSV</p>
                  <p className="text-xs text-stone-400 tabular-nums">
                    Líquido {fmt(liquidoMostrado)}/mês · {fmt(ra.liquidoAnual)}/ano · empresa {fmt(r.custoEmpresa)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={descarregarRelatorio}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-glow transition-all hover:shadow-float"
                >
                  <FileSign size={14} /> Descarregar PDF
                </button>
                <button
                  type="button"
                  onClick={exportarCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark transition-all hover:bg-brand/15"
                >
                  <Export size={14} /> Exportar CSV
                </button>
              </div>
            </div>
          </div>
        </ProGate>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        Estimativa pelas tabelas de retenção de 2026 — Continente (Despacho 233-A/2026), Madeira (Despacho 19/2026) e
        Açores (Despacho 1179/2026), conforme a situação, a deficiência e a região —, ano completo de trabalho e ambos
        os subsídios iguais ao salário base. Não substitui o teu recibo oficial nem aconselhamento de um contabilista.
      </p>

      {/* ── Guardar na gestão de cenários (modo duplo + tiering) ── */}
      <div className="mt-5 border-t border-stone-100 dark:border-stone-800 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400">
            <History size={14} /> Guardar cenário
            <span className="font-normal text-stone-400">
              {naNuvem ? "· sincronizado (Pro)" : `· plano grátis: ${limite} cenário`}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setDialogGuardar(true)}
            disabled={limiteAtingido}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark transition-all hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} /> Guardar este cenário
          </button>
        </div>

        <p className="mt-2 text-xs text-stone-400">
          Guarda este cálculo (com todos os campos preenchidos) em{" "}
          <Link href="/dashboard/cenarios" className="font-medium text-brand-dark underline-offset-2 hover:underline dark:text-brand">
            Os meus cenários
          </Link>{" "}
          — para reabrires e continuares mais tarde.
        </p>

        {avisoGuardar && (
          <div className={`mt-3 flex items-start gap-2.5 rounded-xl border p-3 ${avisoGuardar.tipo === "ok" ? "border-brand/20 bg-brand-light" : "border-alert-border bg-alert-bg"}`}>
            <span className={`mt-0.5 ${avisoGuardar.tipo === "ok" ? "text-brand-dark" : "text-alert-text"}`}>
              {avisoGuardar.tipo === "ok" ? <ShieldCheck size={14} /> : <Wallet size={14} />}
            </span>
            <p className={`text-xs ${avisoGuardar.tipo === "ok" ? "text-brand-dark" : "text-alert-text"}`}>
              {avisoGuardar.texto}{" "}
              {avisoGuardar.tipo === "ok" ? (
                <Link href="/dashboard/cenarios" className="inline-flex items-center gap-0.5 font-semibold underline underline-offset-2">
                  Ver cenários <ArrowRight size={11} />
                </Link>
              ) : (
                <Link href="/dashboard/upgrade" className="font-semibold underline underline-offset-2">
                  Ver o plano Pro
                </Link>
              )}
            </p>
          </div>
        )}
      </div>
      </div>

      <UpsellExportacao aberto={exportPro.upsellAberto} onClose={exportPro.fecharUpsell} />
      <GuardarCenarioDialog
        aberto={dialogGuardar}
        nomePadrao={nomePadraoCenario}
        onGuardar={guardarCenario}
        onFechar={() => setDialogGuardar(false)}
      />
    </div>
  );
}
