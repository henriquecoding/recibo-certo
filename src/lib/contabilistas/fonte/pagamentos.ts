// Os pagamentos, pela porta que sabe em que modo o painel está aberto.
// Ver `nucleo.ts`.
//
// A demonstração é aqui mais opinativa do que noutros domínios, e de
// propósito: **nada** liga à Stripe em modo simulado. Abrir um checkout de
// verdade a partir do painel de demonstração da administração seria cobrar
// dinheiro a sério a partir de um ecrã que diz «dados inventados».
//
// O que a loja faz é mostrar o ESTADO — uma conta já ativa, pagamentos
// recebidos, uma consulta por pagar — para o ecrã se poder validar. As
// ações que moveriam dinheiro devolvem um erro claro em vez de fingirem.

import * as real from "../pagamentos";
import { emDemonstracao, loja } from "./nucleo";

export type {
  ConsultaPorPagar, EstadoPagamento, EstadoRecebimentos, MomentoPagamento, Pagamento,
} from "../pagamentos";
export { euros, liquidoParaOContabilista } from "../pagamentos";

const SEM_STRIPE_NA_DEMONSTRACAO = {
  erro: "Isto é uma demonstração — não abre pagamentos verdadeiros.",
};

export async function listarPagamentos(
  filtro: Parameters<typeof real.listarPagamentos>[0],
): Promise<real.Pagamento[]> {
  if (emDemonstracao()) return (await loja()).listarPagamentos();
  return real.listarPagamentos(filtro);
}

export async function consultasPorPagar(clienteId?: string): Promise<real.ConsultaPorPagar[]> {
  if (emDemonstracao()) return (await loja()).consultasPorPagar();
  return real.consultasPorPagar(clienteId);
}

export async function estadoDosRecebimentos(): Promise<real.EstadoRecebimentos> {
  if (emDemonstracao()) return (await loja()).estadoDosRecebimentos();
  return real.estadoDosRecebimentos();
}

export async function abrirOnboarding(): Promise<{ url?: string; erro?: string }> {
  if (emDemonstracao()) return SEM_STRIPE_NA_DEMONSTRACAO;
  return real.abrirOnboarding();
}

export async function sincronizarRecebimentos(): Promise<
  real.EstadoRecebimentos & { url?: string | null; erro?: string }
> {
  if (emDemonstracao()) {
    return { ...(await loja()).estadoDosRecebimentos(), url: null };
  }
  return real.sincronizarRecebimentos();
}

export async function abrirDesbloqueio(creditos: number): Promise<{ url?: string; erro?: string }> {
  if (emDemonstracao()) return SEM_STRIPE_NA_DEMONSTRACAO;
  return real.abrirDesbloqueio(creditos);
}

export async function abrirPagamentoDaConsulta(
  agendamentoId: string,
  cupaoId?: string | null,
): Promise<{ url?: string; erro?: string }> {
  if (emDemonstracao()) return SEM_STRIPE_NA_DEMONSTRACAO;
  return real.abrirPagamentoDaConsulta(agendamentoId, cupaoId);
}
