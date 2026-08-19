# Handoff — Pricing Engine

> **Para quem vai continuar este trabalho no Claude Code.** Lê este ficheiro
> antes de tocar em `src/lib/pricing/`. Não descreve intenções: descreve o que
> está feito, o que está deliberadamente por fazer, e onde é que o motor de
> preço ainda **não** usa os motores fiscais que já existem neste repositório.
>
> Estado: entregue e verificado a 2026-08-18, versão 2.77.0.
> Rota: `/ferramentas/calcular-preco`.

---

## 0. Como aplicar

```bash
git checkout -b feat/pricing-engine
git am pricing-engine.patch     # ou: git apply pricing-engine.patch
npm ci
npm test                        # 2 293 testes
npx tsc --noEmit
npm run build
```

Se `git am` recusar, o patch foi gerado contra `main` no commit em que o
repositório estava a 2026-08-18. `git apply --3way` resolve a maioria dos
conflitos; os prováveis são em `src/lib/changelog.ts` (entrada nova no topo),
`src/lib/version.ts` (`APP_VERSION`) e `src/lib/ferramentas/catalogo.ts`
(entrada nova no fim do array).

---

## 1. O que existe

| Camada | Ficheiros | Linhas |
|---|---|---:|
| Engine | `src/lib/pricing/` — 21 ficheiros | ~3 400 |
| Interface | `src/components/precos/` — 6 ficheiros | ~2 100 |
| Rota | `src/app/ferramentas/calcular-preco/` — 2 ficheiros | ~380 |
| Persistência | `src/lib/store/preco.ts` | 46 |
| Testes | `src/lib/__tests__/pricing.test.ts` | 957 |
| Documentação | `docs/research/` (4) + `docs/architecture/` (4) | — |

**A fonte de verdade matemática é `docs/architecture/pricing-calculation-spec.md`.**
O código implementa-o; os testes verificam-no. Se houver divergência entre os
dois, um deles está errado e é preciso decidir qual — não «harmonizar».

Alterações fora de `pricing/` (todas deliberadas, todas com comentário a
explicar porquê):

- `src/app/globals.css` — track e thumb dos sliders. **Estavam invisíveis em
  toda a aplicação**: `appearance: none` sem estilos a seguir. Afetava o regime
  simplificado, o IRS Jovem e as heranças, não só a ferramenta nova.
- `src/components/ferramentas/ToolStart.tsx` — o `<dl>` era inválido nas 14
  ferramentas (o ícone estava dentro do grupo `dt`/`dd`); passou a lista.
  Contraste dos rótulos corrigido.
- `src/components/ferramentas/ToolShell.tsx` — contraste do «(estás aqui)».
- `src/components/ferramentas/icon-map.tsx` — 9 chaves novas, por adição.
- `src/lib/store/cofre.ts` — domínio `preco`.
- `src/lib/ferramentas/catalogo.ts` — ferramenta + percurso `definir-o-preco`.
- `src/lib/__tests__/ferramentas.test.ts` — inventário 14 → 15.

---

## 2. Motores fiscais que JÁ estão ligados

Não há um único número fiscal escrito à mão em `src/lib/pricing/`. Estes são os
pontos de ligação, para que se saiba o que se parte ao mexer:

| O que | De onde | Onde é chamado |
|---|---|---|
| Taxas de IVA por região e escalão | `IVA_TAXAS` | `motores/iva.ts` → `taxaDe()` |
| Limiar do Art. 53.º e o excesso de 25% | `IVA_ISENCAO_LIMITE`, `IVA_ISENCAO_EXCESSO` | `motores/avisos.ts` |
| Coeficiente de SS por natureza | `SS_COEFICIENTE`, `BASE_SS_POR_TIPO` | `motores/fiscal-ti.ts` |
| Taxa contributiva, teto e mínimo | `contribuicoesSS()` | `motores/fiscal-ti.ts` → derivada discreta |
| IRS marginal | `simularIRSAnual()` | `motores/fiscal-ti.ts` → derivada discreta |
| Retenção na fonte | `retencaoNaFonte()`, `RETENCAO` | `motores/fiscal-ti.ts` → `fracaoRetencao()` |
| Dicionário de eventos | `analytics/eventos.ts` | `SimuladorPreco.tsx` |
| Cofre de `localStorage` | `store/cofre.ts` | `store/preco.ts` |

**Regra que não se atravessa:** `fiscal-data.ts` guarda o que o Estado impõe;
`pricing/regras.ts` guarda o que o mercado pratica (comissões de canal, taxas
de processamento, pressupostos de horas faturáveis) e o que a lei impõe sobre a
*apresentação* do preço (ASAE, saldos, devoluções). Se um número já vive em
`fiscal-data.ts`, importa-se de lá. Duplicá-lo é o defeito que `fiscal-iva.ts`
foi criado para corrigir.

---

## 3. Backlog de refinamento — por ordem de valor

Cada item diz o que está errado agora, o que fazer, onde, e como verificar.
Os três primeiros mudam **números que a pessoa vê**; os restantes alargam o
âmbito.

> **Estado a 2026-08-18 (v2.78.0): R1, R3 e R4 estão FEITOS.** As três secções
> abaixo ficam como registo do que estava errado e do que se decidiu — não como
> trabalho por fazer. O que mudou:
>
> - **R1** — `situacaoIVAPreco()` é agora um adaptador sobre `situacaoIVA()`.
>   Regra de arbitragem: a escolha do utilizador governa a matemática e só é
>   corrigida na perda imediata do Art. 58.º n.º 2 b), provada por faturação
>   **declarada**; uma projeção nossa avisa mas nunca corrige. Novo aviso
>   `limiar-art53-a-este-preco` («a este preço passas o limiar em setembro»),
>   `isencao-ja-perdida` e `iva-declaracao-mensal`.
> - **R3** — `regimeContabilidade` existe, e a copy que dizia «os custos não
>   reduzem o IRS» é condicional em três sítios (campo, FAQ, memória de
>   cálculo). **Obrigou a generalizar o solver**: em organizada o IRS incide
>   sobre o lucro, e metê-lo em `v` cobrava imposto sobre o custo (≈ +32% de
>   preço no caso-tipo). O solver ganhou `fracaoSobreLucro` (τ) com escudo
>   fiscal — ver §1.2 e §3.2 da spec, que foram reescritas. **Com τ = 0 tudo
>   colapsa nas equações originais, e há um teste que o exige.**
> - **R4** — `fracoesFiscais()` usa `simularDeclaracaoIRS` com `salarios`.
>   `outrosRendimentos` continua a não ser tocado.
>
> - **R2** — a atividade concreta manda sobre o `tipo`: `atividadeDoPerfil()` +
>   `regrasDe()` resolvem o pacote por `efeitoFiscal()` e passam
>   `coefOverride` / `aplicaRegra15Override` ao motor de IRS.
> - **R5** — `dispensaRetencao` e `irsJovemAno` chegam a `retencaoNaFonte()`.
>   Muda a tesouraria, nunca a margem — e o teste do B2B/B2C prova-o.
> - **R6** — `motores/sociedade.ts` converte o lucro operacional no que chega
>   ao dono, via `simularEmpresaOpcoes`. Camada POR CIMA do resultado, nunca
>   dentro do solver. O lucro retido aparece sempre ao lado do líquido
>   pessoal: riqueza total = líquido pessoal + lucro retido.
> - **R7** — `motores/tesouraria.ts` cruza o preço com `prazosAplicaveis()`.
>   Duas regras que os testes protegem: **declarar não é pagar** (a quantia
>   vai só na linha do pagamento, senão a reserva duplica) e **a Segurança
>   Social declara-se por trimestre mas paga-se todos os meses**.
> - **R8** — cenário `ato_isolado` + `atoIsolado` em `situacaoIVAPreco` e o
>   aviso `ato-isolado-leva-iva` (Art. 53.º n.º 6 a).
> - **R9** — **feito.** As taxas regionais de IRS entraram no motor. Ver a
>   secção R9 abaixo, incluindo as duas coisas que ficaram deliberadamente
>   nacionais e porquê.
>
> **Backlog fechado.**

### R1 · Ligar `situacaoIVA()` — o maior desperdício atual

**O que está errado.** `motores/iva.ts` pergunta o regime de IVA num `select`
e acredita na resposta. O repositório já tem `fiscal-iva.ts`, que **deriva** o
regime a partir do volume de negócios e conhece muito mais do que o meu:

- as três zonas do Art. 53.º/58.º (isento, transição entre 15 000 e 18 750,
  perda imediata acima);
- isenção pela natureza da operação (Art. 9.º), sem limiar;
- ato isolado, que nunca é isento (Art. 53.º n.º 6 a);
- o desdobramento dos direitos de autor (obra própria isenta vs. royalties
  tributados), que resolve o caso que eu tratei com uma nota de texto;
- `periodicidade` (mensal acima de 650 000 €, Art. 41.º);
- `incoerencia` — a taxa escolhida não é a habitual da categoria;
- `margemAteLimiar` — quanto falta para perder a isenção.

**O que fazer.** `situacaoIVAPreco()` passa a ser um adaptador: chama
`situacaoIVA({ faturacaoAnual, regiao, regimeEscolhido, categoria, entidade })`
e lê `regimeEfetivo` e `taxaEfetiva`. A faturação anual a passar é
`vendedor.faturacaoAnualPrevista` — e, quando ela não existe, a projeção do
próprio cenário (`pvp × unidadesMes × 12`), com o resultado marcado como
estimativa.

**Porque vale a pena.** Desbloqueia uma frase que nenhuma calculadora do
mercado consegue dizer: *«a este preço e a este volume, ultrapassas o limiar de
isenção por volta de setembro — e a partir daí o teu PVP tem de subir 23% ou a
tua margem cai.»* O motor já sabe fazer a conta; falta ligá-lo.

**Cuidado.** O regime escolhido pelo utilizador tem de continuar a poder mandar
(quem sabe que está isento pelo Art. 9.º não pode ser contrariado por um
limiar). `situacaoIVA` já tem `isentoPorNatureza` e `isentoEfetivo` para isso.

**Verificar.** Os testes «caso 9 e 10» e o invariante 7 têm de continuar a
passar: a isenção continua a ter de aumentar o custo direto.

---

### R2 · Usar `ATIVIDADES` + `efeitoFiscal()` + `ActivityCombobox`

**O que está errado.** `CamposPreco.tsx` tem um `select` com os quatro
`TipoAtividade` canónicos. O catálogo real (`ATIVIDADES`) tem dezenas de
atividades, cada uma com `coef`, `retencao`, `baseSS` e IVA esperado próprios —
e `efeitoFiscal(a)` resolve os *overrides* por atividade. Eu leio
`RETENCAO[tipo]` e `BASE_SS_POR_TIPO[tipo]`, que ignoram esses overrides.

**O que fazer.**

1. `PerfilVendedor` passa a guardar a atividade escolhida (não só o tipo).
2. `motores/fiscal-ti.ts` lê `efeitoFiscal(atividade)` em vez dos mapas por tipo.
3. `CamposPreco.tsx` troca o `select` pelo `ActivityCombobox`
   (`value: Atividade | null`, `onChange: (a: Atividade) => void`).

**Porque vale a pena.** Coerência com os outros simuladores — hoje a mesma
pessoa escolhe a atividade de uma maneira no simulador de recibos verdes e de
outra aqui — e retenção correta para as atividades com taxa própria.

---

### R3 · `regimeContabilidade` — está a dizer-se uma coisa falsa a uma minoria

**O que está errado.** A ferramenta afirma, na interface e na FAQ, que *«os
teus custos não reduzem o IRS»*. É verdade no **regime simplificado** e **falso
na contabilidade organizada**, onde `simularIRSAnual` faz
`rendimentoTributável = receita − despesas`. `PerfilVendedor` não tem o campo, e
por isso a afirmação é feita a toda a gente.

**O que fazer.**

1. Campo `regimeContabilidade?: "simplificado" | "organizada"` em
   `PerfilVendedor`, com `"simplificado"` por omissão.
2. Passá-lo em ambas as chamadas a `simularIRSAnual` dentro de
   `fracoesFiscais()`, e passar as despesas do modelo de custos como
   `despesasJustificadas` quando o regime é organizada.
3. A copy do aviso e da FAQ passa a ser condicional.

**Porque vale a pena.** É o único sítio onde a ferramenta pode estar
factualmente errada em vez de apenas incompleta. Prioridade alta apesar de
afetar poucos utilizadores.

---

### R4 · Acumulação com emprego no IRS marginal

**O que está errado.** `fracoesFiscais()` calcula o IRS marginal com
`simularIRSAnual({ brutoAnual: faturacaoAnualPrevista })` — ou seja, como se a
Categoria B fosse o único rendimento. Quem tem salário e passa recibos verdes ao
lado — provavelmente o perfil mais comum — enfrenta uma taxa marginal muito mais
alta, porque o englobamento empilha os dois.

É o mesmo defeito que a análise de julho encontrou no modo guiado (§1.1).

**O que fazer.** Usar `simularDeclaracaoIRS` com `salarios` em vez de
`simularIRSAnual`, para que o motor faça a decomposição. **Não alimentar
`outrosRendimentos` com um salário bruto** — o comentário no próprio campo
explica porquê, e há um teste (`verificacao-irs.test.ts`) que reprova quem o
faça.

**Verificar.** O teste «o IRS marginal cresce com a faturação» continua a
passar, e acrescenta-se um que prove que um salário de 30 000 € sobe a fração
marginal.

---

### R5 · Retenção: dispensa do Art. 101.º-B e IRS Jovem

**O que está errado.** `fracaoRetencao()` chama `retencaoNaFonte(100, taxa)` sem
opções. A função aceita `{ dispensa, irsJovemAno }` e nenhum dos dois chega lá,
porque `PerfilVendedor` não os tem.

**O que fazer.** Dois campos novos (`dispensaRetencao?: boolean`,
`irsJovemAno?: number`), passados a `retencaoNaFonte`. `DISPENSA_RETENCAO_LIMITE`
dá o limiar para explicar quando a dispensa é possível.

**Nota.** Isto muda a **tesouraria**, nunca a margem — e o teste «a retenção não
é custo» tem de continuar a provar que a margem do B2B é igual à do B2C.

---

### R6 · Sociedade: converter lucro operacional no que chega ao dono

**O que está errado.** Para `vendedor.tipo === "empresa"`, `fracoesFiscais()`
devolve zero e uma nota a dizer que o IRC incide sobre o lucro. Correto, e
incompleto: a pessoa fica sem saber quanto do lucro lhe chega.

**O que fazer.** Uma camada por cima do resultado (não dentro do solver — o IRC
não é fração da faturação e não pode entrar em `v`) que chame
`simularEmpresaOpcoes({ faturacao, despesasOper, salarioGerenteMensal, … })` com
a faturação anual projetada, e mostre «lucro operacional → o que te chega».

**Cuidado com a armadilha que a análise de julho identificou** (§1.10): não
apresentar o lucro retido como perdido. Riqueza total = líquido pessoal + lucro
retido.

---

### R7 · Calendário de tesouraria

O resultado já sabe o IVA e a Segurança Social mensais. `prazos.ts` já sabe as
datas (`gerarPrazos`, `prazosAplicaveis`). Juntá-los transforma «quanto
reservar» em «quanto sai, e quando» — que é literalmente o posicionamento do
produto («vende tranquilidade, não cálculos»).

---

### R8 · Ato isolado

`situacaoIVA` sabe que um ato isolado nunca é isento pelo Art. 53.º. Falta o
cenário inicial correspondente em `perguntas.ts` e a ligação à ferramenta
`/ferramentas/ato-isolado` que já existe.

---

### R9 · Regiões autónomas e IRS — verificado; falta uma decisão

O motor aplica IVA regional (Continente / Madeira / Açores) mas IRS nacional.
A pergunta era se as reduções regionais de IRS se aplicam à categoria B.

**Resposta (verificada em 2026-08-18, protocolo da skill `fiscalidade-pt-2026`):
sim, aplicam-se.**

- A **Lei Orgânica n.º 2/2013** (Lei das Finanças das Regiões Autónomas),
  Título VI, permite às assembleias legislativas regionais baixar as taxas
  nacionais de IRS até ao limite de **30%**.
- A redução é do **sujeito passivo residente** na região — não da fonte do
  rendimento, e independente do local onde a atividade é exercida. Incide
  sobre as taxas gerais do **Art. 68.º CIRS**, que se aplicam à matéria
  coletável **englobada**. Logo abrange a categoria B.
- Em **2026 as duas regiões aplicam o diferencial máximo em todos os nove
  escalões**. Madeira: Decreto Legislativo Regional n.º 8/2025/M (o
  diferencial de 30%, que ia até ao 6.º escalão, foi alargado ao 9.º).
  Açores: mesma estrutura, com tabelas de retenção próprias já publicadas
  (Despacho n.º 1179/2026).
- As tabelas publicadas para 2026 (Agenda da OCC) são, escalão a escalão,
  **exatamente 70% da taxa nacional**, com os mesmos limites de escalão:

  | Coletável (€) | Continente | Madeira e Açores |
  |---|---|---|
  | até 8 342 | 12,50% | 8,75% |
  | 8 342 – 12 587 | 15,70% | 10,99% |
  | 12 587 – 17 838 | 21,20% | 14,84% |
  | 17 838 – 23 089 | 24,10% | 16,87% |
  | 23 089 – 29 397 | 31,10% | 21,77% |
  | 29 397 – 43 090 | 34,90% | 24,43% |
  | 43 090 – 46 566 | 43,10% | 30,17% |
  | 46 566 – 86 634 | 44,60% | 31,22% |
  | > 86 634 | 48,00% | 33,60% |

**Como ficou implementado.**

1. `REDUCAO_IRS_REGIOES_AUTONOMAS` em `fiscal-data.ts` guarda a REGRA (30%),
   não dezoito taxas transcritas à mão — cada uma delas seria uma
   oportunidade de erro que ninguém voltaria a conferir. `escaloesIRSDaRegiao()`
   deriva a tabela, e `assertFiscalDataIntegrity()` confere a derivação contra
   a tabela publicada de 2026, escalão a escalão. Mexer no diferencial ou nos
   escalões nacionais sem pensar nas regiões parte o build.
2. `irsProgressivo(coletavel, regiao = "continente")` — o valor por omissão
   deixa intacto todo o chamador que não sabe que a pergunta existe.
3. A residência propaga-se por `SimulacaoInput.residenciaFiscal`,
   `DeclaracaoInput.residenciaFiscal`, `ComparacaoInput.residenciaFiscal`,
   `PerfilGerente.regiao` e `PerfilVendedor.residenciaFiscal`.
4. `residenciaParaRegiao()` (em `irs-guiado.ts`) é a implementação ÚNICA da
   regra «que região governa as taxas» — havia uma segunda cópia dentro do
   `SimuladorIRS.tsx` e foi eliminada.

**A distinção que isto obrigou a tornar explícita.** O IVA segue a OPERAÇÃO;
o IRS segue a PESSOA. Coincidem quase sempre, e por isso a residência assume
por omissão a região da atividade — mas `PerfilVendedor.residenciaFiscal`
existe para que a coincidência seja uma **escolha** e não um pressuposto
escondido no código. O simulador de IRS já perguntava a residência em
separado, e essa resposta agora decide também as taxas: até aqui retinha pela
tabela da região e apurava pelas taxas nacionais, e o reembolso que anunciava
não era o que a AT daria.

**O que ficou nacional de propósito, e porquê.** Duas coisas, ambas por não se
ter conseguido confirmar em fonte oficial se a redução regional lhes toca:

- o **mínimo de existência** (Art. 70.º remete para «a taxa da primeira
  posição da tabela do artigo 68.º» — não está confirmado se, para um
  residente numa região autónoma, essa taxa é a nacional ou a regional);
- a **taxa liberatória dos dividendos** (Art. 71.º) no comparador — há indício
  de redução regional, mas encontrado só para os Açores e sem o valor de 2026
  confirmado.

Nos dois casos o valor nacional é o mais alto, logo o resultado peca por
excesso de imposto — o lado seguro para quem está a decidir quanto guardar.
Ficam registados como perguntas em aberto, com comentário no código.

**O aviso mudou de sentido.** `irs-regiao-autonoma` já não diz «o preço é
conservador»; diz que o desconto **já está aplicado** e de que depende — que é
onde a pessoa reside, não onde está o cliente.

---

## 4. Onde os testes ainda não chegam

- **Interação do slider e dos botões «e se…».** Os motores estão testados; a
  ligação ao DOM não. Um teste de componente resolve.
- **Persistência no cofre.** `store/preco.ts` é fino e delega em código já
  testado, mas o caminho guardar → recarregar → retomar não tem teste próprio.
- **Coerência com os outros simuladores.** Depois de R1 e R2, faz sentido um
  teste do género do `fiscal-coerencia.test.ts`: para os mesmos inputs, a
  fração de SS que o motor de preço usa tem de bater com a que o simulador de
  recibos verdes mostra.

---

## 5. Invariantes que não podem partir

Estão em `docs/architecture/pricing-calculation-spec.md` §12 e no teste. Os que
mais facilmente se partem por acidente:

1. `PVP = líquido + IVA`, sempre. Os três arredondam-se **em conjunto** — cada
   um por si parte a identidade num cêntimo.
2. A margem mede-se sobre o **preço líquido**, nunca sobre o PVP.
3. A retenção na fonte **nunca** reduz a margem.
4. Denominador ≤ 0 devolve `impossivel` com motivo, nunca `NaN` nem negativo.
5. O IRS marginal **não é monótono** — há um teste que o exige. Entre ~12 000 €
   e ~16 000 € a taxa passa dos 40% por causa da extinção do mínimo de
   existência. Se parecer errado, não é: ver `pricing-test-matrix.md`.
6. O preço psicológico **nunca** substitui o recomendado.
7. Nenhum literal fiscal em `src/lib/pricing/`.

E dois defeitos meus que já custaram um preço errado; os testes de regressão
chamam-se pelo nome:

- **custo do tempo bruteado duas vezes** — o valor/hora que entra no solver é o
  **líquido**; a reposição dos impostos acontece uma só vez, no solver;
- **Segurança Social marginal em faturação zero** — a derivada discreta apanha a
  contribuição mínima de 20 €/mês e devolve 24%; sem faturação declarada usa-se
  a taxa da banda normal.

---

## 6. Protocolo de verificação

O da skill `verificacao-e-qualidade`, mais o que é próprio desta ferramenta:

```bash
npx tsc --noEmit
npm test                                  # 2 293
npm run build
npm audit --audit-level=high              # 0 high
npm run fiscal:check
npm run busca:check                       # o índice muda quando o catálogo muda
npm run versao:check                      # APP_VERSION == package.json
```

E, porque isto é interface:

- **axe em três estados** (desktop claro, mobile 360 px, desktop escuro).
  A ferramenta e a página estão a **zero violações** WCAG 2.1 AA — manter.
- **Viewport de 360 px** sem overflow horizontal, com o resultado antes dos
  campos.
- **Modo escuro** verificado a olho: o dark é uma camada de override e é fácil
  partir sem dar por isso.

O contraste do logótipo (`text-brand` sobre branco, 3,24:1) continua abaixo de
AA na navegação e no rodapé. É anterior a este trabalho e está deliberadamente
fora deste âmbito — mas devia entrar num.
