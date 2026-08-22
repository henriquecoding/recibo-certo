"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ── PORQUE ISTO NÃO É `ssr: false` ─────────────────────────────────
//  O conteúdo essencial desta rota — os dossiers curados, com problema,
//  cliente, modelo de receita, requisitos e teste de falsificação — é
//  renderizado no SERVIDOR, em `ExplorarMercado`. Está no HTML para quem
//  navega sem JavaScript, para um motor de busca e para o programa de
//  autoridade.
//
//  O que vive aqui é a parte que, por natureza, não pode ser
//  pré-renderizada: um motor que compõe hipóteses a partir de um contexto
//  que só existe no browser de quem responde. Não há HTML possível para
//  isso — e fingir que há seria devolver a mesma lista a toda a gente,
//  que é o defeito que este trabalho veio corrigir.
//
//  O `ErrorBoundary` fica: uma falha na hidratação não pode deixar a
//  página em branco.
// ═══════════════════════════════════════════════════════════════════════

import ErrorBoundary from "@/components/ui/ErrorBoundary";
import DescobrirNegocioApp from "@/components/negocio/descoberta/DescobrirNegocioApp";

export default function DescobrirNegocioLazy() {
  return (
    <ErrorBoundary etiqueta="o motor de oportunidades">
      <DescobrirNegocioApp />
    </ErrorBoundary>
  );
}
