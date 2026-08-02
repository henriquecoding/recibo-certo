// ─────────────────────────────────────────────────────────────────────
//  Template — página, capa, tabelas, gráficos e avisos
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
//
//  O que distingue esta versão da primeira: hierarquia. Um documento em que
//  tudo tem o mesmo peso não parece caro, parece um formulário — por muito
//  corretas que sejam as fontes e as normas. Agora há um primeiro plano (a
//  resposta), um segundo (as tabelas) e um terceiro (a base legal e o âmbito),
//  e nota-se em três segundos qual é qual.
// ─────────────────────────────────────────────────────────────────────

#import "tokens.typ": *

// ── Marca ───────────────────────────────────────────────────────────────────

/// Marca-d'água tipográfica: o «R» em Playfair, muito claro, atrás do conteúdo.
/// É o que faz o papel parecer papelaria em vez de folha branca.
#let _filigrana(cor: rgb("#F2F1EC")) = place(
  top + right,
  dx: 16mm,
  dy: -8mm,
  text(font: fonte-display, size: 190pt, weight: 700, fill: cor)[R],
)

/// Logótipo composto — sem imagens: um SVG externo obrigaria a texto
/// alternativo e a mais um ficheiro para manter sincronizado.
#let marca(cor: brand-deep, tamanho: 12pt) = box(baseline: 0.1em, {
  set text(font: fonte-display, size: tamanho, weight: 700, fill: cor)
  [Recibo]
  text(weight: 400, style: "italic")[Certo]
})

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
          columns: (auto, 1fr, auto),
          column-gutter: 6pt,
          marca(cor: ink-mute, tamanho: 8pt),
          align(left + horizon)[#h(4pt)#titulo],
          align(right + horizon)[#referencia],
        )
        v(-0.2em)
        line(length: medida-cheia, stroke: 0.4pt + fio)
      }
    },
    footer: context {
      set text(size: t-micro, fill: ink-mute)
      line(length: medida-cheia, stroke: 0.4pt + fio)
      v(0.2em)
      grid(
        columns: (1fr, auto),
        align(left)[Estimativa informativa · não substitui o recibo oficial],
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
  // Título de parte com fio de acento à esquerda, na goteira: marca a secção
  // sem uma caixa à volta. Caixas a mais é o que faz um documento parecer um
  // formulário.
  show heading.where(level: 2): it => block(above: 1.9em, below: 0.85em, {
    place(dx: -7mm, dy: 0.15em, rect(width: 2.2pt, height: 1.05em, fill: brand, radius: 1pt))
    set text(font: fonte-display, size: t-h2, weight: 600, fill: brand-deep)
    it.body
  })
  show heading.where(level: 3): it => {
    set text(size: t-micro, weight: 600, fill: brand-dark, tracking: tracking-eyebrow)
    block(above: 1.3em, below: 0.5em, upper(it.body))
  }

  corpo
}

// ── Elementos ───────────────────────────────────────────────────────────────

/// Sobrescrito de secção. Nunca acima do teto de entreletra.
#let eyebrow(texto, cor: brand-dark) = {
  set text(size: t-micro, weight: 600, fill: cor, tracking: tracking-eyebrow)
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
      // Fio curto por cima: liga a nota ao corpo sem uma caixa.
      line(length: 8mm, stroke: 0.8pt + brand)
      v(0.45em)
      set text(size: t-nota, fill: ink-mute)
      set par(justify: false, leading: 0.55em)
      corpo
    }),
  )
}

/// Barra segmentada. NÃO depende da cor: cada segmento leva um fio a separá-lo
/// do seguinte e rótulo direto por baixo com o valor. Assim lê-se em fotocópia
/// a preto e branco e por quem não distingue verdes.
///
/// (brand-deep → brand dá 3,02:1, mas brand → brand-mint dá 2,28:1 — abaixo do
/// limiar de 3:1. Forçar a cor obrigaria o terceiro tom a ser quase branco.)
#let barra-segmentos(segmentos, largura: col-corpo, escuro: false) = {
  let total = segmentos.map(s => s.valor).sum()
  if total <= 0 { return }
  let cores = if escuro { (brand-mint, brand, rgb("#2F6E5B")) } else { (brand-deep, brand, brand-mint) }
  let separador = if escuro { brand-noite } else { white }
  let cor-rotulo = if escuro { brand-mint } else { ink-soft }
  let cor-valor = if escuro { white } else { ink }
  block(
    width: largura,
    {
      box(
        width: 100%,
        height: 8pt,
        clip: true,
        radius: 4pt,
        stack(
          dir: ltr,
          ..segmentos
            .enumerate()
            .map(((i, s)) => {
              let w = 100% * (s.valor / total)
              stack(
                dir: ltr,
                rect(width: w, height: 8pt, fill: cores.at(calc.min(i, 2)), stroke: none),
                if i < segmentos.len() - 1 { rect(width: 1.2pt, height: 8pt, fill: separador, stroke: none) },
              )
            })
        ),
      )
      v(0.45em)
      // Rótulo direto: sem legenda separada, que obriga o olho a saltar entre a
      // cor e o significado.
      grid(
        columns: segmentos.map(_ => 1fr),
        gutter: 8pt,
        ..segmentos.map(s => {
          set text(size: t-micro)
          [
            #text(fill: cor-rotulo)[#s.rotulo]
            #linebreak()
            #text(fill: cor-valor, weight: 700, size: t-nota)[#eur(s.valor)]
          ]
        })
      )
    },
  )
}

/// A capa da resposta — o primeiro terço da primeira página.
///
/// Faixa escura de medida cheia, sangrando pela margem esquerda: é o único
/// elemento do documento que o faz, e é isso que lhe dá a hierarquia. O número
/// é composto (inteiro grande, cêntimos elevados), não escrito.
#let capa-resposta(
  titulo: none,
  periodo: "",
  rotulo: "",
  valor: 0.0,
  contexto: "",
  referencia: "",
  segmentos: (),
) = {
  block(
    width: medida-cheia,
    // Sangra para a esquerda até ao corte do papel: é o ÚNICO elemento do
    // documento que o faz, e é isso que lhe dá o primeiro plano. A largura NÃO
    // soma a margem — o `outset` já a acrescenta, e somá-la fazia a faixa
    // transbordar a folha e cortar a referência.
    inset: (left: 14pt, right: 14pt, top: 15pt, bottom: 14pt),
    outset: (left: margem.esquerda),
    fill: brand-noite,
    radius: (right: 3pt),
    {
      set text(fill: white)
      grid(
        columns: (1fr, auto),
        align: (left + horizon, right + horizon),
        {
          marca(cor: white, tamanho: 11pt)
          h(6pt)
          text(size: t-micro, fill: brand-mint)[copiloto fiscal]
        },
        text(size: t-micro, fill: brand-mint, tracking: tracking-eyebrow)[#upper(periodo)],
      )

      v(11pt)
      // O H1 real do documento — a hierarquia que o PDF/UA exige e o título
      // que a pessoa lê, no mesmo sítio. A regra global pinta os H1 de
      // brand-deep, que sobre a faixa escura seria verde sobre verde: aqui
      // impõe-se o branco (15,9:1 sobre brand-noite).
      [
        #show heading.where(level: 1): it => text(
          font: fonte-display, size: t-capa, weight: 600, fill: white,
        )[#it.body]
        #titulo
      ]

      v(13pt)
      line(length: 100%, stroke: 0.6pt + rgb("#1F5A48"))
      v(11pt)

      grid(
        columns: (auto, 1fr),
        column-gutter: 16pt,
        align: (left + bottom, right + bottom),
        {
          eyebrow(rotulo, cor: brand-mint)
          v(0.3em)
          eur-hero(valor, cor: white)
          if contexto != "" {
            v(0.25em)
            text(size: t-peq, fill: brand-mint)[#contexto]
          }
        },
        {
          set text(size: t-micro, fill: brand-mint)
          align(right)[
            #eyebrow("Referência", cor: brand-mint)
            #linebreak()
            #text(size: t-nota, fill: white, weight: 600)[#referencia]
          ]
        },
      )

      if segmentos.len() > 0 {
        v(13pt)
        barra-segmentos(segmentos, largura: 100%, escuro: true)
      }
    },
  )
}

/// Cartão de indicador. Três ou quatro em linha, sem caixas fechadas: só um
/// fio de topo a marcar a coluna.
#let indicadores(itens) = grid(
  columns: itens.map(_ => 1fr),
  column-gutter: 9pt,
  ..itens.map(item => {
    block(width: 100%, {
      line(length: 100%, stroke: 1.2pt + if item.at("acento", default: false) { brand } else { fio-forte })
      v(0.5em)
      eyebrow(item.rotulo, cor: ink-mute)
      v(0.35em)
      text(size: t-h3, weight: 700, fill: if item.at("acento", default: false) { brand-deep } else { ink })[#item.valor]
      if item.at("nota", default: "") != "" {
        v(0.2em)
        text(size: t-micro, fill: ink-mute)[#item.nota]
      }
    })
  })
)

/// Tabela financeira. Sem grelha vertical, sem zebra — só fios horizontais de
/// 0,4 pt (o mais fino que uma laser de 600 ppp resolve sem falhar). O
/// alinhamento faz o trabalho da grelha; a grelha só acrescenta ruído.
///
/// `table.header` NÃO é opcional: é dele que sai a marcação /TH. É a linha de
/// código que separa dez células de cabeçalho de zero.
#let tabela-financeira(colunas: (), cabecalhos: (), linhas: (), total: none, largura: medida-cheia) = {
  let alinhamentos = colunas.map(c => if c == "texto" { left } else { right })
  block(
    width: largura,
    table(
      columns: colunas.map(c => if c == "texto" { 1fr } else { auto }),
      align: (col, _) => alinhamentos.at(col),
      stroke: (x, y) => (
        // Fio forte por baixo do cabeçalho; fios finos entre linhas.
        top: if y == 0 { none } else if y == 1 { 0.9pt + brand-deep } else { 0.4pt + fio },
        bottom: none,
        left: none,
        right: none,
      ),
      inset: (x: 5pt, y: 5.5pt),
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
          set text(size: t-peq, weight: 700, fill: brand-deep)
          c
        })
      } else { () }
    ),
  )
}

/// Bloco de verificação. Referência, impressão digital, motor, data — e um
/// código legível por máquina com a referência, para quem receber o documento
/// em papel poder confirmar sem escrever nada.
#let verificacao(referencia: "", digest: "", motor: "", ano: "", emitido: "", url: "", codigo: none) = block(
  width: medida-cheia,
  fill: creme,
  inset: 11pt,
  radius: 3pt,
  stroke: 0.4pt + fio-forte,
  {
    // Sobre creme, o ink-mute cai a 4,13:1 — usa-se o tom próprio.
    set text(size: t-nota, fill: ink-sobre-cor)
    // Referências, digests e URL nunca hifenizam: uma referência partida a meio
    // por um hífen deixa de se poder ler em voz alta ao telefone.
    set par(justify: false, leading: 0.6em)
    eyebrow("Verificação")
    v(0.6em)
    grid(
      columns: (30mm, 1fr, 30mm, 1fr),
      row-gutter: 4pt,
      column-gutter: 8pt,
      text(weight: 600)[Referência],
      text(fill: ink, weight: 600, hyphenate: false)[#referencia],
      text(weight: 600)[Motor de cálculo],
      text(hyphenate: false)[#motor · tabelas de #ano],
      text(weight: 600)[Emitido em],
      text(hyphenate: false)[#emitido],
      text(weight: 600)[Confirmar em],
      text(size: t-micro, hyphenate: false)[#url],
    )
    v(4pt)
    grid(
      columns: (30mm, 1fr),
      column-gutter: 8pt,
      text(weight: 600)[Impressão digital],
      // O digest tem 64 carateres: quebra por carateres, não por palavras.
      text(fill: ink, size: t-micro, hyphenate: false)[#digest],
    )
    v(0.7em)
    text(size: t-micro)[
      A impressão digital é dos DADOS, não do ficheiro: dois PDF do mesmo
      cálculo diferem porque a data de criação muda. Confirma que foi este
      cálculo que gerou este documento.
    ]
    if codigo != none {
      v(0.8em)
      line(length: 100%, stroke: 0.4pt + fio-forte)
      v(0.7em)
      codigo
    }
  },
)

/// Âmbito — o que o documento não faz. Quatro linhas honestas valem mais do que
/// uma página de garantias.
#let ambito(itens) = block(
  width: medida-cheia,
  fill: alerta-fundo,
  inset: 11pt,
  radius: 3pt,
  {
    set text(size: t-nota, fill: alerta)
    eyebrow("O que este documento não faz", cor: alerta)
    v(0.5em)
    set par(justify: false, leading: 0.55em)
    grid(
      columns: (1fr, 1fr),
      column-gutter: 12pt,
      row-gutter: 4pt,
      ..itens.map(item => [#text(fill: brand)[—] #h(3pt) #item])
    )
  },
)

/// Base legal com data de verificação: norma, o que determina, quando foi
/// confirmada.
#let base-legal(itens) = {
  set text(size: t-nota, fill: ink-soft)
  set par(justify: false, leading: 0.55em)
  for (i, item) in itens.enumerate() {
    if i > 0 { v(3pt); line(length: medida-cheia, stroke: 0.4pt + fio); v(3pt) }
    grid(
      columns: (38mm, 1fr, auto),
      column-gutter: 8pt,
      text(weight: 600, fill: brand-deep, hyphenate: false)[#item.norma],
      [#item.determina],
      text(fill: ink-mute, size: t-micro, hyphenate: false)[#item.verificadoEm],
    )
  }
}
