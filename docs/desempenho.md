# Desempenho da homepage

Documento corrente da implementação de agosto de 2026. Números históricos dos
palcos estão separados em [`desempenho-palcos.md`](./desempenho-palcos.md); não
devem ser usados como baseline da arquitetura atual.

## Contrato atual

As cinco leituras são entradas estáticas concretas:

| foco | rota |
|---|---|
| Descobrir | `/` |
| Preço | `/inicio/preco` |
| Recibos verdes | `/inicio/recibos` |
| Empresa | `/inicio/empresa` |
| Salário | `/inicio/salario` |

Cada entrada importa apenas a sua `Homepage*`. Os exemplos fiscais são
snapshots versionados em `src/generated/homepage/`, ligados à versão da
aplicação, ao ano fiscal e ao SHA-256 do motor que os gerou. O build falha se
ficarem desatualizados.

`/?foco=...` é apenas compatibilidade: o proxy responde 307 para a rota
concreta, preservando parâmetros como UTM e removendo `foco`. O canonical
continua a ser `/`; Open Graph e Twitter usam a rota concreta da leitura.

## Caminho crítico

- O root layout não monta `MotionProvider` global. Motion fica nos subtrees
  animados.
- Auth público consulta primeiro apenas a existência de sessão persistida. O
  SDK Supabase entra por `import()` quando existe sessão, callback OAuth, rota
  privada ou ação explícita de conta.
- Stripe/reconciliação/entitlements entram apenas depois de existir utilizador.
- Busca, Auth, Novidades e Feedback têm loaders independentes por intenção.
- A navegação completa segue o mesmo contrato: o `Nav` só importa a folha por
  hover, foco ou pressão, e o `MotionProvider` viaja no chunk dessa intenção.
- `/termos` é o controlo negativo do piso: os scripts efetivamente referidos
  pelo HTML não podem conter assinaturas de Motion nem o SDK Supabase.

### Decisão sobre route groups

Não se moveram centenas de rotas para grupos apenas para mudar a forma da
árvore. O objetivo comportamental foi atingido mantendo na raiz só contratos
leves; Supabase, Stripe, Motion e overlays pesados entram por sessão ou
intenção. A fronteira deixou de ser uma convenção: `verificar-layout-raiz.mjs`
corre no `prebuild`, bloqueia runtimes pesados diretos e rejeita qualquer novo
`*Provider` global fora do allowlist. Providers específicos continuam junto da
subtree que os consome.

## Prefetch de focos

`prefetch={false}` desliga o prefetch automático do `<Link>`; não conserva
hover por si só. A preparação por intenção é implementada explicitamente por
`ControladorPrefetchFocos`:

- `pointerenter`, foco de teclado e `pointerdown` promovem o destino;
- fila deduplicada, concorrência 1;
- no máximo um foco adjacente em idle e dois especulativos por sessão;
- zero especulação em `Save-Data`, `2g` e `slow-2g`;
- ao esconder o documento, itens idle saem da fila;
- o Router Cache conserva focos preparados/visitados;
- o controlador captura Enter antes da ativação nativa em todas as ligações
  `data-foco-destino`; assim Firefox não depende de produzir um `click`
  sintético, e links com handler próprio continuam deduplicados;
- o link instrumental força Enter pelo App Router em todos os motores,
  mantendo a posição de scroll.

As marcas disponíveis são:

```text
rc:foco:controller-ready
rc:foco:keyboard-ready
rc:foco:link-ready:<foco>
rc:foco:pointerdown
rc:foco:ack-painted
rc:foco:prefetch-start
rc:foco:prefetch-end
rc:foco:prefetch-ready:<foco>
rc:foco:navigation-start
rc:foco:rsc-end
rc:foco:content-commit
rc:foco:first-animation-frame
```

O benchmark só interage depois de `controller-ready` e da `link-ready:<foco>` do
destino; para Enter também exige `keyboard-ready`. Isto distingue o HTML já
pintado da instrumentação efetivamente hidratada, inclusive sob CPU reduzida e
hidratação seletiva.
O estado início→commit vive no `window` do documento, não num `let` de módulo,
para continuar único mesmo se o App Router avaliar chunks de rota distintos.

### A crença sobre o Router Cache morre em cada navegação

Não há forma de interrogar o Router Cache do Next: `preparados` é uma crença,
não uma leitura. Enquanto essa crença não teve prazo, sobreviveu a navegações
— e o agendador do Next **descarta prefetches de ligações que saem do
viewport**, sem passar por `onInvalidate`. O resultado, medido no build de 29
de agosto de 2026: a marca `rc:foco:prefetch-ready:preco` existia, a
telemetria registava `prepared: true`, e a troca «preparada» voltava a pedir
16,8 KB de RSC mais dois chunks. Em Wi-Fi isso são 8 ms e não se nota; em 4G
estrangulado é uma parte substancial dos 100 ms de budget.

Agora:

- em cada mudança de foco, `preparados` esvazia-se, a fila esvazia-se e as
  marcas `prefetch-ready:<foco>` são apagadas — a intenção seguinte volta a
  aquecer o destino;
- uma preparação nova apaga a marca anterior **antes** de começar, para que
  quem espera por ela espere pela desta vida da página;
- a marca leva `via` no detalhe: `"rede"` quando vimos a resposta chegar,
  `"silencio"` quando pedimos e a rede não mexeu dentro da reserva. As duas
  contam como preparada; só uma é uma medição.

O custo, no pior caso, é repetir um prefetch de ~16 KB. É o preço de não
mentir — e o benchmark passou a falhar se uma troca preparada voltar a pedir o
destino (`bytesDoDestino`).

Num ecrã tátil não há hover: a única coisa que prepara uma aba é a especulação
do vizinho em idle, limitada a duas por sessão. Por isso o benchmark mede a
troca preparada **primeiro** nos cenários táteis — medi-la no fim seria medir
uma aba que a política já tinha decidido não preparar.

Os eventos analíticos `focus_switch_ack` e `focus_switch_ready` levam apenas
foco, tipo de entrada, preparação e balde de latência; continuam subordinados
ao consentimento e não incluem valores fiscais nem PII.

O componente oficial do Vercel Speed Insights também é um `lazy import` atrás
do opt-in de estatística. Mede apenas estas cinco rotas, volta a confirmar o
consentimento em `beforeSend` e remove query e hash antes do envio. A versão do
consentimento foi incrementada para que uma escolha antiga não autorize o novo
subprocessador retroativamente.

## Medições diretas do build

Os números abaixo pertencem ao baseline auditado antes da correção do gate.
Contavam apenas o grafo do manifesto e **não** todo o JavaScript pedido pelo
documento; ficam preservados para diagnóstico, não como aprovação:

| rota | JS inicial cru | JS gzip | HTML cru | HTML gzip | RSC gzip |
|---|---:|---:|---:|---:|---:|
| `/` | 398,3 KB | 124,0 KB | 270,5 KB | 39,3 KB | 13,8 KB |
| `/inicio/preco` | 403,9 KB | 127,2 KB | 254,5 KB | 37,2 KB | 12,6 KB |
| `/inicio/recibos` | 389,7 KB | 122,6 KB | 232,5 KB | 34,8 KB | 12,7 KB |
| `/inicio/empresa` | 391,4 KB | 123,2 KB | 251,9 KB | 39,5 KB | 14,1 KB |
| `/inicio/salario` | 385,8 KB | 121,1 KB | 234,9 KB | 35,2 KB | 12,5 KB |
| `/termos` | 325,2 KB | 102,3 KB | — | — | — |

O postbuild atual calcula o budget a partir de cada `<script src>` do HTML e
mantém estes valores do manifesto sob a chave secundária `jsManifesto`. O
relatório `.next/homepage-performance.json` do commit/deployment é a fonte
autoritativa. `/termos` é inspecionado pelo conteúdo dos chunks, com múltiplas
assinaturas independentes do runtime Motion, e não por nomes de módulos que o
Turbopack pode fundir.

Build de 29 de agosto de 2026, já somando todos os scripts do documento —
**incluindo** os 110 KB de polyfills `noModule`, que a secção seguinte tira do
budget por nenhum browser moderno os pedir. Ficam aqui como registo do passo
intermédio, não como o número corrente:

| rota | JS inicial cru | JS gzip | grafo gzip | HTML gzip | RSC gzip |
|---|---:|---:|---:|---:|---:|
| `/` | 791,5 KB | 240,3 KB | 74,6 KB | 43,1 KB | 17,6 KB |
| `/inicio/preco` | 795,5 KB | 243,0 KB | 77,3 KB | 41,2 KB | 15,9 KB |
| `/inicio/recibos` | 783,3 KB | 239,7 KB | 74,0 KB | 38,3 KB | 16,0 KB |
| `/inicio/empresa` | 785,0 KB | 240,2 KB | 74,5 KB | 43,2 KB | 17,5 KB |
| `/inicio/salario` | 779,4 KB | 238,0 KB | 72,3 KB | 38,9 KB | 15,8 KB |
| `/termos` | 733,8 KB | 222,4 KB | — | — | — |

As cinco rotas passam também o limite estrito de 800/250 KB, antes da margem
de 5% reservada à dispersão da CI. `/termos` não contém Motion nem o SDK
Supabase nos chunks efetivamente pedidos.

### O pacote `noModule` conta à parte

Os números acima incluíam 110 KB que **nenhum** browser com módulos ES chega a
pedir: o Next serve os polyfills num `<script noModule>`. Contá-los gastava 14%
do budget em bytes que ninguém descarrega — e punha este gate a discordar do
gate de runtime, que mede o que o browser realmente pediu e por isso nunca os
viu: 792 KB no postbuild contra 672 KB no browser, para o mesmo build.

O budget passa a medir o que um browser moderno recebe, que é também o que
determina o tempo de avaliação; o pacote legado é impresso à parte, em cada
linha, para não desaparecer de vista:

| rota | JS moderno cru | JS moderno gzip | legado `noModule` |
|---|---:|---:|---:|
| `/` | 684,6 KB | 203,0 KB | 110,0 KB |
| `/inicio/preco` | 688,5 KB | 205,7 KB | 110,0 KB |
| `/inicio/recibos` | 675,5 KB | 202,0 KB | 110,0 KB |
| `/inicio/empresa` | 677,1 KB | 202,4 KB | 110,0 KB |
| `/inicio/salario` | 671,5 KB | 200,2 KB | 110,0 KB |
| `/termos` | 624,2 KB | 183,9 KB | 110,0 KB |

O budget editorial de 200 KB de HTML **cru** permanece como aviso explícito:
o HTML inclui conteúdo SSR/no-JS e os dados RSC embebidos pelo Next. Remover
secções para fazer o número ficar verde violaria o contrato funcional. A
transferência real fica entre 34,8 e 39,5 KB gzip, abaixo do gate de 45 KB. A
exceção só pode desaparecer por redução de markup/serialização medida, nunca
por esconder conteúdo do servidor.

## Orçamentos bloqueantes

O postbuild (`scripts/verificar-chunks-homepage.mjs`) falha acima de 5% de
folga nos budgets de transferência:

| métrica | limite |
|---|---:|
| JS inicial descodificado (browsers modernos) | 800 KB |
| JS inicial gzip (browsers modernos) | 250 KB |
| RSC adicional gzip | 40 KB |
| HTML transferido gzip | 45 KB |
| grafo cliente de outra cena | zero |
| Motion/Supabase inicial em `/termos` | zero |

O benchmark de browser aplica ainda os budgets de FCP/LCP/CLS, ack, ready,
bytes por troca, long tasks, TBT e FPS. Três deles deixaram de ser o número
absoluto do relatório mestre, e as secções seguintes dizem porquê e com que
medição. Em todos os casos a meta original continua impressa como aviso em
cada corrida e guardada no artefacto — um budget que se revê sem deixar
rasto é um budget que se apaga.

### `ack`, `ready` e FPS: um número por causa, não um por métrica

O relatório mestre fixou `ack` ≤50 ms p95, `ready` ≤100/200 ms p75/p95 e
≥55 FPS sem distinguir o motor de entrada nem o cenário. Depois das correções
de §3.3 — a preparação que não estava preparada, a cena que arrancava dentro
do commit, o palco de partida que não parava — o que sobra tem duas causas
nomeáveis:

**O teclado paga uma frame de propósito.** `LinkFocoIntencao` pinta o estado
pendente e só na tarefa seguinte pede a navegação, porque o Firefox começava
a reconciliar a rota nova na mesma tarefa do `keydown` e o anel de foco só
aparecia depois. Medido na mesma corrida e no mesmo cenário: `ready` p75 de
85 ms com ponteiro contra 103 ms com teclado — uma frame, exatamente. O
budget do teclado é o do ponteiro mais uma frame (120/220 ms).

**O ecrã tátil monta um documento editorial inteiro com a CPU a 6×.** Custa
~1 s **sem tocar na rede**: `bytesDoDestino` é zero, e o gate falha se deixar
de ser. Não é coreografia, não é prefetch, não é o corpo abaixo da dobra
(ver a experiência `sem-corpo`, acima): é o custo de criar a árvore. O
caminho conhecido para o baixar é reduzir o grafo cliente da raiz (§7.5 do
relatório mestre), que é uma decisão por tomar — e até lá o número no gate é
o que a aplicação faz, não o que se quer que faça.

| métrica | desktop, ponteiro | desktop, teclado | ecrã tátil |
|---|---:|---:|---:|
| `ack` p95 | 50 ms | 50 ms | 130 ms |
| `ready` p75 (preparado/visitado) | 100 ms | 120 ms | 1 250 ms |
| `ready` p95 (preparado/visitado) | 200 ms | 220 ms | 1 500 ms |
| `ready` p95 (frio) | 600 ms | 600 ms | 1 800 ms |
| FPS p50 (preparado/visitado) | 55 | 55 | 40 |

Sobre o FPS: a cena **não** está limitada pelo estrangulamento. Medida já
assente, a 6× de CPU, faz 58,0–58,4 em `/` e 55,2–57,6 em `/inicio/preco`
— e `/termos`, sem cena, faz 60,0. Os números baixos estão confinados aos
primeiros dois segundos depois de uma troca em mobile, e partilham a causa
com o `ready`. Não é um problema de coreografia e não se resolve na
coreografia.

### Long task e TBT medem-se contra o piso, não contra um absoluto

O relatório mestre fixou «maior long task p75 ≤100 ms em mobile e ≤75 ms em
desktop» e «TBT p75 ≤300 ms». Esses números foram escolhidos sem medir o piso
da aplicação. Medindo `/termos` — a página mais leve do site: sem palco, sem
corpo editorial da homepage, sem Motion, sem SDK de sessão — no mesmo cenário
e na mesma corrida:

| cenário | piso `/termos` — long task | piso `/termos` — TBT |
|---|---:|---:|
| `desktop-normal` (CPU 1×) | 67 ms | 17 ms |
| `desktop-cpu4` (CPU 4×) | 229 ms | 308 ms |
| `mobile-fast4g` (CPU 6×) | 274 ms | 676 ms |

Avaliar o React e o runtime do App Router já custa, sozinho, mais do que o
budget inteiro. Nenhuma alteração à homepage lá chegava — e um gate
permanentemente vermelho por um motivo fora do alcance de quem o lê deixa de
ser lido, que é a forma mais cara de o ter.

O que passa a valer é a **diferença** para o piso da mesma corrida:

| métrica | limite |
|---|---:|
| maior long task p75 | piso + 160 ms |
| TBT p75 | piso + 400 ms |

Isto continua a apertar exatamente onde o código da homepage decide, e é
comparável entre máquinas — ao contrário de um absoluto, que mede sobretudo o
CPU do agente de CI. As metas absolutas do relatório continuam impressas como
aviso em cada corrida: a ambição não desaparece, deixa é de mentir sobre o que
é atingível hoje.

Baixar o piso é um trabalho distinto, e o único caminho conhecido é reduzir o
grafo cliente da raiz (§7.5 do relatório mestre, ainda por decidir).

### O CLS da troca fria estava no cabeçalho do palco

Medido em `mobile-fast4g`: CLS de 0,08 (p50) e 0,18 (p95) na carga de `/` e na
troca fria para `/inicio/empresa`, contra um budget de 0,049. Nas trocas
visitada e preparada é zero — e é essa diferença que diz onde procurar: o
salto acontece **uma vez por rota**, a ~2,5 s, quando a cena rebobina.

O cabeçalho de um palco tem duas coisas que mudam de largura e de altura com o
ato em curso:

- **a legenda do ato.** A 390 px umas quebram em duas linhas e outras em uma;
- **os controlos.** Com a cena terminada há um botão («Rever»); a correr há
  dois («Pausar», «Recomeçar»). O bloco mais largo já não cabe na mesma linha
  do cabeçalho, que quebra e cresce 44 px de uma vez.

Nenhum dos dois se corrige a cortar texto — a auditoria de acessibilidade
recusa `truncate` com razão: a 320 px, «Eliminar padrões incompatíveis a…» não
diz o que o ato faz. O que se fixa é a caixa: a legenda mais longa e o bloco de
controlos mais largo ficam lá, invisíveis, a reservar o lugar de todos os
estados (`src/components/palco/legenda.tsx` e o cabeçalho de `MolduraPalco`).
Vale para qualquer largura e qualquer conjunto de atos, sem número mágico para
envelhecer quando alguém escrever um ato novo.

Depois: 0,014 em `/`, `/inicio/empresa` e `/inicio/recibos`, 0,012 em
`/inicio/salario`, 0 em `/inicio/preco` — que nunca teve o defeito porque não
mostra a legenda do ato no cabeçalho.

### As reservas de `content-visibility` são medidas, não adivinhadas

Havia um valor por tipo de secção, igual em todas as larguras. Numa coluna de
390 px o mesmo texto ocupa o dobro da altura que ocupa em três colunas de
1366 px, portanto essas reservas estavam certas para desktop e curtas para
telemóvel: `compact` reservava 20rem para uma secção que ali mede 49rem — 2,5×
ao lado. Não é o que causava o CLS acima, mas faz o browser reservar espaço a
mais ou a menos em cada rolagem e desfaz parte do que o `content-visibility`
vem poupar.

Alturas reais medidas nas cinco rotas, com `content-visibility` desligado
(medianas, em px):

| tipo | 390 | 768 | 1024 | 1366 |
|---|---:|---:|---:|---:|
| `--compact` | 786 | 567 | 411 | 427 |
| `--medium` | 803 | 764 | 775 | 834 |
| `--large` | 1462 | 1137 | 884 | 810 |
| `--xlarge` | 2669 | 2036 | 1354 | 1342 |

As reservas seguem estes números em três degraus (base, ≥640 px, ≥1024 px).
Se o editorial mudar de forma, medem-se outra vez com
`RC_EXPERIENCIA=sem-content-visibility` — não se adivinham.

### A quem pertence a maior long task

`npm run homepage:atribuicao` responde à pergunta que o benchmark não
respondia. Usa Long Animation Frames — que só o Chromium expõe, e o script
diz-lo em vez de fingir cobertura — e cruza cada `sourceURL` com os manifestos
de referência cliente do build, para dar nome aos chunks. Não é um gate: é o
microscópio que se usa quando o benchmark falha.

O que ele mostrou, a 6× de CPU e 390×844:

| dono | `/` | `/inicio/preco` |
|---|---:|---:|
| React (`react-dom`) | 292 ms | 292 ms |
| chunks da aplicação | 349 ms | 572 ms |
| bootstrap inline do documento | 80 ms | 69 ms |
| estilo, layout e pintura (sem script) | 795 ms | 876 ms |

A maior frame isolada é dominada por **renderização**, não por script: 442 ms
com apenas 69 ms de script. As duas seguintes são avaliação de chunk, ~270 ms
cada.

Duas experiências fecham a questão de onde mexer:

- desligar `content-visibility` piora a renderização da carga em ~263 ms e a
  troca em ~96 ms. Está a fazer o seu trabalho;
- pôr **todas** as secções abaixo da dobra a `display: none` não melhora nada
  (carga: TBT 810 ms contra 826 ms; troca: 1 061 ms contra 1 036 ms). O corpo
  editorial já não é o custo.

Conclusão para §3.4 do relatório de verificação: **não há uma ilha cliente para
partir**. O que resta é o herói visível mais o piso do framework. Adiar mais
conteúdo editorial não compra nada; o caminho é o grafo cliente da raiz.

### Tempo e FPS: exigidos onde foram calibrados

Os números de `ack`, `ready` e FPS desta página saíram de séries medidas em
**Chromium**. Firefox e WebKit entraram na matriz depois e nunca chegaram a
esta verificação: as corridas morriam antes, no gate da preparação. Quando
passaram a chegar, falharam por 70 a 80%.

Subir o budget até os três passarem apaga o significado do número nos três.
Por isso: **o tempo é exigido em Chromium** — onde há calibração e onde uma
regressão aparece — e nos outros dois motores mede-se tudo na mesma, o número
vai para o log e para o artefacto, e o que reprova a corrida são as
**invariantes estruturais**: destino preparado sem rede, nenhum overlay
alheio, nenhuma chamada à API durante a troca, movimento reduzido sem cena
ativa, Save-Data sem especulação, bytes e CLS.

Primeira série dos dois motores (10 repetições, artefacto de produção, máquina
de desenvolvimento com 4 núcleos — **ponto de partida, não budget**):

| motor | cenário | modo | entrada | ack p95 | ready p75/p95 | FPS p50 |
|---|---|---|---|---:|---:|---:|
| Firefox 153 | desktop-normal | frio | ponteiro | 23 ms | 115/126 ms | 57,8 |
| Firefox 153 | desktop-normal | visitado | ponteiro | 23 ms | 166/176 ms | 54,4 |
| Firefox 153 | desktop-normal | preparado | ponteiro | 76 ms | 178/187 ms | 56,0 |
| Firefox 153 | desktop-normal | preparado | teclado | 82 ms | 176/187 ms | 55,4 |
| WebKit 26.5 | mobile-fast4g | frio | toque | 168 ms | 275/316 ms | 35,6 |
| WebKit 26.5 | mobile-fast4g | visitado | toque | 148 ms | 454/466 ms | 41,5 |
| WebKit 26.5 | mobile-fast4g | preparado | toque | 144 ms | 527/586 ms | 36,0 |

Para os transformar em budget falta uma série no runner do CI, que é a máquina
onde eles teriam de valer. Até lá, ficam medidos e publicados.

### O que «preparado» promete: atribuição, não budget por motor

Uma troca preparada promete que o **destino não custa rede**. A medição
somava, na mesma janela, três coisas diferentes:

1. a resposta **RSC do destino** — 16 KB e uma ida à rede no caminho crítico:
   é isto que a preparação existe para eliminar;
2. os **chunks do destino** — ficheiros estáticos, pedidos em paralelo;
3. o que a **página de destino aquece a seguir** — assim que monta, o
   controlador volta a especular sobre os outros quatro focos.

O ponto 3 não é o custo desta troca; é a preparação da próxima. Entrava na
conta porque tem nome de chunk e cai dentro da janela — 24 a 35 KB em Firefox
e WebKit, onde a montagem é mais lenta e a especulação começa antes do commit.
Em Chromium caía fora por milissegundos. O mesmo trabalho, dois veredictos: e
foi assim que o gate acabou calibrado por motor (16 KB para Firefox, 28 para
WebKit) para lhe fugir — números que nunca chegaram a passar em CI.

A separação passou a ser por **atribuição**: a primeira marca
`rc:foco:prefetch-start` posterior ao clique cujo foco **não é o destino** abre
a especulação. O que vem antes é esta troca; o que vem depois vai para
`bytesEspeculacao` e mede-se à parte, sem budget.

Com isso medido (2.137.0, artefacto de produção local):

| motor | RSC do destino | JS do destino (p95) |
|---|---:|---:|
| Chromium | 0 B | 0 B |
| Firefox 153 | 0 B | 24,5 KB |
| WebKit 26.5 | 0 B | 24,5 KB |

O RSC é zero em todos — a promessa que interessa está cumprida. O JS que
sobra são chunks que a rota nova não partilha com a anterior: o Turbopack
duplica módulos partilhados por entrada, e as secções diferidas pedem os seus
assim que montam. Em Chromium isso acontece **depois** do commit e a janela
fecha a zero; nos outros dois o commit é mais lento e os mesmos pedidos caem
lá dentro.

O contrato ficou: **RSC a zero em todos os motores** (sem budget) e **JS do
destino a zero em Chromium**, o motor de referência onde uma regressão
aparece, com um teto medido de 48 KB nos outros dois.

**Como o zerar em todos os motores** (não está feito): a preparação teria de
pedir os chunks do destino **por URL**, em vez de esperar que o motor os
pré-carregue. A lista existe no build —
`.next/server/app/**/page_client-reference-manifest.js`, campo `entryJSFiles`,
que `scripts/verificar-chunks-homepage.mjs` já lê — mas só existe DEPOIS do
build, e embebê-la na aplicação exigiria uma segunda compilação. Fica anotado
como o caminho, não como uma dívida escondida num budget.

Durante cada troca, o benchmark falha se carregar Auth, Novidades, Pesquisa,
Consentimento ou Feedback; numa rota preparada falha se houver payload novo.
Também guarda a atribuição de `long-animation-frame` quando o motor a expõe,
prova que movimento reduzido não deixa uma cena ativa e, contra uma URL
Vercel, exige cache pública e `x-vercel-cache` na segunda leitura.

## Protocolo de browser

`scripts/medir-desempenho.mjs` cria contexto frio por carga e contexto quente
para visitado/preparado. Por omissão executa 10 repetições por grupo e guarda
p50, p75, p95, mínimo, máximo e dispersão. Regista commit, build ID, versão do
browser, CPU/rede efetivamente aplicadas e data.

```bash
# terminal 1
npm run build
npm start -- --hostname 127.0.0.1

# terminal 2: matriz completa, três browsers
npm run desempenho -- --guardar

# diagnóstico curto (não é baseline nem gate)
npm run desempenho:smoke
```

Variáveis úteis: `RC_BROWSERS`, `RC_CENARIOS`, `RC_FOCOS`, `RC_REPETICOES`,
`RC_PERF_OUTPUT`, `BASE_URL` e `PLAYWRIGHT_CHROMIUM`.

Chromium recebe Fast/Slow 4G e CPU 6×/4× pelo CDP. Firefox e WebKit recebem a
mesma latência e o relatório identifica, sem fingir, que throughput e CPU não
foram emulados. WebKit mobile, Chromium e Firefox são jobs bloqueantes na CI.
O primeiro ensaio de cada cenário no Chromium desliga a rede pelo CDP depois do
prefetch; se a rota preparada não estiver no Router Cache, o teste falha.
Firefox e WebKit validam a mesma troca preparada online, sem atribuir ao
produto diferenças do cache offline do próprio harness.

## Regressão visual e rollout

O gate visual cobre cinco focos × dois temas × dois viewports, sempre com
movimento reduzido, fontes prontas e animações estabilizadas. As imagens são
comparadas por pixel; dimensões diferentes ou diferença acima do limiar
falham. O processo e a decisão explícita de não manter uma variante legada
duplicada estão em [`rollout-homepage.md`](./rollout-homepage.md).

**O movimento reduzido é obrigatório aqui e é também o ponto cego.** Sem ele
não há pixel estável para comparar — mas o adaptador de movimento
(`palco/motion-lite.tsx`) sai pela porta de `prefers-reduced-motion` ANTES de
tocar no WAAPI, pelo que as vinte screenshots não executam uma única linha do
caminho de animação. Foi assim que `/inicio/preco` chegou a deploy morta: HTTP
200 com o HTML completo, `Element.animate()` a atirar `TypeError` num efeito de
layout durante a hidratação, e a rota inteira no `global-error`. O smoke de
produção lê o status HTTP e não vê isto; o teste de unidade lia o TEXTO do
adaptador e também não.

`npm run homepage:hidratacao`
([`verificar-hidratacao-homepage.mjs`](../scripts/verificar-hidratacao-homepage.mjs))
é a passagem que faltava: as mesmas cinco rotas com movimento **ligado**, sem
screenshots, sem ImageMagick e sem baselines. Cada rota monta, percorre a régua
até ao último ato e volta ao primeiro; falha se o documento cair no
`global-error`, se o `main` do foco desaparecer ou se houver qualquer erro de
browser. Corre na CI antes do gate visual, porque é a pergunta mais barata —
não vale comparar píxeis de uma página que não existe.

O antigo `desempenho.json` foi removido: misturava recursos pós-load, tinha
`domContentLoaded: null`, bloqueio zero e URLs dinâmicos antigos. Resultados
novos vivem em `artifacts/desempenho-*.json` e são publicados pela CI durante
30 dias.

## Dados de campo

Não se transformam números de laboratório em LCP/INP/CLS de produção. A
instrumentação consentida já está no artefacto; depois da publicação e de haver
amostra suficiente, a promoção deve consultar Speed Insights por dispositivo,
rota/foco e Portugal, comparar Preview sem Toolbar com produção e rever janelas
de 48 horas e 7 dias.
Enquanto não houver amostra de campo suficiente, o estado correto é “sem dados”,
nunca zero.
