# 12 — Ajudas de custo e deslocações

## Base legal

O artigo 2.º do CIRS sujeita montantes que excedam os limites legais ou não cumpram os pressupostos de deslocação. O Código Contributivo acompanha o enquadramento nos termos nele previstos.

## Factos obrigatórios

- deslocação ao serviço da entidade confirmada;
- documentação presente;
- dias e valor diário;
- limite diário oficial aplicável à categoria/função;
- quando relevante, território, dormida, transporte e reembolso de despesas.

O núcleo não contém um «limite nacional universal». `exemptDailyLimit` é fornecido por uma matriz oficial revista.

## Algoritmo

```text
total = days × dailyAmount
if businessTravel && documented:
  exempt = days × min(dailyAmount, applicableLimit)
else:
  exempt = 0
taxable = total - exempt
IRS base += taxable
SS base += taxable
```

## Exceções

Reembolso contra documento não é necessariamente ajuda de custo. Quilómetros em viatura própria e despesas de representação usam limites/factos diferentes. Administração Pública e setor privado partilham referências fiscais, mas não necessariamente direitos remuneratórios.

## Testes

Limite ±1 cêntimo, documentação ausente, deslocação falsa, categoria sem limite, dia fracionado e combinação de reembolso/abono.

## Fontes oficiais

- [CIRS, artigo 2.º](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs2.aspx)
- [Código Contributivo](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575)
