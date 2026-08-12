"use client";

// ─────────────────────────────────────────────────────────────────────
//  Repositório de recibos — MODO DUPLO.
//  · Sem sessão  → localStorage (mantém a promessa "Sem registo").
//  · Com sessão  → tabela `recibos` no Supabase (conta na nuvem, Plus).
//  A interface (`useRecibos`) é a mesma nos dois modos, por isso as páginas
//  não mudam. Ao entrar com recibos locais, é oferecida a importação.
//
//  Os cálculos e os seletores anuais NÃO vivem aqui: vêm de
//  `@/lib/recibos-contrato`, o contrato único partilhado com as páginas, as
//  exportações e os testes. Este ficheiro trata só de guardar e ler.
//
//  Gravar devolve `Resultado<T>` e só resolve depois de confirmação durável
//  (RC-P0-03): nenhuma interface pode dizer "Guardado" antes disso. Quando a
//  nuvem falha por rede, a operação fica numa fila local e é repetida.
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import {
  REGIOES,
  REGIMES_IVA,
  BASES_SS,
  TIPOS_ATIVIDADE,
} from "@/lib/fiscal-data";
import {
  dataIsoValida,
  timestampIsoValido,
  montanteValido,
  idValido,
  pertence,
  triar,
  type Triagem,
} from "@/lib/validacao-dominio";
import {
  ok,
  falha,
  erroLocal,
  erroNuvem,
  recuperavel,
  lerChave,
  gravarChave,
  removerChave,
  type ErroPersistencia,
  type Resultado,
} from "@/lib/store/persistencia";
import {
  anoFiscalCorrente,
  resumoDoAno,
  type Recibo,
  type ReciboComputed,
  type NovoRecibo,
  type ResumoRecibos,
  type OpcoesCalcRecibo,
} from "@/lib/recibos-contrato";

// Reexportado para as páginas: o contrato é a fonte, este ficheiro a porta.
export type { Recibo, ReciboComputed, NovoRecibo, ResumoRecibos, OpcoesCalcRecibo };
export {
  reciboParaInput,
  calcularRecibo,
  resultadoDoRecibo,
  resumirRecibos,
  resumoDoAno,
  resumoDoMes,
  resumoDoTrimestre,
  recibosDoAno,
  recibosDoMes,
  recibosDoTrimestre,
  anoDoRecibo,
  anoFiscalCorrente,
  faturadoNoAno,
  anosComRecibos,
  METODOLOGIA_VERSION,
  type ResultadoRecibo,
} from "@/lib/recibos-contrato";
export type { Resultado, ErroPersistencia } from "@/lib/store/persistencia";

const STORAGE_KEY = "recibocerto:recibos:v1";
const IMPORT_ADIADO_KEY = (userId: string) => `recibocerto:import-adiado:${userId}`;
const FILA_KEY = (userId: string) => `recibocerto:recibos-fila:${userId}`;
// Cache local dos valores pré-calculados pelo simulador (IRS real, líquido, etc.),
// indexado por id do recibo. É a ÚNICA fonte destes valores no dashboard: o
// Supabase não guarda `_computed` (a tabela `recibos` não tem colunas para isso),
// por isso sem este cache os valores perdiam-se no round-trip à nuvem e o painel
// caía no recálculo de retenção na fonte. Cross-device: ausente → recalcula.
const COMPUTED_KEY = "recibocerto:recibos-computed:v1";

/**
 * Quantos recibos o modo anónimo guarda neste dispositivo (RC-P1-06).
 * A conta é para sincronizar entre dispositivos, não para poder ter memória.
 */
export const LIMITE_LOCAL_ANONIMO = 20;

// ─── Validação de domínio (RC-P1-12) ───────────────────────────────────

function validarRecibo(r: unknown): { ok: true; valor: Recibo } | { ok: false; motivo: string } {
  if (!r || typeof r !== "object") return { ok: false, motivo: "Registo não é um objeto." };
  const o = r as Record<string, unknown>;

  if (!idValido(o.id)) return { ok: false, motivo: "Identificador em falta." };
  if (!dataIsoValida(o.data)) return { ok: false, motivo: "Data inválida ou inexistente no calendário." };
  if (!montanteValido(o.valor)) return { ok: false, motivo: "Valor não é um montante válido." };
  if (!pertence(o.tipo, TIPOS_ATIVIDADE)) return { ok: false, motivo: "Tipo de atividade desconhecido." };
  if (!pertence(o.regiao, REGIOES)) return { ok: false, motivo: "Região desconhecida." };
  if (!pertence(o.regimeIVA, REGIMES_IVA)) return { ok: false, motivo: "Regime de IVA desconhecido." };
  if (!pertence(o.baseSS, BASES_SS)) return { ok: false, motivo: "Base de Segurança Social desconhecida." };

  return {
    ok: true,
    valor: {
      id: o.id,
      data: o.data,
      cliente: typeof o.cliente === "string" ? o.cliente : "",
      valor: o.valor,
      tipo: o.tipo,
      atividade: typeof o.atividade === "string" ? o.atividade : undefined,
      regiao: o.regiao,
      regimeIVA: o.regimeIVA,
      baseSS: o.baseSS,
      dispensaRetencao: !!o.dispensaRetencao,
      ...(timestampIsoValido(o.criadoEm) ? { criadoEm: o.criadoEm } : {}),
      ...(timestampIsoValido(o.atualizadoEm) ? { atualizadoEm: o.atualizadoEm } : {}),
      ...(parseComputed(o._computed) ? { _computed: parseComputed(o._computed)! } : {}),
    },
  };
}

/** Valida um recibo por gravar (sem `id`, atribuído no momento). */
export function validarNovoRecibo(novo: NovoRecibo): Resultado<NovoRecibo> {
  const v = validarRecibo({ ...novo, id: "provisorio" });
  if (!v.ok) return falha({ tipo: "invalido", mensagem: v.motivo });
  const { id: _id, ...resto } = v.valor;
  void _id;
  return ok(resto);
}

// ─── localStorage ──────────────────────────────────────────────────────

function readLocalTriado(): Triagem<Recibo> {
  const raw = lerChave(STORAGE_KEY);
  if (!raw) return { validos: [], invalidos: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { validos: [], invalidos: [] };
    return triar<Recibo>(parsed, validarRecibo);
  } catch {
    return { validos: [], invalidos: [] };
  }
}

function readLocal(): Recibo[] {
  return readLocalTriado().validos;
}

/** Grava e devolve a falha em vez de a ignorar (quota, modo privado). */
function writeLocal(recibos: Recibo[]): Resultado<void> {
  try {
    return gravarChave(STORAGE_KEY, JSON.stringify(recibos));
  } catch (e) {
    return falha(erroLocal(e));
  }
}

function clearLocal(): void {
  removerChave(STORAGE_KEY);
}

// ─── Cache de valores pré-calculados (sobrevive ao round-trip do Supabase) ──
function readComputedCache(): Record<string, ReciboComputed> {
  const raw = lerChave(COMPUTED_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, ReciboComputed>) : {};
  } catch {
    return {};
  }
}

function writeComputedCache(cache: Record<string, ReciboComputed>): void {
  gravarChave(COMPUTED_KEY, JSON.stringify(cache));
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

/**
 * Reanexa `_computed` (do cache local) a recibos vindos da nuvem ou do
 * localStorage.
 *
 * Uma leitura e, quando muito, uma escrita — para a coleção toda. A versão
 * anterior chamava `cacheComputed` dentro do `map`, e cada chamada lia e
 * reserializava o cache inteiro: com 500 recibos eram 500 leituras e 500
 * `JSON.stringify` do objeto completo, a cada carregamento do painel
 * (RC-P3-01).
 */
function enriquecerComputed(recibos: Recibo[]): Recibo[] {
  const cache = readComputedCache();
  let mudou = false;
  const saida = recibos.map((r) => {
    if (r._computed) {
      // Garante que o cache fica sincronizado quando o valor já vem embutido (local).
      if (!cache[r.id]) {
        cache[r.id] = r._computed;
        mudou = true;
      }
      return r;
    }
    return cache[r.id] ? { ...r, _computed: cache[r.id] } : r;
  });
  if (mudou) writeComputedCache(cache);
  return saida;
}

function importacaoAdiada(userId: string): boolean {
  return lerChave(IMPORT_ADIADO_KEY(userId)) === "1";
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const ordenar = (xs: Recibo[]) => [...xs].sort((a, b) => b.data.localeCompare(a.data));

// ─── Fila de operações por sincronizar (offline) ───────────────────────

type OperacaoFila =
  | { op: "upsert"; recibo: Recibo }
  | { op: "delete"; id: string };

function lerFila(userId: string): OperacaoFila[] {
  const raw = lerChave(FILA_KEY(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OperacaoFila[]) : [];
  } catch {
    return [];
  }
}

function gravarFila(userId: string, fila: OperacaoFila[]): void {
  if (fila.length === 0) removerChave(FILA_KEY(userId));
  else gravarChave(FILA_KEY(userId), JSON.stringify(fila));
}

/** Acrescenta uma operação à fila, substituindo a anterior do mesmo recibo. */
function enfileirar(userId: string, operacao: OperacaoFila): void {
  const alvo = operacao.op === "upsert" ? operacao.recibo.id : operacao.id;
  const fila = lerFila(userId).filter((o) => (o.op === "upsert" ? o.recibo.id : o.id) !== alvo);
  fila.push(operacao);
  gravarFila(userId, fila);
}

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
  criado_em?: string | null;
  atualizado_em?: string | null;
  // Coluna jsonb opcional (migração 016). Ausente se a migração não foi aplicada.
  computed?: unknown;
}

// Capacidade da BD: a coluna `computed` (migração 016) pode ainda não existir.
// Detetamos uma vez por sessão e degradamos sem partir gravações; num
// recarregamento futuro (após aplicar a migração) volta a ser tentada.
let colunaComputedDisponivel = true;

/** Erro do PostgREST/Postgres por a coluna `computed` não existir no schema. */
function ehErroColunaComputed(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  // PGRST204: coluna não encontrada no schema cache. 42703: undefined_column.
  if (e.code === "PGRST204" || e.code === "42703") return true;
  return (
    typeof e.message === "string" &&
    /computed/i.test(e.message) &&
    /(column|coluna|schema cache)/i.test(e.message)
  );
}

/** Valida e normaliza o jsonb `computed` vindo da BD. */
function parseComputed(v: unknown): ReciboComputed | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
  const irsEstimado = num(o.irsEstimado);
  const segSocial = num(o.segSocial);
  const iva = num(o.iva);
  const liquido = num(o.liquido);
  if (irsEstimado === undefined || segSocial === undefined || iva === undefined || liquido === undefined) {
    return undefined;
  }
  return { irsEstimado, segSocial, iva, liquido };
}

function fromRow(r: ReciboRow): unknown {
  const computed = parseComputed(r.computed);
  return {
    id: r.id,
    data: r.data,
    cliente: r.cliente ?? "",
    valor: Number(r.valor) || 0,
    tipo: r.tipo,
    atividade: r.atividade ?? undefined,
    regiao: r.regiao,
    regimeIVA: r.regime_iva,
    baseSS: r.base_ss,
    dispensaRetencao: !!r.dispensa_retencao,
    ...(r.criado_em ? { criadoEm: r.criado_em } : {}),
    ...(r.atualizado_em ? { atualizadoEm: r.atualizado_em } : {}),
    ...(computed ? { _computed: computed } : {}),
  };
}

function toRow(r: Recibo, userId: string) {
  const base = {
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
    ...(r.criadoEm ? { criado_em: r.criadoEm } : {}),
    ...(r.atualizadoEm ? { atualizado_em: r.atualizadoEm } : {}),
  };
  // Só inclui `computed` enquanto a coluna for tida como disponível — assim, se
  // a migração 016 ainda não foi aplicada, o insert/update não falha.
  return colunaComputedDisponivel ? { ...base, computed: r._computed ?? null } : base;
}

async function cloudList(userId: string): Promise<Recibo[]> {
  const { data, error } = await getSupabase()
    .from("recibos")
    .select("*")
    .eq("user_id", userId)
    .order("data", { ascending: false });
  if (error) throw error;
  return triar<Recibo>((data ?? []).map((r) => fromRow(r as ReciboRow)), validarRecibo).validos;
}

/**
 * Corre uma escrita no Supabase de forma resiliente à coluna `computed`
 * (migração 016): se falhar por a coluna não existir, marca-a indisponível e
 * repete a operação — `toRow` deixa então de a incluir. Assim as gravações
 * nunca partem antes de a migração ser aplicada; o cache local cobre os
 * valores até lá. Após aplicar a migração, a sessão seguinte volta a usá-la.
 */
async function escreverResiliente(op: () => Promise<{ error: unknown }>): Promise<Resultado<void>> {
  try {
    const { error } = await op();
    if (error && colunaComputedDisponivel && ehErroColunaComputed(error)) {
      colunaComputedDisponivel = false;
      const { error: erroRetry } = await op();
      return erroRetry ? falha(erroNuvem(erroRetry)) : ok(undefined);
    }
    return error ? falha(erroNuvem(error)) : ok(undefined);
  } catch (e) {
    return falha(erroNuvem(e));
  }
}

const upsertCloud = (r: Recibo, userId: string) =>
  escreverResiliente(async () => {
    const { error } = await getSupabase().from("recibos").upsert(toRow(r, userId), { onConflict: "id" });
    return { error };
  });

const deleteCloud = (id: string, userId: string) =>
  escreverResiliente(async () => {
    const { error } = await getSupabase().from("recibos").delete().eq("id", id).eq("user_id", userId);
    return { error };
  });

// ─── Hook de acesso (modo duplo) ────────────────────────────────────────

/** Estado de sincronização de um recibo com a nuvem. */
export type EstadoSync = "sincronizado" | "pendente" | "erro";

export function useRecibos() {
  const { user, carregado: authPronto, disponivel } = useAuth();
  const { plano } = useSubscricao();
  const userId = user?.id ?? null;
  const naNuvem = disponivel && !!userId && plano === "plus";

  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [carregado, setCarregado] = useState(false);
  /**
   * Falha ao LER a fonte — diferente de "não há recibos". Sem esta distinção,
   * uma nuvem em baixo aparecia como histórico vazio (RC-P0-03).
   */
  const [erroCarregamento, setErroCarregamento] = useState<ErroPersistencia | null>(null);
  /** Registos recusados pela validação, guardados mas não usados nos cálculos. */
  const [quarentena, setQuarentena] = useState<{ registo: unknown; motivo: string }[]>([]);
  /** Recibos por confirmar na nuvem, por id. */
  const [porSincronizar, setPorSincronizar] = useState<Record<string, EstadoSync>>({});
  /** N.º de recibos locais que podem ser trazidos para a nuvem (só com sessão). */
  const [locaisPorImportar, setLocaisPorImportar] = useState(0);

  // Cópia viva do estado para as mutações lerem sem depender de closures antigas
  // (duas gravações rápidas perdiam uma — RC-P0-03).
  const recibosRef = useRef<Recibo[]>([]);
  recibosRef.current = recibos;

  const marcar = useCallback((id: string, estado: EstadoSync | null) => {
    setPorSincronizar((prev) => {
      if (estado === null) {
        if (!(id in prev)) return prev;
        const { [id]: _ignorado, ...resto } = prev;
        void _ignorado;
        return resto;
      }
      return { ...prev, [id]: estado };
    });
  }, []);

  /** Repete as operações que ficaram em fila por falta de rede. */
  const drenarFila = useCallback(async (uid_: string) => {
    const fila = lerFila(uid_);
    if (fila.length === 0) return;
    const restantes: OperacaoFila[] = [];
    for (const operacao of fila) {
      const r =
        operacao.op === "upsert"
          ? await upsertCloud(operacao.recibo, uid_)
          : await deleteCloud(operacao.id, uid_);
      if (!r.ok && recuperavel(r.erro)) restantes.push(operacao);
      else if (r.ok) marcar(operacao.op === "upsert" ? operacao.recibo.id : operacao.id, null);
    }
    gravarFila(uid_, restantes);
  }, [marcar]);

  // Carregar (espera a resolução da sessão para escolher a fonte).
  useEffect(() => {
    if (!authPronto) return;
    let ativo = true;
    setCarregado(false);
    setErroCarregamento(null);
    // Troca de utilizador não pode herdar o estado do anterior.
    setPorSincronizar({});

    if (naNuvem && userId) {
      drenarFila(userId)
        .then(() => cloudList(userId))
        .then((rows) => {
          if (!ativo) return;
          // O Supabase não guarda `_computed`; reanexa-o do cache local.
          setRecibos(ordenar(enriquecerComputed(rows)));
          setQuarentena([]);
          const locais = readLocal();
          setLocaisPorImportar(importacaoAdiada(userId) ? 0 : locais.length);
          setCarregado(true);
        })
        .catch((e) => {
          if (!ativo) return;
          // Não cair para uma lista vazia: seria indistinguível de "não tens
          // recibos" e a pessoa pensaria que perdeu o histórico.
          setErroCarregamento(erroNuvem(e));
          setCarregado(true);
        });
    } else {
      const t = readLocalTriado();
      setRecibos(ordenar(enriquecerComputed(t.validos)));
      setQuarentena(t.invalidos);
      setLocaisPorImportar(0);
      setCarregado(true);
    }

    return () => {
      ativo = false;
    };
  }, [authPronto, naNuvem, userId, drenarFila]);

  /**
   * Aplica uma transformação ao conjunto e persiste-a, resolvendo só depois de
   * confirmação durável. A transformação recebe o estado MAIS RECENTE (não uma
   * closure), por isso duas ações rápidas compõem-se em vez de se atropelarem.
   */
  const persistir = useCallback(
    async (
      transformar: (atuais: Recibo[]) => Recibo[],
      opCloud: (() => Promise<Resultado<void>>) | null,
      filaSeOffline: OperacaoFila | null,
    ): Promise<Resultado<void>> => {
      const anteriores = recibosRef.current;
      const proximos = ordenar(transformar(anteriores));

      if (!naNuvem) {
        const r = writeLocal(proximos);
        if (!r.ok) return r; // Estado intacto: nada mudou visualmente.
        recibosRef.current = proximos;
        setRecibos(proximos);
        return ok(undefined);
      }

      // Nuvem: mostra já (a pessoa vê a ação a acontecer) mas marca o registo
      // como pendente e desfaz se a escrita não confirmar.
      recibosRef.current = proximos;
      setRecibos(proximos);
      const alvo = filaSeOffline ? (filaSeOffline.op === "upsert" ? filaSeOffline.recibo.id : filaSeOffline.id) : null;
      if (alvo) marcar(alvo, "pendente");

      const r = opCloud ? await opCloud() : ok(undefined);

      if (r.ok) {
        if (alvo) marcar(alvo, null);
        return ok(undefined);
      }

      // Rede em baixo: a alteração é real neste dispositivo e sobe depois.
      if (recuperavel(r.erro) && filaSeOffline && userId) {
        enfileirar(userId, filaSeOffline);
        if (alvo) marcar(alvo, "pendente");
        return ok(undefined);
      }

      // Falha definitiva: reverter para não deixar na ecrã algo que não existe.
      recibosRef.current = anteriores;
      setRecibos(anteriores);
      if (alvo) marcar(alvo, null);
      return r;
    },
    [naNuvem, userId, marcar],
  );

  const adicionar = useCallback(
    async (novo: NovoRecibo): Promise<Resultado<Recibo>> => {
      const v = validarNovoRecibo(novo);
      if (!v.ok) return v;

      // Local-first: sem conta há memória neste dispositivo, até um limite
      // explícito (RC-P1-06).
      if (!naNuvem && recibosRef.current.length >= LIMITE_LOCAL_ANONIMO) {
        return falha({
          tipo: "limite",
          mensagem: `Este dispositivo guarda ${LIMITE_LOCAL_ANONIMO} recibos sem conta. Cria uma conta para sincronizares o histórico completo.`,
        });
      }

      const agora = new Date().toISOString();
      const recibo: Recibo = { ...v.valor, id: uid(), criadoEm: agora, atualizadoEm: agora };
      cacheComputed(recibo.id, recibo._computed);

      const r = await persistir(
        (atuais) => [recibo, ...atuais],
        naNuvem && userId ? () => upsertCloud(recibo, userId) : null,
        { op: "upsert", recibo },
      );
      return r.ok ? ok(recibo) : r;
    },
    [naNuvem, userId, persistir],
  );

  const atualizar = useCallback(
    async (id: string, patch: NovoRecibo): Promise<Resultado<Recibo>> => {
      const v = validarNovoRecibo(patch);
      if (!v.ok) return v;

      const anterior = recibosRef.current.find((r) => r.id === id);
      const recibo: Recibo = {
        ...v.valor,
        id,
        criadoEm: anterior?.criadoEm ?? new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };
      cacheComputed(id, recibo._computed);

      const r = await persistir(
        (atuais) => atuais.map((x) => (x.id === id ? recibo : x)),
        naNuvem && userId ? () => upsertCloud(recibo, userId) : null,
        { op: "upsert", recibo },
      );
      return r.ok ? ok(recibo) : r;
    },
    [naNuvem, userId, persistir],
  );

  const remover = useCallback(
    async (id: string): Promise<Resultado<void>> => {
      const r = await persistir(
        (atuais) => atuais.filter((x) => x.id !== id),
        naNuvem && userId ? () => deleteCloud(id, userId) : null,
        { op: "delete", id },
      );
      if (r.ok) dropComputed(id);
      return r;
    },
    [naNuvem, userId, persistir],
  );

  const limpar = useCallback(async (): Promise<Resultado<void>> => {
    const r = await persistir(
      () => [],
      naNuvem && userId
        ? () =>
            escreverResiliente(async () => {
              const { error } = await getSupabase().from("recibos").delete().eq("user_id", userId);
              return { error };
            })
        : null,
      null,
    );
    if (r.ok) writeComputedCache({});
    return r;
  }, [naNuvem, userId, persistir]);

  // Trazer os recibos locais para a conta na nuvem (idempotente via upsert).
  const importarLocais = useCallback(async (): Promise<Resultado<number>> => {
    if (!naNuvem || !userId) {
      return falha({ tipo: "permissao", mensagem: "Entra na tua conta para trazeres os recibos para a nuvem." });
    }
    const locais = readLocal();
    if (locais.length === 0) {
      setLocaisPorImportar(0);
      return ok(0);
    }
    const r = await escreverResiliente(async () => {
      const { error } = await getSupabase()
        .from("recibos")
        .upsert(locais.map((x) => toRow(x, userId)), { onConflict: "id" });
      return { error };
    });
    if (!r.ok) return r;

    // Só limpa o local DEPOIS de a nuvem confirmar.
    clearLocal();
    setLocaisPorImportar(0);
    try {
      const rows = ordenar(enriquecerComputed(await cloudList(userId)));
      recibosRef.current = rows;
      setRecibos(rows);
    } catch (e) {
      setErroCarregamento(erroNuvem(e));
    }
    return ok(locais.length);
  }, [naNuvem, userId]);

  // Adiar a importação (não volta a perguntar a este utilizador neste dispositivo).
  const adiarImportacao = useCallback(() => {
    if (userId) gravarChave(IMPORT_ADIADO_KEY(userId), "1");
    setLocaisPorImportar(0);
  }, [userId]);

  const anoFiscal = anoFiscalCorrente();
  /** Resumo SEMPRE escopado ao ano corrente (RC-P0-01). */
  const resumo = useMemo(() => resumoDoAno(recibos, anoFiscal), [recibos, anoFiscal]);

  return {
    recibos,
    carregado,
    naNuvem,
    erroCarregamento,
    quarentena,
    porSincronizar,
    anoFiscal,
    adicionar,
    atualizar,
    remover,
    limpar,
    resumo,
    locaisPorImportar,
    importarLocais,
    adiarImportacao,
    limiteLocal: naNuvem ? null : LIMITE_LOCAL_ANONIMO,
  };
}
