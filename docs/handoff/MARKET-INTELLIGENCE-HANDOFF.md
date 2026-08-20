# Handoff — Market Intelligence Engine

> Continuação para Claude Code ou outro agente. Lê primeiro
> [`docs/architecture/market-intelligence-engine.md`](../architecture/market-intelligence-engine.md)
> e o
> [`relatório mestre`](../research/RELATORIO-MESTRE-MOTOR-NEGOCIO-PORTUGAL-2026.md).

## Estado do checkpoint

- Data: `2026-08-20`.
- Repositório: `henriquecoding/recibo-certo`.
- Branch: `feat/market-intelligence-engine`.
- PR existente: `#129` (draft).
- Base do trabalho anterior: commits `95b171a` e `b6fffd6`.
- Versão antes deste checkpoint local: `2.89.0`.
- Deploy manual: nenhum.
- Merge: nenhum.
- Há alterações locais MI-1 ainda por rever/publicar; confirmar com
  `git status --short --branch`.

## O que MI-1 acrescenta

### Dados e confiança

- `independenceKey` impede que republicações da mesma operação estatística
  contem como fontes independentes.
- Registry com INE, dados.gov, BPstat, Eurostat e IEFP.
- Licença específica de série/dataset pode aprovar um recurso sem aprovar toda
  a fonte.
- Conector Eurostat JSON-stat com manifesto e checksum.
- Quarentena genérica de observações.
- Snapshot canónico com SHA-256 e HMAC-SHA256.
- Adapter `pricing-market-adapter@1`, sem copiar fórmulas.

### Produto

- Cinco `OpportunityTemplate` curados em
  `src/lib/negocio/market/opportunities.ts`.
- Compatibilidade pessoal determinística e separada de evidência de mercado.
- Ingestão live do indicador INE `0013314`, com dataset CC BY 4.0 e geografias
  Portugal, Grande Lisboa e Península de Setúbal.
- Endpoint `/api/market/pilots`, cacheado seis horas e sem perfil privado.
- Ferramenta `/ferramentas/descobrir-negocio`.
- Handoff idempotente da oportunidade para `/dashboard/negocio`: conserva o
  projeto existente, acrescenta a oferta e abre a Pricing Engine no cenário
  certo.
- Pricing Engine incorporado em `/ferramentas/recibos-verdes`; conclui preço e
  passa `precoLiquido`/projeção anual ao simulador fiscal.

## Invariantes

1. Templates não são oportunidades atuais.
2. Compatibilidade pessoal não é procura.
3. Duas publicações da mesma operação estatística contam uma vez.
4. `retrievedAt` não rejuvenesce `referencePeriod`.
5. Sem licença, unidade, geografia, semântica e SHA-256 não há valor público.
6. Falha de fonte não ativa fallback numérico.
7. Pricing e Business Engines continuam canónicos.
8. Perfil, localização exata, entrevistas e clientes ficam locais por omissão.
9. Um piloto pago valida o mercado do utilizador; só repetição + contribuição
   positiva + recebimento provam operação.
10. Não fazer scraping de plataformas contra os termos.

## Verificação

Executar antes de publicar o checkpoint:

```bash
npm run market:check
npx tsc --noEmit
npm test
npm run build
git diff --check
```

Verificar também as duas jornadas no browser:

1. `/ferramentas/descobrir-negocio` — filtros, acordeões, fonte indisponível,
   CTA de preço e handoff para o estúdio de empresa;
2. `/ferramentas/recibos-verdes?modo=preco&cenario=servico` — concluir preço,
   voltar ao simulador fiscal e confirmar prefill sem IVA.
3. `/dashboard/negocio?o=tourism-guest-operations` — oferta aberta no cenário
   `servico`; atualizar a página não duplica a oferta e um rascunho anterior
   não é apagado.

## Próximo checkpoint recomendado — MI-2

1. manifests para Digital Intensity, competências digitais e BASE/TED;
2. job servidor que publica snapshot assinado atomicamente;
3. source-health interno e alertas de schema/frescura;
4. guardar hipótese e entrevistas localmente;
5. transições `accepted_quote`, `paid_pilot`, `sale` e `operating` na UI;
6. transferir também um cenário de preço já concluído entre as duas superfícies;
7. localização por NUTS/município sem recolher morada;
8. testes visuais e acessibilidade das novas rotas.

## Ficheiros principais

```text
docs/architecture/market-intelligence-engine.md
docs/research/RELATORIO-MESTRE-MOTOR-NEGOCIO-PORTUGAL-2026.md
src/lib/negocio/market/
src/components/negocio/DescobrirNegocioStudio.tsx
src/components/negocio/NegocioStudio.tsx
src/components/recibos-verdes/RecibosVerdesStudio.tsx
src/app/api/market/pilots/route.ts
src/app/ferramentas/descobrir-negocio/
src/app/ferramentas/recibos-verdes/lazy.tsx
```

Não incluir builds, caches, `node_modules` ou ficheiros temporários. Reutilizar
o PR #129 e agrupar pushes; não criar PR/deploy para cada correção pequena.
