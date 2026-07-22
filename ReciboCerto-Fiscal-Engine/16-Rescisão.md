# 16 — Cessação do contrato

## Estado

`termination_payment` é deliberadamente `unsupported` no motor genérico. Uma rescisão não é uma rubrica única: exige modalidade de cessação, datas, antiguidade, tipo de contrato, aviso prévio, férias, Natal, formação, compensação e acordo.

## Direitos a reconstruir separadamente

- salário e rubricas do último período;
- férias vencidas/não gozadas e subsídio;
- proporcionais do ano da cessação;
- proporcional de Natal;
- formação não proporcionada/crédito;
- aviso prévio em falta, quando aplicável;
- compensação/indemnização segundo a modalidade;
- outras dívidas ou descontos documentados.

## Enquadramento fiscal

O artigo 2.º do CIRS contém limites e condições próprias para importâncias por cessação. O tratamento não pode ser inferido do rótulo «indemnização». A incidência contributiva exige confronto com as exclusões do artigo 48.º do Código Contributivo.

## Fluxo proposto

```text
identificar modalidade e iniciativa
validar contrato, admissão, cessação e aviso
calcular cada direito laboral em linha distinta
classificar IRS/SS de cada linha
aplicar retenção e emitir mapa de cessação
```

## Casos especiais

Contrato a termo, acordo, despedimento coletivo/extinção, justa causa, administrador, pacto de não concorrência, reintegração e recebimentos anteriores do mesmo empregador exigem rotas próprias.

## Testes obrigatórios antes de ativar

Cada modalidade legal, cessação no ano seguinte à admissão, contrato ≤12 meses, férias vencidas, aviso, limites fiscais e valores já recebidos.

## Fontes oficiais

- [Código do Trabalho consolidado, artigos 134.º, 245.º e 340.º e seguintes](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475)
- [CIRS, artigo 2.º](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs2.aspx)
- [Código Contributivo](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575)
