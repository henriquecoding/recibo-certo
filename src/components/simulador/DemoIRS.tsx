"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { m, AnimatePresence, useReducedMotion } from "motion/react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { pct } from "@/lib/format";
import { ESCALOES_IRS, COEFICIENTE_POR_TIPO } from "@/lib/fiscal-data";
import { simularIRSAnual, type SimulacaoInput, type SimulacaoIRS } from "@/lib/fiscal";
import FizLogo from "@/components/fiz/FizLogo";
import { fizAtiva } from "@/lib/fiz/flag";
import {
  BotaoPausa,
  ReguaDeAtos,
  TituloAto,
  eur0,
  eurNeg,
  eurPos,
  linha,
  num,
  palco,
  pctInteiro,
  useRelogioDePalco,
  type AtoDaRegua,
} from "@/components/simulador/palco";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  FileSign,
  Home,
  Laptop,
  Receipt,
  Scale,
  ShieldCheck,
  User,
  Wallet,
} from "@/components/ui/Icons";

// ═════════════════════════════════════════════════════════════════════════
//  DEMONSTRAÇÃO EM DIRETO DO SIMULADOR DE IRS
//  ---------------------------------------------------------------------
//  A versão anterior mostrava um cartão estático com montantes escritos à
//  mão. Duas consequências: os números não provavam nada (podiam divergir do
//  motor sem ninguém dar por isso) e o cartão não CONTAVA o cálculo — dava a
//  resposta sem mostrar como lá chegou, que é precisamente o que distingue
//  este simulador de uma folha de cálculo.
//
//  Esta versão corrige as duas coisas:
//
//  1. NÚMEROS REAIS. Cada perfil é um conjunto de ENTRADAS ilustrativas
//     (rotuladas «Exemplo»); tudo o resto — coeficiente, regra dos 15%,
//     escalões, deduções, mínimo de existência, saldo — sai de
//     `simularIRSAnual`, o mesmo motor da ferramenta. Não há um único
//     montante fiscal escrito à mão neste ficheiro. Se a lei mudar em
//     `fiscal-data.ts`, a demonstração muda com ela.
//
//  2. UMA NARRATIVA EM CINCO ATOS. O cálculo desenrola-se por tempos —
//     quem é o caso, como o bruto vira coletável, como os escalões mordem,
//     qual é o acerto, e quem trata da entrega (a FIZ). Cada ato tem a sua
//     coreografia e uma barra de progresso que se enche, ao estilo das
//     «histórias»: dá a sensação de estar a correr, porque está.
//
//  Acessibilidade: conteúdo em movimento automático tem de ser pausável
//  (WCAG 2.2.2) — daí o botão explícito, além da pausa ao passar o rato ou
//  ao focar. Com `prefers-reduced-motion` não há rotação nenhuma: o cartão
//  abre no ato do resultado e navega-se pelos passos à mão.
//
//  Paleta: só o verde da marca. O que fica contigo usa o verde vivo
//  (`brand`); o que sai para IRS usa o verde profundo (`brand-deep`, com
//  variante clara no escuro). O amarelo aparece uma única vez, no ato da
//  FIZ — é a fronteira entre o que é nosso e o que é do parceiro.
// ═════════════════════════════════════════════════════════════════════════

// Formatação, variantes de animação, régua, botão de pausa e relógio vivem em
// `palco.tsx` — partilhados com o Hero e com a página de investidores.

// ── Perfis de exemplo ────────────────────────────────────────────────────
//  São ENTRADAS, não resultados. Escolhidos para que os quatro percorram
//  ramos diferentes do motor: simplificado puro, tributação conjunta com
//  englobamento, início de atividade com IRS Jovem, e contabilidade
//  organizada. Assim a demonstração mostra o motor inteiro, não um caso.

interface PerfilDemo {
  id: string;
  persona: string;
  detalhe: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  /** A pergunta a que este perfil responde — abre o primeiro ato. */
  pergunta: string;
  entrada: SimulacaoInput;
}

const PERFIS: PerfilDemo[] = [
  {
    id: "freelancer",
    persona: "Freelancer · solteiro",
    detalhe: "Art. 151.º · regime simplificado",
    Icon: Laptop,
    pergunta: "Recebi por recibos verdes o ano todo. Sobra ou falta?",
    entrada: {
      brutoAnual: 28_500,
      tipo: "art151",
      anoAtividade: 3,
      retencoesPagas: 4_360,
      deducoes: { saude: 900, gerais: 1_400 },
    },
  },
  {
    id: "familia",
    persona: "Casal · 2 dependentes",
    detalhe: "Tributação conjunta · dois rendimentos",
    Icon: Home,
    pergunta: "Somos dois, com filhos. Entregar em conjunto compensa?",
    entrada: {
      brutoAnual: 34_000,
      tipo: "art151",
      anoAtividade: 5,
      conjunta: true,
      dependentes: 2,
      outrosRendimentos: 21_000,
      retencoesPagas: 9_800,
      deducoes: { saude: 1_600, educacao: 2_200, gerais: 3_000 },
      // Com tributação conjunta e rendimentos de outra categoria, o motor não
      // consegue inferir os factos do Art. 70.º a partir do pedido — têm de
      // ser dados, senão a decisão fica em `needs_input`.
      minimoExistenciaFacts: {
        eligibleIncome: true,
        dependentTaxpayer: false,
        grossIncome: 34_000,
        specificDeductions: 4_104,
        householdGrossIncome: 55_000,
        householdNonEnglobedIncome: 0,
        householdTaxpayers: 2,
      },
    },
  },
  {
    id: "jovem",
    persona: "Jovem freelancer · 2.º ano",
    detalhe: "Coeficiente reduzido · IRS Jovem",
    Icon: Receipt,
    pergunta: "Estou no início e com IRS Jovem. Quanto é que isso muda?",
    entrada: {
      brutoAnual: 45_000,
      tipo: "art151",
      anoAtividade: 2,
      irsJovemAno: 5,
      retencoesPagas: 6_100,
      deducoes: { saude: 500, gerais: 1_100 },
    },
  },
  {
    id: "organizada",
    persona: "Consultor · contabilidade organizada",
    detalhe: "Despesas reais · clientes no estrangeiro",
    Icon: Briefcase,
    // O caso que ninguém quer ver e toda a gente devia: sem retenção
    // portuguesa, o IRS do ano inteiro aparece de uma só vez em junho.
    // Uma demonstração em que todos os perfis dão reembolso mentiria.
    pergunta: "Quase não me retêm nada. O que é que me espera em junho?",
    entrada: {
      brutoAnual: 96_000,
      tipo: "art151",
      anoAtividade: 6,
      regimeContabilidade: "organizada",
      despesasJustificadas: 34_000,
      dependentes: 1,
      retencoesPagas: 6_000,
      deducoes: { saude: 1_500, gerais: 2_500 },
      ppr: { valor: 2_000, escalaoIdade: "de35a50" },
    },
  },
];

// ── Atos ─────────────────────────────────────────────────────────────────

type AtoId = "perfil" | "coletavel" | "escaloes" | "saldo" | "fiz";

const ATO_META: Record<AtoId, { rotulo: string; legenda: string }> = {
  perfil: { rotulo: "O caso", legenda: "O que entra no cálculo" },
  coletavel: { rotulo: "Coletável", legenda: "Do bruto ao rendimento coletável" },
  escaloes: { rotulo: "Escalões", legenda: "Onde o imposto se forma" },
  saldo: { rotulo: "Acerto", legenda: "Reembolso ou imposto a pagar" },
  fiz: { rotulo: "Entrega", legenda: "Quem trata das obrigações" },
};

/** Quanto tempo cada ato fica em cena. O dos escalões é o mais longo porque
 *  tem a animação sequencial das barras a correr por dentro. */
const DURACAO: Record<AtoId, number> = {
  perfil: 3600,
  coletavel: 5200,
  escaloes: 5600,
  saldo: 5200,
  fiz: 4400,
};

const ATOS_BASE: AtoId[] = ["perfil", "coletavel", "escaloes", "saldo"];

const ESC = ESCALOES_IRS.value;
const MARGINAL_MIN = Math.min(...ESC.map((e) => e.taxa));
const MARGINAL_MAX = Math.max(...ESC.map((e) => e.taxa));

/** Altura relativa (22%–100%) de cada coluna a partir da sua taxa marginal. */
function alturaBarra(taxa: number): number {
  const span = MARGINAL_MAX - MARGINAL_MIN || 1;
  return 22 + ((taxa - MARGINAL_MIN) / span) * 78;
}

// Geometria do anel.
const R = 40;
const C = 2 * Math.PI * R;
const GAP = 0.024;

// ── Ato 1 · O caso ───────────────────────────────────────────────────────

// Curto de propósito: a 360px o valor divide a linha com o rótulo, e um
// valor comprido empurra o rótulo para reticências ("Ano de…").
function rotuloAnoAtividade(ano: number | undefined, reducao: number): string {
  if (ano === 1) return `1.º · coef. −${pct(reducao)}`;
  if (ano === 2) return `2.º · coef. −${pct(reducao)}`;
  return "3.º ou seguinte";
}

function AtoPerfil({ perfil, sim }: { perfil: PerfilDemo; sim: SimulacaoIRS }) {
  const e = perfil.entrada;
  const organizada = sim.regimeContabilidade === "organizada";

  const factos: { Icon: typeof Wallet; rotulo: string; valor: string }[] = [
    {
      Icon: Wallet,
      rotulo: organizada ? "Receita do ano" : "Rendimento bruto",
      valor: eur0(sim.brutoAnual),
    },
    organizada
      ? { Icon: Receipt, rotulo: "Despesas documentadas", valor: eur0(sim.despesasJustificadas) }
      : {
          Icon: Scale,
          rotulo: "Coeficiente da atividade",
          valor: `${num(COEFICIENTE_POR_TIPO[e.tipo], 2)} · Art. 31.º`,
        },
    { Icon: Calendar, rotulo: "Ano de atividade", valor: rotuloAnoAtividade(e.anoAtividade, sim.reducaoAno) },
  ];
  if (sim.conjunta || (e.dependentes ?? 0) > 0) {
    factos.push({
      Icon: User,
      rotulo: "Agregado",
      valor: [
        sim.conjunta ? "tributação conjunta" : "um titular",
        (e.dependentes ?? 0) > 0 ? `${e.dependentes} dependentes` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  if (sim.outrosRendimentos > 0) {
    factos.push({ Icon: Briefcase, rotulo: "Outros rendimentos", valor: eur0(sim.outrosRendimentos) });
  }
  factos.push({ Icon: Check, rotulo: "Retido na fonte", valor: eur0(sim.retencoesPagas) });

  return (
    <m.div variants={palco} initial="oculto" animate="entra">
      <m.p
        variants={linha}
        className="mb-3 border-l-2 border-brand/30 pl-2.5 text-[13px] font-medium italic leading-snug text-stone-600 dark:text-stone-300"
      >
        “{perfil.pergunta}”
      </m.p>
      <TituloAto nota="Exemplo">O que entra no cálculo</TituloAto>
      <div className="space-y-1">
        {factos.map((f) => (
          <m.div
            key={f.rotulo}
            variants={linha}
            className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-2.5 py-1.5 dark:bg-stone-800/50"
          >
            <span className="flex min-w-0 items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
              <f.Icon size={12} className="flex-shrink-0 text-stone-400" />
              <span className="truncate">{f.rotulo}</span>
            </span>
            <span className="flex-shrink-0 text-[11px] font-semibold tabular-nums text-stone-700 dark:text-stone-200">
              {f.valor}
            </span>
          </m.div>
        ))}
      </div>
    </m.div>
  );
}

// ── Ato 2 · Do bruto ao coletável ────────────────────────────────────────

interface LinhaCascata {
  rotulo: string;
  nota?: string;
  valor: number;
  tipo: "base" | "menos" | "mais" | "total";
}

/** A cascata é DERIVADA do resultado: cada perfil produz as linhas que lhe
 *  dizem respeito e nenhuma outra. É por isso que o mesmo componente serve o
 *  simplificado, a organizada, o IRS Jovem e o englobamento. */
function cascataColetavel(s: SimulacaoIRS): LinhaCascata[] {
  const l: LinhaCascata[] = [];
  if (s.regimeContabilidade === "organizada") {
    l.push({ rotulo: "Receita do ano", valor: s.brutoAnual, tipo: "base" });
    if (s.despesasJustificadas > 0.5) {
      l.push({
        rotulo: "Despesas documentadas",
        nota: "contabilidade organizada",
        valor: -s.despesasJustificadas,
        tipo: "menos",
      });
    }
  } else {
    l.push({ rotulo: "Rendimento bruto", valor: s.brutoAnual, tipo: "base" });
    l.push({
      rotulo: `Coeficiente ${num(s.coeficiente, 3)}`,
      nota: s.reducaoAno > 0 ? `com a redução de ${pct(s.reducaoAno)} do início de atividade` : "Art. 31.º CIRS",
      valor: -(s.brutoAnual - s.rendimentoCoeficiente),
      tipo: "menos",
    });
    // Limiar de 25 €, não de 0: para o Art. 151.º, os 15% do bruto e as
    // contribuições obrigatórias (70% × 21,4% ≈ 14,98%) quase coincidem, pelo
    // que o acréscimo dá muitas vezes uns euros de arredondamento. Uma linha
    // de "+7 €" numa cascata de dezenas de milhares só parece um erro.
    if (s.acrescimo15 >= 25) {
      l.push({
        rotulo: "Regra dos 15%",
        nota: "despesas por justificar",
        valor: s.acrescimo15,
        tipo: "mais",
      });
    }
  }
  if (s.rendimentoIsentoJovem > 0.5) {
    l.push({
      rotulo: "IRS Jovem",
      nota: `isenção de ${pct(s.isencaoJovem)}`,
      valor: -s.rendimentoIsentoJovem,
      tipo: "menos",
    });
  }
  if (s.exclusaoDeficiencia > 0.5) {
    l.push({ rotulo: "Exclusão por deficiência", nota: "Art. 56.º-A", valor: -s.exclusaoDeficiencia, tipo: "menos" });
  }
  if (s.exclusaoProgramaRegressar > 0.5) {
    l.push({
      rotulo: "Programa Regressar",
      nota: "Art. 12.º-A",
      valor: -s.exclusaoProgramaRegressar,
      tipo: "menos",
    });
  }
  if (s.outrosRendimentos > 0.5) {
    l.push({ rotulo: "Outros rendimentos", nota: "englobados", valor: s.outrosRendimentos, tipo: "mais" });
  }
  if (s.abatimentoMinimoExistencia > 0.5) {
    l.push({
      rotulo: "Mínimo de existência",
      nota: "Art. 70.º CIRS",
      valor: -s.abatimentoMinimoExistencia,
      tipo: "menos",
    });
  }
  l.push({ rotulo: "Rendimento coletável", valor: s.rendimentoColetavel, tipo: "total" });
  return l;
}

function AtoColetavel({ sim, reduz }: { sim: SimulacaoIRS; reduz: boolean }) {
  const linhas = useMemo(() => cascataColetavel(sim), [sim]);
  const escala = Math.max(sim.brutoAnual, sim.rendimentoColetavelAntesMinimo, 1);

  return (
    <m.div variants={palco} initial="oculto" animate="entra">
      <TituloAto nota={sim.regimeContabilidade === "organizada" ? "Despesas reais" : "Art. 31.º CIRS"}>
        Do bruto ao coletável
      </TituloAto>
      <div className="space-y-1">
        {linhas.map((r, idx) => {
          const largura = Math.min(100, (Math.abs(r.valor) / escala) * 100);
          const total = r.tipo === "total";
          const base = r.tipo === "base";
          return (
            <m.div
              key={r.rotulo}
              variants={linha}
              className={`relative overflow-hidden rounded-lg px-2.5 py-1.5 ${
                total
                  ? "bg-brand-light/70 dark:bg-brand/10"
                  : "bg-stone-50 dark:bg-stone-800/50"
              }`}
            >
              {/* Barra de fundo proporcional — cresce com atraso escalonado. */}
              <span
                aria-hidden
                className={`absolute inset-y-0 left-0 ${
                  total ? "bg-brand/25" : base ? "bg-brand/15" : r.tipo === "menos" ? "bg-brand-deep/10 dark:bg-brand-mint/10" : "bg-brand/10"
                }`}
                style={{
                  width: `${largura}%`,
                  transition: reduz ? undefined : "width 0.75s cubic-bezier(0.16,1,0.3,1)",
                  transitionDelay: reduz ? undefined : `${0.1 + idx * 0.08}s`,
                }}
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span
                    className={`block truncate text-[11px] ${
                      total
                        ? "font-bold text-brand-dark dark:text-brand"
                        : "font-medium text-stone-600 dark:text-stone-300"
                    }`}
                  >
                    {total ? "= " : ""}
                    {r.rotulo}
                  </span>
                  {r.nota && (
                    <span className="block truncate text-[9px] leading-tight text-stone-400">{r.nota}</span>
                  )}
                </span>
                <span
                  className={`flex-shrink-0 text-[11px] font-semibold tabular-nums ${
                    total
                      ? "text-brand-dark dark:text-brand"
                      : r.tipo === "menos"
                        ? "text-brand-deep dark:text-brand-mint"
                        : "text-stone-700 dark:text-stone-200"
                  }`}
                >
                  {r.tipo === "menos" ? eurNeg(r.valor) : r.tipo === "mais" ? eurPos(r.valor) : eur0(r.valor)}
                </span>
              </span>
            </m.div>
          );
        })}
      </div>
    </m.div>
  );
}

// ── Ato 3 · Escalão a escalão ────────────────────────────────────────────

function AtoEscaloes({ sim, reduz }: { sim: SimulacaoIRS; reduz: boolean }) {
  const aplicados = sim.escaloesAplicados;
  const nAplicados = aplicados.length;
  // As colunas enchem-se uma a uma; a coleta acompanha, somando o imposto de
  // cada escalão à medida que ele acende. É o gesto que explica a
  // progressividade sem uma linha de texto.
  const [revelados, setRevelados] = useState(reduz ? nAplicados : 0);

  useEffect(() => {
    if (reduz || nAplicados === 0) {
      setRevelados(nAplicados);
      return;
    }
    setRevelados(0);
    let k = 0;
    const id = setInterval(() => {
      k += 1;
      setRevelados(k);
      if (k >= nAplicados) clearInterval(id);
    }, 300);
    return () => clearInterval(id);
  }, [reduz, nAplicados, sim]);

  const coletaParcial = aplicados.slice(0, revelados).reduce((s, e) => s + e.imposto, 0);
  const marginal = nAplicados > 0 ? aplicados[nAplicados - 1].taxa : 0;
  const indiceAtivo = Math.max(0, Math.min(revelados, nAplicados) - 1);

  if (nAplicados === 0) {
    return (
      <m.div variants={palco} initial="oculto" animate="entra">
        <TituloAto>Escalão a escalão</TituloAto>
        <m.p variants={linha} className="rounded-xl bg-stone-50 p-3 text-[12px] leading-relaxed text-stone-500 dark:bg-stone-800/50 dark:text-stone-400">
          Sem rendimento coletável sujeito às taxas gerais — não há escalões a percorrer.
        </m.p>
      </m.div>
    );
  }

  return (
    <m.div variants={palco} initial="oculto" animate="entra">
      <TituloAto nota="Art. 68.º CIRS · 2026">Escalão a escalão</TituloAto>

      <m.div
        variants={linha}
        className="relative flex h-[92px] items-end gap-[3px] pt-7"
        role="img"
        aria-label={`Os ${ESC.length} escalões de IRS de 2026, de ${pct(ESC[0].taxa)} a ${pct(
          ESC[ESC.length - 1].taxa,
        )}. Este caso percorre ${nAplicados} e a taxa marginal é ${pct(marginal)}.`}
      >
        {ESC.map((e, idx) => {
          const usado = idx < revelados;
          const ativo = idx === indiceAtivo && revelados > 0;
          const altura = alturaBarra(e.taxa);
          return (
            <div key={idx} className="relative flex flex-1 items-end justify-center self-stretch">
              {ativo && (
                <m.span
                  // x:"-50%" vem do motion, não do Tailwind: uma classe
                  // -translate-x-1/2 seria anulada pelo transform que o motion
                  // escreve para o y/scale.
                  initial={reduz ? false : { opacity: 0, y: 4, scale: 0.9, x: "-50%" }}
                  animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  style={{ bottom: `calc(${altura}% + 5px)`, transformOrigin: "bottom center" }}
                  className="absolute left-1/2 z-10 whitespace-nowrap rounded-lg bg-brand-deep px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lift"
                >
                  {idx + 1}.º · {pct(e.taxa)}
                  <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[3px] border-t-[3px] border-x-transparent border-t-brand-deep" />
                </m.span>
              )}
              {/* Trilho (a estrutura dos escalões) + preenchimento (o que este
                  caso percorreu). Separá-los mostra a escada toda, e não só o
                  pedaço que interessa a este perfil. */}
              <span
                className="relative w-full overflow-hidden rounded-t-sm bg-stone-100 dark:bg-stone-800"
                style={{ height: `${altura}%` }}
              >
                <span
                  className={`absolute inset-x-0 bottom-0 ${ativo ? "bg-brand" : "bg-brand/45"}`}
                  style={{
                    height: usado ? "100%" : "0%",
                    transition: reduz ? undefined : "height 0.32s cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </span>
            </div>
          );
        })}
      </m.div>

      <m.div variants={linha} className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/50">
        <span className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-stone-400">
            Coleta acumulada
          </span>
          <span className="block truncate text-[10px] text-stone-400">
            {revelados} de {nAplicados} escalões percorridos
          </span>
        </span>
        <span className="flex-shrink-0 font-display text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-100">
          <AnimatedNumber value={coletaParcial} format={eur0} />
        </span>
      </m.div>

      <m.div variants={linha} className="mt-1.5 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand-dark dark:bg-brand/10 dark:text-brand">
          marginal {pct(marginal)}
        </span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-300">
          média {pct(sim.taxaMediaEfetiva)}
        </span>
        {sim.conjunta && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-300">
            quociente conjugal
          </span>
        )}
        {sim.adicionalSolidariedade > 0.5 && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-300">
            + solidariedade {eur0(sim.adicionalSolidariedade)}
          </span>
        )}
      </m.div>
    </m.div>
  );
}

// ── Ato 4 · O acerto ─────────────────────────────────────────────────────

function AtoSaldo({ sim, reduz }: { sim: SimulacaoIRS; reduz: boolean }) {
  const [desenhado, setDesenhado] = useState(reduz);
  useEffect(() => {
    if (reduz) return setDesenhado(true);
    const id = requestAnimationFrame(() => setDesenhado(true));
    return () => cancelAnimationFrame(id);
  }, [reduz]);

  const reembolso = sim.saldo >= 0;
  const resultado = Math.abs(sim.saldo);
  const fracaoIRS = sim.brutoAnual > 0 ? Math.min(1, sim.irsEstimado / sim.brutoAnual) : 0;
  const ficaContigo = 1 - fracaoIRS;
  const pctContigo = Math.round(ficaContigo * 100);
  const contigoLen = Math.max(0, ficaContigo - GAP) * C;
  const irsLen = Math.max(0, fracaoIRS - GAP) * C;

  const deducoesColeta =
    sim.deducaoDependentes +
    sim.deducaoAscendentes +
    sim.deducaoDespesas +
    sim.deducaoDeficiencia +
    sim.deducaoPensaoAlimentos;

  return (
    <m.div variants={palco} initial="oculto" animate="entra">
      <div className="flex items-center gap-3">
        <m.div variants={linha} className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            {reembolso ? "Reembolso estimado" : "Imposto a pagar"}
          </div>
          <div
            className={`font-display text-[2.15rem] font-semibold leading-none tabular-nums sm:text-[2.4rem] ${
              reembolso ? "text-brand" : "text-brand-deep dark:text-brand-mint"
            }`}
          >
            <AnimatedNumber value={resultado} format={eur0} />
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-300">
            <Scale size={11} className="text-brand" />
            Taxa efetiva
            <span className="tabular-nums text-stone-700 dark:text-stone-100">{pct(sim.taxaMediaEfetiva)}</span>
          </div>
        </m.div>

        <m.div
          variants={linha}
          className="relative h-[88px] w-[88px] flex-shrink-0"
          role="img"
          aria-label={`${pctContigo}% do rendimento bruto fica contigo; ${pct(fracaoIRS)} é IRS.`}
        >
          <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
            <circle cx="48" cy="48" r={R} fill="none" strokeWidth="11" className="stroke-stone-100 dark:stroke-stone-800" />
            <circle
              cx="48"
              cy="48"
              r={R}
              fill="none"
              strokeWidth="11"
              strokeLinecap="butt"
              className="stroke-brand-deep dark:stroke-brand-mint"
              strokeDasharray={`${desenhado ? irsLen : 0} ${C}`}
              transform={`rotate(${ficaContigo * 360} 48 48)`}
              style={{ transition: reduz ? undefined : "stroke-dasharray 0.85s cubic-bezier(0.16,1,0.3,1) 0.15s" }}
            />
            <circle
              cx="48"
              cy="48"
              r={R}
              fill="none"
              strokeWidth="11"
              strokeLinecap="butt"
              className="stroke-brand"
              strokeDasharray={`${desenhado ? contigoLen : 0} ${C}`}
              style={{ transition: reduz ? undefined : "stroke-dasharray 0.85s cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-lg font-semibold leading-none tabular-nums text-stone-800 dark:text-stone-100">
              <AnimatedNumber value={pctContigo} format={pctInteiro} />
            </span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-stone-400">contigo</span>
          </div>
        </m.div>
      </div>

      <div className="mt-3 space-y-px overflow-hidden rounded-xl border border-stone-100 dark:border-stone-800">
        {[
          { rotulo: "Coleta", valor: sim.coletaBruta, fmt: eur0, tom: "neutro" as const },
          { rotulo: "Deduções à coleta", valor: deducoesColeta, fmt: eurNeg, tom: "in" as const },
          { rotulo: "IRS estimado do ano", valor: sim.irsEstimado, fmt: eur0, tom: "out" as const },
          { rotulo: "Retido na fonte", valor: sim.retencoesPagas, fmt: eurPos, tom: "in" as const },
        ].map((r) => (
          <m.div
            key={r.rotulo}
            variants={linha}
            className="flex items-center justify-between gap-3 bg-stone-50/70 px-2.5 py-1.5 dark:bg-stone-800/40"
          >
            <span className="truncate text-[11px] text-stone-500 dark:text-stone-400">{r.rotulo}</span>
            <span
              className={`flex-shrink-0 text-[11px] font-semibold tabular-nums ${
                r.tom === "out"
                  ? "text-brand-deep dark:text-brand-mint"
                  : r.tom === "in"
                    ? "text-brand-dark dark:text-brand"
                    : "text-stone-700 dark:text-stone-200"
              }`}
            >
              <AnimatedNumber value={r.valor} format={r.fmt} />
            </span>
          </m.div>
        ))}
        <m.div
          variants={linha}
          className={`flex items-center justify-between gap-3 px-2.5 py-2 ${
            reembolso ? "bg-brand-light dark:bg-brand/10" : "bg-brand-deep/[0.06] dark:bg-brand/[0.08]"
          }`}
        >
          <span className={`text-[11px] font-bold ${reembolso ? "text-brand-dark" : "text-brand-deep dark:text-brand-mint"}`}>
            = {reembolso ? "Reembolso" : "A pagar"}
          </span>
          <span
            className={`text-[12px] font-bold tabular-nums ${
              reembolso ? "text-brand-dark dark:text-brand" : "text-brand-deep dark:text-brand-mint"
            }`}
          >
            <AnimatedNumber value={resultado} format={reembolso ? eurPos : eurNeg} />
          </span>
        </m.div>
      </div>
    </m.div>
  );
}

// ── Ato 5 · Quem trata da entrega ────────────────────────────────────────

const PASSOS_FIZ = [
  { Icon: FileSign, texto: "Emitir os recibos e faturas do ano" },
  { Icon: Calendar, texto: "Entregar a declaração dentro do prazo" },
  { Icon: ShieldCheck, texto: "Acompanhar as obrigações que se seguem" },
];

function AtoFiz({ sim }: { sim: SimulacaoIRS }) {
  return (
    <m.div variants={palco} initial="oculto" animate="entra">
      <TituloAto nota="Parceiro">E depois do número</TituloAto>

      <m.div variants={linha} className="flex items-center gap-2.5 rounded-xl border border-fiz-200 bg-fiz-50 p-3">
        <FizLogo size={30} className="flex-shrink-0 rounded-lg" decorativo />
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-stone-800 dark:text-stone-100">
            A estimativa é nossa. A entrega é da FIZ.
          </div>
          <div className="text-[10px] leading-relaxed text-stone-600 dark:text-stone-400">
            Contabilistas certificados, para o passo seguinte.
          </div>
        </div>
      </m.div>

      <div className="mt-2 space-y-1">
        {PASSOS_FIZ.map((p) => (
          <m.div
            key={p.texto}
            variants={linha}
            className="flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5 dark:bg-stone-800/50"
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-white text-stone-500 shadow-sm dark:bg-stone-900 dark:text-stone-300">
              <p.Icon size={11} />
            </span>
            <span className="min-w-0 truncate text-[11px] text-stone-600 dark:text-stone-300">{p.texto}</span>
            <ArrowRight size={11} className="ml-auto flex-shrink-0 text-stone-300 dark:text-stone-600" />
          </m.div>
        ))}
      </div>

      <m.p variants={linha} className="mt-2 text-[10px] leading-relaxed text-stone-400">
        Escolhes campo a campo o que segue contigo — a começar pelo IRS estimado de{" "}
        {eur0(sim.irsEstimado)}.
      </m.p>
    </m.div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────

export default function DemoIRS() {
  const reduzRaw = useReducedMotion();
  const reduz = Boolean(reduzRaw);

  const mostrarFiz = fizAtiva();
  const atos = useMemo<AtoId[]>(() => (mostrarFiz ? [...ATOS_BASE, "fiz"] : ATOS_BASE), [mostrarFiz]);

  const [idxPerfil, setIdxPerfil] = useState(0);
  const [idxAto, setIdxAto] = useState(0);
  const [sobrevoo, setSobrevoo] = useState(false); // rato / foco
  const [parado, setParado] = useState(false); // botão explícito

  const perfil = PERFIS[idxPerfil];
  // O motor corre uma vez por perfil. Não há aqui um único montante fiscal
  // escrito à mão: tudo o que se vê saiu de `simularIRSAnual`.
  const sim = useMemo(() => simularIRSAnual(perfil.entrada), [perfil]);

  const ato = atos[Math.min(idxAto, atos.length - 1)];
  const emPausa = sobrevoo || parado;

  // Com movimento reduzido não há rotação: abre-se no ato do resultado, que é
  // o que interessa a quem só vai ver um estado, e navega-se à mão.
  const jaAjustou = useRef(false);
  useEffect(() => {
    if (!reduz || jaAjustou.current) return;
    jaAjustou.current = true;
    setIdxAto(ATOS_BASE.indexOf("saldo"));
  }, [reduz]);

  const avancar = useCallback(() => {
    setIdxAto((atual) => {
      if (atual < atos.length - 1) return atual + 1;
      setIdxPerfil((p) => (p + 1) % PERFIS.length);
      return 0;
    });
  }, [atos.length]);
  const barraRef = useRelogioDePalco({
    duracaoMs: DURACAO[ato],
    chave: `${idxPerfil}-${idxAto}`,
    parado: reduz || emPausa,
    aoTerminar: avancar,
  });

  const atosDaRegua = useMemo<AtoDaRegua[]>(
    () => atos.map((a) => ({ id: a, ...ATO_META[a] })),
    [atos],
  );

  const irParaAto = (idx: number) => {
    setIdxAto(idx);
    setParado(true); // navegar à mão assume o comando
  };

  const irParaPerfil = (idx: number) => {
    setIdxPerfil(idx);
    setIdxAto(0);
  };

  const reembolso = sim.saldo >= 0;

  // Resumo do que está em cena, para leitores de ecrã. Não é uma região
  // "live": anunciar cada ato seria ruído. É conteúdo legível a pedido.
  const resumoSR = `Exemplo: ${perfil.persona}. Rendimento bruto de ${eur0(sim.brutoAnual)}, rendimento coletável de ${eur0(
    sim.rendimentoColetavel,
  )}, IRS estimado de ${eur0(sim.irsEstimado)} e ${eur0(sim.retencoesPagas)} retidos na fonte — ${
    reembolso ? "reembolso" : "imposto a pagar"
  } de ${eur0(Math.abs(sim.saldo))}. Valores calculados pelo simulador a partir de entradas de exemplo.`;

  return (
    <div
      className="relative w-full max-w-md"
      onMouseEnter={() => setSobrevoo(true)}
      onMouseLeave={() => setSobrevoo(false)}
      onFocusCapture={() => setSobrevoo(true)}
      onBlurCapture={() => setSobrevoo(false)}
    >
      {/* Halos decorativos, clipados para não capturarem o rato. */}
      <div aria-hidden className="pointer-events-none absolute -inset-6 overflow-hidden">
        <div className="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-brand-mint/20 blur-3xl dark:bg-brand/10" />
      </div>

      <div className="grain relative rounded-4xl border border-stone-100 bg-white/95 p-4 shadow-float backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/95 sm:p-5">
        {/* Varrimento no topo a cada mudança de perfil — o sinal de «recalculou». */}
        {!reduz && (
          <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-4xl">
            <m.div
              key={`varre-${idxPerfil}`}
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-brand to-transparent"
              initial={{ x: "-120%" }}
              animate={{ x: "420%" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        )}

        {/* ── Cabeçalho ─────────────────────────────────────────────── */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-dark dark:bg-brand/10 dark:text-brand">
            <span className="relative flex h-1.5 w-1.5">
              {!reduz && !emPausa && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            Demo em direto
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-stone-400">IRS 2026</span>
            {!reduz && <BotaoPausa parado={parado} onAlternar={() => setParado((p) => !p)} />}
          </div>
        </div>

        {/* ── Perfil em cena + seletor ──────────────────────────────── */}
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={`persona-${idxPerfil}`}
              initial={reduz ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduz ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="flex min-w-0 items-center gap-2.5"
            >
              <m.span
                initial={reduz ? false : { scale: 0.5, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 20 }}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand"
              >
                <perfil.Icon size={16} />
              </m.span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-stone-700 dark:text-stone-200">
                  {perfil.persona}
                </span>
                <span className="block truncate text-[10px] font-medium text-stone-400">{perfil.detalhe}</span>
              </span>
            </m.div>
          </AnimatePresence>
          <div className="flex flex-shrink-0 items-center gap-1.5" role="tablist" aria-label="Perfis de exemplo">
            {PERFIS.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={idx === idxPerfil}
                aria-label={`Ver o exemplo: ${p.persona}`}
                onClick={() => irParaPerfil(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                  idx === idxPerfil ? "w-5 bg-brand" : "w-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700"
                }`}
              />
            ))}
          </div>
        </div>

        <ReguaDeAtos
          className="mb-3"
          atos={atosDaRegua}
          indiceAtivo={idxAto}
          barraRef={barraRef}
          estatico={reduz}
          onIr={irParaAto}
        />

        {/* ── Palco ───────────────────────────────────────────────────
             Altura mínima igual ao ato mais alto medido a 360px (o do
             agregado, com seis linhas). Sem ela, o cartão cresce e encolhe
             a cada mudança de ato e a página estremece por baixo dele. */}
        <div className="min-h-[17.25rem]">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={`${idxPerfil}-${ato}`}
              initial={reduz ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduz ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2 }}
            >
              {ato === "perfil" && <AtoPerfil perfil={perfil} sim={sim} />}
              {ato === "coletavel" && <AtoColetavel sim={sim} reduz={reduz} />}
              {ato === "escaloes" && <AtoEscaloes sim={sim} reduz={reduz} />}
              {ato === "saldo" && <AtoSaldo sim={sim} reduz={reduz} />}
              {ato === "fiz" && <AtoFiz sim={sim} />}
            </m.div>
          </AnimatePresence>
        </div>

        <p className="sr-only">{resumoSR}</p>
      </div>

      {/* Rodapé: o que está em jogo neste ato, e o aviso de estimativa. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-stone-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" /> Fica contigo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-deep dark:bg-brand-mint" /> IRS
        </span>
        <span className="text-stone-300 dark:text-stone-600">
          Entradas de exemplo · cálculo do simulador
        </span>
      </div>
    </div>
  );
}
