// ─────────────────────────────────────────────────────────────────────
//  Template — página, tabelas, gráficos e avisos
//  ---------------------------------------------------------------------
//  As doze marcas de um documento premium, como código e não como teoria:
//
//   1. Uma pergunta, uma resposta, no primeiro terço da primeira página.
//   2. Pressupostos visíveis.
//   3. Memória de cálculo — existe para poder ser CONTESTADA.
//   4. Base legal com data de verificação.
//   5. Âmbito explícito: o que o documento NÃO faz.
//   6. Cabeçalho corrente a partir da página 2.
//   7. Rodapé com «Página X de Y» — sem o Y ninguém sabe se recebeu tudo.
//   8. Referência legível e pronunciável.
//   9. Bloco de verificação.
//  10. Metadados a sério.
//  11. Contenção: uma cor de acento, um tipo de display, fios finos, ar.
//  12. Nada de números escritos à mão — todos vêm dos dados.
// ─────────────────────────────────────────────────────────────────────

#import "tokens.typ": *

// ── Página ──────────────────────────────────────────────────────────────────

#let documento(titulo: "", subtitulo: "", referencia: "", corpo) = {
  set document(
    title: titulo,
    author: "ReciboCerto",
    keywords: ("recibo de vencimento", "IRS", "Segurança Social", "Portugal", referencia),
    description: subtitulo,
  )
  // `lang`/`region` não são decoração: determinam a hifenização, as aspas e o
  // /Lang do PDF — sem o qual um leitor de ecrã lê português com fonemas
  // ingleses.
  set text(lang: "pt", region: "pt", font: fonte-corpo, size: t-corpo, fill: ink)
  // Justificado com quebra otimizada POR PARÁGRAFO, não linha a linha, que é o
  // que o browser faz.
  set par(justify: true, leading: entrelinha, linebreaks: "optimized", spacing: 0.9em)

  set page(
    width: pagina.largura,
    height: pagina.altura,
    margin: (
      left: margem.esquerda,
      right: margem.direita,
      top: margem.cima,
      bottom: margem.baixo,
    ),
    header: context {
      // Cabeçalho corrente a partir da página 2 — na primeira, o título já lá
      // está e repeti-lo é ruído.
      if counter(page).get().first() > 1 {
        set text(size: t-micro, fill: ink-mute)
        grid(
          columns: (1fr, auto),
          align(left)[#titulo],
          align(right)[#referencia],
        )
        v(-0.4em)
        line(length: medida-cheia, stroke: 0.4pt + fio)
      }
    },
    footer: context {
      set text(size: t-micro, fill: ink-mute)
      line(length: medida-cheia, stroke: 0.4pt + fio)
      v(0.2em)
      grid(
        columns: (1fr, auto),
        align(left)[ReciboCerto · estimativa informativa · não substitui o recibo oficial],
        // Sem o total, ninguém sabe se recebeu o documento todo.
        align(right)[Página #counter(page).display() de #context counter(page).final().first()],
      )
    },
  )

  // PDF/UA-1 exige hierarquia consecutiva a começar em nível 1 — e o
  // compositor RECUSA-SE a compilar se não estiver.
  set heading(numbering: none)
  show heading.where(level: 1): it => {
    set text(font: fonte-display, size: t-h1, weight: 600, fill: brand-deep)
    block(below: 0.6em, it.body)
  }
  show heading.where(level: 2): it => {
    set text(font: fonte-display, size: t-h2, weight: 600, fill: brand-deep)
    block(above: 1.6em, below: 0.7em, it.body)
  }
  show heading.where(level: 3): it => {
    set text(size: t-peq, weight: 600, fill: ink-soft, tracking: tracking-eyebrow)
    block(above: 1.2em, below: 0.5em, upper(it.body))
  }

  corpo
}

// ── Elementos ───────────────────────────────────────────────────────────────

/// Sobrescrito de secção. Nunca acima do teto de entreletra.
#let eyebrow(texto) = {
  set text(size: t-micro, weight: 600, fill: brand-dark, tracking: tracking-eyebrow)
  upper(texto)
}

/// Nota na coluna de margem. REGRA DURA: onde há tabela de medida cheia não
/// pode haver nota de margem — colidem.
#let nota-margem(corpo) = {
  place(
    right,
    dx: col-corpo + goteira,
    dy: 0pt,
    box(width: col-margem, {
      set text(size: t-nota, fill: ink-mute)
      set par(justify: false, leading: 0.55em)
      corpo
    }),
  )
}

/// A resposta à pergunta, no primeiro terço da primeira página.
#let resposta(rotulo: "", valor: "", contexto: "") = block(
  width: 100%,
  inset: (top: 10pt, bottom: 12pt),
  {
    eyebrow(rotulo)
    v(0.35em)
    text(font: fonte-corpo, size: t-hero, weight: 700, fill: brand-deep, valor)
    if contexto != "" {
      v(0.1em)
      text(size: t-peq, fill: ink-soft, contexto)
    }
  },
)

/// Barra segmentada. NÃO depende da cor: cada segmento leva um fio branco a
/// separá-lo do seguinte e rótulo direto por baixo com o valor. Assim lê-se em
/// fotocópia a preto e branco e por quem não distingue verdes.
///
/// (brand-deep → brand dá 3,02:1, mas brand → brand-mint dá 2,28:1 — abaixo do
/// limiar de 3:1. Forçar a cor obrigaria o terceiro tom a ser quase branco.)
#let barra-segmentos(segmentos, largura: col-corpo) = {
  let total = segmentos.map(s => s.valor).sum()
  if total <= 0 { return }
  let cores = (brand-deep, brand, brand-mint)
  block(
    width: largura,
    {
      box(
        width: largura,
        height: 9pt,
        clip: true,
        radius: 2pt,
        stack(
          dir: ltr,
          ..segmentos
            .enumerate()
            .map(((i, s)) => {
              let w = largura * (s.valor / total)
              stack(
                dir: ltr,
                rect(width: w, height: 9pt, fill: cores.at(calc.min(i, 2)), stroke: none),
                if i < segmentos.len() - 1 { rect(width: 1pt, height: 9pt, fill: white, stroke: none) },
              )
            })
        ),
      )
      v(0.35em)
      // Rótulo direto: sem legenda separada, que obriga o olho a saltar entre a
      // cor e o significado.
      grid(
        columns: segmentos.map(_ => 1fr),
        gutter: 6pt,
        ..segmentos.map(s => {
          set text(size: t-micro, fill: ink-soft)
          [#s.rotulo #h(1fr) #text(weight: 600, eur(s.valor))]
        })
      )
    },
  )
}

/// Tabela financeira. Sem grelha vertical, sem zebra — só fios horizontais de
/// 0,4 pt (o mais fino que uma laser de 600 ppp resolve sem falhar). O
/// alinhamento faz o trabalho da grelha; a grelha só acrescenta ruído.
///
/// `table.header` NÃO é opcional: é dele que sai a marcação /TH. É a linha de
/// código que separa 17 células de cabeçalho de zero.
#let tabela-financeira(colunas: (), cabecalhos: (), linhas: (), total: none, largura: medida-cheia) = {
  let alinhamentos = colunas.map(c => if c == "texto" { left } else { right })
  block(
    width: largura,
    table(
      columns: colunas.map(c => if c == "texto" { 1fr } else { auto }),
      align: (col, _) => alinhamentos.at(col),
      stroke: (x, y) => (
        // Fio forte por baixo do cabeçalho; fios finos entre linhas.
        top: if y == 0 { none } else if y == 1 { 0.8pt + brand-deep } else { 0.4pt + fio },
        bottom: none,
        left: none,
        right: none,
      ),
      inset: (x: 5pt, y: 5pt),
      fill: none,
      // repeat: true → o cabeçalho repete-se ao mudar de página.
      table.header(
        repeat: true,
        ..cabecalhos.map(c => {
          set text(size: t-micro, weight: 600, fill: brand-deep, tracking: tracking-eyebrow)
          upper(c)
        })
      ),
      ..linhas.flatten().map(c => { set text(size: t-peq); c }),
      ..if total != none {
        // Linha de total: fio superior forte e SEM fio inferior — fecha a tabela.
        total.map(c => {
          set text(size: t-peq, weight: 700)
          c
        })
      } else { () }
    ),
  )
}

/// Bloco de verificação. Referência, impressão digital, motor, data.
#let verificacao(referencia: "", digest: "", motor: "", ano: "", emitido: "", url: "") = block(
  width: medida-cheia,
  fill: creme,
  inset: 10pt,
  radius: 3pt,
  {
    // Sobre creme, o ink-mute cai a 4,13:1 — usa-se o tom próprio.
    set text(size: t-nota, fill: ink-sobre-cor)
    eyebrow("Verificação")
    v(0.5em)
    grid(
      columns: (auto, 1fr),
      row-gutter: 3pt,
      column-gutter: 10pt,
      text(weight: 600)[Referência], text(fill: ink)[#referencia],
      text(weight: 600)[Impressão digital], text(fill: ink, size: t-micro)[#digest],
      text(weight: 600)[Motor de cálculo], [#motor · tabelas fiscais de #ano],
      text(weight: 600)[Emitido em], [#emitido],
      text(weight: 600)[Confirmar em], [#url],
    )
    v(0.5em)
    text(size: t-micro)[
      A impressão digital é dos DADOS, não do ficheiro: dois PDF do mesmo cálculo
      diferem porque a data de criação muda. Confirma que foi este cálculo que
      gerou este documento.
    ]
  },
)

/// Âmbito — o que o documento não faz. Quatro linhas honestas valem mais do que
/// uma página de garantias.
#let ambito(itens) = block(
  width: medida-cheia,
  fill: alerta-fundo,
  inset: 10pt,
  radius: 3pt,
  {
    set text(size: t-nota, fill: alerta)
    eyebrow("O que este documento não faz")
    v(0.45em)
    set par(justify: false, leading: 0.55em)
    for item in itens {
      [• #item]
      linebreak()
    }
  },
)

/// Base legal com data de verificação: norma, o que determina, quando foi
/// confirmada.
#let base-legal(itens) = {
  set text(size: t-nota, fill: ink-soft)
  set par(justify: false, leading: 0.55em)
  for item in itens {
    grid(
      columns: (34mm, 1fr),
      column-gutter: 8pt,
      row-gutter: 4pt,
      text(weight: 600, fill: ink)[#item.norma],
      [#item.determina #text(fill: ink-mute)[· verificado em #item.verificadoEm]],
    )
    v(3pt)
  }
}
