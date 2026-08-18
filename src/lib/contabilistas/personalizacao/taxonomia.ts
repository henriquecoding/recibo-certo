// ═══════════════════════════════════════════════════════════════════════
//  TAXONOMIA DE ÁREAS — abrir sem partir o diretório
//  ---------------------------------------------------------------------
//  Havia dez chips fixos. Quem trabalha com nómadas digitais, com atletas,
//  com heranças no estrangeiro ou com criptomoeda não se reconhecia em
//  nenhum, e o perfil ficava indistinguível do do vizinho.
//
//  A resposta óbvia — campo de texto livre — parte o diretório em silêncio.
//  «IRS», «I.R.S.» e «irs» passam a ser três filtros, e a pessoa que
//  pesquisa por um deles deixa de ver dois terços de quem sabe fazer aquilo.
//
//  Este motor resolve as duas coisas ao mesmo tempo. Há um EIXO canónico
//  — as áreas por que o diretório filtra, poucas e estáveis — e há termos
//  PRÓPRIOS, escritos por quem quiser, que o motor normaliza e liga ao
//  eixo. Quem escreve «recibos verdes p/ freelancers de UX» fica com o
//  termo tal como o escreveu no perfil E entra no filtro «Recibos verdes».
//
//  A regra que atravessa tudo: um termo próprio NUNCA cria um filtro novo.
//  Descreve; não fragmenta.
// ═══════════════════════════════════════════════════════════════════════

import { ESPECIALIDADES } from "../catalogo";

export type AreaCanonica = (typeof ESPECIALIDADES)[number];

/** O eixo canónico, reexportado para quem só precisa dele. */
export const AREAS: readonly AreaCanonica[] = ESPECIALIDADES;

// ─── Sinónimos ─────────────────────────────────────────────────────────

/**
 * O que as pessoas escrevem, e a área a que isso corresponde.
 *
 * Não é um dicionário de tradução: é o mapa entre a linguagem de quem
 * procura e a de quem classifica. Foi escrito a partir das palavras que
 * já aparecem nos guias e nos clusters de decisão do projeto, e não de
 * suposições sobre o que as pessoas dirão.
 */
const SINONIMOS: Readonly<Record<AreaCanonica, readonly string[]>> = {
  "Recibos verdes": [
    "recibo verde", "ato isolado", "acto isolado", "trabalhador independente",
    "independente", "freelancer", "freelance", "prestacao de servicos",
    "categoria b", "regime simplificado", "verdes",
  ],
  IRS: [
    "declaracao de rendimentos", "modelo 3", "anexo b", "anexo j", "irs jovem",
    "englobamento", "deducoes a coleta", "reembolso", "irs",
  ],
  IVA: [
    "artigo 53", "art 53", "isencao de iva", "declaracao periodica",
    "reverse charge", "autoliquidacao", "iva",
  ],
  "Contabilidade organizada": [
    "contabilidade", "organizada", "encerramento de contas", "balancete",
    "ies", "prestacao de contas", "sni", "snc",
  ],
  "Abertura de atividade": [
    "abrir atividade", "abertura", "inicio de atividade", "cae",
    "cessacao de atividade", "alteracao de atividade",
  ],
  "Sociedades e IRC": [
    "empresa", "sociedade", "unipessoal", "lda", "irc", "constituicao de empresa",
    "derrama", "tributacao autonoma",
  ],
  "Trabalhadores e salários": [
    "salarios", "processamento salarial", "recibo de vencimento", "folha de salarios",
    "seguranca social", "contratos de trabalho", "subsidio de alimentacao", "rh",
  ],
  "Clientes internacionais": [
    "estrangeiro", "nomada digital", "nomadas digitais", "expat", "rnh",
    "residente nao habitual", "dupla tributacao", "vies", "intracomunitario",
    "cripto", "criptomoeda", "criptoativos",
  ],
  "Heranças e sucessões": [
    "heranca", "sucessao", "partilha", "imposto do selo", "obito",
    "cabeca de casal", "doacao",
  ],
  "Dívidas e execuções": [
    "divida", "execucao fiscal", "penhora", "plano prestacional",
    "prestacoes", "citacao", "reclamacao graciosa",
  ],
};

function chave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Índice invertido: sinónimo normalizado → área. Construído uma vez. */
const INDICE: ReadonlyMap<string, AreaCanonica> = (() => {
  const m = new Map<string, AreaCanonica>();
  for (const area of AREAS) {
    m.set(chave(area), area);
    for (const s of SINONIMOS[area]) m.set(chave(s), area);
  }
  return m;
})();

/**
 * A área a que um texto corresponde, ou `null`.
 *
 * Tenta primeiro a correspondência exacta e só depois a contenção. A
 * ordem importa: «IVA» está contido em «privativa», e sem a passagem
 * exacta à frente o motor classificaria mal por acidente.
 */
export function areaDoTermo(texto: string): AreaCanonica | null {
  const k = chave(texto);
  if (!k) return null;

  const exacta = INDICE.get(k);
  if (exacta) return exacta;

  // Contenção por palavra inteira, do sinónimo mais longo para o mais
  // curto: «irs jovem» tem de ganhar a «irs» quando ambos casam.
  //
  // O sufixo de plural é opcional e não é um detalhe: quem escreve
  // «freelancers de design» tem de cair em «Recibos verdes» tal como quem
  // escreve «freelancer». Sem isto, o motor classificava metade do que
  // as pessoas escrevem como não classificável.
  const candidatos = [...INDICE.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [sinonimo, area] of candidatos) {
    const escapado = sinonimo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const limite = new RegExp(`(?:^|\\s)${escapado}(?:s|es)?(?:\\s|$)`, "u");
    if (limite.test(k)) return area;
  }
  return null;
}

// ─── Termos próprios ───────────────────────────────────────────────────

export const MAX_TERMOS = 8;
export const MAX_CARACTERES_TERMO = 48;

export interface TermoProprio {
  /** Exactamente como a pessoa o escreveu. É isto que aparece no perfil. */
  texto: string;
  /** A área do eixo a que fica ligado. `null` = descreve, não filtra. */
  area: AreaCanonica | null;
}

export type MotivoRecusa =
  | "vazio"
  | "longo_demais"
  | "duplicado"
  | "limite_atingido"
  | "igual_a_area";

export interface ResultadoTermo {
  ok: boolean;
  termo: TermoProprio | null;
  motivo: MotivoRecusa | null;
  /** O que dizer a quem escreveu. */
  mensagem: string | null;
}

const MENSAGENS: Record<MotivoRecusa, string> = {
  vazio: "Escreve alguma coisa primeiro.",
  longo_demais: `Um termo tem de caber em ${MAX_CARACTERES_TERMO} caracteres. Isto é uma etiqueta, não uma frase.`,
  duplicado: "Já tens esse termo.",
  limite_atingido: `O máximo são ${MAX_TERMOS} termos. Mais do que isso e deixa de se perceber o que fazes.`,
  igual_a_area: "Essa já é uma das áreas — basta escolhê-la acima.",
};

/**
 * Acrescenta um termo próprio à lista.
 *
 * Recusar um termo igual a uma área não é preciosismo: sem essa recusa, o
 * perfil mostrava «IRS» duas vezes, uma como área e outra como termo, e
 * quem lê conclui que são coisas diferentes.
 */
export function acrescentarTermo(
  atuais: readonly TermoProprio[],
  texto: string
): ResultadoTermo {
  const limpo = texto.replace(/\s+/g, " ").trim();

  if (!limpo) return recusa("vazio");
  if (limpo.length > MAX_CARACTERES_TERMO) return recusa("longo_demais");
  if (atuais.length >= MAX_TERMOS) return recusa("limite_atingido");

  const k = chave(limpo);
  if (atuais.some((t) => chave(t.texto) === k)) return recusa("duplicado");
  if (AREAS.some((a) => chave(a) === k)) return recusa("igual_a_area");

  return {
    ok: true,
    termo: { texto: limpo, area: areaDoTermo(limpo) },
    motivo: null,
    mensagem: null,
  };
}

function recusa(motivo: MotivoRecusa): ResultadoTermo {
  return { ok: false, termo: null, motivo, mensagem: MENSAGENS[motivo] };
}

/**
 * As áreas por que este perfil deve ser encontrado.
 *
 * Junta as áreas escolhidas às áreas implícitas nos termos próprios. É
 * esta a função que faz a promessa do motor cumprir-se: quem escreveu
 * «nómadas digitais» aparece no filtro «Clientes internacionais» sem ter
 * de se lembrar de o marcar também.
 */
export function areasEfetivas(
  escolhidas: readonly string[],
  termos: readonly TermoProprio[]
): AreaCanonica[] {
  const conjunto = new Set<AreaCanonica>();
  for (const e of escolhidas) {
    const a = AREAS.find((x) => x === e) ?? areaDoTermo(e);
    if (a) conjunto.add(a);
  }
  for (const t of termos) if (t.area) conjunto.add(t.area);
  // Devolvido pela ordem do eixo, não pela de inserção: a mesma ficha tem
  // de produzir sempre a mesma lista, senão o diretório muda de ordem
  // sozinho entre dois carregamentos.
  return AREAS.filter((a) => conjunto.has(a));
}

/**
 * Sugestões enquanto se escreve. Devolve áreas, nunca termos inventados.
 *
 * Uma sugestão que não seja uma área do eixo empurraria as pessoas para
 * vocabulário que o diretório não sabe filtrar — que é exactamente o
 * problema que este motor existe para evitar.
 */
export function sugerirAreas(rascunho: string, jaEscolhidas: readonly string[]): AreaCanonica[] {
  const k = chave(rascunho);
  if (k.length < 2) return [];

  const direta = areaDoTermo(rascunho);
  const porPrefixo = AREAS.filter((a) => chave(a).includes(k));
  const todas = direta ? [direta, ...porPrefixo] : porPrefixo;

  return [...new Set(todas)].filter((a) => !jaEscolhidas.includes(a)).slice(0, 4);
}

// ─── Persistência ──────────────────────────────────────────────────────

/**
 * Lê termos próprios vindos da base de dados.
 *
 * Tolera lixo em vez de lançar — pelo mesmo motivo de `lerBlocos`: um
 * termo estragado não pode apagar o perfil inteiro de quem vive dele.
 *
 * A área é RECALCULADA e não lida: o mapa de sinónimos cresce, e um termo
 * gravado há seis meses tem de passar a apanhar a área que hoje lhe
 * corresponde sem ninguém ter de reescrever nada.
 */
export function lerTermos(bruto: unknown): TermoProprio[] {
  if (!Array.isArray(bruto)) return [];

  const out: TermoProprio[] = [];
  const vistos = new Set<string>();

  for (const x of bruto) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.texto !== "string") continue;

    const texto = o.texto.replace(/\s+/g, " ").trim().slice(0, MAX_CARACTERES_TERMO);
    const k = chave(texto);
    if (!texto || vistos.has(k)) continue;
    vistos.add(k);

    out.push({ texto, area: areaDoTermo(texto) });
    if (out.length >= MAX_TERMOS) break;
  }
  return out;
}
