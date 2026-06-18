"use client";

// ─────────────────────────────────────────────────────────────────────
//  Tiering da auditoria de recibo de vencimento — VINCULADO À CONTA.
//  · A 1.ª auditoria é GRÁTIS, mas só para utilizadores autenticados.
//  · As auditorias seguintes exigem plano Pro.
//  · Pro → auditorias ilimitadas.
//  O "já usei a auditoria grátis" vive na tabela `auditorias_recibo`
//  (uma linha por auditoria), por isso não se contorna mudando de
//  dispositivo ou limpando o browser — está ligado ao user_id.
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";

/** Auditorias gratuitas por conta (fora do plano Pro). */
export const AUDITORIAS_GRATIS = 1;

export interface RegistoAuditoria {
  salarioBruto: number;
  dependentes: number;
  irsDeclarado: number;
  ssDeclarado: number;
  tudoOk: boolean;
}

export function useAuditorias() {
  const { user, carregado: authPronto, disponivel, abrirModal } = useAuth();
  const { plano, carregado: subPronto } = useSubscricao();
  const userId = user?.id ?? null;
  const ehPro = plano === "pro";
  const autenticado = disponivel && !!userId;

  const [usadas, setUsadas] = useState(0);
  const [contado, setContado] = useState(false);

  useEffect(() => {
    if (!authPronto) return;
    if (!autenticado || !userId) {
      setUsadas(0);
      setContado(true);
      return;
    }
    let ativo = true;
    setContado(false);
    getSupabase()
      .from("auditorias_recibo")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .then(({ count, error }) => {
        if (!ativo) return;
        if (error) console.error("[auditorias] erro ao contar:", error);
        setUsadas(count ?? 0);
        setContado(true);
      });
    return () => {
      ativo = false;
    };
  }, [authPronto, autenticado, userId]);

  const gratisRestantes = Math.max(0, AUDITORIAS_GRATIS - usadas);
  const podeAuditar = autenticado && (ehPro || gratisRestantes > 0);
  const precisaLogin = !autenticado;
  const precisaPro = autenticado && !ehPro && gratisRestantes <= 0;

  /** Regista a auditoria na conta (consome a auditoria grátis dos não-Pro). */
  const registar = useCallback(
    async (a: RegistoAuditoria) => {
      if (!autenticado || !userId) return;
      setUsadas((n) => n + 1); // otimista — evita auditar duas vezes de graça
      const { error } = await getSupabase().from("auditorias_recibo").insert({
        user_id: userId,
        salario_bruto: a.salarioBruto,
        dependentes: a.dependentes,
        irs_declarado: a.irsDeclarado,
        ss_declarado: a.ssDeclarado,
        tudo_ok: a.tudoOk,
      });
      if (error) console.error("[auditorias] erro ao registar:", error);
    },
    [autenticado, userId]
  );

  return {
    /** Estado totalmente resolvido (auth + subscrição + contagem). */
    carregado: authPronto && subPronto && contado,
    autenticado,
    ehPro,
    usadas,
    gratisRestantes,
    limiteGratis: AUDITORIAS_GRATIS,
    /** Pode correr uma auditoria agora. */
    podeAuditar,
    /** Falta autenticar para a auditoria grátis. */
    precisaLogin,
    /** Já usou a grátis e não é Pro → precisa de Pro. */
    precisaPro,
    registar,
    abrirLogin: () => abrirModal("entrar"),
  };
}
