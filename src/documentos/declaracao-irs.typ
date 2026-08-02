// ─────────────────────────────────────────────────────────────────────
//  Declaração simulada de IRS
//  ---------------------------------------------------------------------
//  A mesma REGRA ABSOLUTA dos outros dois: não há um único número escrito à
//  mão. Tudo vem de `dados.json`, produzido por `simularDeclaracaoIRS`.
//
//  Este é o documento denso. As secções condicionais existem porque uma
//  declaração de IRS é diferente de pessoa para pessoa: quem não tem
//  rendimentos estrangeiros não precisa de ver uma linha de crédito por dupla
//  tributação a zero, e mostrá-la fá-la duvidar do resto do documento.
//
//  Compilar:
//    npm run docs:build
// ─────────────────────────────────────────────────────────────────────

#import "lib/tokens.typ": *
#import "lib/template.typ": *
#import "lib/qr.typ": codigo-referencia

#let _entrada = sys.inputs.at("dados", default: "/src/documentos/irs-exemplo.json")
#let d = if _entrada.trim().starts-with("{") { json(bytes(_entrada)) } else { json(_entrada) }
#let p = d.proveniencia

#show: documento.with(
  titulo: "Declaração simulada de IRS · " + d.periodo,
  subtitulo: "Apuramento anual — rendimentos por categoria, escalões, deduções à coleta e saldo",
  referencia: p.referencia,
)

// ── 1 · A resposta ──────────────────────────────────────────────────────────

#capa-resposta(
  titulo: [= #d.resposta.titulo],
  periodo: d.periodo,
  rotulo: d.resposta.rotulo,
  valor: d.resposta.valor,
  contexto: d.resposta.contexto,
  referencia: p.referencia,
  segmentos: d.segmentos.map(s => (rotulo: s.rotulo, valor: s.valor)),
)

#v(15pt)

#indicadores((
  (rotulo: "Rendimento global", valor: eur(d.totais.rendimentoGlobal), nota: "declarado no ano"),
  (rotulo: "Rendimento coletável", valor: eur(d.totais.rendimentoColetavel), nota: "base dos escalões"),
  (rotulo: "Taxa efetiva", valor: d.totais.taxaEfetivaTexto, nota: "marginal: " + d.totais.taxaMarginalTexto, acento: true),
  (rotulo: "IRS do ano", valor: eur(d.irsTotal), nota: "antes de retenções"),
))

#v(16pt)

#nota-margem[
  A taxa efetiva é o que pagas sobre tudo o que ganhaste. A marginal é a taxa
  do último escalão que tocaste — a que se aplica ao euro seguinte, e não ao
  rendimento todo. Confundi-las é o erro mais comum a ler um IRS.
]

#text(size: t-peq)[
  Este documento decompõe o apuramento do ano: que rendimentos entraram, como
  se chegou ao coletável, quanto imposto caiu em cada escalão, que deduções
  abateram à coleta e o que sobra a pagar ou a receber. É uma estimativa
  informativa — não substitui a declaração entregue à Autoridade Tributária.
]

// ── 2 · Identificação ───────────────────────────────────────────────────────

#if d.identificacao.len() > 0 [
  #v(1.2em)
  == Identificação e agregado

  #v(0.5em)
  #grid(
    columns: (auto, 1fr, auto, 1fr),
    row-gutter: 4.5pt,
    column-gutter: (10pt, 26pt, 10pt),
    ..d.identificacao.map(i => (
      text(size: t-nota, fill: ink-mute)[#i.rotulo],
      text(size: t-nota, fill: ink, weight: 600)[#i.valor],
    )).flatten()
  )
]

// ── 3 · Rendimentos por categoria ───────────────────────────────────────────

#v(1.3em)

== Que rendimentos entraram

#text(size: t-peq, fill: ink-soft)[
  Nem todo o rendimento é tributado da mesma maneira. O que é *englobado* junta-se
  aos outros e passa pelos escalões progressivos; o que fica de fora é tributado a
  uma taxa própria, sozinho — e por isso não faz subir o escalão do resto.
]

#v(0.8em)

#tabela-financeira(
  colunas: ("texto", "texto", "n", "n", "n"),
  cabecalhos: ("Anexo", "Categoria", "Bruto", "Englobado", "Imposto autónomo"),
  linhas: d.componentes.map(c => (
    text(size: t-micro, fill: ink-soft)[#c.anexo],
    [#c.categoria],
    eur(c.bruto, simbolo: false),
    eur(c.englobado, simbolo: false),
    eur(c.autonomo, simbolo: false),
  )),
  total: (
    text(weight: 700)[Total],
    [],
    text(weight: 700)[#eur(d.totalComponentes.bruto, simbolo: false)],
    text(weight: 700)[#eur(d.totalComponentes.englobado, simbolo: false)],
    text(weight: 700, fill: brand-deep)[#eur(d.totalComponentes.autonomo, simbolo: false)],
  ),
)

// ── 4 · Do bruto ao coletável ───────────────────────────────────────────────

#if d.funil.passos.len() > 1 [
  #v(1.4em)
  == Do rendimento global ao coletável

  #text(size: t-peq, fill: ink-soft)[
    Os escalões não incidem sobre o que ganhaste: incidem sobre o que sobra
    depois das exclusões que a lei manda fazer primeiro. Só aparecem aqui as
    que se aplicam ao teu caso.
  ]

  #v(0.8em)

  #block(width: col-corpo, breakable: false, {
    set text(size: t-peq)
    let linha(rotulo, valor, base: "", forte: false) = grid(
      columns: (1fr, auto),
      column-gutter: 12pt,
      {
        text(weight: if forte { 700 } else { 400 })[#rotulo]
        if base != "" [ #h(5pt) #text(size: t-micro, fill: brand)[#base] ]
      },
      text(weight: if forte { 700 } else { 400 })[#eur(valor)],
    )
    for (i, passo) in d.funil.passos.enumerate() {
      if i > 0 { v(4pt) }
      linha(passo.rotulo, passo.valor, base: passo.at("base", default: ""))
    }
    v(7pt)
    line(length: 100%, stroke: 0.9pt + brand-deep)
    v(7pt)
    linha("Rendimento coletável", d.funil.coletavel, forte: true)
  })
]

// ── 5 · Os escalões ─────────────────────────────────────────────────────────
//
// Sem quebra de página forçada: o funil acima tem três linhas, e mandá-lo para
// uma página só dele deixava sete oitavos da folha em branco. As secções
// seguem o fluxo e são os blocos `breakable: false` que impedem uma tabela de
// se partir a meio.

#v(1.4em)

== Escalão a escalão

#if d.taxaFixa != "" [
  #text(size: t-peq, fill: ink-soft)[
    Não há escalões a mostrar: aplicou-se o regime de #text(fill: ink, weight: 600)[#d.taxaFixa],
    que tributa a uma taxa única em vez das taxas progressivas do Art. 68.º.
  ]
] else [
  #text(size: t-peq, fill: ink-soft)[
    O IRS não aplica uma taxa ao rendimento todo. Cada fatia do rendimento paga
    a taxa do seu escalão, e só a última fatia paga a taxa mais alta. É por isso
    que a taxa efetiva (#d.totais.taxaEfetivaTexto) é bastante mais baixa do que
    a marginal (#d.totais.taxaMarginalTexto) — e é por isso que subir de escalão
    nunca faz ganhar menos.
  ]

  #v(0.8em)

  #tabela-financeira(
    colunas: ("texto", "n", "n", "n"),
    cabecalhos: ("Escalão — até", "Taxa", "Rendimento nesta fatia", "Imposto da fatia"),
    linhas: d.escaloes.map(e => (
      if e.ate == none { text(style: "italic")[sem limite] } else { eur(e.ate, simbolo: false) },
      text(weight: 600)[#e.taxaTexto],
      eur(e.rendimento, simbolo: false),
      eur(e.imposto, simbolo: false),
    )),
    total: (
      text(weight: 700)[Total],
      [],
      text(weight: 700)[#eur(d.totalEscaloes.rendimento, simbolo: false)],
      text(weight: 700, fill: brand-deep)[#eur(d.totalEscaloes.imposto, simbolo: false)],
    ),
  )

  #v(0.5em)
  #text(size: t-micro, fill: ink-mute)[
    Valores em euros. A coluna «até» é o limite superior do escalão, não o
    rendimento — a fatia que lá caiu está na coluna seguinte.
  ]

  #if d.adicionalSolidariedade > 0 [
    #v(1em)
    #block(width: medida-cheia, inset: (left: 9pt), stroke: (left: 2pt + brand), {
      set text(size: t-peq, fill: ink-soft)
      [
        Acresce o adicional de solidariedade de
        #text(fill: brand-deep, weight: 700)[#eur(d.adicionalSolidariedade)],
        devido acima de 80 000 € de rendimento coletável (Art. 68.º-A). Já está
        incluído na coleta abaixo.
      ]
    })
  ]
]

// ── 6 · Deduções à coleta ───────────────────────────────────────────────────

#if d.deducoes.len() > 0 [
  #v(1.4em)
  == O que abateu ao imposto

  #text(size: t-peq, fill: ink-soft)[
    As deduções à coleta não reduzem o rendimento: reduzem o imposto, euro a
    euro. Uma dedução de 100 € vale 100 € — ao contrário de um abatimento ao
    rendimento, que só vale a tua taxa marginal.
  ]

  #v(0.8em)

  #tabela-financeira(
    colunas: ("texto", "texto", "n"),
    cabecalhos: ("Rubrica", "Base legal", "Valor"),
    linhas: d.deducoes.map(l => (
      {
        [#l.rubrica]
        if l.foraDoTeto [
          #linebreak()
          #text(size: t-micro, fill: ink-mute)[fora do limite global]
        ]
      },
      text(size: t-micro, fill: brand)[#l.base],
      eur(l.valor, simbolo: false),
    )),
    total: (
      text(weight: 700)[Total abatido à coleta],
      [],
      text(weight: 700, fill: brand-deep)[#eur(d.deducoesTotal, simbolo: false)],
    ),
  )

  #if d.limiteDeducoes != none [
    #v(1em)
    #block(
      width: medida-cheia,
      fill: creme,
      inset: 11pt,
      radius: 3pt,
      {
        set text(size: t-nota, fill: ink-sobre-cor)
        eyebrow("O limite global mordeu", cor: brand-deep)
        v(0.5em)
        grid(
          columns: (1fr, auto),
          row-gutter: 4pt,
          column-gutter: 12pt,
          [Soma das rubricas sujeitas ao limite],
          text(fill: ink)[#eur(d.limiteDeducoes.somaBruta)],
          [Limite global aplicável (Art. 78.º n.º 7)],
          text(fill: ink)[#eur(d.limiteDeducoes.limiteGlobal)],
          text(weight: 600)[Dedução perdida],
          text(fill: ink, weight: 700)[#eur(d.limiteDeducoes.perdido)],
        )
        v(0.7em)
        text(size: t-micro)[
          Acima deste teto, juntar mais faturas destas rubricas não muda o
          imposto. As rubricas marcadas «fora do limite global» na tabela acima
          não contam para esta conta e continuam a abater na totalidade.
        ]
      },
    )
  ]
]

// ── 7 · Apuramento final ────────────────────────────────────────────────────

#v(1.4em)

== Apuramento

#v(0.6em)

// `breakable: false`: sem isto o apuramento partia-se e a linha do saldo — a
// única que o leitor abriu o documento para ver — ficava órfã no cimo da
// página seguinte, sozinha, com o resto da folha em branco.
#block(width: col-corpo, breakable: false, {
  set text(size: t-peq)
  let linha(rotulo, valor, base: "", forte: false) = grid(
    columns: (1fr, auto),
    column-gutter: 12pt,
    {
      text(weight: if forte { 700 } else { 400 })[#rotulo]
      if base != "" [ #h(5pt) #text(size: t-micro, fill: brand)[#base] ]
    },
    text(weight: if forte { 700 } else { 400 })[#eur(valor)],
  )
  for (i, l) in d.apuramento.enumerate() {
    if i > 0 { v(4pt) }
    linha(l.rubrica, l.valor, base: l.base)
  }
  v(7pt)
  line(length: 100%, stroke: 0.9pt + brand-deep)
  v(7pt)
  linha("IRS total estimado do ano", d.irsTotal, forte: true)

  v(11pt)
  for (i, l) in d.pagamentos.enumerate() {
    if i > 0 { v(4pt) }
    linha(l.rubrica, l.valor)
  }
  v(4pt)
  linha("Já entregue ao Estado", d.pago, forte: true)

  v(9pt)
  line(length: 100%, stroke: 1.4pt + brand-deep)
  v(8pt)
  grid(
    columns: (1fr, auto),
    column-gutter: 12pt,
    text(size: t-h3, weight: 700, fill: brand-deep)[#d.resposta.rotulo],
    text(size: t-h3, weight: 700, fill: brand-deep)[#eur(d.resposta.valor)],
  )
})

#v(0.6em)
#text(size: t-micro, fill: ink-mute)[
  A Segurança Social da categoria B no ano — #eur(d.totais.ssAnual) — não é IRS
  e não entra neste apuramento. É devida à Segurança Social, com calendário próprio.
]

// ── 8 · Memória de cálculo ──────────────────────────────────────────────────

#if d.memoria.len() > 0 [
  #v(1.5em)

  == Memória de cálculo

  #text(size: t-peq, fill: ink-soft)[
    Existe para poder ser contestada. É o que separa «confia em nós» de «vê por ti».
  ]

  #v(0.8em)

  #tabela-financeira(
    colunas: ("texto", "texto", "n"),
    cabecalhos: ("Rubrica", "Como se chega ao valor", "Valor"),
    linhas: d.memoria.map(l => (
      {
        [#l.rubrica]
        if l.anexo != "" [
          #linebreak()
          #text(size: t-micro, fill: ink-mute)[#l.anexo]
        ]
      },
      {
        if l.formula != "" [#text(size: t-nota)[#l.formula]] else [#text(size: t-nota, fill: ink-mute)[—]]
        if l.base != "" [
          #linebreak()
          #text(size: t-micro, fill: brand)[#l.base]
        ]
      },
      eur(l.valor, simbolo: false),
    )),
  )
]

// ── 9 · Avisos, âmbito e verificação ────────────────────────────────────────

#if d.avisos.len() > 0 [
  #v(1.3em)
  #block(
    width: medida-cheia,
    fill: creme,
    inset: 11pt,
    radius: 3pt,
    {
      set text(size: t-nota, fill: ink-sobre-cor)
      set par(justify: false, leading: 0.6em)
      eyebrow("A ter em conta neste apuramento", cor: brand-deep)
      v(0.6em)
      for (i, aviso) in d.avisos.enumerate() {
        if i > 0 { v(3.5pt) }
        grid(
          columns: (9pt, 1fr),
          text(fill: brand)[—],
          [#aviso],
        )
      }
    },
  )
]

#v(1.3em)

#ambito(d.ambito)

#v(1.1em)

#verificacao(
  referencia: p.referencia,
  digest: p.digest,
  motor: p.motor,
  ano: str(p.anoFiscal),
  emitido: p.emitidoEm,
  url: p.verificacao,
  codigo: codigo-referencia(p.referencia),
)
