import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import {
  LUGARES_DESCONHECIDOS,
  lugaresVitalicios as lerLugares,
  type LugaresVitalicios,
} from "@/lib/plus/vitalicio";

export async function lugaresVitalicios(): Promise<LugaresVitalicios> {
  const sb = supabaseAdmin();
  if (!sb) return LUGARES_DESCONHECIDOS;
  return lerLugares(sb);
}
