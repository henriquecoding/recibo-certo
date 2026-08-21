// ═══════════════════════════════════════════════════════════════════════
//  ARRAY JSON GRANDE — um objeto de cada vez, em memória constante
//  ---------------------------------------------------------------------
//  O ficheiro de contratos públicos são 273 MB de JSON numa única linha:
//  um array de topo com centenas de milhares de objetos. `JSON.parse`
//  precisaria de mais de um gigabyte só para o resultado, e ler por
//  linhas não serve porque não há linhas.
//
//  A alternativa também não é uma expressão regular. Os objetos contêm
//  prosa portuguesa com chavetas, aspas e barras invertidas — «Artigo
//  95.º, n.º 1, a)» e nomes de empresas com aspas lá dentro. Cortar isso
//  por padrões daria objetos partidos ao meio, e o pior é que daria
//  poucos: a maior parte passaria e uma minoria sairia corrompida.
//
//  O que existe aqui é o mínimo de um analisador a sério: profundidade de
//  chavetas, com estado de string e de escape. Só isso, e chega — porque
//  só precisamos de saber ONDE cada objeto de topo acaba. O conteúdo é
//  entregue ao `JSON.parse`, um objeto de cada vez, que é quem sabe
//  interpretá-lo.
// ═══════════════════════════════════════════════════════════════════════

export class JsonArrayError extends Error {
  constructor(
    readonly code: "not-an-array" | "unterminated" | "invalid-object",
    message: string,
  ) {
    super(message);
    this.name = "JsonArrayError";
  }
}

const ABRE_CHAVETA = 0x7b; // {
const FECHA_CHAVETA = 0x7d; // }
const ABRE_PARENTESE_RETO = 0x5b; // [
const FECHA_PARENTESE_RETO = 0x5d; // ]
const ASPA = 0x22; // "
const BARRA = 0x5c; // \

/**
 * Percorre um array JSON de topo e devolve cada elemento já analisado.
 *
 * Aceita qualquer fluxo de `Buffer`. A memória usada é a de um objeto —
 * o maior contrato do ficheiro — e não a do ficheiro.
 *
 * `aoObjeto` recebe cada elemento; devolver `false` interrompe a leitura
 * sem consumir o resto do fluxo (útil para amostras e testes).
 */
export async function percorrerArrayJson<T = unknown>(
  fluxo: AsyncIterable<Buffer | string>,
  aoObjeto: (objeto: T, indice: number) => void | boolean,
): Promise<number> {
  let dentroDoArray = false;
  let profundidade = 0;
  let emString = false;
  let escapado = false;
  let indice = 0;

  // Só acumula bytes enquanto um objeto está aberto. Entre objetos, o
  // buffer é largado — é isto que mantém a memória constante.
  let atual: Buffer[] = [];
  let parcial = 0;

  for await (const pedacoBruto of fluxo) {
    const pedaco = Buffer.isBuffer(pedacoBruto) ? pedacoBruto : Buffer.from(pedacoBruto);
    let inicioDoObjeto = -1;

    for (let i = 0; i < pedaco.length; i += 1) {
      const byte = pedaco[i];

      if (emString) {
        if (escapado) escapado = false;
        else if (byte === BARRA) escapado = true;
        else if (byte === ASPA) emString = false;
        continue;
      }

      if (byte === ASPA) {
        emString = true;
        continue;
      }

      if (!dentroDoArray) {
        if (byte === ABRE_PARENTESE_RETO) {
          dentroDoArray = true;
          continue;
        }
        // Espaço em branco antes do `[` é aceitável; mais nada é.
        if (byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d) continue;
        throw new JsonArrayError(
          "not-an-array",
          "O conteúdo não começa por um array JSON de topo.",
        );
      }

      if (byte === ABRE_CHAVETA) {
        if (profundidade === 0) inicioDoObjeto = i;
        profundidade += 1;
        continue;
      }

      if (byte === FECHA_CHAVETA) {
        profundidade -= 1;
        if (profundidade > 0) continue;

        // Fechou um objeto de topo: junta o que vinha de trás com o que
        // está neste pedaço e entrega-o.
        const cauda = pedaco.subarray(inicioDoObjeto >= 0 ? inicioDoObjeto : 0, i + 1);
        const bruto =
          inicioDoObjeto >= 0 && atual.length === 0
            ? cauda
            : Buffer.concat([...atual, cauda]);
        atual = [];
        parcial = 0;
        inicioDoObjeto = -1;

        let objeto: T;
        try {
          objeto = JSON.parse(bruto.toString("utf8")) as T;
        } catch (erro) {
          throw new JsonArrayError(
            "invalid-object",
            `O elemento ${indice} não é JSON válido: ${(erro as Error).message}`,
          );
        }

        const continuar = aoObjeto(objeto, indice);
        indice += 1;
        if (continuar === false) return indice;
        continue;
      }

      if (byte === FECHA_PARENTESE_RETO && profundidade === 0) {
        dentroDoArray = false;
      }
    }

    // Um objeto ficou a meio deste pedaço: guarda só a parte que lhe
    // pertence, e nunca o pedaço inteiro.
    if (profundidade > 0) {
      atual.push(inicioDoObjeto >= 0 ? pedaco.subarray(inicioDoObjeto) : pedaco);
      parcial += 1;
    }
  }

  if (profundidade !== 0 || parcial > 0) {
    throw new JsonArrayError("unterminated", "O array JSON terminou a meio de um objeto.");
  }
  return indice;
}
