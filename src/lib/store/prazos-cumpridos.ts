"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Estado de cumprimento das obrigações fiscais.
//
//  O calendário mostrava prazos mas não sabia o que já tinha sido entregue
//  (RC-P1-05) — e a saúde fiscal usava na mesma "o próximo prazo" como se
//  fosse um indicador de organização. Sem saber o que está feito, um
//  calendário é uma lista de datas, não um copiloto.
//
//  Guarda uma marca por obrigação e ano. Local sem conta; na nuvem com Plus
//  (tabela `prazos_cumpridos`, migração 032).
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { ok, falha, erroNuvem, lerChave, gravarChave, type Resultado } from "@/lib/store/persistencia";
import { chaveAtiva } from "./cofre";
import { destinoDosDados, aindaSemDestino } from "./persistencia";

// A chave já não é uma constante: depende de quem está a usar o browser.
// Enquanto era global, quem entrasse a seguir noutra conta via os dados de
// quem entrou antes — ver `store/cofre.ts`.
const STORAGE_KEY = () => chaveAtiva("prazos");

/** Chave estável de uma obrigação num ano. */
export const chaveCumprimento = (prazoId: string, ano: number) => `${ano}::${prazoId}`;

function lerLocal(): Set<string> {
  const raw = lerChave(STORAGE_KEY());
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function gravarLocal(s: Set<string>): Resultado<void> {
  return gravarChave(STORAGE_KEY(), JSON.stringify([...s]));
}

export function usePrazosCumpridos() {
  const { user, carregado: authPronto, disponivel } = useAuth();
  const { plano, carregado: planoPronto } = useSubscricao();
  const userId = user?.id ?? null;
  const destino = destinoDosDados({ disponivel, userId, authPronto, plano, planoPronto });
  const naNuvem = destino === "nuvem";

  const [cumpridos, setCumpridos] = useState<Set<string>>(new Set());
  const [carregado, setCarregado] = useState(false);
  const ref = useRef<Set<string>>(new Set());
  ref.current = cumpridos;

  useEffect(() => {
    if (!authPronto) return;
    let ativo = true;
    setCarregado(false);
    // Troca de conta não herda as marcas de quem saiu.
    setCumpridos(new Set());

    if (naNuvem && userId) {
      getSupabase()
        .from("prazos_cumpridos")
        .select("prazo_id, ano")
        .eq("user_id", userId)
        .then(({ data, error }) => {
          if (!ativo) return;
          if (error) {
            // Sem estado de cumprimento conhecido é melhor não marcar nada do
            // que marcar por engano.
            setCumpridos(new Set());
          } else {
            setCumpridos(new Set((data ?? []).map((r) => chaveCumprimento(r.prazo_id as string, r.ano as number))));
          }
          setCarregado(true);
        });
    } else {
      setCumpridos(lerLocal());
      setCarregado(true);
    }

    return () => { ativo = false; };
  }, [authPronto, naNuvem, userId]);

  const estaCumprido = useCallback(
    (prazoId: string, ano: number) => cumpridos.has(chaveCumprimento(prazoId, ano)),
    [cumpridos],
  );

  const marcar = useCallback(
    async (prazoId: string, ano: number, feito: boolean): Promise<Resultado<void>> => {
      // Enquanto não se sabe o destino, não se escreve: escrever no
      // aparelho e a subscrição chegar a seguir punha o registo num
      // sítio de onde a aplicação nunca mais o lê.
      if (destino === "por-decidir") return falha(aindaSemDestino());

      const chave = chaveCumprimento(prazoId, ano);
      const proximos = new Set(ref.current);
      if (feito) proximos.add(chave);
      else proximos.delete(chave);

      if (naNuvem && userId) {
        try {
          const { error } = feito
            ? await getSupabase()
                .from("prazos_cumpridos")
                .upsert({ user_id: userId, prazo_id: prazoId, ano }, { onConflict: "user_id,prazo_id,ano" })
            : await getSupabase()
                .from("prazos_cumpridos")
                .delete()
                .eq("user_id", userId)
                .eq("prazo_id", prazoId)
                .eq("ano", ano);
          if (error) return falha(erroNuvem(error));
        } catch (e) {
          return falha(erroNuvem(e));
        }
      } else {
        const r = gravarLocal(proximos);
        if (!r.ok) return r;
      }

      ref.current = proximos;
      setCumpridos(proximos);
      return ok(undefined);
    },
    [destino, naNuvem, userId],
  );

  return { cumpridos, carregado, estaCumprido, marcar, naNuvem };
}
