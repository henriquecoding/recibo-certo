# Desempenho dos palcos

## Estado atual: um relógio por cena

`src/components/palco/frame.ts` é a única fonte de
`requestAnimationFrame` dos palcos da homepage. Beats, fichas, contadores e
ponteiro subscrevem o mesmo `delta`:

- React state muda apenas em beats, fim de ato e ações da pessoa;
- números, fichas e ponteiro interpolam por `ref`/estilo;
- anel e toque usam animações CSS no compositor;
- pausa suspende a fonte comum sem reiniciar progresso;
- `visibilitychange` e `IntersectionObserver` suspendem a cena;
- ao retomar, o primeiro `delta` é zero, portanto o tempo oculto não causa
  saltos;
- sem subscritores ou no unmount, o único rAF é cancelado;
- a moldura marca `data-palco-suspenso`, pausando também animações CSS fora do
  viewport;
- `prefers-reduced-motion` serve o estado final completo sem arrancar relógio.

`HeroPreco`, `PalcoDescobrir`, `MolduraPalco` e o hero da bússola usam este
runtime. Os controlos de pausa/replay, drag, teclado, leitor de ecrã e a região
`aria-live` permanecem contratos funcionais, não opções de desempenho.

## As três licenças para arrancar

`arranque.ts` é a disciplina de quando uma cena tem direito a começar. São
três condições, e todas têm de ser verdade:

1. **está no ecrã** (`IntersectionObserver`, margem de 120 px);
2. **a troca de foco que a trouxe já assentou** (`rc:foco:content-commit`);
3. **o browser teve um momento livre** (`requestIdleCallback`, timeout 1 200 ms).

A segunda é recente e existe por medição. As outras duas chegavam na CARGA,
onde a thread está mesmo ocupada e o `requestIdleCallback` espera. Numa TROCA
de foco é o contrário: o palco de destino monta já dentro do ecrã, portanto a
primeira licença passa na frame seguinte, e logo a seguir ao commit há um
instante ocioso, portanto a terceira também. Media-se
`first-animation-frame` a coincidir com `content-commit` — a cena a arrancar
dentro da tarefa que ainda estava a montar a página. Depois da terceira
licença, a mesma troca põe o primeiro frame **438 ms depois** do commit.

Sem navegação pendente à montagem, a licença é imediata: quem abre a rota
diretamente não espera por um evento que não vai acontecer. Há um limite de
2 000 ms para o caso de uma navegação que nunca confirma — uma cena presa no
estado final para sempre seria trocar um defeito por outro.

`PalcoDescobrir` e `HeroPreco` têm máquina de estados própria e tinham ficado
de fora desta disciplina: rebobinavam à montagem. São precisamente os palcos
de `/` e de `/inicio/preco`, os dois de onde mais se sai e para onde mais se
entra. Passam agora pelas mesmas três licenças.

## Sair de um foco pára a cena que fica para trás

O relógio ouve `rc:foco:navigation-start` e cancela o `requestAnimationFrame`
na mesma tarefa do evento, sem tocar em estado.

Isto vivia no `usePalco` e respondia com `setParado(true)`. Duas consequências:
os dois palcos com máquina própria não passavam por lá — continuavam a animar
durante a troca inteira, a competir com a montagem do destino — e, onde havia
listener, parar custava um render completo do palco que está a desaparecer,
trabalho novo dentro da janela em que o orçamento é de 100 ms.

Quem retoma é um sinal explícito de vida: a pessoa a carregar em «Retomar»
(mudança de `parado`) ou uma cena a reinscrever-se no relógio («Rever», régua
de atos). Uma navegação abortada deixa a cena parada, como antes.

## Instrumentação

O primeiro frame útil de cada cena cria
`rc:foco:first-animation-frame`, com rota e identificador do palco. O
benchmark mede os primeiros dois segundos a partir dessa marca:

- FPS efetivo;
- frames acima de 32 ms;
- long tasks e TBT;
- tempo entre commit do foco e primeiro frame.

Budget: ≥55 FPS em cena preparada/visitada e ≥50 FPS no arranque frio sob o
cenário de laboratório. Movimento reduzido é medido separadamente e não recebe
um FPS artificial.

## Resultados históricos — não são baseline corrente

Antes da consolidação, uma auditoria com Chromium e CPU 6× mediu bloqueio
semelhante com e sem animação, mas mais frames perdidos quando a cena arrancava
dentro do pico de hidratação. Esses números explicaram duas causas diferentes:

1. o piso do layout/hidratação tornava a entrada cara;
2. loops concorrentes pioravam a fluidez depois do arranque.

Também foram testadas duas abordagens que não ficaram:

- carregar `domAnimation` depois da montagem acrescentou pedido/render sem
  retirar bytes do pico;
- envolver palcos já renderizados em mais `dynamic()` partiu chunks, mas não
  adiou os bytes e aumentou contabilidade do runtime.

Esses ensaios pertencem ao histórico. A prova corrente vem de
`npm run desempenho:ci`, dos contratos Vitest e do manifesto pós-build.

## Proteções

- `homepage-descobrir-animacao.test.ts` garante um único rAF no scheduler e
  nenhum rAF próprio nos atores;
- `coreografia-preco.test.ts` garante que todos os atores subscrevem o relógio
  comum e que pausa continua estrutural;
- `palcos:e2e` mede fim da cena, interação, contraste, long tasks e frames;
- a matriz de CI inclui Chromium, WebKit e Firefox e falha selector/timeout em
  vez de os converter em tempos válidos.
