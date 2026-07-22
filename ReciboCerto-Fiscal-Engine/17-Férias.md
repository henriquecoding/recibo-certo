# 17 — Férias, retribuição e subsídio

## Base legal

Artigos 237.º a 247.º e 264.º do Código do Trabalho; artigo 99.º-C do CIRS; Código Contributivo.

## Linhas distintas

- `holiday_pay`: retribuição do período de férias, na bolsa mensal normal quando paga como remuneração;
- `holiday_subsidy`: subsídio de férias, sujeito a retenção autónoma;
- férias vencidas/não gozadas na cessação: rota de cessação, não linha genérica sem factos.

## Fracionamento/duodécimos

`amountPaid` é a fração do mês e `fullEntitlement` determina a taxa. Assim, 1/12 não é consultado na tabela como se fosse todo o subsídio.

## Algoritmo fiscal

```text
rate = withholdingTable(fullEntitlement)
withheldFraction = amountPaid × effectiveRate
SS base += amountPaid
```

## Valor laboral

O motor não assume sempre um salário-base. Prestação regular/periodicidade e IRCT podem influenciar a retribuição de férias. A origem do `fullEntitlement` deve ser auditável.

## Casos especiais

Ano de admissão, contrato <6 meses, impedimento prolongado, doença nas férias, cessação e trabalho temporário.

## Testes

Integral versus 12 frações, direito parcial, valor variável, admissão, cessação e bolsa separada de Natal.

## Fontes oficiais

- [Código do Trabalho consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475)
- [CIRS, artigo 99.º-C](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs99c.aspx)
