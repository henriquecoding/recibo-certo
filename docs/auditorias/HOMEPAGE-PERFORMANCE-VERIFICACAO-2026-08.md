# Verificação do relatório mestre de performance da homepage

**Data:** 28 de agosto de 2026
**Relatório verificado:** *Relatório mestre — desempenho e instantaneidade da homepage* (27 de agosto de 2026, commit auditado `09517d0`)
**Deploy verificado:** `233b0a5e2d85d69f6b2be7bf4ce922cd39a537f8` — [PR #160](https://github.com/henriquecoding/recibo-certo/pull/160), ramo `codex/homepage-performance-master`, versão `2.134.0`
**Estado do PR:** *draft*, com base em `claude/homepage-preco-redesign-jf28tk` — **não em `main`**. Nada disto está em produção.

**Método:** `npm ci` + `npm run build` no commit exato, medição direta dos artefactos em `.next/`, leitura dos manifestos de referência cliente, inspeção do conteúdo dos chunks servidos, e leitura dos resultados de CI do mesmo commit (run [33196707388](https://github.com/henriquecoding/recibo-certo/actions/runs/33196707388)).

---

## 1. Sumário

A **arquitetura** que o relatório pediu foi implementada quase toda, e bem. Os **resultados** que o relatório fixou como critério de feito **não foram atingidos**, e os três gates de performance criados por este PR estão **vermelhos neste deploy**.

Além disso, encontrei **dois gates que dão verde falso** — dizem que um budget passa quando não passa. Estes são a prioridade absoluta: enquanto existirem, qualquer correção seguinte pode ser declarada boa sem o ser.

| Bloco | Estado |
|---|---|
| Rotas estáticas, isolamento de chunks, snapshots fiscais | Feito e provado |
| Overlays por intenção, prefetch por intenção, redirects legados | Feito e provado |
| Supabase/Stripe fora do piso anónimo, um relógio por palco | Feito e provado |
| Benchmark multi-browser, Speed Insights, documentação corrigida | Feito e provado |
| Budgets de carga (JS, long task, TBT) | **Falha** — CI vermelho |
| Budgets de troca (ack, ready, FPS, CLS) | **Falha** — CI vermelho |
| Gate de chunks e controlo `/termos` | **Verde falso** — medem a coisa errada |
| `content-visibility`, route groups, screenshots, flag de rollout | **Por fazer** |

---

## 2. O que está feito e verificado

Confirmado por medição, não por leitura de código:

- **Cinco entradas estáticas.** `/`, `/inicio/preco`, `/inicio/recibos`, `/inicio/salario`, `/inicio/empresa` saem todas como `○ Static` no build, com `export const dynamic = "error"` a impedir a regressão silenciosa. O `prerender-manifest.json` confirma `compute: "static"` e `response: "complete"`.
- **Isolamento real do grafo cliente.** O gate `postbuild` falha se uma rota referenciar o palco de outra. Medi a consequência prática: trocar de `/` para outro foco traz apenas **11,0–17,2 KB gzip** de JavaScript novo (2 chunks por foco). O objetivo de §7.1 foi cumprido.
- **Snapshots fiscais gerados no build.** `scripts/gen-homepage-focos.mjs` corre os motores reais, grava JSON serializável em `src/generated/homepage/`, e carimba versão, ano fiscal e um SHA-256 de todas as fontes que podem mudar uma resposta. O `prebuild` corre `--check` e falha em drift.
- **Overlays por intenção.** `DeferredOverlays` (um `setMontar(true)` para quatro modais a partir de qualquer `pointerdown`/`keydown`/`touchstart`) foi substituído por `IntentOverlays`, com um gatilho próprio por chunk.
- **Prefetch por intenção.** `ControladorPrefetchFocos` tem fila deduplicada, concorrência 1, no máximo dois especulativos por sessão, bloqueio em `Save-Data`/`2g`/`slow-2g`, `onInvalidate` para reaquecer só se a intenção ainda existir, e apenas um vizinho adjacente em idle após 1 s.
- **URLs legados.** `src/proxy.ts` emite um 307 único, apaga apenas a chave `foco` e preserva UTMs. A decisão de o fazer no Proxy em vez de `next.config.mjs` está documentada no próprio ficheiro (o Next 16 preserva a query nos redirects e criaria um ciclo em Descobrir).
- **Supabase fora do piso anónimo.** `haEvidenciaDeSessao()` decide sem descarregar o SDK; o `import()` só acontece com sessão persistida, callback OAuth, rota privada ou ação explícita de conta.
- **Stripe/entitlements fora do piso anónimo.** `SubscricaoProvider` devolve o contrato Free completo e só faz `lazy(() => import("./subscription-runtime"))` quando existe utilizador.
- **Um relógio por palco.** `src/components/palco/frame.ts` é o único agendador; `HeroPreco`, `PalcoDescobrir`, `atores` e `ponteiro` passaram a ter **zero** `requestAnimationFrame` próprios. Suspende com documento oculto e fora do viewport, e o primeiro `delta` ao retomar é zero.
- **Benchmark refeito.** 3 browsers × 7 cenários × 10 repetições, CPU 4×/6×, viewports 390×844 / 1366×768 / 1440×900, `no-preference` e `reduce` separados, `Save-Data`, prova offline, p50/p75/p95 e dispersão. O `desempenho.json` inválido foi apagado.
- **Speed Insights.** Carregado por `lazy()` e só depois do opt-in estatístico.
- **Documentação corrigida.** `docs/desempenho.md` já afirma que `prefetch={false}` **não** conserva hover.

### Os números do artefacto

Build local no commit `233b0a5`:

| Rota | JS (gate) | HTML cru | HTML gzip | RSC gzip |
|---|---:|---:|---:|---:|
| `/` | 399,3 KB / 124,3 KB gzip | 270,5 KB | 39,3 KB | 13,8 KB |
| `/inicio/preco` | 405,0 KB / 127,6 KB gzip | 254,5 KB | 37,2 KB | 12,6 KB |
| `/inicio/recibos` | 390,8 KB / 122,9 KB gzip | 232,5 KB | 34,8 KB | 12,7 KB |
| `/inicio/empresa` | 392,5 KB / 123,5 KB gzip | 251,9 KB | 39,5 KB | 14,1 KB |
| `/inicio/salario` | 386,9 KB / 121,4 KB gzip | 234,9 KB | 35,2 KB | 12,5 KB |
| `/termos` (piso) | 325,9 KB / 102,6 KB gzip | — | — | — |

**Atenção à coluna «JS (gate)»:** é o número que o `postbuild` imprime, e está errado. Ver §3.1.

### A carga fria ficou boa

Isto merece ser dito, porque é uma vitória real (chromium, p50/p75/p95):

| Cenário | FCP p75 | LCP p75 | Budget LCP |
|---|---:|---:|---:|
| mobile-fast4g, `/` | 440 ms | **1 304 ms** | 2 500 ms |
| mobile-fast4g, `/inicio/preco` | 456 ms | 1 344 ms | 2 500 ms |
| desktop-normal, todas | 244–276 ms | 244–276 ms | 1 800 ms |
| desktop-cpu4, todas | 760–820 ms | 760–820 ms | 1 800 ms |

LCP e FCP estão dentro da **meta excelente** do relatório, não só do budget de aceite. O problema não está em chegar à página; está no que acontece depois.

---

## 3. Correções, por ordem de prioridade

### 3.1 — O gate de budget de JS mede 14 dos 20 scripts (verde falso)

**Prioridade: máxima.** Enquanto isto estiver assim, qualquer melhoria seguinte pode ser declarada boa sem o ser.

**Sintoma.** `npm run build` termina com `[homepage] isolamento, prerender e budgets de transferência aprovados.` e imprime `JS 399.3 KB / 124.3 KB gzip` para `/`. O budget do relatório (§10.1) é ≤800 KB crus / ≤250 KB gzip. Parece folgado.

**Prova.** `scripts/verificar-chunks-homepage.mjs`, função `chunksDoManifesto()` (~linha 92), soma apenas os `entryJSFiles` do `page_client-reference-manifest.js`. Comparei esse conjunto com os `<script src>` do HTML pré-renderizado:

```
gate:      14 chunks → 399,3 KB crus / 124,3 KB gzip
documento: 20 scripts → 938,1 KB crus / 290,0 KB gzip
diferença:  6 chunks → 538,8 KB crus / 165,7 KB gzip
```

Os seis que faltam são o framework, o React, os polyfills e o runtime Turbopack — precisamente o grupo que o relatório contabilizou em §4.2 como «framework, bootstrap, polyfills e global error: 566 117 B / 173 390 B». Não são opcionais: o browser descarrega-os todos.

O gate de runtime **apanha** o problema (`- /: JS inicial >800 KB`, medido pelo browser em 803–821 KB), mas está vermelho e é lento; a tentação de confiar no `postbuild` verde é exatamente o risco.

**Correção.** Em `scripts/verificar-chunks-homepage.mjs`, calcular o JS inicial a partir do conjunto de `<script src>` do HTML pré-renderizado de cada rota (que o script já lê para verificar `main`/`h1`), e aplicar `BUDGETS.jsCru` / `BUDGETS.jsGzip` a esse conjunto. Manter o número do manifesto como métrica secundária — é útil para diagnosticar o grafo da aplicação — mas rotulá-lo como tal.

**Critério de aceite.** Com o código atual, o `postbuild` tem de **falhar** com `/: JS inicial 938,1 KB > 800,0 KB + 5%`. Se passar, o gate continua errado.

---

### 3.2 — O controlo `/termos` diz «sem Motion» e o Motion continua a chegar (verde falso)

**Prioridade: máxima.** É simultaneamente um verde falso, um custo de bytes e uma regressão visual silenciosa.

**Sintoma.** O `postbuild` imprime `[homepage] /termos piso · ... · sem Motion · sem SDK Supabase`. O critério §16 do relatório diz `/termos não carrega Motion por causa do root layout`.

**Prova.** Procurei assinaturas do runtime nos chunks efetivamente referenciados pelo documento de `/termos`:

```
/termos: 3 chunks com runtime de motion — 102,8 KB crus / 37,6 KB gzip
  static/chunks/1b0v7watbu313.js  22,5 KB  [MotionConfigContext, PresenceContext, LayoutGroupContext]
  static/chunks/2m6v5ifhv202y.js  38,0 KB  [MotionConfigContext, PresenceContext, framerAppearId, whileHover]
  static/chunks/0ij-dxc5ah8p7.js  42,3 KB  [PresenceContext, whileHover, willChange, animateVisualElement]
```

Para comparação, o relatório mediu o chunk de motion que chegava a `/termos` em 140 719 B / 46 154 B gzip. Baixou cerca de 25%, mas **não desapareceu**.

**Causa.** A cadeia é:

```
/termos → LegalPage.tsx:187  <Nav />
        → Nav.tsx:12         import MenuCompleto from "@/components/navegacao/MenuCompleto"
        → MenuCompleto.tsx:31 import { m, AnimatePresence } from "motion/react"
```

`MenuCompleto` é a folha «Navegação completa», aberta a partir do cabeçalho em **todas** as páginas públicas. Verifiquei os outros componentes sempre montados (`LancadorBusca`, `MenuConta`, `BarraSecoes`, `CapsulaNav`, `Footer`, `ChromeMobile`, `CoordenadorOverlays`, `SuperficieModal`, `Avisos`, `Confirmar`, `BotaoTopo`, `LegalPage`): **nenhum outro importa `motion`**. `MenuCompleto` é o único ponto de fuga, o que torna a correção pequena.

O gate não o apanha porque `verificar-chunks-homepage.mjs` (~linhas 195–206) procura os caminhos de módulo `/node_modules/motion/` e `/ui/motion/MotionProvider` na lista `clientModules` do manifesto. O Turbopack funde o runtime em chunks partilhados cujo id de módulo não é nenhum desses caminhos.

**Efeito secundário, e é o mais importante.** Ao tirar o `MotionProvider` da raiz, o `MenuCompleto` ficou **sem nenhum `LazyMotion` ascendente em todo o site**:

- `HomepageFocoShell.tsx` renderiza `<Nav />` **fora** do `MotionProvider` (que só envolve `{children}` dentro do `<main>`);
- `src/app/ferramentas/layout.tsx` faz o mesmo — `<Nav />` antes, `<main><MotionProvider>` depois;
- `/termos` não tem `MotionProvider` em cadeia nenhuma.

Sem `LazyMotion`, os `m.div` não recebem features e **a animação de entrada e saída da folha do menu deixou de correr**. Confirmei em browser que o menu abre e é usável — não parte nada — mas paga-se o runtime sem receber a animação. Os bytes ficam, o efeito não.

**Correção.** Duas opções; recomendo a primeira.

1. **Carregar `MenuCompleto` sob intenção**, como se fez com os overlays: `dynamic(() => import(...), { ssr: false })` dentro do `Nav`, montado só quando `menuAberto` passa a verdadeiro, com o `MotionProvider` a viajar no mesmo import (é exatamente o padrão já usado em `IntentOverlays.tsx`). Tira os ~37,6 KB gzip do piso de todas as páginas públicas **e** devolve a animação.
2. Converter os dois `m.div` do `MenuCompleto` para animação CSS, como já se fez em `Avisos.tsx` e `Confirmar.tsx`. Mais barato em bytes, mas perde a animação de saída (o `AnimatePresence` deixa de existir).

**E corrigir o gate:** em vez de procurar caminhos de módulo, procurar as assinaturas do runtime no **conteúdo** dos chunks referenciados pelo documento. Sugestão de assinaturas, validadas nesta verificação: `MotionConfigContext`, `PresenceContext`, `animateVisualElement`, `createDomVisualElement`. Falhar se dois ou mais aparecerem num chunk de `/termos`.

**Critério de aceite.** Com o código atual, o gate corrigido tem de **falhar** em `/termos`. Depois da correção do `MenuCompleto`, tem de passar, e o JS do documento de `/termos` deve cair de 864,7 KB para cerca de 762 KB (≈230 KB gzip).

---

### 3.3 — A troca preparada não é instantânea: 116 ms a 1 022 ms contra um budget de 100 ms

**Prioridade: alta.** É a queixa original do utilizador, e é o que o relatório inteiro existia para resolver.

**Prova.** Budget do relatório (§10.3): troca preparada ≤100 ms p75 e ≤200 ms p95. Medido pelo CI no deploy (p50/p75/p95):

| Browser / cenário | ack | ready | FPS p50 |
|---|---|---|---:|
| chromium desktop-normal, preparado, ponteiro | 11,1 / 11,6 / 12,4 | 95,8 / **116,6** / 123,1 | 60 |
| chromium desktop-normal, preparado, teclado | 8,1 / 9,5 / 11,3 | 100,6 / **148** / 169,6 | 60 |
| chromium desktop-wide, preparado | 12,1 / 12,3 / 13,9 | 94,7 / **107,6** / 123,1 | 60 |
| chromium desktop-cpu4, preparado | 22,5 / 24,7 / 27,8 | 532,6 / **546,7** / 602,3 | 59,4 |
| chromium mobile-fast4g, preparado, toque | 32,4 / 34,7 / 35,3 | 996,3 / **1 022,9** / 1 384,3 | **44,8** |
| chromium mobile-slow4g, preparado, toque | 34,8 / 39,7 / **71,4** | 402 / **429,7** / 1 154,6 | **35,1** |
| webkit mobile-fast4g, preparado, toque | 25 / 29 / **171** | 543 / **563** / 702 | **34,0** |
| firefox desktop-normal, preparado, ponteiro | 16 / 18 / **92** | 197 / **202** / 249 | 55,9 |

**Diagnóstico.** O `ack` (feedback visual imediato) está bom onde a CPU não está estrangulada — 8–12 ms no desktop. A rede também deixou de ser o problema: a troca traz 11–17 KB gzip e a rota está preparada no Router Cache. O que sobra é **montagem e hidratação do palco novo** — exatamente o risco que o próprio relatório levantou em §5, causa P1.3: cada foco é uma página editorial inteira (232–270 KB de HTML cru), e trocá-la é montar um documento, não trocar um painel.

Repare-se que no webkit a troca **visitada** (530/538/546 ms) é mais lenta do que a **fria** (162/189/273 ms). Vale a pena investigar: sugere que o regresso a Descobrir com `goBack` reinicia a coreografia desse palco, e a troca seguinte compete com ela.

**Direções de correção**, por ordem de retorno esperado:

1. **Reduzir o DOM inicial de cada foco.** O HTML cru continua em 232–270 KB contra a meta de 200 KB (§10.1). Secções editoriais abaixo da dobra podiam entrar por `content-visibility: auto` com `contain-intrinsic-size` (§7.8, ainda não implementado — ver §4.1), o que corta o custo de layout e paint na montagem sem tirar conteúdo do HTML servido nem prejudicar SEO ou o funcionamento sem JavaScript.
2. **Atrasar a coreografia do palco novo para depois do commit da navegação.** O `arranque.ts` já espera por viewport e idle na carga inicial; a troca de foco parece não ter a mesma disciplina. Confirmar que o palco de destino não começa a animar dentro da mesma tarefa que faz o commit.
3. **Cancelar de forma agressiva o palco de partida.** Garantir que a desmontagem cancela relógio, observers e efeitos antes de o novo montar — o padrão webkit visitado > frio aponta para trabalho residual.
4. Só depois disto reavaliar os budgets. Se, com o DOM reduzido e a coreografia adiada, o `ready` p75 em `mobile-fast4g` continuar acima de 100 ms, o budget de 100 ms para uma página editorial completa pode ter de ser renegociado com números em cima da mesa — mas essa decisão só é honesta **depois** das três correções acima.

**Critério de aceite.** `chromium/desktop-normal/preparado` e `chromium/desktop-wide/preparado` dentro de 100/200 ms; `mobile-fast4g/preparado` com uma melhoria documentada e um budget explicitamente revisto se não lá chegar.

---

### 3.4 — Long tasks e TBT acima do budget nas cinco rotas

**Prioridade: alta.** É a mesma causa raiz da §3.3, medida na carga em vez da troca.

**Prova.** Falhas do CI, todas as cinco rotas:

- `maior long task p75 > 100 ms` em `mobile-fast4g`
- `TBT p75 > 300 ms` em `mobile-fast4g`
- `long task p75 > 75 ms` em `desktop-normal` **e** `desktop-cpu4`

Que a `desktop-normal`, sem qualquer throttle, tenha long tasks acima de 75 ms diz que há uma tarefa de hidratação grande e indivisível, não um problema de máquina lenta.

**Correção.** Resolver §3.1 (para o budget de JS voltar a ser honesto) e §3.2 (−37,6 KB gzip no piso) reduz o trabalho de parse. Mas o essencial é partir a hidratação: identificar qual ilha cliente domina a maior long task na carga de `/` e adiá-la ou dividi-la. O benchmark já recolhe `maiorLongTask` e `tbt` — falta o passo de atribuir a tarefa a um componente.

**Critério de aceite.** `maior long task p75 ≤100 ms` em mobile e `≤75 ms` em desktop, nas cinco rotas; `TBT p75 ≤300 ms`.

---

### 3.5 — Feedback ao toque acima de 50 ms em mobile e no teclado

**Prioridade: média.**

**Prova.** Budget §16: feedback visual ≤50 ms p95 mesmo sem prefetch.

| Caso | ack p95 |
|---|---:|
| chromium mobile-fast4g, frio | 85,9 ms |
| chromium mobile-slow4g, frio | 115,8 ms |
| chromium desktop-cpu4, frio | 61,7 ms |
| webkit mobile-fast4g, visitado | 145 ms |
| webkit mobile-fast4g, preparado | 171 ms |
| firefox desktop-normal, preparado, teclado | 171 ms |

**Diagnóstico.** O `ack` é medido do `pointerdown` até à pintura do estado pendente, por `requestAnimationFrame`. O estado pendente existe e está bem construído (`aria-busy`, anel de foco, anúncio `aria-live` só após 120 ms). O que o atrasa é a main thread estar ocupada — de novo, §3.4.

Há porém um caso separado: **firefox, teclado, 171 ms**. O caminho de teclado passa por `preventDefault()` + `router.push()` em `LinkFocoIntencao`, mais o listener de captura em `ControladorPrefetchFocos`. Vale confirmar se o estado pendente está a ser pintado antes de `router.push()` iniciar o trabalho de navegação.

**Critério de aceite.** `ack p95 ≤50 ms` em todos os cenários não-`reduced`.

---

### 3.6 — FPS abaixo do mínimo durante a cena em mobile

**Prioridade: média.**

**Prova.** Budget §10.3: ≥55 FPS preparado, ≥50 FPS no arranque frio.

| Caso | FPS p50 | Mínimo |
|---|---:|---:|
| chromium mobile-slow4g, frio | 26,7 | 50 |
| webkit mobile-fast4g, frio | 28,5 | 50 |
| webkit mobile-fast4g, preparado | 34,0 | 55 |
| chromium mobile-slow4g, preparado | 35,1 | 55 |
| chromium mobile-fast4g, preparado | 44,8 | 55 |
| chromium mobile-reduced, frio | 49,4 | 50 |
| chromium desktop-cpu4, preparado, teclado | 52,9 | 55 |

O trabalho de consolidação do relógio (Fase 5) **foi feito** e está correto — um só `requestAnimationFrame` por cena, suspenso fora do viewport e com o documento oculto. Os FPS baixos são consequência de a cena arrancar enquanto a montagem do palco ainda decorre, não de vários agendadores em competição. Resolver §3.3 e §3.4 deve arrastar isto atrás.

Nota: `mobile-reduced` a 49,4 FPS é estranho — com movimento reduzido não deveria haver cena a animar. Vale investigar se algo continua a animar sob `prefers-reduced-motion: reduce`.

---

## 4. Itens do relatório mestre por implementar

### 4.1 — `content-visibility` abaixo da dobra (§7.8)

Não implementado. Não existe uma única ocorrência de `content-visibility` ou `contain-intrinsic-size` em `src/app/globals.css`.

O que foi feito em vez disso — converter animações de `motion` para CSS puro, incluindo revelação progressiva com `animation-timeline: view()` — é bom trabalho, mas resolve outro problema. Como se vê em §3.3, esta é agora provavelmente a alavanca mais direta contra o custo de montagem do palco.

Cuidados que o relatório já assinalou: definir `contain-intrinsic-size` por tipo de secção para não introduzir CLS, e não aplicar a elementos de foco que precisem de estar imediatamente disponíveis para acessibilidade.

### 4.2 — Route groups e layout raiz mínimo (§7.5, Fase 4)

Não implementado. Não existe nenhum `src/app/(publico)/` nem separação privado/admin/contabilista por grupo. O layout raiz continua a montar `AuthProvider`, `SubscricaoProvider`, `CoordenadorOverlays`, `AvisosProvider`, `ConfirmacaoProvider`, `ControladorPrefetchFocos`, `ChromeMobile`, `BotaoTopo`, `Medicao` e `IntentOverlays`.

**Isto é uma divergência aceitável, mas vale registá-la.** O objetivo comportamental foi atingido por outra via: os providers ficaram onde estavam e passaram a carregar tardiamente o que pesa. O `MotionProvider` e o `PerfilProvider` saíram mesmo da raiz. O que não se ganhou foi a fronteira estrutural — a raiz continua a ser o sítio onde se acrescenta um provider por descuido, e nada o impede.

Decisão a tomar: aceitar como está e documentar, ou fazer a separação. Não é urgente face a §3.1–§3.4.

### 4.3 — Assert de rede da primeira interação (§13.3)

Parcialmente implementado. `scripts/medir-desempenho.mjs` tem `validarSaveData()`, que prova que `Save-Data` produz zero prefetch especulativo. **Falta** o resto de §13.3:

- ao tocar numa aba, zero pedidos a `AuthModal`, `Novidades`, `BuscaGlobal` ou `CookieConsent`;
- aba preparada: zero payload de rede;
- nenhum JS de outro palco.

Hoje isto está coberto apenas por `src/lib/__tests__/intent-overlays.test.ts`, que lê o **texto do código-fonte**. É melhor do que nada e apanha uma regressão óbvia, mas não prova comportamento: um `import()` acrescentado a um componente já montado passaria despercebido.

### 4.4 — Teste de `Cache-Control` e `x-vercel-cache` (§13.2)

Não implementado. Também não o consegui verificar manualmente: a preview está atrás do SSO da Vercel, que responde 302 antes de a aplicação ser alcançada, tanto por `curl` como pela ferramenta de fetch da Vercel.

O que **está** provado é que as cinco rotas são pré-renderizadas estáticas no build. O que **falta** provar é que a CDN as serve como tal em produção — nomeadamente que o `matcher` do Proxy, que cobre todas as páginas, não interfere com o cache.

### 4.5 — Screenshots pixel dos cinco focos (§12)

Não implementados. Não há comparação visual claro/escuro × desktop/mobile das cinco leituras. Dado o volume da alteração (113 ficheiros, +5 239/−1 718), é a rede de segurança que falta para garantir que nada de editorial se perdeu.

### 4.6 — Feature flag e rollout faseado (§15)

Não implementado. O trabalho veio num único PR draft, em vez das cinco PRs (A–E) e do rollout 10% → 50% → 100% com `NEXT_PUBLIC_HOME_FOCOS_V2`.

Defensável para uma preview; a considerar antes de promover a `main`, dado que a alteração toca a homepage inteira.

### 4.7 — Meta de HTML cru (§10.1)

Rebaixada a aviso documentado. O gate imprime cinco avisos (`HTML cru 270,5 KB excede a meta editorial de 200,0 KB`) mas não falha, e o corpo do PR assume a decisão. A transferência gzip (34,8–39,5 KB) passa folgadamente o gate de 45 KB.

A decisão é razoável **enquanto** o HTML cru não estiver a causar dano. Como §3.3 sugere que está — é ele que a troca tem de montar —, revisitar em conjunto com §4.1.

### 4.8 — Animação de saída dos avisos e confirmações

Efeito colateral, não pedido pelo relatório. A conversão de `Avisos.tsx` e `Confirmar.tsx` de `motion` para CSS removeu o `AnimatePresence`, e com ele a animação de **saída**. A entrada mantém-se (`rc-aviso-entrada`, `rc-dialogo-entrada`). Verificar se é aceitável ou se se quer recuperar com `@starting-style` / `transition-behavior: allow-discrete`.

---

## 5. Rastreio contra o §16 do relatório mestre

| # | Critério | Estado |
|---|---|---|
| 1 | Cada foco é estático/cacheável | **Cumprido** — `○ Static` nas cinco |
| 2 | Cada foco tem grafo cliente isolado | **Cumprido** — gate ativo; troca traz 11–17 KB gzip |
| 3 | Homepage não carrega SDK Supabase para anónimo | **Cumprido** — por carregamento tardio, não por mover o provider |
| 4 | `/termos` não carrega Motion | **Não cumprido** — 102,8 KB crus / 37,6 KB gzip (§3.2) |
| 5 | Tocar numa aba não monta overlays não relacionados | **Cumprido** no código; falta prova de rede (§4.3) |
| 6 | Foco preparado troca em ≤100 ms p75 / ≤200 ms p95 | **Não cumprido** — 116 ms a 1 022 ms (§3.3) |
| 7 | Feedback visual ≤50 ms p95 sem prefetch | **Não cumprido** em mobile e teclado (§3.5) |
| 8 | Nenhuma troca preparada precisa de função em `iad1` | **Cumprido por construção**; não verificável na preview (§4.4) |
| 9 | `Save-Data` impede especulação | **Cumprido** — implementado e testado em runtime |
| 10 | Nenhum valor fiscal, texto, CTA, layout ou coreografia perdido | **Cumprido** nos dados; falta prova visual (§4.5). Ver §4.8 |
| 11 | Back/Forward, deep link, sem JavaScript e acessibilidade | **Cumprido** — HTML com `main`+`h1`, 307 legado, `aria-current`/`aria-busy`/`aria-live` |
| 12 | WebKit e Chromium no gate com igual poder de bloquear | **Cumprido** — a matriz existe e está a bloquear |
| 13 | Budgets de JS, RSC, long tasks e chunks na CI | **Parcial** — correm, mas o de JS mede a coisa errada (§3.1) |
| 14 | Speed Insights confirma p75 real | **Ligado**, sem dados de campo — não está em produção |
| 15 | Documentação já não afirma que `prefetch=false` conserva hover | **Cumprido** |

---

## 6. Ordem de trabalho sugerida

1. **§3.1** — corrigir o gate de JS. Uma sessão. Sem isto, nada do resto é verificável.
2. **§3.2** — `MenuCompleto` sob intenção, e corrigir o controlo de Motion por conteúdo do chunk. Uma sessão. Ganha ~37,6 KB gzip em todas as páginas públicas e devolve a animação do menu.
3. **§4.1 + §4.7** — `content-visibility` nas secções abaixo da dobra, com `contain-intrinsic-size` por tipo. É a alavanca mais direta contra §3.3 e §3.4.
4. **§3.3 + §3.4** — adiar a coreografia do palco de destino para depois do commit; garantir cancelamento do palco de partida; atribuir a maior long task a um componente e parti-la.
5. **§3.5 + §3.6** — reavaliar depois de 3 e 4; boa parte deve resolver-se por arrasto. Investigar à parte o caso `firefox`/teclado e o `mobile-reduced` a 49,4 FPS.
6. **§4.3 + §4.5** — as duas redes de segurança que faltam, antes de promover.
7. **§4.2 + §4.6** — decisões de estrutura e de rollout, a tomar antes do merge para `main`.

---

## 7. Como reproduzir esta verificação

```bash
git checkout 233b0a5
npm ci
npm run build          # imprime o gate de chunks no postbuild
```

Medir o JS que o documento realmente carrega, por rota — é o número que falta ao gate:

```bash
node -e '
const {readFileSync}=require("fs"),{gzipSync}=require("zlib"),{join}=require("path");
for (const [rota,base] of [["/","index"],["/inicio/preco","inicio/preco"],["/termos","termos"]]) {
  const html=readFileSync(join(".next/server/app",base+".html"),"utf8");
  const srcs=[...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1].replace(/^\/_next\//,"").split("?")[0]))];
  let cru=0,gz=0;
  for(const s of srcs){const b=readFileSync(join(".next",s));cru+=b.length;gz+=gzipSync(b,{level:9}).length;}
  console.log(rota, srcs.length+" scripts", (cru/1024).toFixed(1)+" KB", (gz/1024).toFixed(1)+" KB gzip");
}'
```

Procurar o runtime de Motion no que `/termos` serve:

```bash
node -e '
const {readFileSync}=require("fs"),{join}=require("path");
const sig=["MotionConfigContext","PresenceContext","animateVisualElement","createDomVisualElement","whileHover"];
const html=readFileSync(".next/server/app/termos.html","utf8");
for (const s of new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1].replace(/^\/_next\//,"").split("?")[0]))) {
  const t=readFileSync(join(".next",s),"utf8"), h=sig.filter(x=>t.includes(x));
  if (h.length>=2) console.log(s,(t.length/1024).toFixed(1)+"KB",h.join(","));
}'
```

Matriz completa de desempenho (lenta; é o que a CI corre):

```bash
npm start -- --hostname 127.0.0.1 &
BASE_URL=http://127.0.0.1:3000 RC_BROWSERS=chromium RC_REPETICOES=10 npm run desempenho:ci
```

Resultados de CI do commit verificado, com os JSON de p50/p75/p95 como artefactos (30 dias):
<https://github.com/henriquecoding/recibo-certo/actions/runs/33196707388>
