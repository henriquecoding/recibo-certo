import type { SupabaseClient } from "@supabase/supabase-js";

export interface LugaresVitalicios {
  total: number;
  ocupados: number;
  restantes: number;
  esgotado: boolean;
  verificado?: boolean;
}

/** Falha fechada: sem confirmar capacidade, o checkout não cobra. */
export const LUGARES_DESCONHECIDOS: LugaresVitalicios = {
  total: 1000,
  ocupados: 0,
  restantes: 0,
  esgotado: true,
  verificado: false,
};

function normalizar(linha: Partial<LugaresVitalicios> | undefined): LugaresVitalicios {
  const total = Number(linha?.total ?? 1000);
  const ocupados = Number(linha?.ocupados ?? 0);
  const restantes = Math.max(total - ocupados, 0);
  return { total, ocupados, restantes, esgotado: restantes <= 0, verificado: true };
}

/** Mantido para testes e consumidores que fornecem explicitamente um cliente. */
export async function lugaresVitalicios(cliente?: SupabaseClient | null): Promise<LugaresVitalicios> {
  const sb = cliente;
  if (!sb) return LUGARES_DESCONHECIDOS;
  try {
    const { data, error } = await sb.rpc("lugares_vitalicios");
    if (error || !data) return LUGARES_DESCONHECIDOS;
    return normalizar((Array.isArray(data) ? data[0] : data) as Partial<LugaresVitalicios>);
  } catch {
    return LUGARES_DESCONHECIDOS;
  }
}

export function textoLugares(l: LugaresVitalicios): string {
  if (l.verificado === false) return "Lugares vitalícios temporariamente indisponíveis.";
  if (l.esgotado) return "Os lugares vitalícios esgotaram.";
  if (l.restantes === 1) return `Falta 1 lugar de ${l.total}.`;
  if (l.restantes <= 50) return `Faltam ${l.restantes} lugares de ${l.total}.`;
  return `${l.ocupados} de ${l.total} lugares ocupados.`;
}

export const ERRO_ESGOTADO = "LUGARES_VITALICIOS_ESGOTADOS";
export const foiLimiteAtingido = (error: unknown): boolean =>
  typeof (error as { message?: string })?.message === "string"
  && (error as { message: string }).message.includes(ERRO_ESGOTADO);
