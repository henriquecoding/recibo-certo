# 08 — Trabalho noturno

## Base legal

Os artigos 223.º e 266.º do Código do Trabalho definem período e acréscimo, sem prejuízo de IRCT e exceções. O período supletivo é 22h00–07h00 e o acréscimo legal geral é 25%.

## Contrato de input

Horas noturnas, `Rm`, horas semanais e regime:

- `statutory` com confirmação de que nenhuma exceção se aplica;
- `collective_agreement` com taxa explícita;
- `unknown`, que devolve `needs_input`.

## Algoritmo

```text
hourly = (Rm × 12) / (52 × weeklyHours)
premium = statutory 25% or documented IRCT rate
nightPremium = hourly × nightHours × premium
IRS base += nightPremium
SS base += nightPremium
```

O motor considera que a rubrica representa o acréscimo; a remuneração normal das horas já deve estar na base/linha respetiva.

## Exceções

Atividades exercidas exclusiva ou predominantemente à noite, equivalências de redução de horário, IRCT e trabalho por turnos podem alterar o resultado. O motor não escolhe uma exceção pelo setor indicado em texto livre.

## Testes

25%, IRCT, `unknown`, meia hora, part-time, sobreposição com suplementar e fronteira do período noturno.

## Fonte oficial

[Código do Trabalho, artigos 223.º e 266.º](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475).
