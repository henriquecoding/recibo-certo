"use client";

// ─────────────────────────────────────────────────────────────────────
//  Repositório de recibos (MVP: localStorage).
//  A interface `RecibosRepo` isola a persistência — basta trocar a
//  implementação por Supabase mais tarde, sem alterar a UI.
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  calcular,
  type CalcInput,
  type CalcResult,
  type TipoAtividade,
  type Regiao,
  type RegimeIVA,
  type BaseSS,
} from "@/lib/fiscal";
import { ATIVIDADES, efeitoFiscal } from "@/lib/fiscal-data";

export interface Recibo {
  id: string;
  /** Data de emissão (ISO yyyy-mm-dd). */
  data: string;
  cliente: string;
  /** Valor base, sem IVA. */
  valor: number;
  tipo: TipoAtividade;
  /** Rótulo da atividade do catálogo (Art. 151.º / regime especial). Opcional para compatibilidade. */
  atividade?: string;
  regiao: Regiao;
  regimeIVA: RegimeIVA;
  baseSS: BaseSS;
  dispensaRetencao: boolean;
}

export type NovoRecibo = Omit<Recibo, "id">;

const STORAGE_KEY = "recibocerto:recibos:v1";

function read(): Recibo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Recibo[]) : [];
  } catch {
    return [];
  }
}

function write(recibos: Recibo[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recibos));
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Converte um recibo guardado no input do motor de cálculo. */
export function reciboParaInput(r: Recibo): CalcInput {
  // Resolve o pacote de regras da atividade (retenção/base SS do regime especial).
  const ativ = r.atividade ? ATIVIDADES.find((a) => a.label === r.atividade) : undefined;
  const ef = ativ ? efeitoFiscal(ativ) : undefined;
  return {
    bruto: r.valor,
    tipo: r.tipo,
    regiao: r.regiao,
    regimeIVA: r.regimeIVA,
    baseSS: ef?.baseSS ?? r.baseSS,
    dispensaRetencao: r.dispensaRetencao,
    isencaoSSPrimeiroAno: false,
    acumulaEmprego: false,
    retencaoOverride: ef?.retencao,
  };
}

export function calcularRecibo(r: Recibo): CalcResult {
  return calcular(reciboParaInput(r));
}

export interface ResumoRecibos {
  total: number;
  bruto: number;
  iva: number;
  retencao: number;
  segSocial: number;
  liquido: number;
}

export function resumir(recibos: Recibo[]): ResumoRecibos {
  return recibos.reduce<ResumoRecibos>(
    (acc, r) => {
      const c = calcularRecibo(r);
      return {
        total: acc.total + 1,
        bruto: acc.bruto + c.bruto,
        iva: acc.iva + c.iva,
        retencao: acc.retencao + c.retencaoIRS,
        segSocial: acc.segSocial + c.segSocial,
        liquido: acc.liquido + c.liquido,
      };
    },
    { total: 0, bruto: 0, iva: 0, retencao: 0, segSocial: 0, liquido: 0 }
  );
}

/** Hook de acesso aos recibos com persistência local e estado reativo. */
export function useRecibos() {
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    setRecibos(read());
    setCarregado(true);
  }, []);

  const persistir = useCallback((proximos: Recibo[]) => {
    const ordenados = [...proximos].sort((a, b) => b.data.localeCompare(a.data));
    setRecibos(ordenados);
    write(ordenados);
  }, []);

  const adicionar = useCallback(
    (novo: NovoRecibo) => persistir([{ ...novo, id: uid() }, ...recibos]),
    [recibos, persistir]
  );

  const atualizar = useCallback(
    (id: string, patch: NovoRecibo) => persistir(recibos.map((r) => (r.id === id ? { ...patch, id } : r))),
    [recibos, persistir]
  );

  const remover = useCallback(
    (id: string) => persistir(recibos.filter((r) => r.id !== id)),
    [recibos, persistir]
  );

  const limpar = useCallback(() => persistir([]), [persistir]);

  const resumo = useMemo(() => resumir(recibos), [recibos]);

  return { recibos, carregado, adicionar, atualizar, remover, limpar, resumo };
}
