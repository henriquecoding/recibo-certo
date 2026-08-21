// ═══════════════════════════════════════════════════════════════════════
//  ZIP DE UMA ENTRADA — o suficiente, e nada mais
//  ---------------------------------------------------------------------
//  As fontes em bloco do dados.gov chegam num ZIP com um único ficheiro
//  lá dentro. Ler isso não justifica uma dependência nova nem um `unzip`
//  do sistema: um ZIP de entrada única é um cabeçalho de 30 bytes seguido
//  de um fluxo deflate, e o `zlib` do Node já o descomprime.
//
//  O que este módulo NÃO faz, de propósito: não lê o diretório central,
//  não suporta várias entradas, nem ZIP64, nem cifra, nem tamanhos
//  diferidos. Se o ficheiro deixar de caber nestas condições, falha a
//  dizer isso — em vez de devolver bytes truncados, que é o pior desfecho
//  possível quando o resultado alimenta um número publicado.
// ═══════════════════════════════════════════════════════════════════════

import { PassThrough, Transform, type Readable } from "node:stream";
import { createInflateRaw } from "node:zlib";

export class ZipError extends Error {
  constructor(
    readonly code:
      | "not-a-zip"
      | "unsupported-method"
      | "unsupported-flags"
      | "truncated-header",
    message: string,
  ) {
    super(message);
    this.name = "ZipError";
  }
}

const ASSINATURA_LOCAL = 0x0403_4b50;
const METODO_ARMAZENADO = 0;
const METODO_DEFLATE = 8;
/** Cabeçalho local fixo, antes do nome e dos campos extra. */
export const CABECALHO_ZIP = 30;

export interface EntradaZip {
  nome: string;
  metodo: number;
  tamanhoComprimido: number;
  tamanhoOriginal: number;
  /** Onde começam os bytes do conteúdo, a contar do início do ZIP. */
  inicioDados: number;
}

/**
 * Lê o cabeçalho local da primeira entrada.
 *
 * Devolve `null` quando ainda não há bytes suficientes — o chamador
 * acumula mais e volta a tentar. Lança quando os bytes que existem já
 * chegam para saber que o ficheiro não serve.
 */
export function lerCabecalhoZip(cabecalho: Buffer): EntradaZip | null {
  if (cabecalho.length < CABECALHO_ZIP) {
    // Quatro bytes já bastam para saber que não é um ZIP.
    if (cabecalho.length >= 4 && cabecalho.readUInt32LE(0) !== ASSINATURA_LOCAL) {
      throw new ZipError("not-a-zip", "O ficheiro não começa por um cabeçalho local de ZIP.");
    }
    return null;
  }

  if (cabecalho.readUInt32LE(0) !== ASSINATURA_LOCAL) {
    throw new ZipError("not-a-zip", "O ficheiro não começa por um cabeçalho local de ZIP.");
  }

  const flags = cabecalho.readUInt16LE(6);
  // Bit 3 põe os tamanhos num descritor DEPOIS dos dados. Aceitá-lo
  // obrigaria a confiar num tamanho que ainda não foi lido.
  if ((flags & 0b1000) !== 0) {
    throw new ZipError("unsupported-flags", "ZIP com tamanhos diferidos não é suportado.");
  }
  if ((flags & 0b1) !== 0) {
    throw new ZipError("unsupported-flags", "ZIP cifrado não é suportado.");
  }

  const metodo = cabecalho.readUInt16LE(8);
  if (metodo !== METODO_DEFLATE && metodo !== METODO_ARMAZENADO) {
    throw new ZipError("unsupported-method", `Método de compressão ${metodo} não é suportado.`);
  }

  const nomeLen = cabecalho.readUInt16LE(26);
  const extraLen = cabecalho.readUInt16LE(28);
  if (cabecalho.length < CABECALHO_ZIP + nomeLen + extraLen) return null;

  return {
    nome: cabecalho.subarray(CABECALHO_ZIP, CABECALHO_ZIP + nomeLen).toString("utf8"),
    metodo,
    tamanhoComprimido: cabecalho.readUInt32LE(18),
    tamanhoOriginal: cabecalho.readUInt32LE(22),
    inicioDados: CABECALHO_ZIP + nomeLen + extraLen,
  };
}

export interface EntradaAberta {
  /** Resolve assim que o cabeçalho estiver completo. */
  entrada: Promise<EntradaZip>;
  /** O conteúdo já descomprimido. */
  conteudo: Readable;
}

/**
 * Abre a única entrada do ZIP como um fluxo descomprimido.
 *
 * `origem` tem de começar no byte 0. O cabeçalho é consumido aqui e o
 * resto segue para o descompressor — nunca há uma cópia do ficheiro
 * inteiro em memória, que é o ponto de tudo isto.
 */
export function abrirEntradaUnica(origem: Readable): EntradaAberta {
  let resolver!: (entrada: EntradaZip) => void;
  let rejeitar!: (erro: unknown) => void;
  const entrada = new Promise<EntradaZip>((resolve, reject) => {
    resolver = resolve;
    rejeitar = reject;
  });

  // O cabeçalho é arrancado aqui; o que sai deste Transform já é o
  // conteúdo bruto da entrada, comprimido ou não.
  let acumulado: Buffer = Buffer.alloc(0);
  let meta: EntradaZip | null = null;

  const semCabecalho = new Transform({
    transform(pedaco: Buffer, _codificacao, seguir) {
      if (meta) {
        seguir(null, pedaco);
        return;
      }
      acumulado = Buffer.concat([acumulado, pedaco]);
      try {
        meta = lerCabecalhoZip(acumulado);
      } catch (erro) {
        rejeitar(erro);
        seguir(erro as Error);
        return;
      }
      if (!meta) {
        seguir();
        return;
      }
      resolver(meta);
      seguir(null, acumulado.subarray(meta.inicioDados));
      acumulado = Buffer.alloc(0);
    },
    flush(terminar) {
      if (meta) {
        terminar();
        return;
      }
      const erro = new ZipError(
        "truncated-header",
        "O ZIP terminou antes de o cabeçalho estar completo.",
      );
      rejeitar(erro);
      terminar(erro);
    },
  });

  // `stored` não passa por inflate nenhum: os bytes já SÃO o conteúdo.
  // Descomprimi-los daria lixo, e a decisão só é conhecida depois do
  // cabeçalho — por isso o destino é fixo e a ligação é que muda.
  const conteudo = new PassThrough();
  // Quem descobre pelo `entrada` que o ZIP não serve não vai ler o
  // conteúdo — e sem um ouvinte aqui o `error` do `PassThrough` sobe como
  // exceção não tratada e derruba o processo. Isto não engole nada: quem
  // consumir o fluxo continua a receber o erro pelo iterador ou pelo seu
  // próprio ouvinte.
  conteudo.on("error", () => {});
  origem.on("error", (erro) => {
    rejeitar(erro);
    semCabecalho.destroy(erro);
  });
  semCabecalho.on("error", (erro) => conteudo.destroy(erro));

  entrada
    .then((lida) => {
      if (lida.metodo === METODO_ARMAZENADO) {
        semCabecalho.pipe(conteudo);
        return;
      }
      const inflate = createInflateRaw();
      inflate.on("error", (erro) => conteudo.destroy(erro));
      semCabecalho.pipe(inflate).pipe(conteudo);
    })
    .catch(() => {
      /* já foi reportado no `conteudo` e na promessa. */
    });

  origem.pipe(semCabecalho);
  return { entrada, conteudo };
}
