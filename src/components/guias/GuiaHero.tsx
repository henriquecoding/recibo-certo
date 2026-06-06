import Reveal from "@/components/ui/Reveal";
import Badge from "@/components/ui/Badge";
import { Clock } from "@/components/ui/Icons";

interface GuiaHeroProps {
  eyebrow?: string;
  titulo: string;
  descricao: string;
  tempoLeitura?: number; // minutos
  badge?: string;
}

export function GuiaHero({
  eyebrow = "Guia",
  titulo,
  descricao,
  tempoLeitura,
  badge,
}: GuiaHeroProps) {
  return (
    <Reveal className="mb-12">
      <div className="eyebrow mb-3 text-brand">{eyebrow}</div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {badge && <Badge tone="brand">{badge}</Badge>}
        {tempoLeitura && (
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
            <Clock size={13} />
            {tempoLeitura} min de leitura
          </span>
        )}
      </div>
      <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
        {titulo}
      </h1>
      <p className="text-lg text-stone-500 dark:text-stone-400 max-w-2xl leading-relaxed">
        {descricao}
      </p>
    </Reveal>
  );
}
