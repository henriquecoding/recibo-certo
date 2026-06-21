import type { Variants, Transition } from "motion/react";

// Curva de easing da marca — saída suave e natural.
export const EASE: Transition["ease"] = [0.16, 1, 0.3, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

// Viewport partilhado: anima UMA vez, assim que qualquer parte entra no ecrã.
// `amount: "some"` (e não uma fração) é essencial para mobile-first: secções
// mais altas do que o ecrã (ex.: o comparador, os simuladores) nunca chegariam
// a ter 15% visíveis num telemóvel — ficariam presas em `opacity:0` (espaço em
// branco). Com "some", revelam assim que o topo entra. Margem negativa no fundo
// para não revelar cedo de mais.
export const inViewOnce = { once: true, amount: "some" } as const;
