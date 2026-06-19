import type { ReactNode } from "react";

// Cabeçalho consistente para as ferramentas/simuladores alojados no painel.
// Mantém o utilizador dentro do shell do dashboard (mesma navegação).
export default function PaginaFerramenta({
  eyebrow,
  titulo,
  descricao,
  children,
}: {
  eyebrow?: string;
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        {eyebrow && <div className="eyebrow mb-2 text-brand">{eyebrow}</div>}
        <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">{titulo}</h1>
        {descricao && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">{descricao}</p>}
      </header>
      {children}
    </div>
  );
}
