# 20 — Pessoas com deficiência

## Âmbito mensal

A deficiência fiscalmente relevante do titular seleciona tabelas próprias de retenção. O motor recebe um booleano apenas depois de confirmada incapacidade permanente igual ou superior ao limiar legal mediante documento válido.

## Dependentes

Deficiência de dependentes pode afetar a liquidação anual/deduções, mas não deve ser confundida com a deficiência do titular na seleção da tabela mensal. O UI apresenta os campos separadamente.

## Algoritmo

```text
if employeeDisabilityConfirmed:
  select disability withholding table for region/family situation
else:
  select ordinary table
annual deductions remain outside monthly withholding engine
```

## Segurança

Não se pede diagnóstico ou informação clínica desnecessária. Guarda-se apenas o facto fiscal, grau/validade quando indispensáveis e origem da confirmação. Atestado expirado, em revisão ou grau desconhecido produz `needs_input`.

## Casos especiais

Deficiência superveniente, retroatividade do atestado, pensões e rendimentos isentos/parcialmente excluídos pertencem a regras anuais próprias.

## Testes

Titular versus dependente, três regiões, grau abaixo/no limiar, validade e tabelas familiares.

## Fontes oficiais

- [Despacho n.º 233-A/2026](https://diariodarepublica.pt/dr/detalhe/despacho/233-a-2026-998488151)
- [Portal das Finanças — CIRS](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/default-with-key.aspx)
