# 10 — Diuturnidades

## Base legal

As diuturnidades são prestações relacionadas com antiguidade quando previstas em contrato, IRCT ou regime aplicável. Integram a noção de retribuição, a categoria A do IRS e a base contributiva. O Código do Trabalho usa retribuição base e diuturnidades em várias compensações.

## Regra implementada

`seniority` é uma linha mensal fixa: caixa, base IRS e base SS iguais ao montante. O motor fiscal não inventa escalões de antiguidade.

## Gerador futuro

```text
pedir IRCT/contrato e data de admissão
identificar escalão e data de vencimento
calcular unidades × valor vigente
emitir linha seniority com fonte contratual
```

## Casos especiais

Mudança de categoria, suspensão, sucessão de IRCT, transferência de empresa e reconhecimento de antiguidade anterior exigem documento. Na cessação, a diuturnidade pode integrar bases de compensação previstas na lei.

## Testes

Entrada manual documentada, atualização temporal, múltiplas unidades e preservação na remuneração horária quando incluída em `Rm`.

## Fontes oficiais

- [Código do Trabalho consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475)
- [CIRS, artigo 2.º](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs2.aspx)
- [Código Contributivo](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575)
