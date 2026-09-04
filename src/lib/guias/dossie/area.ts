// ═══════════════════════════════════════════════════════════════════════
//  O MAPA DE VOCABULÁRIO — HubGroup → AreaDoCaso  (achado A11)
//  ---------------------------------------------------------------------
//  Havia três vocabulários para a mesma coisa e nenhum mapa entre eles:
//  `HubGroup` (15 valores, a arrumação editorial dos Guias), `GuideTopic`
//  (9, o contrato da FIZ) e `AreaDoCaso` (8, o que a plataforma de
//  contabilistas usa para triar). Sem tradução, um dossiê não sabia que
//  área declarar ao caso — e a alternativa (deixar o cliente escolher outra
//  vez) era pedir-lhe que classificasse o que acabámos de classificar.
//
//  O mapa é uma TABELA, não uma heurística. Com 169 guias, uma heurística
//  falha em silêncio: acerta em 150, erra em 19, e ninguém sabe quais.
//  `dossie:area` exige que os 169 resolvam e que nenhuma exceção aponte
//  para um slug que já não existe.
//
//  Cinco hubs não têm resposta única — `casa`, `prazos`, `direitos`,
//  `encerrar` e `profissao` misturam matérias de áreas diferentes — e por
//  isso resolvem-se POR SLUG, com omissão `outro`. «Outro» não é falha: é
//  o que a própria plataforma oferece a quem tem um assunto que não cabe
//  nas sete caixas, e mentir sobre a área faz a triagem ir para o sítio
//  errado.
// ═══════════════════════════════════════════════════════════════════════

import type { HubGroup } from "@/lib/guias/manifests";
import type { AreaDoCaso } from "@/lib/contabilistas/areas";

/** Os hubs cuja matéria é única. Um hub daqui resolve sem olhar ao slug. */
export const AREA_POR_HUB: Partial<Record<HubGroup, AreaDoCaso>> = {
  comecar: "inicio_atividade",
  faturar: "iva",
  contribuir: "seguranca_social",
  irs: "irs",
  investir: "irs",
  familia: "irs",
  reforma: "irs",
  estrangeiro: "irs",
  empresa: "empresa",
  // O rendimento de quem trabalha por conta de outrem declara-se em IRS, e
  // é aí que um contabilista o trata. As matérias puramente laborais deste
  // hub — férias, despedimento, assédio — estão nas exceções por slug: são
  // direito do trabalho, não fiscalidade, e mandá-las para «IRS» punha-as
  // à frente de quem não as sabe responder.
  "conta-outrem": "irs",
};

/** Os hubs que misturam matérias e por isso se resolvem por slug. */
export const HUBS_POR_SLUG: readonly HubGroup[] = [
  "casa", "prazos", "direitos", "encerrar", "profissao",
];

/**
 * Exceções por slug.
 *
 * Duas famílias, e valem por razões diferentes:
 *
 *  1. os slugs dos cinco hubs sem resposta única — aqui a tabela É a
 *     resolução, e o que não estiver nela cai em `outro`;
 *  2. slugs de hubs resolvidos que, ainda assim, pertencem a outra área —
 *     `contabilidade-organizada` está em «Começar» e é literalmente o nome
 *     de uma das áreas; heranças e doações estão em «Família» e têm área
 *     própria; o assédio no trabalho está em «Conta de outrem» e não é IRS.
 */
export const AREA_POR_SLUG: Record<string, AreaDoCaso> = {
  // ── Hubs resolvidos, com matéria própria ────────────────────────────
  "contabilidade-organizada": "contabilidade_organizada",
  "herancas-imposto-selo": "herancas",
  doacoes: "herancas",
  "herdar-imovel": "herancas",
  // Direito do trabalho, não fiscalidade. Ver a nota em `conta-outrem`.
  "ferias-direitos": "outro",
  despedimento: "outro",
  "assedio-trabalho": "outro",
  "faltas-ao-trabalho": "outro",
  "periodo-experimental": "outro",
  "contrato-a-termo": "outro",
  "banco-de-horas": "outro",
  "formacao-40-horas": "outro",
  teletrabalho: "outro",
  "trabalhador-estudante": "outro",
  "acidente-de-trabalho": "outro",
  "fim-do-contrato": "outro",

  // ── casa ─────────────────────────────────────────────────────────────
  //  Os impostos do património (IMI, IMT, AIMI, selo da compra, VPT) não
  //  são nenhuma das sete áreas: são «outro», e dizê-lo é mais honesto do
  //  que arrumá-los em IRS porque calha haver uma caixa com esse nome.
  imi: "outro",
  imt: "outro",
  aimi: "outro",
  "imposto-selo-compra-casa": "outro",
  "vpt-reavaliacao": "outro",
  "mais-valias-imoveis": "irs",
  "arrendamento-categoria-f": "irs",
  "despesas-senhorio": "irs",
  "recibo-renda-modelo-44": "irs",
  "alojamento-local": "irs",
  "al-vs-arrendamento": "irs",
  "imovel-empresa-ou-pessoal": "empresa",

  // ── prazos ───────────────────────────────────────────────────────────
  "calendario-fiscal": "outro",
  "portal-das-financas": "outro",
  "situacao-regularizada": "outro",
  "declaracao-periodica-iva": "iva",
  "declaracao-recapitulativa": "iva",
  "pagamentos-por-conta-irc": "empresa",
  "modelo-22-e-ies": "empresa",
  "saf-t-faturacao": "empresa",
  "modelo-10": "empresa",
  "modelo-30": "empresa",
  "dmr-dmis": "seguranca_social",

  // ── direitos ─────────────────────────────────────────────────────────
  //  A maior parte é procedimento tributário — dívida, execução, defesa —
  //  e não cabe em nenhuma das sete áreas fiscais. Fica «outro», que é
  //  exatamente o que a plataforma diz: «outra coisa, descreve na tua
  //  situação». O dossiê é que traz a descrição já escrita.
  "fatura-nao-paga": "irs",
  "recuperar-iva-incobravel": "iva",
  "iva-de-caixa": "iva",
  "reversao-gerentes": "empresa",
  "inspecao-tributaria": "empresa",
  "juros-de-mora": "outro",
  "cobrar-divida": "outro",
  "contestar-liquidacao": "outro",
  "prazos-fiscais-divida": "outro",
  "juros-indemnizatorios": "outro",
  "execucao-fiscal": "outro",
  "plano-prestacoes": "outro",
  "suspender-execucao": "outro",
  "penhora-limites": "outro",
  "falsos-recibos-verdes": "outro",
  "coimas-fiscais": "outro",
  "regularizacao-voluntaria": "outro",
  "insolvencia-pessoal": "outro",

  // ── encerrar ─────────────────────────────────────────────────────────
  //  Conforme o público, como o relatório fixou: quem cessa atividade é
  //  independente e o trabalho é de enquadramento; quem fecha a empresa
  //  tem uma sociedade e o trabalho é societário.
  "cessar-atividade": "inicio_atividade",
  "fechar-empresa": "empresa",

  // ── profissao ────────────────────────────────────────────────────────
  //  Os dez guias por profissão respondem todos à mesma pergunta — «como
  //  me enquadro a fazer isto?» — e é essa a área.
  "tvde-motorista": "inicio_atividade",
  "estafeta-plataformas": "inicio_atividade",
  "criadores-de-conteudo": "inicio_atividade",
  "plataformas-subscricao": "inicio_atividade",
  "freelancer-tecnologia": "inicio_atividade",
  "profissionais-saude": "inicio_atividade",
  "formadores-explicadores": "inicio_atividade",
  "artistas-direitos-autor": "inicio_atividade",
  "mediacao-comissoes": "inicio_atividade",
  "arquitetos-engenheiros": "inicio_atividade",
};

/**
 * A área do caso de um guia.
 *
 * Função pura, com o hub passado de fora: pedir o manifesto aqui dentro
 * arrastava o catálogo inteiro para qualquer módulo que precisasse de
 * traduzir uma área — e é isso que a regra de empacotamento proíbe.
 */
export function resolverArea(slug: string, hub: HubGroup): AreaDoCaso {
  const excecao = AREA_POR_SLUG[slug];
  if (excecao) return excecao;
  return AREA_POR_HUB[hub] ?? "outro";
}
