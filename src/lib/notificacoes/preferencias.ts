// ═══════════════════════════════════════════════════════════════════════
//  O INTERRUPTOR DOS AVISOS POR EMAIL
//  ---------------------------------------------------------------------
//  Cada email que este produto manda leva, no rodapé, «Gerir ou desligar os
//  avisos» a apontar para `/dashboard/conta`, e leva o mesmo endereço no
//  cabeçalho `List-Unsubscribe` — o que o Gmail e o Yahoo mostram como
//  «cancelar subscrição». A página nunca teve nada que desligasse nada.
//
//  Quem quer menos email e não encontra o botão tem uma alavanca só: o
//  «isto é spam». E essa não afeta só quem carregou nela — faz a caixa de
//  entrada aprender, e o aviso que interessa mesmo (o do limite do IVA)
//  deixa de chegar a toda a gente.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE SE DESLIGA É O EMAIL. O SINO NÃO.                              │
//  │                                                                     │
//  │ O sino é onde se VAI VER se aconteceu alguma coisa; desligá-lo era   │
//  │ desligar a funcionalidade, não a interrupção. O que entra no dia de  │
//  │ alguém sem ser convidado é o email — é esse que tem o interruptor.   │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Quem MANDA continua a decidir em SQL: o gatilho `aviso_marca_email`
//  pergunta a `avisos_por_email_ativos()`, e `avisos_email_reclamar` volta
//  a perguntar à saída da fila — para desligar valer também para o que já
//  estava em fila. Isto aqui é só a porta do browser.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";

/** Sem linha guardada, os avisos saem por email. */
export const EMAIL_ATIVO_POR_OMISSAO = true;

export interface PreferenciaAvisos {
  emailAtivo: boolean;
  /** Quando foi decidido. `null` enquanto ninguém decidiu nada. */
  atualizadoEm: string | null;
}

export async function lerPreferenciaAvisos(): Promise<PreferenciaAvisos> {
  const { data, error } = await getSupabase()
    .from("preferencias_avisos")
    .select("email_ativo, atualizado_em")
    .maybeSingle();

  // Um erro não pode ler-se como «desligado»: mostrar o interruptor na
  // posição errada faz alguém carregar nele a pensar que está a desligar
  // e a ligar. Quem chama trata o erro; aqui devolve-se o estado real do
  // sistema, que é «não sei, e por omissão manda-se».
  if (error) throw new Error(error.message);
  if (!data) return { emailAtivo: EMAIL_ATIVO_POR_OMISSAO, atualizadoEm: null };

  const linha = data as { email_ativo: boolean; atualizado_em: string | null };
  return { emailAtivo: linha.email_ativo, atualizadoEm: linha.atualizado_em ?? null };
}

/**
 * Guarda a escolha. `upsert` porque a primeira vez cria a linha.
 *
 * `atualizado_em` não vai daqui — é um gatilho que o carimba. O `GRANT`
 * por coluna da migração recusaria a escrita de qualquer maneira, e é essa
 * a ordem certa: o privilégio primeiro, a boa educação depois.
 */
export async function definirPreferenciaAvisos(emailAtivo: boolean): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("Sessão expirada.");

  const { error } = await sb
    .from("preferencias_avisos")
    .upsert({ user_id: userId, email_ativo: emailAtivo }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
}
