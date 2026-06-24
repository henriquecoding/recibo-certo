"use client";

// Seletor de modo da homepage. Dois grupos mutuamente exclusivos, separados
// por uma linha: "Sou Trabalhador" (Independente / Por conta de outrem) e
// "Gostaria de" (Abrir Empresa / Comparar Cenários). Define o `perfil` global,
// que ramifica TODO o conteúdo da homepage (hero, calculadora, features…).
// Cada opção é um chip com ícone — selecionado preenchido a marca, não
// selecionado com superfície e contorno próprios (estado de botão legível,
// não texto solto), com hover que eleva.

import type { ReactNode } from "react";
import { usePerfil, type Perfil } from "@/lib/perfil";
import { Receipt, Briefcase, Building, Scale } from "@/components/ui/Icons";
import { prefetchSimulador } from "@/lib/prefetch-simuladores";

type Opcao = { chave: Perfil; label: string; icon: ReactNode };

const TRABALHADOR: Opcao[] = [
  { chave: "independente", label: "Independente", icon: <Receipt size={15} /> },
  { chave: "dependente", label: "Por conta de outrem", icon: <Briefcase size={15} /> },
];

const GOSTARIA: Opcao[] = [
  { chave: "empresa", label: "Abrir Empresa", icon: <Building size={15} /> },
  { chave: "comparar", label: "Comparar Cenários", icon: <Scale size={15} /> },
];

function Grupo({
  titulo,
  ariaLabel,
  opcoes,
  perfil,
  definir,
}: {
  titulo: string;
  ariaLabel: string;
  opcoes: Opcao[];
  perfil: Perfil;
  definir: (p: Perfil) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="w-28 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-stone-400">
        {titulo}
      </span>
      <div
        role="group"
        aria-label={ariaLabel}
        className="inline-flex gap-1.5 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-1 shadow-sm backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/60"
      >
        {opcoes.map((o) => {
          const ativo = perfil === o.chave;
          return (
            <button
              key={o.chave}
              type="button"
              aria-pressed={ativo}
              onClick={() => definir(o.chave)}
              onPointerEnter={() => prefetchSimulador(o.chave)}
              onFocus={() => prefetchSimulador(o.chave)}
              className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                ativo
                  ? "bg-brand text-white shadow-glow"
                  : "border border-stone-200 bg-white text-stone-600 shadow-card hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-brand"
              }`}
            >
              <span
                className={`transition-colors ${
                  ativo ? "text-white" : "text-stone-400 group-hover:text-brand"
                }`}
              >
                {o.icon}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SeletorModo({ center = false }: { center?: boolean }) {
  const { perfil, definir } = usePerfil();
  return (
    <div className={`flex flex-col gap-3 ${center ? "items-center" : "items-start"}`}>
      <Grupo titulo="Sou Trabalhador" ariaLabel="O teu perfil de trabalhador" opcoes={TRABALHADOR} perfil={perfil} definir={definir} />
      <div className={`h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent dark:via-stone-700 ${center ? "w-80" : "w-full max-w-lg"}`} />
      <Grupo titulo="Gostaria de" ariaLabel="O que queres fazer" opcoes={GOSTARIA} perfil={perfil} definir={definir} />
    </div>
  );
}
