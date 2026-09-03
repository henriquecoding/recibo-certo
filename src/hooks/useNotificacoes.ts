"use client";

// O sino, do lado do React. A loja está em `lib/notificacoes/loja.ts` e é
// ela que garante uma subscrição Realtime por sessão, quantos sinos houver
// no ecrã. Aqui só se liga a sessão à loja e se lê o instantâneo.

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/supabase/auth";
import {
  definirConta,
  instantaneoDosAvisos,
  instantaneoNoServidor,
  marcarLida,
  marcarTodas,
  recarregar,
  subscrever,
  verMais,
  type Instantaneo,
} from "@/lib/notificacoes/loja";

export interface Avisos extends Instantaneo {
  marcarLida: (id: string) => void;
  marcarTodas: () => void;
  recarregar: () => void;
  verMais: () => void;
}

export function useNotificacoes(): Avisos {
  const { user, carregado, disponivel } = useAuth();

  // A conta define-se num efeito e não durante o render: `definirConta`
  // escreve no módulo, e escrever fora de um efeito faz dois componentes
  // que leem a mesma loja verem estados diferentes no mesmo render.
  useEffect(() => {
    if (!disponivel || !carregado) return;
    definirConta(user?.id ?? null);
  }, [user?.id, carregado, disponivel]);

  const estado = useSyncExternalStore(subscrever, instantaneoDosAvisos, instantaneoNoServidor);

  return { ...estado, marcarLida, marcarTodas, recarregar, verMais };
}
