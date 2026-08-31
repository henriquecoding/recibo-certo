"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Handoff de reabertura (gestão → simulador).
//
//  Vive num módulo próprio, e não dentro de `cenarios.ts`, por uma razão de
//  peso — literalmente: `cenarios.ts` arrasta Supabase, Stripe e o cofre.
//  Um simulador que só quer saber «há um cenário à minha espera?» não pode
//  pagar esse chunk à entrada só por causa de três funções de localStorage.
//  Foi o que impediu o planeador de contratação de consumir a reabertura
//  durante meses: importar a função obrigava a importar tudo o resto.
// ─────────────────────────────────────────────────────────────────────────

import { lerChave, gravarChave, removerChave } from "@/lib/store/persistencia";

export type TipoCenarioReabertura =
  | "recibos"
  | "vencimento"
  | "contratacao"
  | "empresa"
  | "irs"
  | "herancas"
  | "negocio";

const PENDENTE_KEY = (tipo: TipoCenarioReabertura) =>
  `recibocerto:cenario-pendente:${tipo}`;

export function marcarReaberturaDe(
  tipo: TipoCenarioReabertura,
  dados: Record<string, unknown>,
  versao: number,
): void {
  gravarChave(PENDENTE_KEY(tipo), JSON.stringify({ ...dados, __versao: versao }));
}

export function consumirReabertura(
  tipo: TipoCenarioReabertura,
): Record<string, unknown> | null {
  const raw = lerChave(PENDENTE_KEY(tipo));
  if (!raw) return null;
  removerChave(PENDENTE_KEY(tipo));
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Peek não-destrutivo: há um cenário marcado para reabrir deste tipo? */
export function haReabertura(tipo: TipoCenarioReabertura): boolean {
  return lerChave(PENDENTE_KEY(tipo)) !== null;
}
