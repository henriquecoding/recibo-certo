// ═══════════════════════════════════════════════════════════════════════
//  A verificação, do lado de quem a pede
//  ---------------------------------------------------------------------
//  Duas funções, e uma fronteira: o contabilista PEDE, e não confirma. A
//  base de dados impõe o mesmo por trigger — este módulo só existe para
//  a interface não ter de saber os nomes das colunas.
//
//  Em demonstração não há pedido nenhum a fazer: a loja de demonstração
//  não tem administração do outro lado, e fingir que o pedido seguiu era
//  ensinar um fluxo que não existe.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";
import { emDemonstracao } from "./nucleo";
import type { Contabilista } from "../tipos";
import {
  REGISTO_VAZIO, type MetodoVerificacao, type RegistoVerificacao,
} from "../verificacao/motor";

/**
 * O registo de verificação a partir de uma ficha já lida.
 *
 * Não faz pedido nenhum: a ficha do painel já traz as colunas. Ter isto
 * como função — em vez de montar o objecto em cada ecrã — é o que garante
 * que o editor e a consola de administração leem os mesmos campos.
 */
export function registoDeVerificacao(
  ficha: Pick<Contabilista, "occMetodo" | "occVerificadoEm" | "occValidoAte" | "occ"> &
    Partial<{ occNumeroConfirmado: string | null; occPedidoEm: string | null;
              occRecusaMotivo: string | null; occRecusadoEm: string | null }>
): RegistoVerificacao {
  return {
    ...REGISTO_VAZIO,
    metodo: (ficha.occMetodo as MetodoVerificacao | null) ?? null,
    confirmadoEm: ficha.occVerificadoEm ?? null,
    validoAte: ficha.occValidoAte ?? null,
    numeroConfirmado: ficha.occNumeroConfirmado ?? null,
    pedidoEm: ficha.occPedidoEm ?? null,
    recusaMotivo: ficha.occRecusaMotivo ?? null,
    recusadoEm: ficha.occRecusadoEm ?? null,
  };
}

/**
 * Marca que a pessoa pediu verificação.
 *
 * `occ_pedido_em` é a ÚNICA coluna de verificação que o próprio pode
 * escrever, e é deliberado: pedir não é confirmar. Todas as outras estão
 * trancadas pelo trigger `contabilistas_tranca_occ`.
 */
export async function pedirVerificacaoOcc(userId: string): Promise<{ erro?: string }> {
  if (emDemonstracao()) {
    return { erro: "Na demonstração não há administração do outro lado para confirmar." };
  }

  const { error } = await getSupabase()
    .from("contabilistas")
    .update({ occ_pedido_em: new Date().toISOString() })
    .eq("user_id", userId);

  return error ? { erro: error.message } : {};
}
