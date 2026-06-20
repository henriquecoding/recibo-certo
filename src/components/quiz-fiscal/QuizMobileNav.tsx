"use client";

import { Home, LayoutGrid, History, User } from "@/components/ui/Icons";

export type MobileNavTab = "home" | "categorias" | "historico" | "perfil";

interface QuizMobileNavProps {
  activeTab?: MobileNavTab;
  onHome?: () => void;
  onCategorias?: () => void;
  onHistorico?: () => void;
  onPerfil?: () => void;
}

export default function QuizMobileNav({
  activeTab = "home",
  onHome,
  onCategorias,
  onHistorico,
  onPerfil,
}: QuizMobileNavProps) {
  const items = [
    { key: "home" as const, Icon: Home, label: "Início", onClick: onHome },
    { key: "categorias" as const, Icon: LayoutGrid, label: "Categorias", onClick: onCategorias },
    { key: "historico" as const, Icon: History, label: "Histórico", onClick: onHistorico },
    { key: "perfil" as const, Icon: User, label: "Perfil", onClick: onPerfil },
  ];

  // Mesma linguagem visual do chrome inferior do resto do site (limpo, verde da
  // marca, cantos pouco arredondados), adaptado às funções do quiz.
  return (
    <nav
      className="flex shrink-0 items-center justify-around gap-1 border-t border-stone-200 bg-white px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 dark:border-stone-800 dark:bg-stone-900"
      aria-label="Navegação do quiz"
    >
      {items.map(({ key, Icon, label, onClick }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold transition-colors active:scale-95 ${
              isActive ? "text-brand" : "text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isActive ? "bg-brand-light" : ""}`}>
              <Icon size={20} />
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
