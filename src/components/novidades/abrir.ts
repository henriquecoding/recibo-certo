// Abrir «Novidades & Atualizações» a partir de qualquer sítio, sem arrastar o
// componente do painel — o mesmo padrão do `feedback/abrir.ts`.
//
// ⚠️ REGRA 10 (CLAUDE.md) — O PAINEL É PEDIDO, NUNCA APARECE SOZINHO.
// Este módulo é a ÚNICA porta de entrada, e nada aqui dispara o evento por
// iniciativa própria: `abrirNovidades()` só corre dentro do gesto de quem
// carrega no botão. Não há efeito, temporizador nem leitura de versão que
// consiga abrir o painel — o que fecha a porta ao popup automático por
// construção, e não por disciplina.

import { APP_VERSION, VERSAO_STORAGE_KEY } from "@/lib/version";

/** Pedido de abertura. Só um gesto o dispara. */
export const EVENTO_ABRIR_NOVIDADES = "recibocerto:novidades:abrir";

/**
 * A versão passou a estar vista. Serve para o ponto do botão se apagar em
 * TODAS as instâncias no mesmo instante — o cabeçalho de secretária, a folha
 * do telemóvel e o painel podem estar montados ao mesmo tempo, e um ponto que
 * só se apaga depois de um refresh é um ponto que mente.
 */
export const EVENTO_NOVIDADES_VISTAS = "recibocerto:novidades:vistas";

export function abrirNovidades(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_ABRIR_NOVIDADES));
}

/**
 * Há uma versão que esta pessoa ainda não viu?
 *
 * É a MESMA comparação que antes decidia se o popup aparecia. Mudou o que ela
 * comanda: já não abre nada — acende um ponto de 8 px num botão. O sinal
 * mantém-se; a interrupção desapareceu.
 *
 * Sem `localStorage` (modo privado, armazenamento bloqueado) devolve `false`:
 * na dúvida, não se acende um aviso que a pessoa não consegue apagar.
 */
export function haNovidadesPorVer(): boolean {
  try {
    return localStorage.getItem(VERSAO_STORAGE_KEY) !== APP_VERSION;
  } catch {
    return false;
  }
}

/**
 * ⚠️ REGRA 10, segunda metade: a versão é marcada como vista NO INSTANTE em
 * que o painel é mostrado — não só ao fechar. Atualizar a página com ele
 * aberto não pode voltar a acender o ponto.
 */
export function marcarNovidadesVistas(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VERSAO_STORAGE_KEY, APP_VERSION);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENTO_NOVIDADES_VISTAS));
}
