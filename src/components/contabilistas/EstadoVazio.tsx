import type { ComponentType, ReactNode } from "react";

/** Estado vazio do design system: ícone, frase e uma ação — nunca só o vazio. */
export default function EstadoVazio({
  Icon, titulo, descricao, acao,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-4xl border border-dashed border-stone-200 bg-white/60 px-5 py-10 text-center">
      <Icon size={28} className="mx-auto text-stone-300" aria-hidden />
      <p className="mt-3 font-display text-lg text-ink">{titulo}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500">{descricao}</p>
      {acao && <div className="mt-5 flex justify-center">{acao}</div>}
    </div>
  );
}
