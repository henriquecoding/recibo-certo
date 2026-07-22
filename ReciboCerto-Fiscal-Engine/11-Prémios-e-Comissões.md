# 11 — Prémios e comissões

## Base legal

O artigo 2.º do CIRS abrange gratificações, percentagens, comissões, participações e outras remunerações. Os artigos 46.º e 47.º do Código Contributivo tratam comissões, bónus e prémios segundo natureza e regularidade.

## Comissões

A linha `commission` é sujeita a IRS e SS. Deve representar o valor apurado pelo plano de comissões; a validação comercial do plano é externa.

## Prémios de desempenho

```text
IRS base = amount
if SS regularity == regular: SS base = amount
if SS regularity == not_regular: SS base = 0
if SS regularity == unknown: needs_input
```

Regularidade não significa apenas «pago todos os meses». Exige critérios objetivos/preestabelecidos e a frequência legal; a evidência deve ficar associada ao resultado.

## Casos especiais

- Um «bónus único» continua sujeito a IRS.
- Classificar automaticamente todo prémio pontual fora de SS é proibido.
- Gratificações por terceiros, participação nos lucros, stock options e prémios de assinatura têm rotas próprias.
- Retroativos de comissão de anos anteriores usam a bolsa `prior_years` quando os meses são conhecidos.

## Testes

Três estados de regularidade, comissão, retroativo, valor zero, repetição inferior/superior ao critério temporal e ausência de documento.

## Fontes oficiais

- [CIRS, artigo 2.º](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs2.aspx)
- [Código Contributivo, artigos 46.º–47.º](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575)
