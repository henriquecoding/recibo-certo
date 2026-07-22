# 15 — Licença e subsídio parental inicial

## Separação

A licença afeta a prestação de trabalho; o subsídio parental é prestação da Segurança Social. O resultado social é calculado em `social-benefits.ts`, fora das rubricas salariais do empregador.

## Remuneração de referência

Somam-se as seis remunerações mais antigas dos oito meses anteriores, sem férias/Natal/análogos, e divide-se por 180. Com menos meses, a fórmula oficial alternativa exige número de meses e elegibilidade; não é presumida nesta função.

## Modalidades implementadas

| Modalidade | Percentagem base |
|---|---:|
| 120 dias | 100% |
| 150 dias sem partilha elegível | 80% |
| 150 dias com partilha exclusiva elegível | 100% |
| 180 dias, partilha de 30 dias | 83% |
| 180 dias, partilha de 60 dias | 90% |
| período exclusivo do pai / gémeos adicionais | 100% |

O mínimo diário de 2026 é 14,32 €. Residentes nas regiões autónomas recebem acréscimo de 2% ao valor da prestação. Na acumulação permitida com trabalho a tempo parcial, paga-se metade do valor diário e os dias convertem-se segundo o regime aplicável.

## Gate de modalidade

O chamador só seleciona uma modalidade depois de validar partilha, exclusividade, períodos e prazo de garantia. O calculador não transforma uma preferência em elegibilidade legal.

## Testes

Todas as taxas, mínimo, Madeira/Açores, part-time, gémeos, seis remunerações e fronteiras dos períodos.

## Fonte oficial

[Guia Prático do Subsídio Parental Inicial, Segurança Social, 2026](https://www.seg-social.pt/ptss/pssd/documento/cmc1ynbn400fskl2y5g278wvp).
