// O cartão do LinkedIn no perfil público, pela porta que sabe em que modo o
// painel está aberto. Ver `nucleo.ts`.
//
// Este é o único bloco do painel onde a demonstração NÃO consegue imitar o
// real, e a razão é honesta: ligar o LinkedIn sai do ReciboCerto para o
// consentimento do LinkedIn. A loja recusa com essa frase em vez de fingir
// uma ligação — ver `loja.ts`. Tudo o resto (estado, endereço público,
// desligar) comporta-se como no painel real.

import * as real from "../linkedin";
import type { LinkedInPublico } from "../linkedin";
import { emDemonstracao, loja } from "./nucleo";

export {
  LINKEDIN_PROVIDER, avatarLinkedInExpirou, normalizarUrlLinkedIn,
} from "../linkedin";
export type { LinkedInPublico } from "../linkedin";

export async function obterEstadoLinkedIn(): Promise<{
  ligado: boolean;
  fotoDaIdentidade: string | null;
  erro?: string;
}> {
  if (emDemonstracao()) return (await loja()).obterEstadoLinkedIn();
  const estado = await real.obterEstadoLinkedIn();
  return { ligado: estado.ligado, fotoDaIdentidade: estado.fotoDaIdentidade, erro: estado.erro };
}

export async function obterLinkedInPublico(contabilistaId: string): Promise<LinkedInPublico> {
  if (emDemonstracao()) {
    const p = await (await loja()).obterLinkedInPublico();
    return { url: p.url, avatarUrl: p.avatarUrl, ligadoEm: null };
  }
  return real.obterLinkedInPublico(contabilistaId);
}

export async function sincronizarLinkedIn(): Promise<{
  ligado: boolean; avatarUrl: string | null; erro?: string;
}> {
  if (emDemonstracao()) return (await loja()).sincronizarLinkedIn();
  return real.sincronizarLinkedIn();
}

export async function ligarLinkedIn(): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).ligarLinkedIn();
  return real.ligarLinkedIn();
}

export async function desligarLinkedIn(): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).desligarLinkedIn();
  return real.desligarLinkedIn();
}

export async function renovarLinkedIn(): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).renovarLinkedIn();
  return real.renovarLinkedIn();
}

export async function guardarUrlLinkedIn(
  contabilistaId: string,
  valor: string
): Promise<{ url?: string | null; erro?: string }> {
  if (emDemonstracao()) {
    // A mesma validação de formato do real, antes de guardar.
    const url = real.normalizarUrlLinkedIn(valor);
    if (valor.trim() && !url) {
      return { erro: "Usa um endereço de perfil LinkedIn no formato linkedin.com/in/teu-perfil." };
    }
    return (await loja()).guardarUrlLinkedIn(url ?? "");
  }
  return real.guardarUrlLinkedIn(contabilistaId, valor);
}
