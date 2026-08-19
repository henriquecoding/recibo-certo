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
//  `resumoParaContabilista` produz o MÍNIMO: os números que tornam o
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

export interface CampoPartilha {
  rotulo: string;
  valor: string;
}

/**
 * O resumo que pode seguir para um contabilista, campo a campo.
 *
 * O que NÃO vai, e porquê:
 *  · custos de fornecedor e margens por oferta — segredo comercial;
 *  · a estrutura de preços — idem, e não é preciso para o pedido;
 *  · nome de clientes ou texto livre — não existe campo para isso aqui.
 *
 * O que vai é o que transforma «quero abrir empresa» em «tenho duas
 * ofertas, faturação projetada X, custos Y, quero contratar alguém e
 * preciso de validar a estrutura» — que é a diferença entre uma lead e
 * um pedido a que se consegue responder.
 */
export function resumoParaContabilista(
  negocio: ResultadoNegocio,
  contexto: ContextoNegocio,
): CampoPartilha[] {
  const campos: CampoPartilha[] = [
    { rotulo: "Situação", valor: ROTULO_MATURIDADE[contexto.maturidade] },
    { rotulo: "Forma pretendida", valor: ROTULO_ENQUADRAMENTO[contexto.fiscal.enquadramento] },
    {
      rotulo: "Ofertas",
      valor: `${negocio.ofertas.length} ${negocio.ofertas.length === 1 ? "oferta" : "ofertas"}: ${negocio.ofertas
        .map((o) => o.oferta.nome)
        .join(", ")}`,
    },
    { rotulo: "Faturação anual projetada (sem IVA)", valor: fmt(negocio.receitaSemIVAAno) },
    { rotulo: "Custos operacionais anuais", valor: fmt(negocio.custosOperacionaisAno) },
    { rotulo: "Resultado operacional anual", valor: fmt(negocio.resultadoOperacionalAno) },
    {
      rotulo: "Clientes",
      valor: ambitoClientes(contexto) === "internacional" ? "Nacionais e internacionais" : "Nacionais",
    },
  ];

  const trabalhadores = contexto.estrutura?.trabalhadores?.length ?? 0;
  if (trabalhadores > 0) {
    campos.push({
      rotulo: "Trabalhadores planeados",
      valor: `${trabalhadores} (${fmt(negocio.custoTrabalhadoresMes)}/mês, já com TSU da entidade)`,
    });
  }

  if (negocio.breakEven.possivel) {
    campos.push({
      rotulo: "Ponto de equilíbrio",
      valor: `${negocio.breakEven.vendasMes} vendas/mês`,
    });
  }

  campos.push({ rotulo: "Confiança do cenário", valor: ROTULO_CONFIANCA[negocio.confianca] });

  if (contexto.fiscal.regiao) {
    campos.push({ rotulo: "Região", valor: ROTULO_REGIAO[contexto.fiscal.regiao] ?? contexto.fiscal.regiao });
  }

  return campos;
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
