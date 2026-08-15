// O quadro de trabalho, pela porta que sabe em que modo o painel está
// aberto. Ver `nucleo.ts`.
//
// O que é puro — `COLUNAS`, `progressoDe`, `urgenciaDe`, `ROTULO_URGENCIA`,
// `ETIQUETAS_SUGERIDAS` — reexporta-se tal e qual: não toca em dados, e por
// isso não tem dois modos. É a mesma regra de prazos a decidir o que está
// atrasado nos dois painéis.

import * as real from "../trabalho";
import type { EstadoTarefa, Tarefa } from "../trabalho";
import { emDemonstracao, loja } from "./nucleo";

export {
  COLUNAS, ETIQUETAS_SUGERIDAS, ROTULO_URGENCIA, progressoDe, urgenciaDe,
} from "../trabalho";
export type { EstadoTarefa, Passo, Progresso, Tarefa, UrgenciaPrazo } from "../trabalho";

export async function listarTarefas(contabilistaId: string): Promise<Tarefa[]> {
  if (emDemonstracao()) return (await loja()).listarTarefas();
  return real.listarTarefas(contabilistaId);
}

export async function criarTarefa(p: {
  contabilistaId: string;
  titulo: string;
  vinculoId?: string | null;
  prazo?: string | null;
  etiquetas?: string[];
  notas?: string;
}): Promise<{ erro?: string; id?: string }> {
  if (emDemonstracao()) return (await loja()).criarTarefa(p);
  return real.criarTarefa(p);
}

export async function moverTarefa(id: string, estado: EstadoTarefa): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).moverTarefa(id, estado);
  return real.moverTarefa(id, estado);
}

export async function apagarTarefa(id: string): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).apagarTarefa(id);
  return real.apagarTarefa(id);
}

export async function acrescentarPasso(
  tarefaId: string, texto: string, ordem: number
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).acrescentarPasso(tarefaId, texto, ordem);
  return real.acrescentarPasso(tarefaId, texto, ordem);
}

export async function alternarPasso(id: string, feito: boolean): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).alternarPasso(id, feito);
  return real.alternarPasso(id, feito);
}
