# Roteiro de animação — o palco do preço (`/?foco=preco`)

> Este documento é a **fonte de verdade da coreografia**. O componente
> (`src/components/preco/HeroPreco.tsx`) implementa-o; `coreografia.ts` guarda
> os tempos e as curvas. Se o código e este roteiro discordarem, um dos dois
> está errado — decide-se qual, não se «harmoniza».

---

## 0. O problema que este roteiro resolve

A primeira versão desta animação não era uma coreografia: era um conjunto de
estados a trocar de opacidade ao mesmo tempo. Os sintomas eram todos o mesmo
defeito visto de ângulos diferentes:

| Sintoma | Causa |
|---|---|
| Tudo parece acontecer «de repente» | Nada tem antecipação — a ação começa sem preparação |
| Os elementos não parecem pesar nada | Não há aceleração nem inércia: `opacity 0→1` não tem massa |
| A soma é **afirmada**, não **mostrada** | O `28,90 €` aparece feito. Nada viajou de lado nenhum |
| O ritmo é plano | Todos os atos com a mesma duração, todas as transições a 0,55 s |
| Parece um GIF | Movimento simultâneo, sem hierarquia: o olho não sabe onde pousar |
| Os números saltam | Só o preço grande tinha contador. A base, o IVA e a margem trocavam de valor num frame |

A correção não é «mais efeitos». É uma regra:

> **Nada muda de valor sozinho. Um número só muda porque alguma coisa lhe
> chegou.**

É daqui que sai o ator principal do roteiro — a **ficha** (*token*): uma peça
com um valor, que nasce numa origem, viaja, e ao aterrar faz o destino contar.
A causa é visível antes do efeito. É isso que separa uma demonstração de uma
animação decorativa.

---

## 1. Vocabulário de movimento

### 1.1 Curvas

| Nome | Valor | Onde se usa | Porquê |
|---|---|---|---|
| `ENTRADA` | `cubic-bezier(.16, 1, .3, 1)` | Chegadas, aparições, assentamentos | É o `EASE` da marca (`lib/motion.ts`). Sai depressa, assenta devagar |
| `SAIDA` | `cubic-bezier(.7, 0, .84, 0)` | Partidas — a ficha a deixar a origem | Acelera. Uma coisa que parte tem de parecer *puxada*, não largada |
| `VIAGEM` | `cubic-bezier(.65, 0, .35, 1)` | O trajeto da ficha | Simétrica: acelera a sair, trava a chegar. É o arco completo |
| `ASSENTA` | `cubic-bezier(.34, 1.42, .64, 1)` | Marcador da régua, overshoot do cartão | Passa do alvo e volta. É o que dá **massa** |
| `IMEDIATO` | `linear`, 0 ms | Arrasto | O dedo é a autoridade. Interpolar aqui lê-se como atraso |

**Regra dura:** `ASSENTA` só em elementos que representam algo que *pousa*
fisicamente (o marcador, o cartão da base). Usá-la num fade produz o efeito
elástico barato que o protótipo tinha.

**Porque 1,42 e não 1,56.** Os dois palcos do site divergiam aqui — 1,56 no do
preço, 1,42 no de descobrir. 1,56 dá um ressalto de ~5,6% acima do alvo; 1,42
dá ~3,4%. Fica 1,42, e a regra do design system decide: «premium é contenção».
Um ressalto que se NOTA como ressalto lê-se como efeito; um que só se sente
como peso lê-se como massa. A gramática de movimento vive agora num sítio só
(`components/palco/curvas.ts`), precisamente para não voltar a divergir.

### 1.2 Durações

| Escala | ms | Exemplos |
|---|---|---|
| micro | 120–180 | *hover*, foco, toque, mudança de estado de um controlo |
| entrada | 380–520 | uma peça a aparecer |
| **saída** | **280** | uma peça a sair |
| viagem | 620–760 | a ficha de uma origem ao destino |
| contagem | 380 (parcela) · 980 (preço) | contadores |
| desenrolar | 700 | a régua |
| assentar | 320–360 | overshoot + repouso |

**A saída é mais curta do que a entrada, e isso é uma regra.** O Material 3
emparelha as curvas de entrada e de saída (*decelerate* + *accelerate*) e dá à
saída menos tempo, pela razão óbvia quando dita em voz alta: o que chega tem de
ser lido, o que parte já foi. Uma saída com a duração de uma entrada faz a peça
demorar-se — e uma peça que se demora a sair lê-se como indecisão.

### 1.3 O intervalo entre dois eventos é o que os agrupa

Esta secção não existia, e a sua falta era o defeito mais caro do roteiro. Os
desfasamentos da cena eram números avulsos — 220 ms aqui, 90 ali, 180 acolá —
escolhidos um a um por parecerem bem. Mas o intervalo entre duas partidas não é
temperamento: **é o que decide se o olho lê um acontecimento, dois irmãos, ou
duas coisas sem relação.** Escolhê-lo por gosto é deixar ao acaso a informação
mais importante que o movimento transporta.

Duas leituras obrigam a levá-lo a sério:

- **A Lei de Gestalt do Destino Comum.** Chalbi et al., *Common Fate for
  Animated Transitions in Visualization* (IEEE VIS 2019): elementos que se
  movem com a mesma velocidade e direção são vistos como um grupo — e o artigo
  acrescenta que **luminância e tamanho dinâmicos produzem o mesmo
  agrupamento**, o que alarga muito o que se pode usar para o dizer. Duas
  fichas que não chegam a coincidir no ar perdem a pista por completo.
- **Desfasar é um custo, não um enfeite.** Chevalier, Dragicevic & Franconeri,
  *The Not-so-Staggering Effect of Staggered Animated Transitions on Visual
  Tracking* (IEEE TVCG 20(12), 2014). Testaram os melhores cenários possíveis
  para o desfasamento e a conclusão é dura: o benefício «é provavelmente
  ultrapassado pelos seus custos — perda de previsibilidade nos instantes de
  partida, e movimento mais rápido de cada elemento». Do mesmo artigo vem a
  métrica que esta secção usa, o **dwell**:

  ```
  dwell = dt · |P| / t(A)          0 = tudo ao mesmo tempo · 1 = pura sequência
  ```

  Serve para uma coisa concreta: transformar «acho que estas fichas estão
  demasiado espalhadas» num número que se discute. Vive em
  `components/palco/curvas.ts`.

Daí três degraus **com nome**, e não uma escada de números soltos:

| Degrau | ms | Significa | Onde |
|---|---|---|---|
| `PASSO.uno` | 90 | Abaixo do limiar em que se julga a ordem de dois acontecimentos. Não são dois: é um a chegar com espessura | Retenção → IVA (ato 3); marcador → barra (ato 4) |
| `PASSO.irmao` | 160 | Separadamente legíveis, mas ainda sobrepostos no ar. Partes de uma mesma soma | As três fichas de custo (ato 2) |
| `PASSO.outro` | 380 | Uma fronteira. O que vem a seguir é **outra ideia** | Margem → retenções (ato 3) |

**Porque 160 e não 220 nas fichas de custo.** Com uma viagem de 640 ms, um
desfasamento de 220 ms deixava as três fichas no ar em conjunto apenas 200 ms —
31% do percurso — e três fichas que mal se cruzam não têm destino comum: leem-se
como três acontecimentos sem relação, que é o contrário do que o ato diz. A
160 ms a sobreposição sobe para 320 ms (50% do percurso) e o dwell desce de
**0,61 para 0,50**. As aterragens continuam a 160 ms umas das outras, muito
acima do limiar de fusão, portanto a base continua a contar em três degraus
visíveis. O desfasamento comprou exatamente o que tinha de comprar.

**E o simultâneo tem um uso só.** Há um único momento em que três coisas se
movem ao mesmo tempo sem desfasamento nenhum: `confirmaOrigens`, quando as três
linhas de custo acendem em conjunto depois de o cartão fechar a soma. É
luminância dinâmica sincronizada — a pista de destino comum mais forte que há —
e diz o que nenhuma ficha podia dizer sozinha, porque cada uma chegou só: **as
três, juntas, são esta base.**

### 1.4 Os três silêncios

Um silêncio é ausência deliberada de movimento. São o que faz o evento
seguinte **aterrar** em vez de se somar ao ruído. Há exatamente três:

1. **380 ms** entre a margem e o IVA (ato 3) — separa duas ideias diferentes:
   o que é teu e o que é do Estado.
2. **260 ms** entre a ficha aterrar e o preço começar a contar (ato 4) — o
   tempo de o valor «assentar» antes de ser lido.
3. **Indefinido** depois do último beat — a cena **acaba**. Não reinicia.

### 1.5 A pausa pára tudo o que se move

Não é uma preferência: é o WCAG 2.2.2. E foi um defeito real — a primeira
versão parava o relógio dos beats e mais nada, portanto as fichas continuavam a
voar e a aterrar com a demonstração «em pausa».

Por isso **nenhum ator do palco é animado pelo `motion`**: a ficha e o contador
têm relógio próprio, com o mesmo desenho do relógio dos atos — um
`requestAnimationFrame` que só acumula tempo enquanto não está parado. Pausar é
deixar de acumular.

O que continua no `motion` são transições de estado curtas (≤ 520 ms) que não
são conteúdo em movimento: uma linha a acender, um cartão a assentar. Uma
transição dessas a completar-se depois da pausa não é conteúdo animado — é o
fim de um gesto que já tinha começado.

---

## 2. Os atores

| Ator | O que é | Regra |
|---|---|---|
| **Linhas de entrada** | Materiais, Trabalho, Custos fixos, Markup | São controlos, não decoração. Movem-se pouco e nunca sozinhos |
| **Ficha** (`token`) | Pastilha com um valor, posicionada em absoluto sobre o palco | Nasce medida no DOM da origem, morre medida no DOM do destino |
| **Cartão da base** | O somatório dos custos | Só conta quando uma ficha aterra. Nunca antecipa |
| **Fichas de fórmula** | Markup, SS e IRS, IVA | Saem *de baixo* do cartão da base — são produzidas por ele |
| **Preço grande** | O resultado | Conta uma vez, do mínimo ao recomendado |
| **Marcador da régua** | Onde o preço cai | Cai de cima, viaja, passa do alvo, volta |
| **Barra da composição** | As parcelas do preço | Cresce da esquerda, uma a uma. O **lucro é o último** |

### 2.1 A ficha, em detalhe

```
            0%          12%                        88%        100%
            ├── nascer ──┤────────── partir ─────────┤─ aterrar ─┤

nascer    opacity 0→1, scale .8→1, parada na origem          ENTRADA
partir    Bézier QUADRÁTICA origem → controlo → destino      VIAGEM
          (controlo: 16% da perpendicular ao segmento)
aterrar   opacity 1→0, scale 1→.6, já no destino             SAIDA
impacto   anel: scale .4→1.6, opacity .5→0 · 280 ms          ENTRADA
```

**O contador do destino dispara aos 88% — quando a ficha ENCOSTA — e não aos
100%.** Com o disparo no fim, a causa via-se a desaparecer antes de o efeito
acontecer, e a ligação entre as duas coisas perdia-se exatamente no instante em
que tinha de se ver.

A curva do percurso é uma **Bézier quadrática**, não três segmentos retos com
um vértice. Uma reta entre dois pontos lê-se como teletransporte; um vértice
lê-se como um ricochete.

O desvio é de **16%** da distância. Os dois palcos do site divergiam aqui — 18%
neste, 16% no de descobrir — e a reconciliação escolheu o menor, pela mesma
razão que escolheu 1,42 em `ASSENTA`: entre duas opções que ninguém distingue
lado a lado, a contida é a que não se nota. Uma trajetória que se NOTA como
curva deixa de ser trajetória e passa a floreado. A geometria vive agora num
sítio só (`components/palco/medida.ts`).

---

## 3. A linha temporal

Tempos em ms **desde o início do ato**. Cada ato é navegável por si (a régua de
atos), e entrar num ato a meio começa-o do princípio.

> **Como se lê a tabela.** Um **cue** (`assim`) é um instante que o relógio
> dispara e que existe em `coreografia.ts`. Uma **consequência** (`⤷ assim`) é
> o que acontece por causa de outra coisa — uma ficha a aterrar, um contador a
> arrancar — e não tem instante próprio: acontece quando a causa acontece.
> `coreografia.test.ts` compara os cues desta tabela com os do código, um a um.

### ATO 1 — SEPARAR O QUE É CUSTO · 1 800 ms

> Intenção: fazer uma **triagem visível**. Não «apresentar quatro campos» —
> mostrar que três destes são custos e o quarto não é.

| ms | Cue | Movimento |
|---|---|---|
| 0 | `regua` | A régua do cabeçalho da lista desenha-se da esquerda (`scaleX 0→1`, 320 ms, ENTRADA) |
| 140 | `materiais` | Linha 1 sobe 3 px, o anel do ícone acende (420 ms) |
| 320 | `trabalho` | Linha 2 sobe 2 px (420 ms) |
| 500 | `fixos` | Linha 3 sobe 2 px (420 ms) |
| 820 | `apagaMarkup` | A linha do Markup **escurece** para `opacity .55` (420 ms) — não é um custo |
| 1180 | `pegas` | As pegas das três linhas acesas respiram uma vez (`opacity .3→.7→.3`) |

**As quatro linhas começam iguais.** Isto é a correção de um defeito: antes o
Markup **nascia** apagado, o que é uma afirmação — a pessoa via um controlo
esbatido e não tinha como saber porquê. Vê-lo escurecer é um argumento.

**Os custos ficam acesos depois deste ato.** Voltavam a esbater-se durante a
soma, o que lia como um piscar sem causa.

**A variação é intencional:** 3 px, 2 px, 2 px e atrasos de 180/180 ms com
durações iguais. Escadas perfeitamente regulares leem-se como máquina. O ato
encolheu de 2 200 para 1 800 ms porque o anterior tinha 1,3 s sem nada a
acontecer no fim.

### ATO 2 — APURAR A BASE · 2 100 ms

> Intenção: **mostrar** a soma a acontecer. É o ato mais importante do palco.

| ms | Cue | Movimento |
|---|---|---|
| 0 | `cartao` | O cartão da base aparece **vazio** — rótulo e `—` (`scale .96→1`, 360 ms, ENTRADA) |
| 180 | `fichaA` | Ficha nasce no valor de Materiais |
| 820 | `⤷ aterraA` | Aterra → base conta `0 → 14,80` (380 ms) · anel de impacto |
| 340 | `fichaB` | Ficha nasce no valor de Trabalho |
| 980 | `⤷ aterraB` | Aterra → base conta `14,80 → 24,40` |
| 500 | `fichaC` | Ficha nasce no valor de Custos fixos |
| 1140 | `⤷ aterraC` | Aterra → base conta `24,40 → 28,90` |
| 1300 | `assenta` | Cartão faz overshoot (`scale 1→1.035→1`, 340 ms, ASSENTA) |
| 1400 | `confirmaOrigens` | As três linhas de custo acendem **ao mesmo tempo** — anel a `.85`, `scale 1.08` (420 ms) |
| 1560 | `parcelas` | A sub-linha `14,80 € + 9,60 € + 4,50 €` aparece (280 ms) |

As três fichas estão **no ar ao mesmo tempo**, desfasadas `PASSO.irmao`
(160 ms). Estavam a 220 ms, e a 220 ms a afirmação anterior deste parágrafo era
falsa: coincidiam 200 ms num percurso de 640, e três fichas que mal se cruzam
não são um caudal — são três eventos separados a fingir. A 160 ms coincidem
320 ms, metade do percurso, e o dwell desce de 0,61 para 0,50. Cada uma continua
a ter o seu tempo de aterragem, e a base conta três vezes em degraus visíveis.

**`confirmaOrigens` é o beat novo deste ato, e é o único momento simultâneo da
cena inteira.** As fichas partiram uma a uma e chegaram uma a uma; nenhuma podia
dizer que as três, em conjunto, são esta base. As três origens a acenderem no
mesmo frame dizem-no — luminância dinâmica sincronizada, que Chalbi et al.
mostram agrupar tão fortemente como a posição. O ato encolheu de 2 400 para
2 100 ms porque o desfasamento mais curto adiantou tudo o que vinha depois.

### ATO 3 — APLICAR MARKUP E IVA · 2 500 ms

> Intenção: separar três naturezas de dinheiro que a maioria das ferramentas
> mistura numa linha só.

| ms | Cue | Movimento |
|---|---|---|
| 0 | `acordaMarkup` | A linha do Markup **acende** (`opacity .55→1`, anel liga, 380 ms). Mudança de papel, visível |
| 260 | `chipMargem` | A ficha da margem sai **de baixo** do cartão (`y +10→0`, 420 ms, ENTRADA) |
| 380 | `⤷ contaMargem` | Conta `0 → 11,67` (520 ms) |
| 900 | — | **SILÊNCIO · 380 ms** (`PASSO.outro`) |
| 1280 | `chipRetencao` | *(só a recibos verdes)* A ficha de SS e IRS sai do cartão (420 ms) |
| 1370 | `chipIVA` | A ficha do IVA sai do cartão (420 ms) — a `PASSO.uno` da anterior |
| 1400 | `⤷ contaRetencao` | Conta `0 → 2,66` (520 ms) |
| 1490 | `⤷ contaIVA` | Conta `0 → 9,33` (520 ms) |
| 1980 | `estado` | A anotação `→ Estado` aparece na ficha do IVA (260 ms) |

O IVA tem tratamento próprio — cor de areia e a anotação — porque **não é
dinheiro do vendedor**. A distinção é a razão de a página existir.

**Os três intervalos deste ato são o argumento do ato.** A margem sai sozinha,
e depois há uma fronteira de 380 ms; as duas retenções saem a 90 ms uma da
outra, abaixo do limiar em que se julga a ordem de dois acontecimentos. Não é
ritmo: é a estrutura da ideia dita pelo tempo. **A margem é tua. O que vem
depois da fronteira não é** — e o que vem depois da fronteira é uma coisa só,
vista duas vezes. Estavam ambas a 220 ms, o mesmo intervalo das fichas de custo,
que é o intervalo de *partes de uma soma*: o tempo dizia que a retenção e o IVA
eram parcelas irmãs da margem, exatamente a confusão que este ato existe para
desfazer. O ato encolheu de 2 600 para 2 500 ms por consequência.

### ATO 4 — FIXAR O PREÇO · 4 500 ms

> Intenção: entregar o resultado com peso, e só depois explicá-lo.

| ms | Cue | Movimento |
|---|---|---|
| 0 | `handoff` | Uma ficha maior nasce na pilha de fórmulas, com o total |
| 120→880 | `⤷ viagem` | Atravessa para a zona do resultado (760 ms, VIAGEM). Ao passar o nó da divisória, o nó pulsa |
| 880 | `chega` | Ficha dissolve · zona do resultado passa de `.55` para `1` (520 ms) |
| — | — | **SILÊNCIO · 260 ms** |
| 1140 | `contaPreco` | O preço grande conta `35,55 → 49,90` (980 ms, ENTRADA) — acaba aos 2 120 |
| 1300 | `regua` | A régua desenrola-se da esquerda (`scaleX .04→1`, 700 ms, ENTRADA) — fecha aos 2 000 |
| 1530 | `zonas` | As três acendem da esquerda ao longo do resto do desenrolar (3 × 233 ms = `desenrolar ÷ 3`). A última arranca quando a régua fecha (2 000) |
| 2200 | `marcadorCai` | O marcador **cai de cima** na posição do mínimo (`y −14→0`, 320 ms) |
| 2520 | `marcadorViaja` | Viaja até à posição final (660 ms, ASSENTA — passa e volta) |
| 3180 | `⤷ impacto` | Anel de impacto no marcador (360 ms) |
| 3240 | `barra` | Segmentos da composição crescem da esquerda (420 ms cada, 90 ms de desfasamento) |
| — | — | Ordem: custos → SS e IRS → IVA → **lucro em último** |
| 3600 | `⤷ rotulos` | Cada rótulo aparece 80 ms depois do seu segmento |
| 4000 | `resolve` | O ponto do «Resultado» fica verde sólido e pulsa uma vez (420 ms) |
| 4500 | — | **PARA.** |

O marcador não desliza do zero: **cai** no mínimo e só depois viaja. São dois
factos diferentes — «o mínimo é aqui» e «o preço fica ali» — e uma trajetória
única contá-los-ia como um.

**Este ato cresceu de propósito: 3 400 → 4 500 ms.** Tinha nove beats em 3,4 s,
com três a dispararem em 300 ms — o preço a contar (980 ms), a régua a
desenrolar-se (700 ms) e as zonas a ganharem cor sobre uma régua que ia em 20%
do seu percurso. É o **princípio da apreensão** de Tversky, Morrison &
Bétrancourt (*Animation: can it facilitate?*, IJHCS 57(4), 2002) violado à
letra: os autores atribuem grande parte dos resultados desanimadores da
literatura sobre animação a animações «demasiado complexas ou demasiado rápidas
para serem percebidas com exatidão». Encurtar não era opção — o que aqui está é
preciso todo. Espalhar era.

Três consequências, e cada uma corrige uma afirmação falsa que a versão
anterior fazia:

1. **As zonas deixaram de aparecer em bloco e passaram a acender ao longo do
   desenrolar.** O passo é `DUR.desenrolar ÷ 3`, não um 90 ms escolhido à mão.
   Pelo **princípio da congruência** — a forma do gráfico tem de corresponder à
   forma da ideia —, a régua a abrir-se e a preencher-se e três rótulos a
   aparecerem por cima dela são duas ideias diferentes, e só a primeira é
   verdade.

   **Medido em runtime, e não deduzido:** a primeira zona acende com a régua a
   `scaleX .938`, a segunda a `.998`, a terceira já com ela fechada. Não é o
   que a intuição diria — a `ENTRADA` é um *ease-out* forte, e a régua ganha
   quase toda a largura no primeiro terço do tempo —, mas é o que interessa: no
   valor anterior a primeira zona acendia com a régua em `scaleX ≈ .2`, por
   cima de um traço que ainda não era uma escala. A regra que isto cumpre é a
   do §6.1, «uma peça não se mostra meio carregada», e cumpre-a com margem.
2. **O marcador só cai depois de a régua fechar (2 000) e de o preço parar de
   contar (2 120).** Aterrar sobre uma escala meio-desenhada enquanto o número
   ainda muda são três afirmações em simultâneo, e o §7 proíbe duas.
3. **A viagem do marcador encurtou para 660 ms.** A 720 acabava no instante
   exato em que a barra começava a crescer: dois acontecimentos colados são um
   a tapar o outro. Com 660 assenta 60 ms antes — `PASSO.uno` —, que se lê como
   entrega e não como colisão.

**E a cena inteira ficou 900 ms mais longa (10 200 → 11 100 ms), o que é o
sentido certo.** O princípio da segmentação (Mayer & Chandler, 2001) mostra que
se aprende melhor com segmentos ao ritmo de quem vê do que com um bloco
contínuo, e que o efeito é mais forte «quando o material é complexo, a
apresentação é rápida e quem vê é inexperiente» — que é exatamente esta cena
para quem nunca formou um preço. A régua de atos e a pausa são essa segmentação;
o custo de 900 ms paga-se em cada ato ser legível, e quem não os quiser ver
salta-os ou lê o resultado, que o HTML servido já traz inteiro.

### ATO 5 — REPOUSO ATIVO

600 ms depois do fim, as pegas de arrasto respiram **uma vez**
(`opacity .3→.65→.3`, 1 400 ms). Convida sem insistir. Nunca repete.

---

## 4. Interação — a coreografia que o utilizador conduz

### 4.1 Arrasto

| Momento | Movimento |
|---|---|
| `pointerdown` | A linha levanta (`scale 1.015`, `shadow-lift`, 160 ms). As irmãs baixam para `opacity .7`. O marcador da régua cresce para `scale 1.15` |
| durante | **Sem interpolação.** Os números seguem o dedo em 1:1 (`IMEDIATO`). O marcador segue com mola curta |
| `pointerup` | A linha assenta (240 ms). As irmãs voltam. O preço faz uma contagem curta de recuperação (420 ms). A composição refaz-se (320 ms) |

**A nota da linha cede o lugar ao delta.** Enquanto se arrasta, a segunda linha
do controlo («por unidade», «tempo aplicado») passa a mostrar quanto o valor já
mudou desde que o dedo pousou — `+ 2,40 €`, `− 1,20 €`. É informação que só
existe durante o gesto, e ocupa um lugar que estava inerte: nada de novo
aparece por cima do dedo.

O sinal tem cor mas não tem juízo: areia a subir, verde a descer, porque é a
direção que se está a comunicar e não se sabe qual delas é boa para quem
arrasta.

**Nunca** reinicia a sequência. Mexer é uma resposta, não um recomeço — quem
arrasta já viu a explicação, ou decidiu não a ver.

### 4.2 Ir para um ato é pô-lo a correr

Clicar num passo da régua de atos **começa esse ato do princípio e reproduz-no**.
Não pára nele.

Foi um defeito real: com a navegação a pausar, saltar para «Fixar o preço»
deixava o preço preso em 35,55 € para sempre, porque o relógio ficava suspenso
e nenhum beat disparava. A régua de atos era uma navegação que não navegava.

E entrar num ato **repõe o estado que esse ato constrói** — entrar no ato da
base tem de mostrar `—` e somar outra vez. Com a reposição condicional que lá
esteve, entrava-se no ato com a soma já feita: o ato que existe para MOSTRAR a
soma mostrava-a resolvida.

### 4.3 Troca de regime

A ficha de SS e IRS **entra** (nasce do cartão da base, como as outras) ou
**sai** (encolhe na direção do cartão). O segmento correspondente da barra
abre ou fecha a largura. O preço conta. A linha de comparação faz *crossfade*.

Uma troca de regime é o mesmo tipo de evento que um beat do ato 3 — e por isso
usa exatamente a mesma linguagem. Inventar-lhe uma transição própria ensinaria
duas gramáticas para a mesma ideia.

---

## 5. Acessibilidade — o roteiro tem de sobreviver a ser desligado

| Condição | Comportamento |
|---|---|
| `prefers-reduced-motion` | A cena nasce e **fica** no estado final do ato 4. Sem fichas, sem contadores, sem viagens. A mesma informação, sem coreografia — não uma versão pobre dela |
| Sem JavaScript | O HTML servido já traz o preço, a régua, a composição e as métricas. O estado inicial do componente **é** o último ato, e só a montagem o rebobina |
| Pausa | Obrigatória (WCAG 2.2.2). Suspende o relógio do ato **e** os beats: retomar continua de onde ficou, não do princípio do ato |
| Teclado | Cada linha é um `slider` com setas, `Home`/`End` e `PageUp`/`PageDown`. Cada ato é alcançável pela régua de atos |
| Leitor de ecrã | Uma `aria-live="polite"` anuncia o ato e o preço. As fichas e os anéis são `aria-hidden` — são a *forma* de dizer o que o texto já diz |

---

## 6. Mobile — outra composição, o mesmo roteiro

As colunas empilham, portanto **as fichas viajam na vertical**. Isto não exige
um segundo roteiro porque as origens e os destinos são medidos no DOM em tempo
de execução: a trajetória segue a disposição, seja ela qual for.

O que muda de propósito:

- o desvio do arco reduz-se (a distância vertical é menor);
- os rótulos da composição passam a grelha de 3 colunas — em fila
  proporcional, o **lucro** saía para fora do scroll;
- o nó das divisórias não existe (não há divisórias verticais).

---

## 6.1 Nada aparece antes de existir

Duas regras que nasceram de ver a cena a meio, e não de a pensar em abstrato:

**Uma peça não se mostra meio carregada.** O eixo da régua e os rótulos de 20 a
70 € entram COM a régua. Com a régua encolhida a `scaleX(.04)` e o eixo já
desenhado, ficava uma escala pendurada sem nada a que pertencer. A própria
régua ganha opacidade ao desenrolar-se: encolhida e opaca, era um traço de dois
pixéis parado no canto — lia como detrito.

**Uma métrica não se mostra antes de existir na narrativa.** O preço mínimo sai
dos custos e vale desde o primeiro ato. O lucro e a margem só existem depois de
haver markup, e até lá aparecem como `—`. Mostrá-los esbatidos enquanto a cena
os está a construir era contar o fim ao mesmo tempo que se contava o princípio.

---

## 7. O que este roteiro proíbe

- **Reiniciar em ciclo.** Uma cena que recomeça ensina o olho que nada ali
  depende de si.
- **Movimento sem causa.** Nada pulsa, flutua ou brilha por estética.
- **Dois eventos importantes ao mesmo tempo.** Se dois beats colidem, um
  deles não era importante.
- **Animar a existência de conteúdo.** `opacity: 0` no HTML servido é conteúdo
  que desaparece sem JavaScript. Anima-se a **ênfase**, nunca a presença.
- **Elástico em fades.** `ASSENTA` é para coisas que pousam.
- **Interpolar durante o arrasto.** O dedo manda.
- **Mostrar uma peça a meio de carregar.** Ou está, ou não está.
- **Adiantar um número que a cena ainda não construiu.**
- **Escolher um desfasamento por gosto.** Os intervalos são vocabulário
  (§1.3), não temperamento. Um valor novo tem de ser um dos três degraus, ou
  então tem de trazer a razão por que precisa de ser um quarto.

---

## 8. Donde vêm as regras

Cada uma destas mudou alguma coisa concreta na cena. Não são bibliografia de
enfeite — a coluna da direita diz onde é que cada leitura pegou.

| Fonte | O que decidiu aqui |
|---|---|
| Chevalier, Dragicevic & Franconeri, *The Not-so-Staggering Effect of Staggered Animated Transitions on Visual Tracking*, IEEE TVCG 20(12), 2014 · [PDF](http://www.cs.toronto.edu/~fchevali/fannydotnet/resources_pub/pdf/notsostaggering-infovis14.pdf) | Desfasar é um **custo** («perda de previsibilidade nos instantes de partida, e movimento mais rápido de cada elemento»), portanto tem de comprar alguma coisa. Deu a métrica do **dwell** e baixou as fichas de custo de 220 para 160 ms |
| Chalbi et al., *Common Fate for Animated Transitions in Visualization*, IEEE VIS 2019 · [arXiv](https://arxiv.org/pdf/1908.00661) | **Luminância dinâmica agrupa tão fortemente como a posição.** É a origem do beat `confirmaOrigens` — o único momento simultâneo da cena |
| Tversky, Morrison & Bétrancourt, *Animation: can it facilitate?*, IJHCS 57(4), 2002 · [PDF](https://hci.stanford.edu/courses/cs448b/papers/Tversky_AnimationFacilitate_IJHCS02.pdf) | Os princípios da **congruência** e da **apreensão**. Puseram as zonas a serem alcançadas pelo desenrolar da régua e espalharam o ato 4 de 3 400 para 4 500 ms |
| Mayer & Chandler, *When learning is just a click away*, JEP 93(2), 2001 — princípio da segmentação | Justifica a régua de atos e a pausa, e justifica a cena ficar **mais longa** em vez de mais rápida |
| [Material Design 3 — easing and duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) | O emparelhamento entrada/saída e a saída mais curta do que a entrada (`DUR.saida = 280`) |
| [WCAG 2.2 — 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | A pausa tem de parar **tudo** o que se move, incluindo as fichas e os contadores (§1.5) |
