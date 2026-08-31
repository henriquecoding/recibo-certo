# Recibo Certo Fiscal Engine

Fundação executável para o próximo motor fiscal do Recibo Certo, centrado no sistema fiscal português. Este pacote ainda não substitui os motores em `src/lib/` (raiz do repositório) e não está ligado às páginas do site.

## Estado

**Draft técnico, não apto para substituir integralmente o motor em produção.** O dataset de 2026 (`src/datasets/2026.ts`) está deliberadamente marcado como `draft`. Em modo normal, o motor recusa produzir decisões `ok` com um dataset não aprovado — o teste `tests/core.test.ts` prova isto. O domínio de payroll já é um `functional_draft`; os restantes domínios continuam `contract_only`. A aplicação usa uma camada de compatibilidade revista em `src/lib/payroll-simulator-legacy-adapter.ts`, e não ativa silenciosamente o dataset draft.

Isto é intencional: `0 €` nunca significa "não foi possível determinar". Os resultados possíveis são:

- `ok` — regra suportada, dados completos e dataset aprovado;
- `needs_input` — campos identificados em falta;
- `not_applicable` — regra avaliada e não aplicável;
- `unsupported` — caso ou domínio ainda não suportado;
- `conflict` — regimes, regras ou fontes incompatíveis.

## Âmbito

Portugal é a jurisdição normativa. A localização fiscal é sempre uma de:

- `PT-CONTINENTE`;
- `PT-MADEIRA`;
- `PT-ACORES`.

O Brasil ou outro país só pode aparecer como país de fonte de um rendimento. Para um residente fiscal em Portugal, o módulo internacional aplica CIRS, convenções celebradas por Portugal e crédito por dupla tributação. Não usa regras brasileiras para calcular IRS português. (O módulo internacional em si ainda não está implementado — ver `src/domains/coverage.ts`, domínio `international-income`.)

## Conteúdo

```text
src/
  core/       tipos, dinheiro, decisões e executor de regras
  datasets/   manifestos anuais imutáveis
  domains/    cobertura, requisitos e regras de encaminhamento
  legal/      catálogo oficial e validação semântica de fontes
tests/        contratos de segurança do núcleo
```

## Executar

A partir da raiz do repositório:

```bash
npx tsc -p ReciboCerto-Fiscal-Engine/tsconfig.json --noEmit
npx vitest run ReciboCerto-Fiscal-Engine/tests
```

## O que já existe nesta fatia

- `src/core/money.ts` — dinheiro em cêntimos (inteiros), sem `float` disperso; conversão e arredondamento com política explícita.
- `src/core/decision.ts` — o contrato `Decision<T>` (ok/needs_input/not_applicable/unsupported/conflict) e construtores.
- `src/core/dataset.ts` — o manifesto de dataset (estado de aprovação, período efetivo, revisores).
- `src/core/engine.ts` — o executor: recusa `ok` com dataset não aprovado (exceto `allowUnapprovedDataset`, só para dev/testes), falta de campos obrigatórios devolve `needs_input`.
- `src/legal/source.ts` + `src/legal/validate.ts` — modelo de fonte legal com validação semântica (título esperado, expressões proibidas como "versão até 2013", estado `active`/`superseded`/`pending`/`conflict`/`withdrawn`) — não só o `HTTP 200` que o monitor atual usa.
- `src/domains/coverage.ts` — a matriz dos 10 domínios mínimos, como dados (não prosa): payroll está em `functional_draft`; os outros nove permanecem `contract_only`.
- `src/domains/payroll/` — contratos e cálculo mensal por rubrica, com bases de IRS/SS, custo patronal, penhora, inverso e estados seguros para factos insuficientes.
- `src/datasets/2026.ts` — manifesto do dataset 2026, `status: "draft"`, com um punhado de parâmetros reais (mínimo de existência, limite de isenção de IVA) referenciados a partir do motor legado para provar o padrão ponta-a-ponta — não é uma réplica de `fiscal-data.ts`.

## Próximos passos obrigatórios

1. Corrigir os P0 do relatório no motor atual com testes de reprodução. *(Parte já feita nesta sessão — ver `CHANGELOG` em `src/lib/version.ts`; ver secção "Estado dos P0" abaixo.)*
2. Aprovar contratos de input por domínio.
3. Migrar uma regra vertical de cada vez, começando pela tesouraria de recibos.
4. Associar cada regra a fonte primária, vigência, jurisdição e testes dourados.
5. Obter revisão fiscal independente do dataset.
6. Só alterar `status` para `approved` depois de todos os gates documentados.

## Estado dos P0 após a remediação

Corrigidos no motor legado (`src/lib/`), com testes de reprodução:

- P0-02 — Adicional de solidariedade (Art. 68.º-A CIRS) implementado em `simularIRSAnual`.
- P0-03 — IFICI/RNH (taxa fixa 20%) deixou de se aplicar a `outrosRendimentos`; só ao rendimento elegível de Cat. A/B.
- P0-05 — `liquidoGerente` (simulador de empresa) passou a descontar o IRS do salário do gerente, não só a SS.
- P0-06 — `taxaTA` (código não usado por nenhuma UI, mas incorreto) corrigido para respeitar o limiar de custo das elétricas.
- P0-07/P0-08 — Ligações legais corrigidas (CIRC art. 87.º/88.º, CFI, CSC, Portaria 208/2017).
- P1-06 — Removida a afirmação "todos os custos são dedutíveis".
- P0-09 — Avisos reforçados no RFAI/SIFIDE ("poupança potencial", elegibilidade não verificada).
- P0-04 — Avisos reforçados no IRS Jovem (condições de idade, dependência e regularidade fiscal não verificadas).
- P0-01 — Mínimo de existência: a aproximação foi substituída pela decisão por troços do Art. 70.º, incluindo coeficientes 2,60/1,35, limite do primeiro escalão, despesas gerais e condições factuais; dados necessários em falta produzem estado explícito, não uma falsa precisão.
- P0-10 — O cálculo empresarial comum, a tributação autónoma, os benefícios condicionais e o payroll do gerente foram extraídos para `src/lib/fiscal-empresa.ts`; as superfícies completa e guiada consomem agora a mesma implementação e têm testes de paridade.

Os benefícios RFAI/SIFIDE são apresentados como potencial e **não reduzem o IRC** sem confirmação profissional de elegibilidade. A migração total M1–M6 e a aprovação fiscal independente continuam pendentes; corrigir os P0 no motor em uso não equivale a aprovar o dataset novo.

## Robustez dos inputs dos simuladores

Os campos monetários e decimais dos simuladores usam a política comum de `src/lib/numeric-input.ts` e, nos componentes controlados reutilizáveis, `src/components/ui/LocalizedNumberInput.tsx`. A política:

- aceita vírgula decimal portuguesa e colagem de valores formatados;
- remove símbolos de moeda e separadores de milhares sem alterar o valor;
- elimina zeros indevidos à esquerda (`0442` passa imediatamente a `442`);
- preserva estados de edição legítimos como `0,` até o utilizador concluir o decimal;
- impede `NaN`, infinito, mais casas decimais do que o contrato e valores fora dos limites.

Os testes de regressão cobrem estes casos. Campos de identificação, como NIF, permanecem texto de dígitos e não são tratados como montantes.

Ver também `../RELATORIO_AUDITORIA_RECIBO_CERTO_2026.md`, `ARCHITECTURE.md`, `COVERAGE.md` e `MIGRATION.md` (mantidos como o utilizador os forneceu).
