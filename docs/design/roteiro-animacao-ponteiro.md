# Roteiro de animação — **a mão**

> Fonte de verdade do ponteiro encenado: o cursor que entra em cena, desliza,
> espera e clica. `components/palco/ponteiro.tsx` executa-o;
> `components/palco/curvas.ts` guarda o orçamento de tempo (`MAO`); cada palco
> declara os beats. Se o código e este roteiro discordarem, um dos dois está
> errado — decide-se qual, não se «harmoniza».
>
> A gramática de movimento geral (curvas, `PASSO`, silêncios, a regra da pausa)
> é a de `roteiro-animacao-preco.md` §1 e não se repete aqui.

---

## 0. Porque é que isto existe

Uma demonstração em que um campo se preenche sozinho não é uma demonstração do
produto: é **um vídeo de um formulário**. Falta-lhe a única coisa que transforma
um ecrã numa utilização — alguém a usá-lo.

A homepage antiga tinha isto e fazia-o bem. O `HeroCard` tinha um cursor que
entrava, deslizava até ao campo, clicava, esperava enquanto o valor era escrito
com uma gralha pelo meio, voltava e carregava em «Calcular». Quando os cinco
palcos novos foram construídos, o cursor ficou para trás — e a reação de quem
conhecia a versão anterior foi imediata e correta: *«as animações não estão ao
nível das que tinha antes»*.

Este documento existe para que isso não volte a acontecer por omissão, e para
que a versão nova não repita os erros que a primeira tentativa cometeu.

---

## 1. O que substituiu, e porquê

### 1.1 A versão do `HeroCard`: quinze `setTimeout`

O original era uma cadeia de temporizadores agendados de uma vez
(`t += COMPASSO.deslizaAteCampo`, e por aí fora). Funcionava, e tinha dois
defeitos de fundo:

1. **Não sabia o que era uma pausa.** Com a demonstração em pausa, o cursor
   continuava a andar e a clicar. É uma falha de WCAG 2.2.2 disfarçada de
   detalhe.
2. **O alvo era medido uma vez.** Se o cartão mudasse de altura a meio, o cursor
   ia para onde a peça já não estava.

### 1.2 A primeira reescrita: um tween. Pior.

A substituição inicial trocou os temporizadores por um `useEffect` que
interpolava de A para B a cada beat. **Três defeitos, todos medidos em runtime e
nenhum deduzido do código:**

| Sintoma medido | Causa |
| --- | --- |
| Nascia em `x = −34`, fora do palco | O ponto era medido no instante do beat, com o palco ainda a encher-se |
| 1 790 ms parado, 52 px em três frames, 1 400 ms parado | O alvo era um objeto `{x,y}` novo em cada `setState`, portanto o efeito voltava a correr e a interpolação **reiniciava** |
| O clique no campo nunca chegava a desenhar-se premido | O estado premido era lido noutro sítio que não a posição |

A lição não é sobre tweens: é sobre **onde se procurou o defeito**. Duas leituras
do código não encontraram nada. Um traçado fotograma a fotograma no browser
encontrou os três em minutos.

---

## 2. A correção: um seguidor, não um percurso

O ponteiro **não recebe um destino**. Recebe uma função que lhe diz, a cada
fotograma, onde quer estar:

```ts
export interface LeituraPonteiro {
  ponto: Ponto | null;   // onde quer estar, medido AGORA. `null` esconde-o.
  premido: boolean;      // a carregar
  imediato?: boolean;    // teletransporta em vez de perseguir — só na entrada
}
```

Isto resolve os três defeitos de uma vez, e por construção:

- **não há efeito por alvo**, portanto não há nada para reiniciar;
- **o alvo é remedido a cada fotograma**, portanto nunca envelhece — se a peça se
  mexer a meio do percurso, o cursor acompanha-a;
- **o estado premido é lido no mesmo sítio que a posição**, portanto não podem
  dessincronizar.

### 2.1 E uma mola, não uma curva

```
a = k·(alvo − pos) − c·v      k = 105 (RIGIDEZ)   c = 19 (AMORTECIMENTO)
```

Uma mola dá de graça três princípios da animação clássica que uma interpolação
linear não dá: aceleração e desaceleração naturais («slow in and slow out»),
sobreposição do fim de um movimento com o princípio do seguinte, e um ligeiro
ultrapassar do alvo antes de assentar.

Os valores estão **subamortecidos de propósito, mas pouco**: ~4 % de
ultrapassagem. É a mesma regra de `ASSENTA` — um ressalto que se **nota** lê-se
como efeito; um que só se **sente** lê-se como peso. A diferença entre os dois é
a fronteira entre uma interface séria e uma que está a mostrar que sabe animar.

O passo é travado em `dt ≤ 0,032 s`: um separador em segundo plano acumula
segundos de tempo decorrido e faria a mola explodir ao voltar.

---

## 3. O orçamento de tempo — `MAO`, em `palco/curvas.ts`

```ts
export const MAO = {
  assenta: 620,   // da partida ao repouso, na escala de uma coluna
  espera:  420,   // a paragem sobre o alvo antes de a intenção se ler
  premir:  170,   // carregar e largar
};

export const aoChegar = (partida: number) => partida + MAO.assenta + MAO.espera;
```

### 3.1 `assenta` — e a lei de Fitts

Não é um número escolhido: é o tempo **medido** até ao repouso, com a rigidez e o
amortecimento acima, para a largura de uma coluna.

A lei de Fitts modela o tempo de um apontamento como
`MT = a + b · log₂(A/W + 1)` — cresce com o logaritmo da distância sobre a
largura do alvo. A mola dá essa dependência de graça na aceleração, que é
proporcional ao que falta percorrer; o que ela não dá é a variação no
assentamento, que é constante. Para as distâncias que estes palcos têm — sempre
dentro da mesma coluna ou entre colunas vizinhas — a diferença não é visível, e
por isso há **um orçamento e não uma função**.

Se um palco futuro tiver de atravessar o palco inteiro, é aqui que passa a haver
uma função, e é aqui que se escreve porquê.

### 3.2 `espera` — porque não se clica à chegada

A NN/g mediu em **0,3–0,5 s** a paragem do cursor a partir da qual a intenção se
lê: *«o melhor indício da intenção do utilizador é o rato PARAR sobre um
elemento»* («Timing Guidelines for Exposing Hidden Content»). 420 ms fica no meio
do intervalo.

Isto não é polimento. **Era um defeito, e mediu-se:**

| Palco | Chegada → clique, antes | Agora |
| --- | --- | --- |
| Recibos · campo | 160 ms | 420 ms |
| Recibos · botão «Calcular» | 140 ms | 420 ms |

Uma mão que chega e carrega no mesmo instante não parece uma pessoa a decidir —
parece um script a executar passos, que é exatamente o que era. Chegar e carregar
são **dois** acontecimentos, e o silêncio entre eles é o que os torna uma decisão.

O ato dos recibos passou de 5 200 ms para 5 800 ms para comprar as duas esperas.
Foi um bom negócio.

---

## 4. Os beats que um palco tem de declarar

O ponteiro não tem coreografia própria: lê a do palco. O vocabulário mínimo:

| Beat | O que significa |
| --- | --- |
| `ponteiroEntra` | Aparece em cena, **parado**, num ponto de repouso |
| `vaiA…` | Parte para o alvo |
| `…clica`/`preme` | Carrega (o anel de toque nasce aqui) |
| `…solta`/`solta` | Larga, `MAO.premir` depois |
| `ponteiroSai` | Sai de cena |

### 4.1 Entrar é aparecer, não viajar

A entrada usa `imediato: true`. Um cursor que vem do canto superior esquerdo até
ao seu lugar não é uma entrada — **é um erro a acontecer devagar**. Aparece
parado onde vai começar, e só o beat seguinte o põe a andar.

### 4.2 Estacionar enquanto se escreve

Durante a digitação o cursor afasta-se do campo (`+104 px`, `+58 px` no palco dos
recibos). Uma mão parada por cima daquilo que se está a escrever tapa a única
coisa que a cena tem para mostrar.

### 4.3 Ver antes de clicar

No hero da bússola o clique acontece **depois** de a resposta estar aberta:
primeiro vê-se o que há, só depois se decide entrar. A ordem inversa mostrava
alguém a clicar às cegas — que é precisamente o que a página existe para deixar
de ser preciso.

---

## 5. As três coisas que o ponteiro nunca faz

1. **Não anda com a demonstração em pausa.** Parar é deixar de integrar a mola.
   O `PalcoContexto` propaga `parado`, e `parado` inclui a suspensão por
   sobrevoo. Regra da casa, WCAG 2.2.2.
2. **Não existe com `prefers-reduced-motion: reduce`.** `estatico` esconde-o e a
   cena serve-se resolvida.
3. **Não disputa o lugar com uma mão a sério.** No hero da bússola, se alguém
   está a apontar com o rato ou com o teclado, a mão encenada sai da frente.
   Duas mãos no mesmo sítio não é uma demonstração — é uma disputa.

---

## 6. Duas armadilhas que já custaram caro

### 6.1 O estilo em linha ganha sempre à classe

A opacidade do ponteiro é escrita **imperativamente** pelo relógio. Com um
`style={{ opacity: 0 }}` no JSX, cada render do palco — e há dezenas por ato —
devolvia o elemento a invisível por cima do que o relógio tinha acabado de
escrever. O cursor movia-se corretamente e **nunca se via**: `transform` a mudar,
`opacity` presa em 0.

A opacidade inicial vive numa **classe** (`opacity-0`), que perde o empate contra
o estilo em linha e por isso nunca mais interfere.

### 6.2 O defeito não estava no ponteiro

O sintoma era «o cursor nunca entra em cena». A causa estava em
`palco/relogio.ts`, a três ficheiros de distância: o relógio filtrava os beats
por disparar contra o **estado** `feitos`, que é assíncrono. Reiniciar um ato a
meio limpava o estado e, no mesmo commit, o efeito do relógio ainda lia o
conjunto antigo — os beats já disparados ficavam fora de `porDisparar` **e** eram
apagados do estado. Morriam até ao fim do ato.

A prova foi um instantâneo do estado no browser:

```
{ ato: 0, entra: false, d1: true, calc: false }
```

`d1` (1 720 ms) tinha disparado e `ponteiroEntra` (300 ms), 1 420 ms **antes**,
não. Só é possível de uma maneira. A correção é um espelho síncrono
(`feitosRef`), e vale para **os cinco palcos**, não só para o ponteiro.

> **A regra que fica:** quando uma animação está errada, mede-se no browser antes
> de se ler o código. As duas vezes em que se leu o código primeiro, não se
> encontrou nada.

---

## 7. Como verificar

Não «ver se parece bem». Traçar:

1. Servir uma **build** (`npm run build && npx next start`). Um `next start`
   sobre uma build anterior serve o código antigo e faz parecer que a correção
   não funcionou — já aconteceu, e custou uma sessão inteira.
2. Amostrar `transform` e `opacity` do ponteiro a cada ~500 ms e confirmar a
   sequência: entra num ponto de repouso → viaja → **para** → prime → larga →
   estaciona → viaja → prime → sai.
3. Confirmar que `prefers-reduced-motion: reduce` não desenha ponteiro nenhum e
   serve a cena resolvida.
4. Confirmar que «Pausar» pára o cursor no sítio onde estava.
5. Afastar o rato do palco antes de medir. Um cursor a sério em cima de uma peça
   suspende a demonstração — de propósito — e à distância isso lê-se como uma
   avaria que não existe.
