"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { fadeUp, inViewOnce } from "@/lib/motion";

// Revela conteúdo com fade/slide ao entrar no viewport.
// O MotionConfig global trata de prefers-reduced-motion.
export default function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={inViewOnce}
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </m.div>
  );
}
