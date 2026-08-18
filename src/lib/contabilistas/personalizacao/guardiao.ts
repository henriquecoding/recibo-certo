// ═══════════════════════════════════════════════════════════════════════
//  GUARDIÃO DE AFIRMAÇÕES — a condição para poder abrir a personalização
//  ---------------------------------------------------------------------
//  Abrir o perfil a texto livre e manter a §139 («só factos verificáveis»)
//  parecem coisas opostas. Não são — desde que a liberdade venha com um
//  motor que saiba distinguir uma descrição de uma promessa.
//
//  Sem isto, a primeira semana de personalização aberta enche o diretório
//  de «o melhor contabilista de Lisboa», «poupe 40% no IRS» e «certificado
//  pelas Finanças». Cada uma dessas frases é falsa, e todas passam a ser
//  responsabilidade nossa no momento em que as publicamos.
//
//  O guardião não corrige o texto de ninguém. Faz três coisas:
//
//    · BLOQUEIA o que não pode ser publicado de todo (§139 e a lei);
//    · AVISA sobre o que costuma ser exagero e é da pessoa decidir;
//    · EXPLICA sempre porquê, com uma alternativa concreta.
//
//  A diferença entre bloquear e avisar é a diferença entre «isto é falso»
//  e «isto soa mal». Só a primeira justifica impedir alguém de escrever.
// ═══════════════════════════════════════════════════════════════════════

export type Gravidade = "bloqueio" | "aviso";

export interface Achado {
  regra: string;
  gravidade: Gravidade;
  /** O pedaço de texto que despoletou o achado. */
  excerto: string;
  /** Posição no texto original, para a interface poder destacar. */
  inicio: number;
  fim: number;
  /** Porque é que isto é um problema. Em português corrente. */
  porque: string;
  /** O que fazer em vez disso. Nunca só «não escrevas isso». */
  sugestao: string;
}

interface Regra {
  id: string;
  gravidade: Gravidade;
  padrao: RegExp;
  porque: string;
  sugestao: string;
}

/**
 * O texto é DOBRADO antes de qualquer regra correr.
 *
 * Dobrar = tirar os acentos e passar a minúsculas, mantendo o comprimento
 * exacto do original. Sem isto, as regras não funcionam em português: o
 * `\b` do JavaScript é ASCII, e «Últimas» começa por um caractere que ele
 * não reconhece como letra — a fronteira de palavra nunca acontece e a
 * regra passa ao lado da frase que existia para apanhar.
 *
 * Manter o comprimento é o que permite reportar `inicio`/`fim` sobre o
 * texto original: a interface destaca o que a pessoa escreveu, com os
 * acentos que escreveu, e não uma versão desfigurada.
 */
function dobrar(texto: string): string {
  let out = "";
  for (const ch of texto) {
    // Fora do plano básico (emoji e afins): não se toca, para não trocar
    // dois code units por um e desalinhar todas as posições seguintes.
    if (ch.length > 1) { out += ch; continue; }
    const base = ch.normalize("NFD")[0];
    out += base.length === 1 ? base : ch;
  }
  return out.toLowerCase();
}

/**
 * As regras, escritas contra o texto dobrado — sem acentos, minúsculas.
 *
 * Cada padrão apanha a AFIRMAÇÃO e não a palavra. «Garanto que respondo no
 * próprio dia» é um compromisso de serviço legítimo; «garanto o reembolso
 * do IRS» é uma promessa sobre uma decisão da Autoridade Tributária. É por
 * isso que os padrões olham para o que vem a seguir ao verbo, e não só
 * para o verbo.
 */
const REGRAS: readonly Regra[] = [
  // ── Superlativos sem medição ───────────────────────────────────────
  {
    id: "superlativo",
    gravidade: "bloqueio",
    padrao: /\b(?:o|a)\s+(?:melhor|maior|mais\s+(?:barat[oa]|rapid[oa]|procurad[oa]|conceituad[oa]|experiente))\b/g,
    porque:
      "É uma classificação que ninguém mediu. O diretório não tem avaliações, " +
      "e por isso não há como sustentar um superlativo.",
    sugestao:
      "Diz antes o que fazes de diferente — «acompanho o ano todo, não só em maio».",
  },
  {
    id: "numero_um",
    gravidade: "bloqueio",
    padrao: /\bn\.?º\s*1(?!\d)|\bnumero\s+(?:um|1)\b|\btop\s*\d*\b|#\s*1\b|\blider\s+de\s+mercado\b/g,
    porque: "É uma posição num ranking que não existe.",
    sugestao: "Descreve a experiência concreta: com quem trabalhas e há quanto tempo.",
  },

  // ── Promessas sobre decisões de terceiros ─────────────────────────
  {
    id: "garantia_fiscal",
    gravidade: "bloqueio",
    padrao:
      /\b(?:garant(?:o|imos|ia|ido|ida)|assegur(?:o|amos)|100\s*%)[^.!?\n]{0,60}\b(?:reembolso|devolucao|restituicao|aprovacao|aceitacao|isencao|poupanca|resultado|sucesso)\b/g,
    porque:
      "Quem decide reembolsos, isenções e aprovações é a Autoridade Tributária. " +
      "Prometer o resultado é prometer uma coisa que não está na tua mão.",
    sugestao:
      "Diz o que garantes mesmo: «entrego dentro do prazo» ou «explico cada valor antes de submeter».",
  },
  {
    id: "sem_multas",
    gravidade: "bloqueio",
    padrao: /\b(?:sem|zero|nunca)\s+(?:multas?|coimas?|problemas?\s+com\s+as\s+financas)\b/g,
    porque: "Uma coima depende de factos que não controlas — incluindo os do cliente.",
    sugestao: "«Aviso-te dos prazos com antecedência» diz o mesmo e é verdade.",
  },

  // ── Números inventados ────────────────────────────────────────────
  {
    id: "poupanca_quantificada",
    gravidade: "bloqueio",
    padrao:
      /\b(?:poupanc[ao]s?|poupe|poup[ao]s?|reduz(?:o|imos)?|economi[az]\w*)\b[^.!?\n]{0,40}\d{1,3}\s*(?:%|por\s+cento|€|euros)/g,
    porque:
      "Uma percentagem de poupança depende do caso concreto. Como número " +
      "genérico no perfil, é uma promessa a quem ainda nem contaste a situação.",
    sugestao: "Explica de onde vem a poupança, sem número: «reviso o coeficiente e as deduções elegíveis».",
  },
  {
    id: "estatistica_propria",
    gravidade: "aviso",
    padrao: /\b\d{1,3}\s*%\s+(?:d[eoa]s?\s+)?(?:clientes?|casos?|sucesso|satisfacao)\b/g,
    porque: "É uma estatística sobre a tua carteira que a plataforma não mede nem confirma.",
    sugestao: "Se a tiveres medida, diz de onde vem. Se não, tira o número.",
  },

  // ── Falsa oficialidade ────────────────────────────────────────────
  {
    id: "aval_oficial",
    gravidade: "bloqueio",
    padrao:
      /\b(?:certificad[oa]|acreditad[oa]|autorizad[oa]|reconhecid[oa]|aprovad[oa])\s+(?:pel[oa]s?|junto\s+d[oa]s?)\s+(?:financas|autoridade\s+tributaria|at|estado|governo|seguranca\s+social)\b/g,
    porque:
      "A Autoridade Tributária não certifica contabilistas. Quem inscreve é a " +
      "Ordem — e essa inscrição já aparece no perfil, verificada.",
    sugestao: "O número de inscrição na Ordem diz isto melhor, e é confirmável.",
  },
  {
    id: "parceiro_oficial",
    gravidade: "bloqueio",
    padrao: /\b(?:parceir[oa]|representante)\s+(?:oficial\s+)?d[oa]s?\s+(?:financas|autoridade\s+tributaria|seguranca\s+social|estado)\b/g,
    porque: "Sugere uma relação institucional que não existe.",
    sugestao: "Descreve o que fazes com esses organismos: «trato da entrega e do contacto com a AT».",
  },

  // ── Urgência fabricada ────────────────────────────────────────────
  {
    id: "escassez",
    gravidade: "aviso",
    padrao:
      /\b(?:ultim[ao]s?\s+(?:vagas?|lugares?|dias?)|so\s+(?:hoje|esta\s+semana)|(?:vagas?|lugares?)\s+limitad[ao]s|aproveita\s+ja)\b/g,
    porque: "Urgência sem prazo real é pressão comercial, e o perfil vende tranquilidade.",
    sugestao: "Se tens mesmo agenda limitada, o interruptor «aceita novos clientes» diz isso sozinho.",
  },

  // ── Preço prometido ───────────────────────────────────────────────
  {
    id: "preco_no_texto",
    gravidade: "aviso",
    padrao: /\b(?:desde|a\s+partir\s+de|por\s+apenas|so)\s*\d{1,4}\s*(?:€|euros)/g,
    porque:
      "Um preço escrito no texto fica desactualizado sozinho e contradiz o valor " +
      "acordado depois de se perceber o serviço.",
    sugestao: "Os preços vivem nos tipos de consulta, onde se mantêm certos.",
  },
];

/** Nomes das regras, para a interface poder explicar sem repetir texto. */
export const REGRAS_DO_GUARDIAO = REGRAS.map((r) => ({
  id: r.id, gravidade: r.gravidade, porque: r.porque, sugestao: r.sugestao,
}));

export interface Parecer {
  achados: Achado[];
  /** Há algo que impeça a publicação? */
  bloqueado: boolean;
  /** Quantos avisos — coisas a pensar, não a impedir. */
  avisos: number;
}

/**
 * Passa um texto pelo guardião.
 *
 * Devolve todos os achados e não pára no primeiro: quem escreveu três
 * frases problemáticas merece vê-las todas de uma vez em vez de as
 * descobrir uma a uma a cada tentativa de gravar.
 */
export function avaliarTexto(texto: string): Parecer {
  const achados: Achado[] = [];
  // As regras vêem o texto dobrado; o excerto sai do original, para a
  // pessoa se reconhecer no que lhe é apontado.
  const dobrado = dobrar(texto);

  for (const regra of REGRAS) {
    // `lastIndex` é estado partilhado num regex global — reposto sempre,
    // senão a segunda chamada com o mesmo texto salta metade dos achados.
    regra.padrao.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regra.padrao.exec(dobrado)) !== null) {
      achados.push({
        regra: regra.id,
        gravidade: regra.gravidade,
        excerto: texto.slice(m.index, m.index + m[0].length).trim(),
        inicio: m.index,
        fim: m.index + m[0].length,
        porque: regra.porque,
        sugestao: regra.sugestao,
      });
      // Padrões que podem casar com string vazia entrariam em ciclo.
      if (m[0].length === 0) regra.padrao.lastIndex += 1;
    }
  }

  achados.sort((a, b) => a.inicio - b.inicio);

  return {
    achados,
    bloqueado: achados.some((a) => a.gravidade === "bloqueio"),
    avisos: achados.filter((a) => a.gravidade === "aviso").length,
  };
}

/** Avalia vários campos de uma vez e diz onde está cada achado. */
export function avaliarCampos(
  campos: readonly { id: string; rotulo: string; texto: string }[]
): { porCampo: Record<string, Parecer>; bloqueado: boolean; total: number } {
  const porCampo: Record<string, Parecer> = {};
  let bloqueado = false;
  let total = 0;

  for (const c of campos) {
    const p = avaliarTexto(c.texto);
    porCampo[c.id] = p;
    if (p.bloqueado) bloqueado = true;
    total += p.achados.length;
  }

  return { porCampo, bloqueado, total };
}
