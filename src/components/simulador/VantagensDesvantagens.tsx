"use client";

import { m } from "motion/react";
import { Check, Warning, Close } from "@/components/ui/Icons";

interface VantagensDesvantagensProps {
  vantagens: string[];
  desvantagens: string[];
  avisos?: string[];
  className?: string;
}

const item = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0 },
};

/**
 * Componente puro de apresentação: lista compacta de vantagens, desvantagens e
 * avisos com ícones SVG. Limita-se a 3 itens por categoria.
 */
export default function VantagensDesvantagens({
  vantagens,
  desvantagens,
  avisos = [],
  className = "",
}: VantagensDesvantagensProps) {
  const v = vantagens.slice(0, 3);
  const d = desvantagens.slice(0, 3);
  const a = avisos.slice(0, 3);

  if (v.length === 0 && d.length === 0 && a.length === 0) return null;

  return (
    <m.ul
      className={`space-y-1.5 ${className}`}
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.04 }}
    >
      {v.map((texto, i) => (
        <m.li
          key={`v-${i}`}
          variants={item}
          className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300"
        >
          <span className="mt-0.5 flex-shrink-0 text-brand">
            <Check size={12} />
          </span>
          <span>{texto}</span>
        </m.li>
      ))}
      {d.map((texto, i) => (
        <m.li
          key={`d-${i}`}
          variants={item}
          className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300"
        >
          <span className="mt-0.5 flex-shrink-0 text-red-500">
            <Close size={12} />
          </span>
          <span>{texto}</span>
        </m.li>
      ))}
      {a.map((texto, i) => (
        <m.li
          key={`a-${i}`}
          variants={item}
          className="flex items-start gap-2 text-xs leading-relaxed text-alert-text"
        >
          <span className="mt-0.5 flex-shrink-0 text-alert-text">
            <Warning size={12} />
          </span>
          <span>{texto}</span>
        </m.li>
      ))}
    </m.ul>
  );
}
