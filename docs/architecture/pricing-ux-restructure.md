# Reestruturação da interface de `/ferramentas/calcular-preco`

> **Âmbito: interface.** A matemática de `src/lib/pricing/` não muda — o
> `pricing-calculation-spec.md` continua a ser a fonte de verdade e os 2 293
> testes continuam a passar sem edição. O que muda é **o que se pergunta, por
> que ordem, e como o resultado é mostrado**.
>
> Escrito a 2026-08-19, contra a v2.78.0 da ferramenta.
>
> **ESTADO: aplicado na v2.85.0.** As cinco fases e os três extras estão
> feitos. O diagnóstico fica como registo do que estava errado e do que se
> decidiu — não como trabalho por fazer. O que ficou em aberto está no fim,
> em §5. A descrição do que existe hoje está em `pricing-ux-flow.md`.

---

## 0. As fronteiras que este trabalho não atravessa

Antes do diagnóstico, o que fica intacto — porque o pedido é *elevar* o que
existe, não substituí-lo:

| Não se toca | Porquê |
|---|---|
| `src/lib/pricing/**` (exceto `perguntas.ts`) | O solver, os motores e a proveniência estão certos e testados. |
| A ordem DOM `essencial → resultado → avançado` | É um teste (`preco-navegacao.test.ts` ④) e uma decisão já validada. |
| O slider dentro da caixa do resultado | Teste ③. Em mobile, separá-los põe o cursor quatro ecrãs abaixo do número. |
| `versao: 1` do `ContextoPreco` | Persistido no cofre. Ganha um **envelope** v2 com retrocompatibilidade, não uma mudança de forma. |
| `privacy: "local-only"` | Nada de novo sai do dispositivo. Exportar é imprimir e copiar, não enviar. |
| Zero violações axe WCAG 2.1 AA | Estado atual. Sai daqui com **menos** defeitos de teclado, não com mais. |
| Sem dependências novas | Tudo com o que já existe: `motion`, `LocalizedNumberInput`, `Icons`, `InfoTip`. |

---

## 1. Diagnóstico

Vinte e um defeitos, todos verificados no código. Agrupados por onde doem.

### 1.1 A estrutura do que se preenche

**D1 · Não existe a noção de «por responder».**
Todos os campos são números com valor por omissão. `LocalizedNumberInput`
devolve `min` (0) para um campo vazio, e 0 é um valor legítimo. A ferramenta
não distingue *«o custo é 0 porque é digital»* de *«ainda não disse»*.

Consequência direta: `tocado` é o único indicador de confiança e é **binário**.
Uma tecla em qualquer campo faz o resultado passar de «Um exemplo, por
enquanto» para «Quanto deves cobrar», com autoridade de conselho, por cima de
~25 pressupostos que ninguém confirmou. É o defeito que o próprio comentário em
`SimuladorPreco.tsx:141-151` diz ter vindo corrigir — e corrigiu-o só até ao
primeiro caractere.

**D2 · Os dez blocos avançados são opacos e estão todos fechados.**
Nenhum diz o que tem lá dentro, se está preenchido, ou o que muda no preço.
Quem os abre todos desiste; quem não abre nenhum leva um preço calculado com
zero custos fixos e zero comissões — apresentado como recomendação.
(NN/g #3 e #8: as pessoas acreditam que mais informação dá mais exatidão, mas
precisam de saber *qual* vale a pena.)

**D3 · Campos declarados que não existem na interface.**
`produto_revenda.avancado` declara `escaloes`; não há UI nenhuma para escalões
de quantidade. `desperdicio` é declarado como bloco mas vive dentro de
`custos_variaveis`. A promessa de `perguntas.ts` — «um cenário novo entra lá e a
interface segue-o» — já está partida.

**D4 · Campos do motor que a interface nunca pergunta.**
`anoAtividade` (1.º/2.º ano reduzem o coeficiente do Art. 31.º — **muda o preço
a sério** e o `contextoBase()` fixa-o em 3), `comissaoFixa`,
`precoAnterior30Dias` (exigido pela própria regra da ASAE que a página ensina),
`folgaConfortavel`, `produto.nome`, `residenciaFiscal`, `acumulaEmprego`.

**D5 · O mesmo controlo em dois sítios.**
«Onde vais vender» (bloco essencial, campo `canal`) e «Canal / marketplace»
(bloco «Comissões») escrevem ambos em `canal.marketplaceId`. Dois controlos,
duas posições no ecrã, um estado.

**D6 · `ComponenteMateria[]` suporta muitas matérias; a interface suporta uma.**
O modo rápido edita `materias[0]`; o bloco «Como produzes» não deixa acrescentar
nenhuma. Quem faz um bolo com farinha, ovos e cobertura não consegue dizê-lo.

**D7 · A ajuda vive só dentro de tooltips.**
`Campo` põe o texto de ajuda num `InfoTip`, sem `aria-describedby`. Para leitor
de ecrã a descrição não está ligada ao campo, e para toda a gente a informação
que evita o erro está escondida atrás de um clique. Só um campo em toda a
ferramenta dá uma âncora de valor razoável («entre 50% e 75% é o intervalo
defensável») — que é exatamente o que a NN/g #8 recomenda fazer em todos.

**D8 · Não há como corrigir sem destruir.**
«Mudar» apaga o cofre inteiro. Não há repor de um bloco, nem recomeçar mantendo
o cenário. (NN/g #6 pede as duas coisas, separadas.)

### 1.2 A interface do resultado

**D9 · Um cartão monolítico.**
Oito coisas sem hierarquia numa só caixa de ~830 px (medida no próprio
comentário do código): número, faixa, decomposição, quatro métricas, tesouraria,
sociedade, veredicto, preços psicológicos. Tudo sempre aberto. A 360 px são
quatro a cinco ecrãs de resultado antes de se chegar aos campos avançados.

**D10 · A barra «A cada venda» decompõe um número que não é o do cabeçalho.**
O cabeçalho mostra o **PVP**. A barra soma custo + custos de venda + impostos +
fixos + lucro, o que dá o **preço líquido** — e o IVA não aparece em lado
nenhum. Num produto a 23%, a barra que explica o número explica um valor 23%
menor do que o número. É o defeito de compreensão mais caro da página.

**D11 · A faixa de preço é uma barra empilhada a fingir de escala.**
O primeiro segmento vai de 0 € ao piso, por isso a cor do piso ocupa a maior
parte da barra e lê-se como «o piso é 80% do preço». Não há marcador do preço
recomendado nem da posição do slider.

**D12 · Os avisos aparecem depois de tudo.**
Ordem atual: campos → resultado → campos avançados → memória de cálculo →
**avisos** → cenários. Um aviso `perigo` («cada venda tira-te dinheiro») nasce
quatro ecrãs abaixo do preço a que se refere. O motor ordena-os por severidade;
a secção está enterrada.

**D13 · Saída do motor que nunca chega ao ecrã.**

| Calculado | Onde | Mostrado? |
|---|---|---|
| `resultado.desconto` (máximo suportável, se destrói a rentabilidade, unidades extra para compensar) | `motores/desconto.ts`, 89 linhas | **Não.** O bloco «Desconto ou promoção» é um input sem output. |
| `resultado.caixa` (cobrado ao cliente → entra na conta → sai depois) | `motor.ts:267` | **Não.** É literalmente o posicionamento do produto. |
| `fiscal.notas` | `fiscal-ti.ts` | **Não.** |
| `breakEven.diasAoRitmoAtual` | `breakeven.ts` | **Não.** |
| `margem.contribuicao{Unidade,Percentagem,Mensal}` | `margem.ts` | **Não.** |
| `custo.diretoIntroduzido` | `motor.ts:213` | **Não.** Impede dizer «introduziste 10 €, o teu custo real é 12,30 € porque não deduzes IVA». |
| `precoParaGanhar` / `unidadesParaGanhar` | `motores/objetivo.ts`, 215 linhas, exportadas e testadas | **Não.** O «Nível 4 — objetivo invertido» do `pricing-ux-flow.md` não existe na interface. |

**D14 · `ok === false` é uma parede.**
Quando não há preço possível, desaparecem faixa, slider, métricas, cenários e
memória. Fica um retângulo vermelho com uma frase — no momento em que a pessoa
mais precisa de saber *qual* fração está a comer o preço e qual é o teto real.

**D15 · Os preços psicológicos são inertes.**
Uma fila de chips. Não se vê qual está mais perto do recomendado, e não há forma
de adotar um.

**D16 · O número muda em silêncio.**
Não há `aria-live`: para quem usa leitor de ecrã, escrever num campo não anuncia
nada. E para toda a gente não há indicação do que mudou nem de quanto — apesar
de `CountUp`/`AnimatedNumber` existirem no design system e não serem usados aqui.

**D17 · O estado «exemplo» é inconsistente.**
`ResultadoPreco` avisa que o número é um exemplo; o `SliderPreco` e a tabela de
`Cenarios`, logo por baixo, apresentam os mesmos números sem qualquer ressalva.

### 1.3 Acessibilidade e ligação ao sistema

**D18 · `Segmentado` não é o `radiogroup` que o comentário diz que é.**
`atomos.tsx:178-180` afirma: *«É um `radiogroup` a sério — com setas do teclado —
e não uma fila de botões que só parece um.»* Não há `onKeyDown` nem roving
`tabIndex`. As setas não fazem nada e todos os botões são tabuláveis. O axe não
o apanha (o padrão `radiogroup`+`radio` está formalmente correto), e por isso
passou o «zero violações» estando partido para quem navega por teclado.

**D19 · `ListaCustos` não usa `LocalizedNumberInput`.**
Faz parsing à mão (`replace(/[^\d,.]/g, "")`), ao contrário de todos os outros
campos numéricos da aplicação. «1.234,50» parte. Além disso, «+ Outro» cria uma
linha com rótulo vazio cujo botão de remover fica com `aria-label="Remover "`.

**D20 · A ferramenta não tem próximo passo.**
Acaba num parágrafo de isenção de responsabilidade. Não chama `escolherRota()`,
não tem guardar, exportar, copiar nem envio ao contabilista. A skill
`crescimento-recibocerto` é explícita: *«Tem transição definida? […] Sem
transição, é dívida editorial.»*

**D21 · A ferramenta não mede nada.**
Dispara `simulator_start` e mais nada. `simulator_step`, `simulator_complete` e
`result_view` estão declarados em `analytics/eventos.ts` e nunca são chamados —
por isso esta ferramenta contribui **zero** para a North Star (DVM =
`simulator_complete` + `result_view`), e não há dados sobre onde as pessoas
desistem. (Nota: nenhum componente da aplicação dispara estes três. Fora deste
âmbito, mas fica registado.)

### 1.4 Layout

**D22 · `layout: "wide"` (max-w-6xl) desenhado numa coluna só.**
Em desktop metade do ecrã está vazia enquanto o número que se está a afinar sai
do viewport ao abrir o primeiro acordeão. O comentário no código explica que o
`sticky` foi removido porque o cartão tem 830 px — a correção certa não é tornar
um cartão alto pegajoso, é destacar um **resumo baixo** e deixar o cartão rolar.

---

## 2. A arquitetura alvo

Três zonas que nunca trocam de sítio:

```
DEFINIR                    PREÇO                      DECIDIR
cenário                    resumo fixo (≤64px)        próximo passo (escolherRota)
o essencial (≤5)           cartão de preço            guardar · copiar · imprimir
afinar (checklist)         avisos graves              enviar ao contabilista
                           tesouraria · caixa
                           desconto · sociedade
                           experimentar (slider,
                           objetivo invertido,
                           cenários)
                           memória de cálculo
```

Em mobile é uma coluna, por esta ordem, com o DOM inalterado
(`essencial → resultado → avançado`) e uma **barra de resumo compacta** que
aparece ao rolar. Em `lg:` são duas colunas: `DEFINIR` à esquerda,
`PREÇO`+`DECIDIR` à direita, com apenas o resumo em `sticky`.

### 2.1 A peça que desbloqueia tudo o resto: `respondidos`

Um `Set<string>` de ids de campo que a pessoa respondeu mesmo, mantido ao lado
do `ContextoPreco` (nunca dentro — o contexto é o contrato do motor).

Isto resolve D1, e ao resolvê-lo dá:

- **confiança real** — `estimado` enquanto faltarem campos essenciais do
  cenário, `completo` quando estiverem todos. É exatamente o `EstadoConfianca`
  que `simulator_complete` e `escolherRota()` precisam (D20, D21);
- **a checklist do «afinar»** — cada bloco sabe dizer se está por preencher (D2);
- **pressupostos declarados** — «estamos a assumir X porque não disseste»,
  que é a promessa do cabeçalho de `perguntas.ts` e nunca foi cumprida.

Persistência: envelope `versao: 2` = `{ versao: 2, contexto, respondidos }`.
`lerContextoPreco` é chamado primeiro com 2 e, falhando, com 1 — um cofre v1
lê-se como `{ contexto: v1, respondidos: [] }`. Ninguém perde trabalho.

### 2.2 O que muda em cada ficheiro

| Ficheiro | Ação |
|---|---|
| `components/precos/SimuladorPreco.tsx` | Orquestra as três zonas, `respondidos`, medição, layout de duas colunas. |
| `components/precos/CamposPreco.tsx` (898 l.) | **Parte-se em três**: `CamposEssenciais.tsx`, `Afinar.tsx` (a checklist) e `blocos/` (um ficheiro por família). |
| `components/precos/ResultadoPreco.tsx` (524 l.) | **Parte-se**: `ResumoPreco.tsx` (a barra fixa), `CartaoPreco.tsx` (número, faixa, decomposição, métricas), `Tesouraria.tsx`, `Sociedade.tsx`, `Caixa.tsx` (novo), `Desconto.tsx` (novo). |
| `components/precos/EQueSe.tsx` | Ganha um terceiro separador: objetivo invertido. |
| `components/precos/atomos.tsx` | `Segmentado` com teclado; `Campo` com `aria-describedby` e ajuda visível; `Bloco` com estado e `aria-controls`; `ListaCustos` migra para `LocalizedNumberInput`. |
| `components/precos/Decidir.tsx` | **Novo.** `escolherRota()` + guardar/copiar/imprimir. |
| `lib/pricing/perguntas.ts` | Cada campo passa a declarar `id`, `essencial`, `rotulo` e `porque`; cada bloco declara `porque` e `oQueMuda`. Continua a ser dados. |
| `lib/store/preco.ts` | Envelope v2 com leitura retrocompatível. |
| `lib/pricing/motores/explicacao.ts` | Uma linha nova: a decomposição do **PVP** com o IVA à parte (corrige D10 na origem, não na apresentação). |
| `app/ferramentas/calcular-preco/page.tsx` | Print CSS para o «imprimir». Conteúdo editorial inalterado. |
| `docs/architecture/pricing-ux-flow.md` | Reescrito para descrever o que passa a existir. |
| `lib/__tests__/preco-navegacao.test.ts` | Garantias preservadas, expressas contra a estrutura nova; testes novos para `respondidos`, teclado do `Segmentado` e ordem dos avisos. |

---

## 3. Plano de execução

Cinco fases. Cada uma deixa a ferramenta a funcionar — nenhuma depende da
seguinte para não regredir.

### Fase 1 — Corrigir o que está errado (sem mexer na estrutura)

O que se ganha sem reorganizar nada. Se só isto fosse aplicado, a ferramenta já
ficava melhor.

1. **D10** — a barra «A cada venda» passa a decompor o **PVP**, com um segmento
   `IVA — não é teu, é do Estado` (só quando `taxaIVA > 0`), e a aritmética sai
   do componente para o motor.
2. **D12** — os avisos `perigo` e `atencao` sobem para **imediatamente debaixo do
   número**; os `info` ficam onde estão.
3. **D18** — `Segmentado` ganha roving `tabIndex` + setas (padrão WAI-ARIA).
4. **D19** — `ListaCustos` passa a `LocalizedNumberInput`; rótulo vazio deixa de
   produzir `aria-label` vazio.
5. **D7** — `Campo` ganha `aria-describedby`; a ajuda crítica passa a texto
   visível por baixo do campo, o `InfoTip` fica para o detalhe legal.
6. **D16** — região `role="status"` com uma frase curta e debounced (≈500 ms):
   «Preço 24,60 € com IVA · margem 32%».
7. **D17** — o estado «exemplo» propaga-se ao slider e aos cenários.
8. **D5** — o «Canal / marketplace» duplicado sai do bloco de comissões e passa a
   uma linha de leitura com ligação ao campo essencial.

### Fase 2 — `respondidos` e a confiança a sério

9. Envelope v2 no cofre, com leitura de v1.
10. `respondidos` no estado; cada `aoMudar` regista o id do campo.
11. `perguntas.ts` declara, por cenário, o **conjunto mínimo** que faz a
    confiança passar a `completo`.
12. O cartão de resultado troca o binário exemplo/recomendação por três estados:
    `exemplo` (nada respondido) · `estimado` (falta o essencial, e diz-se
    **o quê**) · `completo`.
13. Bloco «Estamos a assumir» — lista os pressupostos ainda por confirmar, cada
    um com um botão que abre o campo respetivo. É o antídoto para a NN/g #10
    («avoid misleading defaults»).

### Fase 3 — Reestruturar o preenchimento

14. `CamposPreco` parte-se; `blocos/` com um ficheiro por família.
15. O modo preciso passa a **checklist**: por bloco, título, uma linha de
    porquê, estado (`por preencher` / `3 itens · 320 €/mês`) e o que muda
    (`muda o preço mínimo` / `muda só a tesouraria` / `muda o equilíbrio`).
    Ordenado pela relevância que `definicao.avancado` já declara, com os blocos
    que os `avisos` do motor apontam como em falta marcados primeiro.
16. Campos em falta: `anoAtividade`, `escaloes` (D3), `comissaoFixa`,
    `precoAnterior30Dias`, várias `materias` (D6), `folgaConfortavel`,
    `produto.nome`.
17. «Repor este bloco» por bloco e «Recomeçar» global, distinto de «Mudar de
    cenário» (D8).
18. Seletor de cenário agrupado em três famílias, com «Ainda não tenho a certeza»
    como saída discreta em vez de 12.º cartão.

### Fase 4 — Reestruturar o resultado

19. `ResumoPreco` — barra de ≤64 px, `sticky` (o único da página): PVP · sem IVA ·
    margem · «fica-te X por venda» · selo de confiança.
20. `CartaoPreco` — número, faixa **redesenhada como escala** com marcador do
    recomendado e da posição do slider (D11), decomposição corrigida, métricas.
21. Secções irmãs: `Tesouraria`, `Caixa` (novo — D13), `Desconto` (novo — D13),
    `Sociedade`, `Veredicto`, `Preços redondos` com «usar este preço» (D15).
22. `ok === false` passa a diagnóstico (D14): fração disponível, quem a consome,
    margem máxima possível e um botão «pôr a margem no máximo que dá».
23. Delta local: «+1,20 € desde a última alteração» junto ao número, em texto —
    nunca só animação.
24. Layout de duas colunas em `lg:`, DOM inalterado.

### Fase 5 — Decidir e medir

25. `Decidir.tsx`: `escolherRota()` com os sinais reais (confiança de `respondidos`,
    `enquadramento` de `vendedor.tipo`, `contabilidadeOrganizada`), uma ação
    principal, nunca três com o mesmo peso.
26. Guardar no cofre com nome (`produto.nome`) → `result_save`.
27. Copiar resumo em texto e imprimir (print CSS) → `result_export`. Local, sem
    servidor.
28. Objetivo invertido no `EQueSe` (D13): «quero ganhar X/mês» → `precoParaGanhar`;
    «consigo cobrar Y» → `unidadesParaGanhar`.
29. Medição: `simulator_step` (cenário escolhido, primeiro preenchimento de cada
    bloco), `simulator_complete` (confiança chega a `completo`), `result_view`
    (primeira vista de um número não-exemplo). Sem eventos novos, sem valores —
    a barreira de `pii.ts` continua a mandar.

---

## 4. Verificação

O protocolo da skill `verificacao-e-qualidade` mais o próprio da ferramenta:

```bash
npx tsc --noEmit && npm test && npm run build
npm audit --audit-level=high && npm run fiscal:check
npm run busca:check && npm run versao:check
```

E, porque isto é interface:

- **axe em três estados** — desktop claro, mobile 360 px, desktop escuro. Zero
  violações WCAG 2.1 AA é o estado atual e o mínimo à saída.
- **Teclado** — percorrer a ferramenta inteira sem rato, incluindo o `Segmentado`
  com setas e a tabela de cenários com scroll.
- **360 px** — sem overflow horizontal; resultado antes dos campos avançados.
- **Modo escuro** a olho, ecrã a ecrã.
- **`APP_VERSION` + entrada no `CHANGELOG`** (regra 9 do `CLAUDE.md`).

Testes novos em `preco-navegacao.test.ts`:

- as garantias ①–④ continuam expressas contra a estrutura nova;
- `respondidos` não desaparece e a confiança não pode ser `completo` sem ele;
- o `Segmentado` tem tratamento de teclado;
- os avisos `perigo` renderizam antes dos campos avançados;
- a decomposição soma o PVP, não o líquido.

---

## 5. O que ficou de fora — e o que entrou depois

Três dos cinco itens que este plano tinha deixado de fora foram feitos a
seguir, um de cada vez, a pedido:

- **`ResultadoExplicado` — FEITO.** Não era incompatível com um resultado
  interativo: já importa um componente de cliente, e o Next compila-a como
  cliente quando o pai o é. O que estava errado era o comentário, que se lia
  como «não serve para ferramentas interativas». Entra como **conclusão** do
  resultado e não como moldura dele — as seis camadas são uma ordem, não um
  cartão único —, e traz as quatro que não existiam em lado nenhum: como
  chegámos aqui, o que fazer, **fontes e limites** e o próximo passo. Ver
  `components/precos/ConclusaoPreco.tsx`.

- **Medição nas outras ferramentas — FEITO.** Entrou no `ToolShell`, que já
  envolve a zona interativa das quinze, e não em quinze componentes: quinze
  definições de «acabou» produzem dados que não se somam. Ver
  `components/ferramentas/MedidorFerramenta.tsx`.

- **Comparar vários produtos — FEITO.** `/dashboard/precos`. Os números são
  recalculados com as taxas de hoje, porque comparar dois preços guardados em
  anos fiscais diferentes não é comparar. Vive no dashboard e não em
  `/ferramentas` — esse lado da casa é público e entra no sitemap.

Continuam deliberadamente de fora:

- **Preços de mercado / benchmarks por setor.** «Nunca inventar preço de
  mercado» continua a valer. Só se usam âncoras com fonte
  (`TAXA_FATURAVEL_PADRAO`, `CANAIS_COMISSAO`).
- **Partilhar por link.** Encodar o contexto na URL põe custos de fornecedor no
  histórico do browser e na área de transferência. Precisa de decisão de
  produto, não de código.
- **A medição nas versões `/dashboard/*` das ferramentas.** O medidor vive no
  `ToolShell`, e essas rotas não o usam. As rotas canónicas — as que a pesquisa
  encontra — são as de `/ferramentas`, e são essas que ficam cobertas.
