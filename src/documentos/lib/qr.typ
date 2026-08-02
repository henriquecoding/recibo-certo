// ─────────────────────────────────────────────────────────────────────
//  Código legível por máquina — desenhado, não importado
//  ---------------------------------------------------------------------
//  Um QR verdadeiro exige Reed-Solomon e máscaras, que não se escrevem num
//  template. Uma imagem externa exigiria texto alternativo (o PDF/A-2a
//  RECUSA-SE a compilar sem ele — aconteceu ao construir o protótipo) e mais
//  um ficheiro para manter sincronizado com a referência.
//
//  A solução é o que o documento realmente precisa: um código de barras
//  Code 39, que se desenha com retângulos, é lido por qualquer aplicação de
//  telemóvel, e codifica a REFERÊNCIA — que é o que se leva à página de
//  verificação. O URL fica escrito por extenso ao lado, para quem preferir
//  escrevê-lo.
//
//  Code 39 e não Code 128 porque o alfabeto da referência (maiúsculas,
//  algarismos e hífen) é exatamente o do Code 39 — sem tabelas de mudança de
//  conjunto, sem dígito de controlo obrigatório, e com uma implementação que
//  cabe num ficheiro e se lê de uma vez.
// ─────────────────────────────────────────────────────────────────────

#import "tokens.typ": *

// Cada caráter são nove elementos alternados barra/espaço, três dos quais
// largos. `1` = largo, `0` = estreito. Tabela do padrão ISO/IEC 16388.
#let _CODE39 = (
  "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
  "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
  "8": "100100100", "9": "001100100", "A": "100001001", "B": "001001001",
  "C": "101001000", "D": "000011001", "E": "100011000", "F": "001011000",
  "G": "000001101", "H": "100001100", "I": "001001100", "J": "000011100",
  "K": "100000011", "L": "001000011", "M": "101000010", "N": "000010011",
  "O": "100010010", "P": "001010010", "Q": "000000111", "R": "100000110",
  "S": "001000110", "T": "000010110", "U": "110000001", "V": "011000001",
  "W": "111000000", "X": "010010001", "Y": "110010000", "Z": "011010000",
  "-": "010000101", ".": "110000100", " ": "011000100", "*": "010010100",
)

/// Código de barras Code 39 do `conteudo`, desenhado com retângulos.
///
/// `altura` e `modulo` (largura da barra estreita) em pontos. O rácio
/// largo:estreito é 3:1, dentro do intervalo do padrão (2,2:1 a 3:1) e no
/// limite superior porque é o que sobrevive melhor a uma fotocópia.
#let code39(conteudo, altura: 9mm, modulo: 0.23mm, cor: ink) = {
  let texto = upper(conteudo)
  // Delimitador obrigatório do Code 39, à entrada e à saída.
  let sequencia = ("*",) + texto.clusters() + ("*",)
  let barras = ()
  for (i, caratere) in sequencia.enumerate() {
    let padrao = _CODE39.at(caratere, default: none)
    if padrao == none { continue }
    for (j, largo) in padrao.clusters().enumerate() {
      // Índices pares são barra; ímpares, espaço.
      barras.push((preta: calc.even(j), largura: if largo == "1" { modulo * 3 } else { modulo }))
    }
    // Espaço entre carateres, sempre estreito.
    if i < sequencia.len() - 1 { barras.push((preta: false, largura: modulo)) }
  }
  box(
    stack(
      dir: ltr,
      ..barras.map(b => rect(
        width: b.largura,
        height: altura,
        fill: if b.preta { cor } else { white },
        stroke: none,
      ))
    ),
  )
}

/// O código com a legenda ao lado, em faixa própria no bloco de verificação.
/// Encaixado numa coluna estreita, espremia o texto e a referência partia-se a
/// meio com hífen — que é precisamente o que ela não pode fazer.
#let codigo-referencia(referencia, altura: 9mm) = grid(
  columns: (auto, 1fr),
  column-gutter: 10pt,
  align: (left + horizon, left + horizon),
  code39(referencia, altura: altura),
  {
    set text(size: t-micro, fill: ink-sobre-cor)
    set par(justify: false, leading: 0.5em)
    [Lê o código com a câmara do telemóvel ou escreve a referência em
     #text(weight: 600)[recibocerto.pt/v] para confirmar a emissão.]
  },
)
