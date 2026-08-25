# Auditoria completa — `/ferramentas/calcular-preco`

**Data:** 25 de agosto de 2026 · **Versão auditada:** `2.117.0` · **Ramo:** `claude/recibocerto-price-calculator-audit-n1efei`
**Âmbito:** a página pública, o simulador, os 12 cenários, todos os botões e campos, os 20 módulos de `src/lib/pricing/` e os dados fiscais que os alimentam.

---

## 1. Sumário executivo

A ferramenta está, no essencial, **muito acima da média do mercado português**. A matemática do solver está correta e provada, os dados fiscais estão atualizados a 2026 e verificados contra fonte legal, e a acessibilidade está limpa. O que a auditoria encontrou não são erros de conceito — são **fugas nas bordas**: três sítios onde o mesmo número é calculado duas vezes por caminhos diferentes, e um sítio onde o trabalho do utilizador se perde.

### Estado das verificações obrigatórias

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ limpo |
| `npm test` | ✅ **171 ficheiros, 3752 testes, 0 falhas** |
| `npm run build` | ✅ compila |
| `npm audit --audit-level=high` | ✅ **0 vulnerabilidades** |
| `npm run fiscal:check` | ✅ OK — ano fiscal 2026, revisão 2026-08-24 |
| axe WCAG 2.1 AA (desktop claro) | ✅ **0 violações** |
| axe WCAG 2.1 AA (mobile 360 px) | ✅ **0 violações** |
| axe WCAG 2.1 AA (desktop escuro) | ✅ **0 violações** |
| Overflow horizontal a 360 px | ✅ nenhum |
| `NaN` / `Infinity` / `undefined` no ecrã | ✅ nenhum, em nenhum dos 12 cenários |
| Erros de consola / de página | ✅ nenhum |
| Nome acessível em elementos focáveis | ✅ 56/56 |

### Defeitos encontrados

Seis confirmados. Um sétimo (**B6**) foi levantado e depois **retirado**: era um erro de medição da própria auditoria, não um defeito do código — a §2 explica porquê.

| # | Severidade | Defeito | Ficheiro |
|---|---|---|---|
| **B1** | 🔴 **Crítico** | Recarregar a página apaga todo o trabalho do utilizador **e destrói o que estava guardado** | `SimuladorPreco.tsx` |
| **B2** | 🟠 **Alto** | O bloco de desconto mostra **outra margem e outro lucro** que o cartão principal, no mesmo ecrã | `motores/desconto.ts` |
| **B3** | 🟡 **Médio** | A «memória de cálculo» **não fecha** em 3 dos casos mais comuns | `motores/explicacao.ts` |
| **B4** | 🟡 **Médio** | As devoluções entram **duas vezes** nas despesas dedutíveis | `motor.ts:111` |
| **B5** | 🟡 **Médio** | «Quanto preciso de vender» **ignora as contas fixas** quando não há volume declarado | `motores/objetivo.ts` |
| ~~B6~~ | ⬜ **Retirado** | ~~Alvos de toque de 16×16 px~~ — **erro de medição meu**, o alvo real é 36×36 px | — |
| **B7** | 🟢 **Baixo** | `lucroAoPVP` repete o defeito do B2 — código morto com armadilha armada | `motores/objetivo.ts` |

Nenhum destes é apanhado pelos 3752 testes existentes. Todos são reproduzíveis; cada um traz abaixo o número exato.

---

## 2. Defeitos, com prova

### 🔴 B1 — Recarregar a página apaga o trabalho (e destrói o cofre)

**Ficheiro:** `src/components/precos/SimuladorPreco.tsx`, efeito «Retomar o que ficou por acabar».

```tsx
useEffect(() => {
  if (retomou.current) return;
  retomou.current = true;
  if (embutido) return;
  if (cenario) return;          // ← aqui
  const lido = lerEnvelopePreco<ContextoPreco>(1);
  ...
}, [cenario]);
```

**O que acontece.** Escolher um cenário escreve `?c=produto_revenda` no URL (é o que `irPara()` faz, de propósito, para o «voltar» do telemóvel funcionar). A partir daí o URL tem sempre `?c=`. Ao recarregar, `cenario` já vem preenchido a partir da query — e a guarda `if (cenario) return` **impede a leitura do cofre**. O efeito seguinte constrói um contexto novo com os valores por omissão do cenário, e o efeito de gravação escreve-o por cima do trabalho guardado.

**Reprodução medida** (Chromium, servidor de produção):

```
1) depois de preencher   cofre = {"custo":47,"respondidos":["custo-direto","volume"]}
2) DEPOIS DE RECARREGAR  cofre = {"custo":10,"respondidos":[]}
   campo no ecrã: custo = 10   volume = 50
```

O cofre é gravado corretamente (`store/preco.ts` está bem: o envelope v2 e a retrocompatibilidade v1 funcionam). O problema é só a guarda — e o custo é **perda de dados silenciosa**: quem passou vinte minutos a introduzir a estrutura de custos e carregou em F5 encontra o formulário vazio, sem nada que explique porquê, e já não o consegue recuperar.

**Correção sugerida.** A guarda existe para resolver um problema real e diferente — o botão «Mudar» punha `cenario` a `null`, o efeito voltava a correr e ressuscitava o contexto acabado de limpar. Mas a condição certa não é «há cenário»: é **«este cenário já tem trabalho meu?»**. Ler o cofre sempre à entrada e só aceitar o que lá está quando o cenário guardado coincide com o do URL:

```tsx
useEffect(() => {
  if (retomou.current) return;
  retomou.current = true;
  if (embutido) return;
  const lido = lerEnvelopePreco<ContextoPreco>(1);
  if (!lido?.contexto.cenario) return;
  // Sem cenário no URL: retoma-se o que estava. Com cenário no URL:
  // só se for o MESMO — senão a pessoa está a abrir outra coisa.
  if (cenario && lido.contexto.cenario !== cenario) return;
  setCenario(lido.contexto.cenario);
  setContexto(lido.contexto);
  setRespondidos(new Set(lido.respondidos));
}, [cenario]);
```

`voltarAoSeletor()` já chama `limparContextoPreco()`, portanto o caso do «Mudar» continua resolvido: depois de limpar não há nada para ressuscitar.

**Teste de regressão a acrescentar:** gravar um contexto no cofre com `cenario: "produto_revenda"`, montar o simulador com `cenarioInicial="produto_revenda"` e exigir que o custo lido seja o do cofre e não o do exemplo.

---

### 🟠 B2 — Duas margens diferentes para o mesmo preço, no mesmo ecrã

**Ficheiro:** `src/lib/pricing/motores/desconto.ts`, linhas ~46-47; alimentado por `motor.ts` §14.

```ts
const lucroAntes  = lucroAoPreco(e.solver, num(e.precoLiquido)) - num(e.fixosPorUnidade);
const lucroDepois = lucroAoPreco(e.solver, precoLiquidoComDesconto) - num(e.fixosPorUnidade);
```

Isto é exatamente o padrão que a especificação proíbe no **invariante 11** e que `margem.ts` documenta em comentário: medir o lucro **fora** do solver que resolveu o preço perde o escudo fiscal dos custos fixos. `motor.ts` passa `solver` (sem fixos) e subtrai `fixosPorUnidade` à mão; o cartão principal usa `solverComFixos`, onde os fixos são despesa dedutível e levam τ.

**Diferença algébrica:** `lucro_principal − lucro_desconto = τ × fixosPorUnidade`.

**Reprodução no ecrã real** — TI, contabilidade organizada, faturação 40 000 €, renda 600 €/mês, 100 unidades/mês, margem pedida 35%, desconto 10%:

| | Cartão de resultado | Bloco «O efeito do desconto» |
|---|---|---|
| Preço ao cliente | 62,54 € | 62,54 € |
| **Margem** | **35,0 %** | **31,4 %** |
| **Fica-te por venda** | **17,80 €** | **15,95 €** |

O mesmo preço, a mesma venda, dois números. A coluna «antes do desconto» do bloco de desconto devia ser, por definição, o que o cartão diz — e não é.

**Confirmação de que a causa é τ:** no regime simplificado (τ = 0) os dois coincidem ao cêntimo (35,0000 % vs 35,0000 %). Só morde quem está em contabilidade organizada.

**Correção sugerida.** Passar `solverComFixos` a `calcularDesconto` e deixar cair a subtração manual:

```ts
// motor.ts §14
? calcularDesconto({
    solver: solverComFixos,   // era `solver`
    ...
    // `fixosPorUnidade` deixa de ser preciso para o lucro
  })

// desconto.ts
const lucroAntes  = lucroAoPreco(e.solver, num(e.precoLiquido));
const lucroDepois = lucroAoPreco(e.solver, precoLiquidoComDesconto);
```

⚠️ **Não mexer no `descontoMaximo`.** Esse usa `pisoAbsoluto(solver)` — sem fixos — e está **certo**: o desconto máximo é onde a margem de *contribuição* chega a zero, e a definição do piso na especificação §7 é mesmo essa. Só as linhas do lucro/margem é que mudam de solver. O mesmo vale para `contribuicaoAntes`/`contribuicaoDepois`, que têm de continuar a medir contribuição.

**Teste de regressão:** para qualquer contexto com `regimeContabilidade: "organizada"` e custos fixos > 0, exigir `|desconto.margemAntes − margem.margem| < 1e-9`.

---

### 🟡 B3 — A memória de cálculo não fecha

**Ficheiro:** `src/lib/pricing/motores/explicacao.ts`.

O bloco «Como se chegou a este número» apresenta uma coluna de valores com sinal, que se lê como uma soma. Três linhas dessa coluna são **informativas** — a nota até o diz — mas trazem um valor **negativo em euros**, portanto entram na soma que o leitor faz.

**Caso 1 — produto próprio / encomenda** (as matérias-primas aparecem além do custo direto):

```
      8.33  Preço sem IVA
      1.92  IVA
     10.25  Preço ao cliente (PVP)
        -5  Custo direto          ← 5 €
        -5  Tecido                ← os MESMOS 5 €
      3.33  Lucro por venda
```
`8,33 − 10,00 = −1,67 €`, mas o resultado declarado é **+3,33 €**. Quem confere vê um prejuízo onde a ferramenta anuncia lucro.

Causa: em `custos.ts`, quando há produção própria, `variaveisDetalhe` recebe `producaoRes.detalhe` *além* de `diretoBase` já ser `producaoRes.total`. `explicacao.ts` imprime a linha «Custo direto» **e** itera `variaveisDetalhe`.

**Caso 2 — isento do Art. 53.º com custo introduzido com IVA:**

```
     31.85  Preço sem IVA
     -12.3  Custo direto
      -2.3  IVA que não consegues deduzir   ← nota: «Já está incluído no custo direto acima»
     -4.77  Segurança Social
     -5.22  IRS (taxa marginal)
      9.55  O que te fica, por venda
```
`31,85 − 24,59 = 7,26 €` contra os **9,55 €** declarados. Erra exatamente os 2,30 € duplicados.

**Caso 3 — desperdício:** idêntico. `17,86 − 15,00 = 2,86 €` contra **5,36 €** declarados, errando os 2,50 € da linha «Desperdício / quebra», cuja nota também diz «Já está no custo direto».

**Único caso que fecha:** revenda simples (`67,12 − 43,62 = 23,50 €` vs 23,49 € declarados ✅).

Isto é grave por uma razão específica deste produto: a memória de cálculo é **a prova**. É a secção que existe para a pessoa poder confiar no número. Uma prova que não fecha faz o oposto do que foi construída para fazer.

**Correção sugerida.** Dar às linhas informativas um tipo próprio, em vez de as disfarçar de subtração. `LinhaExplicacao` já tem `nota`; falta uma marca:

```ts
export interface LinhaExplicacao {
  ...
  /** Não entra na soma: detalha uma linha que já lá está. */
  informativa?: boolean;
}
```

Marcar `informativa: true` nas linhas «IVA que não consegues deduzir», «Desperdício / quebra» e nas de produção; e em `MemoriaCalculo.tsx` renderizá-las recuadas, sem sinal, ou com o valor entre parênteses. Depois **acrescentar um teste que exige que a coluna feche** em todos os cenários — é o teste que faltava e que teria apanhado os três casos:

```ts
it("a memória de cálculo fecha em todos os cenários", () => {
  for (const chave of CENARIOS_INICIAIS) {
    const r = precificar(cenarioPorChave(chave).contexto());
    const soma = r.explicacao.filter(l => !l.informativa && entrePVPeResultado(l)).reduce(...);
    expect(r.precoLiquido + soma).toBeCloseTo(r.margem.lucroUnidade, 2);
  }
});
```

---

### 🟡 B4 — As devoluções contam duas vezes nas despesas dedutíveis

**Ficheiro:** `src/lib/pricing/motor.ts`, linha 111.

```ts
const despesasSemComissoes =
  (custos.diretoAjustado + custos.variaveisFixos + custos.devolucoes + comissoes.fixos) * q * 12 +
  fixosMensaisTotais * 12;
```

Mas `custos.ts` já devolve as devoluções **dentro** de `variaveisFixos`:

```ts
// custos.ts:254
variaveisFixos: variaveisFixos + devolucoes,
devolucoes,                                   // ← e também à parte, para a explicação
```

**Medido** (portes 4 €, taxa de devolução 20%, custo de devolução 6 €):

```
variaveisFixos = 6      (portes 4 + devoluções 2)
devolucoes     = 2
soma usada     = 8      ← devia ser 6
```

O solver está certo — usa `custos.variaveisFixos` sozinho (linha 158) e conta as devoluções uma vez. O erro é só em `despesasSemComissoes`, que alimenta o IRS marginal da contabilidade organizada. Consequência: despesas dedutíveis sobrestimadas → taxa marginal de IRS subestimada → **preço recomendado ligeiramente abaixo do sustentável**, exatamente para quem tem devoluções altas (loja online).

**Correção:** retirar `custos.devolucoes` da soma. Uma linha.

**Nota de arquitetura:** o defeito nasce de `ResultadoCustos` expor `devolucoes` de duas maneiras — dentro de `variaveisFixos` e à parte — sem que o tipo o diga. Vale a pena renomear para `variaveisFixosComDevolucoes` ou documentá-lo no campo, senão volta.

---

### 🟡 B5 — «Quanto preciso de vender» ignora as contas fixas sem volume declarado

**Ficheiro:** `src/lib/pricing/motores/objetivo.ts`, `unidadesParaGanhar`.

```ts
const fixos = r.custo.fixosPorUnidade * Math.max(1, num(contexto.volume.unidadesMes));
```

Quando `unidadesMes = 0`, o motor devolve `fixosPorUnidade = 0` (por construção: `q > 0 ? fixos/q : 0`), e `0 × 1 = 0`. As contas fixas **desaparecem**.

**Medido** — renda de 1 000 €/mês, custo 10 €, preço 20 €, objetivo 500 €/mês:

```
volume declarado = 0  → 80 unidades necessárias    ← 1 000 €/mês de renda ignorados
volume declarado = 1  → 240 unidades
volume declarado = 7  → 240 unidades
volume declarado = 50 → 240 unidades
```

Três vezes menos do que o necessário, e precisamente na situação em que a pergunta se faz: quem pergunta *«quantas tenho de vender?»* é normalmente quem ainda não sabe quantas vende.

**Correção:** não reconstruir os fixos a partir do valor por unidade. O total mensal já existe dentro de `precificar()` (`fixosMensaisTotais`, que `calcularBreakEven` já consome) — falta expô-lo. Acrescentar um campo a `DetalheCustoUnitario` e lê-lo:

```ts
// tipos.ts — DetalheCustoUnitario
/** Custos fixos mensais totais, já com a mensalidade do canal. */
fixosMensais: number;

// objetivo.ts
const fixos = r.custo.fixosMensais;   // o número, não a reconstituição
```

**Bónus, do mesmo sítio.** `r.custo.fixosPorUnidade` vem arredondado por `cent()`. Multiplicá-lo pelo volume é o anti-padrão que a própria skill documenta («arredondar a meio da cadeia»): com 1 000 €/mês e 7 unidades, `142,86 × 7 = 1 000,02 €`. Passar o total resolve as duas coisas de uma vez.

---

### ⬜ B6 — Alvos de toque de 16×16 px · **RETIRADO — era um erro de medição**

A primeira versão deste relatório dizia que o `InfoTip` («Mais informação») media **16×16 px** e violava a regra 5b do `CLAUDE.md` (≥ 36 px) e o WCAG 2.2 SC 2.5.8 (24×24 px). **Está errado, e o erro era do método.**

O varrimento usou `getBoundingClientRect()`, que devolve a caixa do elemento e **não vê pseudo-elementos**. O `InfoTip` já alarga o alvo com um `::before`:

```
before:absolute before:-inset-2.5 before:content-['']
```

Medido como se deve, com `elementFromPoint()` e o elemento dentro do viewport:

```
caixa visual: 16×16 px      alvo real: 34×31 px      ::before inset: −10px
```

Ou seja: **36×36 px de área de toque**, acima da SC 2.5.8 e em linha com a regra do projeto. Não havia nada a corrigir, e nada foi corrigido.

Fica registado em vez de apagado porque a lição interessa mais do que o achado: **um alvo de toque não se mede pela caixa do elemento.** A nota entrou na skill `pricing-engine-recibocerto` para a próxima auditoria não repetir o mesmo erro.

*Nota que se mantém:* os restantes alvos pequenos que o varrimento encontrou (ligações do rodapé, `<summary>` das FAQ, links de fontes) são **texto em linha** e estão isentos pela exceção «inline» da própria SC 2.5.8.

---

### 🟢 B7 — `lucroAoPVP`: o mesmo defeito do B2, à espera

**Ficheiro:** `src/lib/pricing/motores/objetivo.ts`, fim.

```ts
const lucro = lucroAoPreco(solver, liquido) - num(fixosPorUnidade);
```

Mesmo padrão do B2. Hoje é inofensivo: `lucroAoPVP` **não é usado por nenhum componente nem exportado no `index.ts`** — confirmado por varrimento. Ou se corrige junto com o B2, ou se apaga. Deixá-lo como está é deixar a armadilha armada para quem o descobrir e o usar.

O mesmo ficheiro tem outro caso já resolvido e bem documentado (o parâmetro `liquidoPessoal` que «não escolhia nada»), com a regra escrita no comentário: *uma opção que não faz nada é pior do que nenhuma*. Aplica-se igual.

---

## 3. O que está certo — e vale a pena não partir

A auditoria testou tudo o que segue e **passou**:

- **O solver.** Forma fechada, `impossivel` em vez de `NaN`, teto de margem publicado. Nenhuma entrada finita produziu `NaN` em nenhum dos 12 cenários.
- **Invariante 1** — `PVP = líquido + IVA` ao cêntimo, arredondados em conjunto: `46,85 + 10,78 = 57,63` ✅
- **Invariante 11** — a margem entregue é a pedida, nos dois regimes: pedido 20/35/50 %, entregue 20,000/35,000/50,000 % ✅
- **`precoParaGanhar`** — pedir 1 000 / 2 000 / 3 500 €/mês devolve preços que rendem 1 000,00 / 2 000,04 / 3 500,04 €. Desvio máximo **4 cêntimos**. A correção do duplo bruteamento documentada no cabeçalho está mesmo lá.
- **Faixa de preço** — âncoras sempre por ordem crescente (`piso ≤ mínimo ≤ recomendado ≤ confortável`), nos dois regimes.
- **Preços psicológicos** — nenhuma sugestão abaixo do piso, mesmo forçando a margem a 5 %.
- **Ato isolado** — leva IVA a 23 % mesmo com 800 € de faturação, como manda o Art. 53.º n.º 6 a). ✅
- **Volume zero** — não parte: devolve preço, `tesouraria: null` e um break-even coerente.
- **Slider de preço** — teclado funciona, e nos extremos (mínimo e máximo) não produz `NaN`.
- **URL inválido** (`?c=xpto`) — recupera para o seletor.
- **Dark mode** — sem violações, sem overflow, modo claro intacto.
- **Dados fiscais** — cruzados com fonte oficial nesta auditoria:

| Parâmetro | No código | Confirmado |
|---|---|---|
| IVA Continente | 23 / 13 / 6 % | ✅ |
| IVA Madeira | 22 / 12 / 4 % | ✅ (reduzida a 4 % desde out/2024, DLR 6/2024/M) |
| IVA Açores | 16 / 9 / 4 % | ✅ |
| Limiar Art. 53.º | 15 000 € · 18 750 € | ✅ |
| IAS 2026 | 537,13 € | ✅ (Portaria 480-A/2025/1) |
| Taxa SS do TI | 21,4 % | ✅ |
| Coeficientes SS | 70 % serviços · 20 % bens | ✅ |
| Coeficientes Art. 31.º | 0,75 / 0,35 / 0,95 | ✅ |
| Retenção Art. 151.º | 23 % | ✅ (OE2025, mantida em 2026) |
| Dispensa de retenção | 15 000 € | ✅ |
| Escalões IRS 2026 | 8 342 … 86 634 €, 12,5 %→48 % | ✅ |
| IRC 2026 | 19 % geral · 15 % PME até 50 000 € | ✅ (Lei 64/2025) |
| Redução IRS regiões autónomas | −30 % | ✅ |
| DL 70/2007 | 30 dias · 124 dias/ano · 5 dias úteis à ASAE | ✅ |
| Livre resolução | 14 dias · 30 fora do estabelecimento | ✅ |
| Vendas à distância UE | 10 000 € | ✅ |

As regras de mercado (`pricing/regras.ts`) foram verificadas a **2026-08-18** — 7 dias, muito dentro do limite de 400 do `assertRegrasPricing()`.

---

## 4. Recursos fiscais a acrescentar

Da pesquisa às fontes portuguesas, quatro lacunas com impacto real no preço. Estão por ordem de retorno.

### 4.1 🔴 Autoliquidação do IVA na construção civil — *a maior lacuna*

**Art. 2.º, n.º 1, al. j) do CIVA**, na redação do **DL 97/2026, de 20 de maio** (Ofício-Circulado 30 101).

Quando um prestador fatura serviços de construção civil — incluindo **remodelação, reparação, manutenção, conservação e demolição de imóveis** — a um adquirente sujeito passivo com direito à dedução em Portugal, **o IVA é liquidado pelo adquirente, não pelo prestador**. A fatura sai a 0 % com a menção «IVA — autoliquidação».

**Porque é que isto importa aqui:** é provavelmente o caso mais comum de *«sou eletricista/canalizador/pedreiro e trabalho como subempreiteiro»*. Hoje a ferramenta mostra a essa pessoa um PVP com 23 % de IVA por cima — um preço que ela **não pode faturar**. Não é uma imprecisão: é o número errado no ecrã principal, no cenário `servico` com `cliente: empresa_pt`.

Como o repositório já lhe chama o nome noutro sítio (`guias/expansao/conteudo.ts`: «Autoliquidação interna (construção civil, sucatas)»), a base conceptual existe — falta ligá-la ao motor de preço.

**Implementação mínima:** um sinalizador em `PerfilCanal` (ou derivado da atividade escolhida), que force `taxaVenda = 0` mantendo `deduz = true` — porque, ao contrário do Art. 53.º, **aqui o prestador continua a deduzir o IVA das compras**. É precisamente a combinação que `SituacaoIVAPreco` ainda não sabe representar (`liquida: false` + `deduz: true`), e é a razão pela qual isto não é um `if` de duas linhas.

### 4.2 🟠 Regime de isenção transfronteiriço (número «EX»)

**Art. 53.º, n.os 1 e 2 do CIVA**, na redação do **DL 35/2025, de 24 de março** (transpõe a Diretiva UE 2020/285), em vigor desde **1 de julho de 2025**.

Um sujeito passivo português isento pode vender noutros Estados-membros **sem liquidar IVA local**, desde que o volume de negócios anual **em toda a União** não exceda **100 000 €**, e desde que tenha pedido o NIF com sufixo **«EX»**.

**Estado no repositório:** os dados **já existem e estão corretos** em `fiscal-data.ts` (limiar de 100 000 €, sufixo «EX», base legal). Mas o varrimento confirma que **nem `src/lib/pricing/` nem `avisos.ts` lhes tocam**. Um freelancer isento que escolha `cliente: empresa_ue` ou venda para a UE recebe hoje o aviso genérico da autoliquidação e o do OSS — e não recebe aquele que lhe pouparia dinheiro e trabalho.

**Implementação:** um aviso novo em `avisos.ts`, com o padrão dos que lá estão. Baixo custo, alto valor, e os dados já estão à espera.

### 4.3 🟡 Residência fiscal — o aviso pede uma coisa que a interface não deixa fazer

O aviso `irs-regiao-autonoma` termina assim:

> «Se resides no continente e só tens cá atividade, **diz-nos** — o IVA continua a ser o da região, mas o IRS não.»

**Não há como dizer.** O tipo `PerfilVendedor` tem `residenciaFiscal`, `fracoesFiscais()` lê-o, `escaloesIRSDaRegiao()` aplica-o — mas o varrimento a `src/components/precos/` não encontra **nenhum campo** que o escreva. O valor cai sempre no `?? vendedor.regiao`, que é a região *para efeitos de IVA*.

É a decisão de produto em aberto que o `PRICING-ENGINE-HANDOFF.md` §R9 já identifica. Duas saídas honestas: (a) acrescentar o campo ao bloco fiscal, ou (b) reescrever o aviso para não convidar a uma ação impossível. **Não fazer nenhuma das duas é a única opção má** — porque hoje a ferramenta pede uma coisa e não a aceita.

*(A skill `pricing-engine-recibocerto` também está desatualizada neste ponto: diz que o motor de IRS «é nacional» e que o preço fica «conservador» para quem vive nas regiões. Já não é verdade — o motor aplica os −30 %. Vale a pena corrigir o texto da skill.)*

### 4.4 🟢 Regime de IVA de caixa — ligar ao calendário de tesouraria

O guia `iva-de-caixa` existe e está bem feito (inclui a contrapartida que quase toda a gente omite: a dedução também passa a depender do pagamento). Mas `motores/tesouraria.ts` só conhece «normal-mensal», «normal-trimestral» e «isento».

Para quem opta pelo regime de caixa, a linha «a 25 de novembro saem-te 340 €» está **errada por construção** — nesse regime o imposto só é exigível quando o cliente paga. Como o motor de tesouraria é o que mais se aproxima da promessa do produto («tranquilidade, não cálculos»), é onde uma data errada custa mais.

**Sugestão de menor esforço:** não modelar o regime; **detetá-lo e calar-se**. Se o utilizador indicar que está em IVA de caixa, `calcularTesouraria` devolve as datas com `valor: null` e um `porqueSemValor` a explicar que a exigibilidade segue o recebimento. É a mesma disciplina que o IRS já segue neste motor — «um vazio explicado vale mais do que um número plausível».

---

## 5. Melhorias de interface e de produto

### 5.1 A ordem em mobile contradiz a documentação

A skill `pricing-engine-recibocerto` exige, na checklist final, «**o resultado antes dos campos em mobile**». Medido a 360 px, com o cenário `produto_revenda`:

```
#custo-direto (1.º campo essencial)   y = 1 065 px
ResumoPreco (a barra sticky)          y = 1 970 px
cartão de resultado                   y = 2 053 px
```

Os campos vêm primeiro, e o código **argumenta explicitamente o contrário** da skill:

> «PRIMEIRO PERSONALIZA-SE, DEPOIS VÊ-SE O NÚMERO. O resultado já esteve à frente de tudo, e isso punha uma recomendação por cima de campos que ninguém tinha preenchido.»

O argumento do código é bom e a decisão de produto parece-me defensável. **Mas a defesa habitual — «a barra `ResumoPreco` é sticky, portanto o número está sempre à vista» — não se aguenta em mobile:** a barra nasce a 1 970 px, ou seja **abaixo** dos campos essenciais. Quem preenche o custo, a margem e o volume não tem preço nenhum no ecrã enquanto o faz; só o vê depois de rolar cerca de mil píxeis. Em desktop não acontece, porque a grelha `lg:` põe as duas colunas lado a lado.

Duas coisas a decidir, e nenhuma delas é «deixar como está»:

1. **Alinhar a skill com o código** (ou o código com a skill). Enquanto disserem coisas opostas, a próxima pessoa a ler a skill «corrige» o código para pior.
2. **Considerar subir a `ResumoPreco` acima de `CamposEssenciais` no DOM, só em mobile.** Mantém o argumento do código — a recomendação completa continua depois dos campos — e resolve o ecrã em branco: a barra tem 56 px e foi desenhada precisamente para isso («o cartão tem ~830 px e não pode ser pegajoso; esta barra tem 56 px e pode»).

### 5.2 O consentimento de cookies tapa a ferramenta na primeira visita

Na primeira visita, o modal `z-[120]` de preferências de cookies cobre o ecrã inteiro e **intercepta todos os cliques** na ferramenta. Confirmado em automação: nenhum dos botões do seletor de cenário aceitou um clique enquanto o consentimento não foi dado — o Playwright reporta, em todos, `<div class="fixed inset-0 z-[120] …"> intercepts pointer events`.

É legalmente correto e provavelmente intencional. Fica registado por duas razões: (a) é o que qualquer utilizador novo encontra antes da ferramenta, e vale a pena olhar para essa primeira impressão de propósito; (b) **quebra automação de testes** — qualquer script de E2E precisa de semear `recibocerto:cookie-consent` no `localStorage` antes de navegar. Merece uma nota em `verificacao-e-qualidade`.

### 5.3 Sugestões menores

- **Sem `id` em vários campos.** As linhas de custos e as caixas de verificação não têm `id`, o que os torna difíceis de referenciar em testes. Têm nome acessível (o axe passa), portanto é dívida de testabilidade, não de acessibilidade.
- **`psicologico.ts`:** `candidatos.add(cent(d - 0.1))` está dentro do laço das terminações e corre uma vez por terminação com o mesmo resultado. Inofensivo (é um `Set`), mas confunde quem lê.
- **`unidadesParaGanhar`** devolve `margemResultante` medido ao preço praticado; com o B5 corrigido vale a pena confirmar que a explicação continua a bater com o número.

---

## 6. Plano de correção sugerido

Por retorno sobre esforço:

| Ordem | Item | Esforço | Impacto |
|---|---|---|---|
| 1 | **B4** — tirar `custos.devolucoes` da soma | 1 linha | Preço correto para lojas online em organizada |
| 2 | **B2** — passar `solverComFixos` ao desconto | ~4 linhas | Acaba com dois números contraditórios no mesmo ecrã |
| 3 | **B1** — corrigir a guarda de retoma | ~8 linhas | **Acaba com perda de dados** |
| 4 | **B5** — passar o total dos fixos | ~2 linhas | Resposta 3× errada passa a certa |
| 5 | **B3** — `informativa?: boolean` + teste que exige que a soma feche | ~1 h | A prova volta a provar |
| 6 | **B7** — corrigir ou apagar `lucroAoPVP` | minutos | Desarma a armadilha |
| 7 | **4.2** — aviso do regime «EX» | ~1 h | Dados já existem |
| 8 | **4.3** — campo de residência fiscal (ou reescrever o aviso) | ~2 h | Fecha uma promessa em aberto |
| 9 | **4.1** — autoliquidação na construção civil | ~1 dia | O maior alcance; exige `liquida: false` + `deduz: true` |

**Testes de regressão que faltam** e que teriam apanhado isto tudo:

1. A memória de cálculo **fecha** em todos os cenários (apanha o B3).
2. `desconto.margemAntes === margem.margem` em qualquer regime (apanha o B2).
3. As despesas dedutíveis passadas ao IRS **igualam** o custo real ao volume esperado (apanha o B4).
4. `unidadesParaGanhar` dá a mesma resposta seja qual for o volume declarado (apanha o B5).
5. Montar o simulador com cofre preenchido **e** `?c=` no URL retoma o cofre (apanha o B1).

---

## 7. Nota de método

Tudo o que está acima foi medido, não inferido.

- **Estático:** leitura integral de `src/lib/pricing/` (20 módulos, ~7 400 linhas), de `src/components/precos/` (27 componentes) e da página, contra `docs/architecture/pricing-calculation-spec.md`.
- **Dinâmico:** sondas sobre `precificar()` com contextos construídos para isolar cada hipótese; os números citados são a saída dessas sondas.
- **Runtime:** Chromium sobre o `build` de produção (`next start`), 12 cenários × 3 configurações (desktop claro, mobile 360 px, desktop escuro), varrimento de `NaN`/`Infinity`/`undefined`, medição de overflow e de alvos de toque, axe-core 4.12 com `wcag2a/2aa/21a/21aa`, navegação por teclado, histórico do browser, `localStorage` e `media: print`.
- **Fiscal:** cada parâmetro da tabela da §3 cruzado com fonte publicada (Portal das Finanças, Segurança Social, OCC, ASAE, Diário da República) na data desta auditoria.

Os ficheiros de sonda foram removidos; a árvore de trabalho ficou limpa.

---

## 8. O que foi aplicado

O diagnóstico acima foi escrito primeiro e as correções vieram a seguir, na
mesma linha de trabalho. Este é o registo do que mudou.

### Corrigido

| Item | O que mudou | Verificação |
|---|---|---|
| **B1** | A guarda de retoma deixou de ser «há cenário» e passou a ser «este cofre é deste cenário?». O «Mudar» continua a limpar o cofre, e um link para outro cenário continua a ganhar ao que estava guardado. | Runtime: `custo=47 volume=123` sobrevivem ao recarregamento; «Mudar» volta ao seletor e limpa o cofre |
| **B2** | `calcularDesconto` passou a receber `solverComFixos` e a medir o lucro com ele. `solver` fica para o piso e a contribuição, que por definição se medem sem estrutura. | Teste: `desconto.margemAntes === margem.margem` a 9 casas, nos dois regimes |
| **B3** | `LinhaExplicacao.informativa` distingue as linhas que decompõem outra parcela. `MemoriaCalculo` desenha-as recuadas, com o valor entre parênteses e um `sr-only` a dizer «já incluído acima». | Teste: a coluna fecha nos 12 cenários |
| **B4** | Saiu o `custos.devolucoes` duplicado de `despesasSemComissoes`. `DetalheCustoUnitario.devolucoes` passou a dizer no tipo que já está dentro de `variavelFixoPorUnidade`. | Teste: o custo variável sobe exatamente 2 €, não 4 |
| **B5** | `DetalheCustoUnitario.fixosMensais` expõe o total. `unidadesParaGanhar` lê-o em vez de reconstituir a partir do valor por unidade. | Teste: a resposta é 240 para volume declarado de 0, 1, 7, 50 e 300 |
| **B7** | `lucroAoPVP` apagado — não era chamado por ninguém, e reproduzia o defeito do B2. | `tsc` limpo; nenhuma referência no repositório |

### Acrescentado

| Item | O que passou a existir |
|---|---|
| **4.1** | Inversão do sujeito passivo na construção civil. `AUTOLIQUIDACAO_CONSTRUCAO` em `fiscal-data.ts` (Art. 2.º, n.º 1, al. j) CIVA + Ofício-Circulado 30 101), o estado `liquida: false` + `deduz: true` em `SituacaoIVAPreco`, o campo no bloco fiscal e o aviso `autoliquidacao-construcao`. Só aparece a quem vende a empresa portuguesa, e **pergunta-se** em vez de se adivinhar: a segunda condição do Ofício-Circulado depende do enquadramento do cliente. |
| **4.2** | Aviso `isencao-transfronteirica-ex` — o regime do DL 35/2025 com o limiar de 100 000 € na União e o número «EX». Os dados já estavam em `fiscal-data.ts`; faltava o caminho até ao ecrã. |
| **4.3** | Campo `residencia-fiscal` no bloco fiscal. O aviso `irs-regiao-autonoma` pedia uma resposta que a interface não aceitava; agora aceita. O rótulo de `regiao` passou a «Onde tens atividade», que é o que ele decide. |
| **Testes** | Os cinco da §6, mais quatro sobre a autoliquidação, o «EX» e a residência fiscal. |

### Não aplicado, e porquê

- **B6** — retirado: era um erro de medição da auditoria, não um defeito. Ver §2.
- **5.1 (ordem em mobile)** — a contradição entre a skill e o código resolveu-se
  **a favor do código**, que argumenta a decisão em comentário; a skill foi
  corrigida. Reordenar a grelha é uma decisão de design com risco de layout, e a
  regra 7 do `CLAUDE.md` manda validá-la com o utilizador antes de a fazer.
  **Fica em aberto**, com o número medido: a barra de resumo nasce a 1 970 px,
  abaixo dos campos, e por isso não há preço no ecrã enquanto se preenchem os
  primeiros campos em telemóvel.
- **4.4 (IVA de caixa)** — fica em aberto. Precisa de um campo novo e de uma
  decisão sobre o que o calendário deve dizer a quem está nesse regime.
- **5.2 (modal de cookies)** — é comportamento legal correto; ficou a nota para
  quem escrever automação.
