import type { CSSProperties, ReactNode } from "react";

// Revela conteúdo com fade/slide ao entrar no viewport sem criar uma ilha
// React por bloco. O CSS deixa tudo visível onde view timelines não existem
// e a media query global trata de prefers-reduced-motion.
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
    <div
      className={`rc-view-reveal ${className}`}
      style={
        delay > 0
          ? ({ "--rc-reveal-delay": `${delay}s` } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
