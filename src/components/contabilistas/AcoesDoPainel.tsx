"use client";

// As ações do ecrã vivem na barra do topo, não no fim da página.
//
// É o que as referências mostram: «Pré-visualizar» e «Guardar alterações»
// ao lado da pesquisa, sempre à vista, sem depender de scroll. O layout
// não pode saber quais são — dependem da página —, por isso cada página
// monta as suas neste portal.
//
// Só a partir de `lg`: no telemóvel a barra do topo não tem espaço, e as
// ações continuam onde estão hoje, junto ao conteúdo.

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function AcoesDoPainel({ children }: { children: ReactNode }) {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // O contentor é do layout e já existe quando a página monta. Procurar
    // num efeito (e não durante o render) evita ler o DOM no servidor.
    setAlvo(document.getElementById("painel-acoes"));
  }, []);

  if (!alvo) return null;
  return createPortal(<div className="hidden items-center gap-1.5 lg:flex">{children}</div>, alvo);
}

/** O título do ecrã, na barra do topo. Substitui o que a sidebar já não diz. */
export function TituloDoPainel({ children }: { children: ReactNode }) {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);
  useEffect(() => { setAlvo(document.getElementById("painel-titulo")); }, []);
  if (!alvo) return null;
  return createPortal(
    <span className="truncate text-sm font-semibold text-stone-700">{children}</span>,
    alvo,
  );
}
