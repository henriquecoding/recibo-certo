// ─────────────────────────────────────────────────────────────────────
//  O CARREGADOR DO ÍNDICE — a fronteira entre o cabeçalho e o catálogo
// ─────────────────────────────────────────────────────────────────────

import { CAMINHO_INDICE, type DocumentoBusca, type IndiceBusca } from "./esquema";

/**
 * Uma só promessa, partilhada por toda a aplicação.
 *
 * As duas superfícies (painel de secretária e folha do telemóvel) montam e
 * desmontam com liberdade, e o `preload` do lançador dispara em `hover`, em
 * `focus` e em `touchstart`. Sem esta promessa em módulo, uma pessoa
 * indecisa a passar o rato pela barra pedia o índice cinco vezes.
 *
 * Guardar a PROMESSA e não o resultado é o que resolve a corrida: dois
 * pedidos simultâneos partilham o mesmo voo em vez de dispararem dois.
 */
let pendente: Promise<DocumentoBusca[]> | undefined;

export function carregarIndice(): Promise<DocumentoBusca[]> {
  pendente ??= fetch(CAMINHO_INDICE, { cache: "force-cache" })
    .then((resposta) => {
      if (!resposta.ok) throw new Error(`indice-busca:${resposta.status}`);
      return resposta.json() as Promise<IndiceBusca>;
    })
    .then((dados) => {
      if (!Array.isArray(dados?.documentos)) throw new Error("indice-busca:forma-invalida");
      return dados.documentos;
    })
    .catch((erro) => {
      // Uma falha não pode ficar em cache: o utilizador que tenta outra vez
      // (rede que voltou, extensão desligada) merece um pedido novo, e não a
      // repetição eterna do primeiro erro.
      pendente = undefined;
      throw erro;
    });

  return pendente;
}

/**
 * Pedir por INTENÇÃO, sem bloquear e sem falhar em voz alta.
 *
 * Chamado em `pointerenter`, `focus` e `touchstart` do lançador. Se falhar,
 * o silêncio é a resposta certa: ninguém pediu nada ainda, e o erro real
 * aparecerá — com fallback navegável — quando a pesquisa abrir a sério.
 */
export function prepararIndice(): void {
  void carregarIndice().catch(() => {});
}

/** Só para testes: esquece o que está em cache. */
export function esquecerIndice(): void {
  pendente = undefined;
}
