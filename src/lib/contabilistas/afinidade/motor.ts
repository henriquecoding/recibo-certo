// ═══════════════════════════════════════════════════════════════════════
//  O MOTOR — função pura, mesma entrada, mesma saída
//  ---------------------------------------------------------------------
//  Sem rede, sem React, sem relógio. Dá-se-lhe uma necessidade e um lote de
//  fichas; devolve uma ordem com a explicação de cada posição.
//
//  ── A regra que governa tudo o resto ─────────────────────────────────
//  NENHUM SINAL COMERCIAL ENTRA AQUI. Não há patamar, não há comissão, não
//  há destaque pago, não há sequer antiguidade na plataforma. É a mesma
//  promessa que o diretório já faz em `lerDiretorio` («a ordem é explicável
//  em voz alta e não depende de nada comercial»), e o sítio onde ela é mais
//  fácil de quebrar é precisamente este — um motor de recomendação no fim
//  de um funil. Por isso está escrita no topo do ficheiro e coberta por
//  teste.
//
//  ── Porque é que os pesos se renormalizam ────────────────────────────
//  A cobertura territorial só se pode avaliar quando se sabe onde a pessoa
//  está. Quando não se sabe, a alternativa a omitir a dimensão seria dar-lhe
//  um valor neutro — e um valor neutro num denominador fixo castiga toda a
//  gente por igual, o que parece inofensivo até se reparar que comprime as
//  diferenças reais entre as outras dimensões. Omitir é mais honesto e é
//  mais útil.
// ═══════════════════════════════════════════════════════════════════════

import type { CartaoDoDiretorio } from "../diretorio";
import { textoModalidades } from "../diretorio";
import { areasEfetivas, type AreaCanonica, type TermoProprio } from "../personalizacao/taxonomia";
import { alcanceDaCobertura, type Cobertura } from "../personalizacao/cobertura";
import type { CandidatoAfinidade, Dimensao, FonteDoSinal, Necessidade } from "./tipos";

/**
 * Os pesos. Somam 1 quando todas as dimensões se aplicam.
 *
 * `identidade` é o mais baixo de propósito: uma OCC verificada é um facto
 * relevante, mas é sobre quem a pessoa é e não sobre o que ela sabe fazer.
 * Com peso a sério, empurraria para o topo alguém que não trabalha na área
 * — e transformava um selo administrativo num critério de recomendação.
 */
export const PESOS = {
  areas: 0.6,
  termos: 0.15,
  cobertura: 0.1,
  disponibilidade: 0.1,
  identidade: 0.05,
} as const;

/** Uma área implícita vale menos do que uma marcada. Ver `tipos.ts`. */
const CREDITO_AREA_IMPLICITA = 0.85;

/** Acima de três termos casados, mais termos não provam mais nada. */
const TERMOS_PARA_MAXIMO = 3;

/** O que o motor precisa de saber de uma ficha, além do que o cartão traz. */
export interface FichaParaAfinidade {
  cartao: CartaoDoDiretorio;
  /** Os termos próprios, já lidos por `lerTermos`. */
  termos: TermoProprio[];
  /** A cobertura, já lida por `lerCobertura`. `null` quando não a declarou. */
  cobertura: Cobertura | null;
}

// ─── Normalização de texto ─────────────────────────────────────────────

function chave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * O termo que a pessoa escreveu casa com o vocabulário deste contexto?
 *
 * A comparação é por SEQUÊNCIA DE PALAVRAS, e não por contenção de texto.
 * A diferença é a que separa um motor útil de um motor embaraçoso: com
 * contenção de texto, «IVA» casa com «consultoria privativa» — o mesmo
 * acidente que a taxonomia já teve de resolver, e que aqui apareceria
 * outra vez a dizer, no ecrã de alguém, que uma contabilista de direito da
 * família é especialista em IVA.
 *
 * Cada palavra casa com a sua forma plural («criador» ↔ «criadores»,
 * «cliente» ↔ «clientes»), e só com essa: aceitar qualquer sufixo curto
 * faria «casa» casar com «casal».
 */
export function termoCasaVocabulario(termo: string, vocabulario: readonly string[]): boolean {
  const t = palavras(termo);
  if (t.length === 0 || t.join("").length < 3) return false;

  for (const bruto of vocabulario) {
    const v = palavras(bruto);
    if (v.length === 0 || v.join("").length < 3) continue;
    if (sequenciaEm(t, v) || sequenciaEm(v, t)) return true;
  }
  return false;
}

function palavras(s: string): string[] {
  return chave(s).split(" ").filter(Boolean);
}

/** Duas palavras são a mesma quando só as separa um plural. */
function mesmaRaiz(a: string, b: string): boolean {
  if (a === b) return true;
  const [curta, longa] = a.length <= b.length ? [a, b] : [b, a];
  if (curta.length < 3) return false;
  return longa === `${curta}s` || longa === `${curta}es`;
}

/** A agulha aparece, palavra a palavra e seguida, dentro do palheiro? */
function sequenciaEm(agulha: readonly string[], palheiro: readonly string[]): boolean {
  if (agulha.length === 0 || agulha.length > palheiro.length) return false;
  for (let i = 0; i <= palheiro.length - agulha.length; i++) {
    let bate = true;
    for (let k = 0; k < agulha.length; k++) {
      if (!mesmaRaiz(agulha[k], palheiro[i + k])) { bate = false; break; }
    }
    if (bate) return true;
  }
  return false;
}

// ─── As dimensões ──────────────────────────────────────────────────────

/**
 * Uma enumeração em português — com uma exceção que se vê no ecrã.
 *
 * «Trabalha com recibos verdes e trabalhadores e salários.» Duas áreas,
 * três «e», e quem lê conta três coisas em vez de duas. Acontece porque
 * metade dos nomes do eixo já traz uma conjunção dentro («Trabalhadores e
 * salários», «Sociedades e IRC», «Heranças e sucessões», «Dívidas e
 * execuções»).
 *
 * Quando um dos itens já tem um «e», a lista passa a vírgulas e a
 * ambiguidade desaparece. Nos outros casos — «confirmada e LinkedIn
 * ligado» — a conjunção é a forma certa e fica.
 */
function juntar(itens: readonly string[]): string {
  if (itens.length === 0) return "";
  if (itens.length === 1) return itens[0];
  if (itens.some((i) => / e /i.test(i))) return itens.join(", ");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * Uma área escrita a meio de uma frase.
 *
 * `.toLowerCase()` sobre o nome inteiro dava «trabalha com irs e iva» — e
 * um acrónimo em minúsculas num produto fiscal lê-se como descuido, porque
 * é. Aqui baixa-se palavra a palavra, e o que está todo em maiúsculas fica
 * como está: «Sociedades e IRC» → «sociedades e IRC».
 */
export function emFrase(area: string): string {
  return area
    .split(" ")
    .map((p) => (p.length >= 2 && p === p.toUpperCase() ? p : p.toLowerCase()))
    .join(" ");
}

interface ResultadoAreas {
  dimensoes: Dimensao[];
  areasQueExplicam: AreaCanonica[];
  /** Quais delas foram MARCADAS, por oposição a inferidas de um termo. */
  declaradas: AreaCanonica[];
  valor: number;
}

function avaliarAreas(ficha: FichaParaAfinidade, n: Necessidade): ResultadoAreas {
  const marcadas = new Set(ficha.cartao.especialidades);
  const efetivas = new Set(areasEfetivas(ficha.cartao.especialidades, ficha.termos));

  const total = n.areas.reduce((s, a) => s + a.peso, 0);
  let obtido = 0;
  const cobertas: AreaCanonica[] = [];
  const declaradas: AreaCanonica[] = [];
  const implicitas: AreaCanonica[] = [];

  for (const { area, peso } of n.areas) {
    if (!efetivas.has(area)) continue;
    cobertas.push(area);
    if (marcadas.has(area)) {
      declaradas.push(area);
      obtido += peso;
    } else {
      implicitas.push(area);
      obtido += peso * CREDITO_AREA_IMPLICITA;
    }
  }

  const valor = total > 0 ? Math.min(1, obtido / total) : 0;
  const dimensoes: Dimensao[] = [];

  const notaImplicita =
    `${juntar(implicitas.map(emFrase))} ` +
    `${implicitas.length === 1 ? "vem" : "vêm"} do que escreveu no perfil, não de um filtro marcado.`;

  if (declaradas.length > 0) {
    dimensoes.push({
      fonte: "area_declarada",
      valor,
      peso: PESOS.areas,
      nota: `Escolheu ${juntar(declaradas.map(emFrase))} como área de trabalho.`,
    });
    if (implicitas.length > 0) {
      // Decorativa: o crédito das áreas implícitas já está dentro do `valor`
      // da dimensão declarada acima (via `CREDITO_AREA_IMPLICITA` em
      // `obtido`). Um segundo peso aqui somava a mesma prova duas vezes.
      dimensoes.push({ fonte: "area_implicita", valor, peso: 0, nota: notaImplicita });
    }
  } else if (implicitas.length > 0) {
    // SEM nenhuma área marcada: esta é a ÚNICA dimensão de área, e tem de
    // entrar com peso a sério — senão o desconto de `CREDITO_AREA_IMPLICITA`
    // nunca chega a contar, e um perfil que só se descreve pela clientela
    // (em vez de marcar a etiqueta) fica sem crédito nenhum pela área.
    dimensoes.push({ fonte: "area_implicita", valor, peso: PESOS.areas, nota: notaImplicita });
  } else {
    dimensoes.push({ fonte: "area_declarada", valor: 0, peso: PESOS.areas, nota: null });
  }

  return { dimensoes, areasQueExplicam: cobertas, declaradas, valor };
}

function avaliarTermos(
  ficha: FichaParaAfinidade,
  n: Necessidade,
): { dimensao: Dimensao; termos: string[] } {
  const casados = ficha.termos
    .filter((t) => termoCasaVocabulario(t.texto, n.vocabulario))
    .map((t) => t.texto);

  const valor = Math.min(1, casados.length / TERMOS_PARA_MAXIMO);

  return {
    termos: casados,
    dimensao: {
      fonte: "termo_proprio",
      valor,
      peso: PESOS.termos,
      nota: casados.length > 0
        ? `Descreve-se com ${juntar(casados.map((t) => `«${t}»`))}.`
        : null,
    },
  };
}

/**
 * A cobertura. `null` quando não se sabe onde a pessoa está — e nesse caso
 * a dimensão não entra na conta, em vez de entrar com um palpite.
 */
function avaliarCobertura(ficha: FichaParaAfinidade, n: Necessidade): Dimensao | null {
  const procurado = n.concelho?.trim() || n.distrito?.trim() || "";
  if (!procurado) return null;

  const online = ficha.cartao.modalidades.includes("online");
  const alvo = chave(procurado);

  const alcance = ficha.cobertura
    ? alcanceDaCobertura(ficha.cobertura)
    : {
        distritos: ficha.cartao.distrito ? [ficha.cartao.distrito] : [],
        concelhos: ficha.cartao.concelho ? [ficha.cartao.concelho] : [],
        nacional: false,
      };

  const noLocal =
    alcance.nacional ||
    alcance.concelhos.some((c) => chave(c) === alvo) ||
    alcance.distritos.some((d) => chave(d) === alvo);

  if (noLocal) {
    return {
      fonte: "cobertura",
      valor: 1,
      peso: PESOS.cobertura,
      nota: alcance.nacional ? "Atende em todo o país." : `Atende em ${procurado}.`,
    };
  }
  if (online) {
    // Atender online não é o mesmo que ser de lá, mas é chegar lá. Vale
    // mais do que um escritório noutro distrito e menos do que estar perto.
    return { fonte: "cobertura", valor: 0.7, peso: PESOS.cobertura, nota: "Atende online." };
  }
  return { fonte: "cobertura", valor: 0.2, peso: PESOS.cobertura, nota: null };
}

function avaliarDisponibilidade(ficha: FichaParaAfinidade): Dimensao {
  const aceita = ficha.cartao.aceitaNovosClientes;
  return {
    fonte: "disponibilidade",
    valor: aceita ? 1 : 0,
    peso: PESOS.disponibilidade,
    nota: aceita ? "Está a aceitar clientes." : null,
  };
}

function avaliarIdentidade(ficha: FichaParaAfinidade): Dimensao {
  const occ = ficha.cartao.occVerificado ? 0.6 : 0;
  const linkedin = ficha.cartao.linkedinLigado ? 0.4 : 0;
  const valor = occ + linkedin;

  const partes: string[] = [];
  if (ficha.cartao.occVerificado) partes.push("inscrição na Ordem confirmada");
  if (ficha.cartao.linkedinLigado) partes.push("LinkedIn ligado");

  return {
    fonte: "identidade",
    valor,
    peso: PESOS.identidade,
    nota: partes.length > 0 ? `Tem ${juntar(partes)}.` : null,
  };
}

// ─── A frase do cartão ─────────────────────────────────────────────────

/**
 * O motivo, em pt-PT, sem superlativos e sem comparações.
 *
 * A ordem por que se tenta cada frase é a ordem da força da prova: uma área
 * marcada é uma declaração, um termo escrito é uma descrição, e a
 * modalidade é o que sobra quando não há nem uma nem outra. Nunca se diz
 * «o mais indicado» — o motor ordena, não avalia.
 */
export function explicar(
  declaradas: readonly AreaCanonica[],
  implicitas: readonly AreaCanonica[],
  termos: readonly string[],
  cartao: CartaoDoDiretorio,
): string {
  if (declaradas.length > 0) {
    return `Trabalha com ${juntar(declaradas.slice(0, 2).map(emFrase))}.`;
  }
  if (termos.length > 0) {
    return `No perfil: ${juntar(termos.slice(0, 2).map((t) => `«${t}»`))}.`;
  }
  if (implicitas.length > 0) {
    return `O perfil aponta para ${juntar(implicitas.slice(0, 2).map(emFrase))}.`;
  }
  return `${textoModalidades(cartao.modalidades)} — sem área declarada para este caso.`;
}

// ─── A ordem ───────────────────────────────────────────────────────────

/**
 * Pontua e ordena. `limite` corta no fim, nunca antes de pontuar: cortar
 * antes seria escolher pela ordem em que a base de dados devolveu as
 * linhas.
 */
export function ordenarPorAfinidade(
  fichas: readonly FichaParaAfinidade[],
  necessidade: Necessidade,
  { limite = 3 }: { limite?: number } = {},
): CandidatoAfinidade[] {
  const pontuados = fichas.map((ficha) => {
    const areas = avaliarAreas(ficha, necessidade);
    const termos = avaliarTermos(ficha, necessidade);
    const cobertura = avaliarCobertura(ficha, necessidade);
    const disponibilidade = avaliarDisponibilidade(ficha);
    const identidade = avaliarIdentidade(ficha);

    const dimensoes: Dimensao[] = [
      ...areas.dimensoes,
      termos.dimensao,
      ...(cobertura ? [cobertura] : []),
      disponibilidade,
      identidade,
    ];

    // Só as dimensões com peso entram no denominador. `area_implicita`
    // entra com peso 0 porque é uma NOTA sobre a dimensão das áreas, e não
    // uma dimensão a somar duas vezes.
    const comPeso = dimensoes.filter((d) => d.peso > 0);
    const total = comPeso.reduce((s, d) => s + d.peso, 0);
    const soma = comPeso.reduce((s, d) => s + d.peso * d.valor, 0);

    return {
      ficha,
      dimensoes,
      areasQueExplicam: areas.areasQueExplicam,
      declaradas: areas.declaradas,
      implicitas: areas.areasQueExplicam.filter((a) => !areas.declaradas.includes(a)),
      termosQueExplicam: termos.termos,
      correspondeAsAreas: areas.valor > 0,
      pontuacao: total > 0 ? Math.round((soma / total) * 100) : 0,
    };
  });

  // Desempate determinístico: a mesma lista não pode trocar de ordem entre
  // dois carregamentos. Nada aqui é comercial.
  pontuados.sort((a, b) => {
    if (b.pontuacao !== a.pontuacao) return b.pontuacao - a.pontuacao;
    const va = a.ficha.cartao.aceitaNovosClientes ? 0 : 1;
    const vb = b.ficha.cartao.aceitaNovosClientes ? 0 : 1;
    if (va !== vb) return va - vb;
    return a.ficha.cartao.nome.localeCompare(b.ficha.cartao.nome, "pt");
  });

  const escolhidos = pontuados.slice(0, Math.max(0, limite));

  return escolhidos.map((p, i) => {
    // A posição é a do PRIMEIRO com esta pontuação: dois empatados são
    // ambos «1.º», e o seguinte é «3.º». Renumerar 1, 2, 3 fabricava uma
    // ordem entre iguais.
    const posicao = escolhidos.findIndex((x) => x.pontuacao === p.pontuacao) + 1;
    const empatadoCom = escolhidos
      .filter((x, k) => k !== i && x.pontuacao === p.pontuacao)
      .map((x) => x.ficha.cartao.nome);

    return {
      cartao: p.ficha.cartao,
      pontuacao: p.pontuacao,
      posicao,
      empatadoCom,
      dimensoes: p.dimensoes,
      areasQueExplicam: p.areasQueExplicam,
      termosQueExplicam: p.termosQueExplicam,
      correspondeAsAreas: p.correspondeAsAreas,
      motivo: explicar(p.declaradas, p.implicitas, p.termosQueExplicam, p.ficha.cartao),
    };
  });
}

/**
 * Os que vão mesmo aparecer.
 *
 * ── Encher a grelha não é uma razão para mostrar alguém ────────────────
 *  Quando há quem trabalhe nesta matéria, é só isso que se mostra. Um
 *  especialista em heranças no fim de um simulador de IRS não é um
 *  terceiro cartão: é ruído com o nome de uma pessoa em cima. E obrigava a
 *  frase de topo — «estes contabilistas trabalham com IRS» — a afirmar
 *  sobre os três o que só era verdade para dois.
 *
 *  Quando NINGUÉM corresponde, mostra-se o que existe. A alternativa era
 *  não mostrar nada a quem procura ajuda, e a secção diz na página, nesse
 *  caso, que estes atendem de forma geral.
 */
export function apenasCorrespondentes(
  ordenados: readonly CandidatoAfinidade[],
  limite: number,
): CandidatoAfinidade[] {
  const correspondentes = ordenados.filter((c) => c.correspondeAsAreas);
  const base = correspondentes.length > 0 ? correspondentes : ordenados;
  return base.slice(0, Math.max(0, limite));
}

/** As fontes que a interface pode mostrar como razão. Ordem de leitura. */
export const ORDEM_DAS_FONTES: readonly FonteDoSinal[] = [
  "area_declarada",
  "area_implicita",
  "termo_proprio",
  "cobertura",
  "disponibilidade",
  "identidade",
];
