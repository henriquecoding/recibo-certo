# Painel modular do contabilista — análise de evolução

> Análise profunda do subsistema `dashboard/` do painel de gestão dos
> contabilistas, com pesquisa de referência externa e um plano de evolução.
> Sucede a `PAINEL-CONTABILISTAS-ANALISE.md`, que cobriu o painel inteiro;
> este documento olha só para a **workspace modular** e para o que falta para
> ela deixar de ser «um painel personalizável» e passar a ser um sistema.
>
> Data: 2026-08-17 · Ramo: `claude/dashboard-modular-gestao-3t6zzv`
> Estado da suite: `contabilistas-dashboard.test.ts` — 34 testes, todos verdes.

---

## 0. O que já foi corrigido desde a auditoria anterior

Antes de acrescentar trabalho, convém dizer o que saiu da lista. Verificado no
código, não na memória:

| | Achado anterior | Estado |
|---|---|---|
| B1 | `validarLayout` assinalava sobreposições inexistentes | **Corrigido** — a comparação é por `instanceId` (`layout.ts:307-311`) |
| B2 | Módulos congelados em edição | **Corrigido** — `broker.versao` como prop do `memo` (`broker.ts:125`, `GrelhaEdicao.tsx:386`) |
| B3 | `Escape` anunciava cancelar e não cancelava | **Corrigido** — `origemDoTeclado` repõe a geometria (`GrelhaEdicao.tsx:98, 346-359`) |
| B13 | Broker sem invalidação nem repetição | **Corrigido** — `revalidar()` + `CorpoErro` com «Tentar outra vez» |
| B14 | Resumo por cliente sobre listas truncadas | **Corrigido na página** — RPC `resumo_clientes_do_contabilista`. **Reintroduzido no widget** — ver F2 |
| B9 | Sem guarda de rascunho por gravar | **Hook criado**, aplicado a três ecrãs — **não à workspace**. Ver F4 |
| — | Efeitos dentro de updaters de `setState` | **Em aberto** — ver F8 |
| B19 | Sem menu `•••` no modo normal | **Em aberto** — ver F11 |

O ritmo de correção é bom. O que se segue não é uma repetição.

---

## 1. O que este sistema é — e porque é acima da média

Vale a pena nomear o que está certo, porque a maior parte das propostas abaixo
só faz sentido se não se partir isto.

**A geometria é a unidade de persistência, não o pixel.** `col/row/colSpan/rowSpan`
em `WorkspaceLayoutV2` reconstrói o painel de forma determinística a partir de
quatro inteiros por módulo. É a decisão que faz o painel reaparecer igual em
qualquer largura sem guardar medidas, e é a que torna a migração possível. A
maior parte dos produtos que fazem isto guarda `left: 423px` e paga a conta
mais tarde.

**Um registry, uma verdade.** `modulos.ts` é lido pela biblioteca, pelo
validador, pelo renderer e pelo broker. O espelho em SQL (`dashboard_modulos`)
é a autoridade e há um teste que compara os dois. Um `type` desconhecido é
descartado antes de montar componente nenhum — no cliente **e** no servidor.

**Uma sessão de edição, uma escrita.** Trinta e três arrastos não são trinta e
três pedidos. E concluir sem ter mudado nada não gasta escrita nenhuma, porque
a comparação é por assinatura canónica (`assinaturaCanonica`), não por JSON cru.

**Compare-and-swap por `revision`.** `layout_desatualizado` não é escondido nem
resolvido à força — a pessoa escolhe. Isto está acima do que a maioria dos
painéis modulares faz, que é a última escrita ganhar em silêncio.

**O motor de edição é dinâmico.** Quem só consulta o painel não carrega arrasto,
colisões nem biblioteca. `GrelhaVista` é deliberadamente burra.

**O telemóvel é uma lista, não uma matriz espremida.** E o `usarEcraEstreito`
existe para as *afordâncias* também mudarem, não só o CSS — um menu que aceita
o toque e não faz nada é pior do que não existir. Esta lição está bem aprendida
aqui.

**Fronteira de privacidade explícita no broker.** Nenhum domínio lê `recibos`,
`cenarios` ou `preferencias_fiscais`. As simulações vêm de `partilhas` —
snapshots que o cliente enviou de propósito. O broker lista as fontes uma a uma
em vez de aceitar um loader arbitrário, e isso é uma escolha de arquitetura, não
um detalhe.

### Como se compara com a referência da indústria

O modelo de serialização do Grafana passou de um blob JSON monolítico (v1) para
um modelo estruturado por recurso (v2), com um pipeline de migração no backend
e `schemaVersion` até à versão 42. A lição documentada é que o custo não está em
desenhar o esquema — está em **manter as migrações executáveis fora do ambiente
de build completo**, ao ponto de a API do Grafana guardar o JSON que recebe sem
aplicar migração nenhuma.

O ReciboCerto está num sítio melhor: `migrarV1` é uma função pura, sem
dependências de React nem de Supabase, e `validarLayout` normaliza sempre à
entrada — em `paraVista()`, um layout gravado por uma versão futura é
normalizado em vez de rebentar o painel. **O que falta é o registo**: existe uma
migração V1→V2 e não existe o mecanismo para a próxima. Ver S5.

---

## 2. Falhas verificadas

Tudo o que se segue foi confirmado no código deste ramo.

### F1 · O layout de tablet é calculado, validado, persistido — e nunca aplicado

`derivarTablet()` produz uma colocação para 8 colunas. `validarLayout` normaliza-a.
O SQL valida-a. `WorkspaceWidgetInstance.tablet` viaja na base de dados.

E nenhum componente a lê. `grep -rn "tablet" src/components/contabilistas/dashboard/`
não devolve uma única linha.

`GrelhaVista.tsx:99-100` e `GrelhaEdicao.tsx:306-307` emitem sempre
`gridColumn: ${item.desktop.col} / span ${item.desktop.colSpan}`.

Entretanto, `painel-modular.module.css:21-22`:

```css
@media (max-width: 1023px) {
  .grelha { grid-template-columns: repeat(8, minmax(0, 1fr)); }
}
```

Entre os 640px e os 1023px — iPad em retrato, ecrã dividido, janela estreita num
portátil — a grelha tem 8 colunas explícitas e os módulos continuam a pedir
coordenadas de 12. Um módulo em `col: 9, colSpan: 4` pede `grid-column: 9 / span 4`
numa grelha de 8 faixas: o CSS Grid cria faixas **implícitas** (9 a 12),
dimensionadas por `grid-auto-columns`, que por omissão é `auto`. O resultado é
que as 8 faixas `1fr` encolhem para dar lugar a faixas dimensionadas por
conteúdo, e a linha inteira sai torta.

A vista «Meu dia» por omissão tem três módulos nessa zona (`PRZ-01` em `col 9`,
`DOC-01` em `col 9`, `AVS-01` em `col 7` com `span 6`). Não é um caso de canto: é
a vista que abre por omissão.

**É a falha de maior impacto do subsistema**, e a mais barata de corrigir —
o dado já existe, só não é lido.

### F2 · «Resumo por cliente» conta uma coisa e a página de clientes conta outra

A auditoria anterior levou a agregação para SQL: `/contabilista/clientes` usa
`resumo_clientes_do_contabilista`, e `ResumoCliente.consultasRealizadas` é o
número de consultas **já realizadas**.

O widget homónimo do painel modular (`widgets.tsx:837-878`) não usa essa RPC.
Recompõe em JavaScript, a partir de três domínios do broker:

```ts
const nConsultas = (agenda ?? []).filter((a) => a.clienteId === v.clienteId).length;
```

E `agenda` é `listarAgendamentos({ contabilistaId, desde: inicioDoDia() })`
(`broker.ts:57`), que aplica `gte("inicio", …)` e mais nada
(`dados.ts:795`) — ou seja, consultas **com início de hoje em diante,
qualquer que seja o estado**. Uma consulta cancelada pelo cliente na
próxima terça conta. Uma consulta realizada no mês passado não conta.

A coluna chama-se «Consultas» nos dois sítios e mede coisas quase opostas:
histórico realizado numa, agenda futura por filtrar na outra. Um
contabilista que compare o cartão do painel com a tabela de clientes vê
dois números diferentes para a mesma palavra e não tem como saber qual
está certo. Num produto que vende tranquilidade fiscal, é o pior tipo de
bug: não rebenta, mina a confiança.

A causa é estrutural, não um descuido. O catálogo de domínios do broker foi
construído a partir de «que loaders é que já tenho», e não de «o que é que este
módulo precisa». `resumo_por_cliente` declara três domínios e faz o join na
função de render. O módulo devia declarar `dominios: ["resumo_clientes"]` e o
broker devia ter esse leitor.

### F3 · O contrato de configuração por módulo existe de ponta a ponta e ninguém o usa

`WidgetPresentationConfig` declara `density`, `maxItems`, `showCompleted`,
`sort`, `periodo`, `agrupar`. A allow-list é repetida em `layout.ts:28-30`, é
validada em SQL, tem um código de erro dedicado (`config_com_chave_nao_permitida`)
e um teste («limpa config com dados de cliente»).

E:

```
$ grep -rn "maxItems\|showCompleted\|agrupar" src/components/
(nada)
```

Nenhum componente escreve `config`. Nenhum widget lê `config`. `CorpoDoModulo`
deriva a densidade só da geometria (`densidadeDe(colSpan, rowSpan)`) e ignora
`item.config` por completo.

É uma casa construída à espera de quem lá viva. A defesa está toda montada — a
barreira de PII, a validação em duas camadas, o versionamento (`configVersion`)
— e não há uma única superfície que produza um valor. Isto tem dois custos:
a promessa implícita («um dia dá para configurar») fica por cumprir, e cada
leitor do código paga para perceber um contrato que não faz nada.

### F4 · A workspace é o único ecrã com rascunho que não tem guarda

`usarRascunhoSujo` existe, está bem documentado, e é usado por
`agenda/page.tsx`, `fidelidade/page.tsx` e `perfil/page.tsx`.

A workspace não o usa. Entrar em edição, mover doze módulos, acrescentar dois,
e carregar em «Clientes» na barra lateral — que está permanentemente a um clique,
com nove destinos — descarta tudo sem uma pergunta. É o ecrã com o rascunho
mais caro de reconstruir do painel inteiro, e é o único desprotegido.

O `draft` já existe e `mudou(ativa.layout, draft)` já é a função que responde
«está sujo?». A ligação é de três linhas.

### F5 · Códigos de máquina chegam ao ecrã na gestão de vistas

`guardarLayout` tem um mapa de mensagens (`MENSAGEM_DA_FALHA`, `Workspace.tsx:583`)
que traduz `sem_permissao`, `layout_invalido`, etc.

As RPCs de gestão de vistas não têm equivalente. `criarVista` devolve
`{ erro: r.motivo }` (`dados.ts:134`), e o `Workspace` mostra-o cru:

```ts
if (r.erro) { avisos.erro("Não foi possível criar a vista.", { detalhe: r.erro }); return; }
```

Quando a nona vista é recusada, a pessoa lê literalmente **`demasiadas_vistas`**.
O mesmo vale para `renomearVista` e `definirVistaPrincipal`. O broker já aprendeu
esta lição — `mensagemLegivel()` traduz erros do Postgres precisamente para isto
não acontecer. Falta aplicá-la aqui.

### F6 · `MAX_VISTAS` é uma constante morta

`layout.ts:25` exporta `MAX_VISTAS = 8`. Nenhum ficheiro a importa. O limite real
está só em SQL (`criar_dashboard_vista`, linha 317: `IF v_quantas >= 8`).

Consequência prática: o botão «Nova vista» continua ativo na oitava vista, a
pessoa carrega, faz-se uma ida ao servidor, e volta o erro do F5. O padrão certo
é o que `acrescentar()` já faz para os módulos — verifica `MAX_MODULOS_POR_VISTA`
localmente e explica antes de tentar.

### F7 · Um módulo que rebenta a renderizar leva o painel inteiro

O broker apanha falhas **assíncronas** e transforma-as num `CorpoErro` dentro do
frame. Correto e bem pensado.

O que não está coberto é uma exceção **de render**. Se `ResumoPorCliente` receber
um `vinculo` sem `clienteId`, ou se `GraficoSemana` dividir por zero num caso que
não previmos, a exceção sobe até ao `ErrorBoundary` de `page.tsx:44` — que
envolve a workspace toda. Um módulo defeituoso apaga os outros quinze.

O `CLAUDE.md` já fixa a regra («secções pesadas ficam dentro de um `ErrorBoundary`
para nunca deixarem a página em branco»). Aqui a granularidade certa é o módulo,
não a página: `MolduraModulo` é exatamente a fronteira onde a moldura sobrevive e
só o corpo cai.

### F8 · Efeitos secundários dentro de updaters de `setState` (ainda em aberto)

`aplicar`, `reporPadrao`, `compactar`, `alinharEsquerda` e `arrumar` chamam
`registar(d)` de dentro de `setDraft(d => …)`. Updaters têm de ser puros. Em
StrictMode (desenvolvimento) são invocados duas vezes e a pilha de Desfazer ganha
entradas duplicadas — «Desfazer» passa a precisar de dois cliques.

Já estava assinalado como observação de arquitetura. Continua lá, e agora tem
mais chamadores do que tinha.

### F9 · Cada chegada de dados re-renderiza a workspace inteira

`Workspace.tsx:83-84`:

```ts
const [, forcar] = useState(0);
useEffect(() => broker.subscrever(() => forcar((n) => n + 1)), [broker]);
```

Cada `avisar()` do broker incrementa estado no topo da árvore. Com a vista «Meu
dia» são 7 domínios distintos; cada um que resolve provoca um render completo de
`Workspace` → `GrelhaVista` → 9 × `Celula` → 9 × `MolduraModulo` → 9 × `CorpoDoModulo`.
Em modo normal `CorpoDoModulo` **não** é memoizado (só `GrelhaEdicao` o memoiza).

Não é uma avaria — é trabalho desperdiçado que cresce com o número de módulos,
exatamente quando o painel fica mais rico. E é o problema que o React tem um
primitivo dedicado a resolver. Ver S2.

### F10 · O painel não tem medição nenhuma

A skill `crescimento-recibocerto` é explícita: uma superfície nova sem evento no
dicionário não devia existir. O dicionário em `src/lib/analytics/eventos.ts` tem
`guide_view`, `simulator_*`, `fiz_*`, `accountant_*`, `header_search_*`.

Não tem um único evento do painel de gestão. Não sabemos:

- quantos contabilistas chegam a entrar em modo de edição;
- que módulos são acrescentados e quais são removidos primeiro;
- que vistas por omissão sobrevivem e quais são apagadas;
- que módulos falham a carregar em produção (o `CorpoErro` é invisível para nós);
- se o `Ver tudo` de cada módulo leva mesmo a algum lado.

Dezasseis tipos de módulo e quatro vistas de partida foram desenhados sem um
único sinal a dizer se acertaram. É a decisão mais cara desta lista, porque cada
mês sem medição é um mês de escolhas às cegas.

### F11 · O modo normal não tem o menu `•••` que a documentação promete

`MolduraModulo.tsx:9-11` documenta: «modo normal — ícone, título, e o menu `•••`».
`GrelhaVista.tsx:104` monta a moldura sem `acoes`, e `MolduraModulo` só desenha o
menu se `acoes && acoes.length > 0`.

Não é grave por si — é a divergência entre o que o ficheiro diz de si próprio e o
que faz, num codebase onde os comentários são levados a sério e usados como
documentação. E há coisas que fariam sentido lá: «Atualizar este módulo»,
«Abrir a superfície completa», «Ocultar».

---

## 3. Onde a estrutura pode subir de nível

Cada proposta abaixo tem uma razão externa e uma razão interna. A ordem é de
retorno, não de esforço.

### S1 · Densidade por *container query* em vez de unidades de grelha

**Hoje:** `densidadeDe(colSpan, rowSpan)` decide `compact`/`normal`/`expanded`/`full`
a partir de inteiros de grelha. Funciona no desktop e mente em todo o lado
onde a grelha não é de 12 colunas — que é precisamente o buraco do F1. Um módulo
`colSpan: 6` mede metade do ecrã a 1440px e três quartos a 800px, e recebe a
mesma densidade nos dois.

**A referência:** as *container queries* existem para isto. A recomendação
corrente é usar `container-type: inline-size` como escolha por omissão, media
queries para decisões de página e container queries para adaptação de componente
— «widgets de dashboard mostram detalhe completo em células grandes e resumos
compactos em células pequenas; um componente, zero JavaScript».

**A proposta:** `.celula { container-type: inline-size; }` e `.modulo` a reagir a
`@container`. A densidade passa a ser uma propriedade da largura **real** do
cartão. Isto:

- resolve metade do F1 sem tocar no contrato de layout;
- elimina a duplicação entre `densidadeDe()` (em `modulos.ts`) e
  `tamanhoDaGeometria()` (em `apresentacao.ts`), que hoje usam limiares
  diferentes para responder a perguntas parecidas;
- mantém a etiqueta S/M/L/XL a descrever a geometria guardada, que é o que ela
  deve descrever.

A parte que fica em JavaScript é a que tem de ficar — quantos itens buscar
(`maxItems`), que é decisão de dados, não de CSS.

### S2 · O broker como *external store* do React

`useSyncExternalStore` é o primitivo desenhado exatamente para a forma que o
`Broker` já tem: `subscrever(fn): () => void` **é** a assinatura de `subscribe`;
`estado(dominio)` **é** um `getSnapshot`. Garante que todos os componentes leem o
mesmo snapshot por render (sem *tearing* sob renderização concorrente) e é
compatível com Transitions e Suspense.

A mudança é pequena e o ganho é estrutural:

```ts
export function usarDominio<K extends DominioDados>(broker: Broker, d: K) {
  return useSyncExternalStore(
    useCallback((fn) => broker.subscrever(fn), [broker]),
    useCallback(() => broker.estado(d), [broker, d]),
    () => ({ estado: "a-carregar" } as const),   // snapshot do servidor
  );
}
```

Só quem lê o domínio que mudou re-renderiza (F9), a prop `versao` do `memo`
deixa de ser necessária (`broker.ts:125` documenta-a como uma muleta — e é), e
o terceiro argumento dá um snapshot de servidor estável, que é o que falta hoje
para a workspace poder ser renderizada no servidor.

**Uma armadilha a respeitar:** `estado()` tem de devolver a mesma referência
enquanto nada muda. O `Map` interno já garante isso para `pronto` e `erro`; o
`{ estado: "a-carregar" }` de omissão em `broker.ts:142` cria um objeto novo a
cada chamada e provocaria re-render infinito. Passa a constante congelada.

### S3 · Frescura por domínio, e revalidação ao voltar ao separador

Hoje os dados são lidos uma vez por montagem do painel e nunca mais. Um
contabilista que deixa o painel aberto a manhã inteira — que é o comportamento
esperado de um painel de trabalho — vê números de há três horas sem nada que o
diga.

A prática estabelecida em painéis de decisão é explícita: um indicador de
frescura visível mais um botão de atualização manual; para dados financeiros,
**mostrar o atraso importa mais do que mostrar a frescura** — a interface deve
sinalizar que o dado está atrasado em vez de continuar silenciosamente a
apresentá-lo como atual.

Aqui isto é barato porque o broker já sabe tudo o que é preciso:

- guardar `lidoEm: number` por domínio no `resultado`;
- `revalidar()` já existe — falta chamá-la em `visibilitychange` e em `focus`,
  com um limiar (não revalidar o que foi lido há menos de 60 s);
- na moldura, um `<time>` discreto («há 2 min») quando o dado passa dos N
  minutos, e nada quando é recente. Só aparece quando importa.

**Não recomendo Supabase Realtime para isto.** As Postgres Changes passam por
replicação lógica com latência de 50–200 ms e a recomendação corrente é usar
Broadcast para a maioria dos casos — mas nada disto se justifica para dados que
mudam algumas vezes por hora. Revalidação ao focar é a resposta certa, e não
acrescenta conexões persistentes nem custo por ligação concorrente.

### S4 · Tornar real o contrato de configuração (F3)

A investigação de UX é consistente e desagradável para quem gosta de liberdade:
a flexibilidade ilimitada paralisa; o que funciona é **flexibilidade estruturada**
— categorias predefinidas, arrasto dentro de uma grelha, bibliotecas curadas,
controlo dentro de barreiras, e não uma tela em branco. É exatamente a filosofia
que este painel já segue na geometria e ainda não segue no conteúdo.

Sobre a superfície: para configurações de mais de dois ou três campos, um painel
lateral (*drawer*) é preferível ao modal — foco sem interrupção total, e permite
ver o efeito no painel por trás.

**A proposta concreta:**

1. O registry declara que chaves cada módulo aceita:
   ```ts
   configuravel: ["maxItems", "sort", "periodo"],   // por WidgetDefinition
   ```
   A allow-list global continua a ser a barreira de segurança; esta é a lista de
   *produto*. Sem isto, uma futura folha de configuração ofereceria «agrupar por
   cliente» ao gráfico da semana.
2. Uma entrada «Configurar…» no menu `•••` em modo de edição, que abre um
   *drawer* à direita — o mesmo sítio onde a biblioteca já vive, o que evita um
   terceiro padrão de painel lateral.
3. Os widgets passam a ler `config` com uma omissão derivada da geometria:
   ```ts
   const n = item.config?.maxItems ?? quantos(densidade, {…});
   ```
   Assim nada muda para quem nunca configurar, e a geometria continua a ser a
   omissão inteligente que já é.
4. `configVersion` ganha finalmente uma razão de existir — ver S5.

### S5 · Um registo de migrações, não uma migração

`migrarV1` existe e é boa. O que não existe é o mecanismo para a próxima. A
lição do Grafana é que o custo aparece quando há dez versões e as migrações
vivem entranhadas no ambiente de build.

O que falta é pequeno agora e caro depois:

```ts
// dashboard/migracoes.ts
const MIGRACOES: Record<number, (l: unknown, novoId: () => string) => unknown> = {
  1: migrarV1,
  // 2: migrar2para3, quando existir
};
export function migrarAte(entrada: unknown, alvo = 2) { … }
```

E o mesmo para `configVersion` por módulo: quando o «Estado do trabalho» mudar as
suas opções, quem tiver `configVersion: 1` gravado precisa de um caminho. Uma
função por módulo, registada no `WidgetDefinition`, mantém a migração ao lado da
definição em vez de num `switch` central que ninguém quer tocar.

`validarLayout` já é o sítio certo para chamar isto — é por onde todo o layout
entra, incluindo o que vem do servidor (`dados.ts:37`).

### S6 · Vistas como objeto de primeira classe

Hoje uma vista cria-se, renomeia-se, marca-se como principal e apaga-se. Falta:

- **Duplicar** — `criarVista(nome, copiarDe)` já aceita o parâmetro e a RPC já o
  implementa (`p_copiar_de`). A UI nunca o oferece: `criarVistaNova()` passa
  `ativaId` sempre, o que significa que «Nova vista» já duplica a atual sem o
  dizer. Ou se assume e se chama «Duplicar esta vista», ou se oferece a escolha.
- **Reordenar os separadores.** `ordem` existe na tabela e na RPC; não há forma
  de a mudar.
- **Nome por omissão que signifique algo.** «Vista 5» é o nome que fica para
  sempre. Sugerir a partir do conteúdo («Fiscal (cópia)») é trivial e é o tipo de
  detalhe que separa um produto de um protótipo.

E o que vale mais, se o produto for para escritórios com mais do que um
contabilista: **vistas partilháveis**. A prática corrente em SaaS é dashboards
separados para o indivíduo e para a equipa, com vistas por função definidas sobre
o mesmo modelo de dados. Aqui isso seria: um contabilista sénior publica «Fecho
mensal» como modelo do escritório; os outros adotam-na como ponto de partida,
com uma cópia própria. O `sistema: boolean` que já existe na tabela é metade do
caminho — falta a noção de dono ≠ utilizador.

Isto é uma decisão de produto, não de engenharia, e não deve ser feita antes de
haver medição a dizer se as vistas são sequer usadas (F10).

### S7 · Medição: o que instrumentar, exatamente

Proposta de eventos, na forma do dicionário existente (`PayloadsEvento`), cada um
com a pergunta do painel semanal a que serve — sem isso não entram, é a regra do
próprio ficheiro:

| Evento | Props | Pergunta a que responde |
|---|---|---|
| `painel_vista_abrir` | `vista_tipo` (sistema/propria), `n_modulos`, `viewport_class` | As vistas por omissão sobrevivem? |
| `painel_edicao_iniciar` | `origem` (topo/movel), `n_modulos` | Quantos chegam a personalizar? |
| `painel_edicao_concluir` | `mudou`, `n_adicionados`, `n_removidos`, `duracao_s` | A edição termina ou é abandonada? |
| `painel_modulo_adicionar` | `modulo_tipo`, `origem` (biblioteca/arrasto) | Que módulos faltam ao painel de partida? |
| `painel_modulo_remover` | `modulo_tipo`, `idade_dias` | Que módulos não servem para nada? |
| `painel_modulo_erro` | `dominio`, `classe_erro` | Que domínios falham em produção? |
| `painel_modulo_cta` | `modulo_tipo`, `destino` | Os módulos encaminham para as superfícies? |
| `painel_conflito_revisao` | `resolucao` (recarregar/manter) | Quantas pessoas trabalham em dois sítios? |

Notas obrigatórias: nenhum destes payloads pode transportar `instanceId`, `tag`
associada a cliente, nem contagens que identifiquem uma carteira pequena — a
barreira de PII em `analytics/pii.ts` é quem decide. `painel_modulo_erro` deve
enviar a **classe** do erro (o resultado de `mensagemLegivel`), nunca o texto
cru do Postgres, pela mesma razão que o `CorpoErro` não o mostra.

**Este é o item que desbloqueia todos os outros de produto.** Com três meses de
`painel_modulo_remover` sabe-se quais dos dezasseis tipos merecem existir.

### S8 · Desempenho: `content-visibility` nos módulos fora do ecrã

`GrelhaVista` já adia o *carregamento* dos dados com `IntersectionObserver`
(`rootMargin: 400px`) para módulos não críticos. O que não adia é a
*renderização* do que já foi montado.

`content-visibility: auto` com `contain-intrinsic-size` diz ao browser para saltar
a renderização de conteúdo fora do ecrã, com ganhos documentados de 50–90 % no
tempo de renderização em páginas com muitas secções; `contain-intrinsic-size`
fornece a altura estimada para não haver salto de layout, e a palavra-chave
`auto` faz o browser lembrar-se do último tamanho renderizado.

Aqui a altura estimada é conhecida com exatidão — é `rowSpan × 52 + (rowSpan-1) × 12`.
É a aplicação mais limpa possível desta propriedade:

```css
.celula {
  content-visibility: auto;
  contain-intrinsic-size: auto var(--altura-estimada);
}
```

Com o teto de 24 módulos por vista e vistas que podem chegar às 60 linhas, isto
importa.

### S9 · O menu `•••` no modo normal, e uma paleta de comandos

Para o F11, o conteúdo certo do menu em modo normal: «Atualizar este módulo»
(chama `broker.revalidar(def.dominios)` — já existe), «Abrir [superfície]»
(quando `def.rota` existe) e «Ocultar nesta vista».

Sobre a paleta de comandos (`Cmd/Ctrl+K`): tornou-se expectativa padrão em
produtos SaaS com mais de dez funcionalidades, e o argumento de fundo é que os
menus não escalam. **Aqui recomendo esperar.** O painel tem nove destinos e uma
pesquisa que já foi unificada com a do site (commit `30790fc`). Uma paleta agora
seria um segundo sistema de navegação a competir com um que acabou de ser
arrumado. Reavaliar quando os destinos passarem de quinze, ou quando a medição
mostrar que a pesquisa do painel é usada para navegar e não para procurar.

### S10 · Módulos que faltam — e o que não deve entrar

A skill `crescimento-recibocerto` diz para consolidar antes de alargar, e a
auditoria anterior concluiu o mesmo. Subscrevo: **nenhum módulo novo antes do
F1, F2, F3 e F10.** Mas vale a pena registar o que a pesquisa sugere, para
quando chegar a altura.

Os KPIs que a literatura de gestão de escritórios de contabilidade trata como
essenciais são a taxa de utilização, a taxa de realização, e — o mais relevante
aqui — a **taxa de cumprimento de prazos** («% de trabalhos concluídos antes do
prazo; é aqui que os problemas de capacidade aparecem primeiro») e o
**planeamento de capacidade**, que responde a uma pergunta só: a equipa consegue
dar conta do trabalho que vem aí?

Traduzido para o que este produto tem e pode medir sem inventar nada:

- **Carga da semana** — tarefas com prazo nos próximos 7 dias contra as
  concluídas na semana anterior. Não é «capacidade» no sentido de horas
  disponíveis (não temos essa informação e não a devemos fingir), é carga
  observada contra ritmo observado.
- **Cumprimento de prazos** — das tarefas com prazo que fecharam, quantas
  fecharam a tempo. É um número honesto e derivável do que já está em
  `contabilista_tarefas`.

O que **não** deve entrar, e vale a pena escrever para não se voltar a discutir:
taxa de realização, faturação, rentabilidade por cliente. O ReciboCerto é uma
plataforma de intermediação entre trabalhador independente e contabilista, não
um sistema de gestão de escritório. Os dados não existem, e ir buscá-los mudaria
a natureza do produto e as fronteiras de `routing.ts`.

### S11 · Fronteira de erro por módulo (F7)

Um `ErrorBoundary` dentro de `MolduraModulo`, à volta de `{children}` e só dele —
o cabeçalho, o ícone e o título sobrevivem, e o corpo mostra o mesmo `CorpoErro`
que o broker já usa, com «Tentar outra vez» a remontar o subárvore. O componente
já existe em `src/components/ui/ErrorBoundary`. Isto também dá o gancho natural
para o evento `painel_modulo_erro` do S7.

### S12 · Sobre a acessibilidade do arrasto — o que está certo, e o que a partiria

O WCAG 2.2 acrescentou o critério 2.5.7 («Dragging Movements»): qualquer função
que use arrasto tem de ser possível com um único ponteiro sem arrastar, salvo
quando o arrasto é essencial. A recomendação corrente é caminho sem arrasto,
modelo de interação por teclado, e retorno significativo para tecnologia de
apoio via `aria-live`.

**Este painel cumpre, e cumpre bem:** mover tem entradas no menu `•••` («Mover
para cima/baixo/esquerda/direita»), redimensionar tem tamanhos exatos no mesmo
menu, o grip é focável com modo de mover por `Enter`, `Escape` repõe mesmo a
posição, e cada mudança é anunciada por `aria-live` com uma frase construída
(`anuncioDeMovimento`). Em ecrã estreito as afordâncias que não fariam nada são
removidas em vez de mentirem.

Duas coisas a vigiar:

1. **Se o menu `•••` alguma vez perder as entradas de mover/tamanho**, o critério
   2.5.7 deixa de ser cumprido. Vale um teste que falhe o build — o projeto já usa
   esse padrão noutros sítios.
2. **`aria-pressed` no grip** (`GrelhaEdicao.tsx:367`) comunica o modo de mover,
   mas o `role` implícito de `<button>` com `aria-pressed` descreve um botão de
   alternância, não uma pega de arrasto. O padrão do APG para listas ordenáveis
   é mais próximo do que aqui se faz do que o de *toggle*. Não é uma falha de
   conformidade; é uma imprecisão semântica que confunde quem usa leitor de ecrã
   à primeira vez.

### S13 · Sobre bibliotecas de arrasto — a recomendação é não trocar

Para registo, porque a pergunta há de voltar. Em 2026 o `dnd-kit` é a escolha por
omissão para React (núcleo de ~6 KB, acessível, agnóstico) e o
`pragmatic-drag-and-drop` da Atlassian é o mais rápido e o mais pequeno (< 4 KB),
com um conjunto de ferramentas para ligar fluxos acessíveis.

**Não recomendo adotar nenhum.** O que está feito é arrasto sobre uma grelha
discreta, com colisões resolvidas por regra de produto («o módulo movido muda; os
vizinhos só mudam se for mesmo preciso») e alvo de queda com o tamanho final. Uma
biblioteca genérica não traz nada disto e traria uma abstração entre a intenção e
as quatro coordenadas que se querem escrever. O `CLAUDE.md` é explícito: sem
dependências novas sem motivo. Não há motivo.

---

## 4. Ordem de trabalho sugerida

| # | Trabalho | Falha | Esforço | Porquê primeiro |
|---|---|---|---|---|
| 1 | Aplicar `item.tablet` entre 640 e 1023px | F1 | Baixo | A vista por omissão sai torta em tablet, hoje |
| 2 | Domínio `resumo_clientes` no broker, via RPC | F2 | Baixo | Dois números para a mesma palavra |
| 3 | `usarRascunhoSujo` na workspace | F4 | Muito baixo | Três linhas; evita perder trabalho |
| 4 | Mensagens legíveis + `MAX_VISTAS` no cliente | F5, F6 | Muito baixo | `demasiadas_vistas` está a ser lido por pessoas |
| 5 | `ErrorBoundary` por módulo | F7 | Baixo | Um módulo não pode apagar quinze |
| 6 | Dicionário de eventos do painel | F10 | Médio | Desbloqueia todas as decisões seguintes |
| 7 | `useSyncExternalStore` no broker | F9 | Médio | Remove a muleta `versao`; abre a porta ao SSR |
| 8 | `registar` fora dos updaters | F8 | Baixo | Correção de pureza |
| 9 | Densidade por container query | S1 | Médio | Unifica dois sistemas de limiares |
| 10 | Configuração por módulo (drawer + registry) | F3 | Alto | Só depois de 6 dizer que módulos importam |
| 11 | `content-visibility` nas células | S8 | Baixo | Ganho grosso, uma regra de CSS |
| 12 | Registo de migrações | S5 | Baixo | Barato agora, caro depois |
| 13 | Vistas: duplicar, reordenar, nome sugerido | S6 | Médio | Depois de 6 |
| 14 | Módulos de carga e cumprimento de prazos | S10 | Alto | Só depois de 6 e 10 |

Os itens 1 a 5 são um dia de trabalho e cabem num só PR, com testes de regressão
para cada um. O item 6 devia ser o PR seguinte, sozinho.

---

## 5. O que eu não faria

- **Não adotar biblioteca de arrasto.** Ver S13.
- **Não pôr Supabase Realtime no painel.** Ver S3. Revalidação ao focar responde
  à mesma necessidade sem conexões persistentes.
- **Não acrescentar módulos antes da medição.** Dezasseis tipos já foram
  desenhados às cegas; o décimo sétimo não melhora nada.
- **Não mexer nas fronteiras de privacidade nem nas RPCs.** O broker que lista as
  fontes uma a uma, a ausência de política de UPDATE, o compare-and-swap por
  `revision` — está tudo certo e é o que impede a classe de problema mais cara.
- **Não trazer métricas de escritório** (realização, faturação, rentabilidade).
  Muda a natureza do produto e não há dados para as sustentar.

---

## 6. Fontes consultadas

Padrões de painel e personalização:
[SaaS Dashboard UX Patterns 2026](https://www.gitnexa.com/blogs/saas-dashboard-ux-patterns) ·
[Bento Grid Dashboard Design](https://www.orbix.studio/blogs/bento-grid-dashboard-design-aesthetics) ·
[Dashboard Design Principles (UXPin)](https://www.uxpin.com/studio/blog/dashboard-design-principles/) ·
[SaaS Dashboard Design (Eleken)](https://www.eleken.co/blog-posts/saas-dashboard-design)

Configuração de widgets e superfícies:
[Modal design in UX (LogRocket)](https://blog.logrocket.com/ux-design/modal-ux-best-practices/) ·
[Widget Configuration (Datadog)](https://docs.datadoghq.com/dashboards/widgets/configuration/)

Esquema e migrações:
[Grafana JSON model / schema v2](https://grafana.com/docs/grafana/latest/observability-as-code/schema-v2/) ·
[Dashboard serialization and schema](https://deepwiki.com/grafana/grafana/12.2-dashboard-serialization-and-schema) ·
[Automate dashboard schema version migrations (issue 106977)](https://github.com/grafana/grafana/issues/106977)

Acessibilidade do arrasto:
[Are Drag and Drop functions allowed by WCAG?](https://accessibleweb.com/question-answer/are-drag-and-drop-functions-allowed-by-wcag/) ·
[The Road to Accessible Drag and Drop (Vispero)](https://vispero.com/resources/the-road-to-accessible-drag-and-drop-part-1/) ·
[Drag and Drop Accessibility](https://www.continualengine.com/blog/drag-and-drop-accessibility/)

CSS e desempenho:
[Container queries in 2026 (LogRocket)](https://blog.logrocket.com/container-queries-2026/) ·
[CSS Container Queries: guia completo](https://devtoolbox.dedyn.io/blog/css-container-queries-guide) ·
[content-visibility (web.dev)](https://web.dev/articles/content-visibility) ·
[content-visibility (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility) ·
[What Is CSS Containment (CSS Wizardry)](https://csswizardry.com/2026/04/what-is-css-containment-and-how-can-i-use-it/)

React:
[useSyncExternalStore demystified (Epic React)](https://www.epicreact.dev/use-sync-external-store-demystified-for-practical-react-development-w5ac0) ·
[Beyond useEffect: useSyncExternalStore em React 19](https://techsheet.vercel.app/blogs/beyond-useeffect-mastering-browser-state-with-usesyncexternalstore-in-react-19)

Arrasto (bibliotecas):
[Top 5 Drag-and-Drop Libraries for React in 2026 (Puck)](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) ·
[Pragmatic drag and drop (Atlassian)](https://www.atlassian.com/blog/design/designed-for-delight-built-for-performance) ·
[dnd-kit vs react-beautiful-dnd vs Pragmatic DnD](https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026)

Frescura de dados e tempo real:
[UX Strategies For Real-Time Dashboards (Smashing)](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/) ·
[Fintech Dashboard Design Patterns That Build Trust](https://artofstyleframe.com/blog/fintech-dashboard-design-patterns/) ·
[Supabase Realtime — Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) ·
[Supabase Broadcast](https://supabase.com/docs/guides/realtime/broadcast)

Domínio (gestão de escritórios de contabilidade):
[Accounting Firm KPI Benchmarks](https://www.accountingtekbi.com/insights/accounting-firm-kpi-benchmarks.html) ·
[Capacity Planning for Accounting Firms](https://tidyflow.com/blog/capacity-planning-guide-for-accounting-firms/) ·
[CPA Firm KPIs 2026](https://acculinkcpa.com/blog/cpa-firm-kpis-the-15-metrics-every-accounting-firm-should-track-in-2026) ·
[Canopy vs TaxDome](https://www.getcanopy.com/blog/canopy-vs-taxdome/) ·
[Karbon vs Canopy vs TaxDome](https://unclekam.com/tax-pro-tools/crm-workflow-software/taxdome-vs-karbon-vs-canopy/)

Paleta de comandos:
[Command Palette Pattern (UX Patterns for Developers)](https://uxpatterns.dev/patterns/advanced/command-palette) ·
[Command Palette (SaaSUI)](https://www.saasui.design/glossary/command-palette)
