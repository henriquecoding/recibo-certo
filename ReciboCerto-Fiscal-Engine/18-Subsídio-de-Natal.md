# 18 — Subsídio de Natal

## Base legal

Artigo 263.º do Código do Trabalho, artigo 99.º-C do CIRS e Código Contributivo.

## Direito e proporcionalidade

Em regra, corresponde a um mês de retribuição. É proporcional no ano de admissão, cessação e suspensão por facto respeitante ao trabalhador. O gerador do direito precisa de datas e base remuneratória; o motor fiscal recebe o direito já justificado.

## Retenção autónoma

```text
rate = withholdingTable(fullEntitlement)
withheld = amountPaid × effectiveRate
SS base += amountPaid
bucket = christmas_subsidy_autonomous
```

Não se soma ao salário normal do mês. Em duodécimos, a taxa continua a ser determinada pelo subsídio total relevante.

## Casos especiais

Suspensão, doença/parentalidade e prestações compensatórias da Segurança Social; retribuição variável; cessação; IRCT mais favorável. Uma prestação compensatória social não deve ser registada como custo salarial do empregador.

## Testes

Subsídio integral, 12 frações, admissão a meio do ano, cessação, suspensão e taxa zero na tabela.

## Fontes oficiais

- [Código do Trabalho, artigo 263.º](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475)
- [CIRS, artigo 99.º-C](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs99c.aspx)
- [Código Contributivo](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575)
