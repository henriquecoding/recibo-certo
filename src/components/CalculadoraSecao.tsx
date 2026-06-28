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

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePerfil } from "@/lib/perfil";
import Reveal from "@/components/ui/Reveal";
import SeletorModo from "@/components/SeletorModo";

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
  () => import("@/components/dependente/SimuladorVencimento").then((m) => m.SimuladorVencimento),
  { ssr: false, loading: () => <SimuladorSkeleton /> }
);
const ComparadorCenarios = dynamic(() => import("@/components/comparar/ComparadorCenarios"), {
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
    eyebrow: "Abrir empresa 2026",
    h2: (
      <>
        Vale a pena abrir empresa?
        <br className="hidden sm:block" /> Vê o líquido via sociedade.
      </>
    ),
    sub: "Faturação, custos e distribuição de dividendos — estima o líquido com IRC PME, derrama, tributação autónoma e benefícios fiscais (RFAI, DLRR, SIFIDE). Taxas oficiais de 2026.",
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

  // Carrega o simulador só quando a secção se aproxima do ecrã. A margem
  // generosa garante que já está pronto quando o utilizador chega (incl. ao
  // clicar no CTA "Calcular" do hero, que rola até aqui).
  const ref = useRef<HTMLDivElement>(null);
  const [perto, setPerto] = useState(false);

  useEffect(() => {
    if (perto) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setPerto(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPerto(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [perto]);

  // Os OUTROS modos são pré-carregados por intenção (hover/foco/toque no seletor,
  // ver SeletorModo) em vez de todos no arranque — assim modos pesados (ex.: por
  // conta de outrem, ~1 MB) não gastam dados a quem nunca os usa, mantendo a
  // troca de modo praticamente instantânea para quem mostra intenção.

  return (
    <div className="mx-auto max-w-5xl">
      {/* Seletor de modo — espelha o do hero, para trocar aqui mesmo */}
      <div className="mb-8 flex justify-center">
        <SeletorModo center />
      </div>

      <Reveal className="mb-10 text-center">
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
          <SimuladorIntegrado key="empresa" vista="empresa" />
        ) : (
          <SimuladorIntegrado key="independente" vista="rv" />
        )}
      </div>
    </div>
  );
}
