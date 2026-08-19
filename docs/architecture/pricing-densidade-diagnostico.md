# Diagnóstico de densidade — `/ferramentas/calcular-preco`

> **Segunda passagem.** A primeira resolveu arquitetura, confiança do
> resultado, cálculo, avisos e próximos passos. O problema agora é outro e
> está num nível diferente: **a ferramenta ficou rica e essa riqueza
> produz densidade percebida a mais**.
>
> Escrito a 2026-08-19 contra a v2.85.0, com medições feitas num browser a
> sério (`scripts/auditar-densidade-preco.mjs`, `scripts/auditar-a11y-preco.mjs`)
> e não a olho. Onde há um número aqui, ele foi medido.

---

## Como foi medido

Chromium via Playwright, build de produção, popup de Novidades semeado
como visto, consentimento de estatística recusado. Os onze cenários que o
pedido lista, em dois estados: **inicial** (acabou de escolher o cenário)
e **cheio** (fiscalidade, custos fixos, comissões, portes, desperdício,
devoluções, desconto e preço pensado preenchidos).

Conta-se o que está **mesmo visível** — um bloco fechado não pesa no ecrã
de ninguém, e contá-lo dava um número grande e falso.

| Estado | 1280 px | 360 px | 320 px |
|---|---:|---:|---:|
| Inicial — altura da ferramenta | **5,0 ecrãs** | **13,8 ecrãs** | **15,2 ecrãs** |
| Cheio — altura da ferramenta | **7,0–8,3 ecrãs** | **20,6 ecrãs** | **22,5 ecrãs** |
| Inicial — elementos de texto | 314 | 303 | 303 |
| Inicial — palavras | **1 941** | 1 856 | 1 856 |
| Cheio — palavras | 2 607 | 2 859 | 2 859 |
| Inicial — texto < 12 px | **103** | 98 | 98 |
| Cheio — texto < 12 px | 119 | 131 | 131 |
| Secções visíveis | 16 | 15 | 15 |
| Cartões visíveis | 30 → 34 | 30 → 38 | 30 → 38 |
| Aninhamento máximo de cartões | 1 | 1 | 1 |

**Vinte e dois ecrãs de scroll a 320 px** é a medida do problema.

### Um defeito real, já corrigido nesta passagem

A 320/360/390 px havia **+126 px de scroll horizontal**, que a regra 5b do
`CLAUDE.md` proíbe. Causa: os três invólucros da grelha de duas colunas
não tinham `min-w-0`, e um item de grelha tem `min-width: auto` — «não
encolho abaixo do meu conteúdo». A tabela de cenários tem `min-w-[420px]`;
com o `p-5` dos dois lados e as bordas dá 462 px, e em mobile os três
itens partilham **uma** coluna implícita, pelo que esse mínimo esticava a
coluna inteira. O `overflow-x-auto` da tabela não chega: quem tem de
deixar de empurrar é o item da grelha.

Corrigido com `min-w-0` nos três itens e `grid-cols-[minmax(0,1fr)]`
também na base. Verificado a 320, 360, 390 e 430 px: zero overflow.

### Acessibilidade — o que o axe encontrou

O handoff afirmava «zero violações WCAG 2.1 AA». Medido agora em quatro
vistas × cinco estados (seletor, cenário inicial, blocos abertos, preço
impossível, memória aberta):

- **12 violações `color-contrast`**, todas em `.text-brand-dark/70` — a
  linha do prazo dentro do `ResultadoExplicado`. Está nos **dois temas** e
  nas duas larguras. É exatamente o defeito que o comentário do
  `ResultadoPreco` avisa («desemfatizar com COR, nunca com `opacity`») e
  que voltou pela porta do componente partilhado que adotámos;
- **141 alvos abaixo de 24×24 px** (WCAG 2.2 · 2.5.8) — número que a
  investigação seguinte mostrou ser **quase todo falso**, e vale a pena
  registar porquê. A esmagadora maioria é o botão do `InfoTip`, com uma
  caixa de 16×16. Sondado no navegador com `elementFromPoint`, o alvo
  *efetivo* mede 32–36 px: o `before:-inset-2.5` é um pseudo-elemento
  absoluto de inset negativo, e o teste de acerto do ponteiro atribui-o ao
  botão. Ou seja, **passa** o 2.5.8 — quem media era o
  `getBoundingClientRect`, que não vê pseudo-elementos.

  Isto não é um pormenor de contabilidade: «corrigir» os 141 seria pôr
  botões de 24 px em ~30 campos, ~240 px de altura acrescentada numa
  passagem cujo objetivo declarado é reduzir densidade. O alarme falso
  empurrava exatamente para o lado errado.

  Genuínos eram **quatro** links autónomos — «Ver o calendário completo»
  (170×16), o link de fonte da memória (192×20), as fontes legais do
  `ResultadoExplicado` (17–20 px) e a fonte dos avisos (420×17). Nenhum
  cabe na exceção «inline» do 2.5.8: estão sozinhos no seu `<li>`/`<p>`,
  não dentro de uma frase. Já «Diz-nos» e «Ver metodologia» estão no meio
  de uma frase e **estão** cobertos pela exceção — aumentá-los partia o
  ritmo do parágrafo sem ganho nenhum.

  O `scripts/auditar-a11y-preco.mjs` passou a medir área efetiva e a
  aplicar a exceção «inline», e só por isso é que os alvos puderam entrar
  no portão de saída: um alarme que toca 141 vezes nunca fecha nada.
- **uma falha que o axe não vê**: o painel do `InfoTip` abria com o foco de
  teclado mas **não fechava com Escape** — WCAG 2.1 · 1.4.13 «Content on
  Hover or Focus», critério *Dismissible*. Sem isto, quem navega por
  teclado fica com o painel a tapar o campo seguinte até sair do botão. Só
  apareceu ao testar o teclado à mão, como o §18 exige;
- **zero scroll horizontal** depois da correção acima.

---

## A. O que está bom e deve ser preservado

Nada disto se toca. É a identidade da ferramenta e resolve problemas reais.

- **A pergunta de entrada** — «o que queres definir?» antes de «quanto
  custa?». É o produto inteiro, e as quatro famílias funcionam.
- **Os três estados de preenchimento** (`exemplo`/`estimado`/`completo`) e
  o bloco «estamos a assumir». É a coisa mais honesta da ferramenta.
- **A decomposição do PVP que fecha ao cêntimo**, com o IVA marcado como
  não sendo do vendedor.
- **A faixa como escala**, com zonas de prejuízo e sustentável.
- **O diagnóstico de preço impossível** com o teto real e o botão que o
  aplica.
- **A memória de cálculo com proveniência por linha** (lei / preçário /
  estimativa). Não existe noutro sítio do mercado português.
- **Os avisos graves colados ao número.**
- **A conclusão em seis camadas** com fontes, limites e próximo passo.
- **`min-h`/foco/teclado dos átomos**, o `radiogroup` com setas, o
  `aria-describedby` nos campos e a região viva do resultado.

---

## B. Onde existe excesso de densidade

A medição por secção, no estado **inicial** (a pessoa ainda não respondeu
a nada), a 1280 px:

| Secção | Palavras | Altura |
|---|---:|---:|
| Conclusão «O preço que as tuas contas aguentam» | **391** | **1 779 px** |
| Cartão de resultado | 311 | 1 251 px |
| Afinar o preço (12 blocos fechados) | 235 | 978 px |
| Tesouraria «Quando sai o dinheiro» | 216 | 678 px |
| O essencial | 208 | 645 px |
| Estamos a assumir | 131 | 412 px |
| Objetivo invertido | 131 | 608 px |
| Cenários | 110 | 484 px |
| Caixa «Do cliente ao que fica contigo» | 96 | 367 px |
| Notas | 93 | 291 px |
| Experimentar outro preço | 54 | 348 px |
| Resumo fixo · Ver cálculo | 28 | 118 px |
| **TOTAL** | **2 004** | **7 960 px** |

**O diagnóstico numa frase:** de 2 004 palavras iniciais, **1 323 são
aparato analítico** — conclusão, tesouraria, objetivo invertido, cenários,
caixa, slider — sobre um número que a pessoa **ainda não alimentou**.

A ferramenta mostra todo o seu poder de análise a alguém que ainda não
disse quanto lhe custa uma unidade. Não é excesso de conteúdo: é conteúdo
**a aparecer antes de ter pergunta**.

---

## C. Onde existe texto demasiado pequeno

103 elementos abaixo de 12 px no estado inicial; 26 abaixo de 11 px.

| Origem | Ocorrências | Nota |
|---|---:|---|
| `descricao` dos campos (`text-[11px]`) | ~30 | Adicionada na 1.ª passagem por acessibilidade. Certa em intenção, errada em peso: um parágrafo por campo triplica o ritmo vertical. |
| Notas das secções (`text-[11px]`) | ~25 | Tesouraria, caixa, sociedade, cenários. |
| Rótulos de métrica (`text-[11px] uppercase`) | ~16 | Quatro por cartão de métricas, três cartões. |
| Legendas da decomposição e da faixa | ~14 | |
| Selos e emblemas (`text-[10px]`) | ~10 | «valores de exemplo», «estimativa». |
| Rodapés de fonte (`text-[11px]`) | ~8 | |

**A causa não é a escala tipográfica.** É haver informação a mais em
simultâneo, e a resposta ter sido encolher a letra para caber. Aumentar
tudo sem tirar nada só faz uma página mais longa — que é o que o §24
proíbe.

---

## D. Onde existe informação repetida

| Repetição | Onde | Custo |
|---|---|---|
| **O preço aparece 4×** | resumo fixo, cartão, slider, conclusão | Quatro números iguais competem; nenhum ganha. |
| **Margem e markup, 3×** | métricas do cartão, tradução no essencial, conclusão | |
| **A faixa, 2×** | escala no cartão + cenários da conclusão | Os mesmos quatro valores, dois formatos. |
| **«É uma estimativa», 4×** | selo do resumo, eyebrow do cartão, «estamos a assumir», nota de confiança da conclusão | A ressalva perde força ao ser repetida. |
| **Custos por venda, 2×** | decomposição do cartão + caixa | Ângulos diferentes, sobreposição grande. |
| **A explicação margem/markup** | tradução no essencial **e** secção editorial abaixo | 3 linhas antes de haver preço. |
| **Ponto de equilíbrio, 2×** | métrica do cartão + célula do slider | |

---

## E. Que componentes aparecem cedo demais

Ordenados pelo que custam a quem ainda não decidiu nada:

1. **Conclusão em seis camadas** (391 palavras) — responde «como chegámos
   aqui / o que fazer / fontes / limites / próximo passo» a quem ainda não
   tem um «aqui».
2. **Tesouraria** (216) — «quando é que isto sai da conta» sobre um preço
   de exemplo.
3. **Objetivo invertido** (131) — uma segunda ferramenta, sempre aberta.
4. **Cenários** (110) — comparar variações de um número que ainda não é
   dela.
5. **Caixa** (96) — o percurso do dinheiro de uma venda que não existe.
6. **Slider** (54) — afinar antes de haver o que afinar.
7. **Os 12 blocos de «Afinar»** (235) — a lista inteira, incluindo os que
   o cenário torna irrelevantes.

---

## F. Que informação poderia aparecer condicionalmente

A regra que proponho, e que substitui «tudo aparece sempre»:

> **Uma secção aparece quando a pergunta que ela responde já é a pergunta
> da pessoa.**

| Secção | Gatilho |
|---|---|
| Cartão de preço | sempre — é o produto |
| Estamos a assumir | há campos essenciais por responder |
| Avisos graves | o motor os emite |
| Afinar (checklist) | sempre, mas só os blocos que o cenário usa |
| Slider | o essencial respondido (`completo`) |
| Cenários | `completo` |
| Desconto | a pessoa disse que vai fazer promoções |
| Tesouraria | é trabalhador independente **e** `completo` |
| Caixa | há retenção ou comissões — senão é igual à decomposição |
| Sociedade | vende como empresa |
| Objetivo invertido | pedido explícito («começar pelo fim») |
| Conclusão / fontes / limites | `completo`, ou a pedido |
| Memória de cálculo | a pedido (já é assim) |

---

## G. Quais visualizações devem ser criadas

Cada uma tem de responder a uma pergunta **e** permitir tirar texto —
§24. Não há gráficos decorativos nesta lista.

| # | Visualização | Pergunta | Texto que substitui |
|---|---|---|---|
| **1** | **Ponte custo → PVP** (waterfall) | «Porque é que 12 € de custo viram 26 €?» | A primeira leitura da memória de cálculo e a explicação margem/markup do essencial |
| **2** | Decomposição do PVP (stacked, **já existe**) | «Para onde vai cada euro?» | — mantém-se |
| **3** | **Equilíbrio como régua** | «Quantas vendas até deixar de perder?» | A nota de break-even e a métrica solta |
| **4** | **Impacto ao adicionar um bloco** | «O que é que isto mudou?» | Parágrafos de causalidade |
| **5** | **Cenários: tabela + barras** | «Qual destes preços escolho?» | A tabela crua atual |
| **6** | Margem × preço (no slider) | «Onde é que isto deixa de compensar?» | As quatro células numéricas |

A investigação é clara na divisão: **waterfall para causalidade
sequencial, stacked para composição proporcional**. Por isso a #1 e a #2
não são a mesma coisa duas vezes — respondem a perguntas diferentes.

**Sankey fica de fora.** Para 6–8 fluxos sem ramificação real é mais
difícil de ler do que um waterfall, e mais caro de tornar acessível.

---

## H. Que padrões existentes do ReciboCerto serão reutilizados

Levantados no repositório. **Não se cria uma segunda linguagem visual.**

| Padrão | Ficheiro | Uso |
|---|---|---|
| Gráfico com tabela equivalente | `dashboard/ReceitaChart.tsx` | `role="img"` + `aria-label` + `aria-describedby` → `<table>`. **É o contrato de acessibilidade dos gráficos**, e já existe. |
| Barra até um limiar | `dashboard/IvaProgresso.tsx` | `role="progressbar"` + marcadores → régua do equilíbrio |
| Donut SVG | `dashboard/DistribuicaoDonut.tsx` | `strokeDasharray`, cor por `currentColor` |
| Folha inferior / modal | `overlays/SuperficieModal.tsx` | Contrato completo: foco, `inert`, scroll. Para os drawers de profundidade |
| Catálogo adicionar/remover | `contabilistas/EditorBlocos.tsx` | `tiposDisponiveis` + `+ Acrescentar` + `Trash`. **A linguagem nativa do «adicionar bloco»** |
| Lista editável | `precos/ListaCustos.tsx` | Já em uso |
| Esqueletos | `ui/ChartSkeleton.tsx`, `ui/DonutSkeleton.tsx` | |
| Átomos | `precos/atomos.tsx` | `Campo`, `Segmentado`, `Bloco`, `Seletor` |
| `Badge`, `InfoTip`, `Icons` | `ui/` | |

Nenhuma biblioteca de gráficos. SVG e CSS, como o resto do site — §27.

---

## I. Nova arquitetura da jornada

Três camadas de profundidade (a investigação diz que 2–3 é o intervalo
útil), e uma regra de revelação.

```
CAMADA 1 · DECIDIR        sempre visível, ~1 ecrã
  cenário · o essencial · o preço com faixa · o que falta responder

CAMADA 2 · COMPREENDER    aparece quando a pergunta é dela
  para onde vai cada euro · ponte custo→PVP · equilíbrio ·
  afinar (só os blocos do cenário) · e se… · cenários

CAMADA 3 · AUDITAR        a pedido, em gaveta
  memória de cálculo · fontes e limites · tesouraria · caixa ·
  sociedade · objetivo invertido · conclusão completa
```

O que muda em relação a hoje **não é o conteúdo**: é que a camada 2 deixa
de estar aberta de origem e a camada 3 deixa de estar na página.

**E o «adicionar» é uma conversa, não um form builder** (§13). A pergunta
é «Tens outros custos nesta venda?» com sugestões contextuais ao cenário —
quem vende consultoria não vê embalagem, quem vende bolos vê matérias e
desperdício. Ao adicionar, o bloco nasce, o preço reage e a ferramenta diz
**quanto** mudou.

---

## J. Wireframe textual — desktop (≥1024 px)

```
┌─ Estás a calcular: um produto para revender      [recomeçar] [mudar] ─┐

┌───────────────────────────── COLUNA ESQUERDA ─┬─ COLUNA DIREITA ─────┐
│ O ESSENCIAL                                   │ ▸ 24,60 € com IVA    │  ← resumo fixo 56px
│  custo · inclui IVA? · margem · volume        │   margem 32% · 5,42 €│
│                                               │                      │
│ ── O que falta ─────────────────              │ ┌─ O TEU PREÇO ────┐ │
│  ▸ 2 respostas assumidas por ti  [resolver]   │ │  24,60 €         │ │
│                                               │ │  ├──┼────┼───┤   │ │  ← faixa como escala
│ ── Afinar (só o que este cenário usa) ──      │ │  piso min rec conf│ │
│  ▸ Contas fixas      por preencher   +preço   │ │                  │ │
│  ▸ Comissões         Worten · 15%    −margem  │ │  para onde vai   │ │  ← stacked (existe)
│  ▸ Devoluções        por preencher            │ │  cada euro       │ │
│  + Tens outros custos? [embalagem][portes]…   │ └──────────────────┘ │
│                                               │                      │
│                                               │ ⚠ avisos graves      │
│                                               │                      │
│                                               │ [Ver cálculo ▾]      │  ← camada 3, fechada
│                                               │ [Como cheguei aqui ▾]│
│                                               │ [Fontes e limites ▾] │
│                                               │                      │
│                                               │ ── quando completo ──│
│                                               │ ponte custo→PVP      │
│                                               │ equilíbrio (régua)   │
│                                               │ e se cobrasses…      │
│                                               │ cenários             │
│                                               │ [guardar] [copiar]   │
└───────────────────────────────────────────────┴──────────────────────┘
```

## K. Wireframe textual — mobile (320–430 px)

```
┌──────────────────────────────┐
│ ‹ um produto para revender   │   ← 1 linha, não 3
├──────────────────────────────┤
│  24,60 €  com IVA            │   ← barra fixa 56px, sempre à vista
│  margem 32% · fica-te 5,42 € │
├──────────────────────────────┤
│ O ESSENCIAL                  │
│  [custo        ] €           │   ← ajuda em InfoTip, não em parágrafo
│  ( Com IVA )( Sem IVA )      │
│  [margem       ] %           │
│  [volume       ] /mês        │
├──────────────────────────────┤
│ ▸ Faltam 2 respostas         │   ← 1 linha; abre folha inferior
├──────────────────────────────┤
│ O TEU PREÇO                  │
│   24,60 €                    │
│   ├───┼─────┼────┤           │
│   para onde vai cada euro    │
├──────────────────────────────┤
│ AFINAR                       │
│ ▸ Contas fixas    por preench│
│ ▸ Comissões       Worten 15% │
│ + Outros custos?             │
├──────────────────────────────┤
│ [Ver cálculo ▾]              │   ← camada 3 em folha inferior
│ [Fontes e limites ▾]         │
└──────────────────────────────┘
      ~4 ecrãs, não 14
```

---

## L. Matriz — onde vive cada informação

| Informação | Atual | Nova posição | Quando aparece | Formato |
|---|---|---|---|---|
| Preço (PVP + sem IVA) | 4 sítios | resumo fixo + cartão | sempre | número + faixa |
| Faixa de âncoras | cartão + conclusão | só cartão | sempre | escala |
| Decomposição do PVP | cartão | cartão | sempre | stacked (existe) |
| Ponte custo → PVP | inexistente | cartão | `completo` | **waterfall novo** |
| Margem / markup | 3 sítios | resumo + `InfoTip` | sempre / a pedido | número |
| Ponto de equilíbrio | métrica + slider | camada 2 | `completo` | **régua nova** |
| Estamos a assumir | secção aberta | 1 linha + folha | há campos por responder | lista acionável |
| Avisos graves | secção aberta | junto ao número | motor emite | inalterado |
| Notas (info) | secção aberta | dentro de «fontes e limites» | a pedido | lista |
| Blocos de afinar | 12, todos | só os do cenário | sempre | checklist |
| Impacto ao adicionar | inexistente | junto ao bloco | ao adicionar | **delta novo** |
| Slider | aberto | camada 2 | `completo` | inalterado + curva |
| Cenários | tabela aberta | camada 2 | `completo` | tabela + barras |
| Objetivo invertido | aberto | camada 3 | a pedido | inalterado |
| Tesouraria | aberta | camada 3 | TI + `completo` | inalterado |
| Caixa | aberta | camada 3 | há retenção/comissões | inalterado |
| Sociedade | aberta | camada 3 | é empresa | inalterado |
| Desconto | bloco + resultado | camada 2 | pediu promoções | inalterado |
| Memória de cálculo | fechada | camada 3 | a pedido | inalterado |
| Conclusão 6 camadas | aberta, 391 palavras | camada 3 | `completo` ou a pedido | inalterado |
| Guardar/copiar/imprimir | dentro da conclusão | rodapé da coluna | `completo` | inalterado |

## M. Matriz — o que acontece a cada componente

| Componente atual | Manter | Refatorar | Fundir | Progressive disclosure | Remover |
|---|:--:|:--:|:--:|:--:|:--:|
| `SimuladorPreco` | | ✔ orquestra camadas | | | |
| `CamposEssenciais` | | ✔ ajuda para `InfoTip` | | | |
| `Afinar` | | ✔ filtra por cenário | | ✔ | |
| `ResultadoPreco` | | ✔ + ponte, − métricas | | | |
| `ResumoPreco` | ✔ | | | | |
| `Pressupostos` | | ✔ 1 linha + folha | | ✔ | |
| `SliderPreco` | ✔ | | | ✔ `completo` | |
| `Cenarios` | | ✔ + barras | | ✔ `completo` | |
| `ObjetivoInvertido` | ✔ | | | ✔ a pedido | |
| `Tesouraria` | ✔ | | | ✔ camada 3 | |
| `Caixa` | ✔ | | | ✔ camada 3 | |
| `Sociedade` | ✔ | | | ✔ camada 3 | |
| `DescontoResultado` | ✔ | | | ✔ se há promoção | |
| `MemoriaCalculo` | ✔ | | | ✔ já é | |
| `ConclusaoPreco` | | ✔ contraste | | ✔ camada 3 | |
| `Decidir` | | | ✔ com conclusão | ✔ `completo` | |
| `Avisos` | ✔ | | | | |
| `atomos.Bloco` | | ✔ + impacto | | | |
| `atomos.Campo` | | ✔ ajuda compacta | | | |
| `InfoTip` (global) | | ✔ 24×24 | | | |

**Nada é removido.** Tudo o que existe hoje continua a existir; muda
quando aparece.

---

## Plano de execução

| Fase | O que | Verificação |
|---|---|---|
| **0** ✅ | Correções medidas: overflow, contraste `/70`, 4 links < 24 px, Escape no `InfoTip` | axe = 0 · alvos = 0 · overflow = 0 |
| **1** ✅ | Camadas de revelação: `nivel.ts` na engine + orquestração | 10 testes de nível |
| **2** ✅ | Partição de «Afinar»: só o que já interessa + fichas para o resto | 8 testes de partição |
| **3** ✅ | Cenários em barras divergentes e régua do equilíbrio | 9 testes; tabela equivalente em cada |
| **4** ✅ | Microcopy, e nada de análise sobre um número que não é de ninguém | 909 → 786 palavras |
| **5** ✅ | §25: a fronteira entre a ferramenta e a leitura; dois defeitos a 320 px | 0 transbordos |
| **6** ✅ | QA em loop: densidade + axe + teclado + escuro | `auditar-teclado-preco.mjs` |

### O que a Fase 6 encontrou depois de o axe dar zero

O §18 pede testes manuais além do axe, e teve razão duas vezes:

1. o painel do `InfoTip` abria com o foco de teclado e **não fechava com
   Escape** (WCAG 1.4.13, *Dismissible*);
2. recolher uma secção **atirava o foco para o `<body>`** — recolhida e
   aberta são árvores diferentes, o elemento focado é desmontado, e quem
   navega por teclado ia parar ao topo do documento a meio da ferramenta.

Nenhuma das duas produz uma violação de axe. Ambas estão corrigidas, e o
`scripts/auditar-teclado-preco.mjs` existe para que voltem a ser
apanhadas se regressarem.

### Metas, para não se declarar vitória sem medir

| Métrica | Antes | Meta | **Medido no fim** |
|---|---:|---:|---:|
| Ecrãs a 360 px, inicial | 13,8 | ≤ 5 | **5,5** ⚠️ |
| Ecrãs a 360 px, cheio | 20,6 | ≤ 12 | **13,8** ⚠️ |
| Palavras iniciais | 1 941 | ≤ 900 | **786** ✅ |
| Texto < 12 px, inicial | 103 | ≤ 40 | **33** ✅ |
| Violações axe | 12 | 0 | **0** ✅ |
| Alvos < 24 px (área efetiva, fora da exceção «inline») | 4 | 0 | **0** ✅ |
| Scroll horizontal | +126 px | 0 | **0** ✅ |
| Texto a transbordar da sua caixa | 1 | 0 | **0** ✅ |
| Falhas de teclado | 2 | 0 | **0** ✅ |
| Capacidade (secções disponíveis) | 16 | ≥ 16 | **17** ✅ |

### As duas metas que não foram atingidas, e porquê

Ambas as que faltam são de ALTURA, e em ambas a distância que resta só se
fechava a cortar coisas — que é precisamente o que o §23 proíbe.

**Inicial: 5,5 ecrãs contra os 5 propostos.** O que sobra em altura no
estado `exemplo` são as notas por fatia da decomposição («o IVA não é
teu: entras com ele e entregas») e a lista de pressupostos com o *porquê*
de cada um. São ~90 palavras de conteúdo educativo, no momento em que a
pessoa mais precisa dele — quem abre a ferramenta pela primeira vez é
quem menos sabe o que é uma margem de contribuição. Cortá-las dava os 5
ecrãs e tirava à ferramenta aquilo que a distingue de uma folha de
cálculo.

**Cheio: 13,8 ecrãs contra os 12 propostos.** No estado `completo` abrem
sete secções com os números reais da pessoa, e a maior é a
`ConclusaoPreco` (~1 780 px). Fechá-la por omissão dava os 12 — mas
`ConclusaoPreco` é onde vive o routing comercial (`escolherRota()`) e o
próximo passo. Recolhê-lo é uma decisão de negócio, não de densidade, e
não é minha: fica registada aqui como a alavanca disponível se o
utilizador a quiser puxar.

O cenário `servico` é o pior caso do estado cheio, a 19,6 ecrãs, por ter
o bloco do tempo e mais avisos do motor. É o candidato natural a uma
próxima passagem.

A última linha é a que importa mais: **a informação disponível não pode
diminuir**. O que diminui é a que está visível ao mesmo tempo.
