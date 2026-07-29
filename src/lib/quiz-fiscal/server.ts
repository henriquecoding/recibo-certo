// ═══════════════════════════════════════════════════════════════════════
//  LADO SERVIDOR DO QUIZ — verificação e emissão de prémios
//  ---------------------------------------------------------------------
//  A auditoria encontrou o sistema de cupões partido nas duas pontas:
//
//   · Quem ganhava legitimamente 3 meses de Pro NÃO os recebia. O `upsert`
//     em `subscriptions` era rejeitado pela RLS (a tabela só tem policies de
//     leitura para o utilizador) e o erro nunca era lido — o cupão ficava
//     marcado como «ativado» e o utilizador via uma mensagem de sucesso.
//
//   · E, ao mesmo tempo, qualquer utilizador autenticado podia inserir
//     cupões próprios pela consola do browser, porque a policy era
//     `WITH CHECK (auth.uid() = user_id)` e mais nada. O mesmo para o
//     progresso, onde dava para pôr a sequência no valor que se entendesse.
//
//  A correção óbvia de um transforma o outro em Pro grátis para toda a
//  gente. Por isso a decisão é a que o relatório recomenda: a verificação
//  passa para o servidor, com `service_role`, e o cliente deixa de poder
//  escrever nestas tabelas.
//
//  A regra de ouro aqui é: **o cliente não é fonte de verdade**. O servidor
//  recebe os IDs das perguntas e as opções escolhidas, e recalcula os
//  acertos a partir do banco — que só ele conhece.
// ═══════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { carregarBancoQuiz } from "./index";
import type { CaminhoCupao } from "@/lib/supabase/quiz-achievements";

/** Metas de cada caminho de desafio. Espelha `META_DESAFIO` do cliente. */
export const META_DESAFIO_SERVIDOR: Record<CaminhoCupao, { meta: number; meses: number }> = {
  medio: { meta: 5, meses: 3 },
  dificil: { meta: 3, meses: 3 },
};

/** Perguntas por sessão exigidas para uma sessão contar para o desafio. */
export const PERGUNTAS_SESSAO_DESAFIO = 10;

/** Validade do cupão, em dias. */
export const VALIDADE_CUPAO_DIAS = 90;

export interface RespostaSubmetida {
  perguntaId: string;
  /** Índice escolhido no banco ORIGINAL (não na ordem embaralhada). */
  opcaoSelecionada: number | null;
}

export interface SessaoSubmetida {
  dificuldade: number;
  respostas: RespostaSubmetida[];
}

export interface ResultadoVerificado {
  totalPerguntas: number;
  acertos: number;
  perfeito: boolean;
  caminho: CaminhoCupao | null;
  /** IDs que não existem no banco — sinal de submissão forjada. */
  desconhecidos: string[];
}

/** Cliente com `service_role`. Só existe no servidor; nunca no bundle. */
export function supabaseServico(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Valida o access token do Supabase e devolve o `user.id`.
 *
 * Usa a chave anónima de propósito: quem valida o token é o Supabase, e a
 * `service_role` nunca deve ser usada para autenticar — só para escrever
 * depois de a identidade estar confirmada.
 */
export async function utilizadorDoPedido(req: Request): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const cabecalho = req.headers.get("authorization") ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";
  if (!token) return null;

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Recalcula os acertos a partir do banco. O cliente envia o que escolheu; a
 * resposta certa vem daqui — nunca de lá.
 */
export async function verificarSessao(sessao: SessaoSubmetida): Promise<ResultadoVerificado> {
  const banco = await carregarBancoQuiz();
  const porId = new Map(banco.map((p) => [p.id, p]));

  let acertos = 0;
  const desconhecidos: string[] = [];
  // Uma pergunta submetida duas vezes não conta duas vezes.
  const contadas = new Set<string>();

  for (const r of sessao.respostas) {
    if (contadas.has(r.perguntaId)) continue;
    const pergunta = porId.get(r.perguntaId);
    if (!pergunta) {
      desconhecidos.push(r.perguntaId);
      continue;
    }
    contadas.add(r.perguntaId);
    if (r.opcaoSelecionada !== null && r.opcaoSelecionada === pergunta.correta) acertos += 1;
  }

  const totalPerguntas = contadas.size;
  const caminho: CaminhoCupao | null =
    sessao.dificuldade === 2 ? "medio" : sessao.dificuldade === 3 ? "dificil" : null;

  return {
    totalPerguntas,
    acertos,
    // Só conta como sessão perfeita se todas as perguntas existirem, forem
    // exatamente as da sessão-padrão e todas estiverem certas.
    perfeito:
      desconhecidos.length === 0 &&
      totalPerguntas === PERGUNTAS_SESSAO_DESAFIO &&
      acertos === totalPerguntas,
    caminho,
    desconhecidos,
  };
}

/** Código legível, sem caracteres ambíguos. */
export function gerarCodigoCupaoServidor(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `QZ-${s.slice(0, 5)}-${s.slice(5)}`;
}
