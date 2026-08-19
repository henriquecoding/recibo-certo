// ═══════════════════════════════════════════════════════════════════════
//  NEGÓCIO → DIAGNÓSTICO DE CONTABILISTA E PARTILHA
//  ---------------------------------------------------------------------
//  `diagnosticoContabilista` já sabe decidir se alguém precisa de um
//  contabilista, com que urgência e por quanto. O que lhe faltava era o
//  contexto: pedia forma jurídica, faturação, despesas, âmbito dos
//  clientes e trabalhadores — cinco perguntas que o negócio JÁ RESPONDEU.
//
//  ── A REGRA ────────────────────────────────────────────────────────
//  Não voltar a perguntar o que já se sabe. Cada pergunta repetida é uma
//  oportunidade de a pessoa responder diferente da primeira vez, e duas
//  respostas divergentes dão dois diagnósticos para o mesmo caso.
//
//  ── E A PARTILHA ───────────────────────────────────────────────────
//  `conteudoPartilhaNegocio` produz o MÍNIMO: os números que tornam o
//  pedido útil e mais nada. Não vai o `ContextoNegocio` inteiro — lá
//  dentro estão custos de fornecedor, margens e a estrutura de preços,
//  que são segredo comercial de quem os escreveu, não anexo de um email.
//
//  A lista é explícita e enumerável de propósito: é ela que o ecrã de
//  consentimento mostra, campo a campo, ANTES de qualquer envio.
// ═══════════════════════════════════════════════════════════════════════

import type { ClientesAmbito, DiagnosticoInput, FormaJuridica } from "@/lib/contabilista";
import { fmt } from "@/lib/format";
import type { ContextoNegocio, ResultadoNegocio } from "../tipos";

/** A forma jurídica que o negócio já declarou. */
export function formaJuridicaDe(contexto: ContextoNegocio): FormaJuridica {
  return contexto.fiscal.enquadramento === "sociedade" ? "sociedade" : "independente";
}

/**
 * O âmbito dos clientes, lido do canal de cada oferta.
 *
 * Basta uma oferta a vender para fora de Portugal: o VIES e as
 * declarações recapitulativas passam a existir para o negócio inteiro.
 */
export function ambitoClientes(contexto: ContextoNegocio): ClientesAmbito {
  const internacional = contexto.ofertas.some(
    (o) => o.pricing.canal.cliente === "empresa_ue" || o.pricing.canal.cliente === "fora_ue",
  );
  return internacional ? "internacional" : "nacional";
}

export function paraDiagnosticoContabilista(
  negocio: ResultadoNegocio,
  contexto: ContextoNegocio,
): DiagnosticoInput {
  return {
    formaJuridica: formaJuridicaDe(contexto),
    faturacaoAnual: negocio.receitaSemIVAAno,
    despesasAnuais: negocio.custosOperacionaisAno,
    clientes: ambitoClientes(contexto),
    trabalhadores: (contexto.estrutura?.trabalhadores?.length ?? 0) > 0,
  };
}

// ─── Partilha ──────────────────────────────────────────────────────────

/**
 * O conteúdo da partilha, na forma que a lista branca de
 * `plano_negocio` autoriza.
 *
 * As chaves são EXATAMENTE as de `CAMPOS_PARTILHA.plano_negocio`. Uma
 * chave a mais é silenciosamente removida por `sanitizarConteudoPartilha`
 * — o que é o comportamento certo, mas significa que o campo nunca
 * chegaria e ninguém daria por isso. Por isso o teste compara as duas
 * listas.
 */
export function conteudoPartilhaNegocio(
  negocio: ResultadoNegocio,
  contexto: ContextoNegocio,
  nota?: string,
): Record<string, unknown> {
  const conteudo: Record<string, unknown> = {
    ano: new Date().getFullYear(),
    situacao: ROTULO_MATURIDADE[contexto.maturidade],
    formaPretendida: ROTULO_ENQUADRAMENTO[contexto.fiscal.enquadramento],
    nomesOfertas: negocio.ofertas.map((o) => o.oferta.nome),
    numeroOfertas: negocio.ofertas.length,
    faturacaoProjetada: negocio.receitaSemIVAAno,
    custosOperacionais: negocio.custosOperacionaisAno,
    resultadoOperacional: negocio.resultadoOperacionalAno,
    clientes: ambitoClientes(contexto),
    trabalhadores: contexto.estrutura?.trabalhadores?.length ?? 0,
    confianca: ROTULO_CONFIANCA[negocio.confianca],
  };

  if (negocio.breakEven.possivel) conteudo.pontoEquilibrio = negocio.breakEven.vendasMes;
  if (contexto.fiscal.regiao) conteudo.regiao = ROTULO_REGIAO[contexto.fiscal.regiao] ?? contexto.fiscal.regiao;
  if (nota?.trim()) conteudo.notas = nota.trim();

  return conteudo;
}

const ROTULO_MATURIDADE: Record<string, string> = {
  ideia: "Tem uma ideia, ainda não vende",
  ja_vendo: "Já vende",
  empresa_existente: "Já tem empresa",
};

const ROTULO_ENQUADRAMENTO: Record<string, string> = {
  nao_sei: "Ainda por decidir",
  independente: "Trabalhador independente",
  eni: "Empresário em nome individual",
  sociedade: "Sociedade",
};

const ROTULO_CONFIANCA: Record<string, string> = {
  exploratorio: "Exploratório — valores de exemplo",
  estimado: "Estimado — faltam pressupostos por confirmar",
  estruturado: "Estruturado — ofertas, volumes e estrutura respondidos",
};

const ROTULO_REGIAO: Record<string, string> = {
  continente: "Continente",
  madeira: "Madeira",
  acores: "Açores",
};
