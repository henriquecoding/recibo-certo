"use client";

import { useCallback, useState } from "react";
import { useSubscricao } from "@/lib/stripe/subscription";

export type FerramentaExport = "irs" | "vencimento" | "recibos" | "empresa";

/** A tabela comercial promete exportações no Plus; o servidor aplica a mesma regra. */
export const LIMITE_EXPORT_GRATIS = 0;

const KEY = "recibocerto:export-usos:v1";

function lerUsos(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function usosExportacao(tool: FerramentaExport): number {
  return lerUsos()[tool] ?? 0;
}

export interface ExportacaoPro {
  ehPro: boolean;
  tentarExportar: (tool: FerramentaExport) => boolean;
  bloqueado: (tool: FerramentaExport) => boolean;
  upsellAberto: boolean;
  fecharUpsell: () => void;
}

export function useExportacaoPro(): ExportacaoPro {
  const { plano } = useSubscricao();
  const ehPro = plano === "plus";
  const [upsellAberto, setUpsellAberto] = useState(false);
  const tentarExportar = useCallback((_tool: FerramentaExport): boolean => {
    if (ehPro) return true;
    setUpsellAberto(true);
    return false;
  }, [ehPro]);
  const bloqueado = useCallback((_tool: FerramentaExport) => !ehPro, [ehPro]);
  const fecharUpsell = useCallback(() => setUpsellAberto(false), []);
  return { ehPro, tentarExportar, bloqueado, upsellAberto, fecharUpsell };
}
