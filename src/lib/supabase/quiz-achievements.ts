import { getSupabase, supabaseConfigurado } from "./client";

export type CaminhoCupao = "medio" | "dificil";
export type EstadoCupao = "disponivel" | "ativado" | "expirado";

const META_DESAFIO: Record<CaminhoCupao, { meta: number }> = {
  medio: { meta: 5 },
  dificil: { meta: 3 },
};

export interface ProgressoDesafio {
  caminho: CaminhoCupao;
  sequenciaAtual: number;
  sequenciaMeta: number;
}

export interface CupaoQuiz {
  id: string;
  codigo: string;
  caminho: CaminhoCupao;
  meses: number;
  estado: EstadoCupao;
  criadoEm: string;
  ativadoEm: string | null;
  expiraEm: string;
}

function gerarCodigoCupao(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "RC-PRO-";
  for (let i = 0; i < 8; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return codigo;
}

export async function obterProgressoDesafio(userId: string): Promise<ProgressoDesafio[]> {
  if (!supabaseConfigurado()) return [];
  const { data } = await getSupabase()
    .from("quiz_achievement_progress")
    .select("*")
    .eq("user_id", userId);

  if (!data || data.length === 0) {
    return [
      { caminho: "medio", sequenciaAtual: 0, sequenciaMeta: META_DESAFIO.medio.meta },
      { caminho: "dificil", sequenciaAtual: 0, sequenciaMeta: META_DESAFIO.dificil.meta },
    ];
  }

  const resultado: ProgressoDesafio[] = [];
  for (const caminho of ["medio", "dificil"] as CaminhoCupao[]) {
    const row = data.find((d) => d.caminho === caminho);
    resultado.push({
      caminho,
      sequenciaAtual: row?.sequencia_atual ?? 0,
      sequenciaMeta: META_DESAFIO[caminho].meta,
    });
  }
  return resultado;
}

/**
 * Regista uma sessão de desafio.
 *
 * Passa pelo servidor (`/api/quiz/sessao`), que RECALCULA os acertos a partir
 * do banco de perguntas antes de mexer no progresso ou emitir um cupão. A
 * versão anterior era chamada do cliente com valores do cliente — bastava
 * enviar `acertos: 10` — e escrevia diretamente nas tabelas, que estavam
 * abertas a `authenticated`.
 *
 * O cliente envia o que ESCOLHEU; a resposta certa é do servidor.
 */
export async function registarSessaoDesafio(
  respostas: { perguntaId: string; opcaoSelecionada: number | null }[],
  dificuldade: number,
  sessaoId?: string | null,
): Promise<{ cupaoGerado?: CupaoQuiz; erro?: string }> {
  if (!supabaseConfigurado()) return {};
  if (respostas.length === 0) return {};

  const { data: sessao } = await getSupabase().auth.getSession();
  const token = sessao.session?.access_token;
  if (!token) return { erro: "Sessão expirada." };

  try {
    const r = await fetch("/api/quiz/sessao", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      // `sessaoId` é o bilhete emitido por `/api/quiz/sessao/abrir`. Sem ele,
      // uma dificuldade de desafio é recusada — é o que impede submeter a
      // mesma sessão vencedora repetidamente.
      body: JSON.stringify({ dificuldade, respostas, ...(sessaoId ? { sessaoId } : {}) }),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) return { erro: corpo?.erro ?? "Não foi possível registar a sessão." };
    return { cupaoGerado: corpo?.cupaoGerado ?? undefined };
  } catch {
    return { erro: "Sem ligação ao servidor." };
  }
}

/**
 * Pede ao servidor o bilhete de uma sessão de desafio.
 *
 * Devolve as dez perguntas que o SERVIDOR sorteou — é com essas que se joga.
 * Sem sessão autenticada ou sem Supabase configurado devolve `null`, e o
 * quiz segue em modo livre: joga-se igual, não conta para o prémio.
 */
export async function abrirSessaoDesafio(
  dificuldade: number,
): Promise<{ sessaoId: string; perguntaIds: string[] } | null> {
  if (!supabaseConfigurado()) return null;

  const { data: sessao } = await getSupabase().auth.getSession();
  const token = sessao.session?.access_token;
  if (!token) return null;

  try {
    const r = await fetch("/api/quiz/sessao/abrir", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ dificuldade }),
    });
    if (!r.ok) return null;
    const corpo = await r.json().catch(() => null);
    if (!corpo?.sessaoId || !Array.isArray(corpo.perguntaIds)) return null;
    return { sessaoId: corpo.sessaoId as string, perguntaIds: corpo.perguntaIds as string[] };
  } catch {
    return null;
  }
}

export async function obterCupoesUtilizador(userId: string): Promise<CupaoQuiz[]> {
  if (!supabaseConfigurado()) return [];
  const { data } = await getSupabase()
    .from("quiz_cupoes")
    .select("*")
    .eq("user_id", userId)
    .order("criado_em", { ascending: false });

  return (data ?? []).map((c) => ({
    id: c.id,
    codigo: c.codigo,
    caminho: c.caminho,
    meses: c.meses,
    estado: c.estado,
    criadoEm: c.criado_em,
    ativadoEm: c.ativado_em,
    expiraEm: c.expira_em,
  }));
}

/**
 * Ativa um cupão e entrega efetivamente os meses de Pro.
 *
 * A versão anterior marcava o cupão como «ativado», tentava escrever em
 * `subscriptions` — escrita que a RLS rejeita — e devolvia `{}` sem sequer
 * ler o erro: o utilizador via sucesso, perdia o cupão e não recebia nada.
 * Agora as duas escritas são do servidor, pela ordem certa, e o erro é
 * devolvido em vez de engolido.
 */
export async function ativarCupao(cupaoId: string): Promise<{ erro?: string }> {
  if (!supabaseConfigurado()) return { erro: "Serviço indisponível." };

  const { data: sessao } = await getSupabase().auth.getSession();
  const token = sessao.session?.access_token;
  if (!token) return { erro: "Sessão expirada. Inicia sessão outra vez." };

  try {
    const r = await fetch("/api/quiz/cupao", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ cupaoId }),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) return { erro: corpo?.erro ?? "Não foi possível ativar o cupão." };
    return {};
  } catch {
    return { erro: "Sem ligação ao servidor." };
  }
}
