# 02 — Trabalho dependente

## Base legal

O artigo 2.º do CIRS define rendimentos da categoria A. Os artigos 258.º a 271.º do Código do Trabalho enquadram retribuição e cálculo horário. Os artigos 44.º a 48.º do Código Contributivo delimitam a base de incidência.

## Modelo de rubrica

Cada linha contém `id`, `label`, `kind` e factos próprios. Base, diuturnidades, função, turnos, isenção de horário, comissões e outras remunerações pecuniárias entram, por regra, em IRS e SS. O motor não usa uma caixa genérica de «outros» para benefícios complexos.

## Algoritmo

```text
se remuneração pecuniária regular:
  caixa = montante
  IRS sujeito = montante
  base SS = montante
  bolsa = normal_monthly
senão:
  encaminhar ao tipo específico
```

## Casos especiais

- Pagamentos em espécie podem ter base IRS diferente da base SS.
- Ausência não remunerada é linha negativa; não é um «imposto».
- Subsídios de férias/Natal e retroativos não são somados à remuneração normal para determinar retenção.
- Prestações da Segurança Social por doença/parentalidade são mostradas fora do recibo do empregador.

## Inputs obrigatórios

Período, jurisdição, situação familiar, dependentes, deficiência, horas semanais e lista de rubricas. `hourlyReferenceRemuneration` é obrigatório se existirem horas extra, noturno ou faltas horárias.

## Testes e exemplo

Uma base de 2 000 € deve produzir caixa, base IRS e base SS de 2 000 €, antes de qualquer outra linha. Um subsídio de refeição não pode ser fundido nessa base: o limite é diário.

## Fontes oficiais

- [CIRS, artigo 2.º](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs2.aspx)
- [Código do Trabalho consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475)
- [Código Contributivo consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575)
