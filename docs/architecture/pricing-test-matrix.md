# Matriz de teste — Pricing Engine

Ficheiro: `src/lib/__tests__/pricing.test.ts` · **68 testes**, todos a passar.

## Os 20 casos do briefing

| # | Caso | Como é verificado | Estado |
|---|---|---|---|
| 1 | Produto comprado por 10 € | `P = 10 / (1 − 0,40) = 16,67` verificado à mão | ✅ |
| 2 | Produto produzido por 10 € | matéria + mão de obra somam 10 e dão o mesmo preço | ✅ |
| 3 | Custo 5 € com 40% de margem | coberto pelo varrimento de margens 10/25/40/60% | ✅ |
| 4 | Produto com markup | markup 50% → 15 €; margem 50% → 20 €; ida-e-volta exata | ✅ |
| 5 | Comissão percentual | recomputada independentemente como 15% do PVP | ✅ |
| 6 | Comissão fixa + percentual | preço sobe mais do que a soma ingénua, margem mantém-se | ✅ |
| 7 | Portes absorvidos | 14 / 0,6 = 23,33 | ✅ |
| 8 | Desconto | margem e lucro descem; desconto máximo > desconto aplicado | ✅ |
| 9 | Produto com IVA | 12,30 com IVA → custo 10,00 de base | ✅ |
| 10 | Regime de isenção | `t = 0` **e** custo passa a 12,30 — o duplo efeito | ✅ |
| 11 | Venda B2B | retenção > 0, margem **igual** à do B2C | ✅ |
| 12 | Venda B2C | sem retenção; aviso de autoliquidação no caso UE | ✅ |
| 13 | Serviço por hora | horas produtivas < horas trabalhadas; taxa faturável move o preço | ✅ |
| 14 | Projeto fechado | dobrar as horas mais do que duplica o preço | ✅ |
| 15 | Produção própria | 6 + 10 + 0,5 + 2 = 18,50 verificado à mão | ✅ |
| 16 | Marketplace | fração sobre o bruto > 0 e avisos disparados | ✅ |
| 17 | Ponto de equilíbrio | definição: `n × MC ≥ F` e `(n−1) × MC < F` | ✅ |
| 18 | Margem pretendida | varrimento 10/25/40/60% devolve exatamente o pedido | ✅ |
| 19 | Preço máximo do mercado | margem impossível devolve motivo, nunca `NaN` | ✅ |
| 20 | Preço abaixo do custo | aviso `perigo` com a perda quantificada + veredicto | ✅ |

## Invariantes (§12 da especificação de cálculo)

| # | Invariante | Estado |
|---|---|---|
| 1 | `PVP = líquido + IVA` nas 3 regiões × 3 escalões | ✅ |
| 2 | Margem de contribuição ≤ 100% | ✅ |
| 3 | Subir o preço nunca reduz a margem de contribuição | ✅ |
| 4 | Aumentar um custo nunca aumenta o lucro | ✅ |
| 5 | `margemDeMarkup(markupDeMargem(m)) = m` | ✅ |
| 6 | Denominador ≤ 0 devolve falha, não `Infinity` | ✅ |
| 7 | A isenção de IVA aumenta o custo direto | ✅ |
| 8 | SS de serviços ≈ 14,98%; zero acima do teto de 12 × IAS | ✅ |
| 9 | Nenhuma entrada finita produz `NaN` — 16 contextos, todos os campos | ✅ |
| 10 | Desconto de 0% é idêntico a não haver desconto | ✅ |

## Regressões de defeitos encontrados durante a verificação

Estes três não vieram do briefing. Vieram de olhar para o resultado.

| Defeito | Como se manifestava | Teste que o impede de voltar |
|---|---|---|
| **Custo do tempo bruteado duas vezes** | `custoTempoPorUnidade` já vinha dividido por (1 − fração fiscal) e o solver voltava a aplicar a mesma fração. Um TI com 15% de SS e 30% de margem via um preço ~57% acima do devido. | «o custo do tempo NÃO é bruteado duas vezes» — recomputa o preço fora do motor |
| **SS marginal de 24% em zero** | A derivada discreta em `faturação = 0` apanhava a contribuição mínima de 20 €/mês e devolvia-a como taxa marginal. | «sem faturação declarada, a Segurança Social marginal é a da banda normal» |
| **Arredondamento propagado** | O mensal da tabela de cenários vinha de `lucroUnidade` já em cêntimos × volume: 616,30 € na tabela contra 616,00 € no cartão ao lado. | «o cenário recomendado reproduz exatamente o cálculo principal», agora também no mensal |

## Descoberta que virou funcionalidade

A taxa marginal de IRS de um trabalhador independente **não é monótona**. Entre
~12 000 € e ~16 000 € de faturação, a extinção progressiva do mínimo de
existência empurra-a acima de 40% — mais alta do que a de quem fatura 70 000 €.

| Faturação | IRS marginal |
|---:|---:|
| 12 000 € | 16,4% |
| 13 000 € | **45,0%** |
| 14 000 € | 42,1% |
| 16 000 € | 20,0% |
| 20 000 € | 15,9% |
| 70 000 € | 33,5% |

Há um teste que **exige** a não-monotonia (`marginalA > marginalB`), para que
ninguém a «corrija» por parecer errada, e um aviso na interface
(`zona-minimo-existencia`) que diz à pessoa que está nessa faixa.

## Verificação de interface

| Verificação | Ferramenta | Resultado |
|---|---|---|
| `tsc --noEmit` | TypeScript 7 strict | limpo |
| Suite completa | vitest | 2 293 testes, 110 ficheiros |
| Build de produção | `next build` | compila |
| WCAG 2.1 AA | `@axe-core/playwright` | 0 violações na ferramenta e na página |
| Mobile 360 px | Playwright | sem overflow; resultado antes dos campos |
| Modo escuro | Playwright | verificado |

## O que ainda não tem teste

- **Interação do slider e dos botões «e se…»** — os motores estão testados, a
  ligação ao DOM não. Um teste de componente resolvia; ficou de fora desta
  ronda e está registado como risco.
- **Persistência no cofre** — `store/preco.ts` é fino e delega em código já
  testado, mas o caminho «guardar → recarregar → retomar» não tem teste próprio.
