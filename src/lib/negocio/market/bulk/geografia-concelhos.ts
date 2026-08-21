// ═══════════════════════════════════════════════════════════════════════
//  CONCELHO → NUTS II, derivado da fonte e não escrito à mão
//  ---------------------------------------------------------------------
//  Os contratos públicos trazem a execução como «Portugal, Setúbal,
//  Almada»: país, distrito, concelho. A ferramenta decide por NUTS II. E
//  distrito não é NUTS II — três dos mais importantes atravessam duas:
//
//    · Setúbal  → Península de Setúbal, MAS Sines e Grândola são Alentejo
//    · Lisboa   → Grande Lisboa, MAS Mafra e Torres Vedras são Oeste
//    · Leiria   → Centro, MAS Alcobaça e Peniche são Oeste e Vale do Tejo
//
//  Escrever esse mapa à mão seria pedir o mesmo erro que já aconteceu
//  neste módulo — presumir que `11A` era Grande Lisboa quando é a Área
//  Metropolitana do Porto. A saída é não o escrever: o INE publica os 308
//  concelhos com códigos hierárquicos, em que os primeiros caracteres SÃO
//  a NUTS II. `1B01503` (Almada) começa por `1B`; `1C11513` (Sines) começa
//  por `1C`. O mapa deriva-se da fonte, verifica-se contra ela, e não tem
//  um único palpite nosso lá dentro.
// ═══════════════════════════════════════════════════════════════════════

import { MARKET_REGIONS, type MarketRegion } from "../geografia";

/** Prefixos NUTS II de 2024, do mais longo para o mais curto. */
const PREFIXOS: readonly { prefixo: string; regiao: MarketRegion }[] = Object.freeze(
  MARKET_REGIONS.filter((regiao) => regiao.nutsCode !== null)
    .map((regiao) => ({ prefixo: regiao.nutsCode as string, regiao: regiao.id }))
    // `1A`/`1B`/`1C`/`1D` antes de `1`: um prefixo curto engoliria os
    // longos. Não há prefixo `1` na lista, mas a ordem protege contra
    // alguém o acrescentar sem reparar.
    .sort((esquerda, direita) => direita.prefixo.length - esquerda.prefixo.length),
);

/** As duas NUTS II que são, elas próprias, um distrito. */
const REGIOES_AUTONOMAS: readonly MarketRegion[] = Object.freeze(["acores", "madeira"]);

/** Sem acentos, sem maiúsculas, sem espaços a mais. */
export function normalizarNome(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * O nome sem o qualificador que o INE acrescenta para desambiguar.
 *
 * Onde existem dois concelhos com o mesmo nome, o INE publica-os como
 * «Calheta (R.A.A.)» e «Calheta (R.A.M.)»; o Portal BASE escreve os dois
 * como «Calheta» e diz a região à parte. Tirar o parêntese é o que permite
 * juntar as duas escritas.
 */
function semQualificador(nome: string): string {
  return normalizarNome(nome.replace(/\s*\([^)]*\)\s*$/, ""));
}

/**
 * Grafias que o Portal BASE usa e o INE não reconhece.
 *
 * Isto NÃO é um mapa de geografia — é ortografia. Cada entrada aponta para
 * um nome que tem de existir na lista do INE, e a região continua a sair
 * do código hierárquico dele. Se o INE renomear um concelho, a entrada
 * deixa de casar e o nome volta a aparecer na lista de «por reconhecer»
 * que o job imprime: fica visível, não desaparece numa contagem.
 *
 * `aliasesPendentes()` verifica isto contra a fonte a cada execução.
 */
export const GRAFIAS_ALTERNATIVAS: Readonly<Record<string, string>> = Object.freeze({
  "vila real sto antonio": "Vila Real de Santo António",
  "praia da vitoria": "Vila da Praia da Vitória",
  "freixo espada a cinta": "Freixo de Espada à Cinta",
  "sta marta de penaguiao": "Santa Marta de Penaguião",
  "fig. castelo rodrigo": "Figueira de Castelo Rodrigo",
});

export interface ConcelhoIne {
  codigo: string;
  nome: string;
  regiao: MarketRegion;
}

export interface MapaDeConcelhos {
  /**
   * Grafia normalizada → todos os concelhos que atendem por ela.
   *
   * É deliberadamente uma lista e não um concelho. «lagoa» são DOIS
   * concelhos — o do Algarve, que o INE escreve sem qualificador, e o dos
   * Açores, que ele escreve «Lagoa (R.A.A.)». Um mapa de um-para-um
   * escolhia um deles pela ordem de leitura e mandava os contratos do
   * outro para a região errada, em silêncio e com ar de certo.
   */
  candidatosPorNome: ReadonlyMap<string, readonly ConcelhoIne[]>;
  /** Grafias que identificam um só concelho. */
  porNome: ReadonlyMap<string, ConcelhoIne>;
  /** `regiao|nome-sem-qualificador` → concelho, para desempatar homónimos. */
  porRegiaoENome: ReadonlyMap<string, ConcelhoIne>;
  /** Grafias partilhadas por mais do que um concelho. */
  ambiguos: readonly string[];
  total: number;
}

export function regiaoDoCodigoIne(codigo: string): MarketRegion | null {
  const encontrado = PREFIXOS.find((item) => codigo.startsWith(item.prefixo));
  return encontrado ? encontrado.regiao : null;
}

/**
 * Constrói o mapa a partir das linhas de um indicador do INE que publique
 * as 308 unidades concelhias.
 *
 * Cada concelho é indexado por duas grafias — a do INE tal e qual e a
 * mesma sem qualificador — porque a fonte dos contratos usa ora uma ora
 * outra. Quando duas grafias colidem, nenhuma delas resolve sozinha: quem
 * decide é `resolverLocalExecucao`, com a região que o registo declarar.
 */
export function construirMapaDeConcelhos(
  linhas: readonly { geocod?: unknown; geodsg?: unknown }[],
): MapaDeConcelhos {
  const concelhos = new Map<string, ConcelhoIne>();

  for (const linha of linhas) {
    const codigo = typeof linha.geocod === "string" ? linha.geocod : "";
    const nome = typeof linha.geodsg === "string" ? linha.geodsg : "";
    // Os concelhos são os códigos longos; país, NUTS I, II e III são
    // curtos e não interessam a este mapa.
    if (codigo.length < 7 || !nome) continue;
    if (concelhos.has(codigo)) continue;
    const regiao = regiaoDoCodigoIne(codigo);
    if (!regiao) continue;
    concelhos.set(codigo, { codigo, nome, regiao });
  }

  const candidatosPorNome = new Map<string, ConcelhoIne[]>();
  const porRegiaoENome = new Map<string, ConcelhoIne>();

  for (const concelho of concelhos.values()) {
    const base = semQualificador(concelho.nome);
    porRegiaoENome.set(`${concelho.regiao}|${base}`, concelho);

    for (const grafia of new Set([normalizarNome(concelho.nome), base])) {
      const lista = candidatosPorNome.get(grafia) ?? [];
      if (!lista.some((item) => item.codigo === concelho.codigo)) lista.push(concelho);
      candidatosPorNome.set(grafia, lista);
    }
  }

  const porNome = new Map<string, ConcelhoIne>();
  const ambiguos: string[] = [];
  for (const [grafia, lista] of candidatosPorNome) {
    if (lista.length === 1) porNome.set(grafia, lista[0]);
    else ambiguos.push(grafia);
  }

  return {
    candidatosPorNome,
    porNome,
    porRegiaoENome,
    ambiguos: ambiguos.sort(),
    total: concelhos.size,
  };
}

/**
 * As grafias alternativas que já não apontam para nenhum concelho real.
 *
 * Corre contra o mapa vindo do INE, não contra uma cópia: é a diferença
 * entre saber que a tabela ainda está certa e presumi-lo.
 */
export function aliasesPendentes(mapa: MapaDeConcelhos): readonly string[] {
  return Object.entries(GRAFIAS_ALTERNATIVAS)
    .filter(([, oficial]) => !mapa.porNome.has(normalizarNome(oficial)))
    .map(([grafia, oficial]) => `${grafia} → ${oficial}`);
}

/** Como um local dos contratos foi (ou não) resolvido para uma zona. */
export type ResolucaoGeografica =
  | { estado: "resolvido"; regiao: MarketRegion; concelho: string }
  | { estado: "sem-concelho" }
  | { estado: "concelho-desconhecido"; nome: string }
  | { estado: "concelho-ambiguo"; nome: string };

/** Que região autónoma um distrito nomeia, quando nomeia alguma. */
function regiaoAutonomaDoDistrito(distrito: string): MarketRegion | null {
  if (distrito.includes("madeira")) return "madeira";
  if (distrito.includes("acores")) return "acores";
  return null;
}

/**
 * Escolhe entre concelhos homónimos usando o distrito declarado.
 *
 * Só há duas inferências aqui, e as duas saem dos códigos do INE, não de
 * um mapa distrito→região escrito por nós:
 *
 *  1. o distrito NOMEIA uma região autónoma → é essa;
 *  2. o distrito não nomeia nenhuma → o sítio é no continente, e se só um
 *     dos homónimos for continental, é esse.
 *
 * A segunda é o que salva «Portugal, Faro, Lagoa»: Faro não é uma região
 * autónoma, logo não é a Lagoa dos Açores. Fora destes dois casos fica por
 * resolver — contar à sorte seria pôr o número na região errada.
 */
function desempatar(
  candidatos: readonly ConcelhoIne[],
  distrito: string,
): ConcelhoIne | null {
  const regiaoAutonoma = regiaoAutonomaDoDistrito(distrito);
  if (regiaoAutonoma) {
    const naRegiao = candidatos.filter((item) => item.regiao === regiaoAutonoma);
    return naRegiao.length === 1 ? naRegiao[0] : null;
  }
  const continentais = candidatos.filter((item) => !REGIOES_AUTONOMAS.includes(item.regiao));
  return continentais.length === 1 ? continentais[0] : null;
}

/**
 * Resolve «Portugal, Setúbal, Almada» para uma NUTS II.
 *
 * O distrito NUNCA decide a região sozinho — é precisamente por não ser
 * NUTS II que este módulo existe. Entra só quando o nome do concelho é
 * partilhado por mais do que um, e apenas para escolher entre eles.
 */
export function resolverLocalExecucao(
  local: string,
  mapa: MapaDeConcelhos,
): ResolucaoGeografica {
  const partes = local.split(",").map((parte) => parte.trim()).filter(Boolean);
  if (partes.length < 3) return { estado: "sem-concelho" };

  const nomeConcelho = partes[partes.length - 1];
  const chave = normalizarNome(nomeConcelho);
  const alias = GRAFIAS_ALTERNATIVAS[chave];
  const grafias = alias ? [chave, normalizarNome(alias)] : [chave];
  const distrito = normalizarNome(partes[partes.length - 2]);

  let ambiguo = false;
  for (const grafia of grafias) {
    const candidatos = mapa.candidatosPorNome.get(grafia);
    if (!candidatos || candidatos.length === 0) continue;

    const escolhido =
      candidatos.length === 1 ? candidatos[0] : desempatar(candidatos, distrito);
    if (escolhido) {
      return { estado: "resolvido", regiao: escolhido.regiao, concelho: escolhido.nome };
    }
    ambiguo = true;
  }

  return ambiguo
    ? { estado: "concelho-ambiguo", nome: nomeConcelho }
    : { estado: "concelho-desconhecido", nome: nomeConcelho };
}
