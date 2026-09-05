"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CAMINHO DE VOLTA
//  ---------------------------------------------------------------------
//  Quem chega aqui pela terceira porta de um simulador guiado («ainda não
//  sei o que vou vender») não veio à procura de um motor de descoberta:
//  veio à procura de um número que o simulador lhe pediu e que ela não
//  tinha. Sem isto, encontrava a hipótese e ficava sem saber que havia
//  para onde voltar — a porta era só de ida.
//
//  ── PORQUE É UMA FAIXA E NÃO UM MODAL ──────────────────────────────
//  Porque não interrompe nada. A pessoa está no meio de uma tarefa longa;
//  o convite fica no fluxo, por cima da ferramenta, e desaparece quando
//  ela o usar ou o dispensar. É a mesma regra do painel de novidades: um
//  sinal, nunca uma superfície por cima do que se está a fazer.
//
//  ── E DESAPARECE QUANDO DEVE ───────────────────────────────────────
//  O bilhete é ESPREITADO (a descoberta dura, e recarrega-se) e só é
//  consumido em dois gestos: voltar, ou dispensar. Consumi-lo à entrada
//  fazia o convite evaporar-se ao primeiro F5.
//
//  Não leva números nenhuns de volta — isso é o trabalho das pontes com
//  dados, que têm ecrã de revisão. Isto é uma direção.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { registar } from "@/lib/analytics/cliente";
import {
  PASSO_REGRESSO_ACEITE,
  PASSO_REGRESSO_OFERECIDO,
  PORTAS_DESCOBERTA,
  type SimuladorDeOrigem,
} from "@/lib/simuladores/porta-descoberta";
import {
  consumirRegressoAoSimulador,
  espreitarRegressoAoSimulador,
} from "@/lib/store/regresso-descoberta";
import { ArrowLeft, Close } from "@/components/ui/Icons";

export default function RegressoAoSimulador() {
  const [origem, setOrigem] = useState<SimuladorDeOrigem | null>(null);

  // Depois da montagem: o cofre é do browser, e ler no servidor daria
  // sempre `null` e um salto de layout na hidratação.
  useEffect(() => {
    const bilhete = espreitarRegressoAoSimulador();
    if (!bilhete) return;
    setOrigem(bilhete);
    registar("simulator_step", {
      tool_id: "descobrir-negocio",
      step_id: PASSO_REGRESSO_OFERECIDO,
      outcome: "ok",
    });
  }, []);

  if (!origem) return null;
  const porta = PORTAS_DESCOBERTA[origem];

  const dispensar = () => {
    consumirRegressoAoSimulador();
    setOrigem(null);
  };

  return (
    <aside
      aria-label="Voltar ao simulador de onde vieste"
      className="flex flex-col gap-3 rounded-4xl border border-brand/25 bg-brand-light/50 p-4 dark:border-brand/30 dark:bg-brand/10 sm:flex-row sm:items-center"
    >
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
        {porta.convite}
      </p>
      <div className="flex flex-shrink-0 items-center gap-2">
        <Link
          href={porta.rota}
          onClick={() => {
            consumirRegressoAoSimulador();
            registar("simulator_step", {
              tool_id: "descobrir-negocio",
              step_id: PASSO_REGRESSO_ACEITE,
              outcome: "ok",
            });
          }}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900"
        >
          <ArrowLeft size={13} aria-hidden /> Voltar ao simulador
        </Link>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar o convite para voltar ao simulador"
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white/70 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          <Close size={14} aria-hidden />
        </button>
      </div>
    </aside>
  );
}
