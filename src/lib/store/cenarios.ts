"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Repositório UNIFICADO de cenários de simulação — MODO DUPLO + TIER.
//
//  Guarda um instantâneo COMPLETO (todos os campos preenchidos/selecionados,
//  não só o resultado) de qualquer simulador — recibos verdes, recibo de
//  vencimento, abrir empresa e IRS — para o utilizador reabrir/importar mais
//  tarde. É o coração da página de Gestão.
//
//  · Grátis (anónimo ou sem Pro) → localStorage, até LIMITE_FREE cenários.
//  · Pro (com sessão + subscrição) → tabela `cenarios` (nuvem, ilimitado,
//    sincronizado entre dispositivos).
//  A interface (`useCenarios`) é a mesma nos dois modos.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";

export type TipoCenario = "recibos" | "vencimento" | "empresa" | "irs";

export const META_TIPO_CENARIO: Record<TipoCenario, { label: string; sub: string; rota: string; icone: string }> = {
  recibos: { label: "Recibos verdes", sub: "Trabalho independente", rota: "/dashboard/recibos-verdes", icone: "Invoice" },
  vencimento: { label: "Recibo de vencimento", sub: "Trabalho por conta de outrem", rota: "/dashboard/recibo-vencimento", icone: "Wallet" },
  empresa: { label: "Abrir empresa", sub: "Sociedade / unipessoal", rota: "/dashboard/empresa", icone: "Building" },
  irs: { label: "Simulador de IRS", sub: "Declaração anual", rota: "/dashboard/simulador", icone: "Calculator" },
};

/** Número-chave de um cenário, para os cartões da página de gestão. */
export interface LinhaResumo {
  label: string;
  valor: number;
  /** Formato do valor: euro (defeito) ou percentagem. */
  fmt?: "eur" | "pct";
}

export interface ResumoCenario {
  destaque: number;
  destaqueLabel: string;
  destaqueFmt?: "eur" | "pct";
  linhas: LinhaResumo[];
}

export interface Cenario {
  id: string;
  tipo: TipoCenario;
  nome: string;
  /** ISO timestamp. */
  criadoEm: string;
  /** Números-chave para apresentação (cartões). */
  resumo: ResumoCenario;
  /** Instantâneo COMPLETO dos inputs — para reabrir/importar. Forma livre por tipo. */
  dados: Record<string, unknown>;
}

export type NovoCenario = Omit<Cenario, "id" | "criadoEm">;

/** Limite de cenários guardados no plano grátis (local). Pro é ilimitado. */
export const LIMITE_FREE = 1;

const STORAGE_KEY = "recibocerto:cenarios:v1";

function readLocal(): Cenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Cenario[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(xs: Cenario[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(xs));
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const ordenar = (xs: Cenario[]) => [...xs].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

// ─── Mapeamento Supabase ────────────────────────────────────────────────
interface CenarioRow {
  id: string;
  tipo: string;
  nome: string | null;
  resumo: ResumoCenario | null;
  dados: Record<string, unknown> | null;
  criado_em: string;
}

function fromRow(r: CenarioRow): Cenario {
  return {
    id: r.id,
    tipo: (r.tipo as TipoCenario) ?? "irs",
    nome: r.nome ?? "",
    resumo: r.resumo ?? { destaque: 0, destaqueLabel: "", linhas: [] },
    dados: r.dados ?? {},
    criadoEm: r.criado_em,
  };
}

function toRow(c: Cenario, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    tipo: c.tipo,
    nome: c.nome || null,
    resumo: c.resumo,
    dados: c.dados,
    criado_em: c.criadoEm,
  };
}

async function cloudList(userId: string): Promise<Cenario[]> {
  const { data, error } = await getSupabase()
    .from("cenarios")
    .select("*")
    .eq("user_id", userId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => fromRow(r as CenarioRow));
}

// ─── Hook de acesso (modo duplo + tiering) ──────────────────────────────
export function useCenarios() {
  const { user, carregado: authPronto, disponivel } = useAuth();
  const { plano } = useSubscricao();
  const userId = user?.id ?? null;
  const naNuvem = disponivel && !!userId && plano === "pro";

  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!authPronto) return;
    let ativo = true;
    setCarregado(false);

    if (naNuvem && userId) {
      cloudList(userId)
        .then((rows) => {
          if (!ativo) return;
          setCenarios(ordenar(rows));
          setCarregado(true);
        })
        .catch((e) => {
          if (!ativo) return;
          console.error("[cenarios] erro ao carregar da nuvem:", e);
          setCenarios(ordenar(readLocal()));
          setCarregado(true);
        });
    } else {
      setCenarios(ordenar(readLocal()));
      setCarregado(true);
    }

    return () => {
      ativo = false;
    };
  }, [authPronto, naNuvem, userId]);

  const limiteAtingido = !naNuvem && cenarios.length >= LIMITE_FREE;

  const guardar = useCallback(
    (novo: NovoCenario): { erro?: string; cenario?: Cenario } => {
      if (!naNuvem && cenarios.length >= LIMITE_FREE) {
        return {
          erro:
            plano === "pro"
              ? "Inicia sessão para sincronizar os teus cenários na nuvem."
              : `O plano grátis guarda ${LIMITE_FREE} cenário. Passa a Pro para guardares todos os cenários, sincronizados na nuvem.`,
        };
      }
      const cenario: Cenario = { ...novo, id: uid(), criadoEm: new Date().toISOString() };
      const proximos = ordenar([cenario, ...cenarios]);
      setCenarios(proximos);
      if (naNuvem && userId) {
        getSupabase()
          .from("cenarios")
          .insert(toRow(cenario, userId))
          .then(({ error }) => {
            if (error) console.error("[cenarios] erro a sincronizar:", error);
          });
      } else {
        writeLocal(proximos);
      }
      return { cenario };
    },
    [cenarios, naNuvem, userId, plano]
  );

  const remover = useCallback(
    (id: string) => {
      const proximos = cenarios.filter((c) => c.id !== id);
      setCenarios(proximos);
      if (naNuvem && userId) {
        getSupabase()
          .from("cenarios")
          .delete()
          .eq("id", id)
          .eq("user_id", userId)
          .then(({ error }) => {
            if (error) console.error("[cenarios] erro a remover:", error);
          });
      } else {
        writeLocal(proximos);
      }
    },
    [cenarios, naNuvem, userId]
  );

  return { cenarios, carregado, naNuvem, plano, limite: LIMITE_FREE, limiteAtingido, guardar, remover };
}

// ─── Handoff de reabertura (gestão → simulador) ─────────────────────────
// A página de gestão escreve o instantâneo aqui e navega para o simulador;
// o simulador lê na montagem, hidrata o estado e limpa a chave.
const PENDENTE_KEY = (tipo: TipoCenario) => `recibocerto:cenario-pendente:${tipo}`;

export function marcarReabertura(c: Cenario): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDENTE_KEY(c.tipo), JSON.stringify(c.dados));
  } catch {
    /* ignore */
  }
}

export function consumirReabertura(tipo: TipoCenario): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDENTE_KEY(tipo));
    if (!raw) return null;
    window.localStorage.removeItem(PENDENTE_KEY(tipo));
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Peek não-destrutivo: há um cenário marcado para reabrir deste tipo? */
export function haReabertura(tipo: TipoCenario): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PENDENTE_KEY(tipo)) !== null;
  } catch {
    return false;
  }
}
