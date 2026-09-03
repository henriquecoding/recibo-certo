/**
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ `JSON.stringify` NÃO ESCAPA `<`, E O JSON-LD VAI DENTRO DE `<script>`  │
 * │                                                                       │
 * │ Vinte e nove sítios do produto injetam JSON-LD com                     │
 * │ `dangerouslySetInnerHTML={{ __html: JSON.stringify(x) }}`. Hoje é      │
 * │ seguro por uma razão frágil: TODO o conteúdo que lá entra é estático.  │
 * │ No dia em que um destes levar um nome de contabilista, o título de um  │
 * │ guia vindo da base de dados ou um parâmetro de rota, a sequência de    │
 * │ fecho dentro de uma string fecha a etiqueta e o resto passa a ser      │
 * │ HTML — XSS armazenado, com a agravante de vir de uma etiqueta que      │
 * │ ninguém revê porque «é só metadados».                                  │
 * │                                                                       │
 * │ A defesa não é lembrar-se: é não haver forma de escrever a etiqueta    │
 * │ sem passar por aqui. Escapar `<`, `>` e `&` mantém o JSON válido — um  │
 * │ analisador lê a sequência de escape como o carácter — e impede o       │
 * │ browser de encontrar a etiqueta de fecho no meio.                      │
 * │                                                                       │
 * │ Os separadores de linha U+2028 e U+2029 saem pela mesma porta: são     │
 * │ válidos em JSON e quebram um literal de JavaScript.                    │
 * └───────────────────────────────────────────────────────────────────────┘
 */

const ESCAPES: Readonly<Record<string, string>> = Object.freeze({
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
});

/**
 * Serializa um objeto para dentro de `<script type="application/ld+json">`.
 *
 * Usar SEMPRE isto em vez de `JSON.stringify` direto — mesmo quando o
 * conteúdo é estático hoje. O conteúdo de hoje é estático; o do próximo
 * commit é uma pergunta em aberto.
 */
export function jsonLd(dados: unknown): string {
  return JSON.stringify(dados).replace(/[<>&\u2028\u2029]/g, (c) => ESCAPES[c] ?? c);
}
