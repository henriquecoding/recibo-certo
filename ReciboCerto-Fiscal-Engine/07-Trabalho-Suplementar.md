# 07 — Trabalho suplementar

## Base legal

Artigos 268.º e 271.º do Código do Trabalho; artigo 99.º-C do CIRS; artigo 46.º do Código Contributivo.

## Valor horário

```text
hourly = (Rm × 12) / (52 × weeklyHours)
overtime = hourly × hours × (1 + premium)
```

Até 100 horas anuais, os acréscimos legais são 25% na primeira hora/fração em dia útil, 37,5% nas seguintes e 50% em descanso/feriado. Acima de 100 horas são 50%, 75% e 100%, respetivamente. Um IRCT aplicável pode fornecer prémio explícito.

## Retenção e SS

O total entra em SS. Em IRS, usa bolsa autónoma e retenção a 50% da taxa efetiva aplicável à remuneração mensal regular do mês.

## Dados e exceções

Exigem-se `Rm`, horas semanais, centésimos de hora, segmento e acumulado anual anterior. Uma linha que atravessa 100 horas devolve `needs_input` para ser dividida. Trabalho normal em feriado não deve ser confundido automaticamente com suplementar.

## Pseudocódigo

```text
band = annualBefore >= 100h ? above : upTo
if line crosses 100h: needs_input(split)
premium = IRCT ?? statutory[band][segment]
gross = hourlyFormula × hours × (1 + premium)
IRS = gross × 50% × effectiveMonthlyRate
```

## Testes

Primeira/seguintes/descanso, 99,99/100/100,01 horas, part-time, IRCT e remuneração mensal sem retenção.

## Fontes oficiais

- [Código do Trabalho consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475)
- [CIRS, artigo 99.º-C](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs99c.aspx)
