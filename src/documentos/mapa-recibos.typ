// ─────────────────────────────────────────────────────────────────────
//  Mapa de recibos
//  ---------------------------------------------------------------------
//  A mesma REGRA ABSOLUTA do relatório de vencimento: não há um único número
//  escrito à mão. Tudo vem de `dados.json`, produzido por `calcularRecibo`.
//
//  É o documento que se entrega ao contabilista, e por isso tem de aguentar
//  duzentas linhas sem perder o cabeçalho nem o fio à meada — daí a tabela
//  com `repeat: true` e o total repetido no fim.
//
//  Compilar:
//    npm run docs:build -- --dados /out/recibos-exemplo.json --saida out/mapa-recibos.pdf
// ─────────────────────────────────────────────────────────────────────

#import "lib/tokens.typ": *
#import "lib/template.typ": *
#import "lib/qr.typ": codigo-referencia

#let _entrada = sys.inputs.at("dados", default: "/src/documentos/recibos-exemplo.json")
#let d = if _entrada.trim().starts-with("{") { json(bytes(_entrada)) } else { json(_entrada) }
#let p = d.proveniencia

#show: documento.with(
  titulo: "Mapa de recibos · " + d.periodo,
  subtitulo: "Recibos emitidos, com IVA, retenção na fonte e Segurança Social por linha",
  referencia: p.referencia,
)

// ── 1 · A resposta ──────────────────────────────────────────────────────────

#capa-resposta(
  titulo: [= O que faturaste],
  periodo: d.periodo,
  rotulo: d.resposta.rotulo,
  valor: d.resposta.valor,
  contexto: d.resposta.contexto,
  referencia: p.referencia,
  segmentos: (
    (rotulo: "Fica contigo", valor: d.total.liquido),
    (rotulo: "Retenção de IRS", valor: d.total.retencao),
    (rotulo: "Segurança Social", valor: d.total.ss),
  ),
)

#v(15pt)

#indicadores((
  (rotulo: "Faturado", valor: eur(d.total.bruto), nota: str(d.quantos) + " recibos"),
  (rotulo: "IVA liquidado", valor: eur(d.total.iva), nota: "entregue ao Estado, não é teu", acento: true),
  (rotulo: "Clientes", valor: str(d.clientes.distintos), nota: "distintos no período"),
  (rotulo: "Líquido médio", valor: d.liquidoMedio, nota: "por recibo"),
))

#v(16pt)

#nota-margem[
  O IVA que cobras não é rendimento: é dinheiro do Estado que passa pela tua
  conta. Somá-lo ao que ganhaste é o erro de contas mais comum de quem passa
  recibos verdes.
]

#text(size: t-peq)[
  Este mapa lista os recibos do período, linha a linha, com as bases sobre as
  quais incidem o IVA, a retenção na fonte e a Segurança Social. Pode ser
  entregue ao contabilista ou anexado a um pedido de crédito.
]

// ── 2 · Os pressupostos do mapa ─────────────────────────────────────────────

#if d.filtros.len() > 0 [
  #v(1.1em)
  == Que recibos entraram

  #text(size: t-nota, fill: ink-soft)[
    Um mapa sem o critério de seleção não é verificável: quem o lê não sabe se
    falta alguma coisa.
  ]
  #v(0.6em)
  #grid(
    columns: (auto, 1fr),
    row-gutter: 4pt,
    column-gutter: 10pt,
    ..d.filtros.map(f => (
      text(size: t-nota, fill: ink-mute)[#f.rotulo],
      text(size: t-nota, fill: ink, weight: 600)[#f.valor],
    )).flatten()
  )
]

// ── 3 · Os recibos ──────────────────────────────────────────────────────────

#v(1.2em)

== Recibo a recibo

#tabela-financeira(
  colunas: ("texto", "texto", "texto", "n", "n", "n", "n", "n"),
  cabecalhos: ("Data", "Cliente", "Tipo", "Valor", "IVA", "Retenção", "Seg. Social", "Líquido"),
  linhas: d.linhas.map(l => (
    text(size: t-micro)[#l.data],
    [#l.cliente],
    text(size: t-micro, fill: ink-soft)[#l.tipo],
    eur(l.bruto, simbolo: false),
    eur(l.iva, simbolo: false),
    eur(l.retencao, simbolo: false),
    eur(l.ss, simbolo: false),
    text(weight: 600)[#eur(l.liquido, simbolo: false)],
  )),
  total: (
    text(weight: 700)[Total],
    [], [],
    text(weight: 700)[#eur(d.total.bruto, simbolo: false)],
    text(weight: 700)[#eur(d.total.iva, simbolo: false)],
    text(weight: 700)[#eur(d.total.retencao, simbolo: false)],
    text(weight: 700)[#eur(d.total.ss, simbolo: false)],
    text(weight: 700, fill: brand-deep)[#eur(d.total.liquido, simbolo: false)],
  ),
)

#v(0.5em)
#text(size: t-micro, fill: ink-mute)[
  Valores em euros. O líquido de cada linha é o valor menos a retenção na fonte
  e a Segurança Social — o IVA não entra porque nunca foi teu.
]

// ── 4 · De onde vem o dinheiro ──────────────────────────────────────────────

#if d.clientes.topo.len() > 1 [
  #pagebreak(weak: true)

  == De onde vem o dinheiro

  #text(size: t-peq, fill: ink-soft)[
    A concentração por cliente é a informação que um mapa de recibos dá e um
    extrato bancário não. Perder um cliente que vale metade da faturação é um
    acontecimento diferente de perder um que vale cinco por cento.
  ]

  #v(1em)

  #tabela-financeira(
    colunas: ("texto", "n", "n", "n"),
    cabecalhos: ("Cliente", "Recibos", "Faturado", "Do período"),
    linhas: (
      d.clientes.topo.map(c => (
        [#c.cliente],
        text(size: t-peq)[#str(c.quantos)],
        eur(c.bruto, simbolo: false),
        text(fill: ink-soft)[#c.pesoTexto],
      ))
      + if d.clientes.cauda != none {
        ((
          text(fill: ink-soft, style: "italic")[Restantes #str(d.clientes.cauda.quantos) clientes],
          text(size: t-peq, fill: ink-soft)[—],
          text(fill: ink-soft)[#eur(d.clientes.cauda.bruto, simbolo: false)],
          text(fill: ink-soft)[#d.clientes.cauda.pesoTexto],
        ),)
      } else { () }
    ),
    total: (
      text(weight: 700)[Total faturado],
      text(weight: 700)[#str(d.quantos)],
      text(weight: 700)[#eur(d.total.bruto, simbolo: false)],
      text(weight: 700)[#d.clientes.pesoTotalTexto],
    ),
  )

  #v(0.5em)
  #text(size: t-micro, fill: ink-mute)[
    As percentagens são arredondadas à décima: a soma das parcelas pode não dar
    exatamente 100 %. A coluna em euros fecha ao cêntimo — é essa que faz fé.
  ]

  #if d.concentracao != none [
    #v(1.1em)
    #block(width: medida-cheia, inset: (left: 9pt), stroke: (left: 2pt + brand), {
      set text(size: t-peq, fill: ink-soft)
      [
        O teu maior cliente — #text(fill: ink, weight: 600)[#d.concentracao.cliente] —
        vale #text(fill: brand-deep, weight: 700)[#d.concentracao.pesoTexto] do que
        faturaste no período.
      ]
    })
  ]
]

// ── 5 · Âmbito e verificação ────────────────────────────────────────────────

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
