"use client";

// ─────────────────────────────────────────────────────────────────────
//  Repositório de recibos — MODO DUPLO.
//  · Sem sessão  → localStorage (mantém a promessa "Sem registo").
//  · Com sessão  → tabela `recibos` no Supabase (conta na nuvem, Pro).
//  A interface (`useRecibos`) é a mesma nos dois modos, por isso as páginas
//  não mudam. Ao entrar com recibos locais, é oferecida a importação.
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
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";

export interface ReciboComputed {
  /** IRS real estimado por recibo (da simulação anual, não a retenção na fonte). */
  irsEstimado: number;
  segSocial: number;
  iva: number;
  liquido: number;
}

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
  /** Valores pré-calculados pelo simulador (IRS real, não retenção na fonte). Quando presente, o dashboard usa estes valores em vez de recalcular. */
  _computed?: ReciboComputed;
}

export type NovoRecibo = Omit<Recibo, "id">;

const STORAGE_KEY = "recibocerto:recibos:v1";
const IMPORT_ADIADO_KEY = (userId: string) => `recibocerto:import-adiado:${userId}`;
// Cache local dos valores pré-calculados pelo simulador (IRS real, líquido, etc.),
// indexado por id do recibo. É a ÚNICA fonte destes valores no dashboard: o
// Supabase não guarda `_computed` (a tabela `recibos` não tem colunas para isso),
// por isso sem este cache os valores perdiam-se no round-trip à nuvem e o painel
// caía no recálculo de retenção na fonte. Cross-device: ausente → recalcula.
const COMPUTED_KEY = "recibocerto:recibos-computed:v1";

// ─── localStorage ──────────────────────────────────────────────────────
function readLocal(): Recibo[] {
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

function writeLocal(recibos: Recibo[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recibos));
}

function clearLocal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// ─── Cache de valores pré-calculados (sobrevive ao round-trip do Supabase) ──
function readComputedCache(): Record<string, ReciboComputed> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COMPUTED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, ReciboComputed>) : {};
  } catch {
    return {};
  }
}

function writeComputedCache(cache: Record<string, ReciboComputed>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPUTED_KEY, JSON.stringify(cache));
  } catch {
    /* quota/indisponível — ignora */
  }
}

/** Guarda os valores pré-calculados de um recibo (no-op se não houver). */
function cacheComputed(id: string, computed?: ReciboComputed): void {
  if (!computed) return;
  const cache = readComputedCache();
  cache[id] = computed;
  writeComputedCache(cache);
}

/** Remove a entrada de cache de um recibo. */
function dropComputed(id: string): void {
  const cache = readComputedCache();
  if (id in cache) {
    delete cache[id];
    writeComputedCache(cache);
  }
}

/** Reanexa `_computed` (do cache local) a recibos vindos da nuvem ou do localStorage. */
function enriquecerComputed(recibos: Recibo[]): Recibo[] {
  const cache = readComputedCache();
  return recibos.map((r) => {
    if (r._computed) {
      // Garante que o cache fica sincronizado quando o valor já vem embutido (local).
      if (!cache[r.id]) cacheComputed(r.id, r._computed);
      return r;
    }
    return cache[r.id] ? { ...r, _computed: cache[r.id] } : r;
  });
}

function importacaoAdiada(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(IMPORT_ADIADO_KEY(userId)) === "1";
  } catch {
    return false;
  }
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const ordenar = (xs: Recibo[]) => [...xs].sort((a, b) => b.data.localeCompare(a.data));

// ─── Mapeamento Supabase (snake_case na BD ↔ camelCase no app) ──────────
interface ReciboRow {
  id: string;
  data: string;
  cliente: string | null;
  valor: number | string;
  tipo: string;
  atividade: string | null;
  regiao: string;
  regime_iva: string;
  base_ss: string;
  dispensa_retencao: boolean;
}

function fromRow(r: ReciboRow): Recibo {
  return {
    id: r.id,
    data: r.data,
    cliente: r.cliente ?? "",
    valor: Number(r.valor) || 0,
    tipo: r.tipo as TipoAtividade,
    atividade: r.atividade ?? undefined,
    regiao: r.regiao as Regiao,
    regimeIVA: r.regime_iva as RegimeIVA,
    baseSS: r.base_ss as BaseSS,
    dispensaRetencao: !!r.dispensa_retencao,
  };
}

function toRow(r: Recibo, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    data: r.data,
    cliente: r.cliente,
    valor: r.valor,
    tipo: r.tipo,
    atividade: r.atividade ?? null,
    regiao: r.regiao,
    regime_iva: r.regimeIVA,
    base_ss: r.baseSS,
    dispensa_retencao: r.dispensaRetencao,
  };
}

async function cloudList(userId: string): Promise<Recibo[]> {
  const { data, error } = await getSupabase()
    .from("recibos")
    .select("*")
    .eq("user_id", userId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => fromRow(r as ReciboRow));
}

// ─── Conversão para o motor de cálculo ──────────────────────────────────

export interface OpcoesCalcRecibo {
  isencaoSSPrimeiroAno?: boolean;
  acumulaEmprego?: boolean;
  irsJovemAno?: number;
}

/** Converte um recibo guardado no input do motor de cálculo. */
export function reciboParaInput(r: Recibo, opcoes?: OpcoesCalcRecibo): CalcInput {
  const ativ = r.atividade ? ATIVIDADES.find((a) => a.label === r.atividade) : undefined;
  const ef = ativ ? efeitoFiscal(ativ) : undefined;
  return {
    bruto: r.valor,
    tipo: r.tipo,
    regiao: r.regiao,
    regimeIVA: r.regimeIVA,
    baseSS: ef?.baseSS ?? r.baseSS,
    dispensaRetencao: r.dispensaRetencao,
    isencaoSSPrimeiroAno: opcoes?.isencaoSSPrimeiroAno ?? false,
    acumulaEmprego: opcoes?.acumulaEmprego ?? false,
    irsJovemAno: opcoes?.irsJovemAno,
    retencaoOverride: ef?.retencao,
  };
}

export function calcularRecibo(r: Recibo, opcoes?: OpcoesCalcRecibo): CalcResult {
  return calcular(reciboParaInput(r, opcoes));
}

/** Valores para exibição no dashboard: usa `_computed` (IRS real da simulação anual)
 *  quando disponível; caso contrário recalcula (fallback para recibos antigos). */
export function calcularReciboDashboard(r: Recibo): CalcResult {
  if (r._computed) {
    const c = r._computed;
    return {
      bruto: r.valor,
      retencaoIRS: c.irsEstimado,
      iva: c.iva,
      segSocial: c.segSocial,
      liquido: c.liquido,
      entradaConta: r.valor + c.iva - c.irsEstimado,
      taxaRetencao: r.valor > 0 ? c.irsEstimado / r.valor : 0,
      taxaIVA: r.valor > 0 ? c.iva / r.valor : 0,
      isencaoJovem: 0,
      avisos: [],
    };
  }
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

export function resumir(recibos: Recibo[], opcoes?: OpcoesCalcRecibo): ResumoRecibos {
  return recibos.reduce<ResumoRecibos>(
    (acc, r) => {
      const c = calcularRecibo(r, opcoes);
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

/** Resumo para o dashboard: usa `_computed` (IRS real estimado) quando disponível. */
export function resumirDashboard(recibos: Recibo[]): ResumoRecibos {
  return recibos.reduce<ResumoRecibos>(
    (acc, r) => {
      const c = calcularReciboDashboard(r);
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

// ─── Hook de acesso (modo duplo) ────────────────────────────────────────
export function useRecibos() {
  const { user, carregado: authPronto, disponivel } = useAuth();
  const { plano } = useSubscricao();
  const userId = user?.id ?? null;
  const naNuvem = disponivel && !!userId && plano === "pro";

  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [carregado, setCarregado] = useState(false);
  /** N.º de recibos locais que podem ser trazidos para a nuvem (só com sessão). */
  const [locaisPorImportar, setLocaisPorImportar] = useState(0);

  // Carregar (espera a resolução da sessão para escolher a fonte).
  useEffect(() => {
    if (!authPronto) return;
    let ativo = true;
    setCarregado(false);

    if (naNuvem && userId) {
      cloudList(userId)
        .then((rows) => {
          if (!ativo) return;
          // O Supabase não guarda `_computed`; reanexa-o do cache local.
          setRecibos(ordenar(enriquecerComputed(rows)));
          const locais = readLocal();
          setLocaisPorImportar(importacaoAdiada(userId) ? 0 : locais.length);
          setCarregado(true);
        })
        .catch((e) => {
          if (!ativo) return;
          console.error("[recibos] erro ao carregar da nuvem:", e);
          setRecibos([]);
          setCarregado(true);
        });
    } else {
      setRecibos(ordenar(enriquecerComputed(readLocal())));
      setLocaisPorImportar(0);
      setCarregado(true);
    }

    return () => {
      ativo = false;
    };
  }, [authPronto, naNuvem, userId]);

  // Atualiza o estado e persiste: na nuvem corre `opCloud` (o delta); senão grava local.
  const persistir = useCallback(
    (proximos: Recibo[], opCloud?: () => Promise<unknown>) => {
      const ordenados = ordenar(proximos);
      setRecibos(ordenados);
      if (naNuvem) {
        opCloud?.().catch((e) => console.error("[recibos] erro a sincronizar com a nuvem:", e));
      } else {
        writeLocal(ordenados);
      }
    },
    [naNuvem]
  );

  const adicionar = useCallback(
    (novo: NovoRecibo) => {
      const recibo: Recibo = { ...novo, id: uid() };
      cacheComputed(recibo.id, recibo._computed);
      persistir([recibo, ...recibos], async () => {
        const { error } = await getSupabase().from("recibos").insert(toRow(recibo, userId!));
        if (error) throw error;
      });
    },
    [recibos, persistir, userId]
  );

  const atualizar = useCallback(
    (id: string, patch: NovoRecibo) => {
      const recibo: Recibo = { ...patch, id };
      cacheComputed(id, recibo._computed);
      persistir(
        recibos.map((r) => (r.id === id ? recibo : r)),
        async () => {
          const { error } = await getSupabase()
            .from("recibos")
            .update(toRow(recibo, userId!))
            .eq("id", id)
            .eq("user_id", userId!);
          if (error) throw error;
        }
      );
    },
    [recibos, persistir, userId]
  );

  const remover = useCallback(
    (id: string) => {
      dropComputed(id);
      persistir(
        recibos.filter((r) => r.id !== id),
        async () => {
          const { error } = await getSupabase().from("recibos").delete().eq("id", id).eq("user_id", userId!);
          if (error) throw error;
        }
      );
    },
    [recibos, persistir, userId]
  );

  const limpar = useCallback(() => {
    writeComputedCache({});
    persistir([], async () => {
      const { error } = await getSupabase().from("recibos").delete().eq("user_id", userId!);
      if (error) throw error;
    });
  }, [persistir, userId]);

  // Trazer os recibos locais para a conta na nuvem (idempotente via upsert).
  const importarLocais = useCallback(async () => {
    if (!naNuvem || !userId) return;
    const locais = readLocal();
    if (locais.length === 0) {
      setLocaisPorImportar(0);
      return;
    }
    const { error } = await getSupabase()
      .from("recibos")
      .upsert(locais.map((r) => toRow(r, userId)), { onConflict: "id" });
    if (error) {
      console.error("[recibos] erro ao importar locais:", error);
      return;
    }
    clearLocal();
    setLocaisPorImportar(0);
    try {
      setRecibos(ordenar(enriquecerComputed(await cloudList(userId))));
    } catch (e) {
      console.error("[recibos] erro ao recarregar após importação:", e);
    }
  }, [naNuvem, userId]);

  // Adiar a importação (não volta a perguntar a este utilizador neste dispositivo).
  const adiarImportacao = useCallback(() => {
    if (userId) {
      try {
        window.localStorage.setItem(IMPORT_ADIADO_KEY(userId), "1");
      } catch {
        /* ignora */
      }
    }
    setLocaisPorImportar(0);
  }, [userId]);

  const resumo = useMemo(() => resumir(recibos), [recibos]);

  return {
    recibos,
    carregado,
    naNuvem,
    adicionar,
    atualizar,
    remover,
    limpar,
    resumo,
    locaisPorImportar,
    importarLocais,
    adiarImportacao,
  };
}
