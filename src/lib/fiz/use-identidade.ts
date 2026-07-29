"use client";

// ═══════════════════════════════════════════════════════════════════════
//  IDENTIDADE DISPONÍVEL PARA PRÉ-PREENCHIMENTO
//  ---------------------------------------------------------------------
//  Só serve para MOSTRAR ao utilizador, no diálogo de consentimento, o que
//  ele estaria a enviar. Os valores que saem daqui NÃO são os que viajam
//  para a FIZ: o servidor relê o nome, o NIF, o email e o telefone do perfil
//  autenticado (ver `identidadeDoUtilizador` em `session.server.ts`).
//
//  A separação é deliberada. Se o cliente enviasse os valores, bastava
//  adulterar o pedido para colar o NIF de outra pessoa a um consentimento
//  legítimo. Assim, o cliente escolhe QUAIS os campos; o servidor decide
//  QUAIS os valores.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { supabaseConfigurado } from "@/lib/supabase/client";

export interface IdentidadeDisponivel {
  fullName?: string;
  taxpayerNumber?: string;
  email?: string;
  phone?: string;
}

const VAZIA: IdentidadeDisponivel = {};

/**
 * `ativo: false` desliga a leitura por completo.
 *
 * Existe por minimização de dados: em modo LIGACAO não há diálogo de
 * consentimento, e sem diálogo não há finalidade para ler o nome, o NIF, o
 * email e o telefone do perfil. Um hook que lê «só para o caso de» é
 * exatamente o que o RGPD chama tratamento sem finalidade.
 */
export function useIdentidadeFiz(
  opcoes: { ativo?: boolean } = {},
): { identidade: IdentidadeDisponivel; carregada: boolean } {
  const { ativo: leituraAtiva = true } = opcoes;
  const { user, carregado: authCarregado } = useAuth();
  const [identidade, setIdentidade] = useState<IdentidadeDisponivel>(VAZIA);
  const [carregada, setCarregada] = useState(false);

  useEffect(() => {
    if (!leituraAtiva) {
      setIdentidade(VAZIA);
      setCarregada(true);
      return;
    }
    if (!authCarregado) return;
    if (!user || !supabaseConfigurado()) {
      setIdentidade(VAZIA);
      setCarregada(true);
      return;
    }

    let ativo = true;
    (async () => {
      // O email vem da sessão; o resto do perfil pode não existir ainda e
      // isso não é um erro — quem não preencheu o perfil simplesmente não vê
      // esses campos no diálogo.
      const base: IdentidadeDisponivel = user.email ? { email: user.email } : {};
      try {
        const { obterPerfil } = await import("@/lib/supabase/profile");
        const perfil = await obterPerfil(user.id);
        if (!ativo) return;
        setIdentidade({
          ...base,
          ...(perfil.nome ? { fullName: perfil.nome } : {}),
          ...(perfil.nif ? { taxpayerNumber: perfil.nif } : {}),
          ...(perfil.telefone ? { phone: perfil.telefone } : {}),
        });
      } catch {
        // Falhar a leitura do perfil não pode partir o simulador: mostra-se
        // o que se sabe (o email) e segue-se.
        if (ativo) setIdentidade(base);
      } finally {
        if (ativo) setCarregada(true);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [authCarregado, user, leituraAtiva]);

  return { identidade, carregada };
}
