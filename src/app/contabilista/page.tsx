"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «Meu espaço» — o painel deixa de ser uma página fixa
//  ---------------------------------------------------------------------
//  Esta rota era o «Hoje»: uma composição fixa com a próxima consulta, os
//  pedidos por responder e as partilhas por ler. Passa a ser uma WORKSPACE
//  — vistas e módulos que o contabilista compõe (§4.1 do Relatório Mestre).
//
//  Nada do que o «Hoje» mostrava desapareceu: a agenda do dia, o que
//  precisa de atenção e as partilhas são agora módulos, e estão os três na
//  vista «Meu dia» que abre por omissão. O que muda é que deixam de ser
//  uma escolha nossa imposta a todos.
//
//  ⚠️ O que esta superfície NUNCA faz, e é a fronteira que a governa: não
//  lê as tabelas fiscais do cliente. «Simulações recebidas» vem de
//  `partilhas` — snapshots que o cliente enviou de propósito, com
//  consentimento registado. Nenhum módulo é um simulador embutido (§1.2,
//  §2.2, §7.5). O cliente continua a simular no Recibo Certo; o
//  contabilista recebe o que ele decidiu partilhar.
// ═══════════════════════════════════════════════════════════════════════

import { usarFicha } from "@/components/contabilistas/usarFicha";
import { usarPainel } from "@/components/contabilistas/usarPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import Workspace from "@/components/contabilistas/dashboard/Workspace";

export default function MeuEspacoPage() {
  const { ficha, userId, aCarregar } = usarFicha();
  const painel = usarPainel();

  if (aCarregar || !ficha) return <EsqueletoPainel forma="duasColunas" />;

  // Na demonstração a loja vive em memória e ignora o id de quem pergunta;
  // no painel real é a RLS que decide. Passar o id do próprio nos dois
  // casos mantém uma só assinatura.
  const quem = userId ?? ficha.userId;

  return (
    // A grelha é a superfície inteira do painel. Um erro num módulo não
    // pode deixar a página em branco — a fronteira fica aqui, e cada
    // módulo tem ainda o seu próprio estado de erro dentro do frame.
    <ErrorBoundary>
      <Workspace
        contabilistaId={quem}
        href={painel.href}
        demonstracao={painel.demonstracao}
      />
    </ErrorBoundary>
  );
}
