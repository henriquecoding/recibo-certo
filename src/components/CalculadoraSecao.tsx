"use client";

// Secção da calculadora na homepage — ramifica pelo perfil escolhido:
// Independente → simulador de recibos verdes (Cat. B); Por conta de outrem →
// simulador de recibo de vencimento (Cat. A). O utilizador pode trocar aqui.

import { usePerfil } from "@/lib/perfil";
import Reveal from "@/components/ui/Reveal";
import SimuladorIntegrado from "@/components/SimuladorIntegrado";
import { SimuladorVencimento } from "@/components/dependente/SimuladorVencimento";

const PERFIS: { chave: "independente" | "dependente"; label: string }[] = [
  { chave: "independente", label: "Independente" },
  { chave: "dependente", label: "Por conta de outrem" },
];

export default function CalculadoraSecao() {
  const { perfil, definir } = usePerfil();
  const dep = perfil === "dependente";

  return (
    <div className="mx-auto max-w-5xl">
      {/* Toggle de perfil — espelha o do hero, para trocar aqui mesmo */}
      <div className="mb-8 flex justify-center">
        <div
          role="group"
          aria-label="O teu perfil"
          className="inline-flex rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-1 shadow-card"
        >
          {PERFIS.map((p) => (
            <button
              key={p.chave}
              type="button"
              aria-pressed={perfil === p.chave}
              onClick={() => definir(p.chave)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                perfil === p.chave
                  ? "bg-brand text-white shadow-glow"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Reveal className="mb-10 text-center">
        <div className="eyebrow mb-3 text-brand">
          {dep ? "Recibo de vencimento 2026" : "Calculadora de recibos verdes 2026"}
        </div>
        <h2 className="font-display display-2 font-semibold text-ink">
          {dep ? (
            <>
              O teu salário está certo?
              <br className="hidden sm:block" /> Vê o líquido real.
            </>
          ) : (
            <>
              Calcula o teu líquido real.
              <br className="hidden sm:block" /> IRS, SS e IVA em segundos.
            </>
          )}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-stone-500 dark:text-stone-400">
          {dep
            ? "Do salário bruto ao líquido — IRS retido, Segurança Social, subsídio de refeição e os subsídios de férias e de Natal. Taxas oficiais de 2026."
            : "Ajusta o valor e a atividade — vê imediatamente quanto recebes a limpo como recibos verdes e quanto ficarias como empresa. Taxas de 2026, verificadas com fonte legal."}
        </p>
      </Reveal>

      <Reveal delay={0.08}>{dep ? <SimuladorVencimento /> : <SimuladorIntegrado />}</Reveal>
    </div>
  );
}
