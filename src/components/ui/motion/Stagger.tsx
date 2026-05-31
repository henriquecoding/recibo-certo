"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { staggerContainer, staggerItem, inViewOnce } from "@/lib/motion";

// Grupo que revela os filhos em cascata.
export function StaggerGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <m.div className={className} initial="hidden" whileInView="visible" viewport={inViewOnce} variants={staggerContainer}>
      {children}
    </m.div>
  );
}

// Cada item do grupo. `as` permite escolher o elemento semântico.
export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <m.div className={className} variants={staggerItem}>
      {children}
    </m.div>
  );
}
