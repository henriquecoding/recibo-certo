"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { simularIRSAnual, calcularCategoriaF } from "@/lib/fiscal";
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
  type Atividade,
  type DuracaoArrendamento,
  type Regiao,
  type EscalaoIVA,
} from "@/lib/fiscal-data";

// ─── Tipos e constantes locais ────────────────────────────────────────────────
type RegimeIVA = "isento" | EscalaoIVA;

const ATIVIDADE_DEFAULT =
  ATIVIDADES.find((a) => a.label.includes("Programador")) ?? ATIVIDADES[0];

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

const campo =
  "w-full px-3.5 py-2.5 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 " +
  "focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all " +
  "dark:bg-stone-800/50 dark:text-stone-100 dark:border-stone-700 dark:focus:border-brand";

const rotulo =
  "text-xs font-medium text-stone-500 uppercase tracking-wider dark:text-stone-400";

// ─── Motor de Compatibilidade Fiscal ─────────────────────────────────────────
type PrioridadeRegra = "erro" | "aviso" | "info" | "oportunidade";

interface RegraFiscal {
  id: string;
  prioridade: PrioridadeRegra;
  mensagem: string;
  detalhe: string;
}

interface EstadoSimulador {
  atividade: Atividade;
  bruto: number;
  regimeIVA: RegimeIVA;
  regiao: Regiao;
  dispensaRetencao: boolean;
  anoAtividade: number;
  irsJovemAno: number;
  regimeC: "simplificado" | "organizada";
  conjunta: boolean;
}

function avaliarRegras(s: EstadoSimulador): RegraFiscal[] {
  const regras: RegraFiscal[] = [];

  // IVA e faturação
  if (s.regimeIVA === "isento" && s.bruto > IVA_ISENCAO_EXCESSO.value) {
    regras.push({
      id: "iva-excesso",
      prioridade: "erro",
      mensagem: "Faturação incompatível com isenção de IVA",
      detalhe: `Com ${fmt(s.bruto)} de faturação anual ultrapassas o limite de ${fmt(IVA_ISENCAO_EXCESSO.value)} (Art. 53.º CIVA). Deves enquadrar-te no regime normal de IVA.`,
    });
  } else if (s.regimeIVA === "isento" && s.bruto > IVA_ISENCAO_LIMITE.value) {
    regras.push({
      id: "iva-transicao",
      prioridade: "aviso",
      mensagem: "Zona de transição no limiar de isenção de IVA",
      detalhe: `Faturação entre ${fmt(IVA_ISENCAO_LIMITE.value)} e ${fmt(IVA_ISENCAO_EXCESSO.value)}: zona de transição do Art. 53.º CIVA. Confirma com o teu contabilista se ainda podes manter a isenção.`,
    });
  }

  // IVA intermédia com profissão liberal
  if (s.regimeIVA === "intermedia" && s.atividade.tipo === "art151") {
    regras.push({
      id: "iva-13-art151",
      prioridade: "aviso",
      mensagem: `Taxa intermédia de IVA pouco provável para "${s.atividade.label}"`,
      detalhe:
        "As profissões do Art. 151.º aplicam normalmente IVA normal (23% no Continente). A taxa intermédia cobre listas específicas do CIVA (restauração, alojamento, produtos agrícolas). Verifica com o teu contabilista.",
    });
  }

  // IVA reduzida com profissão liberal
  if (s.regimeIVA === "reduzida" && s.atividade.tipo === "art151") {
    regras.push({
      id: "iva-6-art151",
      prioridade: "aviso",
      mensagem: `Taxa reduzida de IVA pouco provável para "${s.atividade.label}"`,
      detalhe:
        "A taxa reduzida aplica-se a bens/serviços específicos (medicamentos, livros, serviços sociais). Para a maioria das profissões liberais, o IVA é o normal. Confirma com o teu contabilista.",
    });
  }

  // Dispensa de retenção acima do limite
  if (s.dispensaRetencao && s.bruto > DISPENSA_RETENCAO_LIMITE.value) {
    regras.push({
      id: "dispensa-excede",
      prioridade: "aviso",
      mensagem: "Dispensa de retenção pode não ser aplicável",
      detalhe: `A dispensa (Art. 101.º-B CIRS) só vale quando a faturação anual prevista é inferior a ${fmt(DISPENSA_RETENCAO_LIMITE.value)}. Com ${fmt(s.bruto)} estimados, deves fazer retenção na fonte.`,
    });
  }

  // Regime simplificado acima do limite
  if (s.regimeC === "simplificado" && s.bruto > REGIME_SIMPLIFICADO.limite.value) {
    regras.push({
      id: "simplificado-obrigatorio",
      prioridade: "erro",
      mensagem: "Regime simplificado não disponível acima de 200 000 €",
      detalhe: `Com faturação superior a ${fmt(REGIME_SIMPLIFICADO.limite.value)}, a contabilidade organizada é obrigatória (Art. 28.º CIRS). Altera o regime acima.`,
    });
  }

  // Contabilidade organizada obrigatória — informativa
  if (s.regimeC === "organizada" && s.bruto > REGIME_SIMPLIFICADO.limite.value) {
    regras.push({
      id: "organizada-obrigatorio",
      prioridade: "info",
      mensagem: "Contabilidade organizada obrigatória à tua faturação",
      detalhe: `Acima de ${fmt(REGIME_SIMPLIFICADO.limite.value)}, o regime simplificado não é permitido por lei. Contabilidade organizada corretamente selecionada.`,
    });
  }

  // IRS Jovem — primeiro ano é o melhor
  if (s.irsJovemAno > 0) {
    const isencao = IRS_JOVEM.isencaoPorAno.value[s.irsJovemAno] ?? 0;
    if (isencao < 1) {
      regras.push({
        id: "irs-jovem-info",
        prioridade: "oportunidade",
        mensagem: `IRS Jovem ativo — isenção de ${pct(isencao)} no ${s.irsJovemAno}.º ano`,
        detalhe: `No 1.º ano a isenção é de 100%; decresce progressivamente até 25% no 8.º–10.º ano. Válido até aos 35 anos e por 10 anos consecutivos (Art. 2.º-B CIRS).`,
      });
    }
  }

  return regras;
}

// ─── Metadados de IVA (educativos, não alteram cálculo de IRS) ───────────────
interface MetaIVA {
  label: string;
  quando: string;
  compativel: string;
  incompativel?: string;
}

function metaIVA(regimeIVA: RegimeIVA, regiao: Regiao): MetaIVA {
  const t = IVA_TAXAS[regiao].value;
  switch (regimeIVA) {
    case "isento":
      return {
        label: `Isento — Art. 53.º CIVA`,
        quando: `Aplica-se quando a faturação anual é inferior a ${fmt(IVA_ISENCAO_LIMITE.value)}. Não cobras IVA ao cliente, nem podes deduzir IVA das tuas compras.`,
        compativel: "Qualquer atividade com faturação abaixo do limiar",
        incompativel: `Faturação acima de ${fmt(IVA_ISENCAO_EXCESSO.value)} — passa imediatamente ao regime normal`,
      };
    case "reduzida":
      return {
        label: `Taxa reduzida — ${pct(t.reduzida)}`,
        quando:
          "Bens e serviços das listas I e II do CIVA: medicamentos, livros, produtos alimentares básicos, assistência médica, serviços de assistência na doença, bebidas não alcoólicas…",
        compativel: "Farmacêuticos, saúde (serviços específicos), produção agrícola, alguns bens alimentares",
        incompativel: "Maioria das profissões liberais do Art. 151.º",
      };
    case "intermedia":
      return {
        label: `Taxa intermédia — ${pct(t.intermedia)}`,
        quando:
          "Lista II-A do CIVA: serviços de alimentação e bebidas (restauração), alojamento turístico, fornecimentos de produtos agrícolas específicos.",
        compativel: "Restauração, alojamento local, alguns produtos agrícolas",
        incompativel: "Profissões liberais do Art. 151.º, consultoria, TI, engenharia, advocacia",
      };
    case "normal":
      return {
        label: `Taxa normal — ${pct(t.normal)}`,
        quando:
          "Todos os bens e serviços que não constam das listas de taxa reduzida ou intermédia. É a taxa geral aplicável à esmagadora maioria dos serviços.",
        compativel: "Todas as profissões liberais (Art. 151.º), consultoria, TI, advocacia, engenharia, arquitetura",
      };
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SimuladorPage() {
  const { recibos, carregado, resumo } = useRecibos();

  // ── Categoria de rendimento ──
  const [categoria, setCategoria] = useState<"B" | "F">("B");

  // ── Campos — Categoria B ──
  const [atividade, setAtividade] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [brutoStr, setBrutoStr] = useState("25000");
  const [retStr, setRetStr] = useState("");
  const [despesasStr, setDespesasStr] = useState("");
  const [regimeC, setRegimeC] = useState<"simplificado" | "organizada">("simplificado");
  const [anoAtividade, setAnoAtividade] = useState(3);
  const [irsJovemAno, setIrsJovemAno] = useState(0);
  const [regimeIVA, setRegimeIVA] = useState<RegimeIVA>("normal");
  const [dispensaRetencao, setDispensaRetencao] = useState(false);

  // ── Painéis contextuais ──
  const [painelAtividade, setPainelAtividade] = useState(true);
  const [painelIVA, setPainelIVA] = useState(false);
  const [painelRetencao, setPainelRetencao] = useState(false);

  // ── Módulos opcionais ──
  const [famOn, setFamOn] = useState(false);
  const [conjunta, setConjunta] = useState(false);
  const [dependentesStr, setDependentesStr] = useState("0");
  const [outrosOn, setOutrosOn] = useState(false);
  const [outrosStr, setOutrosStr] = useState("");
  const [deducoesOn, setDeducoesOn] = useState(false);
  const [saudeStr, setSaudeStr] = useState("");
  const [educacaoStr, setEducacaoStr] = useState("");
  const [geraisStr, setGeraisStr] = useState("");

  // ── Campos — Categoria F ──
  const [rendaStr, setRendaStr] = useState("12000");
  const [despesasFStr, setDespesasFStr] = useState("");
  const [habitacao, setHabitacao] = useState(true);
  const [duracao, setDuracao] = useState<DuracaoArrendamento>("curto");
  const [retFStr, setRetFStr] = useState("");

  // ── Pré-preenchimento com recibos ──
  useEffect(() => {
    if (carregado && recibos.length > 0) {
      setBrutoStr(String(Math.round(resumo.bruto)));
      setRetStr(String(Math.round(resumo.retencao)));
    }
  }, [carregado, recibos.length, resumo.bruto, resumo.retencao]);

  // ── Derivados ──
  const ef = efeitoFiscal(atividade);
  const bruto = num(brutoStr);

  // ── Simulações (lógica inalterada) ──
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
        dependentes: famOn ? Math.floor(num(dependentesStr)) : 0,
        outrosRendimentos: outrosOn ? num(outrosStr) : 0,
        deducoes: deducoesOn
          ? { saude: num(saudeStr), educacao: num(educacaoStr), gerais: num(geraisStr) }
          : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      atividade, ef.coef, ef.regra15, bruto, retStr, despesasStr,
      regimeC, anoAtividade, irsJovemAno,
      famOn, conjunta, dependentesStr,
      outrosOn, outrosStr,
      deducoesOn, saudeStr, educacaoStr, geraisStr,
    ]
  );

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

  // ── Motor de regras ──
  const regras = useMemo(
    () =>
      categoria === "B"
        ? avaliarRegras({
            atividade,
            bruto,
            regimeIVA,
            regiao,
            dispensaRetencao,
            anoAtividade,
            irsJovemAno,
            regimeC,
            conjunta: famOn ? conjunta : false,
          })
        : [],
    [categoria, atividade, bruto, regimeIVA, regiao, dispensaRetencao, anoAtividade, irsJovemAno, regimeC, famOn, conjunta]
  );

  const erros = regras.filter((r) => r.prioridade === "erro");
  const avisosList = regras.filter((r) => r.prioridade === "aviso");
  const infoList = regras.filter((r) => r.prioridade === "info" || r.prioridade === "oportunidade");

  const reembolso = sim.saldo >= 0;
  const reembolsoF = simF.saldo >= 0;
  const taxasIVA = IVA_TAXAS[regiao].value;
  const ivaInfo = metaIVA(regimeIVA, regiao);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabeçalho */}
      <header className="mb-6">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">
          Simulação anual
        </div>
        <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">
          Simulador de IRS
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Ajusta ao detalhe da tua situação. Cada seleção explica as condições de aplicação e verifica
          a coerência com o teu perfil fiscal.
        </p>
      </header>

      {/* Indicador de progresso */}
      <div className="mb-6 flex items-center gap-0">
        {([
          { n: 1, label: "Perfil" },
          { n: 2, label: "Enquadramento" },
          { n: 3, label: "Opcionais" },
          { n: 4, label: "Resultado" },
        ] as const).map((passo, i) => {
          const done = (() => {
            if (passo.n === 1) return bruto > 0;
            if (passo.n === 2) return bruto > 0;
            if (passo.n === 3) return famOn || outrosOn || deducoesOn;
            return false;
          })();
          const active = passo.n === 4 ? bruto > 0 : passo.n <= 2 ? bruto > 0 : true;
          return (
            <div key={passo.n} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    done
                      ? "bg-brand text-white"
                      : active
                      ? "bg-brand-light text-brand-dark"
                      : "bg-stone-100 text-stone-400 dark:bg-stone-800"
                  }`}
                >
                  {done ? <Check size={11} /> : passo.n}
                </span>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    done ? "text-brand-dark dark:text-brand" : "text-stone-400"
                  }`}
                >
                  {passo.label}
                </span>
              </div>
              {i < 3 && (
                <div className="mx-2 h-px w-8 bg-stone-200 dark:bg-stone-700 sm:w-12" />
              )}
            </div>
          );
        })}
      </div>

      {/* Seletor de categoria */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className={rotulo}>Categoria de rendimento</span>
          <InfoTip>
            A categoria B abrange os recibos verdes (trabalho independente). A categoria F são as rendas
            de imóveis (arrendamento puro, sem alojamento local), tributadas a uma taxa autónoma, sem
            Segurança Social nem IVA.
          </InfoTip>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "B", label: "Categoria B", sub: "Recibos verdes / trabalho independente" },
              { id: "F", label: "Categoria F", sub: "Rendas de imóveis" },
            ] as const
          ).map((c) => {
            const active = categoria === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategoria(c.id)}
                className={`rounded-xl border p-3 text-center transition-all ${
                  active
                    ? "border-brand bg-brand-light"
                    : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"
                }`}
              >
                <div
                  className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}
                >
                  {c.label}
                </div>
                <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{c.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── CATEGORIA F ──────────────────────────────────────────────────── */}
      {categoria === "F" ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
            <SeccaoTitulo numero={1} titulo="Rendimentos prediais" />
            <div>
              <label htmlFor="renda" className={`mb-1.5 block ${rotulo}`}>
                Rendas brutas anuais (€)
              </label>
              <input
                id="renda"
                type="number"
                inputMode="decimal"
                min={0}
                step={500}
                value={rendaStr}
                onChange={(e) => setRendaStr(e.target.value)}
                className={campo}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label htmlFor="despesasF" className={rotulo}>
                  Despesas dedutíveis (€)
                </label>
                <InfoTip>
                  Gastos suportados com o imóvel (Art. 41.º CIRS): conservação e manutenção, IMI, imposto
                  do selo, condomínio e seguros. Não incluem mobiliário, eletrodomésticos nem juros de
                  financiamento.
                </InfoTip>
              </div>
              <input
                id="despesasF"
                type="number"
                inputMode="decimal"
                min={0}
                step={100}
                value={despesasFStr}
                onChange={(e) => setDespesasFStr(e.target.value)}
                placeholder="0"
                className={campo}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className={rotulo}>Tipo de arrendamento</span>
                <InfoTip>
                  O arrendamento para habitação é tributado a {pct(CATEGORIA_F.taxaHabitacao.value)}; o não
                  habitacional (comércio, escritórios) a {pct(CATEGORIA_F.taxaNaoHabitacao.value)}.
                </InfoTip>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { hab: true, label: "Habitação", sub: pct(CATEGORIA_F.taxaHabitacao.value) },
                    { hab: false, label: "Não habitacional", sub: pct(CATEGORIA_F.taxaNaoHabitacao.value) },
                  ] as const
                ).map((t) => {
                  const active = habitacao === t.hab;
                  return (
                    <button
                      key={t.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setHabitacao(t.hab)}
                      className={`rounded-xl border p-3 text-center transition-all ${
                        active
                          ? "border-brand bg-brand-light"
                          : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"
                      }`}
                    >
                      <div
                        className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}
                      >
                        {t.label}
                      </div>
                      <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{t.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            {habitacao && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <label htmlFor="duracao" className={rotulo}>
                    Duração do contrato
                  </label>
                  <InfoTip>
                    Contratos de arrendamento habitacional mais longos, comunicados à AT, reduzem a taxa:
                    5–10 anos −10 p.p., 10–20 anos −15 p.p., 20+ anos −20 p.p. (Art. 72.º CIRS).
                  </InfoTip>
                </div>
                <select
                  id="duracao"
                  value={duracao}
                  onChange={(e) => setDuracao(e.target.value as DuracaoArrendamento)}
                  className={campo}
                >
                  {(Object.keys(META_DURACAO) as DuracaoArrendamento[]).map((d) => (
                    <option key={d} value={d}>
                      {`${META_DURACAO[d].label} — ${META_DURACAO[d].sub}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="retF" className={`mb-1.5 block ${rotulo}`}>
                Retenções já pagas (€)
              </label>
              <input
                id="retF"
                type="number"
                inputMode="decimal"
                min={0}
                step={100}
                value={retFStr}
                onChange={(e) => setRetFStr(e.target.value)}
                placeholder="0"
                className={campo}
              />
            </div>
          </div>

          {/* Resultado F */}
          <PainelResultadoF simF={simF} reembolso={reembolsoF} />
        </div>
      ) : (
        /* ─── CATEGORIA B ──────────────────────────────────────────────── */
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          {/* Coluna de entradas */}
          <div className="space-y-4">
            {/* ── Secção 1: Perfil da atividade ── */}
            <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
              <SeccaoTitulo numero={1} titulo="Perfil da atividade" />
              <div className="mt-5 space-y-5">

                {/* Região */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={rotulo}>Região</span>
                    <InfoTip>
                      A região determina as taxas de IVA aplicáveis. O Continente, Madeira e Açores têm
                      escalões distintos (Art. 18.º CIVA).
                    </InfoTip>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "continente", label: "Continente" },
                        { id: "madeira", label: "Madeira" },
                        { id: "acores", label: "Açores" },
                      ] as const
                    ).map((r) => {
                      const active = regiao === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setRegiao(r.id)}
                          className={`rounded-xl border p-2.5 text-center text-sm transition-all ${
                            active
                              ? "border-brand bg-brand-light font-semibold text-brand-dark"
                              : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-300"
                          }`}
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
                    <InfoTip>
                      Procura a tua profissão na tabela do Art. 151.º (Portaria 1011/2001). Determina o
                      coeficiente do regime simplificado, a retenção na fonte e a base de Segurança Social.
                    </InfoTip>
                  </div>
                  <ActivityCombobox
                    value={atividade}
                    onChange={(a) => {
                      setAtividade(a);
                      setPainelAtividade(true);
                    }}
                  />
                  {/* Painel contextual da atividade */}
                  <PainelAtividade
                    atividade={atividade}
                    aberto={painelAtividade}
                    onFechar={() => setPainelAtividade(false)}
                  />
                </div>

                {/* Faturação e retenções */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="bruto" className={`mb-1.5 block ${rotulo}`}>
                      Faturação anual (€)
                    </label>
                    <input
                      id="bruto"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={500}
                      value={brutoStr}
                      onChange={(e) => setBrutoStr(e.target.value)}
                      className={campo}
                    />
                  </div>
                  <div>
                    <label htmlFor="ret" className={`mb-1.5 block ${rotulo}`}>
                      Retenções pagas (€)
                    </label>
                    <input
                      id="ret"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={100}
                      value={retStr}
                      onChange={(e) => setRetStr(e.target.value)}
                      placeholder="0"
                      className={campo}
                    />
                  </div>
                </div>

                {/* Ano de atividade */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <label htmlFor="ano" className={rotulo}>
                      Ano de atividade
                    </label>
                    <InfoTip>
                      No 1.º ano o coeficiente é reduzido em 50% e no 2.º ano em 25% (Art. 31.º, n.º 10
                      CIRS). A partir do 3.º ano aplica-se o coeficiente integral.
                    </InfoTip>
                  </div>
                  <select
                    id="ano"
                    value={anoAtividade}
                    onChange={(e) => setAnoAtividade(Number(e.target.value))}
                    className={campo}
                  >
                    <option value={1}>1.º ano — coeficiente reduzido em 50%</option>
                    <option value={2}>2.º ano — coeficiente reduzido em 25%</option>
                    <option value={3}>3.º ano ou seguinte — coeficiente integral</option>
                  </select>
                </div>

                {/* Regime de contabilidade */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={rotulo}>Regime de contabilidade</span>
                    <InfoTip>
                      No simplificado, o imposto incide sobre uma percentagem (coeficiente) do rendimento
                      bruto. Na contabilidade organizada, incide sobre o lucro real (receitas − despesas
                      documentadas). Obrigatória acima de 200 000 € por dois anos consecutivos.
                    </InfoTip>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: "simplificado", label: "Simplificado", sub: `Coeficiente ${pct(ef.coef)}` },
                        { id: "organizada", label: "Contab. organizada", sub: "Receitas − despesas reais" },
                      ] as const
                    ).map((r) => {
                      const active = regimeC === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setRegimeC(r.id)}
                          className={`rounded-xl border p-3 text-center transition-all ${
                            active
                              ? "border-brand bg-brand-light"
                              : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"
                          }`}
                        >
                          <div
                            className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}
                          >
                            {r.label}
                          </div>
                          <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{r.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Despesas */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <label htmlFor="despesas" className={rotulo}>
                      {regimeC === "organizada"
                        ? "Despesas reais da atividade (€)"
                        : "Despesas de atividade (€)"}
                    </label>
                    <InfoTip>
                      {regimeC === "organizada"
                        ? "Na contabilidade organizada, as despesas documentadas deduzem diretamente ao lucro tributável."
                        : `Faturas com NIF na e-fatura, rendas do espaço, pessoal. Reduzem a majoração da regra dos 15%. A dedução específica de ${fmt(DEDUCAO_ESPECIFICA_CATB.value)} já é considerada automaticamente.`}
                    </InfoTip>
                  </div>
                  <input
                    id="despesas"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={100}
                    value={despesasStr}
                    onChange={(e) => setDespesasStr(e.target.value)}
                    placeholder="0"
                    className={campo}
                  />
                </div>
              </div>
            </div>

            {/* ── Secção 2: Enquadramento fiscal ── */}
            <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
              <SeccaoTitulo numero={2} titulo="Enquadramento fiscal" />
              <div className="mt-5 space-y-5">

                {/* IVA */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={rotulo}>Regime de IVA</span>
                    <InfoTip>
                      O regime de IVA não altera o cálculo do IRS — é usado aqui para validar a
                      coerência do teu perfil fiscal e identificar incompatibilidades.
                    </InfoTip>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["isento", "reduzida", "intermedia", "normal"] as RegimeIVA[]).map((r) => {
                      const active = regimeIVA === r;
                      const label = {
                        isento: "Isento",
                        reduzida: `${pct(taxasIVA.reduzida)}`,
                        intermedia: `${pct(taxasIVA.intermedia)}`,
                        normal: `${pct(taxasIVA.normal)}`,
                      }[r];
                      const sub = {
                        isento: "Art. 53.º",
                        reduzida: "Reduzida",
                        intermedia: "Intermédia",
                        normal: "Normal",
                      }[r];
                      return (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setRegimeIVA(r);
                            setPainelIVA(true);
                          }}
                          className={`rounded-xl border p-3 text-center transition-all ${
                            active
                              ? "border-brand bg-brand-light"
                              : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"
                          }`}
                        >
                          <div
                            className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}
                          >
                            {label}
                          </div>
                          <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{sub}</div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Painel contextual IVA */}
                  {painelIVA && (
                    <PainelContextual
                      titulo={ivaInfo.label}
                      onFechar={() => setPainelIVA(false)}
                    >
                      <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                        {ivaInfo.quando}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-start gap-2 text-xs text-stone-500 dark:text-stone-400">
                          <Check size={12} className="mt-0.5 flex-shrink-0 text-brand" />
                          <span>
                            <strong className="text-stone-700 dark:text-stone-200">Compatível com:</strong>{" "}
                            {ivaInfo.compativel}
                          </span>
                        </div>
                        {ivaInfo.incompativel && (
                          <div className="flex items-start gap-2 text-xs text-stone-500 dark:text-stone-400">
                            <Warning size={12} className="mt-0.5 flex-shrink-0 text-alert-text" />
                            <span>
                              <strong className="text-stone-700 dark:text-stone-200">Atenção:</strong>{" "}
                              {ivaInfo.incompativel}
                            </span>
                          </div>
                        )}
                        {/* Validação com atividade */}
                        {regimeIVA !== "isento" && regimeIVA !== "normal" && atividade.tipo === "art151" && (
                          <div className="mt-2 rounded-lg border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">
                            A atividade selecionada ({atividade.label.split(" · ")[1] ?? atividade.label}){" "}
                            aplica normalmente IVA normal ({pct(taxasIVA.normal)}). Confirma o teu
                            enquadramento com o contabilista.
                          </div>
                        )}
                        {/* Validação com faturação */}
                        {regimeIVA === "isento" && bruto > IVA_ISENCAO_LIMITE.value && (
                          <div className="mt-2 rounded-lg border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">
                            A tua faturação estimada ({fmt(bruto)}) ultrapassa o limiar de isenção de{" "}
                            {fmt(IVA_ISENCAO_LIMITE.value)}. Verifica se ainda cumpres os requisitos do Art.
                            53.º CIVA.
                          </div>
                        )}
                      </div>
                    </PainelContextual>
                  )}
                </div>

                {/* Retenção na fonte */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={rotulo}>Retenção na fonte</span>
                    <InfoTip>
                      A retenção é um adiantamento de IRS retido pelo cliente. A dispensa aplica-se
                      quando a faturação anual prevista é inferior a {fmt(DISPENSA_RETENCAO_LIMITE.value)}
                      (Art. 101.º-B CIRS).
                    </InfoTip>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-1.5 text-xs">
                      <span className="rounded-lg bg-brand-light px-2.5 py-1.5 font-semibold text-brand-dark">
                        Taxa: {pct(ef.retencao)}
                      </span>
                      <span className="rounded-lg bg-stone-100 px-2.5 py-1.5 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                        {ef.legalCoef}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={dispensaRetencao}
                      onClick={() => {
                        setDispensaRetencao((v) => !v);
                        setPainelRetencao(true);
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                        dispensaRetencao
                          ? "border-brand bg-brand-light text-brand-dark"
                          : "border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-300"
                      }`}
                    >
                      <span
                        className={`relative h-4 w-7 flex-shrink-0 rounded-full transition-colors ${dispensaRetencao ? "bg-brand" : "bg-stone-300"}`}
                      >
                        <span
                          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${dispensaRetencao ? "left-[0.875rem]" : "left-0.5"}`}
                        />
                      </span>
                      Dispensar retenção
                    </button>
                  </div>
                  {painelRetencao && (
                    <PainelContextual
                      titulo="Dispensa de retenção na fonte"
                      onFechar={() => setPainelRetencao(false)}
                    >
                      <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                        Podes dispensar a retenção quando a tua faturação anual prevista é inferior a{" "}
                        <strong>{fmt(DISPENSA_RETENCAO_LIMITE.value)}</strong> (Art. 101.º-B, n.º 1, al. a)
                        CIRS). Deves comunicar essa intenção por escrito ao cliente no início de cada ano ou
                        do início da atividade.
                      </p>
                      <div className="mt-3 space-y-1.5 text-xs text-stone-500 dark:text-stone-400">
                        <div className="flex items-start gap-2">
                          <Check size={12} className="mt-0.5 flex-shrink-0 text-brand" />
                          <span>
                            <strong className="text-stone-700 dark:text-stone-200">Compatível com:</strong>{" "}
                            Faturação anual abaixo de {fmt(DISPENSA_RETENCAO_LIMITE.value)}; clientes
                            estrangeiros (sem retenção por Art. 101.º CIRS)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Warning size={12} className="mt-0.5 flex-shrink-0 text-alert-text" />
                          <span>
                            <strong className="text-stone-700 dark:text-stone-200">Incompatível com:</strong>{" "}
                            Faturação igual ou superior a {fmt(DISPENSA_RETENCAO_LIMITE.value)} — a dispensa
                            é indevida e o cliente deve reter na fonte
                          </span>
                        </div>
                      </div>
                      {dispensaRetencao && bruto > DISPENSA_RETENCAO_LIMITE.value && (
                        <div className="mt-2 rounded-lg border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">
                          Com faturação de {fmt(bruto)}, a dispensa não é aplicável. Deves fazer retenção
                          na fonte à taxa de {pct(ef.retencao)}.
                        </div>
                      )}
                    </PainelContextual>
                  )}
                  {ef.nota && (
                    <p className="mt-2 text-xs leading-relaxed text-stone-400">{ef.nota}</p>
                  )}
                </div>

                {/* IRS Jovem */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <label htmlFor="jovem" className={rotulo}>
                      IRS Jovem
                    </label>
                    <InfoTip>
                      Regime de isenção progressiva para jovens até {IRS_JOVEM.idadeMax.value} anos: 100%
                      no 1.º ano, 75% nos 2.º–4.º anos, 50% nos 5.º–7.º anos, 25% nos 8.º–10.º anos. Teto
                      de 55 × IAS (Art. 2.º-B CIRS).
                    </InfoTip>
                  </div>
                  <select
                    id="jovem"
                    value={irsJovemAno}
                    onChange={(e) => setIrsJovemAno(Number(e.target.value))}
                    className={campo}
                  >
                    <option value={0}>Não aplicável</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((ano) => (
                      <option key={ano} value={ano}>
                        {`${ano}.º ano — isenção ${pct(IRS_JOVEM.isencaoPorAno.value[ano])}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Motor de regras ── */}
            {regras.length > 0 && (
              <div className="space-y-2">
                {erros.map((r) => (
                  <CartaoRegra key={r.id} regra={r} />
                ))}
                {avisosList.map((r) => (
                  <CartaoRegra key={r.id} regra={r} />
                ))}
                {infoList.map((r) => (
                  <CartaoRegra key={r.id} regra={r} />
                ))}
              </div>
            )}

            {/* ── Secção 3: Módulos opcionais ── */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500 dark:bg-stone-800`}>
                  3
                </div>
                <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  Módulos opcionais — ativa os que se aplicam à tua situação
                </span>
              </div>
              <div className="space-y-3">
                <Modulo
                  titulo="Família"
                  info="A tributação conjunta divide o rendimento por 2 (quociente conjugal). Cada dependente vale 600 € de dedução à coleta (726 € até 3 anos)."
                  on={famOn}
                  setOn={setFamOn}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={conjunta}
                    onClick={() => setConjunta((v) => !v)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      conjunta
                        ? "border-brand bg-brand-light"
                        : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/40"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${
                        conjunta ? "border-brand bg-brand text-white" : "border-stone-300 text-transparent"
                      }`}
                    >
                      <Check size={12} />
                    </span>
                    <span
                      className={`text-sm font-medium ${conjunta ? "text-brand-dark" : "text-stone-600 dark:text-stone-300"}`}
                    >
                      Tributação conjunta (casado / unido de facto)
                    </span>
                  </button>
                  <div className="mt-3">
                    <label htmlFor="dep" className={`mb-1.5 block ${rotulo}`}>
                      Número de dependentes
                    </label>
                    <input
                      id="dep"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={dependentesStr}
                      onChange={(e) => setDependentesStr(e.target.value)}
                      className={campo}
                    />
                  </div>
                </Modulo>

                <Modulo
                  titulo="Deduções à coleta"
                  info="Saúde (15%, máx 1 000 €), educação (30%, máx 800 €) e despesas gerais (35%, máx 250 €). Sujeitas a um limite global por escalão de rendimento."
                  on={deducoesOn}
                  setOn={setDeducoesOn}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { id: "saude", label: "Saúde (€)", v: saudeStr, set: setSaudeStr },
                      { id: "educacao", label: "Educação (€)", v: educacaoStr, set: setEducacaoStr },
                      { id: "gerais", label: "Desp. gerais (€)", v: geraisStr, set: setGeraisStr },
                    ].map((f) => (
                      <div key={f.id}>
                        <label htmlFor={f.id} className={`mb-1.5 block ${rotulo}`}>
                          {f.label}
                        </label>
                        <input
                          id={f.id}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={50}
                          value={f.v}
                          onChange={(e) => f.set(e.target.value)}
                          placeholder="0"
                          className={campo}
                        />
                      </div>
                    ))}
                  </div>
                </Modulo>

                <Modulo
                  titulo="Outros rendimentos"
                  info="Rendimentos de trabalho dependente (cat. A) ou pensões, somados ao rendimento da atividade para o cálculo anual do IRS."
                  on={outrosOn}
                  setOn={setOutrosOn}
                >
                  <label htmlFor="outros" className={`mb-1.5 block ${rotulo}`}>
                    Outros rendimentos líquidos anuais (€)
                  </label>
                  <input
                    id="outros"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={500}
                    value={outrosStr}
                    onChange={(e) => setOutrosStr(e.target.value)}
                    placeholder="0"
                    className={campo}
                  />
                </Modulo>
              </div>
            </div>

            {carregado && recibos.length > 0 && (
              <p className="rounded-xl bg-brand-light px-3 py-2.5 text-xs text-brand-dark">
                Faturação e retenções preenchidas automaticamente com os teus {recibos.length} recibos
                registados.
              </p>
            )}
          </div>

          {/* ── Coluna de resultado ── */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-4xl border border-stone-200 bg-cream p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
              <div className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {reembolso ? "Reembolso estimado" : "Imposto a pagar estimado"}
              </div>
              <div
                className={`mb-4 font-display text-4xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}
              >
                <AnimatedNumber value={Math.abs(sim.saldo)} />
              </div>

              <div className="space-y-1">
                <Row label="Faturação bruta" value={sim.brutoAnual} />
                {sim.regimeContabilidade === "organizada" ? (
                  <>
                    {sim.despesasJustificadas > 0 && (
                      <Row label="Despesas reais" value={sim.despesasJustificadas} sinal="−" />
                    )}
                    <Row
                      label="Rendimento tributável"
                      value={sim.rendimentoTributavel}
                      note="Lucro real (contab. organizada)"
                    />
                  </>
                ) : (
                  <>
                    <Row
                      label={`Coeficiente (${pct(sim.coeficiente)})`}
                      value={sim.rendimentoCoeficiente}
                      note={
                        sim.reducaoAno > 0
                          ? `Reduzido ${pct(sim.reducaoAno)} (início de atividade)`
                          : "Regime simplificado"
                      }
                    />
                    {sim.acrescimo15 > 0 && (
                      <Row label="Acréscimo (regra 15%)" value={sim.acrescimo15} sinal="+" />
                    )}
                  </>
                )}
                {sim.rendimentoIsentoJovem > 0 && (
                  <Row
                    label={`Isenção IRS Jovem (${pct(sim.isencaoJovem)})`}
                    value={sim.rendimentoIsentoJovem}
                    sinal="−"
                  />
                )}
                {sim.outrosRendimentos > 0 && (
                  <Row label="Outros rendimentos" value={sim.outrosRendimentos} sinal="+" />
                )}
                <Row label="Rendimento coletável" value={sim.rendimentoColetavel} forte />
                <Row
                  label={sim.conjunta ? "Coleta (tributação conjunta)" : "Coleta"}
                  value={sim.coletaBruta}
                />
                {sim.deducaoDependentes > 0 && (
                  <Row label="Dedução por dependentes" value={sim.deducaoDependentes} sinal="−" />
                )}
                {sim.deducaoDespesas > 0 && (
                  <Row label="Deduções de despesas" value={sim.deducaoDespesas} sinal="−" />
                )}
                <Row
                  label="IRS estimado"
                  value={sim.irsEstimado}
                  note={`Taxa média ${pct(sim.taxaMediaEfetiva)}`}
                  forte
                />
                <Row label="Retenções já pagas" value={sim.retencoesPagas} sinal="−" />
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-brand bg-white p-3 dark:bg-stone-800">
                <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                  {reembolso ? "A receber" : "A pagar"}
                </span>
                <span
                  className={`font-display text-xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}
                >
                  <AnimatedNumber value={Math.abs(sim.saldo)} />
                </span>
              </div>

              {sim.minimoExistenciaAplicado && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-brand-light p-3">
                  <span className="mt-0.5 flex-shrink-0 text-brand">
                    <Check size={14} />
                  </span>
                  <span className="text-xs leading-relaxed text-brand-dark">
                    Protegido pelo mínimo de existência ({fmt(MINIMO_EXISTENCIA.value)}). O IRS não pode
                    deixar-te abaixo deste rendimento.
                  </span>
                </div>
              )}
            </div>

            {/* Oportunidades e informações */}
            {infoList.length > 0 && (
              <div className="rounded-4xl border border-brand/20 bg-brand-light/50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-dark">
                  Oportunidades
                </div>
                <div className="space-y-2">
                  {infoList.map((r) => (
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

      {/* Pro hint */}
      <ProHint id="guardar-cenario" icon={<ChartProjection size={18} />} cta="Conhecer o Pro" className="mt-6">
        Gostavas de guardar esta simulação e compará-la com outros cenários ao longo do ano? Isso faz parte
        do Pro.
      </ProHint>

      <div className="mt-4">
        <PartnerSpot context="simulador" />
      </div>

      {/* Aviso legal */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-4">
        <span className="mt-0.5 flex-shrink-0 text-alert-text">
          <Warning size={14} />
        </span>
        <p className="text-xs leading-relaxed text-alert-text">
          {categoria === "F"
            ? "Estimativa da tributação autónoma dos rendimentos prediais (categoria F). Não modela a opção pelo englobamento nem o regime de renda moderada (OE2026, pendente de regulamentação). Não substitui o apuramento oficial nem aconselhamento de contabilista certificado."
            : `Estimativa para o regime simplificado (limite ${fmt(REGIME_SIMPLIFICADO.limite.value)}). Mesmo com os módulos ativos, não cobre todos os benefícios fiscais nem casos especiais. Não substitui o apuramento oficial nem aconselhamento de contabilista certificado.`}
        </p>
      </div>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function SeccaoTitulo({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
        {numero}
      </span>
      <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{titulo}</h2>
    </div>
  );
}

function PainelContextual({
  titulo,
  onFechar,
  children,
}: {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/60">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{titulo}</span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar painel"
          className="flex-shrink-0 text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-200"
        >
          fechar
        </button>
      </div>
      {children}
    </div>
  );
}

function PainelAtividade({
  atividade,
  aberto,
  onFechar,
}: {
  atividade: Atividade;
  aberto: boolean;
  onFechar: () => void;
}) {
  if (!aberto) return null;
  const ef = efeitoFiscal(atividade);

  return (
    <div className="mt-3 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/60">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
          Condições fiscais desta atividade
        </span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar painel"
          className="flex-shrink-0 text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-200"
        >
          fechar
        </button>
      </div>

      {/* Métricas principais */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "Coeficiente", value: pct(ef.coef), note: "do rendimento é tributável" },
          { label: "Retenção", value: pct(ef.retencao), note: "retido pelo cliente" },
          { label: "Base SS", value: ef.baseSS === "servicos" ? "70%" : "20%", note: "do rendimento" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-stone-200 bg-white p-2.5 text-center dark:border-stone-600 dark:bg-stone-900"
          >
            <div className="text-base font-bold text-stone-800 dark:text-stone-100">{m.value}</div>
            <div className="text-[10px] font-medium text-stone-500 dark:text-stone-400">{m.label}</div>
            <div className="text-[10px] text-stone-400">{m.note}</div>
          </div>
        ))}
      </div>

      {/* Base legal */}
      <div className="space-y-1.5 text-xs text-stone-500 dark:text-stone-400">
        <div className="flex items-start gap-2">
          <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
          <span>
            <strong className="text-stone-600 dark:text-stone-300">Base legal do coeficiente:</strong>{" "}
            {ef.legalCoef}
          </span>
        </div>
        {ef.regra15 && (
          <div className="flex items-start gap-2">
            <Check size={11} className="mt-0.5 flex-shrink-0 text-brand" />
            <span>
              <strong className="text-stone-600 dark:text-stone-300">Regra dos 15%:</strong> 15% do rendimento
              bruto deve ser justificado com despesas (e-fatura, rendas, pessoal). O excesso não justificado é
              acrescido ao rendimento tributável.
            </span>
          </div>
        )}
        {!ef.regra15 && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 text-stone-300">−</span>
            <span>Regra dos 15% não se aplica a esta atividade.</span>
          </div>
        )}
        {ef.retencao === 0 && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 text-stone-300">−</span>
            <span>Sem retenção na fonte (vendas/bens ou regime especial).</span>
          </div>
        )}
      </div>

      {/* Nota especial */}
      {ef.nota && (
        <div className="mt-3 rounded-lg border border-brand/20 bg-brand-light/60 px-3 py-2 text-xs leading-relaxed text-brand-dark">
          {ef.nota}
        </div>
      )}
    </div>
  );
}

function CartaoRegra({ regra }: { regra: RegraFiscal }) {
  const estilos: Record<PrioridadeRegra, { wrapper: string; icon: ReactNode }> = {
    erro: {
      wrapper: "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
      icon: <Warning size={14} className="text-red-600 dark:text-red-400" />,
    },
    aviso: {
      wrapper: "border-alert-border bg-alert-bg",
      icon: <Warning size={14} className="text-alert-text" />,
    },
    info: {
      wrapper: "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/60",
      icon: <Check size={14} className="text-stone-400" />,
    },
    oportunidade: {
      wrapper: "border-brand/20 bg-brand-light/60",
      icon: <ArrowRight size={14} className="text-brand" />,
    },
  };

  const { wrapper, icon } = estilos[regra.prioridade];
  const textoCor =
    regra.prioridade === "erro"
      ? "text-red-700 dark:text-red-300"
      : regra.prioridade === "aviso"
      ? "text-alert-text"
      : regra.prioridade === "oportunidade"
      ? "text-brand-dark"
      : "text-stone-600 dark:text-stone-300";

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-3.5 ${wrapper}`}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className={`text-xs font-semibold ${textoCor}`}>{regra.mensagem}</p>
        <p className={`mt-0.5 text-xs leading-relaxed ${textoCor} opacity-80`}>{regra.detalhe}</p>
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
    <div
      className={`rounded-4xl border bg-white p-5 shadow-card transition-colors dark:bg-stone-900 ${
        on ? "border-brand" : "border-stone-100 dark:border-stone-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setOn(!on)}
          className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-stone-200 dark:bg-stone-700"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`}
          />
        </button>
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{titulo}</span>
        <InfoTip>{info}</InfoTip>
      </div>
      {on && <div className="mt-4">{children}</div>}
    </div>
  );
}

function PainelResultadoF({
  simF,
  reembolso,
}: {
  simF: ReturnType<typeof calcularCategoriaF>;
  reembolso: boolean;
}) {
  return (
    <div className="rounded-4xl border border-stone-200 bg-cream p-6 shadow-card lg:sticky lg:top-6 dark:border-stone-700 dark:bg-stone-900">
      <div className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {reembolso ? "Reembolso estimado" : "Imposto a pagar estimado"}
      </div>
      <div
        className={`mb-4 font-display text-4xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}
      >
        <AnimatedNumber value={Math.abs(simF.saldo)} />
      </div>

      <div className="space-y-1">
        <Row label="Rendas brutas" value={simF.rendaAnual} />
        {simF.despesas > 0 && <Row label="Despesas dedutíveis" value={simF.despesas} sinal="−" />}
        <Row label="Rendimento tributável" value={simF.rendimentoLiquido} forte />
        <Row
          label={`Taxa autónoma (${pct(simF.taxa)})`}
          value={simF.imposto}
          note={
            simF.reducao > 0
              ? `Taxa base ${pct(simF.taxaBase)}, reduzida ${pct(simF.reducao)} pela duração`
              : `Taxa base ${pct(simF.taxaBase)}`
          }
          forte
        />
        <Row label="Retenções já pagas" value={simF.retencoesPagas} sinal="−" />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-brand bg-white p-3 dark:bg-stone-800">
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {reembolso ? "A receber" : "A pagar"}
        </span>
        <span
          className={`font-display text-xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}
        >
          <AnimatedNumber value={Math.abs(simF.saldo)} />
        </span>
      </div>

      {simF.avisos.map((aviso) => (
        <div key={aviso} className="mt-3 flex items-start gap-2 rounded-xl bg-brand-light p-3">
          <span className="mt-0.5 flex-shrink-0 text-brand">
            <Check size={14} />
          </span>
          <span className="text-xs leading-relaxed text-brand-dark">{aviso}</span>
        </div>
      ))}
    </div>
  );
}

function Row({
  label,
  value,
  note,
  sinal,
  forte = false,
}: {
  label: string;
  value: number;
  note?: string;
  sinal?: "+" | "−";
  forte?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200/60 py-1.5 last:border-0 dark:border-stone-700/60">
      <div>
        <span
          className={`text-sm ${forte ? "font-semibold text-stone-800 dark:text-stone-100" : "text-stone-600 dark:text-stone-400"}`}
        >
          {label}
        </span>
        {note && <div className="text-[11px] text-stone-400">{note}</div>}
      </div>
      <span
        className={`text-sm font-semibold tabular-nums ${forte ? "text-brand" : "text-stone-700 dark:text-stone-300"}`}
      >
        {sinal && `${sinal} `}
        <AnimatedNumber value={value} />
      </span>
    </div>
  );
}
