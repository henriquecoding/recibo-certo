"use client";

// ─────────────────────────────────────────────────────────────────────
//  A PONTA DE CHEGADA DO CONTEXTO — uma vez, e só uma vez
//  ---------------------------------------------------------------------
//  O módulo `lib/busca/handoff.ts` é puro de propósito (é testável sem
//  browser e é o mesmo código que a pesquisa usa para escrever). Isto é a
//  ponte para React: lê o `?ctx=` do endereço, consome o contexto e
//  devolve-o UMA vez.
//
//  Do `window` e não de `useSearchParams`, pelo mesmo motivo da página de
//  upgrade e do hub: as rotas das ferramentas continuam estáticas, e um
//  `useSearchParams` obrigaria a fronteira de Suspense em todas elas.
// ─────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { PARAM_HANDOFF, consumirHandoff, type CamposHandoff } from "@/lib/busca/handoff";
import type { TipoEntidade } from "@/lib/busca/esquema";

/**
 * O contexto que a pesquisa preparou para ESTA página, ou `null`.
 *
 * `null` é o estado normal: quem chega pelo menu, por um link ou pelo
 * Google não traz contexto nenhum, e a ferramenta abre como sempre abriu.
 *
 * O consumo acontece num efeito — nunca no render. Consumir apaga, e uma
 * escrita durante o render corre em passagens que o React pode deitar
 * fora (StrictMode, transições): o contexto desaparecia sem chegar a ser
 * usado, num defeito que só aparece em produção e só às vezes.
 */
export function useHandoffDaBusca(
  destino: string,
  aceites: readonly TipoEntidade[],
): CamposHandoff | null {
  const [campos, setCampos] = useState<CamposHandoff | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get(PARAM_HANDOFF);
    if (!id) return;
    const lidos = consumirHandoff(destino, id, aceites);
    if (lidos) setCampos(lidos);
    // `destino` e `aceites` são constantes de módulo em quem usa isto; o
    // efeito corre na montagem e mais nenhuma vez, que é o contrato.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return campos;
}
