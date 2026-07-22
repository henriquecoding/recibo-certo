# 21 — Contratos e regimes de trabalho

## Pergunta de entrada

O simulador pergunta primeiro o regime, porque o mesmo bruto pode ter direitos e contribuições diferentes.

| Contrato/regime | Núcleo mensal geral | Gate adicional |
|---|---|---|
| Sem termo / termo, tempo completo | suportado nas rubricas gerais | datas/IRCT para direitos |
| Part-time | suportado com horas semanais e `Rm` | mínimos e refeição pelo contrato |
| Trabalho temporário | parcial | utilizador, IRCT e remuneração comparável |
| Serviço doméstico | política própria | regime contributivo/modalidade |
| Estágio/IEFP | política própria | medida, bolsa, subsídios e apólice |
| Aprendiz/formação | política própria | contrato e apoio aplicável |
| Emprego público | não no núcleo geral | domínio do capítulo 19 |

## Princípio

O tipo de contrato não altera retroativamente a natureza de uma rubrica por simples `switch`. Seleciona política, requisitos e direitos; cada linha continua auditável.

## Fluxo

```text
identificar regime e datas
selecionar PayrollPolicy elegível
carregar IRCT/medida quando aplicável
gerar direitos laborais
classificar rubricas em IRS/SS
```

## Casos especiais

Pluriemprego, cedência, destacamento, trabalhador transfronteiriço e segurança social estrangeira são `unsupported` até módulo próprio.

## Testes

Tempo completo/part-time, termo/sem termo, admissão/cessação, políticas contributivas e tentativa de usar política geral num regime incompatível.

## Fonte oficial

[Código do Trabalho consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475) e legislação oficial específica de cada medida/regime.
