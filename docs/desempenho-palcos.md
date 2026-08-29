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
