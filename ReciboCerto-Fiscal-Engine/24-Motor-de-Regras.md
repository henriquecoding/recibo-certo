# 24 — Motor de regras e contratos

## Decisão fiscal

Toda regra devolve `ok`, `needs_input`, `not_applicable`, `unsupported` ou `conflict`, acompanhada por versão, dataset, regra, data, jurisdição, memória e avisos.

## Regra de payroll

`createPayrollRule(policy, withholdingResolver)` cria a regra `pt.payroll.monthly-slip.v1`. A política define taxas/parâmetros estruturais; o resolvedor contém as tabelas de retenção versionadas. Esta inversão impede que o algoritmo de rubricas copie tabelas.

## Contrato do resolvedor

```ts
type WithholdingResolver = (request: {
  bucket: PayrollTaxBucket;
  taxableAmount: Money;
  rateReferenceAmount: Money;
  employee: PayrollEmployee;
}) => WithholdingResolution;
```

## Memória

Cada etapa regista ID, rótulo, fórmula, operandos/unidades, resultado, arredondamento e IDs de fontes. Citações são resolvidas pelo catálogo oficial.

## Aprovação temporal

```text
context -> regra vigente -> dataset único -> gate approved -> requisitos -> cálculo
```

O adaptador em `src/lib/payroll-engine-adapter.ts` é só transição. Ele permite shadow mode contra as tabelas existentes e emite aviso para IRS Jovem; não converte o dataset draft em produção.

## Extensão

Uma nova rubrica exige tipo discriminado, factos, classificador, fontes, casos de fronteira, testes e apresentação. Não se adiciona comportamento por comparação de texto do rótulo.
