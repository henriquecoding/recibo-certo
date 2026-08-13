"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Repositório UNIFICADO de cenários de simulação — MODO DUPLO + TIER.
//
//  Guarda um instantâneo COMPLETO (todos os campos preenchidos/selecionados,
//  não só o resultado) de qualquer simulador suportado, para o utilizador
//  reabrir/importar mais tarde. É o coração da página de Gestão.
//
//  · Grátis (anónimo ou sem Plus) → localStorage, até LIMITE_FREE cenários.
//  · Plus (com sessão + subscrição) → tabela `cenarios` (nuvem, ilimitado,
//    sincronizado entre dispositivos).
//  A interface (`useCenarios`) é a mesma nos dois modos.
//
//  Três correções da auditoria vivem aqui:
//
//  · gravar devolve `Resultado` e só resolve depois de confirmação durável.
//    Antes o insert na nuvem seguia sem `await` e os erros iam para a consola:
//    um cenário de heranças era recusado pela constraint e a interface dizia
//    "Guardado" na mesma (RC-P0-03 + RC-P0-04);
//  · uma falha a LER a nuvem deixa de cair silenciosamente para os dados
//    locais — que não são os mesmos — e passa a ser um erro visível;
//  · os cenários locais têm migração para a nuvem, como os recibos já tinham
//    (RC-P1-07).
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { idValido, timestampIsoValido, pertence, triar } from "@/lib/validacao-dominio";
import {
  ok,
  falha,
  erroNuvem,
  recuperavel,
  lerChave,
  gravarChave,
  removerChave,
  type ErroPersistencia,
  type Resultado,
} from "@/lib/store/persistencia";

export type TipoCenario = "recibos" | "vencimento" | "empresa" | "irs" | "herancas";

/**
 * Fonte ÚNICA dos tipos de cenário. A página de gestão renderiza a partir
 * daqui — tinha uma lista à parte que esquecia `herancas`, e um cenário
 * guardado ficava invisível apesar de continuar a contar para o limite
 * gratuito (RC-P0-04). A constraint SQL espelha exatamente estas chaves
 * (migração 032).
 */
export const META_TIPO_CENARIO: Record<TipoCenario, { label: string; sub: string; rota: string; icone: string }> = {
  recibos: { label: "Recibos verdes", sub: "Trabalho independente", rota: "/dashboard/recibos-verdes", icone: "Invoice" },
  vencimento: { label: "Recibo de vencimento", sub: "Trabalho por conta de outrem", rota: "/dashboard/recibo-vencimento", icone: "Wallet" },
  empresa: { label: "Abrir empresa", sub: "Sociedade / unipessoal", rota: "/dashboard/empresa", icone: "Building" },
  irs: { label: "Simulador de IRS", sub: "Declaração anual", rota: "/dashboard/simulador", icone: "Calculator" },
  herancas: { label: "Heranças e sucessões", sub: "Partilha e Imposto do Selo", rota: "/dashboard/herancas", icone: "Scale" },
};

export const TIPOS_CENARIO = Object.keys(META_TIPO_CENARIO) as TipoCenario[];

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
  /** Versão do formato de `dados`, para os adaptadores de importação. */
  versao: number;
  /** Números-chave para apresentação (cartões). */
  resumo: ResumoCenario;
  /** Instantâneo COMPLETO dos inputs — para reabrir/importar. Forma livre por tipo. */
  dados: Record<string, unknown>;
}

export type NovoCenario = Omit<Cenario, "id" | "criadoEm" | "versao"> & { versao?: number };

/** Versão corrente do formato de `dados`. */
export const CENARIO_VERSAO = 1;

/** Limite de cenários guardados no plano grátis (local). Plus é ilimitado. */
export const LIMITE_FREE = 1;

const STORAGE_KEY = "recibocerto:cenarios:v1";
const MIGRACAO_ADIADA_KEY = (userId: string) => `recibocerto:cenarios-migracao-adiada:${userId}`;

// ─── Validação ──────────────────────────────────────────────────────────

function validarCenario(c: unknown): { ok: true; valor: Cenario } | { ok: false; motivo: string } {
  if (!c || typeof c !== "object") return { ok: false, motivo: "Registo não é um objeto." };
  const o = c as Record<string, unknown>;
  if (!idValido(o.id)) return { ok: false, motivo: "Identificador em falta." };
  // Um tipo desconhecido partia a leitura de META_TIPO_CENARIO a jusante.
  if (!pertence(o.tipo, TIPOS_CENARIO)) return { ok: false, motivo: "Tipo de cenário desconhecido." };
  if (!timestampIsoValido(o.criadoEm)) return { ok: false, motivo: "Data de criação inválida." };
  return {
    ok: true,
    valor: {
      id: o.id,
      tipo: o.tipo,
      nome: typeof o.nome === "string" ? o.nome : "",
      criadoEm: o.criadoEm,
      versao: typeof o.versao === "number" && Number.isInteger(o.versao) ? o.versao : 1,
      resumo:
        o.resumo && typeof o.resumo === "object"
          ? (o.resumo as ResumoCenario)
          : { destaque: 0, destaqueLabel: "", linhas: [] },
      dados: o.dados && typeof o.dados === "object" ? (o.dados as Record<string, unknown>) : {},
    },
  };
}

function readLocal(): Cenario[] {
  const raw = lerChave(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? triar<Cenario>(parsed, validarCenario).validos : [];
  } catch {
    return [];
  }
}

function writeLocal(xs: Cenario[]): Resultado<void> {
  return gravarChave(STORAGE_KEY, JSON.stringify(xs));
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

function fromRow(r: CenarioRow): unknown {
  const dados = r.dados ?? {};
  return {
    id: r.id,
    tipo: r.tipo,
    nome: r.nome ?? "",
    // A versão viaja dentro de `dados` — a tabela não tem coluna para ela e
    // acrescentá-la agora obrigaria a outra migração sem ganho real.
    versao: typeof dados.__versao === "number" ? dados.__versao : 1,
    resumo: r.resumo ?? { destaque: 0, destaqueLabel: "", linhas: [] },
    dados,
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
    dados: { ...c.dados, __versao: c.versao },
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
  return triar<Cenario>((data ?? []).map((r) => fromRow(r as CenarioRow)), validarCenario).validos;
}

async function upsertCloud(c: Cenario, userId: string): Promise<Resultado<void>> {
  try {
    const { error } = await getSupabase().from("cenarios").upsert(toRow(c, userId), { onConflict: "id" });
    return error ? falha(erroNuvem(error)) : ok(undefined);
  } catch (e) {
    return falha(erroNuvem(e));
  }
}

// ─── Hook de acesso (modo duplo + tiering) ──────────────────────────────
export function useCenarios() {
  const { user, carregado: authPronto, disponivel } = useAuth();
  const { plano } = useSubscricao();
  const userId = user?.id ?? null;
  const naNuvem = disponivel && !!userId && plano === "plus";

  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<ErroPersistencia | null>(null);
  /** Cenários locais que podem subir para a conta (RC-P1-07). */
  const [locaisPorImportar, setLocaisPorImportar] = useState(0);

  const cenariosRef = useRef<Cenario[]>([]);
  cenariosRef.current = cenarios;

  useEffect(() => {
    if (!authPronto) return;
    let ativo = true;
    setCarregado(false);
    setErroCarregamento(null);

    if (naNuvem && userId) {
      cloudList(userId)
        .then((rows) => {
          if (!ativo) return;
          setCenarios(ordenar(rows));
          // Inventário local ANTES de qualquer troca de origem: sem isto, os
          // cenários locais desapareciam da vista ao passar a Plus.
          const locais = readLocal();
          const jaAdiado = lerChave(MIGRACAO_ADIADA_KEY(userId)) === "1";
          const idsNaNuvem = new Set(rows.map((r) => r.id));
          setLocaisPorImportar(jaAdiado ? 0 : locais.filter((l) => !idsNaNuvem.has(l.id)).length);
          setCarregado(true);
        })
        .catch((e) => {
          if (!ativo) return;
          // Cair para os locais mascarava a falha e mostrava uma coleção
          // diferente com o mesmo aspeto.
          setErroCarregamento(erroNuvem(e));
          setCenarios([]);
          setCarregado(true);
        });
    } else {
      setCenarios(ordenar(readLocal()));
      setLocaisPorImportar(0);
      setCarregado(true);
    }

    return () => { ativo = false; };
  }, [authPronto, naNuvem, userId]);

  const limiteAtingido = !naNuvem && cenarios.length >= LIMITE_FREE;

  // Quem guardou cenários quando o Grátis permitia três continua a tê-los:
  // apagá-los em silêncio seria destruir trabalho que ninguém pediu para
  // destruir. Mas então a frase «uma amostra» deixa de ser verdadeira para
  // essa pessoa — por isso o excedente é contado e dito em voz alta.
  const excedentesLegado = naNuvem ? 0 : Math.max(0, cenarios.length - LIMITE_FREE);

  const guardar = useCallback(
    async (novo: NovoCenario): Promise<Resultado<Cenario>> => {
      if (!naNuvem && cenariosRef.current.length >= LIMITE_FREE) {
        return falha({
          tipo: "limite",
          mensagem:
            plano === "plus"
              ? "Inicia sessão para sincronizar os teus cenários na nuvem."
              : cenariosRef.current.length > LIMITE_FREE
                ? `Tens ${cenariosRef.current.length} cenários guardados de antes — não apagámos nenhum. O plano grátis guarda ${LIMITE_FREE}; apaga até ficares com ${LIMITE_FREE} para guardares um novo, ou passa ao Plus para os teres todos na nuvem.`
                : `O plano grátis guarda ${LIMITE_FREE} cenário. Passa ao Plus para guardares todos os cenários, sincronizados na nuvem.`,
        });
      }

      const cenario: Cenario = {
        ...novo,
        versao: novo.versao ?? CENARIO_VERSAO,
        id: uid(),
        criadoEm: new Date().toISOString(),
      };
      const v = validarCenario(cenario);
      if (!v.ok) return falha({ tipo: "invalido", mensagem: v.motivo });

      const anteriores = cenariosRef.current;
      const proximos = ordenar([cenario, ...anteriores]);

      if (naNuvem && userId) {
        // Espera a confirmação. Um tipo recusado pela constraint deixa de
        // aparecer como guardado.
        const r = await upsertCloud(cenario, userId);
        if (!r.ok) return r;
        cenariosRef.current = proximos;
        setCenarios(proximos);
        return ok(cenario);
      }

      const local = writeLocal(proximos);
      if (!local.ok) return local;
      cenariosRef.current = proximos;
      setCenarios(proximos);
      return ok(cenario);
    },
    [naNuvem, userId, plano],
  );

  const remover = useCallback(
    async (id: string): Promise<Resultado<void>> => {
      const anteriores = cenariosRef.current;
      const proximos = anteriores.filter((c) => c.id !== id);

      if (naNuvem && userId) {
        try {
          const { error } = await getSupabase().from("cenarios").delete().eq("id", id).eq("user_id", userId);
          if (error) return falha(erroNuvem(error));
        } catch (e) {
          return falha(erroNuvem(e));
        }
      } else {
        const local = writeLocal(proximos);
        if (!local.ok) return local;
      }

      cenariosRef.current = proximos;
      setCenarios(proximos);
      return ok(undefined);
    },
    [naNuvem, userId],
  );

  /** Traz os cenários locais para a conta, sem substituir nada em silêncio. */
  const importarLocais = useCallback(async (): Promise<Resultado<number>> => {
    if (!naNuvem || !userId) {
      return falha({ tipo: "permissao", mensagem: "Entra na tua conta para trazeres os cenários para a nuvem." });
    }
    const locais = readLocal();
    if (locais.length === 0) {
      setLocaisPorImportar(0);
      return ok(0);
    }
    // Upsert por id: idempotente e sem duplicados se a operação for repetida.
    for (const c of locais) {
      const r = await upsertCloud(c, userId);
      if (!r.ok && !recuperavel(r.erro)) return r;
      if (!r.ok) return r;
    }
    removerChave(STORAGE_KEY);
    setLocaisPorImportar(0);
    try {
      const rows = ordenar(await cloudList(userId));
      cenariosRef.current = rows;
      setCenarios(rows);
    } catch (e) {
      setErroCarregamento(erroNuvem(e));
    }
    return ok(locais.length);
  }, [naNuvem, userId]);

  /** Manter os cenários só neste dispositivo — uma escolha, não um acidente. */
  const adiarImportacao = useCallback(() => {
    if (userId) gravarChave(MIGRACAO_ADIADA_KEY(userId), "1");
    setLocaisPorImportar(0);
  }, [userId]);

  return {
    cenarios,
    carregado,
    naNuvem,
    plano,
    erroCarregamento,
    limite: LIMITE_FREE,
    limiteAtingido,
    excedentesLegado,
    locaisPorImportar,
    guardar,
    remover,
    importarLocais,
    adiarImportacao,
  };
}

// ─── Handoff de reabertura (gestão → simulador) ─────────────────────────
// A página de gestão escreve o instantâneo aqui e navega para o simulador;
// o simulador lê na montagem, hidrata o estado e limpa a chave.
const PENDENTE_KEY = (tipo: TipoCenario) => `recibocerto:cenario-pendente:${tipo}`;

export function marcarReabertura(c: Cenario): void {
  gravarChave(PENDENTE_KEY(c.tipo), JSON.stringify({ ...c.dados, __versao: c.versao }));
}

export function consumirReabertura(tipo: TipoCenario): Record<string, unknown> | null {
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
export function haReabertura(tipo: TipoCenario): boolean {
  return lerChave(PENDENTE_KEY(tipo)) !== null;
}
