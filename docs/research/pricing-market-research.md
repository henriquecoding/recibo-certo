# Pesquisa de mercado — precificação em Portugal

Consultado a 2026-08-18. As fontes com URL e nível de confiança estão em
`pricing-sources.md`; aqui está o que a pesquisa **concluiu**.

## 1. A conclusão que mudou a arquitetura

Comecei a pesquisa a assumir que o problema era de interface: existem
calculadoras, faltava uma boa. Ao fim de meia dúzia de fontes ficou claro que o
problema é de **jurisdição**.

Quase todo o conteúdo em português sobre formação de preço é brasileiro. A
matemática de margem e markup transfere-se; o resto não. E o resto, em Portugal,
é onde está o dinheiro:

- **O IVA muda com a região.** 23% no Continente, 22% na Madeira, 16% nos
  Açores. Uma calculadora com «23%» escrito no código está errada para 5% da
  população e para todo o turismo insular.
- **A isenção do Art. 53.º corta nos dois sentidos.** Não liquidar IVA parece
  uma vantagem; não o deduzir nas compras é uma desvantagem que quase ninguém
  contabiliza. Para um revendedor com margem de 30%, o efeito líquido pode ser
  negativo.
- **A Segurança Social incide sobre a faturação, não sobre o lucro.** 21,4% ×
  70% da prestação de serviços ≈ 14,98% de cada euro faturado. Isto é um custo
  variável, e nenhuma ferramenta o trata como tal.
- **No regime simplificado, os custos não abatem ao IRS.** O coeficiente do
  Art. 31.º presume as despesas. Comprar melhor dá margem, não dá menos imposto
  — o inverso do que o conteúdo brasileiro ensina.
- **A retenção na fonte não é um custo.** É adiantamento de IRS. Trata-la como
  custo leva quem factura a empresas a pedir mais 23% sem razão.

Nenhuma destas cinco aparece em nenhuma calculadora de preço que encontrei, em
português ou em inglês.

## 2. Quem vende e por onde

Os canais com operação relevante em Portugal, e o que cobram:

| Canal | Mensalidade | Comissão | Nota |
|---|---|---|---|
| Amazon (ES) | 39 €/mês | 5–22% | FBA acresce 2,70–5,90 €/unidade |
| Worten | — | 8–18% | forte em eletrónica e casa |
| Fnac PT | — | 6–19% | cultura, tecnologia |
| KuantoKusta | — | 3–15% + CPC | híbrido comissão/clique |
| El Corte Inglés | — | 10–25% | posicionamento premium |
| OLX | — | 0–10% | C2C, destaques pagos |
| Loja própria | custo do software | 0% | mas paga aquisição de tráfego |

**O ponto que a tabela não mostra e que a engine mostra:** estas percentagens
incidem sobre o valor **total da encomenda, com IVA**. Uma comissão de 15%
custa 18,45% do que fica ao vendedor. Numa margem de 30%, são 11 pontos
percentuais que desaparecem sem ninguém dar por isso.

## 3. Receber o dinheiro também custa

Preçário Stripe para Portugal (o mais transparente do mercado, e por isso o
usado como referência editável):

- Cartão europeu: 1,5% + 0,25 €
- Cartão europeu premium: 2,8% + 0,25 €
- Cartão internacional: 3,15% + 0,25 € (+2% se houver conversão)
- MB WAY: 1,5% + 0,25 €
- Presencial: 1,4% + 0,10 €
- Litígio: 20 € por contestação recebida

A **taxa fixa** é o que estrangula produtos baratos: 0,25 € num produto de 5 €
são 5% do preço. É a razão pela qual a engine separa euros fixos de percentagens
em vez de somar tudo numa taxa média.

## 4. O que a lei portuguesa impõe depois de o preço estar decidido

Esta camada não existe em nenhuma calculadora e é a que evita coimas.

- **Preço ao consumidor com impostos incluídos**, em dígitos visíveis e
  inequívocos (DL 138/90, fiscalizado pela ASAE).
- **Preço por unidade de medida** obrigatório em produtos a granel ou por
  quantidade.
- **Reduções de preço**: o preço de referência é o mais baixo praticado nos
  **30 dias** anteriores, incluindo promoções nesse período. Saldos: máximo
  124 dias por ano e comunicação à ASAE com 5 dias úteis de antecedência.
- **Devoluções**: 14 dias de livre resolução nas vendas à distância, e o
  vendedor reembolsa os **portes de entrega originais** — o que torna cada
  devolução mais cara do que o custo de recolha.
- **Vendas à distância na UE**: acima de 10 000 €/ano o IVA passa a ser o do
  país de destino, o que muda o PVP em cada mercado.

## 5. Custo do trabalho

- Retribuição mínima mensal garantida 2026: **920 €** (14 meses).
- IAS 2026: **537,13 €** — base do teto e do mínimo da Segurança Social.

Para o valor/hora, o pressuposto que mais pesa não é fiscal: é a **fração de
horas faturáveis**. Ninguém factura as 40 horas que trabalha. Entre propostas,
prospeção, administração, deslocações, formação e pós-venda, a literatura de
serviços profissionais aponta 55–70%. A engine usa 0,60 por omissão e diz que é
um pressuposto editável — porque é.

## 6. Oportunidade de produto

O Recibo Certo tem três coisas que nenhum concorrente tem juntas:

1. **A camada fiscal já verificada** (`fiscal-data.ts`, com base legal e data de
   verificação em cada valor).
2. **Uma audiência que já é exatamente o público desta ferramenta** —
   trabalhadores independentes e micro-negócios portugueses.
3. **Uma disciplina de proveniência** que permite dizer «esta linha é lei, esta
   é um preçário de terceiro, esta é um pressuposto teu» — que é a diferença
   entre uma ferramenta credível e um gerador de expectativas.

O que falta ao mercado não é uma calculadora melhor. É uma que saiba em que país
está.

## 7. O que a pesquisa não conseguiu responder

- **Preços de mercado por categoria.** Não há fonte pública fiável e atualizada
  sobre quanto custa um bolo em Braga ou uma hora de design em Lisboa. A
  arquitetura fica preparada para um módulo de comparação; o módulo diz «não
  temos dados suficientes» até que haja dados.
- **Volumes de pesquisa verificados para pt-PT.** O mapa de intenção é
  estrutural, não quantitativo, e está assumido como tal.
- **Ecovalor por material de embalagem.** Existe, é por material e por peso, e
  modelá-lo exigiria uma estrutura de embalagem que ultrapassa esta versão.
