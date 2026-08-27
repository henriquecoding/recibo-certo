# O peso da homepage — o que se mediu, e o que não era

> Ferramentas: `npm run palcos:e2e` (garantias), `npm run desempenho`
> (rotas), `npm run fronteira` (fronteira do cliente). Tudo o que segue foi
> medido com estrangulamento de CPU do CDP a **6×** — um telemóvel médio —
> e por **mediana de cinco corridas**: uma amostra única nesta máquina
> oscila 40%, e foi a oscilar que uma primeira conclusão saiu errada.

---

## 0. A queixa, e o que ela era mesmo

> «tudo está muito pesado, parece que ao entrar na aba a animação carrega
> toda de uma vez»

A suspeita natural é a animação. **Não é.** Com a animação desligada por
`prefers-reduced-motion` — nenhuma cena a correr, nenhum relógio, nenhum
`requestAnimationFrame` — o bloqueio da thread principal é o mesmo:

| | bloqueio | maior tarefa |
| --- | --- | --- |
| com animação | 1 169 ms | 728 ms |
| **sem** animação | 1 147 ms | 534 ms |

O que a pessoa sente como «a animação carrega toda de uma vez» é a cena a
pôr os seus primeiros frames **dentro** do pico de hidratação. Os frames
perdidos, esses, mudam mesmo: 52 com animação contra 23 sem ela.

São dois problemas com nomes diferentes:

1. **o arranque é caro** — e não é da animação;
2. **a cena arrancava no pior momento possível** — esse é da animação, e
   tem correção.

---

## 1. Onde está o peso, com número

O achado que reorganiza tudo o resto:

| rota | bloqueio | maior tarefa | FCP |
| --- | --- | --- | --- |
| `/termos` — texto puro, sem palco | **807 ms** | 488 ms | 1 324 ms |
| `/?foco=empresa` — com palco, gráfico e régua | 1 338 ms | 591 ms | 1 876 ms |

**60% do custo da homepage é o piso que TODAS as páginas pagam.** Uma
página de termos e condições, sem uma única animação, já custa 807 ms de
bloqueio. Otimizar o palco pode, no melhor dos casos, mexer nos ~530 ms
que sobram.

O JavaScript avaliado no arranque são ~990 KB, e o perfil de CPU diz onde
vão:

```
2 241 ms  (program)          ← analisar e compilar os ~990 KB
  441 ms  F · turbopack      ← o registo de módulos a percorrê-los
```

Repartidos:

| | KB | |
| --- | --- | --- |
| React + ReactDOM | 224 | inevitável |
| Next.js app-router | 151 | inevitável |
| `motion` (`domAnimation`) | 137 | ver §2.1 |
| navegação, rodapé, catálogo, sobreposições | ~200 | do layout |
| a leitura da aba | ~280 | da página |

**512 KB — mais de metade — são framework.** É esse o piso.

---

## 2. Três tentativas, e o que cada uma deu

Estão aqui as que falharam porque a próxima pessoa a olhar para isto vai
ter as mesmas ideias, e merece saber que já foram medidas.

### 2.1 Adiar as features do `motion` — **neutro**

`LazyMotion` recebia `features={domAnimation}`, um import estático: 137 KB
no caminho crítico. Passar a `features={() => import("./features")}`
separa o pedaço — e a medição **piorou** (1 131 → 1 570 ms). A razão é que
o `LazyMotion` pede as features no instante em que monta, a meio da
hidratação: os mesmos bytes, no mesmo pico, agora com um pedido a mais e um
render a mais por cada `m.*` quando elas chegam.

Segunda tentativa, a adiar em vez de partir — `requestIdleCallback` antes
do `import()`: **neutro** (1 198 ms, dentro do ruído). O Next pré-carrega o
pedaço na mesma, e o custo volta para dentro do arranque.

Revertido. Não se guarda complexidade que não paga.

### 2.2 Partir os palcos em pedaços próprios — **pior**

`page.tsx` já importava as cinco leituras com `next/dynamic`. Isso separa
módulos de **servidor** e não move a fronteira do cliente: medido, um
único pedaço de 94 KB trazia os palcos de Empresa, Descobrir, Salário e
Recibos — quatro palcos em qualquer aba.

Pôr `dynamic()` à volta da folha `"use client"` separou-os mesmo: 20
pedaços passaram a 23, e o de 94 KB desapareceu. O bloqueio **subiu**
(1 131 → 1 466 ms). Os mesmos bytes continuam a chegar — o Next
pré-carrega os pedaços de componentes que renderizou no servidor — e o
registo de módulos passa a ter mais trabalho.

**A lição:** partir não é adiar. Enquanto os bytes chegarem todos, mais
pedaços só acrescentam contabilidade.

### 2.3 A cena esperar pela sua vez — **neutro no tempo, certo na mesma**

`src/components/palco/arranque.ts`. Uma cena só rebobina quando as duas
licenças forem verdade: **estar no ecrã** (`IntersectionObserver`) e **o
browser ter tido um momento livre** (`requestIdleCallback` com timeout de
1 200 ms como rede).

Em A/B intercalado — os dois servidores a correr ao mesmo tempo, medições
alternadas — o bloqueio é indistinguível:

```
BASE      1354 · 1652 · 1365 ms
ARRANQUE  1425 · 1354 · 1737 ms
```

**Fica na mesma**, e não pelo tempo de carregamento:

- um palco fora do ecrã deixa de gastar CPU e bateria a demonstrar para
  ninguém — e quando a pessoa chega lá, a cena começa do princípio em vez
  de já ter acabado;
- é o que o pedido dizia: «carregar a animação por etapas».

Guardado por três garantias em `npm run palcos:e2e`.

> **O que NÃO se pode dizer:** que isto tornou o carregamento mais rápido.
> Não tornou, e o número está aqui em cima.

---

## 3. O que falta, e onde está o ganho a sério

O piso de 807 ms é o alvo, e é trabalho de LAYOUT, não de palco. Por
ordem de tamanho:

1. **`AuthProvider` (Supabase) e `SubscricaoProvider` (Stripe)** montam em
   `layout.tsx` para toda a gente, incluindo quem chega anónimo à
   homepage. Um visitante sem sessão não precisa de nenhum dos dois antes
   do primeiro toque.
2. **`ChromeMobile`, `BotaoTopo`, `FeedbackModal`, `Medicao`,
   `DeferredOverlays`** — cinco ilhas de cliente no layout, todas
   hidratadas no mesmo pico, nenhuma necessária para ler a página.
3. **O catálogo de ferramentas (31 KB)** atravessa a fronteira via
   `ChromeMobile → navegacao → ferramentas/catalogo`. É o padrão que
   `docs/desempenho.md` §0 já documenta: um componente de cliente recebe
   DADOS, não importa CATÁLOGOS.

Nenhuma destas é uma mudança de palco, e por isso nenhuma foi feita aqui.

---

## 4. Dois falsos alarmes, registados de propósito

- **«O quiz viaja na homepage.»** Não viaja. O detetor apanhava a string
  `"quiz-fiscal"`, que é o `href` no rodapé. O pedaço da aplicação do quiz
  (`"Configurações do Quiz"`) não é pedido em nenhuma rota da homepage.
- **«O changelog é importado como módulo pelo cliente.»** Não é. O que
  chega é `APP_VERSION` e o texto do popup; as ENTRADAS não. A regra 11 do
  `CLAUDE.md` mantém-se cumprida.

Ficam escritos porque uma medição que se corrige a si própria vale mais do
que uma que só regista os acertos.
