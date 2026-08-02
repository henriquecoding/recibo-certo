// ─────────────────────────────────────────────────────────────────────
//  Relatório de vencimento
//  ---------------------------------------------------------------------
//  REGRA ABSOLUTA deste ficheiro: não há um único número escrito à mão. Todos
//  os valores vêm de `dados.json`, produzido por `calcularReciboMensal` e
//  `calcularVencimentoAnual`. É essa regra que torna o relatório auditável.
//
//  Compilar:
//    typst compile --root . --input dados=<caminho> \
//      --pdf-standard a-2a,ua-1 --font-path src/documentos/fontes \
//      src/documentos/relatorio-vencimento.typ saida.pdf
// ─────────────────────────────────────────────────────────────────────

#import "lib/tokens.typ": *
#import "lib/template.typ": *

#let d = json(sys.inputs.at("dados", default: "dados-exemplo.json"))
#let p = d.proveniencia

#show: documento.with(
  titulo: "Relatório de vencimento · " + d.periodo,
  subtitulo: "Decomposição do vencimento mensal e anual — IRS, Segurança Social e custo para a empresa",
  referencia: p.referencia,
)

// ── 1 · Uma pergunta, uma resposta ──────────────────────────────────────────

#eyebrow("ReciboCerto · copiloto fiscal")
#v(0.3em)

= Relatório de vencimento

#text(size: t-lead, fill: ink-soft)[
  #d.periodo. Este documento decompõe o vencimento rubrica a rubrica, mostra
  sobre que bases incidem o IRS e a Segurança Social, e diz de onde vem cada
  número.
]

#resposta(
  rotulo: d.resposta.rotulo,
  valor: eur(d.resposta.valor),
  contexto: d.resposta.contexto,
)

#barra-segmentos((
  (rotulo: "Fica contigo", valor: d.totais.liquido),
  (rotulo: "Retenção de IRS", valor: d.totais.irs),
  (rotulo: "Segurança Social", valor: d.totais.ss),
))

#v(1.2em)

// ── 2 · Pressupostos ────────────────────────────────────────────────────────

== Pressupostos

#nota-margem[
  Um relatório sem os seus pressupostos não é verificável, e não verificável é
  não confiável. Se algum destes não corresponder à tua situação, o resultado
  muda.
]

#block(width: col-corpo, {
  set text(size: t-peq)
  grid(
    columns: (auto, 1fr),
    row-gutter: 4.5pt,
    column-gutter: 12pt,
    ..d.pressupostos.map(item => (text(fill: ink-mute)[#item.rotulo], text(fill: ink)[#item.valor])).flatten()
  )
})

// ── 3 · Rubrica a rubrica ───────────────────────────────────────────────────

== O mês, rubrica a rubrica

#tabela-financeira(
  colunas: ("texto", "n", "n", "n", "n", "n", "n"),
  cabecalhos: ("Rubrica", "Bruto", "Base IRS", "Base SS", "IRS", "SS", "Líquido"),
  linhas: d.rubricas.map(r => (
    {
      [#r.rubrica]
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

#v(0.4em)
#text(size: t-micro, fill: ink-mute)[
  Valores em euros. Um traço indica que a rubrica não incide nessa base — que é
  diferente de incidir sobre zero. A taxa efetiva do mês é #pct(d.totais.taxaEfetiva)
  sobre o rendimento sujeito.
]

// ── 4 · O ano ───────────────────────────────────────────────────────────────

== O ano

#nota-margem[
  Catorze prestações: doze meses mais os subsídios de férias e de Natal, cada um
  com retenção autónoma. A parte do subsídio de refeição acima do limite diário
  entra nas bases, como em cada mês.
]

#block(width: col-corpo, {
  set text(size: t-peq)
  grid(
    columns: (1fr, auto),
    row-gutter: 4.5pt,
    [Remunerações do ano], eur(d.ano.bruto),
    [Subsídio de refeição], eur(d.ano.refeicao),
    [Do qual, acima do limite (tributado)], eur(d.ano.refeicaoTributada),
    [Retenção de IRS no ano], eur(-d.ano.irs),
    [Segurança Social no ano], eur(-d.ano.ss),
  )
  v(4pt)
  line(length: 100%, stroke: 0.8pt + brand-deep)
  v(4pt)
  grid(
    columns: (1fr, auto),
    text(weight: 700)[Líquido anual], text(weight: 700, eur(d.ano.liquido)),
  )
  v(2pt)
  text(size: t-micro, fill: ink-mute)[Equivale a #eur(d.ano.liquidoMedioMes) por mês, em média.]
})

// ── 5 · Custo para a empresa ────────────────────────────────────────────────

== Custo salarial direto — regime geral

#block(width: col-corpo, {
  set text(size: t-peq)
  grid(
    columns: (1fr, auto),
    row-gutter: 4.5pt,
    [Remunerações e abonos], eur(d.totais.bruto),
    [Contribuição da entidade empregadora], eur(d.totais.custoEmpresa - d.totais.bruto),
    text(weight: 700)[Custo salarial direto], text(weight: 700, eur(d.totais.custoEmpresa)),
    [Seguro de acidentes de trabalho (estimado, NÃO incluído acima)], eur(d.totais.seguroAcidentes),
  )
})

#v(0.3em)
#text(size: t-micro, fill: ink-mute)[
  Não inclui o seguro obrigatório de acidentes de trabalho, formação nem custos
  indiretos — daí não se chamar «custo total».
]

// ── 6 · Memória de cálculo ──────────────────────────────────────────────────

#pagebreak(weak: true)

== Memória de cálculo

#text(size: t-peq, fill: ink-soft)[
  Existe para poder ser contestada. É o que separa «confia em nós» de «vê por ti».
]

#v(0.6em)

#tabela-financeira(
  colunas: ("texto", "texto", "n"),
  cabecalhos: ("Rubrica", "Como se chega ao valor", "Valor"),
  linhas: d.memoria.map(m => (
    [#m.rubrica],
    {
      text(size: t-micro)[#m.formula]
      linebreak()
      text(size: t-micro, fill: ink-mute)[#m.fonte]
    },
    eur(m.valor, simbolo: false),
  )),
)

// ── 7 · Base legal e âmbito ─────────────────────────────────────────────────

== Base legal

#base-legal(d.baseLegal)

#v(1em)

#ambito(d.ambito)

#v(1em)

#verificacao(
  referencia: p.referencia,
  digest: p.digest,
  motor: p.motor,
  ano: str(p.anoFiscal),
  emitido: p.emitidoEm,
  url: p.verificacao,
)
