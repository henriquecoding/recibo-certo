# Roteiro de animação — «A repartição» (`/?foco=recibos`)

> Fonte de verdade da coreografia deste palco. `components/foco/recibos/coreografia.ts`
> guarda os tempos; `PalcoRecibos.tsx` executa-os. Se o código e este roteiro
> discordarem, um dos dois está errado — decide-se qual, não se «harmoniza».
>
> A gramática de movimento (curvas, `PASSO`, silêncios, a regra da pausa) é a de
> `roteiro-animacao-preco.md` §1 e não se repete aqui.

---

## 0. O que este palco tem para dizer

> **Deste recibo, uma parte é tua, outra é do Estado, e uma tem data.**

O verbo é **repartir**, e é o único dos cinco palcos que reparte. É essa a regra
que o impede de voltar a ser o que era: até esta reestruturação, «Recibos
verdes», «Salário» e «Empresa» partilhavam **um** `HeroCard` com uma coreografia
só, e três dos quatro cartões declaravam `modoLinhas: "deducoes"` — a mesma
cascata de deduções, três vezes, com números diferentes.

### 0.1 A diferença estrutural face ao palco do preço

No preço, as fichas **convergem**: três origens diferentes viajam para um destino
comum e o cartão soma. Aqui **divergem**: uma origem única parte-se em três e
cada pedaço vai para o seu lado. É a mesma maquinaria lida ao contrário — e por
isso as três fichas partem todas do mesmo ponto medido.

### 0.2 E o ato 4 constrói ao contrário

Todos os outros palcos do site constroem para cima. Este constrói e depois
**tira**: o «disponível para gastar» desce quando a reserva se enche.

É deliberado, e é a razão de o palco existir. A frase que o produto existe para
desfazer é «recebi 2 000 €» — e uma animação que só soma nunca a desfaz.

---

## 1. A mão

O `HeroCard` da homepage antiga tinha um cursor de rato que entrava em cena,
deslizava até ao campo, **clicava**, esperava enquanto o valor era escrito com
uma gralha pelo meio, voltava, deslizava até «Calcular» e clicava outra vez.

Na primeira versão deste palco portei a digitação e deixei o ponteiro para trás
— «a essência», escrevi em comentário. Não era a essência: era metade. **Uma
pessoa a escrever num campo sem nada lhe ter tocado é um vídeo de um formulário
a preencher-se sozinho.** O que aquilo tinha, e que nenhuma outra demonstração do
site tem, é a mão.

### 1.1 O que mudou na mudança de casa

| Antes (`HeroCard`) | Agora (`palco/ponteiro.tsx`) |
|---|---|
| Cadeia de quinze `setTimeout` | Beats do relógio do ato |
| A pausa não o parava — o cursor continuava a andar e a clicar | A pausa pára-o onde está |
| Alvos recalculados por `setTimeout` | Alvos medidos no DOM quando o beat dispara |
| Posição interpolada pelo `motion` | Relógio próprio, como a `Ficha` e o `Contador` |

O ponteiro interpola a **própria** posição em vez de a delegar ao `motion` por
duas razões: a pausa tem de o parar a meio do percurso, e o percurso seguinte
parte de **onde ele está** — não de onde o último alvo dizia. Com o `motion` a
tratar disto, um alvo novo a meio de um trajeto fazia o cursor saltar para trás
antes de arrancar.

### 1.2 O anel do toque não é o anel de impacto

`Toque` e `Anel` fazem coisas parecidas e dizem coisas diferentes: o de impacto
diz «uma coisa aterrou aqui», o de toque diz «alguém carregou aqui». O de toque
vive menos tempo, é maior e arranca de mais perto do centro. Usá-los
indistintamente apagaria a diferença entre uma chegada e um clique.

---

## 2. A linha temporal

### ATO 1 — ESCREVER O VALOR · 5 200 ms

> Intenção: alguém a usar o produto. Não um campo a preencher-se.

| ms | Cue | Movimento |
|---|---|---|
| 0 | `campo` | O campo aparece, vazio, com a borda a acender |
| 300 | `ponteiroEntra` | O cursor aparece **parado**, à direita e a meia altura do palco |
| 460 | `vaiAoCampo` | Desliza até ao campo (800 ms) |
| 1240 | `clicaCampo` | Clica: anel de toque, cursor a afundar (`scale .78`), campo a ganhar foco |
| 1410 | `soltaCampo` | Solta |
| 1720 | `d1` | `2` — e o rato **estaciona**: afasta-se 92 × 54 px e esbate-se |
| 1940 | `d2` | `20` |
| 2140 | `d3` | `200` |
| 2340 | `d4` | `2003` — **a gralha** |
| 2780 | `d5` | `200` — 440 ms depois: o tempo de alguém ver que escreveu um dígito a mais |
| 2980 | `d6` | `2000` |
| 3300 | `formata` | `2 000,00 €` |
| 3560 | `vaiAoBotao` | O cursor regressa e desliza até «Calcular» (660 ms) |
| 4320 | `clicaBotao` | Clica: anel de toque, o botão afunda |
| 4490 | `soltaBotao` | Solta |
| 4720 | `calcula` | O botão passa a «Calculado» e a nota entra na conta |

**O cursor entra parado.** Aparecer já em movimento lê-se como um salto. É o que
o original fazia e está certo.

**O rato estaciona enquanto se escreve.** Sem isso fica em cima do que a pessoa
está a ler. Também era assim no original.

### ATO 2 — REPARTIR · 2 500 ms

| ms | Cue | Movimento |
|---|---|---|
| 0 | `nota` | A nota de 2 000 € acende — é a origem das três fichas |
| 260 | `fichaTeu` | Ficha do que fica contigo |
| 420 | `fichaIRS` | Ficha da retenção de IRS |
| 580 | `fichaSS` | Ficha da Segurança Social |
| 1420 | `assenta` | As três chegaram; os destinos acendem |
| 1620 | `parcelas` | A sub-linha `1 240,40 + 460,00 + 299,60 = 2 000,00` |

As três partem a `PASSO.irmao` (160 ms) porque são partes de uma mesma nota: têm
de estar no ar em conjunto para se lerem como uma repartição, e não como três
acontecimentos sem relação.

### ATO 3 — DATAR · 2 400 ms

> Intenção: separar o que já saiu do que ainda vai sair.

| ms | Cue | Movimento |
|---|---|---|
| 0 | `acordaEstado` | As duas fichas do Estado destacam-se |
| 420 | `dataIRS` | A retenção ganha «já entregue» |
| 510 | `dataSS` | A Segurança Social ganha a data do próximo pagamento |
| 1200 | `contaDias` | Um contador conta os dias que faltam |
| 1800 | `avisa` | A nota do prazo assenta |

Os dois a `PASSO.uno` (90 ms): não são dois acontecimentos, é um só — «isto tem
prazo» — visto duas vezes.

**É o único palco do site com uma data a mover-se.**

### ATO 4 — RESERVAR · 3 000 ms

| ms | Cue | Movimento |
|---|---|---|
| 0 | `abreReserva` | A caixa «reservado» abre, a tracejado |
| 460 | `moveIRS` | A retenção entra na reserva |
| 620 | `moveSS` | A Segurança Social entra na reserva |
| — | — | **SILÊNCIO · 380 ms** (`PASSO.outro`) |
| 1640 | `desceDisponivel` | O «disponível para gastar» **desce** de 2 000 € para 1 240,40 € |
| 2500 | `resolve` | A nota final: quem gasta o recibo inteiro paga a SS com o dinheiro do mês seguinte |

**O silêncio antes da descida é o beat de que este ato depende.** É a única coisa
da cena que anda para trás, e tem de aterrar.

---

## 3. O que este palco proíbe

- **Escrever sem alguém ter clicado.** A mão é o palco, não um enfeite dele.
- **Um cálculo sem alguém o mandar fazer.** O botão existe para o cursor o
  clicar; sem ele, o resultado aparece sozinho e isto deixa de ser uma
  demonstração do produto para ser uma animação por cima dele.
- **Somar no ato 4.** Este ato tira. Somar aqui devolve o palco à cascata de
  deduções que ele existe para substituir.
- **Uma cadeia de temporizadores.** Um relógio, e a pausa pára-o.
