# 06 — Subsídio de refeição

## Base legal e parâmetros 2026

O artigo 2.º do CIRS sujeita o excesso sobre o limite legal. A Portaria n.º 51-B/2026/1 fixou o abono diário da Administração Pública em 6,15 € desde 1 de janeiro. Em cartão/vale, o limite fiscal corresponde ao limite acrescido de 70%.

## Algoritmo diário

```text
limit = cash ? 6,15 € : 6,15 € × 170%
total = dailyAmount × eligibleDays
exempt = min(dailyAmount, limit) × eligibleDays
taxable = total - exempt
IRS base += taxable
SS base += taxable, nos mesmos termos do CIRS
```

A política guarda 10,46 € como fronteira monetária em cêntimos para cartão/vale. O valor matemático é 10,455 €; este ponto deve ser validado em teste dourado com a prática oficial de arredondamento antes da aprovação do dataset.

## Factos necessários

Dias efetivamente elegíveis, valor diário e meio de pagamento. Faltas, férias, doença ou teletrabalho não alteram dias por presunção: o chamador fornece os dias após aplicar contrato/IRCT/política válida.

## Casos especiais

- Pagamento mensal global deve ser convertido em valor/dias documentados ou devolve `needs_input`.
- Cartão não é sinónimo de isenção integral.
- O excesso é sujeito diariamente, não depois de comparar totais mensais.

## Testes

0 dias; 6,15 €; 6,16 €; fronteira de cartão; mês com faltas; dinheiro versus cartão; um cêntimo acima do limite.

## Fontes oficiais

- [CIRS, artigo 2.º](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs2.aspx)
- [Portaria n.º 51-B/2026/1](https://diariodarepublica.pt/dr/detalhe/portaria/51-b-2026-1031110274)
- [Código Contributivo](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575)
