import type { Metadata } from "next";
import type { ReactNode } from "react";
import MolduraContabilista from "@/components/contabilista/MolduraContabilista";

// ═══════════════════════════════════════════════════════════════════════
//  A MOLDURA É CLIENTE; O LAYOUT NÃO PRECISA DE SER
//  ---------------------------------------------------------------------
//  Toda a moldura vive em `components/contabilista/MolduraContabilista.tsx`, que é
//  `"use client"` porque tem estado, rota ativa e uma doca que reage ao
//  tamanho do ecrã. Este ficheiro ficou a ser o que resta: um Server
//  Component fino, cuja única razão de existir é poder exportar `metadata`.
//
//  Um Client Component NÃO pode exportar `metadata`. Enquanto o layout foi
//  um, estas páginas herdavam o título da raiz e o separador do browser
//  dizia «Simulador de IRS, Recibos Verdes, Salário e Empresa 2026 |
//  Recibo Certo» em cima do painel de administração — com seis separadores
//  abertos, indistinguíveis uns dos outros. Também não tinham `<h1>`.
//
//  `robots` fica aqui e não só no `next.config.mjs`: a regra do cabeçalho
//  HTTP continua a valer, e esta é a mesma afirmação dita no sítio onde
//  quem lê o código a procura.
// ═══════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: { default: "Painel do contabilista — Recibo Certo", template: "%s · Contabilista — Recibo Certo" },
  description: "Painel de gestão do contabilista. Área privada, fora do índice.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <MolduraContabilista>{children}</MolduraContabilista>;
}
