# Motor patronal — releases, gate e cadeia de autoridade

> Resposta ao relatório mestre de 31 de agosto de 2026 (Release 0 —
> «contenção e honestidade»). Descreve o que passou a existir, o que ficou
> deliberadamente de fora e onde é que cada regra vive.

## O problema que isto fecha

O gate de aprovação existia no núcleo do motor — `FiscalRuleEngine.evaluate()`
recusa um dataset não aprovado — e a superfície pública contornava-o:
`PlaneadorContratacao.tsx` chamava `planEmploymentOffer(input,
PORTUGAL_PAYROLL_POLICY_2026, legacy2026WithholdingResolver)` importando a
política anual diretamente. Ao mesmo tempo, a interface escrevia «política
verificada» sobre um manifesto que se declarava `draft`.

Uma proteção que a superfície mais exposta não usa não é uma proteção.

## A cadeia

```
fonte oficial datada
  → catálogo legal com localizador (artigo, número)
  → release patronal com cobertura por domínio
  → seletor central
  → EmploymentPolicyBundle (opaco)
  → planEmploymentOffer
  → resultado com proveniência
```

Nenhum passo é opcional e nenhum tem atalho.

## Onde vive cada coisa

| Ficheiro | Responsabilidade |
|---|---|
| `ReciboCerto-Fiscal-Engine/src/releases/types.ts` | Tipos do release e o `EmploymentPolicyBundle` — a chave opaca que abre o motor |
| `…/releases/pt-employer-2026.ts` | O release de 2026: RMMG, tempo de trabalho, férias, base dos subsídios, apoios, cenários de demonstração |
| `…/releases/select.ts` | O seletor central. É o ÚNICO sítio que fabrica um bundle |
| `…/domains/employment-offer/minimum-wage.ts` | Piso remuneratório: RMMG por jurisdição, proporcionalidade a tempo parcial, piso do IRCT |
| `…/employment-offer/working-time.ts` | Período normal, adaptabilidade por médias, período de referência, limite de 48 h |
| `…/employment-offer/vacation.ts` | Direito adquirido, data de gozo, saldo transportado, teto do ano seguinte |
| `…/employment-offer/supports.ts` | Triagem declarativa dos apoios, requisito a requisito |
| `…/legal/catalogue.ts` | Fontes e localizadores. `resolveCitation()` resolve qualquer citação |
| `src/lib/motor/release.ts` | A fronteira única da aplicação. Amarra o resolvedor de retenção num sítio só |

## A chave é opaca por construção

```ts
declare const bundleBrand: unique symbol;
export interface EmploymentPolicyBundle {
  readonly [bundleBrand]: "employment-policy-bundle";
  // …
}
```

`sealBundle()` fica fora do índice público do pacote. Um componente não
consegue fabricar um bundle nem convencer o TypeScript de que tem um. A
assinatura de `planEmploymentOffer` deixou de aceitar uma política solta:

```ts
planEmploymentOffer(input: EmploymentOfferInput, bundle: EmploymentPolicyBundle)
```

## Estado do release e o que cada estado autoriza

| Estado | Calcula? | Copy pública |
|---|---|---|
| `draft` | Não | «Este release está em rascunho e não pode produzir um resultado público.» |
| `reviewed` | Sim, com aviso | «Revisão técnica feita e fontes datadas; falta a revisão profissional independente.» |
| `approved` | Sim | «Calculado com um release aprovado, para os factos que indicaste.» |
| `retired` | Não | Substituído |

`PT_EMPLOYER_2026` está em **`reviewed`**. A revisão técnica está assinada e
registada em `approvals`: cada valor foi confrontado com a fonte oficial a 31
de agosto de 2026. A revisão profissional — fiscal e laboral, independente —
**não** está feita, e por isso o release não é `approved` e nenhuma superfície
escreve «verificado» ou «conforme».

Um release só pode chegar a `approved` com duas assinaturas de funções
distintas. `employer-release-p0.test.ts` verifica-o.

## Cobertura por domínio, sem selo global

`termination` e `employer_obligations` estão declarados `unsupported`. Ter
uma data de fim de contrato reduz dias de calendário; não calcula acertos,
compensação, aviso prévio nem devolução de apoios. Declarar isso vale mais do
que um número por inventar — e `CoberturaDoRelease.tsx` mostra-o a quem lê.

## Três estados que a copy tinha fundido num só

- `userReviewedInputs` — a pessoa reviu **os dados que introduziu**;
- `policyApproved` — a política passou por revisão profissional independente;
- `calculationReproducible` — o cálculo repete-se a partir do input e do release.

São independentes. A caixa de revisão do planeador marca apenas o primeiro.

## Datas, que não são intercambiáveis

`EmploymentSimulationContext` separa `simulationAsOf`, `workPeriod`,
`payDate`, `contractStart` e `contractEnd`. Uma data inválida produz
`needs_input`; não há fallback. Sem release para a vigência pedida, o seletor
devolve `stale_policy` — nunca reutiliza a política de outro ano.

## Portões

```
npm run motor:golden        # casos dourados e fronteiras do P0
npm run motor:cross-surface # homepage e ferramenta com o mesmo cenário
npm run motor:no-hardcodes  # nenhuma regra mutável fora do release
npm run motor:check         # os três
npm run contratacao:e2e     # percurso completo + oclusão em seis viewports
```

`scripts/check-motor-hardcodes.mjs` corre um lexer que remove comentários
antes de procurar: imports de `policy-20XX`, o nome da política de payroll, o
resolvedor de retenção, períodos escritos à mão e URLs legais em componentes.
A lista de exceções é fechada e cada entrada diz porquê — as que existem por
dívida (ferramentas ainda sem release próprio) dizem-no.

## O que fica por fazer

Isto é o Release 0 do plano do relatório. Continuam por fazer:

- **Release 1** — a plataforma no Supabase: schemas editorial e público,
  RLS, hash e assinatura, API de alias e release na Vercel, carregador
  cliente com IndexedDB. Hoje o release é um módulo compilado.
- **Release 2** — tabelas de retenção próprias. O adaptador do legado
  (`payroll-engine-adapter.ts`) continua a servir a retenção e continua a
  exigir execução diferencial.
- **Release 3 a 5** — vínculo completo, cessação, apoios com montantes
  aprovados e planeamento de equipa.
- **Oclusão** — o portão verifica que nenhum campo fica inalcançável e que
  não há overflow nos seis viewports. Não fecha o caso do foco que aterra
  debaixo da barra sem o browser rolar: isso obriga a mexer no chrome global.
