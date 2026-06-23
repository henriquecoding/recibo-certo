"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Restrição Pro para EXPORTAÇÕES (PDF/CSV) dos simuladores.
//
//  Modelo: simular é grátis. Exportar/descarregar é uma funcionalidade Pro —
//  mas um utilizador grátis pode experimentar UMA vez por simulador, neste
//  dispositivo, "para ver como funciona". A partir daí, mostra-se o upsell.
//  Pro → ilimitado. Lógica partilhada por todos os simuladores (sem duplicar).
// ─────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useSubscricao } from "@/lib/stripe/subscription";

export type FerramentaExport = "irs" | "vencimento" | "recibos" | "empresa";

/** Exportações grátis permitidas por simulador (experimentar), antes do Pro. */
export const LIMITE_EXPORT_GRATIS = 1;

const KEY = "recibocerto:export-usos:v1";

function lerUsos(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function marcarUso(tool: FerramentaExport) {
  if (typeof window === "undefined") return;
  try {
    const u = lerUsos();
    u[tool] = (u[tool] ?? 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(u));
  } catch {
    /* localStorage indisponível */
  }
}

export function usosExportacao(tool: FerramentaExport): number {
  return lerUsos()[tool] ?? 0;
}

export interface ExportacaoPro {
  ehPro: boolean;
  /** Tenta exportar: devolve true (e consome 1 utilização grátis) ou abre o upsell. */
  tentarExportar: (tool: FerramentaExport) => boolean;
  /** True quando o utilizador grátis já gastou a experimentação deste simulador. */
  bloqueado: (tool: FerramentaExport) => boolean;
  upsellAberto: boolean;
  fecharUpsell: () => void;
}

export function useExportacaoPro(): ExportacaoPro {
  const { plano } = useSubscricao();
  const ehPro = plano === "pro";
  const [upsellAberto, setUpsellAberto] = useState(false);

  const tentarExportar = useCallback(
    (tool: FerramentaExport): boolean => {
      if (ehPro) return true;
      if (usosExportacao(tool) >= LIMITE_EXPORT_GRATIS) {
        setUpsellAberto(true);
        return false;
      }
      marcarUso(tool);
      return true;
    },
    [ehPro]
  );

  const bloqueado = useCallback(
    (tool: FerramentaExport) => !ehPro && usosExportacao(tool) >= LIMITE_EXPORT_GRATIS,
    [ehPro]
  );

  const fecharUpsell = useCallback(() => setUpsellAberto(false), []);

  return { ehPro, tentarExportar, bloqueado, upsellAberto, fecharUpsell };
}
