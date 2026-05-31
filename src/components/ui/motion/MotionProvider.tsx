"use client";

import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { EASE } from "@/lib/motion";

// Carrega só as features de animação necessárias (bundle menor que `motion.*`)
// e respeita prefers-reduced-motion globalmente. `strict` força o uso de `m.*`.
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: EASE }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
