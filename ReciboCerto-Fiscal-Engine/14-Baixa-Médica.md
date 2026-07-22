# 14 — Baixa médica e subsídio de doença

## Separação de responsabilidades

O empregador regista ausência/suspensão e remuneração devida. A Segurança Social paga o subsídio de doença. O motor apresenta ambos no cenário, mas não insere a prestação como salário da empresa.

## Base e algoritmo implementados

Para trabalhador por conta de outrem, a remuneração de referência diária usa as seis remunerações mais antigas dos oito meses anteriores, excluindo férias/Natal/análogos:

```text
RR_daily = sum(sixRegisteredRemunerations) / 180
rate = 55% até 30 dias; 60% até 90; 70% até 365; 75% depois
rate += 5 p.p. nas condições oficiais aplicáveis às duas primeiras bandas
daily = min(netRRLimit, max(RR_daily × rate, statutoryFloor))
payableDays = incapacityDays - remainingWaitingDays
```

O piso de 2026 é 9,20 €; se a RR for inferior, usa-se a RR. O período normal de espera do trabalhador dependente é três dias. Internamento, cirurgia ambulatória, tuberculose e continuidade após parentalidade podem iniciar no primeiro dia. ADD pode satisfazer dias de espera, mas não gera subsídio.

## Inputs que bloqueiam

Seis remunerações, duração, exceção de primeiro dia, condições do acréscimo, limite líquido da RR e, na tuberculose, familiares a cargo. Sem limite líquido, `needs_input`.

## Casos não cobertos automaticamente

Prazo de garantia, índice de profissionalidade, acumulações, doença profissional/acidente, pagamentos de empregador por IRCT e períodos com regimes estrangeiros requerem módulos de elegibilidade.

## Testes

30/31/90/91/365/366 dias; três dias; cada exceção; ADD; piso; teto líquido; tuberculose; +5 p.p.

## Fonte oficial

[Guia Prático do Subsídio de Doença, Segurança Social, 2026](https://www.seg-social.pt/ptss/pssd/documento/cmdde8gsx000qi12yzi40plc6).
