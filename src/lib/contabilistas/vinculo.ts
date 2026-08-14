// ═══════════════════════════════════════════════════════════════════════
//  VÍNCULO E PARTILHA — o que passa do cliente para o contabilista
//  ---------------------------------------------------------------------
//  A migração 038 tornou verdadeira a frase da página de privacidade: «só tu
//  acedes aos teus dados». Um contabilista aprovado não é um administrador e
//  não pode herdar aquilo que nem a administração tem.
//
//  Por isso a partilha é uma CÓPIA, enviada uma a uma, com consentimento
//  registado e revogável — nunca uma chave para as tabelas fiscais do
//  cliente. Estar vinculado dá acesso a zero dados: dá acesso ao que for
//  enviado a seguir, e a mais nada.
// ═══════════════════════════════════════════════════════════════════════

import type { EstadoVinculo, TipoPartilha } from "./tipos";

/**
 * Versão do texto de consentimento em vigor. Fica gravada em cada partilha:
 * saber que alguém consentiu não chega se não se souber com o quê.
 * Subir isto quando o texto mudar — nunca reescrever o texto sem subir.
 */
export const CONSENTIMENTO_VERSAO = "2026-08-1";

export const TEXTO_CONSENTIMENTO =
  "Autorizo o envio desta simulação para o contabilista indicado. " +
  "Os dados enviados são uma cópia do que está no ecrã e posso revogar o acesso a qualquer momento.";

/**
 * ⚠️ REGRA INVIOLÁVEL — o mesmo que `entitlements.ts` já garante para a FIZ.
 *
 * Ligar-se a um contabilista, enviar-lhe uma simulação e marcar uma consulta
 * são GRATUITOS e NUNCA verificam o plano. Não existe `Entitlement` para
 * isto, de propósito: criar um seria criar a possibilidade de o cobrar, e
 * bastaria alguém escrever `planoTem(plano, "…")` num gate para a promessa
 * cair sem ninguém dar por isso.
 *
 * Coberto por `contabilistas-fronteiras.test.ts`.
 */
export const PARTILHA_NUNCA_EXIGE_PLUS = true as const;

/** Anti-spam: partilhas por cliente e por dia. */
export const LIMITE_PARTILHAS_DIA = 20;

/** Tamanho máximo do conteúdo de uma partilha, em bytes de JSON. */
export const LIMITE_CONTEUDO_BYTES = 64 * 1024;

// ─── Estados do vínculo ────────────────────────────────────────────────

/** Só um vínculo ativo permite partilhar e agendar. */
export function vinculoAtivo(estado: EstadoVinculo | null | undefined): boolean {
  return estado === "ativo";
}

export function podePartilhar(estado: EstadoVinculo | null | undefined): boolean {
  return vinculoAtivo(estado);
}

export function podeAgendar(estado: EstadoVinculo | null | undefined): boolean {
  return vinculoAtivo(estado);
}

/** Um vínculo terminado ou recusado pode ser reaberto; um ativo não se duplica. */
export function podePedirVinculo(estado: EstadoVinculo | null | undefined): boolean {
  return estado == null || estado === "terminado";
}

export const ROTULO_VINCULO: Record<EstadoVinculo, string> = {
  convidado: "Convite enviado",
  pendente: "À espera de resposta",
  ativo: "Ativo",
  pausado: "Em pausa",
  terminado: "Terminado",
};

// ─── O que pode seguir em cada partilha ────────────────────────────────

/**
 * Lista branca de campos por tipo de partilha.
 *
 * É uma lista BRANCA e não negra de propósito: com uma lista negra, cada
 * campo novo num simulador passa a seguir por omissão, e o erro só se descobre
 * depois de já ter seguido. Aqui, um campo que ninguém autorizou fica de fora
 * e o pior que acontece é faltar informação — que se vê e se corrige.
 */
export const CAMPOS_PARTILHA: Record<TipoPartilha, readonly string[]> = {
  simulador_irs: [
    "ano", "rendimentoBruto", "regime", "atividade", "coeficiente", "regiao",
    "estadoCivil", "dependentes", "retencoes", "despesas", "irsEstimado",
    "taxaEfetiva", "escalao", "reembolsoOuPagar", "notas",
  ],
  recibos_verdes: [
    "ano", "valorBruto", "atividade", "codigoAtividade", "retencaoPct",
    "segurancaSocial", "isencaoIva", "liquido", "reservaSugerida", "notas",
  ],
  recibo_vencimento: [
    "ano", "vencimentoBruto", "subsidioAlimentacao", "duodecimos",
    "irsRetido", "ssTrabalhador", "liquido", "diferencas", "notas",
  ],
  comparador_regimes: [
    "ano", "cenarios", "recomendacao", "pressupostos", "notas",
  ],
  simulador_empresa: [
    "ano", "formaJuridica", "volumeNegocios", "despesas", "salarioGerente",
    "dividendos", "ircEstimado", "tributacaoAutonoma", "notas",
  ],
  simulador_herancas: [
    "ano", "valorAcervo", "herdeiros", "grauParentesco", "impostoSelo", "notas",
  ],
  cenario_guardado: [
    "nome", "ano", "tipo", "entradas", "resultado", "notas",
  ],
  resumo_anual: [
    "ano", "totalFaturado", "totalRetido", "totalSs", "porTrimestre", "notas",
  ],
};

export const ROTULO_PARTILHA: Record<TipoPartilha, string> = {
  simulador_irs: "Simulação de IRS",
  recibos_verdes: "Recibos verdes",
  recibo_vencimento: "Recibo de vencimento",
  comparador_regimes: "Comparação de regimes",
  simulador_empresa: "Simulação de empresa",
  simulador_herancas: "Heranças e sucessões",
  cenario_guardado: "Cenário guardado",
  resumo_anual: "Resumo anual",
};

export interface ConteudoSanitizado {
  conteudo: Record<string, unknown>;
  /** Campos que vinham no bruto e não estavam autorizados. */
  removidos: string[];
  /** Motivo, quando o conteúdo não pode seguir de todo. */
  erro: string | null;
}

/**
 * Deixa passar só os campos autorizados para o tipo, e nada mais.
 *
 * Os valores são copiados por JSON: um objeto com getters, protótipos ou
 * referências circulares não atravessa a fronteira. O que chega ao
 * contabilista é sempre dados inertes.
 */
export function sanitizarConteudoPartilha(
  tipo: TipoPartilha,
  bruto: unknown
): ConteudoSanitizado {
  const permitidos = CAMPOS_PARTILHA[tipo];
  if (!permitidos) {
    return { conteudo: {}, removidos: [], erro: "Tipo de partilha desconhecido." };
  }
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
    return { conteudo: {}, removidos: [], erro: "Conteúdo inválido." };
  }

  const entrada = bruto as Record<string, unknown>;
  const conteudo: Record<string, unknown> = {};
  const removidos: string[] = [];

  for (const chave of Object.keys(entrada)) {
    if (!permitidos.includes(chave)) {
      removidos.push(chave);
      continue;
    }
    const valor = entrada[chave];
    if (valor === undefined || typeof valor === "function") continue;
    try {
      conteudo[chave] = JSON.parse(JSON.stringify(valor));
    } catch {
      removidos.push(chave);
    }
  }

  if (Object.keys(conteudo).length === 0) {
    return { conteudo: {}, removidos, erro: "Não há nada para enviar." };
  }

  const bytes = new TextEncoder().encode(JSON.stringify(conteudo)).length;
  if (bytes > LIMITE_CONTEUDO_BYTES) {
    return { conteudo: {}, removidos, erro: "A simulação é grande demais para enviar." };
  }

  return { conteudo, removidos, erro: null };
}

/** Título por omissão de uma partilha, quando o cliente não escreve nenhum. */
export function tituloPorOmissao(tipo: TipoPartilha, agora: Date = new Date()): string {
  const data = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(agora);
  return `${ROTULO_PARTILHA[tipo]} — ${data}`;
}
