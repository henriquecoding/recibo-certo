"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { obterMinhaFicha } from "@/lib/contabilistas/fonte/dados";
import type { Contabilista } from "@/lib/contabilistas/tipos";

/**
 * A ficha do contabilista autenticado.
 *
 * O layout já barrou quem não é contabilista aprovado, por isso as páginas
 * podem assumir que a ficha chega — mas o estado de carregamento existe na
 * mesma, porque cada página faz o seu próprio pedido.
 */
export function usarFicha(): {
  ficha: Contabilista | null;
  userId: string | null;
  aCarregar: boolean;
  recarregar: () => void;
} {
  const { user, carregado } = useAuth();
  const [ficha, setFicha] = useState<Contabilista | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [tique, setTique] = useState(0);

  useEffect(() => {
    if (!carregado || !user) { if (carregado) setACarregar(false); return; }
    let vivo = true;
    setACarregar(true);
    obterMinhaFicha(user.id)
      .then((f) => { if (vivo) setFicha(f); })
      .catch(() => { if (vivo) setFicha(null); })
      .finally(() => { if (vivo) setACarregar(false); });
    return () => { vivo = false; };
  }, [carregado, user, tique]);

  const recarregar = useCallback(() => setTique((t) => t + 1), []);
  return { ficha, userId: user?.id ?? null, aCarregar, recarregar };
}

// Havia aqui um `cabecalhoAuth()` — o token de sessão para as rotas que usam
// a chave de serviço. Deixou de ter quem o chamasse: a única rota que o
// painel usava (validar um cupão) mudou-se para `fonte/dados.ts`, que é
// quem decide se fala com o servidor ou com a loja de demonstração. Um
// ecrã do painel que volte a montar um pedido à mão fica sem os dois modos.
