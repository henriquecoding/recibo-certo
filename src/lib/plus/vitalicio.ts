// ═══════════════════════════════════════════════════════════════════════
//  LUGARES VITALÍCIOS — mil, e o milésimo primeiro não entra
//  ---------------------------------------------------------------------
//  O limite NÃO vive aqui. Vive no gatilho `vitalicio_respeita_limite`, que
//  corre dentro da transação da escrita e serializa concorrentes com um
//  lock. É lá que é garantido; aqui é onde é EXPLICADO.
//
//  A diferença importa: um contador lido antes de escrever responde sempre
//  sobre um passado que já mudou. Se duas pessoas comprarem o lugar 1000 ao
//  mesmo tempo, as duas leem «999 ocupados» e as duas passam — a menos que
//  alguém serialize, e quem serializa é a base de dados.
//
//  Este módulo serve para: mostrar quantos faltam, e recusar cedo (com uma
//  mensagem decente) em vez de deixar alguém pagar por um lugar que já não
//  existe.
// ═══════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface LugaresVitalicios {
  total: number;
  ocupados: number;
  restantes: number;
  esgotado: boolean;
}

/**
 * O que se mostra quando não se consegue falar com a base de dados.
 *
 * `esgotado: false` de propósito — bloquear a compra por causa de uma falha
 * nossa de leitura seria recusar dinheiro por um problema que não é do
 * cliente. O gatilho continua a impedir o lugar 1001 de qualquer forma, por
 * isso o pior caso é uma compra recusada no fim, não um lugar a mais.
 */
export const LUGARES_DESCONHECIDOS: LugaresVitalicios = {
  total: 1000,
  ocupados: 0,
  restantes: 1000,
  esgotado: false,
};

function clienteServidor(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // A contagem não expõe identidades — a chave anónima chega, e assim esta
  // leitura não precisa da service_role para nada.
  const chave =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizar(linha: Partial<LugaresVitalicios> | undefined): LugaresVitalicios {
  const total = Number(linha?.total ?? LUGARES_DESCONHECIDOS.total);
  const ocupados = Number(linha?.ocupados ?? 0);
  const restantes = Math.max(total - ocupados, 0);
  return { total, ocupados, restantes, esgotado: restantes <= 0 };
}

/** Estado dos lugares, lido da base de dados. Nunca lança. */
export async function lugaresVitalicios(
  cliente?: SupabaseClient | null,
): Promise<LugaresVitalicios> {
  const sb = cliente ?? clienteServidor();
  if (!sb) return LUGARES_DESCONHECIDOS;
  try {
    const { data, error } = await sb.rpc("lugares_vitalicios");
    if (error || !data) return LUGARES_DESCONHECIDOS;
    const linha = Array.isArray(data) ? data[0] : data;
    return normalizar(linha as Partial<LugaresVitalicios>);
  } catch {
    return LUGARES_DESCONHECIDOS;
  }
}

/** A mensagem que a pessoa lê. Nunca «0 restantes» — isso não é uma frase. */
export function textoLugares(l: LugaresVitalicios): string {
  if (l.esgotado) return "Os lugares vitalícios esgotaram.";
  if (l.restantes === 1) return "Falta 1 lugar de " + l.total + ".";
  if (l.restantes <= 50) return `Faltam ${l.restantes} lugares de ${l.total}.`;
  return `${l.ocupados} de ${l.total} lugares ocupados.`;
}

/** O erro que o gatilho levanta quando o lugar já não existe. */
export const ERRO_ESGOTADO = "LUGARES_VITALICIOS_ESGOTADOS";

export const foiLimiteAtingido = (e: unknown): boolean =>
  typeof (e as { message?: string })?.message === "string" &&
  (e as { message: string }).message.includes(ERRO_ESGOTADO);
