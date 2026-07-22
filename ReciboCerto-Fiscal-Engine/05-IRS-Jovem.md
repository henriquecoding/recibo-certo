# 05 — IRS Jovem na retenção salarial

## Base legal

Artigos 12.º-B e 99.º-F do CIRS, conjugados com as tabelas de retenção vigentes.

## Gate de elegibilidade

O motor nunca ativa IRS Jovem pela idade apenas. Exige, no mínimo:

- ano de benefício válido;
- invocação expressa perante a entidade patronal;
- dados necessários ao limite e percentagem do ano;
- ausência de conflito conhecido com exclusões legais.

Nesta versão, o adaptador legado recebe `benefitYear` apenas quando `invokedWithEmployer` é verdadeiro e emite aviso até haver testes dourados independentes.

## Mecânica de retenção

A taxa é determinada atendendo à totalidade do rendimento, incluindo a parte isenta, e aplicada apenas à parte não isenta, nos termos do artigo 99.º-F. Não se consulta a tabela sobre uma base artificialmente reduzida.

## Casos especiais

- salário, férias e Natal têm limites/bolsas próprios no período;
- suplementar conserva a retenção autónoma;
- mudança de empregador ou dados incompletos pode impedir conhecer o consumo anual do limite;
- benefício na retenção não garante o resultado da liquidação anual.

## Pseudocódigo

```text
if not invoked: não aplicar
rate = table(totalRemuneration)
exemptPart = eligibility(year, legalCap, facts)
withholding = rate applied to nonExemptPart
```

## Testes

Anos 1–10, teto ±1 cêntimo, invocação ausente, múltiplas entidades, subsídios e comparação sem benefício.

## Fontes oficiais

- [CIRS, artigo 12.º-B](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs12b.aspx)
- [CIRS, artigo 99.º-F](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs99f.aspx)
