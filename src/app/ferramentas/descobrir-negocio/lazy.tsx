"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ── PORQUE ISTO NÃO É `ssr: false` ─────────────────────────────────
//  Era, e custava à página todo o conteúdo dela.
//
//  A regra do CLAUDE.md aplica-se a secções PESADAS — mapas, gráficos —
//  que ninguém precisa de ler sem JavaScript. Aqui o componente É a
//  página: os cinco dossiers, o cliente, o problema, o modelo de receita,
//  os requisitos e o teste que pode matar a ideia. Com `ssr: false` o
//  HTML servido não continha uma única palavra disso — nem para quem
//  navega sem JavaScript, nem para um motor de busca, nem para o programa
//  de autoridade que exige conteúdo essencial renderizado no servidor.
//
//  O componente é seguro no servidor por construção: tudo o que depende
//  do browser — cofre local, consulta ao pack de mercado, `crypto` —
//  acontece em efeitos ou em handlers. O instante de referência começa
//  vazio e só é fixado depois da montagem, para o servidor e o cliente
//  não discordarem sobre que horas são.
//
//  O `ErrorBoundary` fica: uma falha na hidratação não pode deixar a
//  página em branco.
// ═══════════════════════════════════════════════════════════════════════

import ErrorBoundary from "@/components/ui/ErrorBoundary";
import DescobrirNegocioStudio from "@/components/negocio/DescobrirNegocioStudio";

export default function DescobrirNegocioLazy() {
  return (
    <ErrorBoundary etiqueta="o motor de oportunidades">
      <DescobrirNegocioStudio />
    </ErrorBoundary>
  );
}
