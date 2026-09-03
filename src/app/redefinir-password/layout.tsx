import type { Metadata } from "next";
import type { ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════
//  UM LAYOUT SÓ PARA OS METADADOS
//  ---------------------------------------------------------------------
//  A página é `"use client"` — espera pelo evento de sessão que o
//  `supabase-js` produz ao ler o token do fragmento do URL — e um Client
//  Component não pode exportar `metadata`. Sem isto, o separador do browser
//  dizia «Simulador de IRS, Recibos Verdes, Salário e Empresa 2026 | Recibo
//  Certo» por cima de um formulário de recuperação de palavra-passe.
//
//  `robots: index: false` repete aqui o que o `robots.txt` já diz. Não é
//  redundância inútil: o `robots.txt` pede a um crawler que não RASTREIE, e
//  esta linha diz-lhe que não INDEXE — que é a diferença entre não ir lá e
//  não pôr nos resultados uma página que, sem token válido, só sabe dizer
//  que o link expirou.
// ═══════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: "Definir uma palavra-passe nova",
  description:
    "Destino do link de recuperação de palavra-passe do Recibo Certo. Sem um link válido, esta página não tem conteúdo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
