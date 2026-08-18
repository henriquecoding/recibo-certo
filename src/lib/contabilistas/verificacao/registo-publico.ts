// ═══════════════════════════════════════════════════════════════════════
//  REGISTO PÚBLICO — a via assistida, que é a que funciona hoje
//  ---------------------------------------------------------------------
//  O registo público da Ordem é a fonte canónica e está aberto a
//  qualquer pessoa (art. 21.º, n.º 1 do EOCC). O que ele não é, é uma
//  API: a pesquisa está protegida por reCAPTCHA validado no servidor.
//
//  Isso podia ler-se como um obstáculo. Não é — é uma decisão da Ordem
//  sobre como o registo é consultado, e o desenho respeita-a. Este
//  ficheiro não faz nenhum pedido à Ordem. Faz outra coisa, mais chata e
//  mais honesta: transforma a consulta humana num acto REPETÍVEL e
//  AUDITÁVEL, para que duas pessoas diferentes, em dias diferentes,
//  cheguem à mesma conclusão sobre a mesma ficha.
//
//  Três peças:
//
//    · `linkDoRegisto`     — leva a administração ao sítio certo.
//    · `compararComRegisto`— compara o que se leu com o que está na ficha,
//                            e diz o que bate e o que não bate.
//    · `Evidencia`         — o que fica gravado. Sem isto, «verificado» é
//                            a palavra de quem carregou no botão.
// ═══════════════════════════════════════════════════════════════════════

import { REGISTO_PUBLICO } from "./fontes";
import { normalizarNumeroOCC, pedacosDoNome } from "./identificadores";

// ─── Chegar lá ─────────────────────────────────────────────────────────

/**
 * O endereço do registo público.
 *
 * Não leva parâmetros de pesquisa e é deliberado: a pesquisa é feita numa
 * aplicação no cliente, e um link com `?number=` daria a impressão de que
 * pré-preenche o formulário quando não pré-preenche. Prometer menos e
 * cumprir é melhor do que um link que parece mágico e não faz nada.
 */
export function linkDoRegisto(): string {
  return REGISTO_PUBLICO.url;
}

/** O que a administração tem de fazer, por ordem, sem inventar passos. */
export const PASSOS_DA_CONSULTA: readonly string[] = [
  "Abrir o registo público dos Contabilistas Certificados inscritos.",
  "Pesquisar pelo número de inscrição indicado na ficha.",
  "Confirmar o reCAPTCHA e submeter.",
  "Comparar o nome devolvido com o nome da ficha.",
  "Confirmar que o exercício de profissão está activo.",
];

// ─── O que se leu lá ───────────────────────────────────────────────────

/**
 * As colunas que o registo devolve — nome, número de membro, morada, área
 * de especialidade e exercício de profissão.
 *
 * Só as três primeiras entram aqui. A morada é a residência profissional
 * de uma pessoa singular: não é preciso guardá-la para provar que a
 * inscrição existe, e guardar dados pessoais que não se usam é o oposto
 * do que este produto promete.
 */
export interface LeituraDoRegisto {
  nome: string;
  numero: string;
  /** O que a coluna «Exercício profissão» dizia. */
  exercicio: string | null;
}

export type Concordancia = "igual" | "compativel" | "diferente" | "em_falta";

export interface Comparacao {
  numero: Concordancia;
  nome: Concordancia;
  /** A inscrição parece activa? `null` quando a coluna não foi preenchida. */
  ativo: boolean | null;
  /** Pode confirmar-se com o que está à frente? */
  podeConfirmar: boolean;
  /** As frases a mostrar a quem está a decidir. */
  notas: string[];
}

/**
 * As palavras da coluna «Exercício profissão» que significam inscrição
 * viva. Deliberadamente curta e conservadora: o que não estiver aqui
 * devolve `false` e obriga a administração a olhar, em vez de assumir.
 */
const EXERCICIO_ATIVO = ["ativo", "activo", "sim", "em exercicio", "exercicio"];

function normalizarExercicio(v: string | null): string | null {
  if (!v) return null;
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Compara a ficha com o que foi lido no registo.
 *
 * A regra do nome merece explicação. Exigir igualdade exacta recusaria
 * meio país: o registo tem o nome civil completo e a ficha costuma ter o
 * nome profissional, mais curto. Aceitar qualquer parecença aprovaria
 * dois homónimos. O meio-termo aqui é: todos os pedaços significativos do
 * nome da ficha têm de aparecer no nome do registo, e o primeiro e o
 * último têm de bater. É o suficiente para «Marta Nogueira» casar com
 * «Marta Sofia Alves Nogueira» e não casar com «Marta Nogueira Dias».
 */
export function compararComRegisto(
  ficha: { nome: string; numero: string | null },
  lido: LeituraDoRegisto
): Comparacao {
  const notas: string[] = [];

  // ── Número ────────────────────────────────────────────────────────
  const daFicha = normalizarNumeroOCC(ficha.numero);
  const doRegisto = normalizarNumeroOCC(lido.numero);
  let numero: Concordancia;
  if (!daFicha || !doRegisto) {
    numero = "em_falta";
    notas.push("Falta o número de inscrição num dos lados.");
  } else if (daFicha === doRegisto) {
    numero = "igual";
  } else {
    numero = "diferente";
    notas.push(`O registo devolveu o nº ${doRegisto} e a ficha tem o nº ${daFicha}.`);
  }

  // ── Nome ──────────────────────────────────────────────────────────
  const naFicha = pedacosDoNome(ficha.nome);
  const noRegisto = pedacosDoNome(lido.nome);
  let nome: Concordancia;

  if (naFicha.length === 0 || noRegisto.length === 0) {
    nome = "em_falta";
    notas.push("Falta o nome num dos lados.");
  } else if (naFicha.join(" ") === noRegisto.join(" ")) {
    nome = "igual";
  } else {
    const todosPresentes = naFicha.every((p) => noRegisto.includes(p));
    const pontasBatem =
      naFicha[0] === noRegisto[0] && naFicha[naFicha.length - 1] === noRegisto[noRegisto.length - 1];

    if (todosPresentes && pontasBatem) {
      nome = "compativel";
      notas.push(`No registo está «${lido.nome.trim()}» — nome mais completo, mesmas pontas.`);
    } else {
      nome = "diferente";
      notas.push(`O nome do registo («${lido.nome.trim()}») não corresponde ao da ficha.`);
    }
  }

  // ── Exercício ─────────────────────────────────────────────────────
  const exercicio = normalizarExercicio(lido.exercicio);
  const ativo = exercicio === null ? null : EXERCICIO_ATIVO.some((t) => exercicio.includes(t));
  if (ativo === null) notas.push("A coluna «Exercício profissão» não foi preenchida.");
  else if (!ativo) notas.push(`O registo diz «${lido.exercicio}» no exercício de profissão.`);

  return {
    numero,
    nome,
    ativo,
    // Só se confirma com o número igual, o nome a bater (exacto ou
    // compatível) e o exercício activo. Qualquer dúvida é para resolver
    // antes do selo, não depois.
    podeConfirmar:
      numero === "igual" && (nome === "igual" || nome === "compativel") && ativo === true,
    notas,
  };
}

// ─── O que fica gravado ────────────────────────────────────────────────

/**
 * A evidência de uma verificação assistida.
 *
 * É o que separa isto de um botão «marcar como verificado». Guarda o que
 * foi lido, quando, e por quem — e é o que permite, meses depois,
 * responder à pergunta «com base em quê?» sem depender da memória de
 * ninguém.
 *
 * Não guarda a morada, e não guarda captura de ecrã: uma imagem do
 * registo é uma cópia de dados pessoais de terceiros que não precisamos
 * de manter para provar o que quer que seja.
 */
export interface Evidencia {
  fonteId: string;
  fonteUrl: string;
  consultadoEm: string;
  /** O nome tal como aparecia no registo. */
  nomeNoRegisto: string;
  numeroNoRegisto: string;
  exercicioNoRegisto: string | null;
  /** Resumo da comparação, para não ter de a recalcular no futuro. */
  comparacao: { numero: Concordancia; nome: Concordancia; ativo: boolean | null };
}

export function construirEvidencia(
  lido: LeituraDoRegisto,
  comparacao: Comparacao,
  agora: Date = new Date()
): Evidencia {
  return {
    fonteId: REGISTO_PUBLICO.id,
    fonteUrl: REGISTO_PUBLICO.url,
    consultadoEm: agora.toISOString(),
    nomeNoRegisto: lido.nome.trim().slice(0, 200),
    numeroNoRegisto: normalizarNumeroOCC(lido.numero) ?? "",
    exercicioNoRegisto: lido.exercicio?.trim().slice(0, 100) ?? null,
    comparacao: { numero: comparacao.numero, nome: comparacao.nome, ativo: comparacao.ativo },
  };
}
