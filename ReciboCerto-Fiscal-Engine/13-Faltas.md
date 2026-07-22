# 13 — Faltas e mês incompleto

## Base legal

O Código do Trabalho distingue faltas justificadas/injustificadas e respetivos efeitos. O artigo 271.º fornece a fórmula da retribuição horária.

## Regra implementada

A linha `unpaid_absence` representa apenas ausência que já foi juridicamente classificada como não remunerada:

```text
deduction = (Rm × 12 × absentHours) / (52 × weeklyHours)
cash = -deduction
IRS base = -deduction
SS base = -deduction
```

`Rm` deve ser fornecida expressamente. O motor não conclui que uma falta é não remunerada a partir do motivo escrito pelo utilizador.

## Mês incompleto

Admissão, cessação, suspensão e alteração de horário devem ser construídas como direitos e deduções documentados. Dividir o salário sempre por 30 é uma aproximação não aceite como regra transversal.

## Efeitos relacionados

Dias de refeição são fornecidos já ajustados. Prémios de assiduidade, férias e antiguidade podem depender de regras próprias e não são recalculados por efeito colateral silencioso.

## Testes

Uma hora, centésimo de hora, ausência superior ao salário, part-time, falta remunerada (sem linha negativa) e mês com admissão/cessação.

## Fonte oficial

[Código do Trabalho consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475).
