// A Fidelidade V2 — regras versionadas — pela porta que sabe em que modo o
// painel está aberto. Ver `nucleo.ts`.
//
// O que é puro (`aplicarConsulta`, `calcularDesconto`, a copy) importa-se
// direto de `fidelidade/estados`: não toca em dados e por isso não tem dois
// modos.

import * as real from "../fidelidade/dados";
import type { ImpactoDaRegra, RegraLida, ResultadoPublicacao } from "../fidelidade/dados";
import { emDemonstracao, loja } from "./nucleo";

export type { ImpactoDaRegra, RegraLida, ResultadoPublicacao } from "../fidelidade/dados";

export async function regraCorrente(contabilistaId: string): Promise<RegraLida | null> {
  if (emDemonstracao()) return (await loja()).regraCorrente();
  return real.regraCorrente(contabilistaId);
}

export async function historicoDeRegras(contabilistaId: string): Promise<RegraLida[]> {
  if (emDemonstracao()) return (await loja()).historicoDeRegras();
  return real.historicoDeRegras(contabilistaId);
}

export async function impactoDaRegraNova(): Promise<ImpactoDaRegra> {
  if (emDemonstracao()) return (await loja()).impactoDaRegraNova();
  return real.impactoDaRegraNova();
}

export async function publicarRegra(p: {
  meta: number;
  descontoPct: number;
  ativa: boolean;
  exigePagamento: boolean;
}): Promise<ResultadoPublicacao> {
  if (emDemonstracao()) return (await loja()).publicarRegra(p);
  return real.publicarRegra(p);
}
