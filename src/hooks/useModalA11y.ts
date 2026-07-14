"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCAVEIS =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Acessibilidade partilhada de modais/folhas-inferiores:
 *  · bloqueia o scroll de fundo enquanto está aberto;
 *  · fecha com Escape;
 *  · prende o foco do teclado (Tab) dentro do diálogo;
 *  · restaura o foco ao elemento anterior ao fechar.
 *
 * O `ref` deve apontar para o contentor do diálogo (idealmente com `tabIndex={-1}`).
 */
export function useModalA11y(
  ativo: boolean,
  aoFechar: () => void,
  ref: RefObject<HTMLElement | null>,
): void {
  // Guardar o callback num ref para o efeito só depender de `ativo` (evita
  // re-executar — e roubar o foco — a cada render).
  const fecharRef = useRef(aoFechar);
  fecharRef.current = aoFechar;

  useEffect(() => {
    if (!ativo) return;
    const anterior = document.activeElement as HTMLElement | null;

    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const container = ref.current;
    const focaveis = () =>
      Array.from(container?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? []).filter(
        (el) => el.offsetParent !== null,
      );

    // Foco inicial no primeiro elemento focável (ou no próprio contentor).
    const primeiros = focaveis();
    (primeiros[0] ?? container)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        fecharRef.current();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const alvos = focaveis();
      if (alvos.length === 0) {
        e.preventDefault();
        return;
      }
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      const atual = document.activeElement as HTMLElement;
      if (e.shiftKey && atual === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowAntes;
      anterior?.focus?.();
    };
  }, [ativo, ref]);
}
