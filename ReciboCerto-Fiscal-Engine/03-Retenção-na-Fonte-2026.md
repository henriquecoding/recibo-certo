# 03 — Retenção na fonte de IRS em 2026

## Base legal

O artigo 99.º-C do CIRS disciplina retenções autónomas. O artigo 99.º-F enquadra tabelas e IRS Jovem. O Despacho n.º 233-A/2026 aprova as tabelas do Continente; Madeira e Açores usam atos regionais próprios.

## Bolsas obrigatórias

| Bolsa | Base da taxa | Aplicação |
|---|---|---|
| `normal_monthly` | remuneração mensal sujeita | tabela familiar/regional |
| `overtime_autonomous` | taxa efetiva da remuneração mensal | 50% dessa taxa sobre suplementar |
| `holiday_subsidy_autonomous` | subsídio total | só montante pago |
| `christmas_subsidy_autonomous` | subsídio total | só montante pago |
| `prior_years` | total ÷ meses | taxa média aplicada ao total |

## Algoritmo

```text
selecionar região, situação familiar, deficiência e dependentes
calcular taxa/montante pela tabela vigente
se 3+ dependentes: aplicar regra da tabela, não uma dedução inventada
se bolsa suplementar: metade da taxa efetiva mensal
se subsídio fracionado: taxa do direito total × fração paga
se retroativos: taxa da média mensal × total
arredondar apenas nos pontos documentados
```

## Exceções

Tabelas regionais não são aproximações por desconto à tabela continental. Múltiplas remunerações autónomas ficam separadas. A retenção é pagamento por conta, não liquidação anual do IRS.

## Pseudocódigo do adaptador

```text
referenceRetention = table(rateReferenceAmount, profile, region)
effectiveRate = referenceRetention / rateReferenceAmount
if overtime: effectiveRate *= 50%
withheld = taxableAmount * effectiveRate
```

## Testes

- limiar de cada escalão ±1 cêntimo;
- 0, 1, 2 e 3 dependentes;
- três regiões e tabelas de deficiência;
- subsídio integral versus 12 frações;
- suplementar com remuneração normal zero;
- comparação com exemplos oficiais aprovados.

## Fontes oficiais

- [CIRS, artigo 99.º-C](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs99c.aspx)
- [CIRS, artigo 99.º-F](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs99f.aspx)
- [Despacho n.º 233-A/2026](https://diariodarepublica.pt/dr/detalhe/despacho/233-a-2026-998488151)
