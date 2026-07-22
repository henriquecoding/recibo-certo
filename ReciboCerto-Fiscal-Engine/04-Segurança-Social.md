# 04 — Segurança Social do trabalhador dependente

## Base legal

Os artigos 44.º a 48.º do Código Contributivo definem base e exclusões. O artigo 53.º fixa, no regime geral, 34,75%: 23,75% da entidade empregadora e 11% do trabalhador.

## Regra principal

```text
baseSS = soma das bases contributivas por rubrica
SS_trabalhador = baseSS × 11%
SS_empregador = baseSS × 23,75%
```

O motor calcula cada parcela por linha e conserva a soma. Taxa diferente do regime geral exige um `PayrollPolicy` próprio e não um campo livre na interface pública.

## Incidência relevante

Incluem-se, entre outras, remuneração base, diuturnidades, comissões, trabalho suplementar/noturno, férias, subsídios, condições especiais, isenção de horário, refeição e deslocações na parte abrangida, viatura nas condições legais e prémios regulares.

## Regularidade

O artigo 47.º exige critérios objetivos e preestabelecidos. O motor pede `regular`, `not_regular` ou `unknown`; `unknown` produz `needs_input`. A expressão «prémio pontual» não basta.

## Exceções

- Exclusão de IRS não implica automaticamente exclusão de SS, nem o inverso.
- Viatura: base contributiva mensal de 0,75% do custo de aquisição nas condições legais; a base IRS usa outra referência.
- Cessação e apoios sociais exigem artigos/exclusões próprios.
- Um IRCT geral pode alterar certos limites contributivos; requer limite e fonte explícitos.

## Testes

Verificar cada rubrica sujeita/isenta, prémio em três estados, base negativa impossível, taxa geral e bases distintas da viatura.

## Fonte oficial

[Código dos Regimes Contributivos, versão consolidada](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575).
