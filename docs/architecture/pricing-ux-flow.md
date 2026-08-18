# Fluxo UX — Pricing Engine

## A decisão que governa todas as outras

Não se pergunta o custo antes de saber **o que a pessoa está a vender**.

«Um bolo por encomenda» e «um produto para revender no Amazon» são problemas
diferentes. Perguntar «qual é o custo unitário?» antes de saber qual deles é
obriga a pessoa a traduzir a sua vida para o vocabulário da ferramenta. A
inversão é o produto inteiro: é a ferramenta que se adapta.

## Os quatro níveis

```
Nível 1 — cenário          uma pergunta, onze respostas possíveis
Nível 2 — modo rápido      no máximo 5 campos → resultado imediato
Nível 3 — modo preciso     blocos dobráveis, um por família de custos
Nível 4 — simulação        slider, cenários, «e se…», objetivo invertido
```

Não há botão «calcular». O resultado existe desde o primeiro segundo e vai-se
afinando. É o que transforma o preenchimento de um formulário numa conversa.

## Nível 1 — «O que queres definir?»

Onze cartões, cada um com um exemplo concreto:

| Cenário | Exemplo que o torna reconhecível |
|---|---|
| Produto para revender | Roupa, acessórios, eletrónica |
| Produto que faço eu | Artesanato, bolos, cosmética, mobiliário |
| Produto digital | Ebook, curso, template, licença |
| Serviço | Consultoria, design, limpeza, fotografia |
| Preço por hora | Explicações, aulas, assistência |
| Projeto com preço fechado | Um site, uma obra, uma campanha |
| Encomenda por medida | Bolo de aniversário, peça personalizada |
| Loja online | Shopify, WooCommerce, site próprio |
| Marketplace | Amazon, Worten, Fnac, OLX |
| Sei quanto quero ganhar | «Quero 2 000 €/mês — o que cobro?» |
| Ainda não tenho a certeza | Começa pelo mais simples |

O exemplo não é decoração: é o que faz a pessoa reconhecer-se. «Produto físico»
é uma categoria; «bolo de aniversário» é a vida dela.

## Nível 2 — o modo rápido

Regra dura: **no máximo cinco campos** antes do primeiro resultado. O que não
couber tem valor por omissão declarado e visível, e o resultado diz o que
assumiu.

Cada cenário declara os seus campos em `pricing/perguntas.ts` — dados, não `if`.
Um cenário novo entra lá e a interface segue-o.

## Nível 3 — o modo preciso

Blocos dobráveis, fechados por omissão, um por família:

1. **O teu enquadramento fiscal** — o que mais muda o preço em Portugal
2. **Contas que pagas mesmo sem vender** — custos fixos
3. **Custos que só existem quando vendes** — variáveis, desperdício, portes
4. **Comissões e meios de pagamento**
5. **Devoluções**
6. **As tuas horas a sério** (serviços)
7. **Como produzes** (produção própria)
8. **Custo de trazer o cliente** (CAC)
9. **Desconto ou promoção**
10. **Já tinhas um preço em mente?**

O título de cada bloco é a pergunta, não a categoria contabilística. «Contas que
pagas mesmo sem vender» ensina o conceito de custo fixo sem usar a expressão.

## Nível 4 — a simulação

- **Slider de preço** — margem, lucro, lucro mensal e break-even movem-se ao
  mesmo tempo. Marca visualmente quando se passa abaixo do piso.
- **Comparar cenários** — conservador / recomendado / ambicioso, mais os botões
  «e se eu…» que acrescentam uma variação.
- **Objetivo invertido** — «quero ganhar X» e «consigo cobrar Y».

## Mobile

O resultado vem **primeiro** (`order-1`), os campos a seguir. Em desktop
inverte-se e o resultado fica fixo (`lg:sticky`). Não é uma versão reduzida do
desktop: em mobile a pessoa quer o número, e o número aparece antes do
formulário.

Todos os alvos ≥ 36 px. A tabela de cenários transborda com scroll horizontal
alcançável por teclado (`tabIndex` + `role="region"` com nome).

## O que a interface nunca faz

- **Não substitui o preço recomendado por um preço psicológico.** As terminações
  comerciais vivem numa coluna à parte, com o custo em margem calculado.
- **Não esconde que está a perder dinheiro.** Um preço abaixo do piso traz um
  aviso vermelho com o valor exato da perda por venda.
- **Não apresenta um número sem faixa.** Dois decimais sozinhos são falsa
  precisão sobre dados que a pessoa estimou de cabeça.
- **Não chama inteligência artificial a uma sequência de contas.** As
  recomendações explicam-se («o preço subiu porque acrescentaste 15% de
  comissão»), não se anunciam.
- **Não pede conta, email nem registo.** O contexto fica no cofre local do
  dispositivo.

## Medição

Usa o dicionário de eventos que já existe (`analytics/eventos.ts`):
`simulator_start`, `simulator_step`, `simulator_complete`, `result_view`. O
briefing pedia eventos `pricing_*` próprios; criar um segundo dicionário
paralelo seria o mesmo defeito que o catálogo de ferramentas corrigiu. A
barreira de PII do módulo aplica-se automaticamente.
