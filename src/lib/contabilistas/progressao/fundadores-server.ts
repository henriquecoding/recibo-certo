import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import {
  LUGARES_DESCONHECIDOS, normalizarLugares, type LugaresFundadores,
} from "./fundadores";

/**
 * Quantos lugares de fundador restam, lido no servidor.
 *
 * Existe à parte do cliente por uma razão de produto e não de arquitetura:
 * este número é a razão de alguém se decidir hoje em vez de «um dia
 * destes», e um número que só aparece depois de o JavaScript carregar
 * chega tarde a quem lê a página e fecha o separador.
 *
 * Falha FECHADA, como o vitalício: sem confirmação, devolve «esgotado e
 * não verificado», e o ecrã diz que não conseguiu confirmar em vez de
 * anunciar lugares que podem já não existir.
 */
export async function lugaresFundadoresServidor(): Promise<LugaresFundadores> {
  const sb = supabaseAdmin();
  if (!sb) return LUGARES_DESCONHECIDOS;

  try {
    const { data, error } = await sb.rpc("lugares_fundadores");
    if (error || !data) return LUGARES_DESCONHECIDOS;
    const linha = (Array.isArray(data) ? data[0] : data) as Partial<LugaresFundadores>;
    return normalizarLugares(linha);
  } catch {
    return LUGARES_DESCONHECIDOS;
  }
}
