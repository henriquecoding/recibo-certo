// ═══════════════════════════════════════════════════════════════════════
//  BLOCOS DO PERFIL — o motor que substitui o formulário fixo
//  ---------------------------------------------------------------------
//  O editor tinha cinco secções iguais para toda a gente: identidade,
//  áreas, atendimento, contactos, disponibilidade. Todos os perfis saíam
//  com a mesma forma e a mesma ordem, e a única coisa que variava era o
//  texto lá dentro. Dois contabilistas com práticas opostas ficavam com
//  páginas indistinguíveis.
//
//  Isto é um motor de composição: há TIPOS de bloco, cada um com um
//  contrato próprio, e cada pessoa escolhe quais usa, com que conteúdo e
//  por que ordem. O perfil deixa de ser um formulário preenchido e passa
//  a ser uma página montada.
//
//  O que NÃO é, e é deliberado:
//
//   · não há bloco de testemunhos — um testemunho escrito pelo próprio
//     não é prova de nada, e um sistema honesto de avaliações é uma frente
//     de produto inteira (só avalia quem teve consulta, uma por consulta,
//     imutável, com moderação e direito de resposta);
//   · não há bloco de números — «300 clientes», «98% de satisfação» são
//     medições que ninguém fez;
//   · não há HTML nem estilos à escolha — a personalização é do CONTEÚDO,
//     e a coerência visual do diretório é o que o torna legível.
//
//  Ou seja: liberdade sobre o que se diz, disciplina sobre o que se pode
//  afirmar. Todo o texto passa pelo guardião antes de ser publicado.
// ═══════════════════════════════════════════════════════════════════════

import { avaliarTexto, type Achado } from "./guardiao";

// ─── Tipos de bloco ────────────────────────────────────────────────────

export type TipoBloco =
  /** Texto corrido. O bloco base — «Como trabalho», «A minha abordagem». */
  | "texto"
  /** Lista de pontos curtos. Para «O que trato» e «O que não trato». */
  | "lista"
  /** Pergunta e resposta. Responde antes de a pessoa ter de perguntar. */
  | "faq"
  /** Passos numerados. «Como corre a primeira consulta.» */
  | "percurso"
  /** Com quem a pessoa trabalha melhor — e com quem não trabalha. */
  | "publico";

export interface EsquemaBloco {
  tipo: TipoBloco;
  nome: string;
  /** Para que serve, na primeira pessoa de quem vai escolher. */
  descricao: string;
  /** Sugestão de título. A pessoa pode trocá-lo — é por isso que é sugestão. */
  tituloSugerido: string;
  /** O texto de ajuda dentro do campo, para não se ficar em branco. */
  exemplo: string;
  maxItens: number;
  maxCaracteresItem: number;
  /** Este tipo pode aparecer mais do que uma vez no mesmo perfil? */
  repetivel: boolean;
}

export const ESQUEMAS: Readonly<Record<TipoBloco, EsquemaBloco>> = {
  texto: {
    tipo: "texto",
    nome: "Texto",
    descricao: "Um parágrafo teu, sobre o que quiseres.",
    tituloSugerido: "Como trabalho",
    exemplo: "Prefiro explicar as contas a mandar um número seco por email.",
    maxItens: 1,
    maxCaracteresItem: 1200,
    repetivel: true,
  },
  lista: {
    tipo: "lista",
    nome: "Lista",
    descricao: "Pontos curtos. Bom para dizer o que tratas — e o que não tratas.",
    tituloSugerido: "O que trato",
    exemplo: "Entrega do IRS com anexo B",
    maxItens: 8,
    maxCaracteresItem: 120,
    repetivel: true,
  },
  faq: {
    tipo: "faq",
    nome: "Perguntas frequentes",
    descricao: "As perguntas que te fazem sempre, respondidas antes de as fazerem.",
    tituloSugerido: "Perguntas que me fazem sempre",
    exemplo: "Preciso de contabilista para abrir atividade? | Não é obrigatório em regime simplificado.",
    maxItens: 8,
    maxCaracteresItem: 400,
    repetivel: false,
  },
  percurso: {
    tipo: "percurso",
    nome: "Percurso",
    descricao: "Os passos de trabalhar contigo, por ordem. Tira o medo do primeiro contacto.",
    tituloSugerido: "Como corre a primeira consulta",
    exemplo: "Mandas-me a tua situação em duas linhas.",
    maxItens: 6,
    maxCaracteresItem: 200,
    repetivel: false,
  },
  publico: {
    tipo: "publico",
    nome: "Com quem trabalho",
    descricao: "Quem serves melhor. Dizer com quem não trabalhas poupa tempo aos dois.",
    tituloSugerido: "Com quem trabalho melhor",
    exemplo: "Trabalhadores independentes no primeiro ano de atividade",
    maxItens: 6,
    maxCaracteresItem: 140,
    repetivel: false,
  },
};

export const TIPOS_BLOCO: readonly TipoBloco[] = ["texto", "lista", "publico", "percurso", "faq"];

/** Um perfil com trinta blocos não é personalizado, é ilegível. */
export const MAX_BLOCOS = 8;

// ─── Estrutura ─────────────────────────────────────────────────────────

/**
 * Um item de bloco.
 *
 * `secundario` só é usado pela FAQ (a resposta) e fica `null` nos outros.
 * Um só formato para todos os tipos evita cinco estruturas paralelas —
 * e cinco sítios onde validar, sanear e gravar de maneira ligeiramente
 * diferente.
 */
export interface ItemBloco {
  principal: string;
  secundario: string | null;
}

export interface Bloco {
  id: string;
  tipo: TipoBloco;
  titulo: string;
  itens: ItemBloco[];
}

export type ErroBloco =
  | { campo: "titulo"; mensagem: string }
  | { campo: "itens"; indice: number; mensagem: string }
  | { campo: "bloco"; mensagem: string };

export interface ValidacaoBloco {
  ok: boolean;
  erros: ErroBloco[];
  /** Achados do guardião, com o índice do item onde estão. */
  achados: { indice: number; achado: Achado }[];
}

export const MAX_TITULO = 60;

/**
 * Valida um bloco isolado.
 *
 * Um bloco sem itens não é um erro de escrita — é um bloco vazio, e a
 * regra é simples: não se publica. Fica no editor, e o perfil público
 * ignora-o (ver `blocosPublicaveis`). É melhor do que impedir a gravação
 * de um rascunho a meio.
 */
export function validarBloco(b: Bloco): ValidacaoBloco {
  const esquema = ESQUEMAS[b.tipo];
  const erros: ErroBloco[] = [];
  const achados: { indice: number; achado: Achado }[] = [];

  if (!esquema) {
    return { ok: false, erros: [{ campo: "bloco", mensagem: "Tipo de bloco desconhecido." }], achados };
  }

  const titulo = b.titulo.trim();
  if (!titulo) erros.push({ campo: "titulo", mensagem: "O bloco precisa de um título." });
  else if (titulo.length > MAX_TITULO) {
    erros.push({ campo: "titulo", mensagem: `O título cabe em ${MAX_TITULO} caracteres.` });
  } else {
    for (const a of avaliarTexto(titulo).achados) achados.push({ indice: -1, achado: a });
  }

  if (b.itens.length > esquema.maxItens) {
    erros.push({
      campo: "bloco",
      mensagem: `Este bloco aceita no máximo ${esquema.maxItens} ${esquema.maxItens === 1 ? "entrada" : "entradas"}.`,
    });
  }

  b.itens.forEach((item, i) => {
    const principal = item.principal.trim();
    if (!principal) {
      erros.push({ campo: "itens", indice: i, mensagem: "Entrada vazia." });
      return;
    }
    if (principal.length > esquema.maxCaracteresItem) {
      erros.push({
        campo: "itens", indice: i,
        mensagem: `Cabe em ${esquema.maxCaracteresItem} caracteres.`,
      });
    }
    if (b.tipo === "faq" && !item.secundario?.trim()) {
      erros.push({ campo: "itens", indice: i, mensagem: "Falta a resposta." });
    }

    for (const a of avaliarTexto(principal).achados) achados.push({ indice: i, achado: a });
    if (item.secundario) {
      for (const a of avaliarTexto(item.secundario).achados) achados.push({ indice: i, achado: a });
    }
  });

  const bloqueado = achados.some((x) => x.achado.gravidade === "bloqueio");
  return { ok: erros.length === 0 && !bloqueado, erros, achados };
}

export interface ValidacaoConjunto {
  ok: boolean;
  /** Erros por id de bloco. */
  porBloco: Record<string, ValidacaoBloco>;
  /** Problemas do conjunto, não de um bloco em particular. */
  gerais: string[];
}

/**
 * Valida o conjunto — e é aqui que se apanha o que nenhum bloco isolado
 * revela: exceder o máximo, repetir um tipo que não é repetível, ou dar o
 * mesmo título a dois blocos (que num índice de página fica indistinguível).
 */
export function validarBlocos(blocos: readonly Bloco[]): ValidacaoConjunto {
  const porBloco: Record<string, ValidacaoBloco> = {};
  const gerais: string[] = [];

  if (blocos.length > MAX_BLOCOS) {
    gerais.push(`O perfil aceita no máximo ${MAX_BLOCOS} blocos.`);
  }

  const contagem = new Map<TipoBloco, number>();
  const titulos = new Set<string>();

  for (const b of blocos) {
    porBloco[b.id] = validarBloco(b);

    contagem.set(b.tipo, (contagem.get(b.tipo) ?? 0) + 1);

    const t = b.titulo.trim().toLowerCase();
    if (t && titulos.has(t)) gerais.push(`Há dois blocos com o título «${b.titulo.trim()}».`);
    titulos.add(t);
  }

  for (const [tipo, n] of contagem) {
    if (n > 1 && !ESQUEMAS[tipo]?.repetivel) {
      gerais.push(`«${ESQUEMAS[tipo].nome}» só pode aparecer uma vez.`);
    }
  }

  const ok = gerais.length === 0 && Object.values(porBloco).every((v) => v.ok);
  return { ok, porBloco, gerais };
}

// ─── Publicação ────────────────────────────────────────────────────────

/**
 * O que vai mesmo para o perfil público.
 *
 * Blocos vazios e blocos com bloqueios do guardião ficam de fora. É a
 * mesma disciplina do resto do projeto: um sinal que não é verdadeiro não
 * aparece esbatido — não aparece.
 */
export function blocosPublicaveis(blocos: readonly Bloco[]): Bloco[] {
  return blocos
    .map((b) => ({
      ...b,
      titulo: b.titulo.trim(),
      itens: b.itens
        .map((i) => ({
          principal: i.principal.trim(),
          secundario: i.secundario?.trim() || null,
        }))
        .filter((i) => i.principal),
    }))
    .filter((b) => {
      if (!b.titulo || b.itens.length === 0) return false;
      if (b.tipo === "faq" && b.itens.some((i) => !i.secundario)) return false;
      return validarBloco(b).achados.every((a) => a.achado.gravidade !== "bloqueio");
    });
}

// ─── Manipulação ───────────────────────────────────────────────────────

/**
 * Um bloco novo, já com o título sugerido e uma entrada em branco.
 *
 * O id vem de `crypto.randomUUID` quando existe. A alternativa não é
 * decorativa: sem id estável, reordenar a lista no editor faz o React
 * perder o estado dos campos de texto a meio de uma frase.
 */
export function novoBloco(tipo: TipoBloco): Bloco {
  const esquema = ESQUEMAS[tipo];
  return {
    id: idNovo(),
    tipo,
    titulo: esquema.tituloSugerido,
    itens: [{ principal: "", secundario: tipo === "faq" ? "" : null }],
  };
}

function idNovo(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Move um bloco. Fora dos limites devolve a lista intacta, sem estoirar. */
export function moverBloco(blocos: readonly Bloco[], de: number, para: number): Bloco[] {
  if (de === para) return [...blocos];
  if (de < 0 || de >= blocos.length || para < 0 || para >= blocos.length) return [...blocos];
  const copia = [...blocos];
  const [movido] = copia.splice(de, 1);
  copia.splice(para, 0, movido);
  return copia;
}

/** Que tipos ainda se podem acrescentar, dado o que já lá está. */
export function tiposDisponiveis(blocos: readonly Bloco[]): TipoBloco[] {
  if (blocos.length >= MAX_BLOCOS) return [];
  return TIPOS_BLOCO.filter((t) => ESQUEMAS[t].repetivel || !blocos.some((b) => b.tipo === t));
}

// ─── Persistência ──────────────────────────────────────────────────────

/**
 * Lê blocos de JSON vindo da base de dados.
 *
 * Descarta em silêncio tudo o que não tem a forma certa em vez de lançar.
 * A alternativa — rebentar ao ler — deixaria o perfil inteiro em branco
 * por causa de uma entrada estragada, e o perfil é a página de que vive
 * quem o tem.
 */
export function lerBlocos(bruto: unknown): Bloco[] {
  if (!Array.isArray(bruto)) return [];

  const out: Bloco[] = [];
  for (const x of bruto) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const tipo = o.tipo;
    if (typeof tipo !== "string" || !(tipo in ESQUEMAS)) continue;

    const itens = Array.isArray(o.itens) ? o.itens : [];
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : idNovo(),
      tipo: tipo as TipoBloco,
      titulo: typeof o.titulo === "string" ? o.titulo.slice(0, MAX_TITULO) : "",
      itens: itens.flatMap((i): ItemBloco[] => {
        if (!i || typeof i !== "object") return [];
        const io = i as Record<string, unknown>;
        if (typeof io.principal !== "string") return [];
        return [{
          principal: io.principal,
          secundario: typeof io.secundario === "string" ? io.secundario : null,
        }];
      }),
    });
    if (out.length >= MAX_BLOCOS) break;
  }
  return out;
}

/**
 * A forma que vai para a base de dados.
 *
 * Grava o que a pessoa escreveu, e NÃO o que está pronto a publicar. A
 * distinção é a diferença entre um editor e uma armadilha: quem escreve
 * meio bloco, grava e vai buscar café tem de o encontrar como o deixou.
 * Quem decide o que aparece no perfil público é `blocosPublicaveis`, na
 * leitura — e um bloco a meio simplesmente ainda não aparece lá.
 *
 * Blocos completamente vazios (sem título e sem uma única entrada) são a
 * única coisa que se perde, e essa é a intenção de quem os deixou assim.
 */
export function escreverBlocos(blocos: readonly Bloco[]): unknown[] {
  return blocos
    .slice(0, MAX_BLOCOS)
    .map((b) => {
      const esquema = ESQUEMAS[b.tipo];
      return {
        id: b.id,
        tipo: b.tipo,
        titulo: b.titulo.trim().slice(0, MAX_TITULO),
        itens: b.itens.slice(0, esquema.maxItens).map((i) => ({
          principal: i.principal.trim().slice(0, esquema.maxCaracteresItem),
          secundario: i.secundario?.trim().slice(0, esquema.maxCaracteresItem) || null,
        })),
      };
    })
    .filter((b) => b.titulo || b.itens.some((i) => i.principal));
}
