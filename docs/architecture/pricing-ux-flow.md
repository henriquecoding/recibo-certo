# Fluxo UX — Pricing Engine

> Reescrito a 2026-08-19 (v2.85.0). A versão anterior descrevia um nível 4
> que não existia, uma medição que não disparava e um modo preciso que não
> dizia o que tinha lá dentro. Este documento descreve o que está no ecrã.
> O diagnóstico que levou à reestruturação está em `pricing-ux-restructure.md`.

## A decisão que governa todas as outras

Não se pergunta o custo antes de saber **o que a pessoa está a vender**.

«Um bolo por encomenda» e «um produto para revender no Amazon» são problemas
diferentes. Perguntar «qual é o custo unitário?» antes de saber qual deles é
obriga a pessoa a traduzir a sua vida para o vocabulário da ferramenta. A
inversão é o produto inteiro: é a ferramenta que se adapta.

## Três zonas que nunca trocam de sítio

```
DEFINIR                    PREÇO                      DECIDIR
cenário                    resumo fixo (56 px)        conclusão (6 camadas)
o essencial (≤5 campos)    cartão de preço            guardar · copiar · imprimir
afinar (checklist)         avisos graves              comparar · próximo passo
memória de cálculo         pressupostos assumidos
                           desconto · caixa
                           tesouraria · sociedade
                           experimentar · objetivo
                           invertido · cenários
```

Em mobile é uma coluna, pela ordem do DOM: **essencial → resultado → afinar**.
Em `lg:` a grelha reposiciona as mesmas caixas em duas colunas sem trocar a
leitura por teclado nem por leitor de ecrã.

---

## Nível 1 — «O que queres definir?»

Doze cenários, agrupados em quatro famílias — vendo uma coisa / vendo o meu
tempo / vendo através de um canal / sei o que quero ganhar — mais uma saída
explicada para quem não se reconhece em nenhum.

O agrupamento não reduz as opções; reduz quantas é preciso comparar de cada
vez. Cada cartão traz um exemplo concreto («bolo de aniversário», não «produto
físico») e diz quantas perguntas faltam até ao primeiro preço.

## Nível 2 — o essencial

Regra dura: **no máximo cinco campos** antes do primeiro resultado. Cada
cenário declara os seus em `pricing/perguntas.ts` — dados, não `if`.

Cada campo tem `descricao` visível e ligada por `aria-describedby` (o que evita
o erro) e, quando há detalhe legal, um `InfoTip` (a base legal). A ajuda que
evita o erro nunca vive só atrás de um clique.

## Nível 3 — afinar

Os blocos do modo preciso são uma **checklist**, não dez caixas anónimas. Cada
linha diz, antes de se abrir:

| | |
|---|---|
| estado | «3 contas · 320,00 €/mês» ou «por preencher» |
| impacto | «muda o preço mínimo e o equilíbrio» |
| urgência | destacada quando um aviso do motor a aponta como em falta |

A ordem base é a que o cenário declara; o que está em falta sobe ao topo.
Tudo vem de `pricing/blocos.ts`. Cada bloco tem «repor», cirúrgico: devolve os
campos dele — e só esses — aos valores de partida do cenário.

## Nível 4 — experimentar

- **Slider de preço** — margem, lucro por venda, lucro mensal e break-even
  movem-se ao mesmo tempo. Marca quando se passa abaixo do piso.
- **Objetivo invertido** — «quero ganhar X por mês, o que cobro?» e «consigo
  cobrar Y, quantas vendo?». Usa `motores/objetivo.ts`.
- **Comparar cenários** — conservador / recomendado / ambicioso, mais os
  botões «e se eu…».

---

## O estado de preenchimento

O que distingue esta ferramenta de uma calculadora: ela sabe o que **não**
sabe.

`pricing/preenchimento.ts` mantém o conjunto de campos que a pessoa respondeu
mesmo — não «tem um valor», que todos têm desde o primeiro segundo. Daí saem
três estados:

| | |
|---|---|
| `exemplo` | ninguém tocou em nada; o número é do cenário |
| `estimado` | falta parte do essencial, **e diz-se o quê** |
| `completo` | o essencial está respondido; o número é dela |

É o mesmo `estimado`/`completo` que `simulator_complete` e `escolherRota()`
esperam, e é o que impede uma rota comercial de abrir sobre um número que
ninguém alimentou.

O bloco **«estamos a assumir»** lista cada campo em falta com o valor que está
a ser usado, porque é que ele muda o preço, e um salto para o corrigir.

---

## O resultado

**Resumo fixo (56 px)** — o único elemento pegajoso da página. O cartão tem
~830 px e não pode sê-lo; a conclusão certa não era «o número pode sair do
ecrã», era que o que fica fixo tem de ser pequeno.

**Cartão de preço** — o número, a faixa como **escala** (com as zonas de
prejuízo e sustentável e o preço recomendado marcado), a decomposição do PVP e
as quatro métricas.

**Secções irmãs**, cada uma só quando tem o que dizer: efeito do desconto,
percurso do dinheiro (`caixa`), calendário de tesouraria, conversão para
sociedade.

**Conclusão** — `ResultadoExplicado`, com as seis camadas: como chegámos aqui,
o que fazer, cenários, as ações locais, fontes e **limites**, e o próximo
passo escolhido por `escolherRota()`.

### Quando não há preço possível

Um diagnóstico, nunca uma parede: para onde vai cada euro (com as comissões
sobre o bruto convertidas para fração do líquido, que é onde a margem se mede),
qual é o teto real, e um botão que aplica a margem máxima que resolve.

---

## Mobile

O resultado vem antes dos campos avançados, na ordem do DOM. Todos os alvos
≥ 36 px. As tabelas transbordam com scroll horizontal alcançável por teclado
(`tabIndex` + `role="region"` com nome).

## O que a interface nunca faz

- **Não substitui o preço recomendado por um preço psicológico.** As
  terminações comerciais vivem à parte, com o custo em margem calculado — e
  adotar uma é uma escolha explícita.
- **Não esconde que está a perder dinheiro.** A barra fica maior do que o
  preço e o aviso `perigo` nasce colado ao número.
- **Não apresenta um número sem faixa.** O cabeçalho da conclusão é um
  intervalo.
- **Não chama inteligência artificial a uma sequência de contas.**
- **Não pede conta, email nem registo.** Guardar, copiar e imprimir acontecem
  no dispositivo. Não há «partilhar por link»: encodar o contexto na URL punha
  custos de fornecedor no histórico do browser.

## Medição

`simulator_start` (entrada), `simulator_step` (cada campo respondido pela
primeira vez), `simulator_complete` (o essencial todo respondido) e
`result_view` (primeira vista de um número que não é exemplo). Mais
`result_save` e `result_export`.

Nenhum valor sai — mede-se a forma do percurso, nunca o negócio de quem o
percorre, e há um teste que reprova qualquer «pvp», «margem» ou «custo» no
payload.

As outras catorze ferramentas são medidas pelo `ToolShell`, via
`MedidorFerramenta`. Esta mede-se a si própria porque sabe uma definição
melhor de «concluído», e passa `medir={false}` para não contar duas vezes.
