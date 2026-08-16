/**
 * Acesso a dados da Fidelidade V2.
 *
 * A regra publicada é IMUTÁVEL — há trigger que o impõe. Alterar a
 * configuração não é um `UPDATE`: é publicar uma versão nova, e é por isso
 * que a única escrita aqui é `publicarRegra`, que chama a RPC.
 *
 * A razão é a promessa: um cliente que começou um cartão de 20% não pode
 * ver a promessa cair para 10% na última consulta. A regra fica ligada ao
 * cartão que nasceu com ela, e o cartão em curso não muda.
 */

import { getSupabase } from "@/lib/supabase/client";
import type { RegraFidelidade } from "./estados";

type Linha = Record<string, unknown>;

export interface RegraLida extends RegraFidelidade {
  validadeDias: number;
  publicadaEm: string;
  substituidaEm: string | null;
}

const CAMPOS =
  "id, versao, meta, desconto_pct, exige_pagamento, validade_dias, ativa, publicada_em, substituida_em";

function paraRegra(l: Linha): RegraLida {
  return {
    id: l.id as string,
    versao: (l.versao as number) ?? 1,
    meta: (l.meta as number) ?? 5,
    descontoPct: (l.desconto_pct as number) ?? 10,
    exigePagamento: Boolean(l.exige_pagamento),
    ativa: Boolean(l.ativa),
    validadeDias: (l.validade_dias as number) ?? 365,
    publicadaEm: (l.publicada_em as string) ?? "",
    substituidaEm: (l.substituida_em as string | null) ?? null,
  };
}

/** A regra em vigor: a que ainda não foi substituída. */
export async function regraCorrente(contabilistaId: string): Promise<RegraLida | null> {
  const { data } = await getSupabase()
    .from("fidelidade_regras")
    .select(CAMPOS)
    .eq("contabilista_id", contabilistaId)
    .is("substituida_em", null)
    .maybeSingle();
  return data ? paraRegra(data as unknown as Linha) : null;
}

/** O histórico completo, da mais recente para a mais antiga. */
export async function historicoDeRegras(contabilistaId: string): Promise<RegraLida[]> {
  const { data } = await getSupabase()
    .from("fidelidade_regras")
    .select(CAMPOS)
    .eq("contabilista_id", contabilistaId)
    .order("versao", { ascending: false })
    .limit(50);
  return (data ?? []).map((l) => paraRegra(l as unknown as Linha));
}

export interface ImpactoDaRegra {
  cartoesEmCurso: number;
  beneficiosPendentes: number;
  clientesSemCiclo: number;
}

/**
 * Quantos clientes é que uma regra nova NÃO afeta.
 *
 * É a pergunta que a interface tem de responder antes de deixar publicar:
 * quem tem cartão a meio mantém a promessa antiga, e quem tem benefício por
 * usar também. Só quem não tem ciclo entra na regra nova à próxima consulta.
 */
export async function impactoDaRegraNova(): Promise<ImpactoDaRegra> {
  const { data } = await getSupabase().rpc("impacto_nova_regra_fidelidade");
  const r = (data ?? {}) as Linha;
  return {
    cartoesEmCurso: (r.cartoes_em_curso as number) ?? 0,
    beneficiosPendentes: (r.beneficios_pendentes as number) ?? 0,
    clientesSemCiclo: (r.clientes_sem_ciclo as number) ?? 0,
  };
}

export interface ResultadoPublicacao {
  ok: boolean;
  /** True quando nada mudou: republicar o mesmo não cria versão nova. */
  inalterada?: boolean;
  versao?: number;
  regraId?: string;
  motivo?: string;
}

export async function publicarRegra(p: {
  meta: number;
  descontoPct: number;
  ativa: boolean;
  exigePagamento: boolean;
}): Promise<ResultadoPublicacao> {
  const { data, error } = await getSupabase().rpc("publicar_regra_fidelidade", {
    p_meta: p.meta,
    p_desconto_pct: p.descontoPct,
    p_ativa: p.ativa,
    p_exige_pagamento: p.exigePagamento,
  });
  if (error) return { ok: false, motivo: error.message };
  const r = (data ?? {}) as Linha;
  if (r.ok !== true) return { ok: false, motivo: (r.motivo as string) ?? "falhou" };
  return {
    ok: true,
    inalterada: Boolean(r.inalterada),
    versao: r.versao as number,
    regraId: r.regra_id as string,
  };
}
