"use client";

// Seletor de modo da homepage. Dois grupos mutuamente exclusivos —
// "Sou trabalhador" (Independente / Por conta de outrem) e "Gostaria de"
// (Abrir empresa / Comparar cenários). Define o `perfil` global, que ramifica
// TODO o conteúdo da homepage (hero, calculadora, features…).
//
// ── Porque é UM cartão, e não dois grupos soltos ────────────────────────────
// O desenho anterior punha o rótulo À ESQUERDA das opções, numa caixa de largura
// fixa (`w-28`). "SOU TRABALHADOR" em maiúsculas não cabe em 112px: transbordava
// para cima do grupo ao lado no desktop e partia em duas linhas no telemóvel —
// as duas filas ficavam com alturas diferentes e o conjunto perdia o eixo. Os
// dois grupos tinham ainda contorno próprio, larguras diferentes (o texto de
// cada par manda) e uma régua em gradiente a flutuar entre eles: três caixas a
// competir onde só há uma decisão.
//
// Agora: rótulo POR CIMA (nunca corta, em qualquer largura), opções numa grelha
// de duas colunas iguais (margens alinhadas nas duas filas) e um só contorno à
// volta de tudo — uma bandeja com quatro escolhas, não quatro objetos.

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
    <div>
      <span className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
        {titulo}
      </span>
      {/* Duas colunas iguais: as opções deixam de ter a largura do seu próprio
          texto, por isso as duas filas ficam com a mesma margem direita e o
          cartão ganha um eixo. `items-stretch` (implícito na grelha) mantém a
          mesma altura mesmo quando um rótulo quebra em duas linhas a 360px. */}
      <div role="group" aria-label={ariaLabel} className="grid grid-cols-2 gap-1.5">
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
              className={`group inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-center text-xs font-semibold leading-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:px-3 ${
                ativo
                  ? "bg-brand text-white shadow-glow"
                  : "border border-stone-200/80 bg-white text-stone-600 shadow-sm hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark hover:shadow-card dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-brand"
              }`}
            >
              <span
                className={`flex-shrink-0 transition-colors ${
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
    <div
      className={`w-full rounded-2xl border border-stone-200/70 bg-stone-50/70 p-2 shadow-sm backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/50 sm:p-2.5 ${
        center ? "mx-auto max-w-md" : ""
      }`}
    >
      <Grupo
        titulo="Sou trabalhador"
        ariaLabel="O teu perfil de trabalhador"
        opcoes={TRABALHADOR}
        perfil={perfil}
        definir={definir}
      />
      {/* Régua interior: separa as duas perguntas sem lhes dar contorno próprio.
          De margem a margem do cartão (`-mx-*`), para ser uma divisória e não
          mais um traço a flutuar. */}
      <div
        aria-hidden
        className="-mx-2 my-2.5 h-px bg-stone-200/70 dark:bg-stone-700/60 sm:-mx-2.5"
      />
      <Grupo
        titulo="Gostaria de"
        ariaLabel="O que queres fazer"
        opcoes={GOSTARIA}
        perfil={perfil}
        definir={definir}
      />
    </div>
  );
}
