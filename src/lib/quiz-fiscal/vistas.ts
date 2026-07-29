// ═══════════════════════════════════════════════════════════════════════
//  PERGUNTAS JÁ VISTAS — anti-repetição entre sessões
//  ---------------------------------------------------------------------
//  `SelecaoPerguntasOpcoes.excluirIds` existia desde sempre e `construirSessao`
//  nunca o passava. Numa categoria de 100 perguntas, com sessões de 10, a
//  repetição chega à terceira ou quarta sessão — e a auditoria aponta-a como
//  provável causa número um de abandono.
//
//  O histórico já estava gravado (`quiz_sessoes` no Supabase e em
//  localStorage), mas não era usado para nada. Este módulo dá-lhe uso, com
//  uma janela deslizante: guardam-se os IDs recentes e deixam de ser
//  excluídos ao fim de um número de sessões, para o banco não se esgotar e
//  para a revisão espaçada continuar possível.
// ═══════════════════════════════════════════════════════════════════════

const CHAVE = "quiz-fiscal-vistas-v1";

/**
 * Quantas perguntas se mantêm na janela de exclusão. Cobre ~30 sessões de 10
 * antes de a mais antiga voltar a poder sair — o suficiente para a repetição
 * deixar de ser notada, sem bloquear categorias pequenas (a seleção cede a
 * exclusão antes de ceder a categoria; ver `selecionarComDiagnostico`).
 */
export const JANELA_VISTAS = 300;

function disponivel(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** IDs das perguntas vistas recentemente, da mais antiga para a mais recente. */
export function lerVistas(): string[] {
  if (!disponivel()) return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const lista: unknown = JSON.parse(bruto);
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Regista as perguntas de uma sessão como vistas, mantendo só as
 * `JANELA_VISTAS` mais recentes.
 */
export function registarVistas(ids: string[]): void {
  if (!disponivel() || ids.length === 0) return;
  try {
    const anteriores = lerVistas().filter((id) => !ids.includes(id));
    const atualizadas = [...anteriores, ...ids].slice(-JANELA_VISTAS);
    window.localStorage.setItem(CHAVE, JSON.stringify(atualizadas));
  } catch {
    /* localStorage cheio ou indisponível — a anti-repetição é um luxo, não
       pode partir o jogo. */
  }
}

/** Esquece o histórico de perguntas vistas (usado pelo botão de reposição). */
export function limparVistas(): void {
  if (!disponivel()) return;
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* ignore */
  }
}
