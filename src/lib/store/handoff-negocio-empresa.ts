"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A PONTE ESTÚDIO → SIMULADOR DE EMPRESA
//  ---------------------------------------------------------------------
//  §10 do relatório, e é uma decisão de privacidade antes de ser uma
//  decisão técnica:
//
//      /simulador-empresa?faturacao=80000&custos=...
//
//  não se faz. Um URL desses fica no histórico do browser, nos logs de
//  quem servir a página, no `document.referrer` de qualquer recurso
//  externo, no que se cola num chat — e leva a estrutura de custos e a
//  faturação de alguém consigo. Não é hipotético: é o que acontece
//  sempre que se partilha um link.
//
//  ── O QUE ESTA PONTE É ─────────────────────────────────────────────
//  Uma chave no cofre local, com quatro propriedades que existem todas
//  por uma razão (§73):
//
//   · SCOPED   — vive no cofre de quem está com sessão, como todo o
//                resto. Num browser partilhado, o plano de negócios de
//                uma pessoa não aparece a quem entrar a seguir;
//   · VERSIONED — um payload de outra versão do esquema é recusado
//                inteiro, em vez de ser lido a meio;
//   · TTL      — uma ponte é para atravessar agora. Passadas horas, o
//                que lá está deixou de descrever o projeto atual, e
//                pré-preencher com números velhos é pior do que pedir;
//   · CONSUME-ONCE — lê-se e apaga-se. Sem isto, voltar ao simulador
//                daí a uma semana ressuscitava uma importação que a
//                pessoa já tinha resolvido — ou já tinha ignorado.
//
//  ── O QUE ESTA PONTE NÃO FAZ ───────────────────────────────────────
//  Não faz `fetch`. Não toca em Supabase. Não escreve no URL. Um handoff
//  local NUNCA é consentimento para a nuvem (§72) — quem quiser guardar
//  na nuvem usa «Guardar este projeto», que é uma ação explícita e
//  separada.
// ═══════════════════════════════════════════════════════════════════════

import {
  normalizarLocalizacao,
  normalizarSnapshotEmpresa,
} from "@/lib/empresa/snapshot";
import type {
  CampoEmpresaPendente,
  EstadoHandoff,
  HandoffAviso,
  HandoffNegocioEmpresaV1,
  LinhaEstruturaHandoff,
  OrigemCampo,
  ProvenienciaCampo,
} from "@/lib/negocio/adapters/empresa-handoff";
import { chaveAtiva } from "./cofre";
import { gravarChave, lerChave, removerChave } from "./persistencia";

const CHAVE = () => chaveAtiva("handoff-negocio-empresa");

/** A versão do envelope. Sobe quando a forma do handoff mudar. */
export const HANDOFF_VERSAO = 1;

/**
 * Quanto tempo uma ponte continua a ser uma ponte.
 *
 * Duas horas: chega para atravessar, ir buscar um café, voltar e
 * confirmar — e não chega para o handoff sobreviver a um dia de trabalho
 * inteiro e reaparecer numa sessão a que já não pertence.
 */
export const HANDOFF_TTL_MS = 2 * 60 * 60 * 1000;

interface EnvelopeHandoff {
  versao: typeof HANDOFF_VERSAO;
  gravadoEm: number;
  handoff: HandoffNegocioEmpresaV1;
}

// ─── Escrever ──────────────────────────────────────────────────────────

/**
 * Guarda o handoff. Silencioso por desenho: sem armazenamento (modo
 * privado, quota cheia) o simulador abre na mesma — só não recebe nada,
 * e a pessoa preenche como sempre preencheu. Uma ferramenta que se recusa
 * a abrir porque não conseguiu guardar uma conveniência é pior do que a
 * conveniência que perdeu.
 */
export function guardarHandoffEmpresa(handoff: HandoffNegocioEmpresaV1): boolean {
  const envelope: EnvelopeHandoff = {
    versao: HANDOFF_VERSAO,
    gravadoEm: Date.now(),
    handoff,
  };
  return gravarChave(CHAVE(), JSON.stringify(envelope)).ok;
}

// ─── Ler ───────────────────────────────────────────────────────────────

/**
 * Espreita sem consumir. É o que o banner usa para decidir se aparece.
 *
 * Devolve `null` a qualquer sinal de estranheza — versão errada, JSON
 * ilegível, fora do prazo. Um estado que não se percebe nunca pode
 * impedir a ferramenta de abrir.
 */
export function espreitarHandoffEmpresa(): HandoffNegocioEmpresaV1 | null {
  const bruto = lerChave(CHAVE());
  if (!bruto) return null;

  try {
    const lido = JSON.parse(bruto) as unknown;
    if (!lido || typeof lido !== "object") return null;

    const env = lido as Partial<EnvelopeHandoff>;
    if (env.versao !== HANDOFF_VERSAO) return null;
    if (typeof env.gravadoEm !== "number" || !Number.isFinite(env.gravadoEm)) return null;
    // Um `gravadoEm` no futuro é relógio trocado, não um handoff válido.
    const idade = Date.now() - env.gravadoEm;
    if (idade < 0 || idade > HANDOFF_TTL_MS) return null;

    return normalizarHandoff(env.handoff);
  } catch {
    return null;
  }
}

/**
 * Lê E APAGA. É o que o simulador chama à entrada.
 *
 * §10: «depois do consumo, o handoff é removido». Apagar mesmo que a
 * validação falhe é deliberado — um payload que não passa hoje também não
 * passa amanhã, e deixá-lo lá era garantir que voltava a falhar em cada
 * abertura.
 */
export function consumirHandoffEmpresa(): HandoffNegocioEmpresaV1 | null {
  const h = espreitarHandoffEmpresa();
  limparHandoffEmpresa();
  return h;
}

export function limparHandoffEmpresa(): void {
  removerChave(CHAVE());
}

// ─── Normalização (§94-95) ─────────────────────────────────────────────

const ORIGENS: readonly OrigemCampo[] = ["utilizador", "derivado", "assumido", "importado"];
const ESTADOS: readonly EstadoHandoff[] = ["pronto", "parcial", "bloqueado"];

/**
 * Aceita o que reconhece, ignora o resto.
 *
 * §94: «valores inválidos não quebram a página → campo ignorado → aviso
 * de importação». Um `as HandoffNegocioEmpresaV1` sobre `JSON.parse` é
 * uma promessa ao TypeScript que os dados não têm obrigação de cumprir —
 * e quem escreveu o payload pode ter sido uma versão do site com outro
 * esquema.
 */
export function normalizarHandoff(bruto: unknown): HandoffNegocioEmpresaV1 | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  if (o.versao !== 1) return null;

  const origem = o.origem as Record<string, unknown> | undefined;
  if (!origem || origem.tipo !== "negocio") return null;
  if (typeof origem.contextoId !== "string" || origem.contextoId.length === 0) return null;

  const prefill = normalizarSnapshotEmpresa(o.prefill);
  // Um handoff sem faturação utilizável não tem nada para dar: §65,
  // `bloqueado`. Deixá-lo passar dava um banner a prometer importação e
  // campos exatamente iguais aos de sempre.
  const avisos = normalizarAvisos(o.avisos);

  // A localização só entra inteira (§111) — meia localização faria o
  // motor calcular derrama com um valor por omissão e apresentá-la como
  // se fosse daquele município.
  if (prefill.localizacao && !normalizarLocalizacao(prefill.localizacao)) {
    delete prefill.localizacao;
    delete prefill.localNome;
    avisos.push({
      id: "localizacao-descartada",
      severidade: "atencao",
      texto: "A localização que vinha do projeto não era válida e ficou por preencher.",
    });
  }

  return {
    versao: 1,
    estado: ESTADOS.includes(o.estado as EstadoHandoff) ? (o.estado as EstadoHandoff) : "parcial",
    origem: {
      tipo: "negocio",
      contextoId: origem.contextoId,
      nome: typeof origem.nome === "string" && origem.nome.length <= 120 ? origem.nome : undefined,
      criadoEm: typeof origem.criadoEm === "string" ? origem.criadoEm : new Date(0).toISOString(),
    },
    prefill,
    estrutura: normalizarEstrutura(o.estrutura),
    proveniencia: normalizarProveniencia(o.proveniencia),
    pendentes: normalizarPendentes(o.pendentes),
    avisos,
  };
}

function normalizarProveniencia(v: unknown): Record<string, ProvenienciaCampo> {
  if (!v || typeof v !== "object") return {};
  const saida: Record<string, ProvenienciaCampo> = {};
  for (const [chave, valor] of Object.entries(v as Record<string, unknown>)) {
    if (!valor || typeof valor !== "object") continue;
    const p = valor as Record<string, unknown>;
    if (!ORIGENS.includes(p.origem as OrigemCampo)) continue;
    if (typeof p.texto !== "string" || p.texto.length > 400) continue;
    saida[chave] = { origem: p.origem as OrigemCampo, texto: p.texto };
  }
  return saida;
}

function normalizarPendentes(v: unknown): CampoEmpresaPendente[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const c = x as Record<string, unknown>;
    if (typeof c.chave !== "string" || typeof c.rotulo !== "string") return [];
    return [
      {
        chave: c.chave,
        rotulo: c.rotulo,
        porque: typeof c.porque === "string" ? c.porque : "",
      },
    ];
  });
}

function normalizarAvisos(v: unknown): HandoffAviso[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const a = x as Record<string, unknown>;
    if (typeof a.id !== "string" || typeof a.texto !== "string") return [];
    return [
      {
        id: a.id,
        severidade: a.severidade === "atencao" ? "atencao" : "info",
        texto: a.texto,
      },
    ];
  });
}

function normalizarEstrutura(v: unknown): LinhaEstruturaHandoff[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const l = x as Record<string, unknown>;
    if (typeof l.rotulo !== "string") return [];
    if (typeof l.valorAnual !== "number" || !Number.isFinite(l.valorAnual) || l.valorAnual < 0) {
      return [];
    }
    return [
      {
        categoria: (typeof l.categoria === "string"
          ? l.categoria
          : "outro") as LinhaEstruturaHandoff["categoria"],
        rotulo: l.rotulo,
        valorAnual: l.valorAnual,
      },
    ];
  });
}
