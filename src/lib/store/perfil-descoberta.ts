"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Perfil de empreendedor e instantâneos — locais, e só por decisão
//
//  Ponto 40 do pedido: «não guardar silenciosamente dados que o utilizador
//  não decidiu guardar». Este repositório não é chamado por nenhum efeito
//  de montagem nem por nenhuma alteração de campo — só por um clique em
//  «Guardar o meu perfil». A leitura, essa, é livre: se está guardado, é
//  porque alguém o pediu.
//
//  O perfil e os instantâneos vivem em cofres SEPARADOS de propósito:
//  apagar o perfil não pode apagar o histórico das análises, e conservar
//  o histórico não pode obrigar a conservar o perfil. São a mesma pessoa e
//  são dois riscos diferentes.
// ─────────────────────────────────────────────────────────────────────────

import { CONTEXTO_INICIAL, type OpportunityContext } from "@/lib/negocio/descoberta/contexto/tipos";
import {
  INSTANTANEO_VERSAO,
  type InstantaneoDescoberta,
} from "@/lib/negocio/descoberta/historico/instantaneos";
import { chaveAtiva } from "./cofre";
import { gravarChave, lerChave, removerChave, type Resultado } from "./persistencia";

const CHAVE_PERFIL = () => chaveAtiva("perfil-descoberta");
const CHAVE_INSTANTANEOS = () => chaveAtiva("instantaneos-descoberta");

/** Quantas análises se conservam. Mais do que isto não acrescenta leitura. */
export const MAXIMO_INSTANTANEOS = 8;

interface EnvelopePerfil {
  versao: 1;
  contexto: OpportunityContext;
  guardadoEm: string;
}

/**
 * Valida o que veio do armazenamento.
 *
 * Um envelope de outra versão, ou corrompido, é DESCARTADO em silêncio —
 * nunca fundido com o inicial. Fundir produziria um contexto meio antigo
 * e meio novo, que é a pior das três hipóteses: parece válido e não é.
 */
function perfilValido(valor: unknown): valor is EnvelopePerfil {
  if (!valor || typeof valor !== "object") return false;
  const envelope = valor as Partial<EnvelopePerfil>;
  if (envelope.versao !== 1) return false;
  const contexto = envelope.contexto;
  if (!contexto || typeof contexto !== "object") return false;
  return (
    contexto.versao === 1 &&
    Array.isArray(contexto.competencias) &&
    Array.isArray(contexto.ativos) &&
    Array.isArray(contexto.restricoes) &&
    typeof contexto.localizacao === "object" &&
    typeof contexto.preferencias === "object"
  );
}

export function lerPerfilGuardado(): { contexto: OpportunityContext; guardadoEm: string } | null {
  const cru = lerChave(CHAVE_PERFIL());
  if (!cru) return null;
  try {
    const valor: unknown = JSON.parse(cru);
    if (!perfilValido(valor)) return null;
    // Os campos que faltarem — de uma versão anterior do formulário —
    // herdam o inicial, que é neutro e não elimina nada.
    return {
      contexto: { ...CONTEXTO_INICIAL, ...valor.contexto },
      guardadoEm: valor.guardadoEm,
    };
  } catch {
    return null;
  }
}

export function guardarPerfil(
  contexto: OpportunityContext,
  agora: () => string = () => new Date().toISOString(),
): Resultado<void> {
  const envelope: EnvelopePerfil = { versao: 1, contexto, guardadoEm: agora() };
  return gravarChave(CHAVE_PERFIL(), JSON.stringify(envelope));
}

export function apagarPerfil(): void {
  removerChave(CHAVE_PERFIL());
}

// ── INSTANTÂNEOS ─────────────────────────────────────────────────────

interface EnvelopeInstantaneos {
  versao: 1;
  instantaneos: InstantaneoDescoberta[];
}

export function lerInstantaneos(): readonly InstantaneoDescoberta[] {
  const cru = lerChave(CHAVE_INSTANTANEOS());
  if (!cru) return [];
  try {
    const valor: unknown = JSON.parse(cru);
    if (!valor || typeof valor !== "object") return [];
    const envelope = valor as Partial<EnvelopeInstantaneos>;
    if (envelope.versao !== 1 || !Array.isArray(envelope.instantaneos)) return [];
    return envelope.instantaneos.filter(
      (item): item is InstantaneoDescoberta =>
        Boolean(item) &&
        typeof item === "object" &&
        (item as InstantaneoDescoberta).versao === INSTANTANEO_VERSAO &&
        Array.isArray((item as InstantaneoDescoberta).linhas),
    );
  } catch {
    return [];
  }
}

/** Acrescenta um instantâneo e devolve a lista, do mais recente ao mais antigo. */
export function guardarInstantaneo(
  instantaneo: InstantaneoDescoberta,
): readonly InstantaneoDescoberta[] {
  const anteriores = lerInstantaneos().filter((item) => item.geradoEm !== instantaneo.geradoEm);
  const proximos = [instantaneo, ...anteriores]
    .sort((esquerda, direita) => direita.geradoEm.localeCompare(esquerda.geradoEm))
    .slice(0, MAXIMO_INSTANTANEOS);
  gravarChave(CHAVE_INSTANTANEOS(), JSON.stringify({ versao: 1, instantaneos: proximos }));
  return proximos;
}

export function apagarInstantaneos(): void {
  removerChave(CHAVE_INSTANTANEOS());
}
