// ═══════════════════════════════════════════════════════════════════════
//  O QUE O FICHEIRO É, E NÃO O QUE DIZ SER
//  ---------------------------------------------------------------------
//  O tipo MIME de um envio é declarado por quem envia. Um executável
//  anunciado como `application/pdf` passa em qualquer verificação que se
//  limite a ler esse campo — e passava na nossa.
//
//  Os primeiros bytes de um ficheiro não se declaram: estão lá. É por isso
//  que a verificação é sobre eles.
//
//  Isto não é um antivírus e não pretende ser. É a diferença entre aceitar
//  o que a pessoa disse e olhar para o que ela mandou.
// ═══════════════════════════════════════════════════════════════════════

/** Quantos bytes chegam para decidir. Nenhuma assinatura aqui passa disto. */
export const BYTES_PARA_ASSINATURA = 64;

interface Assinatura {
  /** Bytes esperados. `null` num índice = qualquer byte serve. */
  bytes: (number | null)[];
  /** Onde começam. Quase sempre zero; o ISO Base Media começa em 4. */
  desde?: number;
}

/**
 * As assinaturas dos tipos que o balde aceita.
 *
 * `text/plain` e `text/csv` não têm assinatura nenhuma — texto é texto. Para
 * esses a pergunta é outra: os bytes são decodificáveis como UTF-8 e não
 * trazem nada de controlo? Ver `pareceTexto`.
 */
const ASSINATURAS: Record<string, Assinatura[]> = {
  "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }], // %PDF-
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/webp": [
    // RIFF....WEBP — os quatro bytes do tamanho, no meio, são quaisquer.
    { bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] },
  ],
  "image/heic": [
    { desde: 4, bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63] }, // ftypheic
    { desde: 4, bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x78] },
    { desde: 4, bytes: [0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31] },
  ],
  // Os dois formatos do Office são ZIP por dentro. A assinatura só diz
  // isso; distinguir um XLSX de um DOCX não é o que aqui interessa —
  // interessa que não seja um executável.
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    { bytes: [0x50, 0x4b, 0x03, 0x04] },
    { bytes: [0x50, 0x4b, 0x05, 0x06] },
  ],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { bytes: [0x50, 0x4b, 0x03, 0x04] },
    { bytes: [0x50, 0x4b, 0x05, 0x06] },
  ],
};

/** Tipos sem assinatura: decide-se por serem texto legível. */
const TIPOS_DE_TEXTO = new Set(["text/plain", "text/csv"]);

/**
 * Assinaturas de coisas que NUNCA entram, seja qual for o tipo declarado.
 *
 * Existe separada da lista de aceites porque responde a outra pergunta. A
 * primeira é «isto é o que dizes que é?»; esta é «isto é algo que não
 * queremos aqui de maneira nenhuma?». Um executável renomeado para .txt
 * passaria na primeira, por texto ser difícil de desmentir.
 */
const NUNCA: { nome: string; bytes: number[] }[] = [
  { nome: "executável do Windows", bytes: [0x4d, 0x5a] },              // MZ
  { nome: "executável ELF", bytes: [0x7f, 0x45, 0x4c, 0x46] },         // .ELF
  { nome: "executável do macOS", bytes: [0xcf, 0xfa, 0xed, 0xfe] },    // Mach-O
  { nome: "classe Java", bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { nome: "guião com shebang", bytes: [0x23, 0x21] },                  // #!
];

function comeca(bytes: Uint8Array, a: Assinatura): boolean {
  const desde = a.desde ?? 0;
  if (bytes.length < desde + a.bytes.length) return false;
  return a.bytes.every((b, i) => b === null || bytes[desde + i] === b);
}

/**
 * Texto é texto: decodifica em UTF-8 sem erros e não traz bytes de
 * controlo que só aparecem em ficheiros binários.
 */
function pareceTexto(bytes: Uint8Array): boolean {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return false;
  }
  // Tabulação, nova linha, retorno e escape passam; o resto abaixo de 0x20
  // não aparece em texto que alguém escreveu.
  return !bytes.some((b) => b < 0x09 || (b > 0x0d && b < 0x20));
}

export interface Veredito {
  ok: boolean;
  /** Por que não, em português, para se poder dizer a quem enviou. */
  motivo?: string;
}

/**
 * Os bytes correspondem ao tipo declarado?
 *
 * Recebe só o início do ficheiro — nunca é preciso mais, e ler dez
 * megabytes para olhar para oito bytes seria uma maneira cara de o fazer.
 */
export function assinaturaConfere(inicio: Uint8Array, tipoDeclarado: string): Veredito {
  if (inicio.length === 0) return { ok: false, motivo: "O ficheiro está vazio." };

  for (const proibido of NUNCA) {
    if (comeca(inicio, { bytes: proibido.bytes })) {
      return { ok: false, motivo: `Isto é um ${proibido.nome}, e não entra.` };
    }
  }

  if (TIPOS_DE_TEXTO.has(tipoDeclarado)) {
    return pareceTexto(inicio)
      ? { ok: true }
      : { ok: false, motivo: "Foi anunciado como texto, mas não é texto." };
  }

  const esperadas = ASSINATURAS[tipoDeclarado];
  if (!esperadas) return { ok: false, motivo: "Formato não aceite." };

  return esperadas.some((a) => comeca(inicio, a))
    ? { ok: true }
    : { ok: false, motivo: "O conteúdo não corresponde ao formato anunciado." };
}
