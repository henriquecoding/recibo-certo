"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { m, AnimatePresence } from "motion/react";
import { EASE } from "@/lib/motion";
import { compararCategorias } from "@/lib/fiscal-dependente";
import { DERRAMA_MAX, FISCAL_YEAR, type EstadoCivilRet, type Regiao } from "@/lib/fiscal-data";
import EnviarAoContabilista from "@/components/contabilistas/EnviarAoContabilista";
import { AVENCA_SOCIEDADE, AVENCA_SOCIEDADE_ANUAL_MEDIA } from "@/lib/contabilista";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import {
  Briefcase, Receipt, Building, Check, Calendar, Scale,
  ChartProjection, ChevronLeft, ChevronRight, GripHorizontal,
} from "@/components/ui/Icons";
import ComparadorFAQ from "@/components/comparar/ComparadorFAQ";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { parseNumericDraft, sanitizeNumericDraft } from "@/lib/numeric-input";
import FizPlanoAcao from "@/components/fiz/FizPlanoAcao";
import { useHandoffDaBusca } from "@/components/busca/useHandoffDaBusca";
import type { TipoEntidade } from "@/lib/busca/esquema";

const SeccaoCarregar = () => (
  <div className="h-64 w-full animate-pulse rounded-3xl border border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50" />
);
const PassoContabilista = dynamic(
  () => import("@/components/simulador/PassoContabilista").then((m) => m.PassoContabilista),
  { ssr: false, loading: SeccaoCarregar }
);
const MapaRegioes = dynamic(() => import("@/components/mapa/MapaRegioes"), {
  ssr: false,
  loading: SeccaoCarregar,
});

const DEPENDENTES = [0, 1, 2, 3, 4];
const PRESETS = [15_000, 30_000, 50_000, 80_000, 150_000, 200_000];
const SLIDER_MAX = 200_000;
const INPUT_MAX = 2_000_000;
const STEP = 1_000;
/** Passo da varredura dos pontos de viragem. */
const VARREDURA_PASSO = 2_500;

const num = (s: string) => Math.max(0, parseNumericDraft(s) ?? 0);
const soDecimal = (s: string) => sanitizeNumericDraft(s);

type Chave = "dependente" | "freelancer" | "empresa";

const CARTOES: { chave: Chave; titulo: string; sub: string; Icon: typeof Briefcase }[] = [
  { chave: "dependente", titulo: "Por conta de outrem", sub: "Categoria A · salário 14 meses", Icon: Briefcase },
  { chave: "freelancer", titulo: "Recibos verdes", sub: "Categoria B · regime simplificado", Icon: Receipt },
  { chave: "empresa", titulo: "Empresa", sub: "Sociedade · IRC + dividendos", Icon: Building },
];

const ESTADOS_CIVIS: { valor: EstadoCivilRet; rotulo: string }[] = [
  { valor: "naoCasado", rotulo: "Não casado" },
  { valor: "casadoDois", rotulo: "Casado, dois titulares" },
  { valor: "casadoUnico", rotulo: "Casado, único titular" },
];

const REGIOES: { valor: Regiao; rotulo: string }[] = [
  { valor: "continente", rotulo: "Continente" },
  { valor: "madeira", rotulo: "Madeira" },
  { valor: "acores", rotulo: "Açores" },
];

const fmtK = (n: number) => `${Math.round(n / 1000)}k€`;

/**
 * O que este comparador aceita da pesquisa global. Espelha o
 * `aceitaEntidades` da ferramenta em `catalogo.ts` — o teste
 * `busca:handoff` reprova se os dois divergirem.
 */
const DESTINO_BUSCA = "ferramenta:comparar-regimes";
const ACEITA_BUSCA: TipoEntidade[] = ["valor", "periodicidade", "base"];

/** Tecto de sanidade do slider. Um contexto absurdo não desenha nada. */
const BRUTO_MAXIMO = 500_000;

export default function ComparadorCenarios() {
  const [bruto, setBruto] = useState(40_000);
  const [brutoStr, setBrutoStr] = useState("40000");

  /**
   * «Recibos verdes ou empresa com 3 500 € por mês» chega aqui com os
   * 3 500 € e com a periodicidade que a pessoa confirmou. Sem isto, o
   * comparador abria nos 40 000 € por omissão e a pergunta tinha de ser
   * feita outra vez — que é exactamente o que a linha «pedido reconhecido»
   * promete que não acontece.
   *
   * O motor compara rendimentos ANUAIS: uma periodicidade mensal é
   * multiplicada por doze aqui, à vista, e não algures no handoff.
   */
  const contexto = useHandoffDaBusca(DESTINO_BUSCA, ACEITA_BUSCA);
  useEffect(() => {
    const valor = typeof contexto?.valor === "number" ? contexto.valor : null;
    if (!valor || valor <= 0) return;
    const anual = contexto?.periodicidade === "mes" ? valor * 12 : contexto?.periodicidade === "ano" ? valor : null;
    if (!anual || anual > BRUTO_MAXIMO) return;
    setBruto(Math.round(anual));
    setBrutoStr(String(Math.round(anual)));
  }, [contexto]);

  const [despesasStr, setDespesasStr] = useState("");
  const [dependentes, setDependentes] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // ── Situação pessoal (ponto 2.8) ──────────────────────────────────────
  // O motor já aceitava tudo isto; a interface pedia três coisas de sete. O
  // IRS Jovem é o caso mais notório: muda radicalmente a resposta para quem
  // tem menos de 35 anos e reordena a tabela toda.
  const [afinar, setAfinar] = useState(false);
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivilRet>("naoCasado");
  const [conjunta, setConjunta] = useState(false);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [irsJovem, setIrsJovem] = useState(false);
  const [jovemAno, setJovemAno] = useState(1);
  const [saudeStr, setSaudeStr] = useState("");
  const [educacaoStr, setEducacaoStr] = useState("");
  const [geraisStr, setGeraisStr] = useState("");

  // ── Custos da empresa (pontos 2.3 e 2.4) ──────────────────────────────
  const [contabilistaStr, setContabilistaStr] = useState(String(Math.round(AVENCA_SOCIEDADE_ANUAL_MEDIA)));
  const [derramaPctStr, setDerramaPctStr] = useState(String(DERRAMA_MAX.value * 100));

  // ── Base de comparação (ponto 2.7) ────────────────────────────────────
  // 40 000 € de salário custam ao empregador 49 500 €; 40 000 € de faturação
  // custam ao cliente 40 000 €. São grandezas diferentes e a escolha entre
  // elas muda a resposta — por isso é explícita, não silenciosa.
  const [modo, setModo] = useState<"iliquido" | "custoEmpregador">("iliquido");

  /**
   * A base de comparação, quando a pesquisa já a perguntou.
   *
   * É a MESMA escolha que este comparador pede em «Comparar por» — e é por
   * isso que a pergunta na barra é legítima: não inventa um conceito novo,
   * antecipa uma que já existe aqui. Sem esta linha, a resposta morria a
   * meio do caminho e a pergunta passava a ser um obstáculo.
   */
  useEffect(() => {
    const base = contexto?.base;
    if (base === "custoEmpregador" || base === "iliquido") setModo(base);
  }, [contexto]);

  const despesas = num(despesasStr);
  const custosEmpresa = num(contabilistaStr);
  const derrama = Math.min(DERRAMA_MAX.value, Math.max(0, num(derramaPctStr) / 100));
  const trackRef = useRef<HTMLDivElement>(null);

  const sincronizarSlider = useCallback((v: number) => {
    const c = Math.max(0, Math.min(SLIDER_MAX, Math.round(v / STEP) * STEP));
    setBruto(c);
    setBrutoStr(String(c));
  }, []);

  const pctDe = useCallback((v: number) => Math.min(100, Math.max(0, (v / SLIDER_MAX) * 100)), []);

  const valorDoPonteiro = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const { left, width } = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round((frac * SLIDER_MAX) / STEP) * STEP;
  }, []);

  // `setPointerCapture` atira `NotFoundError` quando o `pointerId` já não
  // está ativo — um toque que acabou entre o evento e o tratador, um gesto
  // cancelado pelo sistema. Uma exceção por tratar num tratador de eventos
  // do React derruba a árvore, e o comparador desaparece do ecrã; e como a
  // captura era a primeira linha, o valor nem chegava a mudar. A captura é
  // uma comodidade — o valor não é, e por isso vem primeiro.
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    setHasInteracted(true);
    sincronizarSlider(valorDoPonteiro(e.clientX));
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sem captura: o arrasto pára ao sair do elemento, e mais nada. */
    }
  }, [valorDoPonteiro, sincronizarSlider]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging) sincronizarSlider(valorDoPonteiro(e.clientX));
  }, [dragging, valorDoPonteiro, sincronizarSlider]);

  const onPointerUp = useCallback(() => setDragging(false), []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    setHasInteracted(true);
    const passo = e.shiftKey ? 10_000 : STEP;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); sincronizarSlider(bruto + passo); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); sincronizarSlider(bruto - passo); }
    else if (e.key === "Home") { e.preventDefault(); sincronizarSlider(0); }
    else if (e.key === "End") { e.preventDefault(); sincronizarSlider(SLIDER_MAX); }
  }, [bruto, sincronizarSlider]);

  /** Todos os parâmetros que a interface expõe chegam ao motor — nenhum fica
      pelo caminho. É o invariante que o teste `comparador` protege. */
  const parametros = useMemo(
    () => ({
      dependentes,
      despesas,
      custosEmpresa,
      derrama,
      estadoCivil,
      conjunta,
      regiao,
      irsJovemAno: irsJovem ? jovemAno : undefined,
      deducoes: { saude: num(saudeStr), educacao: num(educacaoStr), gerais: num(geraisStr) },
    }),
    [dependentes, despesas, custosEmpresa, derrama, estadoCivil, conjunta, regiao, irsJovem, jovemAno, saudeStr, educacaoStr, geraisStr]
  );

  const r = useMemo(
    () => compararCategorias({ brutoAnual: bruto, ...parametros }),
    [bruto, parametros]
  );

  /** Base contra a qual se mede a carga fiscal de cada cenário. No modo
      «custo do empregador», a Categoria A parte do que a empresa paga. */
  const baseDe = useCallback(
    (chave: Chave, custoEmpregador: number) =>
      modo === "custoEmpregador" && chave === "dependente" ? custoEmpregador : bruto,
    [modo, bruto]
  );

  const liquidos: Record<Chave, number> = {
    dependente: r.dependente.liquido,
    freelancer: r.freelancer.liquido,
    empresa: r.empresa.liquido,
  };
  const bases: Record<Chave, number> = {
    dependente: baseDe("dependente", r.dependente.custoEmpregador),
    freelancer: bruto,
    empresa: bruto,
  };
  const cargas: Record<Chave, number> = {
    dependente: bases.dependente > 0 ? (bases.dependente - liquidos.dependente) / bases.dependente : 0,
    freelancer: bruto > 0 ? (bruto - liquidos.freelancer) / bruto : 0,
    empresa: bruto > 0 ? (bruto - liquidos.empresa) / bruto : 0,
  };
  const maxLiquido = Math.max(...Object.values(liquidos), 1);

  const { rvEstavel, rvOscila, empEstavel, empOscila, empNuncaGanha } = useMemo(() => {
    // A varredura ia até 500 000 € mas os marcadores só se desenham até
    // SLIDER_MAX — 61% das amostras não podiam produzir nada. Vai agora até
    // ao limite do slider, que é o que a interface consegue mostrar.
    const amostras: { x: number; rvGanha: boolean; empGanha: boolean }[] = [];
    for (let x = 5_000; x <= SLIDER_MAX; x += VARREDURA_PASSO) {
      const c = compararCategorias({ brutoAnual: x, ...parametros });
      amostras.push({
        x,
        rvGanha: c.freelancer.liquido > c.dependente.liquido + 1,
        empGanha: c.empresa.liquido > c.freelancer.liquido + 1,
      });
    }
    const empNuncaGanha = !amostras.some((a) => a.empGanha);

    const analisar = (campo: "rvGanha" | "empGanha") => {
      let primeira: number | null = null;
      let ultimaDerrota = -1;
      for (let i = 0; i < amostras.length; i++) {
        if (amostras[i][campo]) {
          if (primeira === null) primeira = amostras[i].x;
        } else {
          ultimaDerrota = i;
        }
      }
      let estavel: number | null = null;
      if (ultimaDerrota < amostras.length - 1) {
        estavel = ultimaDerrota === -1
          ? amostras[0]?.x ?? null
          : amostras[ultimaDerrota + 1]?.x ?? null;
      }
      const oscila = primeira !== null && estavel !== null && primeira < estavel;
      return { estavel, oscila, desde: primeira, ate: estavel };
    };

    const rv = analisar("rvGanha");
    const emp = analisar("empGanha");
    return {
      rvEstavel: rv.estavel,
      rvOscila: rv.oscila ? { desde: rv.desde!, ate: rv.estavel! } : null,
      empEstavel: emp.estavel,
      empOscila: emp.oscila ? { desde: emp.desde!, ate: emp.estavel! } : null,
      empNuncaGanha,
    };
  }, [parametros]);

  const diffMelhor = (() => {
    const ord = (Object.keys(liquidos) as Chave[]).sort((a, b) => liquidos[b] - liquidos[a]);
    return liquidos[ord[0]] - liquidos[ord[1]];
  })();
  const tituloMelhor = CARTOES.find((c) => c.chave === r.melhor)?.titulo ?? "";

  // impostoForte/imposto/impostoLeve usam classes próprias (não bg-brand-dark/
  // bg-brand-deep) para poderem ganhar tons distintos no escuro sem depender
  // dos tokens de marca, que ficam deliberadamente inalterados no dark (ver
  // globals.css) — caso contrário "IRS" e "Segurança Social" seriam dois
  // verdes quase-pretos lado a lado, praticamente indistinguíveis.
  const COR = {
    liquido: "bg-brand",
    impostoForte: "bg-cmp-imposto-forte",
    imposto: "bg-cmp-imposto",
    impostoLeve: "bg-cmp-imposto-leve",
    custo: "bg-brand-mint",
  };
  type Seg = { label: string; valor: number; cls: string };
  /**
   * Decompõe o ilíquido em líquido + parcelas conhecidas. O que não fecha vai
   * para «Outros custos / estrutura».
   *
   * Esse resto é legítimo em dois cenários (despesas, TSU do empregador), mas
   * escondia erros: se as parcelas deixassem de fechar, a barra continuava a
   * fechar e a discrepância ficava disfarçada num rótulo genérico. Em
   * desenvolvimento avisa-se na consola; em produção o `console.warn` não
   * corre. O teste `pilha fecha nos cenários conhecidos` prende o invariante.
   */
  const pilha = (base: number, liquido: number, perdas: Seg[], cenario: string): Seg[] => {
    const somaPerdas = perdas.reduce((s, p) => s + Math.max(0, p.valor), 0);
    const resto = Math.round(base - liquido - somaPerdas);
    if (process.env.NODE_ENV !== "production" && resto < -1) {
      console.warn(
        `[comparador] ${cenario}: as parcelas somam mais do que o ilíquido (resto ${resto} €). ` +
          "A barra vai fechar à mesma — verificar o motor.",
      );
    }
    const segs: Seg[] = [{ label: "Líquido", valor: liquido, cls: COR.liquido }, ...perdas.filter((p) => p.valor > 0.5)];
    if (resto > 0.5) segs.push({ label: "Outros custos / estrutura", valor: resto, cls: COR.custo });
    return segs;
  };
  const segmentos: Record<Chave, Seg[]> = {
    dependente: pilha(
      bases.dependente,
      r.dependente.liquido,
      [
        { label: "IRS devido no ano", valor: r.dependente.irs, cls: COR.imposto },
        { label: "Segurança Social (11%)", valor: r.dependente.ss, cls: COR.impostoForte },
        ...(modo === "custoEmpregador"
          ? [{ label: "TSU da entidade (23,75%)", valor: r.dependente.custoEmpregador - r.dependente.bruto, cls: COR.custo }]
          : []),
      ],
      "por conta de outrem",
    ),
    freelancer: pilha(
      bruto,
      r.freelancer.liquido,
      [
        { label: "IRS", valor: r.freelancer.irs, cls: COR.imposto },
        { label: "Segurança Social (21,4%)", valor: r.freelancer.ss, cls: COR.impostoForte },
        { label: "Despesas de atividade", valor: r.freelancer.despesas, cls: COR.custo },
      ],
      "recibos verdes",
    ),
    empresa: pilha(
      bruto,
      r.empresa.liquido,
      [
        { label: "Imposto sobre dividendos (28%)", valor: r.empresa.dividendos, cls: COR.imposto },
        { label: "IRC (15% / 19%)", valor: r.empresa.irc, cls: COR.impostoForte },
        { label: "Derrama municipal", valor: r.empresa.derrama, cls: COR.impostoLeve },
        { label: "Contabilista e estrutura", valor: r.empresa.custosEmpresa, cls: COR.custo },
      ],
      "empresa",
    ),
  };

  const calendario: { chave: Chave; titulo: string; itens: { label: string; quando: string; valor: string }[] }[] = [
    {
      chave: "dependente",
      titulo: "Por conta de outrem",
      itens: [
        { label: "Segurança Social (11%)", quando: "retida todos os meses", valor: `${fmt(r.dependente.ss)}/ano` },
        { label: "IRS devido", quando: "apurado na declaração anual", valor: `${fmt(r.dependente.irs)}/ano` },
        {
          label: "IRS retido na fonte",
          quando:
            r.dependente.acerto > 1
              ? `adiantado todos os meses · faltam ${fmt(r.dependente.acerto)} no acerto`
              : r.dependente.acerto < -1
                ? `adiantado todos os meses · reembolso de ${fmt(Math.abs(r.dependente.acerto))}`
                : "adiantado todos os meses · alinhado com o imposto",
          valor: `${fmt(r.dependente.irsRetido)}/ano`,
        },
        { label: "IVA", quando: "não aplicável", valor: "—" },
      ],
    },
    {
      chave: "freelancer",
      titulo: "Recibos verdes",
      itens: [
        { label: "Segurança Social (21,4%)", quando: "mensal, até dia 20", valor: `${fmt(r.freelancer.ss)}/ano` },
        { label: "IRS", quando: "retenção + acerto em junho", valor: `${fmt(r.freelancer.irs)}/ano` },
        { label: "IVA", quando: "trimestral (se não isento)", valor: "conforme regime" },
      ],
    },
    {
      chave: "empresa",
      titulo: "Empresa (Lda)",
      itens: [
        { label: "IRC + derrama", quando: "anual (pagamentos por conta)", valor: `${fmt(r.empresa.irc + r.empresa.derrama)}/ano` },
        { label: "IRS dividendos (28%)", quando: "na distribuição de lucros", valor: r.empresa.dividendos > 0 ? `${fmt(r.empresa.dividendos)}/ano` : "—" },
        {
          label: "Contabilista (OCC)",
          quando:
            r.empresa.custosEmpresa > 0
              ? "mensal, obrigatório · ajustável acima"
              : "mensal, obrigatório — puseste-o a zero",
          valor: `${fmt(r.empresa.custosEmpresa)}/ano`,
        },
      ],
    },
  ];

  const campo =
    "w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";

  const sliderPct = pctDe(bruto);

  return (
    <div className="my-8 space-y-10">
    <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-card sm:p-6">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Scale size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Comparar cenários</p>
          <p className="text-[11px] text-stone-400 dark:text-stone-300">Descobre o melhor caminho para o teu rendimento · estimativa 2026</p>
        </div>
      </div>

      {/* ── Painel de rendimento ── */}
      <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 sm:p-6">
        {/* Valor + label */}
        <div className="flex items-end justify-between gap-2 mb-1">
          <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide dark:text-stone-300">
            Rendimento anual ilíquido
          </p>
          <div className="flex items-baseline gap-1">
            <input
              aria-label="Rendimento anual ilíquido"
              value={brutoStr}
              onBlur={() => setBrutoStr(String(bruto))}
              onChange={(e) => {
                const s = soDecimal(e.target.value);
                setBrutoStr(s);
                setBruto(Math.max(0, Math.min(INPUT_MAX, num(s))));
                setHasInteracted(true);
              }}
              className="w-40 bg-transparent text-right font-display text-3xl font-semibold tabular-nums text-ink dark:text-stone-100 focus:outline-none"
            />
            <span className="font-display text-lg font-semibold text-stone-400">€</span>
          </div>
        </div>
        <p className="text-right text-[11px] text-stone-400 dark:text-stone-300 mb-5">/ano · arrasta o slider ou edita o valor</p>

        {/* Dica — desaparece após 1.ª interação */}
        <AnimatePresence>
          {!hasInteracted && (
            <m.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center justify-center mb-3"
            >
              <m.span
                animate={{ x: [-3, 3, -3] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                className="flex items-center gap-1 text-brand dark:text-brand-mint/75 text-xs font-semibold"
              >
                <ChevronLeft size={11} />
                Arraste para ajustar
                <ChevronRight size={11} />
              </m.span>
            </m.div>
          )}
        </AnimatePresence>

        {/* Slider — área de clique h-10, barra visual h-2.5 centrada */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Rendimento anual ilíquido"
          aria-valuemin={0}
          aria-valuemax={SLIDER_MAX}
          aria-valuenow={bruto}
          aria-valuetext={`${fmt(bruto)} por ano`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className={`relative h-10 select-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-offset-stone-900 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ touchAction: "none" }}
        >
          {/* Barra visual */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-none"
              style={{ width: `${sliderPct}%` }}
            />
          </div>

          {/* Marcadores de ponto de viragem */}
          {rvEstavel != null && rvEstavel <= SLIDER_MAX && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-px rounded-full bg-brand-dark/50 z-10 pointer-events-none"
              style={{ left: `${pctDe(rvEstavel)}%` }}
            />
          )}
          {empEstavel != null && empEstavel <= SLIDER_MAX && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-px rounded-full bg-amber-500/50 z-10 pointer-events-none"
              style={{ left: `${pctDe(empEstavel)}%` }}
            />
          )}

          {/* Puxador — wrapper posiciona, inner anima */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
            style={{ left: `${sliderPct}%` }}
          >
            <m.div
              animate={{ scale: dragging ? 1.15 : 1 }}
              transition={{ duration: 0.1 }}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 transition-all duration-100 ${
                dragging
                  ? "border-brand-dark shadow-[0_0_0_5px_rgba(29,158,117,0.15)]"
                  : "border-brand shadow-[0_2px_10px_rgba(29,158,117,0.3)]"
              }`}>
                <GripHorizontal size={13} className="text-brand" />
              </div>
            </m.div>
          </div>
        </div>

        {/* Escala */}
        <div className="flex justify-between text-[10px] font-medium tabular-nums text-stone-400 dark:text-stone-500 mt-1">
          <span>0€</span>
          <span>{fmtK(SLIDER_MAX)}</span>
        </div>

        {/* Legenda de pontos de viragem. Cada uma diz explicitamente CONTRA
            QUÊ se compara — antes «RV compensa acima de» media contra o
            salário e «Empresa compensa acima de» contra os recibos verdes,
            sem que nenhuma o dissesse. */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium">
          {rvEstavel != null && (
            <span className="flex items-center gap-1.5 text-brand-dark dark:text-brand">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-dark dark:bg-brand" />
              {rvOscila
                ? `Recibos verdes alternam com o salário até ~${fmtK(rvOscila.ate)}`
                : `Recibos verdes compensam face ao salário acima de ~${fmtK(rvEstavel)}`}
            </span>
          )}
          {/* Ponto 2.5: com este modelo a empresa nunca compensa em toda a
              gama testada — dizê-lo é mais útil do que apagar o marcador e
              deixar a legenda como código morto. */}
          {empNuncaGanha ? (
            <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
              A empresa não compensa face aos recibos verdes em nenhum valor até {fmtK(SLIDER_MAX)}
            </span>
          ) : (
            empEstavel != null && (
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {empOscila
                  ? `Empresa alterna com os recibos verdes até ~${fmtK(empOscila.ate)}`
                  : `Empresa compensa face aos recibos verdes acima de ~${fmtK(empEstavel)}`}
              </span>
            )
          )}
        </div>

        {/* Presets rápidos */}
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={bruto === p}
              onClick={() => { setBruto(p); setBrutoStr(String(p)); setHasInteracted(true); }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                bruto === p
                  ? "border-brand bg-brand text-white shadow-glow"
                  : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:border-brand hover:text-brand"
              }`}
            >
              {fmtK(p)}
            </button>
          ))}
        </div>

        {/* Inputs secundários */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cmp-despesas" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400 dark:text-stone-300">
              Despesas de atividade{" "}
              <InfoTip label="Só recibos verdes e empresa">
                Despesas documentadas da atividade. Aplicam-se aos recibos verdes e à empresa; um
                trabalhador por conta de outrem não as deduz.
              </InfoTip>
            </label>
            <div className="relative">
              <input
                id="cmp-despesas"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={despesasStr}
                onChange={(e) => setDespesasStr(soDecimal(e.target.value))}
                placeholder="0"
                className={campo}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 dark:text-stone-300">€/ano</span>
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400 dark:text-stone-300">
              Dependentes{" "}
              <InfoTip label="Categoria A">Afeta a retenção de IRS do cenário por conta de outrem.</InfoTip>
            </span>
            <div className="flex gap-1.5" role="group" aria-label="Número de dependentes">
              {DEPENDENTES.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dependentes === d}
                  onClick={() => setDependentes(d)}
                  className={`flex-1 rounded-xl border px-2 py-2 text-sm font-semibold transition-all ${
                    dependentes === d
                      ? "border-brand bg-brand text-white shadow-glow"
                      : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
                  }`}
                >
                  {d === 4 ? "4+" : d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Afinar: situação pessoal e custos da empresa ──────────────
            O motor já aceitava tudo isto e a interface pedia três coisas de
            sete. Fica atrás de um botão para não pesar no ecrã pequeno, mas
            deixa de ser inalcançável. */}
        <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-700">
          <button
            type="button"
            onClick={() => setAfinar((v) => !v)}
            aria-expanded={afinar}
            aria-controls="cmp-afinar"
            className="flex w-full items-center justify-between gap-2 rounded-xl px-1 py-2 text-left text-xs font-semibold text-stone-600 transition-colors hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-300"
          >
            <span>Afinar: situação pessoal, IRS Jovem e custos da empresa</span>
            <ChevronRight
              size={14}
              className={`shrink-0 transition-transform ${afinar ? "rotate-90" : ""}`}
            />
          </button>

          {afinar && (
            <div id="cmp-afinar" className="mt-3 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cmp-estado-civil" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400 dark:text-stone-300">
                    Situação familiar
                  </label>
                  <select
                    id="cmp-estado-civil"
                    value={estadoCivil}
                    onChange={(e) => setEstadoCivil(e.target.value as EstadoCivilRet)}
                    className={campo}
                  >
                    {ESTADOS_CIVIS.map((o) => (
                      <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="cmp-regiao" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400 dark:text-stone-300">
                    Região{" "}
                    <InfoTip label="Tabelas próprias">
                      A Madeira e os Açores têm tabelas de retenção e taxas de IVA próprias.
                    </InfoTip>
                  </label>
                  <select
                    id="cmp-regiao"
                    value={regiao}
                    onChange={(e) => setRegiao(e.target.value as Regiao)}
                    className={campo}
                  >
                    {REGIOES.map((o) => (
                      <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-stone-600 dark:text-stone-400 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={conjunta}
                  onChange={(e) => setConjunta(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-brand focus:ring-brand dark:border-stone-600"
                />
                <span>
                  <span className="font-semibold">Tributação conjunta</span> — aplica o quociente conjugal aos três cenários.
                </span>
              </label>

              <div>
                <label className="flex items-start gap-2.5 text-xs text-stone-600 dark:text-stone-400 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={irsJovem}
                    onChange={(e) => setIrsJovem(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-brand focus:ring-brand dark:border-stone-600"
                  />
                  <span>
                    <span className="font-semibold">IRS Jovem</span> — muda radicalmente a resposta para quem tem menos de 35
                    anos, e reordena a tabela toda no 1.º ano.
                  </span>
                </label>
                {irsJovem && (
                  <div className="mt-2 pl-6">
                    <label htmlFor="cmp-jovem-ano" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400 dark:text-stone-300">
                      Ano de benefício
                    </label>
                    <select
                      id="cmp-jovem-ano"
                      value={jovemAno}
                      onChange={(e) => setJovemAno(Number(e.target.value))}
                      className={campo}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((a) => (
                        <option key={a} value={a}>{a}.º ano</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Deduções à coleta comuns — aplicadas aos TRÊS cenários, ou a
                  nenhum. Aplicá-las só a um era um enviesamento invisível. */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 dark:text-stone-300">
                  Deduções à coleta{" "}
                  <InfoTip label="Aplicadas aos três cenários">
                    Saúde, educação e despesas gerais entram no apuramento de IRS dos três cenários — não só de um.
                  </InfoTip>
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    ["cmp-saude", "Saúde", saudeStr, setSaudeStr],
                    ["cmp-educacao", "Educação", educacaoStr, setEducacaoStr],
                    ["cmp-gerais", "Gerais", geraisStr, setGeraisStr],
                  ] as const).map(([id, rotulo, valor, setter]) => (
                    <div key={id}>
                      <label htmlFor={id} className="mb-1 block text-[11px] text-stone-500 dark:text-stone-400">{rotulo}</label>
                      <div className="relative">
                        <input
                          id={id}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={valor}
                          onChange={(e) => setter(soDecimal(e.target.value))}
                          placeholder="0"
                          className={campo}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 dark:text-stone-300">€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custos da empresa — pontos 2.3 e 2.4 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cmp-contabilista" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400 dark:text-stone-300">
                    Contabilista da empresa{" "}
                    <InfoTip label="Obrigatório numa Lda.">
                      Uma sociedade precisa de Contabilista Certificado. A avença típica anda entre {AVENCA_SOCIEDADE.min} €
                      e {AVENCA_SOCIEDADE.max} € por mês — estimativa de mercado, não valor legal.
                    </InfoTip>
                  </label>
                  <div className="relative">
                    <input
                      id="cmp-contabilista"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={contabilistaStr}
                      onChange={(e) => setContabilistaStr(soDecimal(e.target.value))}
                      className={campo}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 dark:text-stone-300">€/ano</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="cmp-derrama" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400 dark:text-stone-300">
                    Derrama municipal{" "}
                    <InfoTip label="Varia com o município">
                      Cada município fixa a sua taxa, até ao teto legal de {(DERRAMA_MAX.value * 100).toLocaleString("pt-PT")}%.
                      Muitos isentam as empresas mais pequenas.
                    </InfoTip>
                  </label>
                  <div className="relative">
                    <input
                      id="cmp-derrama"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={derramaPctStr}
                      onChange={(e) => setDerramaPctStr(soDecimal(e.target.value))}
                      className={campo}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 dark:text-stone-300">%</span>
                  </div>
                </div>
              </div>

              {/* Base de comparação — ponto 2.7 */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 dark:text-stone-300">
                  Comparar por{" "}
                  <InfoTip label="Duas perguntas diferentes">
                    «Tenho esta proposta de salário» compara pelo ilíquido. «O meu cliente tem este orçamento» compara pelo
                    que custa ao empregador — {fmt(bruto)} de salário custam-lhe {fmt(r.dependente.custoEmpregador)} com a TSU.
                  </InfoTip>
                </p>
                <div className="flex gap-1.5" role="group" aria-label="Base de comparação">
                  {([
                    ["iliquido", "Rendimento ilíquido"],
                    ["custoEmpregador", "Custo do empregador"],
                  ] as const).map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={modo === valor}
                      onClick={() => setModo(valor)}
                      className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-all ${
                        modo === valor
                          ? "border-brand bg-brand text-white shadow-glow"
                          : "border-stone-200 bg-white text-stone-600 hover:border-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                      }`}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Cartões de resultado — 3 vias ── */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {CARTOES.map((c) => {
          const liquido = liquidos[c.chave];
          const melhor = r.melhor === c.chave;
          return (
            <m.div
              key={c.chave}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`relative rounded-2xl border p-5 transition-all ${
                melhor
                  ? "border-brand/40 bg-gradient-to-b from-brand/8 to-transparent dark:from-brand/12 dark:to-transparent shadow-glow ring-1 ring-brand/20"
                  : "border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800"
              }`}
            >
              {melhor && (
                <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                  <Check size={10} /> Mais líquido
                </span>
              )}
              <div className="mb-3 flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${melhor ? "bg-brand/15 text-brand" : "bg-stone-100 dark:bg-stone-700 text-stone-400"}`}>
                  <c.Icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{c.titulo}</p>
                  <p className="text-[11px] text-stone-400 dark:text-stone-300">{c.sub}</p>
                </div>
              </div>
              <m.p
                key={liquido}
                initial={{ y: -4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className={`font-display tabular-nums ${melhor ? "text-[1.75rem] font-bold text-brand" : "text-2xl font-semibold text-stone-800 dark:text-stone-100"}`}
              >
                {fmt(liquido)}
              </m.p>
              <p className="mt-1 text-xs text-stone-400 dark:text-stone-300">líquido/ano · {pct(cargas[c.chave])} de carga fiscal</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                <m.div
                  className={`h-full rounded-full ${melhor ? "bg-gradient-to-r from-brand to-brand-dark" : "bg-stone-300 dark:bg-stone-600"}`}
                  initial={false}
                  animate={{ width: `${Math.max(0, Math.min(100, (liquido / maxLiquido) * 100))}%` }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
              </div>
            </m.div>
          );
        })}
      </div>

      {/* ── Veredicto + pontos de viragem ── */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-light to-brand-light/60 dark:from-brand/10 dark:to-brand/5 dark:border-brand/15">
        <div className="flex items-start gap-3 p-5">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <Scale size={16} />
          </span>
          <div className="text-sm text-brand-dark dark:text-brand">
            <p className="font-bold leading-snug">
              Com {fmt(bruto)}/ano, <strong>{tituloMelhor.toLowerCase()}</strong> deixa-te com mais {fmt(diffMelhor)}/ano.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-brand-dark/75 dark:text-brand/65">
              {rvOscila
                ? `Entre ~${fmt(rvOscila.desde)}/ano e ~${fmt(rvOscila.ate)}/ano, recibos verdes e salário alternam consoante o escalão de IRS. Acima de ~${fmt(rvOscila.ate)}/ano, os recibos verdes compensam sempre. `
                : rvEstavel
                  ? `Acima de ~${fmt(rvEstavel)}/ano, os recibos verdes compensam face ao salário. `
                  : "Para estes parâmetros, o salário por conta de outrem mantém-se competitivo em toda a gama testada. "}
              {empNuncaGanha
                ? "A empresa não compensa em nenhum valor testado — e isso é do modelo, não do teu caso: aqui a sociedade não paga salário de gerente, distribui todo o lucro em dividendos e não deduz IVA. Com salário de gerência e despesas reais, a conta muda."
                : empEstavel
                  ? `A empresa torna-se o cenário mais vantajoso face aos recibos verdes acima de ~${fmt(empEstavel)}/ano.`
                  : "A empresa só compensa em rendimentos mais altos do que os testados."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Gráfico de colunas — para onde vai cada euro ── */}
      {bruto > 0 && (
        <div className="mt-6 rounded-2xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 p-5 sm:p-6">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ChartProjection size={14} />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 dark:text-stone-300">Para onde vai cada euro</h3>
          </div>
          <p className="mb-5 text-xs text-stone-400 dark:text-stone-300">Mesma altura porque parte do mesmo ilíquido — o verde vivo é o que te fica; os tons mais escuros são imposto.</p>

          <div className="flex items-end justify-around gap-4 sm:gap-8" style={{ height: 230 }}>
            {CARTOES.map((c) => {
              const segs = segmentos[c.chave];
              const melhor = r.melhor === c.chave;
              const baseCenario = bases[c.chave];
              const pctLiquido = baseCenario > 0 ? (segs[0].valor / baseCenario) * 100 : 0;
              return (
                <div key={c.chave} className="flex h-full min-w-0 flex-1 flex-col items-center">
                  <span className={`mb-1.5 inline-flex items-center gap-1 text-[11px] font-bold tabular-nums ${melhor ? "text-brand-dark dark:text-brand" : "text-stone-600 dark:text-stone-300"}`}>
                    {melhor && <Check size={11} />}{fmt(segs[0].valor)}
                  </span>
                  <div
                    className={`relative flex w-full max-w-[92px] flex-col-reverse overflow-hidden rounded-xl ring-1 ${melhor ? "ring-2 ring-brand/50" : "ring-stone-200/70 dark:ring-stone-700"}`}
                    style={{ height: "calc(100% - 44px)" }}
                    role="img"
                    aria-label={`${c.titulo}: líquido ${fmt(segs[0].valor)} (${Math.round(pctLiquido)}%) de ${fmt(baseCenario)} ilíquidos`}
                  >
                    {segs.map((s, i) => (
                      <div
                        key={s.label}
                        className={`${s.cls} relative w-full ${i > 0 ? "border-t border-white/50 dark:border-black/50" : ""}`}
                        style={{ height: `${baseCenario > 0 ? (Math.max(0, s.valor) / baseCenario) * 100 : 0}%` }}
                        title={`${s.label}: ${fmt(s.valor)}`}
                      >
                        {i === 0 && pctLiquido >= 18 && (
                          <span className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-bold text-white/95">{Math.round(pctLiquido)}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className={`mt-2 flex items-center gap-1 text-center text-[10px] font-semibold leading-tight ${melhor ? "text-stone-700 dark:text-stone-200" : "text-stone-400"}`}>
                    <c.Icon size={11} /> {c.titulo}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-stone-100 dark:border-stone-700 pt-3 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Líquido (fica contigo)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cmp-imposto" /> IRS / dividendos</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cmp-imposto-forte" /> Segurança Social / IRC</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cmp-imposto-leve" /> Derrama</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-mint" /> Despesas / estrutura</span>
          </div>

          {/* Decomposição detalhada por cenário */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {CARTOES.map((c) => {
              const segs = segmentos[c.chave];
              const melhor = r.melhor === c.chave;
              return (
                <div
                  key={c.chave}
                  className={`rounded-2xl border p-4 ${melhor ? "border-brand/40 bg-brand/5 dark:bg-brand/10" : "border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800"}`}
                >
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400 dark:text-stone-300">
                    <c.Icon size={13} className="text-stone-400" /> {c.titulo}
                  </p>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <dt className="text-stone-500 dark:text-stone-400">
                        {modo === "custoEmpregador" && c.chave === "dependente" ? "Custo do empregador" : "Ilíquido"}
                      </dt>
                      <dd className="font-semibold tabular-nums text-stone-700 dark:text-stone-200">{fmt(bases[c.chave])}</dd>
                    </div>
                    {segs.slice(1).map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <dt className="text-stone-500 dark:text-stone-400">− {s.label}</dt>
                        <dd className="font-medium tabular-nums text-stone-500 dark:text-stone-400">−{fmt(s.valor)}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-700 pt-1.5">
                      <dt className="font-semibold text-stone-700 dark:text-stone-200">Líquido</dt>
                      <dd className={`font-bold tabular-nums ${melhor ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"}`}>{fmt(segs[0].valor)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Calendário fiscal por cenário ── */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Calendar size={14} />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 dark:text-stone-300">
            Calendário fiscal por cenário
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {calendario.map((col) => (
            <div key={col.chave} className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 p-4">
              <p className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100">{col.titulo}</p>
              <ul className="space-y-3">
                {col.itens.map((it) => (
                  <li key={it.label}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{it.label}</span>
                      <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-100">{it.valor}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 dark:text-stone-300">{it.quando}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-stone-400 dark:text-stone-300">
        Estimativa de ordem de grandeza para o mesmo rendimento anual ilíquido. Os três cenários são medidos pelo IRS
        efetivamente devido no ano — na Categoria A isso é o apuramento, não a retenção mensal, que é só um
        adiantamento. A Categoria A assume salário em 14 meses (sem subsídio de refeição); os recibos verdes usam o
        regime simplificado (atividade de serviços, Art. 151.º); a empresa modela IRC PME, derrama e distribuição de
        dividendos, sem salário de gerente e sem dedução de IVA. A dinheiro não se resume tudo: o subsídio de
        desemprego só existe na Categoria A, e a baixa, a parentalidade e a indemnização por despedimento têm regras
        diferentes em cada cenário. Não substitui o aconselhamento de um contabilista certificado (OCC).
      </p>
    </div>

    {/* ── Passar da comparação à execução ──────────────────────────
        Fica ANTES do diagnóstico de contabilista e do mapa: quem já viu os
        três cenários lado a lado quer saber como executar o que escolheu.
        `exigeRevisaoHumana` está ligado nesta rota — a comparação é uma
        estimativa e a escolha de enquadramento nunca é automática. */}
    <FizPlanoAcao
      simulador="comparador"
      valores={{
        entityType: r.melhor === "empresa" ? "COMPANY" : "INDIVIDUAL",
        period: "ANNUAL",
        grossEstimate: Math.round(bruto),
        irsEstimate: Math.round(r.melhor === "dependente" ? r.dependente.irs : r.freelancer.irs),
      }}
      passosPreparacao={[
        `Cenários comparados para ${fmt(bruto)} €/ano: dependente, recibos verdes e empresa.`,
        `Cenário com maior líquido identificado: ${tituloMelhor}.`,
      ]}
    />

    {bruto > 0 && (
      <div className="mt-4">
        <EnviarAoContabilista
          tipo="comparador_regimes"
          toolId="comparar-regimes"
          titulo={`Comparação de regimes ${FISCAL_YEAR}`}
          conteudo={{
            ano: FISCAL_YEAR,
            cenarios: [
              { nome: "Trabalhador dependente", liquidoAnual: Math.round(liquidos.dependente) },
              { nome: "Recibos verdes", liquidoAnual: Math.round(liquidos.freelancer) },
              { nome: "Empresa (sociedade)", liquidoAnual: Math.round(liquidos.empresa) },
            ],
            recomendacao: tituloMelhor,
            pressupostos: { rendimentoBrutoAnual: Math.round(bruto), despesasAnuais: Math.round(despesas) },
          }}
        />
      </div>
    )}

    {/* ── Próximos passos: precisas de um contabilista? ── */}
    <ErrorBoundary etiqueta="o diagnóstico de contabilista">
      <PassoContabilista faturacaoAnual={bruto} despesasEstimadas={despesas} mostrarMapa={false} />
    </ErrorBoundary>

    {/* ── Mapa unificado: benefícios fiscais por região (+ preços de contabilistas, notários e advogados) ── */}
    <ErrorBoundary etiqueta="o mapa de preços e regiões">
      <MapaRegioes contexto="beneficios" />
    </ErrorBoundary>

    {/* Dúvidas separadas por cenário */}
    <ComparadorFAQ />
    </div>
  );
}
