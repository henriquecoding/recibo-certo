"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabase, supabaseConfigurado } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import {
  nivelParaXP,
  xpProgressoPct,
  calcularEnergiaAtual,
  calcularXPSessao,
  ENERGIA_DIARIA,
  type NivelInfo,
} from "@/lib/quiz-fiscal/progresso";
import type { ResultadoQuiz } from "@/hooks/useQuizFiscal";

// ── Tipos públicos ────────────────────────────────────────────────────────

export interface SessaoHistorico {
  id: string;
  modo: "normal" | "guiado";
  categoria?: string;
  totalPerguntas: number;
  acertos: number;
  pontos: number;
  xpGanho: number;
  streakMaximo: number;
  tempoTotalSeg: number;
  criadoEm: string;
}

export interface RegistrarSessaoResult {
  xpGanho: number;
  levelUp: boolean;
  nivelAnterior: NivelInfo;
  nivelNovo: NivelInfo;
}

/** Nível a partir do qual a energia é ilimitada (sem necessidade de plano pago). */
export const NIVEL_ENERGIA_ILIMITADA = 7;

export interface QuizProgressoReturn {
  xp: number;
  nivel: NivelInfo;
  xpNivelPct: number;
  streakRecord: number;
  energiaRestante: number;
  energiaTotal: number;
  /** true se o utilizador tem energia ilimitada (nível >= 7 ou Pro). */
  energiaIlimitada: boolean;
  sessoes: SessaoHistorico[];
  carregado: boolean;
  naNuvem: boolean;
  isPro: boolean;

  registrarSessao: (
    resultado: ResultadoQuiz,
    pontosGanhos: number,
    streakMaximo: number,
    tempoTotalSeg: number
  ) => Promise<RegistrarSessaoResult>;

  /** Atribui XP avulso (ex.: recompensa por reportar um erro). */
  adicionarXpBonus: (quantidade: number) => Promise<RegistrarSessaoResult>;

  consumirEnergia: () => void;
  refrescarEnergia: () => void;
}

// ── localStorage keys ─────────────────────────────────────────────────────

const LS_PROGRESSO = "quiz_progresso_v1";
const LS_SESSOES = "quiz_sessoes_v1";
const MAX_SESSOES_LOCAL = 50;

interface ProgressoLocal {
  xp: number;
  streakRecord: number;
  energiaRestante: number;
  energiaResetAt: string | null;
}

const PROGRESSO_DEFAULT: ProgressoLocal = {
  xp: 0,
  streakRecord: 0,
  energiaRestante: ENERGIA_DIARIA,
  energiaResetAt: null,
};

function lerProgressoLocal(): ProgressoLocal {
  if (typeof window === "undefined") return PROGRESSO_DEFAULT;
  try {
    const raw = localStorage.getItem(LS_PROGRESSO);
    return raw ? { ...PROGRESSO_DEFAULT, ...JSON.parse(raw) } : PROGRESSO_DEFAULT;
  } catch { return PROGRESSO_DEFAULT; }
}

function gravarProgressoLocal(p: ProgressoLocal) {
  try { localStorage.setItem(LS_PROGRESSO, JSON.stringify(p)); } catch { /* noop */ }
}

function lerSessoesLocal(): SessaoHistorico[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_SESSOES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function gravarSessoesLocal(sessoes: SessaoHistorico[]) {
  try {
    // Mantém só as mais recentes
    localStorage.setItem(LS_SESSOES, JSON.stringify(sessoes.slice(0, MAX_SESSOES_LOCAL)));
  } catch { /* noop */ }
}

// ── Hook principal ────────────────────────────────────────────────────────

export function useQuizProgresso(): QuizProgressoReturn {
  const { user } = useAuth();
  const naNuvem = !!user && supabaseConfigurado();

  const [xp, setXp] = useState(0);
  const [streakRecord, setStreakRecord] = useState(0);
  const [energiaRestante, setEnergiaRestante] = useState(ENERGIA_DIARIA);
  const [energiaResetAt, setEnergiaResetAt] = useState<string | null>(null);
  const [sessoes, setSessoes] = useState<SessaoHistorico[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [isPro, setIsPro] = useState(false);

  // ── Carga inicial ──────────────────────────────────────────────────────

  useEffect(() => {
    if (naNuvem) {
      carregarDaBase().catch(() => carregarDoLocal());
    } else {
      carregarDoLocal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naNuvem]);

  function carregarDoLocal() {
    const prog = lerProgressoLocal();
    const { energia, resetAt } = calcularEnergiaAtual(prog.energiaRestante, prog.energiaResetAt);

    setXp(prog.xp);
    setStreakRecord(prog.streakRecord);
    setEnergiaRestante(energia);
    setEnergiaResetAt(resetAt);
    setSessoes(lerSessoesLocal());
    setCarregado(true);

    // Persiste reset de energia se necessário
    if (energia !== prog.energiaRestante || resetAt !== prog.energiaResetAt) {
      gravarProgressoLocal({ ...prog, energiaRestante: energia, energiaResetAt: resetAt });
    }
  }

  async function carregarDaBase() {
    if (!user) return;
    const sb = getSupabase();

    const [{ data: perfil }, { data: historico }, { data: subs }] = await Promise.all([
      sb.from("quiz_profiles").select("*").eq("id", user.id).maybeSingle(),
      sb.from("quiz_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("criado_em", { ascending: false })
        .limit(50),
      sb.from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .limit(1),
    ]);

    setIsPro(!!(subs && subs.length > 0));

    if (perfil) {
      const { energia, resetAt } = calcularEnergiaAtual(
        perfil.energia_restante,
        perfil.energia_reset_at
      );
      setXp(perfil.xp ?? 0);
      setStreakRecord(perfil.streak_record ?? 0);
      setEnergiaRestante(energia);
      setEnergiaResetAt(resetAt);

      // Persiste reset de energia
      if (energia !== perfil.energia_restante || resetAt !== perfil.energia_reset_at) {
        await sb.from("quiz_profiles").update({
          energia_restante: energia,
          energia_reset_at: resetAt,
          atualizado_em: new Date().toISOString(),
        }).eq("id", user.id);
      }
    }

    if (historico) {
      setSessoes(historico.map(s => ({
        id: s.id,
        modo: s.modo,
        categoria: s.categoria ?? undefined,
        totalPerguntas: s.total_perguntas,
        acertos: s.acertos,
        pontos: s.pontos,
        xpGanho: s.xp_ganho,
        streakMaximo: s.streak_maximo,
        tempoTotalSeg: s.tempo_total_seg,
        criadoEm: s.criado_em,
      })));
    }

    setCarregado(true);
  }

  // ── Registar sessão concluída ──────────────────────────────────────────

  const registrarSessao = useCallback(async (
    resultado: ResultadoQuiz,
    pontosGanhos: number,
    streakMaximo: number,
    tempoTotalSeg: number
  ): Promise<RegistrarSessaoResult> => {
    const xpGanho = calcularXPSessao({
      pontos: pontosGanhos,
      acertos: resultado.acertos,
      total: resultado.totalPerguntas,
    });

    const nivelAnterior = nivelParaXP(xp);
    const novoXP = xp + xpGanho;
    const nivelNovo = nivelParaXP(novoXP);
    const levelUp = nivelNovo.nivel > nivelAnterior.nivel;
    const novoRecord = Math.max(streakRecord, streakMaximo);

    const novaSessao: SessaoHistorico = {
      id: crypto.randomUUID(),
      modo: resultado.modo,
      categoria: resultado.porCategoria.length === 1 ? resultado.porCategoria[0].categoria : undefined,
      totalPerguntas: resultado.totalPerguntas,
      acertos: resultado.acertos,
      pontos: pontosGanhos,
      xpGanho,
      streakMaximo,
      tempoTotalSeg,
      criadoEm: new Date().toISOString(),
    };

    // Atualiza estado local
    setXp(novoXP);
    setStreakRecord(novoRecord);
    setSessoes(prev => [novaSessao, ...prev].slice(0, MAX_SESSOES_LOCAL));

    if (naNuvem && user) {
      const sb = getSupabase();

      // Upsert quiz_profile
      await sb.from("quiz_profiles").upsert({
        id: user.id,
        xp: novoXP,
        streak_record: novoRecord,
        energia_restante: Math.max(0, energiaRestante),
        energia_reset_at: energiaResetAt,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: "id" });

      // Inserir sessão
      await sb.from("quiz_sessions").insert({
        user_id: user.id,
        modo: novaSessao.modo,
        categoria: novaSessao.categoria ?? null,
        total_perguntas: novaSessao.totalPerguntas,
        acertos: novaSessao.acertos,
        pontos: novaSessao.pontos,
        xp_ganho: novaSessao.xpGanho,
        streak_maximo: novaSessao.streakMaximo,
        tempo_total_seg: novaSessao.tempoTotalSeg,
      });
    } else {
      // Persiste em localStorage
      const prog = lerProgressoLocal();
      gravarProgressoLocal({ ...prog, xp: novoXP, streakRecord: novoRecord });
      gravarSessoesLocal([novaSessao, ...lerSessoesLocal()]);
    }

    return { xpGanho, levelUp, nivelAnterior, nivelNovo };
  }, [xp, streakRecord, energiaRestante, energiaResetAt, naNuvem, user]);

  // ── XP avulso (recompensa por reportar erro, etc.) ─────────────────────

  const adicionarXpBonus = useCallback(async (
    quantidade: number
  ): Promise<RegistrarSessaoResult> => {
    const xpGanho = Math.max(0, Math.round(quantidade));
    const nivelAnterior = nivelParaXP(xp);
    const novoXP = xp + xpGanho;
    const nivelNovo = nivelParaXP(novoXP);
    const levelUp = nivelNovo.nivel > nivelAnterior.nivel;

    setXp(novoXP);

    if (xpGanho > 0) {
      if (naNuvem && user) {
        const sb = getSupabase();
        await sb.from("quiz_profiles").upsert({
          id: user.id,
          xp: novoXP,
          streak_record: streakRecord,
          energia_restante: Math.max(0, energiaRestante),
          energia_reset_at: energiaResetAt,
          atualizado_em: new Date().toISOString(),
        }, { onConflict: "id" });
      } else {
        const prog = lerProgressoLocal();
        gravarProgressoLocal({ ...prog, xp: novoXP });
      }
    }

    return { xpGanho, levelUp, nivelAnterior, nivelNovo };
  }, [xp, streakRecord, energiaRestante, energiaResetAt, naNuvem, user]);

  // ── Consumir/refrescar energia ─────────────────────────────────────────

  const nivel = nivelParaXP(xp);
  const energiaIlimitada = isPro || nivel.nivel >= NIVEL_ENERGIA_ILIMITADA;

  const consumirEnergia = useCallback(() => {
    if (energiaIlimitada) return;
    const nova = Math.max(0, energiaRestante - 1);
    setEnergiaRestante(nova);

    if (naNuvem && user) {
      const sb = getSupabase();
      sb.from("quiz_profiles").update({
        energia_restante: nova,
        energia_reset_at: energiaResetAt,
        atualizado_em: new Date().toISOString(),
      }).eq("id", user.id).then(() => {/* noop */});
    } else {
      const prog = lerProgressoLocal();
      gravarProgressoLocal({ ...prog, energiaRestante: nova, energiaResetAt });
    }
  }, [energiaIlimitada, energiaRestante, energiaResetAt, naNuvem, user]);

  const refrescarEnergia = useCallback(() => {
    const { energia, resetAt } = calcularEnergiaAtual(energiaRestante, energiaResetAt);
    setEnergiaRestante(energia);
    setEnergiaResetAt(resetAt);
  }, [energiaRestante, energiaResetAt]);

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    xp,
    nivel,
    xpNivelPct: xpProgressoPct(xp),
    streakRecord,
    energiaRestante,
    energiaTotal: ENERGIA_DIARIA,
    energiaIlimitada,
    sessoes,
    carregado,
    naNuvem,
    isPro,
    registrarSessao,
    adicionarXpBonus,
    consumirEnergia,
    refrescarEnergia,
  };
}
