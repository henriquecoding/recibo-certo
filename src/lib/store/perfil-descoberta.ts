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

import {
  CONTEXTO_INICIAL,
  type AdaptacaoVeiculo,
  type AtivoId,
  type DetalheAtivo,
  type DetalhesAtivos,
  type OpportunityContext,
} from "@/lib/negocio/descoberta/contexto/tipos";
import { ATIVOS } from "@/lib/negocio/descoberta/contexto/perguntas";
import { INSTANTANEO_VERSAO, type InstantaneoDescoberta } from "@/lib/negocio/descoberta/historico/instantaneos";
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

const ATIVOS_VALIDOS = new Set<AtivoId>(ATIVOS.map((item) => item.id));
const ESTADOS_ATIVO = ["adequado", "funcional-com-limitacoes", "precisa-reparacao", "por-confirmar"] as const;
const DISPONIBILIDADES = ["sempre", "parcial", "ocasional"] as const;
const ACESSOS = ["proprio", "partilhado", "alugado", "por-reservar"] as const;
const USOS_PROFISSIONAIS = ["confirmado", "por-confirmar", "nao"] as const;
const CONFIGURACOES_VEICULO = ["passageiros", "misto", "mercadorias", "por-confirmar"] as const;
const CAPACIDADES_CARGA = ["muito-reduzida", "reduzida", "media", "elevada"] as const;
const ESTADOS_INSPECAO = ["valida", "por-confirmar", "nao-valida"] as const;
const ADAPTACOES: readonly AdaptacaoVeiculo[] = [
  "separacao-carga",
  "prateleiras",
  "refrigeracao",
  "rampa",
  "interior-lavavel",
  "transporte-animais",
];

function registo(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function enumValido<const T extends readonly string[]>(valor: unknown, aceites: T): T[number] | undefined {
  return typeof valor === "string" && (aceites as readonly string[]).includes(valor) ? (valor as T[number]) : undefined;
}

/**
 * Perfis antigos não tinham detalhe dos meios. Perfis manipulados podem
 * ainda trazer valores fora do contrato. Nos dois casos a regra segura é
 * «por confirmar» — nunca promover um ativo a adequado por omissão.
 */
function normalizarDetalhesAtivos(valor: unknown, ativos: readonly AtivoId[]): DetalhesAtivos {
  const origem = registo(valor) ?? {};
  const resultado: DetalhesAtivos = {};

  for (const id of ativos) {
    const cru = registo(origem[id]);
    const estado = enumValido(cru?.estado, ESTADOS_ATIVO) ?? "por-confirmar";
    const detalhe: DetalheAtivo = { estado };

    const disponibilidade = enumValido(cru?.disponibilidade, DISPONIBILIDADES);
    const acesso = enumValido(cru?.acesso, ACESSOS);
    const usoProfissional = enumValido(cru?.usoProfissional, USOS_PROFISSIONAIS);
    if (disponibilidade) detalhe.disponibilidade = disponibilidade;
    if (acesso) detalhe.acesso = acesso;
    if (usoProfissional) detalhe.usoProfissional = usoProfissional;

    if (Array.isArray(cru?.limitacoes)) {
      detalhe.limitacoes = [...new Set(cru.limitacoes.filter((item): item is string => typeof item === "string"))]
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12);
    }

    if (id === "veiculo-ligeiro" || id === "veiculo-carga") {
      const veiculoCru = registo(cru?.veiculo);
      const configuracao = enumValido(veiculoCru?.configuracao, CONFIGURACOES_VEICULO);
      const capacidadeCarga = enumValido(veiculoCru?.capacidadeCarga, CAPACIDADES_CARGA);
      const inspecao = enumValido(veiculoCru?.inspecao, ESTADOS_INSPECAO);
      const lugaresCru = veiculoCru?.lugares;
      const lugares =
        typeof lugaresCru === "number" && Number.isInteger(lugaresCru) && lugaresCru >= 1 && lugaresCru <= 9
          ? lugaresCru
          : undefined;
      const adaptacoes = Array.isArray(veiculoCru?.adaptacoes)
        ? [
            ...new Set(
              veiculoCru.adaptacoes.filter((item): item is AdaptacaoVeiculo =>
                ADAPTACOES.includes(item as AdaptacaoVeiculo),
              ),
            ),
          ]
        : undefined;
      detalhe.veiculo = {
        ...(configuracao ? { configuracao } : {}),
        ...(lugares !== undefined ? { lugares } : {}),
        ...(capacidadeCarga ? { capacidadeCarga } : {}),
        ...(inspecao ? { inspecao } : {}),
        ...(adaptacoes ? { adaptacoes } : {}),
      };
    }

    resultado[id] = detalhe;
  }

  return resultado;
}

/**
 * Faz merge profundo com o contexto neutro. O merge superficial anterior
 * deixava perfis v1 antigos sem campos acrescentados dentro de
 * `preferencias`, o que podia rebentar ao chamar `.includes`.
 */
export function normalizarContextoGuardado(contexto: OpportunityContext): OpportunityContext {
  const ativos = contexto.ativos.filter((id): id is AtivoId => ATIVOS_VALIDOS.has(id));
  return {
    ...CONTEXTO_INICIAL,
    ...contexto,
    localizacao: { ...CONTEXTO_INICIAL.localizacao, ...contexto.localizacao },
    capital: { ...CONTEXTO_INICIAL.capital, ...contexto.capital },
    ativos,
    detalhesAtivos: normalizarDetalhesAtivos(contexto.detalhesAtivos, ativos),
    tempo: { ...CONTEXTO_INICIAL.tempo, ...contexto.tempo },
    rendimento: { ...CONTEXTO_INICIAL.rendimento, ...contexto.rendimento },
    competencias: Array.isArray(contexto.competencias) ? contexto.competencias : [],
    equipa: { ...CONTEXTO_INICIAL.equipa, ...contexto.equipa },
    preferencias: {
      ...CONTEXTO_INICIAL.preferencias,
      ...contexto.preferencias,
      naturezas: Array.isArray(contexto.preferencias?.naturezas) ? contexto.preferencias.naturezas : [],
      setoresPreferidos: Array.isArray(contexto.preferencias?.setoresPreferidos)
        ? contexto.preferencias.setoresPreferidos
        : [],
      publicosPreferidos: Array.isArray(contexto.preferencias?.publicosPreferidos)
        ? contexto.preferencias.publicosPreferidos
        : [],
    },
    restricoes: Array.isArray(contexto.restricoes) ? contexto.restricoes : [],
    risco: {
      ...CONTEXTO_INICIAL.risco,
      ...contexto.risco,
      toleranciaPorDimensao: contexto.risco?.toleranciaPorDimensao
        ? { ...contexto.risco.toleranciaPorDimensao }
        : undefined,
    },
  };
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
      contexto: normalizarContextoGuardado(valor.contexto),
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
export function guardarInstantaneo(instantaneo: InstantaneoDescoberta): readonly InstantaneoDescoberta[] {
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
