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
- `/termos` é o controlo negativo do piso: o manifesto inicial não pode conter
  Motion nem `@supabase/supabase-js`.

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
- o link reconhece pointer e Enter explicitamente, deduplica keydown→click e
  força Enter pelo App Router em todos os motores, mantendo a posição de scroll.

As marcas disponíveis são:

```text
rc:foco:controller-ready
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
destino. Isto distingue o HTML já pintado da ilha de navegação efetivamente
hidratada, inclusive sob CPU reduzida e hidratação seletiva.
O estado início→commit vive no `window` do documento, não num `let` de módulo,
para continuar único mesmo se o App Router avaliar chunks de rota distintos.
`prefetch-ready:<foco>` persiste enquanto a entrada estiver válida no Router
Cache; assim, um prefetch idle anterior conta como preparação real e não é
repetido só para produzir uma marca nova.

Os eventos analíticos `focus_switch_ack` e `focus_switch_ready` levam apenas
foco, tipo de entrada, preparação e balde de latência; continuam subordinados
ao consentimento e não incluem valores fiscais nem PII.

O componente oficial do Vercel Speed Insights também é um `lazy import` atrás
do opt-in de estatística. Mede apenas estas cinco rotas, volta a confirmar o
consentimento em `beforeSend` e remove query e hash antes do envio. A versão do
consentimento foi incrementada para que uma escolha antiga não autorize o novo
subprocessador retroativamente.

## Medições diretas do build

Build local de produção de 28 de agosto de 2026, versão 2.134.0. São medições
do manifesto/artefacto, não Core Web Vitals de campo:

| rota | JS inicial cru | JS gzip | HTML cru | HTML gzip | RSC gzip |
|---|---:|---:|---:|---:|---:|
| `/` | 398,3 KB | 124,0 KB | 270,5 KB | 39,3 KB | 13,8 KB |
| `/inicio/preco` | 403,9 KB | 127,2 KB | 254,5 KB | 37,2 KB | 12,6 KB |
| `/inicio/recibos` | 389,7 KB | 122,6 KB | 232,5 KB | 34,8 KB | 12,7 KB |
| `/inicio/empresa` | 391,4 KB | 123,2 KB | 251,9 KB | 39,5 KB | 14,1 KB |
| `/inicio/salario` | 385,8 KB | 121,1 KB | 234,9 KB | 35,2 KB | 12,5 KB |
| `/termos` | 325,2 KB | 102,3 KB | — | — | — |

Todas as cinco entradas saem `○ Static`; os manifests passam isolamento de
cena. `/termos` passa o controlo sem Motion e sem SDK Supabase.

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
| JS inicial descodificado | 800 KB |
| JS inicial gzip | 250 KB |
| RSC adicional gzip | 40 KB |
| HTML transferido gzip | 45 KB |
| grafo cliente de outra cena | zero |
| Motion/Supabase inicial em `/termos` | zero |

O benchmark de browser aplica ainda os budgets de FCP/LCP/CLS, ack, ready,
bytes por troca, long tasks, TBT e FPS definidos no relatório mestre.

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
