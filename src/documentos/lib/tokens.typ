// ─────────────────────────────────────────────────────────────────────
//  Tokens do sistema de impressão — espelho do sistema de ecrã
//  ---------------------------------------------------------------------
//  Os nomes são deliberadamente os mesmos do DESIGN.md. Isto NÃO substitui o
//  sistema de ecrã: é o mesmo sistema, resolvido para papel — onde não há
//  hover, não há dark mode, não há scroll, e onde 1 pt é 1/72 de polegada e
//  não um pixel que o utilizador pode ampliar.
//
//  Cada decisão leva a razão anotada, para que quem cá voltar daqui a um ano
//  não a desfaça por engano.
// ─────────────────────────────────────────────────────────────────────

// ── Cor ─────────────────────────────────────────────────────────────────────
//
// Contrastes WCAG medidos sobre branco. A regra é dura: nada abaixo de 4,5:1
// leva texto, nada abaixo de 3:1 é usado como única forma de distinguir.
//
//   brand       #1D9E75   3,39:1   só acento — fios, preenchimentos. NUNCA texto.
//   brand-dark  #0F6E56   6,20:1   texto pequeno a verde
//   brand-deep  #0A4A39  10,24:1   texto forte, o número do herói
//   ink         #1A1A17  17,44:1   corpo — preto quente, nunca #000
//   ink-soft    #4A4A44   8,92:1   secundário
//   ink-mute    #78766E   4,55:1   legendas SOBRE BRANCO
//
#let brand = rgb("#1D9E75")
#let brand-mint = rgb("#9FE1CB")
#let brand-light = rgb("#E1F5EE")
#let brand-dark = rgb("#0F6E56")
#let brand-deep = rgb("#0A4A39")

#let ink = rgb("#1A1A17")
#let ink-soft = rgb("#4A4A44")
#let ink-mute = rgb("#78766E")

// Armadilha apanhada a construir o protótipo: sobre o creme #F5F4F0 o ink-mute
// desce a 4,13:1, e sobre o verde-claro #E1F5EE a 4,01:1 — ABAIXO do mínimo. O
// bloco de verificação tem fundo creme e estava a usá-lo. Este tom existe para
// fundos que não sejam brancos.
#let ink-sobre-cor = rgb("#5F5D56") // 5,9:1 sobre creme

#let creme = rgb("#F5F4F0")
#let fio = rgb("#E3E1DA")
#let alerta = rgb("#8A5A1B")
#let alerta-fundo = rgb("#FDF6EC")

// ── Grelha ──────────────────────────────────────────────────────────────────
//
// A margem direita larga não é desperdício: abre uma coluna de margem para
// base legal, avisos e notas laterais. Um documento onde tudo tem a mesma
// largura parece um formulário.
#let pagina = (largura: 210mm, altura: 297mm)
#let margem = (esquerda: 20mm, direita: 52mm, cima: 21mm, baixo: 19mm)

// 138 mm ≈ 78 carateres a 9 pt — dentro do intervalo confortável (66–80).
#let col-corpo = 138mm
#let goteira = 6mm
#let col-margem = 34mm
// Corpo + goteira + coluna de margem. As tabelas largas invadem a coluna de
// margem DE PROPÓSITO: essa quebra de ritmo é o que dá o ar editorial.
#let medida-cheia = col-corpo + goteira + col-margem

// ── Escala tipográfica ──────────────────────────────────────────────────────
//
// Razão 1,2 (terça menor) ancorada em 9 pt.
#let t-micro = 6.5pt // rodapé legal, marcadores de nota
#let t-nota = 7.5pt // notas de margem, legendas
#let t-peq = 8.2pt // tabelas densas
#let t-corpo = 9pt // corpo
#let t-lead = 10.5pt // primeira frase de secção
#let t-h2 = 13pt // título de parte
#let t-h1 = 22pt // título do documento
#let t-hero = 40pt // o número que responde à pergunta

#let entrelinha = 0.62em

// Playfair SÓ em display. Uma didone de alto contraste é magnífica a 22 pt e
// ilegível a 9 pt.
#let fonte-display = "Playfair Display Doc"
#let fonte-corpo = "DM Sans Tab"

// ── Teto de entreletra ──────────────────────────────────────────────────────
//
// Medição própria: acima de 0,09 em o extrator de texto insere espaços entre
// glifos e um leitor de ecrã SOLETRA o título.
//
//   0,16 em → "C O P I LO T O  F I S C A L"
//   0,12 em → "C O P I LOTO  F I S C A L"
//   0,09 em → "COPILOTO FISCAL"     ← teto
//
// No ecrã o DESIGN.md usa 0,15 em e está bem: no ecrã o texto não é extraído.
#let tracking-max = 0.09em
#let tracking-eyebrow = 0.08em

// ── Números ─────────────────────────────────────────────────────────────────

// O separador de milhares NÃO é um caráter de espaço: o DM Sans não tem U+2009
// nem U+202F no cmap, e usá-los faria a fonte cair para uma substituta a meio
// de um número. É composição pura, medida em em, que nunca quebra linha.
#let sep-milhares = h(0.19em)

#let _agrupar(inteiro) = {
  let s = str(inteiro)
  let partes = ()
  while s.len() > 3 {
    partes.push(s.slice(s.len() - 3))
    s = s.slice(0, s.len() - 3)
  }
  partes.push(s)
  partes.rev()
}

/// Valor monetário. Devolve uma caixa INDIVISÍVEL: «27,50» numa linha e «€» na
/// seguinte é um erro que se vê à distância.
#let eur(valor, simbolo: true) = {
  let negativo = valor < 0
  let centimos = calc.round(calc.abs(valor) * 100)
  let inteiro = int(centimos / 100)
  let resto = calc.rem(centimos, 100)
  let decimais = if resto < 10 { "0" + str(resto) } else { str(resto) }
  let grupos = _agrupar(inteiro)
  box(
    {
      if negativo { sym.minus }
      for (i, g) in grupos.enumerate() {
        if i > 0 { sep-milhares }
        g
      }
      ","
      decimais
      if simbolo { [ ] + [€] }
    },
  )
}

/// Percentagem com uma casa.
#let pct(fracao) = box(str(calc.round(fracao * 100, digits: 1)).replace(".", ",") + [%])

/// Em-dash para «não aplicável». Zero e «não incide» são coisas diferentes, e a
/// diferença importa num recibo.
#let na = box(sym.dash.em)
