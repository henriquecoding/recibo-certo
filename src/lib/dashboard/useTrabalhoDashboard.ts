"use client";

// ─────────────────────────────────────────────────────────────────────────
//  O TRABALHO EM CURSO, ligado ao React.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUÊ `useSyncExternalStore` E NÃO UM `useState` COM UM EFEITO      │
//  │                                                                     │
//  │ Porque a fonte é externa ao React — é o `localStorage` — e um        │
//  │ `useState` semeado num efeito produz sempre o mesmo defeito: um      │
//  │ instante em que o painel mostra o estado ANTERIOR, e um render extra │
//  │ para o corrigir. Com o store externo, o React lê a marca de versão   │
//  │ e volta a derivar quando ela muda: uma pintura, e sempre a certa.    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  A marca é um CONTADOR. Não é o conteúdo, não é um hash do conteúdo, não
//  é a lista: é «mudou alguma coisa desde a última vez», que é tudo o que
//  o React precisa de saber para mandar reler.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { useCenarios } from "@/lib/store/cenarios";
import { subscreverMudancas } from "./eventos";
import { itensDeCenarios } from "./work-items/cenarios";
import { itensDeDescoberta } from "./work-items/descoberta";
import { itensDeNegocio } from "./work-items/negocio";
import { itensDePrecos } from "./work-items/precos";
import { agregar, type TrabalhoAgregado } from "./work-items/agregar";
import { LEITURA_VAZIA } from "./work-items/tipos";

let contador = 0;
const ouvintes = new Set<() => void>();
let cancelar: (() => void) | null = null;

function subscrever(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  if (!cancelar) {
    cancelar = subscreverMudancas(() => {
      contador += 1;
      for (const o of ouvintes) o();
    });
  }
  return () => {
    ouvintes.delete(aoMudar);
    if (ouvintes.size === 0) {
      cancelar?.();
      cancelar = null;
    }
  };
}

const marcaCliente = () => contador;
/** No servidor não há cofre nenhum para ler — e a marca tem de ser estável. */
const marcaServidor = () => 0;

export interface TrabalhoDashboard extends TrabalhoAgregado {
  /** Falso enquanto o cofre ainda não foi lido no cliente. */
  carregado: boolean;
  /** Os cenários vivem na conta (Plus autenticado) ou no dispositivo. */
  naNuvem: boolean;
}

export function useTrabalhoDashboard(): TrabalhoDashboard {
  const marca = useSyncExternalStore(subscrever, marcaCliente, marcaServidor);
  const { user } = useAuth();
  const { cenarios, carregado: cenariosCarregados, naNuvem } = useCenarios();
  const [montado, setMontado] = useState(false);

  // O cofre só existe no browser: ler durante o render do servidor daria
  // uma marca de hidratação diferente da do cliente.
  useEffect(() => setMontado(true), []);

  // `marca` e o id do cofre são as duas razões para reler: uma escrita
  // local, ou uma troca de conta no mesmo browser (que muda de cofre).
  const locais = useMemo(
    () => (montado ? [itensDeDescoberta(), itensDePrecos(), itensDeNegocio()] : [LEITURA_VAZIA]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [montado, marca, user?.id],
  );

  const daConta = useMemo(
    () => (cenariosCarregados ? itensDeCenarios(cenarios, naNuvem) : LEITURA_VAZIA),
    [cenarios, cenariosCarregados, naNuvem],
  );

  const agregado = useMemo(() => agregar([...locais, daConta]), [locais, daConta]);

  return { ...agregado, carregado: montado && cenariosCarregados, naNuvem };
}
