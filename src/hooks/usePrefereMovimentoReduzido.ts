"use client";

import { useEffect, useState } from "react";

/** A preferência do sistema sem importar o runtime de animação. */
export function usePrefereMovimentoReduzido() {
  const [reduz, setReduz] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const atualizar = () => setReduz(media.matches);
    atualizar();
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);

  return reduz;
}
