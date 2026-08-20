# Handoff — Market Intelligence Engine

> **Para continuar no Claude Code ou noutro agente.** Lê primeiro
> [`docs/architecture/market-intelligence-engine.md`](../architecture/market-intelligence-engine.md).
> Não escolhas “oportunidades” nem acrescentes valores de mercado antes de
> perceber os gates de licença, frescura e semântica já implementados.

## 0. Estado exato

- Data do checkpoint local: `2026-08-20`.
- Repositório: `henriquecoding/recibo-certo`.
- Base auditada: `main` em `fa75dc954a66291955348bf71d98156f0c615d61`.
- Branch local: `feat/market-intelligence-engine`.
- Deploy: **nenhum feito e nenhum necessário neste checkpoint**.
- Interface pública: **não alterada**.
- Versão da aplicação: **não alterada** (`2.88.0`).
- Migração de `ContextoNegocio`: **não necessária**; continua na versão 2.

Quando este ficheiro foi escrito, as alterações ainda estavam no worktree
local. Antes de continuar, confirma o estado real com:

```bash
git status --short --branch
git log -1 --oneline
```

## 1. O que está implementado

### Contratos de dados

`src/lib/negocio/market/tipos.ts`

- fontes, licença, cobertura e cadência;
- observações com quatro relógios e SHA-256;
- geografia, qualidade e transformação;
- source health;
- snapshots (contrato, ainda sem publisher/assinatura);
- sinais, validação do utilizador e estados de oportunidade.

### Source registry

`src/lib/negocio/market/source-registry.ts`

- INE: conector `ready`, licença `review_required`;
- BPstat: conector `planned`, licença `review_required`;
- dados.gov: catálogo `approved`, recursos dependem da própria licença;
- validador de contrato e lookup fail-closed.

### Frescura

`src/lib/negocio/market/freshness.ts`

- ISO 8601 estrito;
- timestamps sem timezone são rejeitados;
- `retrievedAt` nunca rejuvenesce o período;
- estados `fresh`, `expiring`, `stale`, `invalid`;
- cálculo de idade efetiva e datas de validade.

### Integridade

`src/lib/negocio/market/integridade.ts`

- bloqueia fonte desconhecida;
- bloqueia licença por rever/proibida;
- bloqueia campo, número, período, geografia, qualidade e checksum inválidos;
- bloqueia mapeamento semântico não aprovado;
- bloqueia observação stale e avisa quando está a expirar.

### Evidence gate

`src/lib/negocio/market/evidence-gate.ts`

- implementa oito estados públicos;
- exige procura/transação + sinal independente + duas fontes;
- exige geografia, semântica, source health, viabilidade, requisitos e teste de
  falsificação;
- piloto pago isolado produz `user_validated`, nunca `operating`;
- operação exige repetição, contribuição positiva e pagamentos recebidos;
- contradição e fonte crítica stale não recebem fallback.

### Conector INE

`src/lib/negocio/market/connectors/ine.ts`

- URL oficial com código sanitizado;
- transporte com `fetch` injetável;
- validação runtime do envelope JSON;
- SHA-256 via Web Crypto;
- manifesto explícito por indicador;
- normalização anual;
- quarentena de geografia/dimensão/valor/sinal convencional/duplicado.

### Export e comando

- `src/lib/negocio/market/index.ts` exporta o subsistema.
- `src/lib/negocio/index.ts` expõe o subsistema sem copiar fórmulas fiscais ou
  de preço.
- `npm run market:check` executa apenas os testes deste motor.

## 2. Testes verificados neste checkpoint

```bash
npm run market:check
# 4 ficheiros, 28 testes

npx tsc --noEmit
# sem erros

npx vitest run src/lib/__tests__/negocio-*.test.ts
# 15 ficheiros, 363 testes

npx vitest run src/lib/__tests__/pricing*.test.ts
# 1 ficheiro, 125 testes
```

O `npm ci` também concluiu com sucesso. A instalação mostra apenas avisos de
dependências transitivas já existentes; nenhuma dependência foi acrescentada e
o `package-lock.json` não foi alterado.

Também foi verificado:

```bash
git diff --check
# sem erros
```

O conjunto integral (`npm test`) foi tentado duas vezes, mas o executor desta
sessão interrompeu o comando agregado antes dos resultados ao pedir autorização
de rede. Isto não foi uma falha de asserção. Os conjuntos de negócio e pricing,
que são as fronteiras tocadas por este checkpoint, passaram integralmente.
Repetir `npm test` num ambiente sem essa restrição antes de merge. Não mudar o
build nem gerar uma preview só para este módulo puro, porque não há rota nova.

## 3. Decisões que não devem ser revertidas por conveniência

1. **As 72 oportunidades são templates**, não verdade atual.
2. **Sem licença aprovada não há snapshot publicado**, mesmo que a API seja
   pública e tecnicamente acessível.
3. **Sem unidade explícita não há observação**; não extrair unidade do título
   com regex.
4. **Sem mapeamento geográfico/semântico curado não há score**.
5. **`retrievedAt` não prolonga `referencePeriod`**.
6. **Fonte stale/quarentenada degrada ou bloqueia**, nunca ativa uma estimativa.
7. **A Pricing Engine continua canónica** para preço e viabilidade; não copiar o
   solver para `market`.
8. **Dados privados ficam locais**. A ingestão publica mercado agregado, não o
   perfil do utilizador.
9. **Não ligar UI pública com números de exemplo**. Protótipos visuais devem
   dizer `template` ou `dados insuficientes` até existir snapshot real.
10. **Não fazer scraping contra termos**. Places, Trends, Ads ou marketplaces
    exigem conectores e políticas próprios.

## 4. Facto importante sobre a fixture INE

O teste usa o indicador oficial `0000540` para provar o contrato do schema. A
resposta contém geografias, dimensões, valores e sinais convencionais, o que a
torna uma boa fixture técnica.

Não usar caprinos como primeira oportunidade nem incluir esta série no produto.
Ela não foi escolhida por relevância de negócio.

## 5. Próximo checkpoint recomendado — MI-1

Fazer estes itens por ordem:

1. resolver e documentar os termos de reutilização de INE e BPstat;
2. selecionar 3–5 oportunidades-piloto de naturezas diferentes;
3. criar `OpportunitySignalMap` curado para cada piloto;
4. escolher indicadores oficiais concretos e guardar manifests versionados;
5. implementar raw quarantine e relatório de ingestão;
6. implementar snapshot canónico com SHA-256 e assinatura no servidor;
7. adicionar source health e bloquear publicação se o schema mudar;
8. só então ligar o resultado à Pricing Engine e desenhar o primeiro cartão.

Boa seleção de pilotos para cobrir riscos diferentes, ainda sem os declarar
oportunidades atuais:

- serviço local recorrente para envelhecimento/digitalização;
- serviço B2B associado a contratação pública ou compliance;
- atividade turística/sazonal;
- serviço remoto nacional;
- produto com custos, stock e logística.

Cada piloto precisa de pelo menos uma procura/transação e um sinal independente.

## 6. Backlog técnico preciso

### MI-1A — manifests e ingestão

- `src/lib/negocio/market/manifests/*.ts`
- `src/lib/negocio/market/pipeline/raw-quarantine.server.ts`
- `src/lib/negocio/market/pipeline/ingest-ine.server.ts`
- testar mudança de schema, timeout, payload vazio, duplicados e revisão de série;
- não guardar raw indefinidamente antes de existir política de retenção.

### MI-1B — snapshots

- canonicalização determinística;
- `manifestHash` SHA-256;
- assinatura apenas no servidor;
- schema versionado;
- publicação atómica: snapshot anterior continua enquanto estiver válido;
- quando expirar, a oportunidade degrada para `stale`.

### MI-1C — oportunidade e pricing

- adapter recebe `MarketEvidenceGateResult` e o cenário da Pricing Engine;
- `economicViability` é derivado do motor existente;
- guardar referência ao cálculo/pressupostos, não duplicar contas;
- mostrar atratividade, confiança, compatibilidade pessoal e economia como
  dimensões separadas.

### MI-2 — interface

Antes de editar componentes, auditar `DESIGN.md` e os componentes atuais do
simulador de negócio. Criar imagens/mockups com os padrões do Recibo Certo para:

- explorador com estado e confiança;
- dossier de oportunidade com fontes e relógios;
- source health/frescura;
- ponte “testar preço” para recibos verdes e empresa;
- percurso “que tipo de negócio faz sentido para mim?”.

A primeira interface pode ser local-first e ler um snapshot estático. Não
precisa de conta obrigatória nem de chamadas a fornecedores no browser.

## 7. Política de GitHub e deploy

O objetivo do branch/PR é permitir continuação, não gerar previews a cada linha.

- agrupar trabalho em checkpoints substanciais;
- usar PR draft enquanto o motor não alimenta uma rota pública;
- não fazer deploy manual deste checkpoint;
- se Vercel gerar preview por push, limitar o número de pushes;
- só promover/deployar quando houver uma experiência verificável e sem dados
  fictícios;
- manter este handoff atualizado em cada checkpoint relevante.

## 8. Ficheiros do checkpoint MI-0

```text
package.json
docs/architecture/market-intelligence-engine.md
docs/handoff/MARKET-INTELLIGENCE-HANDOFF.md
src/lib/negocio/index.ts
src/lib/negocio/market/index.ts
src/lib/negocio/market/tipos.ts
src/lib/negocio/market/source-registry.ts
src/lib/negocio/market/freshness.ts
src/lib/negocio/market/integridade.ts
src/lib/negocio/market/evidence-gate.ts
src/lib/negocio/market/connectors/ine.ts
src/lib/__tests__/negocio-market-registry.test.ts
src/lib/__tests__/negocio-market-freshness.test.ts
src/lib/__tests__/negocio-market-evidence-gate.test.ts
src/lib/__tests__/negocio-market-ine.test.ts
```

Não incluir `node_modules`, artefactos de build ou ficheiros temporários.
