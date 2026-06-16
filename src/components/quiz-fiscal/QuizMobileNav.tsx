"use client";

import { Home, Trophy, History, LayoutGrid, User } from "@/components/ui/Icons";

export type MobileNavTab = "home" | "ranking" | "historico" | "categorias" | "perfil";

interface QuizMobileNavProps {
  activeTab?: MobileNavTab;
  onHome?: () => void;
  onRanking?: () => void;
  onHistorico?: () => void;
  onCategorias?: () => void;
  onPerfil?: () => void;
}

const NAV_COLOR = "#44613d";
const NAV_ACTIVE = "#145532";

export default function QuizMobileNav({
  activeTab = "home",
  onHome,
  onRanking,
  onHistorico,
  onCategorias,
  onPerfil,
}: QuizMobileNavProps) {
  const items = [
    { key: "home" as const, Icon: Home, label: "Início", onClick: onHome },
    { key: "ranking" as const, Icon: Trophy, label: "Ranking", onClick: onRanking },
    { key: "historico" as const, Icon: History, label: "Histórico", onClick: onHistorico },
    { key: "categorias" as const, Icon: LayoutGrid, label: "Categorias", onClick: onCategorias },
    { key: "perfil" as const, Icon: User, label: "Perfil", onClick: onPerfil },
  ];

  return (
    <nav
      className="flex items-center justify-around border-t px-1 py-1.5 shrink-0"
      style={{ backgroundColor: "#f5f0e8", borderColor: "#d4c4b0" }}
      aria-label="Navegação principal"
    >
      {items.map(({ key, Icon, label, onClick }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-opacity hover:opacity-70 active:scale-95 min-w-[52px]"
            style={{ color: isActive ? NAV_ACTIVE : NAV_COLOR }}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={22} />
            <span className="text-[9px] font-semibold leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
