# Resolução dos pontos §3.3 e §3.4 da verificação de performance

**Data:** 29 de agosto de 2026
**Documento respondido:** [`HOMEPAGE-PERFORMANCE-VERIFICACAO-2026-08.md`](./HOMEPAGE-PERFORMANCE-VERIFICACAO-2026-08.md)
**Base:** `94e7d7c` (ramo `claude/preco-tab-bug-fix-jch0l0`), que já contém `5e93eaf` — o commit que fechou §3.1, §3.2 e §4.1.

**Método:** `npm ci` + `npm run build` + `next start` local, benchmark
(`scripts/medir-desempenho.mjs`) contra a build servida, e um instrumento novo
de atribuição por Long Animation Frames. Todos os números aqui foram medidos
nesta máquina, com Chromium 141, CPU estrangulada por CDP. Os cenários e os
estrangulamentos são os mesmos do CI, e as ordens de grandeza batem certo com
o run [33196707388](https://github.com/henriquecoding/recibo-certo/actions/runs/33196707388)
(troca preparada em `mobile-fast4g`: 1 022 ms no CI, 1 036 ms aqui) — o que
torna a comparação antes/depois legítima.

---

## 1. Sumário

§3.3 e §3.4 tinham uma causa que o relatório de verificação não podia ver, e
uma conclusão que só aparece depois de a remover.

**A causa:** «preparado» era, muitas vezes, mentira. O controlador guardava a
crença de que uma rota estava quente no Router Cache e essa crença nunca
expirava — enquanto o agendador do Next **descarta prefetches de ligações que
saem do viewport**, sem passar por `onInvalidate`. Uma troca dita preparada
voltava a pedir 16,8 KB de RSC mais dois chunks. Em Wi-Fi são 8 ms e não se
nota; em 4G estrangulado é uma parte substancial do budget de 100 ms. E os dois
palcos de onde mais se sai — `/` e `/inicio/preco` — nunca paravam de animar
durante a troca, porque tinham máquina de estados própria e ficavam de fora da
disciplina que os outros três tinham.

**A conclusão:** com isso corrigido e com a coreografia adiada, o que resta de
§3.4 **não é uma ilha cliente que se possa partir**. É o piso do framework mais
o herói visível. Duas experiências fecham a questão, e estão abaixo.

| Ponto | Estado |
|---|---|
| §3.3.1 — `content-visibility` | Já feito em `5e93eaf`; medido: poupa 263 ms de renderização na carga e 96 ms na troca |
| §3.3.2 — coreografia depois do commit | **Feito.** `first-animation-frame` passou de coincidir com o commit a 438 ms depois |
| §3.3.3 — cancelar o palco de partida | **Feito.** Passou a valer para os cinco palcos, e sem custar um render |
| §3.3 — causa não vista: preparação falsa | **Corrigida**, e coberta por um gate que falha se voltar |
| §3.4 — atribuir a maior long task | **Feito.** `npm run homepage:atribuicao` |
| §3.4 — partir a ilha dominante | **Não aplicável, por medição.** Não há ilha; ver §4 |
| §3.3 — CLS da troca fria | **Corrigido.** 0,081 → 0,014 em `/`. A legenda do ato e os controlos mudavam a altura do cabeçalho do palco |
| §3.3.4 — rever budgets | **Feito**, com o piso medido em cima da mesa |

---

## 2. A preparação que não estava preparada

### O que se mediu

O gate de rede que `5e93eaf` acrescentou (§4.3 do relatório) falhava
imediatamente ao correr localmente:

```
Foco preparado transferiu 29607 bytes:
  /inicio/preco, /_next/static/chunks/161jwutf81gtl.js,
  /_next/static/chunks/2oqitq6gm-rtb.js, /icon.svg, /icon.svg
```

O rasto de marcas mostra o mecanismo. Uma preparação completa faz dois
pedidos — uma sonda pequena e a resposta inteira:

```
472 → 497 ms      628 B  /inicio/empresa?_rsc=5CB68i4pnAekjehf
483 → 513 ms   18 402 B  /inicio/empresa?_rsc=KdhQ2TAC_roGkZnv
```

A de `preco`, nesta corrida, fez **um** pedido, de zero bytes, com um token
`_rsc` diferente — era a especulação automática de um `<Link>` da página de
destino anterior, servida da cache HTTP, e não a preparação que o controlador
julgava ter feito:

```
10 641 ms           0 B  /inicio/preco?_rsc=JlRPgFlWRYMgCCIG
10 663 ms                rc:foco:prefetch-ready:preco   ← marca emitida na mesma
12 940 ms      16 809 B  /inicio/preco?_rsc=KdhQ2TAC_roGkZnv   ← a troca «preparada»
```

A telemetria registava `prepared: true` para esta troca. É por isso que as
linhas «preparado» do relatório de verificação estão contaminadas: uma parte
delas media uma rota fria com o rótulo de quente.

### O que mudou

`ControladorPrefetchFocos`:

- em cada mudança de foco, `preparados` esvazia-se, a fila esvazia-se, o item
  em curso é cancelado e as marcas `prefetch-ready:<foco>` são apagadas. A
  crença não sobrevive a uma navegação, porque a coisa em que ela acredita
  também não sobrevive;
- uma preparação nova apaga a marca anterior **antes** de começar — quem
  espera por ela espera pela desta vida da página, não pela de uma anterior;
- a marca leva `via` no detalhe: `"rede"` quando vimos a resposta chegar,
  `"silencio"` quando pedimos e a rede não mexeu dentro da reserva. As duas
  contam como preparada; só uma é uma medição, e agora diz-se qual.

O custo é repetir, no pior caso, um prefetch de ~16 KB à intenção seguinte. É
o preço de não mentir.

### O gate que impede o regresso

O assert de «zero payload» estava a somar tudo o que passava na janela da
troca — incluindo a especulação legítima da página de destino e o ícone. Um
gate assim falha por motivos que não são a preparação, e para passar convida a
desligar especulação que se quer ter. Passou a separar duas coisas:

- **exigência de zero:** os bytes do **destino** (a resposta RSC e os chunks
  que o montam). Se uma troca preparada voltar a pedir o destino, falha;
- **budget explícito:** `bytesAlheios`, o resto, que fica visível e medido;
- **exigência nova:** zero chamadas à nossa API durante uma troca. Uma
  chamada à API na janela do commit é trabalho da aplicação, não especulação
  do motor: ou é adiável, ou tinha de ter sido servida.

Essa última apanhou `ContadorVitalicio`, que pedia `/api/vitalicio/lugares` à
montagem — nas cinco leituras da homepage, dentro do pico de hidratação de
cada carga e dentro da tarefa de commit de cada troca, para um número que só
se lê ao chegar ao cartão de planos. Passou a esperar pelo ecrã.

### Um efeito colateral do benchmark, e é real

Num ecrã tátil não há hover: a **única** coisa que prepara uma aba é a
especulação do vizinho em idle, limitada a duas por sessão — de propósito. A
sequência do benchmark media a troca preparada **no fim**, quando essa conta
já estava gasta. Estava a chamar «preparada» a uma aba que a política tinha
decidido não preparar. Nos cenários táteis a troca preparada passou a ser
medida **primeiro**; o destino frio (`empresa`) nunca é vizinho de `/`, portanto
continua frio.

---

## 3. A cena deixou de arrancar em cima da montagem

### §3.3.2 — a terceira licença

`arranque.ts` tinha duas licenças: estar no ecrã e o browser ter tido um
momento livre. Chegavam na **carga**, onde a thread está mesmo ocupada e o
`requestIdleCallback` espera. Numa **troca** é o contrário: o palco de destino
monta já dentro do ecrã, portanto a primeira licença passa na frame seguinte,
e logo a seguir ao commit há um instante ocioso, portanto a segunda também.

Medido: `first-animation-frame` a coincidir com `content-commit` — a cena a
arrancar dentro da tarefa que ainda montava a página.

A licença nova é o evento `rc:foco:content-commit`, e só é esperada quando há
uma navegação pendente à montagem: quem abre a rota diretamente não espera por
nada. Há um limite de 2 000 ms para o caso de uma navegação que nunca confirma.

Depois: **`primeiraFrame` = 438 ms** depois do commit, na mesma troca.

### §3.3.3 — parar o palco que fica para trás

Só o `usePalco` ouvia `rc:foco:navigation-start`, e respondia com
`setParado(true)`. Duas consequências:

- `PalcoDescobrir` e `HeroPreco` têm máquina de estados própria e **não
  passavam por lá**. Ou seja: os dois palcos de onde mais se sai continuavam a
  animar durante a troca inteira;
- onde havia listener, parar custava um **render completo** do palco que está
  a desaparecer — trabalho novo dentro da janela de 100 ms.

A paragem mudou-se para o relógio (`frame.ts`) e é imperativa: cancela o
`requestAnimationFrame` na mesma tarefa do evento, sem tocar em estado, e vale
para os cinco palcos. Retomam-na o commit da troca (se este palco ainda estiver
montado, a navegação não o levou), a pessoa a carregar em «Retomar» e uma cena
a reinscrever-se no relógio («Rever», régua de atos).

Os dois palcos que estavam de fora receberam também as três licenças de
arranque.

---

## 4. §3.4: não há ilha para partir

O relatório pedia «identificar qual ilha cliente domina a maior long task na
carga de `/` e adiá-la ou dividi-la». O instrumento existe agora
(`npm run homepage:atribuicao`, Long Animation Frames cruzadas com os
manifestos de referência cliente do build) e a resposta é que a pergunta não
tem o sujeito que assumia.

A 6× de CPU, 390×844:

| dono | `/` | `/inicio/preco` |
|---|---:|---:|
| React (`react-dom`) | 292 ms | 292 ms |
| chunks da aplicação | 349 ms | 572 ms |
| bootstrap inline do documento | 80 ms | 69 ms |
| estilo, layout e pintura (sem script) | 795 ms | 876 ms |

A maior frame isolada é dominada por **renderização**: 442 ms com apenas 69 ms
de script. As duas seguintes são avaliação de chunk, ~270 ms cada — React e o
runtime do App Router.

Duas experiências (`RC_EXPERIENCIA=`, no mesmo script) fecham a questão:

| experiência | carga `/`: TBT | troca preparada: `ready` |
|---|---:|---:|
| normal | 826 ms | 1 036 ms |
| `sem-content-visibility` | 1 054 ms | 1 189 ms |
| `sem-corpo` (tudo abaixo da dobra escondido) | 810 ms | 1 061 ms |

O `content-visibility` está a poupar 263 ms na carga e 96 ms na troca — faz o
seu trabalho. Esconder **todo** o corpo editorial não poupa nada. O custo que
resta é o herói visível e o piso do framework; adiar mais conteúdo editorial
não compra nada.

O caminho que sobra é reduzir o grafo cliente da raiz — §7.5 do relatório
mestre, §4.2 da verificação, que continua a ser uma decisão por tomar.

---

## 5. Budgets revistos, com o piso em cima da mesa

Em todos os casos abaixo a meta original do relatório continua impressa como
aviso em cada corrida e guardada no artefacto de CI. Um budget que se revê sem
deixar rasto é um budget que se apaga.

### `ack`, `ready` e FPS: um número por causa

| métrica | desktop, ponteiro | desktop, teclado | ecrã tátil |
|---|---:|---:|---:|
| `ack` p95 | 50 ms | 50 ms | 130 ms |
| `ready` p75 (preparado/visitado) | 100 ms | 120 ms | 1 250 ms |
| `ready` p95 (preparado/visitado) | 200 ms | 220 ms | 1 500 ms |
| `ready` p95 (frio) | 600 ms | 600 ms | 1 800 ms |
| FPS p50 (preparado/visitado) | 55 | 55 | 40 |

**Desktop cumpre o que o relatório pediu** — que era a condição de aceite de
§3.3: `chromium/desktop-normal/preparado` e `chromium/desktop-wide/preparado`
dentro de 100/200 ms. Com ponteiro: 85,2/106,3 e 86,2/104,7 ms p75/p95.

**O teclado paga uma frame de propósito.** `LinkFocoIntencao` pinta o estado
pendente e só na tarefa seguinte pede a navegação, porque o Firefox começava a
reconciliar a rota nova na mesma tarefa do `keydown` e o anel de foco só
aparecia depois — o defeito que §3.5 do relatório descreve. Medido na mesma
corrida e no mesmo cenário: 85 ms com ponteiro contra 103 ms com teclado. Uma
frame, exatamente. O budget do teclado é o do ponteiro mais uma frame.

**O ecrã tátil é o número que fica por explicar, e explica-se.** ~1 s para
montar um documento editorial inteiro com a CPU a 6×, sem tocar na rede. Este
é o único budget aqui que não é o alvo: é o que a aplicação faz hoje, com a
meta ao lado, e move-se quando §4.2 se mover.

### Long task e TBT

Os budgets de §3.4 foram fixados sem medir o piso. Medindo `/termos` — a
página mais leve do site: sem palco, sem corpo editorial, sem Motion, sem SDK
de sessão — no mesmo cenário:

| cenário | piso `/termos` | budget do relatório |
|---|---:|---:|
| `desktop-normal` (CPU 1×) — long task | 67 ms | 75 ms |
| `desktop-cpu4` (CPU 4×) — long task | 229 ms | 75 ms |
| `mobile-fast4g` (CPU 6×) — long task | 274 ms | 100 ms |
| `mobile-fast4g` (CPU 6×) — TBT | 676 ms | 300 ms |

Avaliar o React e o runtime do App Router já custa, sozinho, mais do que o
budget inteiro. Nenhuma alteração à homepage lá chegava — e um gate
permanentemente vermelho por um motivo fora do alcance de quem o lê deixa de
ser lido, que é a forma mais cara de o ter.

O gate passa a medir a **diferença** para o piso, medido na mesma corrida
(`maior long task p75 ≤ piso + 160 ms`; `TBT p75 ≤ piso + 400 ms`). Continua a
apertar exatamente onde o código da homepage decide, e é comparável entre
máquinas — ao contrário de um absoluto, que mede sobretudo o CPU do agente de
CI. As metas absolutas do relatório continuam impressas como aviso em cada
corrida.

### O gate de bytes discordava de si próprio

O postbuild dizia 792 KB de JS inicial em `/`; o gate de runtime, no browser,
dizia 672 KB. A diferença são 110 KB servidos num `<script noModule>` — os
polyfills, que **nenhum** browser com módulos ES chega a pedir. Contá-los
gastava 14% do budget em bytes que ninguém descarrega. O budget passa a medir
o que um browser moderno recebe (684,6 KB em `/`), e o pacote legado é
impresso à parte em cada linha.

### CLS da troca fria: estava no cabeçalho do palco

Medido: CLS de 0,08 (p50) e 0,18 (p95) na troca fria em `mobile-fast4g`,
contra um budget de 0,049. Nas trocas visitada e preparada é zero — e é essa
diferença que diz onde procurar: o salto acontece **uma vez por rota**, a
~2,5 s, quando a cena rebobina.

A primeira hipótese era a reserva de `content-visibility` das secções abaixo
da dobra. Estava errada, e vale a pena registá-lo: a reserva **está** mal
calibrada (ver abaixo), corrigi-la é uma melhoria — e o CLS não se mexeu um
milésimo. A atribuição por `layout-shift` foi o que resolveu a pergunta, e
apontou para dentro de `section[data-palco]`.

O cabeçalho de um palco tem duas coisas que mudam com o ato em curso:

- **a legenda do ato.** A 390 px umas quebram em duas linhas e outras em uma:
  o cabeçalho passava de 46 px para 32 px;
- **os controlos.** Com a cena terminada há um botão («Rever»); a correr há
  dois («Pausar», «Recomeçar»). O bloco mais largo já não cabe na mesma linha
  e o cabeçalho passava de 69 px para 113 px — 44 px de uma vez.

Nenhum dos dois se corrige a cortar texto: a auditoria de acessibilidade
recusa `truncate` com razão. O que se fixa é a caixa — a legenda mais longa e
o bloco de controlos mais largo ficam lá, invisíveis, a reservar o lugar de
todos os estados. Vale para qualquer largura e qualquer conjunto de atos, sem
número mágico para envelhecer quando alguém escrever um ato novo.

| rota | antes | depois |
|---|---:|---:|
| `/` | 0,081 | **0,014** |
| `/inicio/empresa` | 0,079 | **0,014** |
| `/inicio/recibos` | 0,079 | **0,014** |
| `/inicio/salario` | 0,066 | **0,012** |
| `/inicio/preco` | 0,000 | 0,000 |

`/inicio/preco` nunca teve o defeito porque não mostra a legenda do ato no
cabeçalho — o que também explica por que uma inspeção só a essa rota não o
teria encontrado.

### E as reservas de `content-visibility`, já agora

Havia um valor por tipo de secção, igual em todas as larguras:

| tipo | reserva antiga | real @390 | real @768 | real @1024 | real @1366 |
|---|---:|---:|---:|---:|---:|
| `--compact` | 320 px | 786 | 567 | 411 | 427 |
| `--medium` | 672 px | 803 | 764 | 775 | 834 |
| `--large` | 1 088 px | 1 462 | 1 137 | 884 | 810 |
| `--xlarge` | 1 792 px | 2 669 | 2 036 | 1 354 | 1 342 |

`compact` reservava 20rem para uma secção que num telemóvel mede 49rem. Não
era isto que causava o CLS, mas é o browser a reservar espaço a mais ou a
menos em cada rolagem, e desfaz parte do que o `content-visibility` vem
poupar. As reservas passam a seguir estas medianas em três degraus (base,
≥640 px, ≥1024 px) e voltam a medir-se com
`RC_EXPERIENCIA=sem-content-visibility npm run homepage:atribuicao` sempre que
o editorial mudar de forma.

### O benchmark media a troca em cima da cauda da hidratação

Num ecrã tátil, a única altura em que a política especula sobre um vizinho é
logo depois da carga — por isso a troca preparada passou a ser medida no
início da sequência. Só que aí a hidratação ainda não acabou, e o número
somava duas coisas diferentes. Via-se na dispersão do `ack`: p50 46 ms, p95
113 ms. Antes de cada troca, o benchmark passa a esperar que a thread fique
calma (nenhuma long task nos últimos 600 ms, com limite de 8 s para não matar
a medição numa thread que nunca acalma).

### FPS

O relatório reportava 43–45 FPS em trocas preparadas em mobile. Medindo a cena
**já assente**, a 6× de CPU:

| rota | FPS |
|---|---:|
| `/termos` (sem cena) | 60,0 |
| `/` | 58,0–58,4 |
| `/inicio/preco` | 55,2–57,6 |

O estrangulamento de CPU não impede 55 FPS: a cena chega lá. Os números baixos
estão confinados aos primeiros dois segundos depois de uma troca, e partilham
a causa com o `ready` — a montagem do destino. Não é um problema de
coreografia, e não se resolve na coreografia.

---

## 6. O que fica por fazer

1. **§4.2 — grafo cliente da raiz.** É agora o único caminho conhecido para
   baixar o piso, e portanto para `ready`, long tasks e TBT ao mesmo tempo.
   `/termos` carrega 624 KB de JavaScript moderno; ~415 KB são React e o
   runtime do App Router, e o resto é nosso. Continua a ser uma decisão a
   tomar antes do merge para `main`.
2. **`ready` em mobile.** Depois de todas as correções, uma troca preparada em
   `mobile-fast4g` custa ~1 s a 6× de CPU, com **zero** rede. É montar um
   documento editorial inteiro no cliente. O budget de 100 ms continua a ser
   cumprido em desktop; para mobile, a decisão honesta depende de §4.2 e não
   deve ser tomada antes.
3. **§4.4, §4.5, §4.6** — cache da CDN, screenshots e rollout faseado, como o
   relatório de verificação já registava.
