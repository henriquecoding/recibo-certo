# Handoff — Market Intelligence Engine

> Continuação para outro agente. Lê primeiro
> [`docs/architecture/market-intelligence-engine.md`](../architecture/market-intelligence-engine.md)
> e o
> [`relatório mestre`](../research/RELATORIO-MESTRE-MOTOR-NEGOCIO-PORTUGAL-2026.md).

## Estado do checkpoint

- Data: `2026-08-20`.
- Repositório: `henriquecoding/recibo-certo`.
- Branch: `claude/business-discovery-tool-z6xihz`.
- Versão: `2.93.0`.
- Base: MI-1 (`95b171a`, `b6fffd6`, `86b137a`), com as correções abaixo por cima.
- Deploy manual: nenhum. Merge: nenhum.

## Defeitos de MI-1 corrigidos neste checkpoint

Nenhum destes partia build, testes ou type-check. Todos eram visíveis no ecrã.

### 1. A leitura nacional desaparecia (e a página dizia o contrário)

`REGION_CODE["outra-portugal"]` era `null` e o filtro comparava o código da
observação com `null`. Quem não escolhesse Grande Lisboa ou Península de
Setúbal via **«Falta sinal na tua zona»** enquanto o INE estava, nesse instante,
a responder com a ocupação de Portugal (63,2%). Um número publicável era
descartado e a pessoa informada do contrário.

Correção: a decisão passou para `market/geografia.ts`, com função pura testada.
Uma observação `country` é contexto nacional para qualquer zona; uma regional só
serve a sua NUTS II. A interface mostra as duas, distinguindo-as.

### 2. A zona penalizava a compatibilidade por uma limitação nossa

O piloto turístico declarava `regions: ["grande-lisboa","peninsula-setubal"]`
porque o manifesto começou por mapear duas geografias. Quem escolhesse outra
zona perdia 10 pontos de compatibilidade — por falta de dados nossos, não por
incompatibilidade do modelo. Corrigido: `regions` descreve onde o modelo faz
sentido; a diferença entre zonas vem do valor observado.

### 3. O preço de uma unidade ia para o campo do recibo mensal

`bruto` no `SimuladorIntegrado` é o valor MENSAL («Valor do recibo»), e
`brutoAnual = bruto × 12`. `RecibosVerdesStudio` passava `precoLiquido` (preço
unitário) como `valorInicial` e `precoLiquido × unidades × 12` como anual. Com
volume ≠ 1 os dois discordavam pelo fator do volume — 338,14 €/mês contra
40 576 €/ano — sem nada no ecrã a explicar.

Correção: `market/preco-handoff.ts` faz a conversão, é testada contra o motor
real, e o painel mostra as duas contas («338,14 € por unidade» → «a 10 unidades
por mês, isso dá 3 381,40 € por mês»).

### 4. O valor transferido ficava atrás do «Como queres simular?»

Depois de formar o preço, a página prometia tê-lo transferido e o simulador
abria no seletor de modo. Corrigido: um `valorInicial` válido entra direto no
modo profissional, como já acontecia com `vista === "empresa"`.

### 5. Um id de template escrito à mão dentro da UI

`loading && template.id === "tourism-guest-operations"` era uma regra de dados
num componente. Passou a `templateHasLiveEvidence(template)`, derivada do
`evidencePlan` curado — e há um teste que falha se o plano divergir do registo
de pilotos (falhou, e apanhou drift real).

### 6. `/api/market/pilots` sem guarda

`loadPilotMarketEvidence` degrada cada piloto sozinho, mas uma falha anterior a
isso (Web Crypto, `AbortSignal.timeout`, registo malformado) dava 500 sem
explicação. Agora devolve lista vazia identificada, com cache curta.

### 7. As landings de ferramenta não tinham `<main>`

As 48 rotas sob `/ferramentas` não tinham marco `main`; a home e os guias
tinham. Sem ele, um leitor de ecrã não consegue saltar navegação e breadcrumb.

### 8. A ferramenta não existia sem JavaScript

A rota carregava o estúdio com `ssr: false` — o padrão que o CLAUDE.md reserva
para secções PESADAS (mapas, gráficos). Aqui o componente É a página: o HTML
servido não continha uma única palavra dos cinco dossiers, nem para quem navega
sem JavaScript, nem para um motor de busca, nem para a checklist editorial que
exige conteúdo essencial renderizado no servidor.

Corrigido com SSR real, não com uma cópia do texto: o instante de referência
começa vazio e só é fixado depois da montagem, para servidor e cliente não
discordarem sobre que horas são. Antes da montagem cada cartão mostra o estado
honesto — «ideia por investigar» — e nomeia as fontes que serão consultadas no
dispositivo de quem lê.

### 9. A ferramenta nasceu sem medição e com CTAs escolhidos à mão

A disciplina de crescimento é explícita nas duas coisas, e nenhuma existia:

- **medição obrigatória em fluxos novos.** Não havia como saber se alguém chega
  a abrir um dossier, quanto mais a provar alguma coisa. Ligada em
  `components/negocio/medicao-descoberta.ts`, reutilizando o vocabulário do
  catálogo — `tool_id` novo e `step_id` próprios, zero eventos inventados. Zona,
  competências, capital e a hipótese em teste nunca saem do dispositivo: a
  barreira de `pii.ts` recusaria valores, mas não conhece a combinação zona +
  hipótese + data de venda, que identifica alguém num concelho pequeno.
- **a hierarquia dos CTAs não pertence ao ecrã.** Havia dois links do mesmo peso
  escolhidos pela página. Agora há uma ação principal (formar o preço — o passo
  que falta para a hipótese sair de «candidata»), uma alternativa em texto, e a
  rota comercial que `escolherRota()` devolver, via
  `market/routing-adapter.ts`. Uma hipótese `template`, `stale` ou
  `contradicted` sai como `fora_de_escopo` e a primeira regra do motor fecha
  todas as rotas sozinha — mesmo com uma venda registada.

## As cinco hipóteses, ligadas a sério

Treze séries, cinco operações estatísticas independentes, todas verificadas
contra a API em 2026-08-20.

| Indicador | O que traz | Operação | Usado por |
|---|---|---|---|
| INE `0013314` | ocupação-quarto na hotelaria, NUTS II | inquérito à permanência de hóspedes | turismo |
| INE `0014098` | nascimentos de empresas por forma jurídica | demografia das empresas | turismo, digital, concursos |
| INE `0012909` | índice de envelhecimento | estimativas anuais da população | sénior, transições |
| INE `0012787` | transações de casas por famílias | transações de alojamentos | transições |
| INE `0014044` | emprego em empresas <10 pessoas | contas integradas das empresas | concursos |
| Eurostat `isoc_e_dii` | intensidade digital, micro vs 10–49 | inquérito TIC às empresas | digital |
| Eurostat `isoc_sk_dskl_i21` | competências digitais, 65–74 vs total | inquérito TIC às famílias | sénior |

**Sobre a série de empresas.** A primeira candidata estudada foi a `0008466`
(contas integradas das empresas), rejeitada por estar em NUTS 2013 e terminar
em 2023. A `0014098` é melhor em tudo o que importava: NUTS 2024, referência
2024, publicada em dezembro de 2025, CC BY — e traz o corte «empresa individual
vs sociedade», que é a decisão central deste produto.

**Um erro apanhado a tempo, que vale a pena não repetir.** Ao mapear o
`0014044` presumi que `11A` fosse Grande Lisboa, por analogia. `11A` é **Área
Metropolitana do Porto**. O `expectedName` do manifesto teria posto a linha em
quarentena em vez de rotular dados do Porto como Lisboa — mas confirmar os
códigos contra a API antes de escrever o manifesto é mais barato do que confiar
na rede de segurança.

## O que MI-2 acrescenta

### Dados

- **Cobertura nacional.** O manifesto do INE mapeia Portugal e as nove NUTS II
  de 2024. Os códigos NUTS I (`1`, `2`, `3`) ficam fora de propósito: `2`/`3`
  repetem valor a valor as NUTS II `20`/`30`.
- **Dois pilotos Eurostat novos**, verificados contra a API em 2026-08-20:
  - `isoc_e_dii` — intensidade digital: micro (0–9) **51,65%** vs 10–49
    **71,65%**, PT 2024;
  - `isoc_sk_dskl_i21` — competências digitais básicas: 65–74 anos **20,65%**
    vs total **59,15%**, PT 2025.
- **Registo de pilotos** (`market/pilots.ts`): um manifesto por SÉRIE. O loader
  deixou de ter um piloto escrito à mão e itera o registo.
- `lastTimePeriod=3` nos fetches Eurostat, para o histórico não encher a
  quarentena de anos fora de validade.

### Produto

- **Prova comercial local** (`market/hipoteses.ts` + `store/hipoteses-mercado.ts`):
  entrevistas, orçamentos aceites, pré-vendas, pilotos pagos e vendas.
  `user_validated` e `operating` deixam de ser estados inatingíveis.
- **Gate local** (`market/gate-local.ts`): o mesmo motor, com zona, preço e
  provas do dispositivo.
- **Volta do handoff de preço**: `?h=<opportunity-id>` devolve o veredicto de
  `assessMarketEconomics` à hipótese.
- **Saúde das fontes no ecrã**: estado, data-limite dos dados e quarentena.
- **`npm run descobrir:e2e`**: 37 verificações × 4 combinações (360 px e
  desktop, claro e escuro), com axe — incluindo um contexto com JavaScript
  desligado, que lê o HTML com `content()` (`evaluate` precisaria do JavaScript
  que ali está desligado).

## Invariantes

1. Templates não são oportunidades atuais.
2. Compatibilidade pessoal não é procura.
3. Duas publicações da mesma operação estatística contam uma vez.
4. `retrievedAt` não rejuvenesce `referencePeriod`.
5. Sem licença, unidade, geografia, semântica e SHA-256 não há valor público.
6. Falha de fonte não ativa fallback numérico.
7. Pricing e Business Engines continuam canónicos — não há segundo solver.
8. Perfil, zona, entrevistas e clientes ficam locais por omissão.
9. Entrevista não é prova de mercado. Um piloto pago valida; só repetição +
   contribuição positiva + recebimento provam operação.
10. Onde o modelo funciona ≠ onde temos dados.
11. Não fazer scraping de plataformas contra os termos.

## Verificação

```bash
npm ci
npm run market:check
npx tsc --noEmit
npm test
npm run build
npm audit --audit-level=high
npm run security:boundary
git diff --check

# com `npm start` noutro terminal:
npm run descobrir:e2e
npm run negocio:e2e
```

## Próximo checkpoint recomendado — MI-3

1. **Portal BASE/TED.** É o que falta ao piloto de concursos: hoje só tem
   séries estruturais e o cartão diz, corretamente, que falta um sinal de
   procura. Contar procedimentos elegíveis por CPV e região seria o primeiro
   sinal transacional dessa hipótese.
2. **Um sinal de procura para o acompanhamento sénior.** Mesmo problema: as
   duas séries que tem são estruturais. Nenhuma estatística pública mede
   procura por acompanhamento digital pago; talvez não exista, e nesse caso a
   resposta honesta é a prova local da própria pessoa.
3. Job servidor que publica snapshot assinado atomicamente (`snapshot.ts` já
   existe e está testado; falta o job).
4. Painel interno de source health com alertas de schema e frescura.
5. Transferir um cenário de preço completo — e não só o veredicto — entre as
   duas superfícies.
6. Comparar recibos verdes/empresa a partir da mesma hipótese sem repetir inputs.
7. Granularidade municipal onde a fonte a publique, mantendo a lista fechada
   (nunca morada).

## Ficheiros principais

```text
docs/architecture/market-intelligence-engine.md
docs/research/RELATORIO-MESTRE-MOTOR-NEGOCIO-PORTUGAL-2026.md
src/lib/negocio/market/            (tipos, registry, geografia, freshness,
                                    integridade, evidence-gate, gate-local,
                                    hipoteses, connectors/, quarantine,
                                    snapshot, pricing-adapter, preco-handoff,
                                    opportunities, opportunity-handoff,
                                    pilots, pilot-loader)
src/lib/store/hipoteses-mercado.ts
src/components/negocio/DescobrirNegocioStudio.tsx
src/components/negocio/NegocioStudio.tsx
src/components/recibos-verdes/RecibosVerdesStudio.tsx
src/app/api/market/pilots/route.ts
src/app/ferramentas/descobrir-negocio/
src/app/ferramentas/layout.tsx
scripts/verificar-descobrir-negocio.mjs
```

Não incluir builds, caches, `node_modules` ou ficheiros temporários.
