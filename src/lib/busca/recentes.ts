// ═══════════════════════════════════════════════════════════════════════
//  PESQUISAS RECENTES — o mínimo de dados, pelo mínimo de tempo
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE UM HISTÓRICO DE PESQUISA NÃO É INÓCUO AQUI (P1-07)            │
//  │                                                                     │
//  │ Num produto fiscal, o que se escreve na barra não é «sapatilhas      │
//  │ pretas». É um NIF, um IBAN, o nome de um cliente que não pagou, uma  │
//  │ doença que dá direito a dedução. A versão anterior guardava a frase  │
//  │ crua, para sempre, sem forma de a apagar — num dispositivo que pode  │
//  │ ser partilhado e onde basta abrir a pesquisa para a lista aparecer.  │
//  │                                                                     │
//  │ Três regras, e nenhuma depende de disciplina de quem programa:       │
//  │                                                                     │
//  │  1. o que parece um identificador NUNCA é guardado (aqui, na porta   │
//  │     de entrada — não numa limpeza posterior que alguém esqueça);     │
//  │  2. o que é guardado expira em 30 dias;                              │
//  │  3. há um botão para apagar tudo, à vista, onde a lista está.        │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

const CHAVE = "recibocerto:busca:recentes:v2";
const MAX = 3;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface Recente {
  termo: string;
  /** Milissegundos desde a época. É o que faz a entrada expirar. */
  em: number;
}

/**
 * O que nunca chega ao `localStorage`.
 *
 * Deliberadamente generoso: prefere-se perder um termo inofensivo a guardar
 * um identificador. Uma pesquisa recente que falta é um incómodo; um NIF
 * guardado no dispositivo é outra coisa.
 */
const PADROES_SENSIVEIS: RegExp[] = [
  /\d{9}/, //           NIF, NISS, telefone — nove dígitos seguidos
  /PT50[\s\d]{10,}/i, // IBAN português
  /\b[A-Z]{2}\d{2}[A-Z0-9]{10,}\b/i, // IBAN estrangeiro
  /\S+@\S+\.\S+/, //    email
  /\d[\d\s.,]{7,}/, //  qualquer número comprido (valores, cartões, documentos)
];

/** `null` quando a frase não deve ser guardada. */
export function termoGuardavel(consulta: string): string | null {
  const valor = consulta.trim().replace(/\s+/g, " ");
  if (valor.length < 2 || valor.length > 80) return null;
  if (PADROES_SENSIVEIS.some((p) => p.test(valor))) return null;
  return valor;
}

function ler(): Recente[] {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return [];
    const lista: unknown = JSON.parse(cru);
    if (!Array.isArray(lista)) return [];
    const limite = Date.now() - TTL_MS;
    return lista.filter(
      (x): x is Recente =>
        !!x &&
        typeof x === "object" &&
        typeof (x as Recente).termo === "string" &&
        typeof (x as Recente).em === "number" &&
        (x as Recente).em > limite,
    );
  } catch {
    return [];
  }
}

function escrever(lista: Recente[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, MAX)));
  } catch {
    /* modo privado, quota cheia — a pesquisa funciona sem histórico */
  }
}

/**
 * A expiração é aplicada na LEITURA, e o resultado é reescrito.
 *
 * Um TTL que só filtrasse à leitura deixaria a frase no disco para sempre —
 * invisível, mas lá. Reescrever ao ler é o que faz o prazo ser um prazo.
 */
export function lerRecentes(): Recente[] {
  const vivos = ler();
  const cru = (() => {
    try {
      return localStorage.getItem(CHAVE);
    } catch {
      return null;
    }
  })();
  if (cru && JSON.stringify(vivos) !== cru) escrever(vivos);
  return vivos;
}

export function guardarRecente(consulta: string): void {
  const termo = termoGuardavel(consulta);
  if (!termo) return;
  const anteriores = ler().filter((r) => r.termo.toLowerCase() !== termo.toLowerCase());
  escrever([{ termo, em: Date.now() }, ...anteriores]);
}

export function limparRecentes(): void {
  try {
    localStorage.removeItem(CHAVE);
    // A chave da versão anterior guardava frases cruas sem prazo. Quem
    // carrega em «Limpar» está a pedir para não ficar nada — incluindo o que
    // ficou de trás.
    localStorage.removeItem("recibocerto:busca:recentes");
  } catch {
    /* nada a fazer */
  }
}
