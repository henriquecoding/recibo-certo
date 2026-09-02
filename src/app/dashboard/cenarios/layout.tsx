import type { Metadata } from "next";
import type { ReactNode } from "react";

// A página desta rota é um Client Component e um Client Component não
// pode exportar `metadata`. O título vive aqui, no segmento, para o
// separador do browser dizer o que é — em vez do «Painel» genérico
// herdado do layout de cima.
export const metadata: Metadata = { title: "O meu trabalho" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
