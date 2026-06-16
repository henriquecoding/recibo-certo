"use client";

import { Home, LayoutGrid, History, User } from "@/components/ui/Icons";

interface QuizMobileNavProps {
  activeTab?: "home" | "categorias" | "historico" | "perfil";
  onHome?: () => void;
  onCategorias?: () => void;
  onHistorico?: () => void;
  onPerfil?: () => void;
}

const NAV_COLOR = "#44613d";
const NAV_ACTIVE = "#145532";

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

  return (
    <nav
      className="flex items-center justify-around border-t px-2 py-1 shrink-0"
      style={{ backgroundColor: "#f1e4d4", borderColor: "#d4b896" }}
      aria-label="Navegação principal"
    >
      {items.map(({ key, Icon, label, onClick }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-opacity hover:opacity-70 active:scale-95"
            style={{ color: isActive ? NAV_ACTIVE : NAV_COLOR }}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={22} />
            <span className="text-[9px] font-semibold leading-none mt-0.5">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
