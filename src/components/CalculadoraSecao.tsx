"use client";

// Secção da calculadora na homepage — ramifica pelo modo escolhido no seletor:
//  · independente → simulador de recibos verdes (Cat. B);
//  · dependente   → simulador de recibo de vencimento (Cat. A);
//  · empresa      → simulador de empresa (IRC + dividendos), com destaque próprio;
//  · comparar     → comparador de cenários (A vs B vs Empresa) robusto.
// O conteúdo adapta-se: cada modo mostra só o que lhe diz respeito.

import { usePerfil } from "@/lib/perfil";
import Reveal from "@/components/ui/Reveal";
import SeletorModo from "@/components/SeletorModo";
import SimuladorIntegrado from "@/components/SimuladorIntegrado";
import { SimuladorVencimento } from "@/components/dependente/SimuladorVencimento";
import ComparadorCenarios from "@/components/comparar/ComparadorCenarios";

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

      <Reveal delay={0.08}>
        {perfil === "dependente" ? (
          <SimuladorVencimento key="dependente" />
        ) : perfil === "comparar" ? (
          <ComparadorCenarios key="comparar" />
        ) : perfil === "empresa" ? (
          <SimuladorIntegrado key="empresa" vista="empresa" />
        ) : (
          <SimuladorIntegrado key="independente" vista="rv" />
        )}
      </Reveal>
    </div>
  );
}
