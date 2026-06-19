"use client";

// Seletor de modo da homepage. Dois grupos mutuamente exclusivos, separados
// por uma linha: "Sou Trabalhador" (Independente / Por conta de outrem) e
// "Gostaria de" (Abrir Empresa / Comparar Cenários). Define o `perfil` global,
// que ramifica todo o conteúdo da homepage (hero + calculadora).

import { usePerfil, type Perfil } from "@/lib/perfil";

type Opcao = { chave: Perfil; label: string };

const TRABALHADOR: Opcao[] = [
  { chave: "independente", label: "Independente" },
  { chave: "dependente", label: "Por conta de outrem" },
];

const GOSTARIA: Opcao[] = [
  { chave: "empresa", label: "Abrir Empresa" },
  { chave: "comparar", label: "Comparar Cenários" },
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
      <span className="w-28 text-xs font-medium text-stone-400">{titulo}</span>
      <div
        role="group"
        aria-label={ariaLabel}
        className="inline-flex rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-1 shadow-card"
      >
        {opcoes.map((o) => (
          <button
            key={o.chave}
            type="button"
            aria-pressed={perfil === o.chave}
            onClick={() => definir(o.chave)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              perfil === o.chave
                ? "bg-brand text-white shadow-glow"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SeletorModo({ center = false }: { center?: boolean }) {
  const { perfil, definir } = usePerfil();
  return (
    <div className={`flex flex-col gap-3 ${center ? "items-center" : "items-start"}`}>
      <Grupo titulo="Sou Trabalhador" ariaLabel="O teu perfil de trabalhador" opcoes={TRABALHADOR} perfil={perfil} definir={definir} />
      <div className={`h-px bg-stone-200 dark:bg-stone-700 ${center ? "w-72" : "w-full max-w-md"}`} />
      <Grupo titulo="Gostaria de" ariaLabel="O que queres fazer" opcoes={GOSTARIA} perfil={perfil} definir={definir} />
    </div>
  );
}
