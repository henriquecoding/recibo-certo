// A ficha, os clientes, a agenda, as partilhas e a fidelidade — pela porta
// que sabe em que modo o painel está aberto. Ver `nucleo.ts`.

import * as real from "../dados";
import { getSupabase } from "@/lib/supabase/client";
import type { Excecao, RegraDisponibilidade } from "../agenda";
import type {
  Agendamento, Contabilista, EstadoAgendamento, Partilha, Vinculo,
} from "../tipos";
import type { EventoXPLido } from "../dados";
import type { EstadoProgressao } from "../progressao/catalogo";
import { emDemonstracao, loja } from "./nucleo";

export type { CartaoAberto, CupaoLido, EventoXPLido, FidelidadeAposConsulta, TipoEventoXP } from "../dados";

// ─── Ficha ─────────────────────────────────────────────────────────────

export async function obterMinhaFicha(userId: string): Promise<Contabilista | null> {
  if (emDemonstracao()) return (await loja()).obterMinhaFicha();
  return real.obterMinhaFicha(userId);
}

export async function atualizarFicha(
  userId: string,
  campos: Parameters<typeof real.atualizarFicha>[1]
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).atualizarFicha(campos as Record<string, unknown>);
  return real.atualizarFicha(userId, campos);
}

// ─── Clientes ──────────────────────────────────────────────────────────

export async function meusClientes(contabilistaId: string): Promise<Vinculo[]> {
  if (emDemonstracao()) return (await loja()).meusClientes();
  return real.meusClientes(contabilistaId);
}

export async function decidirVinculo(
  id: string,
  decisao: "aceitar" | "recusar" | "pausar" | "reativar" | "terminar"
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).decidirVinculo(id, decisao);
  return real.decidirVinculo(id, decisao);
}

export async function contagensDoPainel(contabilistaId: string): Promise<{
  pedidos: number;
  partilhasPorLer: number;
  consultasPorConfirmar: number;
}> {
  if (emDemonstracao()) return (await loja()).contagensDoPainel();
  return real.contagensDoPainel(contabilistaId);
}

// ─── Agenda ────────────────────────────────────────────────────────────

export async function listarAgendamentos(filtro: {
  contabilistaId?: string;
  clienteId?: string;
  desde?: Date;
}): Promise<Agendamento[]> {
  if (emDemonstracao()) return (await loja()).listarAgendamentos({ desde: filtro.desde });
  return real.listarAgendamentos(filtro);
}

export async function decidirConsulta(
  id: string,
  estado: EstadoAgendamento,
  localOuLigacao?: string
): Promise<{ erro?: string; fidelidade?: real.FidelidadeAposConsulta | null }> {
  if (emDemonstracao()) return (await loja()).decidirConsulta(id, estado, localOuLigacao);
  return real.decidirConsulta(id, estado, localOuLigacao);
}

export async function obterDisponibilidade(contabilistaId: string): Promise<RegraDisponibilidade[]> {
  if (emDemonstracao()) return (await loja()).obterDisponibilidade();
  return real.obterDisponibilidade(contabilistaId);
}

export async function guardarDisponibilidade(
  contabilistaId: string,
  regras: RegraDisponibilidade[]
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).guardarDisponibilidade(regras);
  return real.guardarDisponibilidade(contabilistaId, regras);
}

export async function obterExcecoes(contabilistaId: string, desde?: string): Promise<Excecao[]> {
  if (emDemonstracao()) return (await loja()).obterExcecoes(desde);
  return real.obterExcecoes(contabilistaId, desde);
}

export async function fecharDia(
  contabilistaId: string,
  data: string,
  motivo?: string
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).fecharDia(data, motivo);
  return real.fecharDia(contabilistaId, data, motivo);
}

export async function reabrirDia(contabilistaId: string, data: string): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).reabrirDia(data);
  return real.reabrirDia(contabilistaId, data);
}

// ─── Partilhas ─────────────────────────────────────────────────────────

export async function listarPartilhas(filtro: {
  contabilistaId?: string;
  clienteId?: string;
}): Promise<Partilha[]> {
  if (emDemonstracao()) return (await loja()).listarPartilhas();
  return real.listarPartilhas(filtro);
}

export async function marcarPartilhaVista(id: string): Promise<void> {
  if (emDemonstracao()) return (await loja()).marcarPartilhaVista(id);
  return real.marcarPartilhaVista(id);
}

// ─── Fidelidade ────────────────────────────────────────────────────────

export async function cartoesAbertos(
  contabilistaId: string,
  clienteId?: string
): Promise<real.CartaoAberto[]> {
  if (emDemonstracao()) return (await loja()).cartoesAbertos(clienteId);
  return real.cartoesAbertos(contabilistaId, clienteId);
}

export async function meusCupoes(filtro: {
  clienteId?: string;
  contabilistaId?: string;
}): Promise<real.CupaoLido[]> {
  if (emDemonstracao()) return (await loja()).meusCupoes();
  return real.meusCupoes(filtro);
}

export interface ResultadoCupao {
  erro?: string;
  percentagem?: number;
  baseCents?: number;
  finalCents?: number;
}

/**
 * Dar um cupão por usado.
 *
 * No real é uma rota com a chave de serviço — validar e gastar acontecem no
 * mesmo pedido, e não há forma de espreitar sem consumir. A demonstração faz
 * exatamente o mesmo em memória, porque é essa a parte que uma pessoa precisa
 * de ver antes de a usar num cliente à frente dela.
 */
export async function usarCupao(codigo: string): Promise<ResultadoCupao> {
  if (emDemonstracao()) return (await loja()).usarCupao(codigo);

  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { erro: "A sessão expirou. Entra outra vez." };

  try {
    const res = await fetch("/api/contabilistas/cupao", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    const corpo = (await res.json()) as ResultadoCupao;
    if (!res.ok) return { erro: corpo.erro ?? "Não foi possível validar." };
    return corpo;
  } catch {
    return { erro: "Falha de rede. Tenta outra vez." };
  }
}

// ─── Progressão ────────────────────────────────────────────────────────
//
// Só leituras, nos dois modos. Não há porta de escrita nenhuma para
// abrir: a migração `20260815220000` não dá INSERT nem UPDATE a
// `authenticated`, e a loja de demonstração respeita a mesma regra — uma
// demonstração onde se pudesse pedir XP mentia sobre a única coisa que
// nesta frente é uma garantia estrutural.

export async function obterProgressao(contabilistaId: string): Promise<EstadoProgressao> {
  if (emDemonstracao()) return (await loja()).obterProgressao();
  return real.obterProgressao(contabilistaId);
}

export async function listarEventosXP(
  contabilistaId: string,
  limite?: number
): Promise<EventoXPLido[]> {
  if (emDemonstracao()) return (await loja()).listarEventosXP(limite);
  return real.listarEventosXP(contabilistaId, limite);
}
