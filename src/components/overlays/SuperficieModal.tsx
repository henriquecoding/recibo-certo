"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A SUPERFÍCIE MODAL — um contrato completo, escrito uma vez
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE ISTO É UM COMPONENTE E NÃO SEIS CORRECÇÕES LOCAIS (P1-06)     │
//  │                                                                     │
//  │ Os diálogos do telemóvel declaravam `role="dialog"` e                │
//  │ `aria-modal="true"` e depois cada um resolvia à sua maneira — ou não │
//  │ resolvia — o foco inicial, a prisão do Tab, o bloqueio do scroll, a  │
//  │ inércia do fundo e a devolução do foco. Cinco regras vezes seis      │
//  │ superfícies são trinta oportunidades de esquecer uma, e a que se     │
//  │ esquece só se nota com teclado ou leitor de ecrã.                     │
//  │                                                                     │
//  │ `aria-modal="true"` é uma PROMESSA ao leitor de ecrã: «o resto da    │
//  │ página não existe agora». Quem a faz tem de a cumprir com `inert`,   │
//  │ senão o leitor continua a anunciar o que está por baixo e a pessoa   │
//  │ navega numa página que julga estar fechada.                          │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  O fundo fica inerte por IRMÃOS, e não por um invólucro nomeado: o
//  diálogo é montado num portal directamente em `<body>` e todos os outros
//  filhos de `<body>` levam `inert`. Assim ninguém tem de se lembrar de
//  manter uma lista de contentores em dia quando o layout mudar.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FOCAVEIS =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface SuperficieModalProps {
  aberto: boolean;
  aoFechar: () => void;
  /** Nome acessível do diálogo. */
  rotulo: string;
  /** Onde devolver o foco. Por omissão, o elemento que estava activo. */
  focoDeRegresso?: () => HTMLElement | null;
  /** O que recebe o foco ao abrir. Por omissão, o primeiro focável. */
  focoInicial?: () => HTMLElement | null;
  className?: string;
  children: React.ReactNode;
}

export function SuperficieModal({
  aberto,
  aoFechar,
  rotulo,
  focoDeRegresso,
  focoInicial,
  className,
  children,
}: SuperficieModalProps) {
  const [ancora, setAncora] = useState<HTMLElement | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // Os callbacks vivem numa ref para o efeito depender só de `aberto`: sem
  // isto, cada render do pai voltava a correr a montagem — e a montagem
  // rouba o foco.
  const cbs = useRef({ aoFechar, focoDeRegresso, focoInicial });
  cbs.current = { aoFechar, focoDeRegresso, focoInicial };

  useEffect(() => {
    if (!aberto) return;
    const el = document.createElement("div");
    el.dataset.overlayModal = "";
    document.body.appendChild(el);
    setAncora(el);
    return () => {
      setAncora(null);
      el.remove();
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto || !ancora) return;

    const anterior = document.activeElement as HTMLElement | null;

    /* ── Fundo inerte ─────────────────────────────────────────────── */
    const irmaos = Array.from(document.body.children).filter(
      (n): n is HTMLElement => n instanceof HTMLElement && n !== ancora,
    );
    const inertesAntes = irmaos.map((n) => n.hasAttribute("inert"));
    irmaos.forEach((n) => n.setAttribute("inert", ""));

    /* ── Scroll bloqueado ─────────────────────────────────────────── */
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* ── Foco inicial ─────────────────────────────────────────────── */
    const focaveis = () =>
      Array.from(caixa.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? []).filter(
        (e) => e.offsetParent !== null || e === document.activeElement,
      );

    // Um frame de espera: o conteúdo pode estar a montar (campo, lista) e
    // focar o que ainda não existe é focar o contentor por omissão.
    const id = requestAnimationFrame(() => {
      const alvo = cbs.current.focoInicial?.() ?? focaveis()[0] ?? caixa.current;
      alvo?.focus();
    });

    /* ── Escape e prisão do Tab ───────────────────────────────────── */
    const onTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cbs.current.aoFechar();
        return;
      }
      if (e.key !== "Tab") return;
      const alvos = focaveis();
      if (alvos.length === 0) {
        e.preventDefault();
        caixa.current?.focus();
        return;
      }
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      const atual = document.activeElement as HTMLElement | null;
      // Se o foco escapou (o browser fê-lo cair no `<body>` ao montar),
      // o Tab traz--o de volta em vez de o deixar sair para a página inerte.
      if (!caixa.current?.contains(atual)) {
        e.preventDefault();
        (e.shiftKey ? ultimo : primeiro).focus();
        return;
      }
      if (e.shiftKey && atual === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", onTecla, true);

    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onTecla, true);
      document.body.style.overflow = overflowAntes;
      irmaos.forEach((n, i) => {
        if (!inertesAntes[i]) n.removeAttribute("inert");
      });
      // Devolver o foco DEPOIS de levantar o `inert`: um elemento inerte
      // recusa foco em silêncio, e o `focus()` não fazia nada.
      const destino = cbs.current.focoDeRegresso?.() ?? anterior;
      destino?.focus?.();
    };
  }, [aberto, ancora]);

  if (!aberto || !ancora) return null;

  return createPortal(
    <div
      ref={caixa}
      role="dialog"
      aria-modal="true"
      aria-label={rotulo}
      tabIndex={-1}
      className={className}
    >
      {children}
    </div>,
    ancora,
  );
}
