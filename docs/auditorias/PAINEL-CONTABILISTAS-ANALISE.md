# Painel de gestão dos contabilistas — análise profunda

> Data: 2026-08-16 · Base: `claude/analise-painel-contabilista-6c3lv5` (HEAD `db6516d`)
> Âmbito: `/contabilista/*`, `/admin/contabilista/*`, `src/lib/contabilistas/**`,
> `src/components/contabilistas/**` — ~26 000 linhas.
>
> **Estado verificado na base:** `npm run build` ✓ · `vitest run` 98 ficheiros /
> 1941 testes ✓ · `npm audit --audit-level=high` → 0 vulnerabilidades.
> Nenhum problema abaixo é uma falha de build ou de teste. São todos coisas que
> a suite atual não cobre.

---

## 1. O que o painel é

Nove destinos, uma moldura, duas moradas.

| Destino | Rota | O que resolve |
|---|---|---|
| Meu espaço | `/contabilista` | Workspace modular (vistas + módulos compostos pelo próprio) |
| Clientes | `/contabilista/clientes` | Tabela de vínculos, com ficha por pessoa |
| Casos | `/contabilista/casos` | Pedidos encaminhados pela triagem, com propostas |
| Agenda | `/contabilista/agenda` | Consultas (semana/mês) + semana-tipo |
| Trabalho | `/contabilista/trabalho` | Quadro de tarefas, quatro colunas |
| Partilhas | `/contabilista/partilhas` | Snapshots que os clientes enviaram |
| Fidelidade | `/contabilista/fidelidade` | Regras versionadas, cartões, benefícios |
| Progressão | `/contabilista/progressao` | Patamares de comissão, XP, créditos |
| Perfil | `/contabilista/perfil` | Editor + pré-visualização + tipos de consulta |

A segunda morada é `/admin/contabilista/*`: **o mesmo código**, com a camada de
dados a responder da loja de demonstração em memória. Não há reimplementação —
`src/app/admin/contabilista/page.tsx` é literalmente `export { default } from
"@/app/contabilista/page"`.

### O que está genuinamente bem feito

Antes da lista de problemas, porque isto condiciona o que vale a pena mexer:

1. **A fronteira de privacidade é estrutural, não documental.** O contabilista
   nunca lê `recibos`, `cenarios`, `recibos_vencimento` ou `preferencias_fiscais`.
   O `broker.ts` enumera as treze fontes uma a uma precisamente para que não
   exista um loader arbitrário por onde uma tabela fiscal entre.
2. **As escritas críticas vivem em RPCs com a precondição no `WHERE`.**
   `decidir_vinculo`, `marcar_consulta`, `concluir_consulta`, `cancelar_consulta`.
   Dois cliques simultâneos: o segundo não encontra linha. Duplo agendamento é
   impossível por restrição GIST, e o carimbo duplo por `UNIQUE (agendamento_id)`.
3. **Camada de domínio pura e testável** — `agenda.ts`, `dashboard/layout.ts`,
   `resumo.ts`, `progressao/catalogo.ts`. Sem React, sem Supabase, sem `window`.
4. **Compare-and-swap por `revision`** ao gravar o layout, e um diálogo que dá
   escolha real em vez de destruir a versão mais nova.
5. **Regras de fidelidade imutáveis e versionadas** — quem tem cartão a meio
   mantém a promessa com que começou.
6. **Confirmação antes do irreversível**, com as consequências escritas.

O painel não tem um problema de arquitetura. Tem um problema de **acabamento
desigual**: as superfícies escritas mais tarde (perfil, fidelidade, progressão,
workspace modular) seguem convenções que as mais antigas (agenda, casos,
partilhas, trabalho, clientes) não seguem — e vice-versa.

---

## 2. Erros e falhas verificados

Ordenados por impacto no utilizador.

### B1 · `validarLayout` assinala sobreposições que não existem — **provado**

`src/lib/contabilistas/dashboard/layout.ts:301-305`

```ts
const antes = items.map((i) => ({ ...i.desktop }));
const arrumados = compactarVertical(items);          // ← ORDENA o array
if (arrumados.some((i, idx) => i.desktop.row !== antes[idx]?.row)) {
  erros.push({ codigo: "modulos_sobrepostos" });     // compara items diferentes
}
```

`compactarVertical` devolve uma cópia **ordenada** por `(row, col)`. A comparação
por índice põe lado a lado módulos que não são o mesmo módulo.

Prova executada — dois módulos que não se tocam (linhas 1–4 e 5–8), gravados fora
de ordem:

```
erros            : [{"codigo":"modulos_sobrepostos"}]
valido           : false
posicoes finais  : [ 'ATN-01@r1', 'AGD-01@r5' ]   ← geometria intacta
```

O layout não mudou uma célula e mesmo assim é declarado inválido. Como
`paraVista()` (`dashboard/dados.ts:37`) corre `validarLayout` em **cada leitura**,
qualquer vista cujos items não estejam guardados por ordem de linha carrega
sempre com este erro.

Não é fatal hoje — `modulos_sobrepostos` está em `CODIGOS_NORMALIZAVEIS` e não
bloqueia gravar. Mas `validacao.ts` inteiro documenta um contrato assente neste
sinal, e o SQL (`dashboard_layout_invalido()`) trata o mesmo código como recusa.
Um sinal que mente é pior do que sinal nenhum.

**Correção:** comparar por `instanceId`, não por índice.

---

### B2 · Em modo de edição, os módulos nunca atualizam quando os dados chegam

`GrelhaEdicao.tsx:44` · `widgets.tsx:60-64`

```ts
const CorpoMemo = memo(CorpoDoModulo);   // "arrastar não é razão para recalcular"
```

Mas `CorpoDoModulo` não recebe dados por props — lê-os imperativamente:

```ts
function ler<K extends DominioDados>(broker: Broker, dominio: K) {
  const e = broker.estado(dominio);              // ← fora do fluxo de props
  return e.estado === "pronto" ? e.dados : null;
}
```

As cinco props (`type`, `colSpan`, `rowSpan`, `broker`, `href`) são todas
referencialmente estáveis: `broker` é `useMemo([contabilistaId])`, `href` é
`useCallback([base])`. Quando o broker notifica, o `Workspace` re-renderiza, a
`GrelhaEdicao` re-renderiza — e o `memo` corta, porque nada mudou nas props.

O caso que isto parte é exatamente aquele que o código tentou resolver.
`Workspace.acrescentar` (linha 184):

```ts
// Pede já o domínio: o módulo acabou de aparecer e um cartão vazio
// durante três segundos parece uma avaria.
void broker.pedirVarios(def.dominios);
```

O pedido parte, os dados chegam — e o cartão continua vazio até se sair da
edição, porque o `memo` bloqueia o único render que os mostraria.

**Correção:** um contador de versão do broker como prop, ou os widgets a
subscreverem o broker em vez de o lerem imperativamente.

---

### B3 · `Escape` anuncia «Movimento cancelado» e não cancela nada

`GrelhaEdicao.tsx:270-274`, cabeçalho do ficheiro linha 23

Cada seta chama `moverPorTeclado`, que **aplica já** a alteração via `onAlterar`.
O `Escape` limpa apenas a flag de modo:

```ts
if (e.key === "Escape") {
  setAMoverPorTeclado(null);
  setAnuncio("Movimento cancelado.");   // o módulo fica onde as setas o deixaram
  return;
}
```

Quem usa leitor de ecrã ouve que a operação foi cancelada quando não foi. É a
única pessoa a quem o painel mente sobre isto, porque quem vê o ecrã percebe.

**Correção:** guardar o `GridPlacement` à entrada do modo e restaurá-lo no
`Escape`.

---

### B4 · Abrir um caso mostra as mensagens do caso anterior

`casos/page.tsx:66-73`

```ts
const abrir = useCallback(async (id: string) => {
  if (aberto === id) { setAberto(null); return; }
  setAberto(id);                                    // abre já
  const [m, p, d] = await Promise.all([...]);       // e só depois vai buscar
  setMensagens(m); setPropostas(p); setDocumentos(d);
}, [aberto]);
```

`mensagens`, `propostas` e `documentos` são três slots partilhados por todos os
casos e não são limpos antes do pedido. Entre abrir o caso B e a resposta chegar,
o ecrã mostra o conteúdo do caso A por baixo do cabeçalho do caso B.

São casos do próprio contabilista — não é fuga de dados. É conteúdo errado
apresentado com confiança, num ecrã onde a decisão é enviar uma proposta.

---

### B5 · Uma falha de carregamento aparece como «não há casos»

`casos/page.tsx:60-62`

```ts
const carregar = useCallback(async () => {
  setCasos(await listarCasos());     // sem try/catch
}, []);
useEffect(() => { if (ficha) void carregar(); }, [ficha, carregar]);
```

Se a leitura falhar, a promessa rejeita sem tratamento e a página mostra o estado
vazio: *«Ainda não te encaminhámos nenhum caso.»* Uma afirmação falsa sobre
trabalho que pode existir.

Contraste: `agenda`, `clientes` e `trabalho` fazem `try/catch` + `avisos.erro`.
A diferença não quer dizer nada — é a ordem por que foram escritos.

---

### B6 · A Progressão inventa o patamar quando a leitura falha

`progressao/page.tsx:74-81`

```ts
.catch(() => {
  setEstado({ xp: 0, ..., patamarConquistado: 1, patamarComprado: 1 });
});
```

Falha a leitura → o ecrã apresenta **patamar Base, 10% de comissão, 0 XP**, sem
distinção nenhuma face ao valor verdadeiro. É a única página do painel com
`catch` e **zero** caminhos de reporte de erro, e por acaso é a que fala de
dinheiro do próprio.

Fabricar um número sobre a comissão de alguém é diferente de mostrar uma lista
vazia. Isto colide com a regra 1 do `CLAUDE.md` no espírito, ainda que não seja
dado fiscal: um número apresentado sem aviso de que não é real.

---

### B7 · Ticar um passo de uma tarefa faz o quadro inteiro voltar ao esqueleto

`trabalho/page.tsx:317` e `:331`

```tsx
onChange={async (e) => { await alternarPasso(p.id, e.target.checked); onRecarregar(); }}
```

`onRecarregar` → `carregar()` → `setALer(true)` → e no topo da página:

```tsx
if (aCarregar || aLer) return <EsqueletoPainel />;
```

O quadro inteiro — quatro colunas, todos os cartões, o cartão expandido — some
para um esqueleto durante duas idas à rede, por causa de uma checkbox.

Acresce que nem `alternarPasso` nem `acrescentarPasso` tratam erro: se a escrita
falhar, o recarregamento devolve a checkbox ao estado anterior sem uma palavra.

---

### B8 · A semana-tipo apaga-se antes de se saber se a nova entra

`dados.ts:427-450`

```ts
const { error: erroApagar } = await sb.from("contabilista_disponibilidade")
  .delete().eq("contabilista_id", contabilistaId);
if (erroApagar) return { erro: erroApagar.message };
if (regras.length === 0) return {};
const { error } = await sb.from(...).insert(regras.map(...));   // pode falhar
```

Duas escritas sem transação. Se o `insert` falhar, a semana-tipo do contabilista
já foi apagada e ele fica sem horários publicados — ninguém consegue marcar
consulta.

O estado em memória ainda tem as regras, por isso repetir o «Guardar» recupera.
Um refresh, não.

É o único fluxo de escrita do painel que **não** passa por RPC. Todos os outros
(`decidir_vinculo`, `marcar_consulta`, `guardar_dashboard_layout`…) já aprenderam
esta lição.

---

### B9 · Não há guarda nenhuma para alterações por gravar

Verificado: **zero ocorrências de `beforeunload` em todo o `src/`.**

Três ecrãs mantêm rascunho sujo e sabem que o mantêm:

| Ecrã | Estado | O que se perde |
|---|---|---|
| `perfil` | `porGuardar` | 16 campos: nome, título, apresentação, bio, especialidades, idiomas, contactos… |
| `agenda` › Semana-tipo | `porGuardar` | A semana inteira reescrita |
| `fidelidade` | `mudou` | Meta, desconto, os dois interruptores |

A `perfil` chega a mostrar *«Tens alterações por guardar»* (linha 861) e a barra
lateral tem nove destinos permanentemente a um clique. Basta carregar em
«Clientes» para perder tudo, sem uma pergunta.

Na agenda é pior: mudar do separador «Semana-tipo» para «Semana» desmonta o
componente e descarta o rascunho dentro da mesma página.

---

### B10 · Duas paletas de modo escuro dentro do mesmo painel — **verificado no CSS compilado**

O `CLAUDE.md` e a skill de design são explícitos: o dark mode é uma **camada de
override `.dark`** em `globals.css` que remapeia os neutros. Escrever `dark:` em
neutros contorna essa camada.

Offsets reais em `.next/static/chunks/3zsxa7rnbtohv.css`:

```
  82533  .dark .bg-white                        → #1e221b   (quente, do projeto)
  83563  .dark .border-stone-200                → #2e3329
 122464  .dark\:border-stone-800:is(.dark *)    → #292524   (frio, Tailwind)
 127994  .dark\:bg-stone-900:is(.dark *)        → #1c1917
```

Especificidade idêntica — `(0,2,0)` nos dois casos, porque `:is(.dark *)` conta
como uma classe. Empate resolvido por ordem: **as variantes `dark:` vêm depois e
ganham.**

O painel está partido ao meio:

| Convenção | Ficheiros | Exemplos |
|---|---|---|
| Escrevem `dark:` em neutros (ganham, palete fria) | 8 | `perfil` (73 ocorrências), `progressao` (28), `fidelidade` (26), `PerfilPreview` (19), `widgets` (17) |
| Só a camada `.dark` (palete quente) | 28 | `agenda`, `casos`, `partilhas`, `trabalho`, `clientes`, `TabelaClientes`, `VistaMes`, `Conversa`, `DetalheConsulta`… |

Consequência concreta: em modo escuro, ir de **Agenda** para **Fidelidade** muda
o fundo dos cartões de `#1e221b` (verde-acinzentado quente) para `#1c1917`
(castanho frio) e a borda de `#2e3329` para `#292524`. Dois desenhos escuros
diferentes no mesmo produto, a um clique de distância.

---

### B11 · Dois sistemas de cabeçalho concorrentes

| Sistema | Onde escreve | Páginas |
|---|---|---|
| `TituloDoPainel` + `AcoesDoPainel` | portal `#painel-titulo` / `#painel-acoes` na barra do topo (≥lg) | `fidelidade`, `progressao`, `perfil`, `Workspace` |
| `CabecalhoPainel` | `<h1>` dentro da página | `agenda`, `casos`, `partilhas`, `trabalho`, `clientes`, `clientes/[id]`, **e também** `fidelidade` + `progressao` |

Dois efeitos, ambos visíveis:

- **Seis rotas nunca preenchem `#painel-titulo`.** Em desktop, a área de título
  da barra do topo fica vazia em Agenda, Casos, Partilhas, Trabalho, Clientes e
  ficha de cliente — e preenchida nas outras quatro.
- **Duas rotas mostram o título duas vezes.** `fidelidade` renderiza
  `<TituloDoPainel>Fidelidade</TituloDoPainel>` **e**
  `<CabecalhoPainel titulo="Fidelidade" …>`. `progressao` faz o mesmo com
  «Progressão e comissão».

O comentário do `CabecalhoPainel` diz que existe «para os seis ecrãs do painel
abrirem da mesma maneira». Passaram a ser nove, e agora abrem de três maneiras.

---

### B12 · Padrão ARIA de separadores incompleto em cinco sítios

`role="tab"` sem `aria-controls`, sem `role="tabpanel"`, sem navegação por setas
nem roving `tabindex`:

- `agenda/page.tsx:200` (Semana · Mês · Semana-tipo)
- `fidelidade/page.tsx:218` (quatro separadores)
- `trabalho/page.tsx:152` (colunas do quadro, telemóvel)
- `TabelaClientes.tsx:98`
- `dashboard/Workspace.tsx:381` (vistas)

Só `Marcacao.tsx` implementa o padrão completo (`aria-controls` + `tabpanel`).

Um `role="tab"` sem painel associado promete a um leitor de ecrã uma estrutura
que não existe: anuncia «separador 1 de 4» e depois não há forma de saber que
região é que ele controla. Vale mais `aria-pressed` em botões — que é
exatamente o que `partilhas/page.tsx:70` faz, corretamente.

---

### B13 · O broker não invalida nem repete

`broker.ts:114-137`

```ts
pedir(dominio: DominioDados): Promise<unknown> {
  const existente = this.emCurso.get(dominio);
  if (existente) return existente;      // para sempre
```

O `Map` guarda a promessa indefinidamente. Não há `revalidar()`, não há
invalidação, não há repetição. Um domínio que falhou uma vez fica em erro até o
`Workspace` desmontar — e o `Workspace` só desmonta ao mudar de rota.

O que o utilizador vê, em `GrelhaVista.tsx:105`:

```tsx
{erro && erro.estado === "erro" ? <CorpoErro texto={erro.mensagem} /> : …}
```

`erro.mensagem` é a mensagem crua do erro. Uma falha de RLS mostra texto de
Postgres dentro de um cartão do painel, sem botão de tentar outra vez.

---

### B14 · Os resumos por cliente são calculados sobre listas truncadas — **e truncadas pelo lado errado**

`clientes/page.tsx:35-52` pede tudo e deriva em JavaScript:

```ts
const [vinculos, agendamentos, partilhas, abertos] = await Promise.all([
  meusClientes(contabilistaId),
  listarAgendamentos({ contabilistaId }),   // sem `desde`
  listarPartilhas({ contabilistaId }),
  cartoesAbertos(contabilistaId),
]);
setClientes(resumirClientes({ vinculos, agendamentos, partilhas, cartoes }));
```

E em `dados.ts:670-677`:

```ts
let q = getSupabase().from("agendamentos").select("*").order("inicio");   // ASCENDENTE
…
const { data, error } = await q.limit(300);
```

Ordem ascendente + `limit(300)` = ficam as **300 consultas mais antigas**. Acima
disso, `resumirClientes` calcula «consultas realizadas», «última consulta» e
«próxima consulta» a partir de uma fatia que já não contém as recentes — e
«próxima consulta» torna-se sistematicamente `null`.

`listarPartilhas` tem o mesmo padrão com `limit(200)`.

Não há aviso nenhum. Um contabilista com dois anos de atividade vê números
errados apresentados como certos, e são exatamente os números por que a tabela
ordena.

---

### B15 · «Criar as vistas de partida» não trata falhas

`Workspace.tsx:324-330`

```tsx
onClick={() => {
  void listarVistas(contabilistaId).then((v) => { … });   // sem .catch
}}
```

Este estado vazio só é alcançável quando `listarVistas` **já lançou** — porque a
versão de `fonte/dashboard.ts:23-29` cria as omissões sozinha quando a lista vem
vazia. Ou seja: chegar aqui significa que a chamada falhou, e o botão repete
exatamente a mesma chamada sem `catch`. Rejeição não tratada, e nada acontece no
ecrã.

---

### Menores

- **B16** — `fidelidade/page.tsx:182-185`: quando a RPC devolve `inalterada`, não
  se recarrega, e `mudou` continua `true` — o botão «Guardar alterações» fica
  ligado a prometer uma escrita que não vai acontecer.
- **B17** — `partilhas/page.tsx:27-30`: `erro` nunca volta a `null` num
  carregamento bem-sucedido. Uma falha momentânea deixa a faixa vermelha no ecrã
  para sempre.
- **B18** — `partilhas/page.tsx:43-46`: `marcarPartilhaVista` devolve `void` e o
  estado local é atualizado a seguir sem saber se a escrita passou.
- **B19** — `MolduraModulo.tsx` documenta o menu `•••` no modo normal (§9.1), mas
  `GrelhaVista` nunca passa `acoes` — no modo normal o menu não existe.
- **B20** — `trabalho/page.tsx:481-485`: `dataCurta` constrói `Date.UTC(...)` e
  formata no fuso do browser. Fora de Portugal dá o dia anterior.

### Observações de arquitetura (não são bugs hoje)

- **Duas fontes de verdade para o mesmo facto.** `usarPainel()` lê
  `usePathname()` (estado React); `emDemonstracao()` lê
  `window.location.pathname` imperativamente no instante da chamada. Funciona
  porque as duas bases são árvores de rota diferentes, mas são duas respostas à
  mesma pergunta, e só uma está no fluxo do React.
- **Efeitos secundários dentro de updaters de `setState`.** `Workspace.aplicar`,
  `reporPadrao`, `compactar`, `alinharEsquerda` e `arrumar` chamam `registar(d)`
  de dentro de `setDraft(d => …)`. Os updaters têm de ser puros; em StrictMode
  (dev) são invocados duas vezes e a pilha de Desfazer ganha entradas duplicadas
  — «Desfazer» passa a precisar de dois cliques.

---

## 3. O que faria sentido implementar

Por ordem de retorno, não de esforço.

### Prioridade 1 — corrigir o que dá números errados

1. **Mover o resumo por cliente para o servidor** (B14). Uma view ou RPC
   (`resumo_clientes_do_contabilista`) que devolva uma linha por cliente com
   contagens agregadas em SQL. Elimina o truncamento, elimina três leituras
   grandes por abertura de página, e `resumirClientes` fica só para a
   demonstração e para os testes.
2. **`guardar_disponibilidade` como RPC transacional** (B8). Delete + insert numa
   função, com as mesmas validações que a UI já faz (fim > início, duração cabe
   no período) repetidas em SQL. É o padrão que o resto do painel já segue.
3. **Nunca fabricar o patamar** (B6). Estado de erro explícito na Progressão,
   com repetição.
4. **Corrigir `validarLayout`** (B1): comparar por `instanceId`. Teste de
   regressão com o caso provado acima.

### Prioridade 2 — o que faz o painel parecer avariado

5. **Broker com invalidação e repetição** (B13, B2). Três coisas juntas:
   `revalidar(dominio)`, um contador de versão exposto como prop para o `memo`
   voltar a funcionar, e `CorpoErro` com botão «Tentar outra vez» + mensagem
   traduzida em vez do texto cru do Postgres.
6. **Recarregamento sem esqueleto** (B7). Separar `aLer` (primeira carga) de
   `aRevalidar` (atualização). O esqueleto só na primeira.
7. **Limpar o detalhe ao abrir outro caso** (B4) e disciplina de estados: um
   `EstadoDeCarregamento` partilhado que distingue *vazio* de *falhou* (B5), e
   `try/catch` em todos os `carregar` (falta em `casos`).
8. **Guarda de alterações por gravar** (B9). Um hook `useRascunhoSujo(sujo)` que
   liga `beforeunload` e intercepta navegação interna, usado por `perfil`,
   `SemanaTipo` e `fidelidade`. Reaproveita o `Confirmar` que já existe.

### Prioridade 3 — coerência (o que faz o painel parecer um produto só)

9. **Um sistema de cabeçalho** (B11). A recomendação: `CabecalhoPainel` passa a
   montar sozinho o `TituloDoPainel` no portal. Uma chamada por página, título
   na barra do topo em todas as rotas, e desaparece a duplicação em `fidelidade`
   e `progressao`.
10. **Unificar o modo escuro** (B10). Retirar os `dark:` em neutros dos 8
    ficheiros e estender a camada `.dark` de `globals.css` onde falte tom. É a
    regra que o `CLAUDE.md` já fixa; falta aplicá-la. **Um teste que falhe o
    build** se aparecer `dark:(bg|border|text|divide)-stone-` dentro de
    `src/app/contabilista` ou `src/components/contabilistas` impede a recaída —
    o projeto já usa este padrão de teste-sobre-o-código noutros sítios.
11. **Um componente `Separadores`** (B12), com o padrão ARIA completo e setas,
    usado nos cinco sítios. Onde não houver painel associado, `aria-pressed` em
    botões — como `partilhas` já faz bem.
12. **Escape que cancela mesmo** (B3).

### Prioridade 4 — o que ainda não existe e faz falta

13. **Estado de «sem ligação».** Todas as leituras assumem rede. Um contabilista
    num escritório com Wi-Fi mau vê cartões vazios sem explicação.
14. **Paginação real em Clientes e Casos.** A tabela já tem procura e ordenação;
    ambas operam sobre a lista completa carregada em memória.
15. **Um teste de fumo por rota do painel.** Existe `scripts/verificar-dashboard.mjs`
    para o dashboard do cliente; não há equivalente para `/contabilista/*`. As
    nove rotas nunca são exercidas em runtime pela CI — o que explica porque é
    que B4, B5 e B7 passaram despercebidos com 1941 testes verdes.
16. **Cobertura de teste para o que a suite não vê.** A suite atual é quase toda
    sobre domínio puro e sobre o *texto do código* (grep em ficheiros). Falta o
    meio: componentes renderizados. Um `environment: "jsdom"` opcional no
    `vitest.config.ts` abriria a porta a testar precisamente a classe de bugs
    B2/B4/B7.

### O que NÃO faria

- **Não re-arquitetar a demonstração.** «Um código, duas moradas» é a melhor
  decisão deste subsistema e está a pagar-se sozinha.
- **Não acrescentar módulos ao painel modular.** Dezasseis tipos, quatro vistas
  de partida, e um broker que ainda não sabe repetir um pedido. Consolidar antes
  de alargar — é literalmente a instrução da skill `crescimento-recibocerto`.
- **Não mexer nas fronteiras de privacidade nem nas RPCs.** Estão certas.

---

## 4. Resumo

| | |
|---|---|
| Superfície analisada | ~26 000 linhas, 9 rotas, 2 moradas |
| Build / testes / audit | ✓ ✓ ✓ (0 high) |
| Bugs verificados | 20 (1 provado com teste, 1 provado no CSS compilado) |
| Que a suite atual apanharia | 0 |
| Causa dominante | Acabamento desigual entre superfícies antigas e recentes |
| Maior risco de correção | B14 (números errados) e B8 (perda da semana-tipo) |
| Maior risco de confiança | B6 (comissão inventada) e B5 (falha disfarçada de vazio) |

O painel está bem pensado onde é difícil — privacidade, concorrência,
transações — e desigual onde é fácil — estados de erro, cabeçalhos, dark mode,
ARIA. Isso é a assinatura de um subsistema construído depressa por cima de boas
fundações, e é boa notícia: nada nesta lista exige repensar nada.
