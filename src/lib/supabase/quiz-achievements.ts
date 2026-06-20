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

export async function registarSessaoDesafio(
  userId: string,
  dificuldade: number,
  totalPerguntas: number,
  acertos: number,
): Promise<{ cupaoGerado?: CupaoQuiz }> {
  if (!supabaseConfigurado()) return {};

  const perfeito = acertos === totalPerguntas && totalPerguntas === 10;
  const caminho: CaminhoCupao | null =
    dificuldade === 2 ? "medio" : dificuldade === 3 ? "dificil" : null;

  if (!caminho) return {};

  const sb = getSupabase();
  const outrosCaminhos: CaminhoCupao[] = caminho === "medio" ? ["dificil"] : ["medio"];

  if (perfeito) {
    const { data: row } = await sb
      .from("quiz_achievement_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("caminho", caminho)
      .maybeSingle();

    const novaSeq = (row?.sequencia_atual ?? 0) + 1;
    const meta = META_DESAFIO[caminho].meta;

    await sb.from("quiz_achievement_progress").upsert(
      {
        user_id: userId,
        caminho,
        sequencia_atual: novaSeq,
        sequencia_meta: meta,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "user_id,caminho" },
    );

    if (novaSeq >= meta) {
      const codigo = gerarCodigoCupao();
      const { data: cupao } = await sb
        .from("quiz_cupoes")
        .insert({
          user_id: userId,
          codigo,
          caminho,
          meses: 3,
          estado: "disponivel",
          expira_em: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      await sb.from("quiz_achievement_progress").update({
        sequencia_atual: 0,
        atualizado_em: new Date().toISOString(),
      }).eq("user_id", userId).eq("caminho", caminho);

      if (cupao) {
        return {
          cupaoGerado: {
            id: cupao.id,
            codigo: cupao.codigo,
            caminho: cupao.caminho,
            meses: cupao.meses,
            estado: cupao.estado,
            criadoEm: cupao.criado_em,
            ativadoEm: cupao.ativado_em,
            expiraEm: cupao.expira_em,
          },
        };
      }
    }
  } else {
    await sb.from("quiz_achievement_progress").upsert(
      {
        user_id: userId,
        caminho,
        sequencia_atual: 0,
        sequencia_meta: META_DESAFIO[caminho].meta,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "user_id,caminho" },
    );
  }

  for (const outro of outrosCaminhos) {
    await sb.from("quiz_achievement_progress").upsert(
      {
        user_id: userId,
        caminho: outro,
        sequencia_atual: 0,
        sequencia_meta: META_DESAFIO[outro].meta,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "user_id,caminho" },
    );
  }

  return {};
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

export async function ativarCupao(cupaoId: string, userId: string): Promise<{ erro?: string }> {
  if (!supabaseConfigurado()) return { erro: "Serviço indisponível." };
  const { error } = await getSupabase()
    .from("quiz_cupoes")
    .update({
      estado: "ativado",
      ativado_em: new Date().toISOString(),
    })
    .eq("id", cupaoId)
    .eq("user_id", userId)
    .eq("estado", "disponivel");

  return error ? { erro: error.message } : {};
}
