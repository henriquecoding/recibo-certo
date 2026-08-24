// ─────────────────────────────────────────────────────────────────────
//  Relatório de vencimento
//  ---------------------------------------------------------------------
//  REGRA ABSOLUTA deste ficheiro: não há um único número escrito à mão. Todos
//  os valores vêm de `dados.json`, produzido por `calcularReciboMensal` e
//  `calcularVencimentoAnual`. É essa regra que torna o relatório auditável.
//
//  Compilar:
//    npm run docs:build
// ─────────────────────────────────────────────────────────────────────

#import "lib/tokens.typ": *
#import "lib/template.typ": *
#import "lib/qr.typ": codigo-referencia

// Os dados chegam de duas formas: como JSON em texto (é assim que a função
// Python os passa, sem escrever nada em disco) ou como caminho dentro da raiz
// do projeto (é assim que o script local os passa, para se poder editar o
// ficheiro e recompor). Um serverless não tem sítio dentro da raiz onde
// escrever, e o compositor recusa-se a ler fora dela — daí as duas formas.
#let _entrada = sys.inputs.at("dados", default: "/src/documentos/dados-exemplo.json")
#let d = if _entrada.trim().starts-with("{") { json(bytes(_entrada)) } else { json(_entrada) }
#let p = d.proveniencia

#show: documento.with(
  titulo: "Relatório de vencimento · " + d.periodo,
  subtitulo: "Decomposição do vencimento mensal e anual — IRS, Segurança Social e custo para a empresa",
  referencia: p.referencia,
)

// ── 1 · Uma pergunta, uma resposta ──────────────────────────────────────────
//
// O primeiro terço da primeira página responde à pergunta. Tudo o que vem a
// seguir é justificação — e essa hierarquia tem de se ver em três segundos.

#capa-resposta(
  titulo: [= Onde foi parar o teu salário],
  periodo: d.periodo,
  rotulo: d.resposta.rotulo,
  valor: d.resposta.valor,
  contexto: d.resposta.contexto,
  referencia: p.referencia,
  segmentos: (
    (rotulo: "Fica contigo", valor: d.totais.liquido),
    (rotulo: "Retenção de IRS", valor: d.totais.irs),
    (rotulo: "Segurança Social", valor: d.totais.ss),
  ),
)

#v(15pt)

#indicadores((
  (rotulo: "Bruto / caixa", valor: eur(d.totais.bruto), nota: "remunerações e abonos"),
  (rotulo: "Taxa efetiva", valor: pct(d.totais.taxaEfetiva), nota: "sobre o rendimento sujeito", acento: true),
  (rotulo: "Custo da empresa", valor: eur(d.totais.custoEmpresa), nota: "regime geral, sem seguro"),
  (rotulo: "Líquido anual", valor: eur(d.ano.liquido), nota: eur(d.ano.liquidoMedioMes) + " por mês"),
))

#v(6pt)

#text(size: t-lead, fill: ink-soft)[
  Este documento decompõe o vencimento rubrica a rubrica, mostra sobre que
  bases incidem o IRS e a Segurança Social, e diz de onde vem cada número.
  Pode ser levado ao departamento de pessoal ou a um contabilista.
]

// ── 2 · Pressupostos ────────────────────────────────────────────────────────

== Pressupostos

#nota-margem[
  Um relatório sem os seus pressupostos não é verificável, e não verificável é
  não confiável. Se algum destes não corresponder à tua situação, o resultado
  muda.
]

#block(width: col-corpo, {
  set text(size: t-peq)
  set par(justify: false, leading: 0.5em)
  grid(
    columns: (auto, 1fr, auto, 1fr),
    column-gutter: (7pt, 20pt, 7pt),
    row-gutter: 5.5pt,
    ..d.pressupostos.map(item => (
      text(fill: ink-mute, hyphenate: false)[#item.rotulo],
      text(fill: ink, weight: 600)[#item.valor],
    )).flatten()
  )
})

// ── 3 · Rubrica a rubrica ───────────────────────────────────────────────────

== O mês, rubrica a rubrica

#tabela-financeira(
  colunas: ("texto", "n", "n", "n", "n", "n", "n"),
  cabecalhos: ("Rubrica", "Bruto", "Base IRS", "Base SS", "IRS", "SS", "Líquido"),
  linhas: d.rubricas.map(r => (
    {
      text(weight: 600)[#r.rubrica]
      if r.detalhe != "" {
        linebreak()
        text(size: t-micro, fill: ink-mute)[#r.detalhe]
      }
    },
    eur(r.bruto, simbolo: false),
    if r.baseIRS == 0 { na } else { eur(r.baseIRS, simbolo: false) },
    if r.baseSS == 0 { na } else { eur(r.baseSS, simbolo: false) },
    eur(r.irs, simbolo: false),
    eur(r.ss, simbolo: false),
    eur(r.liquido, simbolo: false),
  )),
  total: (
    [Total],
    eur(d.totais.bruto, simbolo: false),
    eur(d.totais.bruto, simbolo: false),
    eur(d.totais.baseSS, simbolo: false),
    eur(d.totais.irs, simbolo: false),
    eur(d.totais.ss, simbolo: false),
    eur(d.totais.liquido, simbolo: false),
  ),
)

#v(0.5em)
#text(size: t-micro, fill: ink-mute)[
  Valores em euros. Um traço indica que a rubrica não incide nessa base — que é
  diferente de incidir sobre zero.
]

// ── 4 · O ano ───────────────────────────────────────────────────────────────

#pagebreak(weak: true)

== O ano

#text(size: t-peq, fill: ink-soft)[
  Catorze prestações: doze meses mais os subsídios de férias e de Natal, cada um
  com retenção autónoma. O mês em que cada subsídio é pago depende da entidade
  empregadora — por isso aparecem identificados pelo nome, e não num mês
  inventado. Abaixo estão agrupadas pelos valores distintos que produzem.
]

#v(1.1em)

#niveis-prestacoes(d.niveis)

#v(1.3em)

#if d.amplitude != none [
  #block(width: medida-cheia, inset: (left: 9pt), stroke: (left: 2pt + brand), {
    set text(size: t-peq, fill: ink-soft)
    [
      Entre a prestação mais baixa (#text(fill: ink, weight: 600)[#d.amplitude.menor],
      #eur(d.amplitude.valorMenor)) e a mais alta (#text(fill: ink, weight: 600)[#d.amplitude.maior],
      #eur(d.amplitude.valorMaior)) vão #text(fill: brand-deep, weight: 700)[#eur(d.amplitude.diferenca)].
      É a amplitude que ninguém antecipa ao olhar só para o salário — e a razão
      pela qual um mês pode parecer errado sem estar.
    ]
  })

  #v(1.3em)
]

#block(width: col-corpo, {
  set text(size: t-peq)
  let linha(rotulo, valor, forte: false) = grid(
    columns: (1fr, auto),
    text(weight: if forte { 700 } else { 400 })[#rotulo],
    text(weight: if forte { 700 } else { 400 })[#eur(valor)],
  )
  linha("Remunerações do ano (14 prestações)", d.ano.bruto)
  v(4pt)
  linha("Subsídio de refeição", d.ano.refeicao)
  v(4pt)
  linha("Do qual, acima do limite diário (tributado)", d.ano.refeicaoTributada)
  v(4pt)
  linha("Retenção de IRS no ano", -d.ano.irs)
  v(4pt)
  linha("Segurança Social no ano", -d.ano.ss)
  v(7pt)
  line(length: 100%, stroke: 0.9pt + brand-deep)
  v(7pt)
  linha("Líquido anual", d.ano.liquido, forte: true)
  v(3pt)
  text(size: t-micro, fill: ink-mute)[Equivale a #eur(d.ano.liquidoMedioMes) por mês, em média.]
})

// ── 5 · Custo para a empresa ────────────────────────────────────────────────

== Custo salarial direto — regime geral

#nota-margem[
  Não se chama «custo total» porque não é: fica de fora o seguro obrigatório de
  acidentes de trabalho, a formação e os custos indiretos.
]

#block(width: col-corpo, {
  set text(size: t-peq)
  let linha(rotulo, valor, forte: false) = grid(
    columns: (1fr, auto),
    text(weight: if forte { 700 } else { 400 })[#rotulo],
    text(weight: if forte { 700 } else { 400 })[#eur(valor)],
  )
  linha("Remunerações e abonos", d.totais.bruto)
  v(4pt)
  linha("Contribuição da entidade empregadora", d.totais.custoEmpresa - d.totais.bruto)
  v(7pt)
  line(length: 100%, stroke: 0.9pt + brand-deep)
  v(7pt)
  linha("Custo salarial direto", d.totais.custoEmpresa, forte: true)
  v(6pt)
  text(fill: ink-mute)[
    Seguro de acidentes de trabalho, estimado e #emph[não] incluído acima:
    #text(fill: ink, weight: 600)[#eur(d.totais.seguroAcidentes)]
  ]
})

// ── 6 · Taxa efetiva de cada remuneração ────────────────────────────────────
//  O n.º 10 do Despacho 233-A/2026 obriga a entidade pagadora a apresentar
//  estas taxas EM SEPARADO sempre que o pagamento inclui mais do que uma
//  remuneração. Este relatório serve para conferir o recibo: tem de mostrar as
//  mesmas taxas que o recibo é obrigado a mostrar.

#if d.taxasEfetivas.len() > 0 {
  pagebreak(weak: true)

  heading(level: 2)[Taxa efetiva de cada remuneração]

  text(size: t-peq, fill: ink-soft)[
    #if d.taxasEfetivas.len() > 1 [
      Com mais do que uma remuneração no mesmo pagamento — o mês de um subsídio,
      tipicamente — a entidade pagadora tem de apresentar a taxa efetiva de cada
      uma em separado, e não uma taxa única. É assim que devem constar do recibo.
    ] else [
      A taxa com que esta remuneração foi retida.
    ]
  ]

  v(0.7em)

  tabela-financeira(
    colunas: ("texto", "n", "n", "n"),
    cabecalhos: ("Remuneração", "Base", "Retenção", "Taxa efetiva"),
    linhas: d.taxasEfetivas.map(t => (
      {
        text(weight: 600)[#t.rotulo]
        linebreak()
        text(size: t-micro, fill: brand-dark)[#t.fonte]
      },
      eur(t.base, simbolo: false),
      eur(t.retencao, simbolo: false),
      text(weight: 600)[#t.taxaTexto],
    )),
  )
}

// ── 7 · Memória de cálculo ──────────────────────────────────────────────────

#pagebreak(weak: true)

== Memória de cálculo

#text(size: t-peq, fill: ink-soft)[
  Existe para poder ser contestada. É o que separa «confia em nós» de «vê por ti».
]

#v(0.7em)

#tabela-financeira(
  colunas: ("texto", "texto", "n"),
  cabecalhos: ("Rubrica", "Como se chega ao valor", "Valor"),
  linhas: d.memoria.map(m => (
    text(weight: 600)[#m.rubrica],
    {
      text(size: t-micro)[#m.formula]
      if m.fonte != "—" and m.fonte != "" {
        linebreak()
        text(size: t-micro, fill: brand-dark)[#m.fonte]
      }
    },
    eur(m.valor, simbolo: false),
  )),
)

// ── 7 · Base legal, âmbito e verificação ────────────────────────────────────

== Base legal

#base-legal(d.baseLegal)

#v(1.1em)

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
