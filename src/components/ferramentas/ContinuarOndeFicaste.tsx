"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «Continuar onde ficaste» — só aparece se houver mesmo onde continuar
//  ---------------------------------------------------------------------
//  Lê o localStorage DIRETAMENTE, em vez de usar `useCenarios()`. Não é
//  duplicação por descuido: `useCenarios` arrasta Supabase e Stripe para
//  decidir entre nuvem e local, e o hub não pode pagar esse bundle para
//  responder a uma pergunta que é local por definição — «há cenários neste
//  dispositivo?» (§13.1).
//
//  É também o que cumpre a regra: reabrir dados locais NUNCA exige conta.
//  Sem cenários, o componente não renderiza nada — nem um estado vazio,
//  porque um bloco vazio a dizer «ainda não guardaste nada» é ruído para
//  quem chegou agora.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, History } from "@/components/ui/Icons";
import { META_TIPO_CENARIO, type TipoCenario } from "@/lib/store/cenarios";

const CHAVE = "recibocerto:cenarios:v1";

interface CenarioLeve {
  id: string;
  tipo: TipoCenario;
  nome: string;
  criadoEm: string;
}

function lerLocais(): CenarioLeve[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const lista: unknown = JSON.parse(bruto);
    if (!Array.isArray(lista)) return [];
    return lista
      .filter((c): c is CenarioLeve =>
        Boolean(c) && typeof c === "object" &&
        typeof (c as CenarioLeve).id === "string" &&
        typeof (c as CenarioLeve).tipo === "string" &&
        (c as CenarioLeve).tipo in META_TIPO_CENARIO)
      .sort((a, b) => (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""))
      .slice(0, 3);
  } catch {
    // localStorage indisponível (modo privado, quota, JSON corrompido): a
    // secção simplesmente não aparece. Nunca deixa a página em erro.
    return [];
  }
}

export default function ContinuarOndeFicaste() {
  const [cenarios, setCenarios] = useState<CenarioLeve[]>([]);

  useEffect(() => {
    setCenarios(lerLocais());
  }, []);

  if (cenarios.length === 0) return null;

  return (
    <section aria-labelledby="continuar" className="mt-14">
      <div className="mb-4 flex items-center gap-2">
        <History size={17} className="text-brand" />
        <h2 id="continuar" className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
          Continuar onde ficaste
        </h2>
      </div>
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
        Guardados neste dispositivo. Não precisas de conta para os reabrir.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cenarios.map((c) => {
          const meta = META_TIPO_CENARIO[c.tipo];
          return (
            <Link
              key={c.id}
              href={meta.rota}
              className="group flex items-start gap-3 rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:border-brand hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {c.nome || meta.label}
                </span>
                <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{meta.label}</span>
              </span>
              <ArrowRight
                size={15}
                className="mt-0.5 flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
