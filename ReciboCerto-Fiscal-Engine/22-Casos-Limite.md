# 22 — Casos limite e decisões seguras

## Matriz

| Caso | Decisão |
|---|---|
| Campo factual ausente | `needs_input` com caminho e motivo |
| Regime ainda sem matriz | `unsupported` |
| IDs repetidos / valor impossível | `conflict` |
| Regra avaliada e não aplicável | `not_applicable` |
| Dataset não aprovado | `unsupported` no executor público |

## Fronteiras implementadas

- centésimos de euro e de hora;
- linha de suplementar que atravessa 100 horas anuais deve ser dividida;
- deduções não podem tornar caixa/base total negativa;
- subsídio pago não pode exceder o direito total da linha;
- refeição é comparada por dia;
- prémio com regularidade desconhecida bloqueia SS;
- penhora de alimentos/ordem especial exige montante judicial;
- viatura exige acordo escrito, uso pessoal e duas valorizações;
- IRS Jovem indicado sem invocação é conflito.

## Outros casos que devem permanecer bloqueados

Salário negativo, pagamento em moeda sem conversão documentada, mais de uma jurisdição contributiva, retroativo sem meses, IRCT sem vigência e rubrica importada sem natureza identificável.

## Propriedades de teste

```text
soma(linhas) == totais
líquido = caixa - IRS - SS - penhora
custo = caixa + SS empregador
0 <= retenção <= base sujeita positiva
reordenar linhas não muda totais
```

## Auditoria humana

Um resultado matematicamente consistente pode continuar juridicamente incorreto se o facto de entrada estiver errado. Por isso, a memória apresenta também factos e fontes, não só fórmulas.
