"use client";

// Secção da calculadora na homepage — ramifica pelo modo escolhido no seletor:
//  · independente → simulador de recibos verdes (Cat. B);
//  · dependente   → simulador de recibo de vencimento (Cat. A);
//  · empresa      → simulador de empresa (IRC + dividendos), com destaque próprio;
//  · comparar     → comparador de cenários (A vs B vs Empresa) robusto.
// O conteúdo adapta-se: cada modo mostra só o que lhe diz respeito.
//
// DESEMPENHO: os simuladores são pesados (incluem o motor fiscal e o pdfjs) e
// vivem abaixo da dobra. Por isso carregam-se com `next/dynamic` (ssr:false) e
// só quando a secção se aproxima do ecrã (IntersectionObserver) — não pesam no
// bundle inicial nem no arranque da landing. Cada modo é um chunk próprio: só
// se descarrega o simulador que o utilizador realmente usa.

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePerfil } from "@/lib/perfil";
import { FOCO_DO_PERFIL_ANTIGO, FOCO_POR_ID } from "@/components/foco/focos";
import LinkFocoIntencao from "@/components/foco/LinkFocoIntencao";
import { usePerto } from "@/lib/use-perto";
import Reveal from "@/components/ui/Reveal";
import SeletorModo from "@/components/SeletorModo";

/**
 * Quanto antes do ecrã se começa a descarregar o simulador.
 *
 * Lido uma vez, no cliente. `connection` não existe em todos os
 * browsers — sem ela, assume-se ligação normal, que é o caso da maioria.
 */
function margemDeAntecipacao(): string {
  if (typeof navigator === "undefined") return "320px 0px";
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (!c) return "320px 0px";
  if (c.saveData) return "0px";
  if (c.effectiveType === "slow-2g" || c.effectiveType === "2g" || c.effectiveType === "3g") {
    return "0px";
  }
  return "320px 0px";
}

function SimuladorSkeleton() {
  return (
    <div
      className="animate-pulse rounded-4xl border border-stone-200/80 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-8"
      style={{ minHeight: 560 }}
      aria-hidden
    >
      <div className="mx-auto h-10 w-64 max-w-full rounded-full bg-stone-100 dark:bg-stone-800" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800" />
        <div className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      </div>
      <div className="mt-4 h-40 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="mt-4 h-16 rounded-2xl bg-stone-50 dark:bg-stone-800/60" />
      <span className="sr-only">A carregar o simulador…</span>
    </div>
  );
}

const SimuladorIntegrado = dynamic(() => import("@/components/SimuladorIntegrado"), {
  ssr: false,
  loading: () => <SimuladorSkeleton />,
});
const SimuladorVencimento = dynamic(
  () => import("@/components/dependente/MotorReciboVencimento").then((m) => m.MotorReciboVencimento),
  { ssr: false, loading: () => <SimuladorSkeleton /> }
);
const ComparadorCenarios = dynamic(() => import("@/components/comparar/ComparadorCenarios"), {
  ssr: false,
  loading: () => <SimuladorSkeleton />,
});
// O estúdio de viabilidade. Substitui a ENTRADA do perfil empresa — não o
// simulador, que continua inteiro em `/ferramentas/simulador-empresa` e
// tem saída direta a partir daqui («Já sei quanto vou faturar»).
const NegocioStudio = dynamic(() => import("@/components/negocio/NegocioStudio"), {
  ssr: false,
  loading: () => <SimuladorSkeleton />,
});

const COPY: Record<string, { eyebrow: string; h2: React.ReactNode; sub: string }> = {
  independente: {
    eyebrow: "Calculadora de recibos verdes 2026",
    h2: (
      <>
        Calcula o teu líquido real.
        <br className="hidden sm:block" /> IRS, SS e IVA em segundos.
      </>
    ),
    sub: "Ajusta o valor e a atividade — vê imediatamente o teu rendimento líquido como trabalhador independente, com as taxas oficiais de 2026.",
  },
  dependente: {
    eyebrow: "Recibo de vencimento 2026",
    h2: (
      <>
        O teu salário está certo?
        <br className="hidden sm:block" /> Vê o líquido real.
      </>
    ),
    sub: "Do salário bruto ao líquido — IRS retido, Segurança Social, subsídio de refeição e os subsídios de férias e de Natal. Taxas oficiais de 2026.",
  },
  empresa: {
    eyebrow: "Começar um negócio",
    h2: (
      <>
        O negócio começa antes da empresa.
        <br className="hidden sm:block" /> Vamos ver se as contas fecham.
      </>
    ),
    sub: "Diz-nos o que queres vender. Construímos contigo o preço, o volume necessário e as contas da operação — e só depois comparamos começar como independente ou como sociedade.",
  },
  comparar: {
    eyebrow: "Comparar cenários 2026",
    h2: (
      <>
        Qual o melhor caminho para ti?
        <br className="hidden sm:block" /> Compara lado a lado.
      </>
    ),
    sub: "Para o mesmo rendimento anual, compara o que te fica no bolso como por conta de outrem, recibos verdes ou empresa — com o ponto de viragem e o calendário fiscal de cada cenário.",
  },
};

export default function CalculadoraSecao() {
  const { perfil } = usePerfil();
  const copy = COPY[perfil] ?? COPY.independente;

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ 800 px DE MARGEM ERA TODA A GENTE                                 │
  // │                                                                   │
  // │ A margem existia para o simulador estar pronto quando alguém      │
  // │ clicasse no CTA do hero. O efeito medido é outro: numa janela de  │
  // │ 900 px de altura, 800 px de margem significa que a secção «está a │
  // │ aproximar-se» no instante em que a página abre. Resultado — 547 KB│
  // │ de simulador, mais os seus 200 KB de dados fiscais, descarregados │
  // │ por TODA a gente que abre `/`, incluindo quem nunca desce.        │
  // │                                                                   │
  // │ 320 px é aproximar-se a sério: dá cerca de meio segundo de aviso  │
  // │ a quem rola a um ritmo normal, e o esqueleto cobre o resto.       │
  // └───────────────────────────────────────────────────────────────────┘
  //
  //  E com `Save-Data` ou ligação lenta declarada, não se antecipa nada:
  //  quem pediu para poupar dados não quer um megabyte especulativo, e
  //  numa ligação fraca antecipar rouba largura de banda ao que está a
  //  ser lido agora.
  const { ref, perto } = usePerto<HTMLDivElement>(margemDeAntecipacao());

  // Os OUTROS modos são pré-carregados por intenção (hover/foco/toque no seletor,
  // ver SeletorModo) em vez de todos no arranque — assim modos pesados (ex.: por
  // conta de outrem, ~1 MB) não gastam dados a quem nunca os usa, mantendo a
  // troca de modo praticamente instantânea para quem mostra intenção.

  // ── A PERGUNTA QUE ESTA SECÇÃO RESPONDE ──────────────────────────
  //  A homepage tem duas metades que falavam línguas diferentes: o hero
  //  fala `foco` (a pergunta, no URL) e isto fala `Perfil` (em
  //  `localStorage`). Vinham do mesmo gesto e nada o dizia — descias a
  //  página e o simulador aparecia sem explicação de porquê aquele.
  //
  //  Esta linha é a metade que faltava do laço: a bússola escreve o
  //  perfil quando alguém carrega em «Experimentar já, aqui», e daqui
  //  vê-se de que pergunta é que este simulador é a resposta — com o
  //  caminho de volta à leitura completa dela.
  const foco = FOCO_DO_PERFIL_ANTIGO[perfil];
  const definicao = foco ? FOCO_POR_ID.get(foco) : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Seletor de modo — espelha o da bússola, para trocar aqui mesmo */}
      <div className="mb-8 flex justify-center">
        <SeletorModo center />
      </div>

      <Reveal className="mb-10 text-center">
        {definicao ? (
          <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
            A responder a{" "}
            <LinkFocoIntencao
              foco={definicao.id}
              className="font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
            >
              «{definicao.pergunta}»
            </LinkFocoIntencao>
          </p>
        ) : null}
        <div className="eyebrow mb-3 text-brand">{copy.eyebrow}</div>
        <h2 className="font-display display-2 font-semibold text-ink">{copy.h2}</h2>
        <p className="mx-auto mt-3 max-w-lg text-stone-500 dark:text-stone-400">{copy.sub}</p>
      </Reveal>

      <div ref={ref}>
        {!perto ? (
          <SimuladorSkeleton />
        ) : perfil === "dependente" ? (
          <SimuladorVencimento key="dependente" />
        ) : perfil === "comparar" ? (
          <ComparadorCenarios key="comparar" />
        ) : perfil === "empresa" ? (
          <NegocioStudio key="empresa" />
        ) : (
          <SimuladorIntegrado key="independente" vista="rv" />
        )}
      </div>

      {/* ── A SAÍDA DIRETA PARA O SIMULADOR DE EMPRESA ─────────────────
          Critério de aceitação n.º 20: o simulador de empresa continua
          acessível diretamente. Quem já sabe a faturação não tem de
          construir um modelo comercial para lá chegar — construir um
          modelo é para quem AINDA NÃO SABE, que é a maioria de quem
          escolhe este modo. ─────────────────────────────────────────── */}
      {perfil === "empresa" ? (
        <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
          Já sabes quanto vais faturar?{" "}
          <Link
            prefetch={false}
            href="/ferramentas/simulador-empresa"
            className="font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
          >
            Vai direto ao simulador de empresa
          </Link>{" "}
          — IRC, derrama, dividendos e otimização salário/dividendos.
        </p>
      ) : null}
    </div>
  );
}
