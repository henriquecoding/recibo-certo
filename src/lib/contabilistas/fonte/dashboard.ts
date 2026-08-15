// As vistas do painel modular, pela porta que sabe em que modo o painel
// está aberto. Ver `nucleo.ts`.
//
// O que é puro — validação de geometria, tags, compactação, assinatura
// canónica — não passa por aqui: não toca em dados e por isso não tem dois
// modos. Importa-se diretamente de `dashboard/layout`.

import * as real from "../dashboard/dados";
import type { WorkspaceLayoutV2, WorkspaceView } from "../dashboard/tipos";
import type { ResultadoGravacao } from "../dashboard/dados";
import { emDemonstracao, loja } from "./nucleo";

export type { ResultadoGravacao, MotivoFalhaGravacao } from "../dashboard/dados";

/**
 * As vistas de quem está autenticado, criando as de partida à primeira
 * visita.
 *
 * A criação vive aqui e não na página porque é uma decisão de dados: a
 * página só quer uma lista para desenhar, e não pode ter de saber que a
 * primeira visita é diferente das outras.
 */
export async function listarVistas(contabilistaId: string): Promise<WorkspaceView[]> {
  if (emDemonstracao()) return (await loja()).listarVistas();

  const vistas = await real.listarVistas(contabilistaId);
  if (vistas.length > 0) return vistas;
  return real.criarVistasPorOmissao(contabilistaId);
}

export async function guardarLayout(
  vistaId: string,
  revisionEsperada: number,
  layout: WorkspaceLayoutV2,
): Promise<ResultadoGravacao> {
  if (emDemonstracao()) {
    const r = await (await loja()).guardarLayout(vistaId, revisionEsperada, layout);
    return r as ResultadoGravacao;
  }
  return real.guardarLayout(vistaId, revisionEsperada, layout);
}

export async function criarVista(
  nome: string,
  copiarDe?: string,
): Promise<{ erro?: string; id?: string }> {
  if (emDemonstracao()) return (await loja()).criarVista(nome, copiarDe);
  return real.criarVista(nome, copiarDe);
}

export async function renomearVista(vistaId: string, nome: string): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).renomearVista(vistaId, nome);
  return real.renomearVista(vistaId, nome);
}

export async function definirVistaPrincipal(vistaId: string): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).definirVistaPrincipal(vistaId);
  return real.definirVistaPrincipal(vistaId);
}

export async function apagarVista(vistaId: string): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).apagarVista(vistaId);
  return real.apagarVista(vistaId);
}
