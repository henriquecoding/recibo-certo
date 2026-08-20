# Handoff — Market Intelligence Engine

> Continuação para outro agente. Lê primeiro
> [`docs/architecture/market-intelligence-engine.md`](../architecture/market-intelligence-engine.md)
> e o
> [`relatório mestre`](../research/RELATORIO-MESTRE-MOTOR-NEGOCIO-PORTUGAL-2026.md).

## Estado do checkpoint

- Data: `2026-08-20`.
- Repositório: `henriquecoding/recibo-certo`.
- Branch: `claude/business-discovery-tool-z6xihz`.
- Versão: `2.91.0`.
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
- **`npm run descobrir:e2e`**: 29 verificações × 4 combinações (360 px e
  desktop, claro e escuro), com axe.

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

1. **Uma segunda operação estatística independente por hipótese.** É o único
   bloqueio real para `candidate`/`evidence_qualified`: hoje as séries de cada
   piloto digital partilham `independenceKey` e contam por uma. Candidata
   estudada: INE `0008466` (Sistema de contas integradas das empresas) — mas
   está em NUTS 2013 e termina em 2023, pelo que traria uma classificação
   desalinhada; procurar a série equivalente em NUTS 2024 antes de a ligar.
2. Manifests BASE/TED para o piloto de concursos (o único com `kind`
   transacional por ligar).
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
