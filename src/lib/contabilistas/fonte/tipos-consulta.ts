// O catálogo de consultas, pela porta que sabe em que modo o painel está
// aberto. Ver `nucleo.ts`.
//
// O que é puro — `precoLegivel`, `duracaoLegivel`, a copy dos valores
// indicativos — reexporta-se tal e qual: não toca em dados, e por isso
// não tem dois modos.

import * as real from "../tipos-consulta";
import type { NovoTipoConsulta, TipoConsulta } from "../tipos-consulta";
import { emDemonstracao, loja } from "./nucleo";

export {
  COPY_VALORES_INDICATIVOS, DURACOES, TIPOS_MAX, duracaoLegivel, precoLegivel,
} from "../tipos-consulta";
export type { NovoTipoConsulta, TipoConsulta } from "../tipos-consulta";

export async function listarTiposConsulta(contabilistaId: string): Promise<TipoConsulta[]> {
  if (emDemonstracao()) return (await loja()).listarTiposConsulta();
  return real.listarTiposConsulta(contabilistaId);
}

export async function criarTipoConsulta(t: NovoTipoConsulta): Promise<{ erro?: string; id?: string }> {
  if (emDemonstracao()) return (await loja()).criarTipoConsulta(t);
  return real.criarTipoConsulta(t);
}

export async function atualizarTipoConsulta(
  id: string,
  campos: Parameters<typeof real.atualizarTipoConsulta>[1]
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).atualizarTipoConsulta(id, campos);
  return real.atualizarTipoConsulta(id, campos);
}

export async function apagarTipoConsulta(id: string): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).apagarTipoConsulta(id);
  return real.apagarTipoConsulta(id);
}
