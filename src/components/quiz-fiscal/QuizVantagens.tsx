"use client";

import { Zap, Lightbulb, Clock, Eye, SkipForward, Target, Repeat, Shield } from "@/components/ui/Icons";
import type { VantagensEstado } from "@/hooks/useQuizFiscal";

interface QuizVantagensProps {
  vantagens: VantagensEstado;
  modo: "normal" | "guiado";
  respondida: boolean;
  onEliminar2: () => void;
  onDica: () => void;
  onTempoExtra: () => void;
  onExplicacao: () => void;
  onPular: () => void;
  onDobrar: () => void;
  onSegundaChance: () => void;
  onEscudo: () => void;
  compact?: boolean;
}

const QUIZ_DARK = "#3a5232";

interface ItemVantagem {
  chave: keyof VantagensEstado;
  label: string;
  labelCurto: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icone: React.ComponentType<any>;
  isDesativadoFn: (respondida: boolean, modo: string) => boolean;
}

const ITENS: ItemVantagem[] = [
  { chave: "eliminar2",     label: "Eliminar 2",    labelCurto: "Elim.",  Icone: Zap,         isDesativadoFn: (r) => r },
  { chave: "dica",          label: "Dica",          labelCurto: "Dica",   Icone: Lightbulb,   isDesativadoFn: (r) => r },
  { chave: "tempoExtra",    label: "+10 segundos",  labelCurto: "+10s",   Icone: Clock,       isDesativadoFn: (r, m) => r || m === "guiado" },
  { chave: "explicacao",    label: "Explicação",    labelCurto: "Expl.",  Icone: Eye,         isDesativadoFn: (r, m) => r || m === "guiado" },
  { chave: "pular",         label: "Pular",         labelCurto: "Pular",  Icone: SkipForward, isDesativadoFn: (r) => r },
  { chave: "dobrar",        label: "Dobrar pts",    labelCurto: "×2",     Icone: Target,      isDesativadoFn: (r) => r },
  { chave: "segundaChance", label: "2.ª Chance",    labelCurto: "2.ª C.", Icone: Repeat,      isDesativadoFn: (r) => r },
  { chave: "escudo",        label: "Escudo",        labelCurto: "Esd.",   Icone: Shield,      isDesativadoFn: (r) => r },
];

export default function QuizVantagens({
  vantagens,
  modo,
  respondida,
  onEliminar2,
  onDica,
  onTempoExtra,
  onExplicacao,
  onPular,
  onDobrar,
  onSegundaChance,
  onEscudo,
  compact = false,
}: QuizVantagensProps) {
  const handlers: Record<keyof VantagensEstado, () => void> = {
    eliminar2:     onEliminar2,
    dica:          onDica,
    tempoExtra:    onTempoExtra,
    explicacao:    onExplicacao,
    pular:         onPular,
    dobrar:        onDobrar,
    segundaChance: onSegundaChance,
    escudo:        onEscudo,
  };

  const iconSz  = compact ? 14 : 16;
  const minH    = compact ? "44px" : "54px";
  const lblSize = compact ? "8px" : "9px";

  return (
    <div
      className="grid grid-cols-4 gap-1.5 w-full"
      role="group"
      aria-label="Vantagens disponíveis"
    >
      {ITENS.map(({ chave, label, labelCurto, Icone, isDesativadoFn }) => {
        const usada    = vantagens[chave];
        const desativ  = isDesativadoFn(respondida, modo);
        const inativo  = usada || desativ;

        const bg     = usada   ? "#f0ebe0"   : desativ ? "#f5f2ee"   : "#e8f0e4";
        const border = usada   ? "#d4c4b0"   : desativ ? "#e0d8cc"   : QUIZ_DARK;
        const cor    = usada   ? "#b0a090"   : desativ ? "#c4b8a8"   : QUIZ_DARK;
        const opac   = usada   ? 0.65        : desativ ? 0.42        : 1;

        return (
          <button
            key={chave}
            type="button"
            disabled={inativo}
            onClick={handlers[chave]}
            title={usada ? `${label} — já usada` : desativ ? `${label} — indisponível` : label}
            aria-label={usada ? `${label}, já usada` : desativ ? `${label}, indisponível` : label}
            aria-pressed={usada}
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl border transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#3a5232]"
            style={{
              minHeight: minH,
              padding: compact ? "5px 3px" : "7px 4px",
              backgroundColor: bg,
              borderColor: border,
              opacity: opac,
            }}
          >
            <span style={{ color: cor }}>
              <Icone size={iconSz} />
            </span>
            <span
              className="font-bold leading-none text-center"
              style={{ fontSize: lblSize, color: cor }}
            >
              {labelCurto}
            </span>
          </button>
        );
      })}
    </div>
  );
}
