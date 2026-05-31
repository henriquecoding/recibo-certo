import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-shine bg-brand text-white shadow-glow hover:shadow-float",
  secondary: "border border-stone-200 bg-white text-stone-700 hover:border-stone-300",
  ghost: "text-stone-500 hover:bg-stone-100 hover:text-stone-800",
};

const SIZES: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3.5 text-sm gap-2",
};

// Botão primitivo do design system: variantes, tamanhos e feedback tátil
// (escala ao pressionar). Funciona em modo claro e escuro.
export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
