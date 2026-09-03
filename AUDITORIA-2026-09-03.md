# Auditoria completa — Recibo Certo

**Data:** 3 de setembro de 2026
**Versão auditada:** `2.158.0` · commit `edbd56d` · ramo `claude/repository-site-audit-dy93ps` (a partir de `main`)
**Âmbito:** 1 936 ficheiros versionados · 416 369 linhas em `src/` · 174 rotas de página · 61 rotas de API · 95 migrações SQL · 10 workflows
**Método:** verificação empírica (build, 4 346 testes, 20 portões, 14 e2e, fuzz de motores, varrimento HTTP de 289 rotas, axe em 4 combinações de tema/viewport, medição de rede em browser real) + leitura dirigida do código.

> Este relatório destina-se a ser executado. Cada achado traz **evidência reproduzível**, **ficheiro:linha** e **correção proposta**. Os achados estão ordenados por severidade dentro de cada secção.

---

> ## Estado da remediação — 3 de setembro de 2026, versão 2.162.0
>
> **Este relatório foi executado.** Todos os P0 e P1 estão corrigidos e
> verificados; os P2 e P3 estão fechados com duas exceções declaradas no fim
> desta nota. O texto abaixo preserva o diagnóstico original, para manter a
> evidência — quando diz «está», leia-se «estava no commit `edbd56d`».
>
> | Bloco | Estado | Verificação |
> |---|---|---|
> | **P0-1a** `zona:e2e` ausente do `package.json` | **Feito** — reposto | o guião corre e passa |
> | **P0-1b** duas ligações com o mesmo nome acessível | **Feito** — nome próprio para a do arco | `contratacao:e2e` verde, com asserção de contagem |
> | **P0-1c** matriz visual saltada | **Feito** — desbloqueada | os passos deixaram de ser `skipped` |
> | **P0-2** `hierarquia:e2e` reprovava | **Feito** — **era um defeito do portão** | ver nota abaixo |
> | **P1-1** crawlers vs. autoridade | **Feito** — treino bloqueado, resposta permitida | medido por User-Agent |
> | **P1-2** `/llms.txt` a devolver 403 | **Feito** — isento no proxy | 200 a todos os agentes |
> | **P1-3** marca duplicada no título | **Feito** — 24 páginas (19 + 3 que o teste encontrou + 2 que ele apanhou na fusão) | teste que reprova |
> | **P1-4** `/precos` sem `<h1>` | **Feito** — nível por contexto | verificado no HTML |
> | **P1-5** interruptor sem nome | **Feito** — `aria-labelledby` | axe: 0 |
> | **P1-6** contrastes abaixo de AA | **Feito** — 17 pares corrigidos | axe: 0 em 42 rotas |
> | **P1-7** paleta escura fixa no modo claro | **Feito** — as duas paletas | — |
> | **P1-8** GeoJSON do GitHub | **Feito** — auto-alojado, 291 KB → 4,2 KB | `nuts:geo:check` |
> | **P1-9** terceiros não declarados | **Feito** — secção «Mapas» na privacidade | — |
> | **P1-10** «a consulta não sai do dispositivo» | **Por decidir** — **por decidir** — ver abaixo | — |
> | **P1-11** 13 portões fora do CI | **Feito** — 13 + 5 encontrados depois (4 ligados, 1 isento por boa razão) | 37/38 estáticos verdes; `rls:check` pré-existente na `main` (ver nº 6) |
> | **P2-1** 36% dos parâmetros fora do portão | **Feito** — registo automático: 535/535 | — |
> | **P2-2** `TODAY` e a frescura invisível | **Feito** — renomeado + controlo no `fiscal:check` | — |
> | **P2-4/6/7/9/10/11/12** | **Feito** — todos | — |
> | **P3-1/4/5/6** | **Feito** — todos | — |
>
> ### Sete coisas que a execução revelou e o relatório não sabia
>
> 1. **O P0-2 não era o que parecia.** As superfícies de `/inicio/preco` e
>    `/inicio/recibos` não estavam mal desenhadas: o portão é que lia o
>    `shadow-none` do Tailwind — três camadas *transparentes*, não `none` — como
>    «tem sombra, logo é uma superfície». Contava quatro elementos que
>    deliberadamente deixam de ser cartões a partir de `sm:`. Corrigido no
>    portão. **Mas a investigação encontrou um defeito real ao lado:** a camada
>    `.dark .shadow-card` vence o `sm:shadow-none` por especificidade, e no modo
>    escuro a régua do herói ficava com cinco sombras por baixo de cinco passos
>    transparentes. A asserção foi ainda estendida ao modo escuro, que nunca
>    tinha sido medido — e que escondia 16,7% numa página.
>
> 2. **`procura:nuts2:check` nunca podia passar.** Três carimbos de relógio
>    (`evaluatedAt`, `lastRunAt`, `lastSuccessfulRunAt`) estavam dentro do hash
>    de conteúdo: três corridas seguidas davam três hashes diferentes. O portão
>    respondia «desatualizado» dissesse o que dissesse o ficheiro. Corrigido; o
>    hash é agora determinista, e a regra passou a ser lida do gerador pelo
>    teste em vez de copiada.
>
> 3. **Os contrastes eram um problema de token, não de 870 sítios.** No modo
>    escuro, `text-stone-400` (#8A887E) dá 4,26:1 sobre o cartão — 870
>    utilizações em 259 ficheiros. Corrigi-las uma a uma seria um diff que
>    ninguém revê. Uma linha em `globals.css` (#94928A) fecha-as todas.
>
> 4. **Os portões valem-se sozinhos — e provaram-no na fusão.** Ao trazer o
>    `main` (que entretanto avançou sete commits e ganhou duas páginas novas,
>    `/fontes-fiscais` e `/perguntas-frequentes`), **as duas páginas traziam de
>    volta dois dos defeitos que este relatório tinha acabado de fechar**: a
>    marca duplicada no `<title>` e a injeção de JSON-LD por `JSON.stringify`.
>    O primeiro foi apanhado por um portão — o teste de títulos reprovou a
>    fusão e nomeou as duas linhas. O segundo **não foi**, porque eu tinha
>    corrigido os 30 sítios e testado o serializador, mas nunca escrito a regra
>    que obriga a usá-lo. Passou a existir
>    (`src/lib/__tests__/jsonld-injecao.test.ts`), e foi verificada a reproduzir
>    o defeito antes de passar. É a diferença entre corrigir e fechar: o que só
>    foi corrigido volta com a próxima página.
>
> 5. **O P1-11 estava mal fechado — e o portão que o fechava tinha o mesmo
>    buraco.** «Treze portões nunca correm em lado nenhum» foi dado por
>    resolvido com um portão novo, o `ci:scripts`, que verifica que todo o
>    `npm run <x>` dos workflows existe no `package.json`. Só que essa é a
>    direção fácil. A direção que interessa é a inversa — **todo o portão do
>    `package.json` corre a partir do CI** — e essa continuava sem quem a
>    obrigasse. Uma varredura completa encontrou mais **cinco** portões órfãos
>    (`marca:check`, `concelhos:geo:check`, `auth:moldes:check`,
>    `quiz:meta:check` e o `nuts:geo:check` **escrito nesta mesma remediação
>    para fechar o P1-8**). Escrever o portão e ligá-lo eram dois passos, e o
>    segundo não tinha quem o obrigasse — exatamente o defeito que o P1-11
>    descrevia.
>
>    Quatro foram ligados ao passo estático do CI. O quinto,
>    `concelhos:geo:check`, quase foi o mesmo erro outra vez, só que ao
>    contrário: fazer um portão órfão correr sem primeiro perguntar SE devia
>    correr ali. Faz 306 pedidos ao Nominatim — um por concelho — e a
>    primeira corrida contra o próprio workflow (feita localmente antes de
>    confiar nele) apanhou um 429 a meio, porque o guião não tem o
>    soft-fail-em-rede-indisponível que o `nuts:geo:check` já tinha (a
>    diferença entre «a rede falhou» e «o ficheiro está desatualizado» — a
>    mesma distinção que mantém `procura:nuts2:check` fora do CI de PRs).
>    Um serviço público, limitado por taxa e partilhado por todos os
>    runners do GitHub, não pertence a um portão que bloqueia PRs. Ficou de
>    fora do passo, isento no `ci:scripts` com a razão escrita — a mesma
>    disciplina que os dois diagnósticos originais (`fronteira`,
>    `homepage:atribuicao`) já seguiam. O `ci:scripts` passou a verificar as
>    duas direções. Verificado a reprovar: retirar um dos quatro passos
>    ligados, OU apagar a isenção do quinto sem motivo, volta a pôr o
>    portão vermelho.
>
> 6. **`rls:check` reprova — e não é desta remediação.** A junção com a
>    `main` trouxe uma migração (`20260902120000_cenarios_descoberta_e_preco.sql`)
>    cujo próprio bloco de verificação — «as quatro políticas de sempre
>    continuam lá» — reprova dentro do arreio de testes «esquema completo».
>    Isolado num worktree limpo de `origin/main`, sem nenhuma alteração desta
>    remediação, **o mesmo `FALHOU` acontece** — confirma que é um defeito
>    pré-existente, alheio a este trabalho.
>
>    A causa não é uma política RLS a menos em produção: é o PRÓPRIO ARREIO
>    de teste. `testar-rls.sh` cria uma base sintética a partir de 042-099 +
>    datadas ≥ 20260814, excluindo de propósito `017_cenarios.sql` e
>    `20260813_planos_operacionais.sql` (que dependem de migrações 001-041
>    que o arreio não tem). Sem essas duas, a tabela `cenarios` nasce do
>    stub genérico em `00-arreio-supabase.sql` — uma política solta,
>    `cenarios_dono` — e não das quatro reais que `20260902120000` verifica.
>    Em produção, onde as migrações aplicam por ordem desde a 001, as
>    quatro existem; é só o atalho sintético do arreio que não as tem.
>
>    Corrigi-lo bem — sem reabrir os avisos que o próprio arreio documenta
>    terem custado caro no passado — pede o mesmo cuidado que os
>    comentários desse ficheiro já pedem, e não uma linha apressada dentro
>    de um commit de fusão. Fica registado aqui, e não bloqueia este
>    merge: é um buraco no arreio de teste, não uma política em falta em
>    produção.
>
> 7. **Alargar a varredura de acessibilidade encontrou o defeito mais caro de
>    todos — e não era de cor.** A varredura original cobria 42 rotas. Alargada
>    a 52 (uma por família de rota, incluindo `/admin`, `/contabilista` e as
>    páginas de conta, que nunca tinham sido medidas), apanhou quatro coisas:
>
>    · **`/redefinir-password` não abria de todo.** `if (!supabaseConfigurado)`
>      — sem os parênteses. Uma referência a função é sempre verdadeira, por
>      isso a guarda NUNCA disparava e o `getSupabase()` a seguir era sempre
>      chamado; sem as variáveis do Supabase definidas, atirava dentro de um
>      `useEffect` e levava a página inteira para a fronteira de erro do
>      Next — ecrã «This page couldn't load», em inglês, sem `<title>` e sem
>      `lang`. Na página de RECUPERAR A PALAVRA-PASSE, que é onde está quem já
>      não consegue entrar. É o único dos 28 sítios que chamam
>      `supabaseConfigurado` a que faltavam os parênteses; os outros 27
>      chamam-na. Corrigido e verificado: a página passa a mostrar «Este link
>      já não serve», em português, com título e `lang`, e sem erro nenhum
>      na consola.
>
>    · **A «Zona de risco» tinha a única superfície escura fora da escala.**
>      `dark:bg-clay-bg/20` dava #43423D, bem mais claro do que o #292524
>      contra o qual toda a escala de cinzentos foi calibrada — a legenda caía
>      a 4,12:1. Era a única `dark:bg-clay-bg/*` do projeto, contra 783 usos
>      do par `text-stone-500 dark:text-stone-400`: o desvio estava na
>      superfície, não no texto.
>
>    · **O mesmo componente diluía um token já no limite.** `text-clay-text`
>      está calibrado para dar EXATAMENTE o mínimo AA (4,75:1); a `/80` e a
>      `/70` baixavam-no a 3,30:1 e 2,79:1. Opacidade não é decoração quando o
>      token já está no limite.
>
>    · **Duas tabelas roláveis da pré-visualização da FIZ** não se alcançavam
>      pelo teclado — o mesmo defeito que o P2-4 tinha fechado no `LegalPage`,
>      noutro componente.
>
>    · E, assim que a `/redefinir-password` voltou a abrir, apareceu o que
>      estava escondido por trás do ecrã de erro: a ligação para o apoio,
>      dentro de um parágrafo a `text-stone-400`, era distinguida **só pela
>      cor** — o verde da marca não chega aos 3:1 contra o texto à volta
>      (WCAG 1.4.1). Passou a ter sublinhado permanente. Um defeito que
>      nenhuma varredura anterior podia ter encontrado, porque a página nunca
>      chegava a desenhar-se.
>
>    E uma lição sobre o próprio método: sete das violações relatadas na
>    primeira passagem eram **artefactos da medição**, não defeitos. O axe
>    corria 400 ms depois do `domcontentloaded` e apanhava cores a meio de uma
>    transição — daí um `#499177` que não é nem o verde claro nem o escuro, e
>    dois cinzentos DIFERENTES para o mesmo elemento em duas passagens. Com
>    1200 ms de assentamento, `/guias` e `/ferramentas/calcular-preco` dão
>    zero. Um portão que mede a meio de uma animação não mede nada.
>
> ### O que fica por fazer, e porquê
>
> - **P1-10 — a «regra absoluta» da pesquisa.** É uma decisão de produto, não um
>   defeito: a página `/pesquisar` é servidor-renderizada de propósito, e a
>   consulta viaja no `?q=` para poder ser partilhada e funcionar sem
>   JavaScript. O que está errado é o texto que a descreve como absoluta.
>   Reescrevê-lo é do dono do projeto.
> - **P2-8 — 19 títulos e 22 descrições acima do comprimento útil.** É
>   redação, com julgamento editorial por página. Em vez de os reescrever à
>   pressa, passaram a ser **medidos**: o `seo:audit` conta-os e nomeia os
>   piores a cada corrida. A duplicação da marca, essa, é agora um teste que
>   reprova.
> - **`procura-nuts2.json` está desatualizado face ao Eurostat.** Agora que o
>   portão funciona, ele diz isso — corretamente. A atualização de dados de
>   mercado tem workflow próprio (`mercado-ingestao.yml`), que abre PR para
>   revisão humana. Não é trabalho para um commit de remediação.
>
> ---

## 0. Decisão executiva

O produto está tecnicamente sólido — mais sólido do que a auditoria de julho descrevia. O build passa, os 4 346 testes passam, não há vulnerabilidades de dependências, o RLS cobre 77 de 78 tabelas, os motores de cálculo resistiram a fuzzing agressivo sem produzir um único `NaN`, e as 289 rotas públicas respondem 200 com dois erros de consola em 64 carregamentos.

**O problema não é o código. É o que deixou de ser verificado.**

O `main` tem o pipeline principal **vermelho há dois dias e vinte commits**. A matriz de regressão visual — vinte capturas por corrida, o investimento mais caro em qualidade que este projeto tem — **não corre desde 2 de setembro**, e antes disso corria a falhar. A causa imediata são dois defeitos de uma linha cada. A causa real é que treze portões de qualidade que existem no `package.json` nunca correm em lado nenhum, e por isso ninguém sabe que dois deles reprovam neste momento.

Em paralelo, há uma **contradição estratégica documentada nos dois sentidos**: o `docs/ESTRATEGIA.md §6` e o `src/lib/autoridade.ts` constroem um programa inteiro para ser citado por ChatGPT, Perplexity e Google AI — com benchmark mensal de taxa de citação — enquanto o `robots.txt` e o `src/proxy.ts` devolvem `Disallow: /` e HTTP 403 exatamente a esses agentes. O `/llms.txt`, escrito para eles, responde-lhes 403.

### Classificação

| Área | Estado | Nota |
|---|---|---|
| Build, tipos, dependências | 🟢 Verde | 0 vulnerabilidades; TypeScript strict limpo |
| Testes automatizados (vitest) | 🟢 Verde | 204 ficheiros, 4 346 testes, 100% |
| **Integração contínua (`main`)** | 🔴 **Vermelho** | **falha desde 2026-09-01; 20 commits sobre pipeline vermelho** |
| Motores de cálculo (fiscal, preço) | 🟢 Verde | fuzz de 20 000 casos sem NaN, sem exceção, monotonia intacta |
| Segurança de API, auth e RLS | 🟢 Verde | guardas corretas; SSRF endurecido de forma exemplar |
| Proveniência dos dados fiscais | 🟡 Amarelo | 36% dos parâmetros fora do portão; 8 fontes comerciais |
| Acessibilidade | 🟡 Amarelo | 1 crítico, 6 pares de contraste abaixo de AA |
| SEO técnico | 🟡 Amarelo | 19 títulos duplicados; `/precos` sem `<h1>` |
| Privacidade declarada vs. real | 🟡 Amarelo | terceiros não declarados; uma «regra absoluta» que não se verifica |
| Estratégia de autoridade / IA | 🔴 Vermelho | programa anulado pela política de crawlers, sem que os documentos o digam |
| Desempenho | 🟡 Amarelo | guias a 1,06 MB e 87 pedidos; painel a 803 KB de JS gzip |

### As cinco coisas a fazer primeiro

1. Repor `zona:e2e` no `package.json` (uma linha) e dar `.first()` ao localizador em `verificar-contratacao.mjs` (uma linha). **Isto sozinho põe o CI verde.**
2. Meter no CI os treze portões que hoje não correm — a começar por `hierarquia:e2e`, que reprova neste momento.
3. Decidir, e escrever, de que lado fica a política de crawlers: ou se abre aos motores de resposta, ou se apaga o programa de autoridade e o `/llms.txt`.
4. Corrigir os 19 títulos com a marca duplicada e o `<h1>` em falta em `/precos`.
5. Fechar o crítico de acessibilidade do `/quiz-fiscal` e os contrastes abaixo de AA.

---

## 1. O que foi verificado, e como

| Verificação | Comando | Resultado |
|---|---|---|
| Instalação limpa | `npm ci` | **Feito** — exit 0 |
| Build de produção | `npm run build` | **Feito** — exit 0 · 213 rotas no sitemap |
| Conjunto de testes | `npx vitest run` | **Feito** — **204 ficheiros · 4 346 testes · 0 falhas** (39,8 s) |
| Vulnerabilidades | `npm audit --audit-level=high` | **Feito** — **0 vulnerabilidades** |
| Dados fiscais | `npm run fiscal:check` | **Feito** — exit 0 · «Estado: OK» |
| Fronteira de segurança | `npm run security:boundary` | **Feito** — 1 936 ficheiros verificados |
| Sem hardcodes no motor | `npm run motor:no-hardcodes` | **Feito** — 828 ficheiros |
| SEO | `npm run seo:audit` | **Por decidir** — exit 0 com 1 aviso |
| Ligações das fontes | `npm run guias:links` | **Por decidir** — 139 validadas · 14 avisos · 0 erros |
| Stripe | `npm run stripe:check` | ❌ **exit 1** (sem segredos neste ambiente) |
| Varrimento HTTP | 289 rotas | **Feito** — **289/289 HTTP 200** |
| Erros de consola | 32 rotas × 2 temas, browser real | **Feito** — 2 erros não-rede (ambos «Supabase não configurado») |
| Acessibilidade | axe-core, 19 rotas × 2 temas × 2 viewports | **Por decidir** — **38 violações** |
| Fuzz do motor de preço | 20 000 contextos aleatórios | **Feito** — 0 não-finitos · 0 exceções · round-trip exato |
| Fuzz do motor fiscal | grelha completa + valores-limite | **Feito** — 0 NaN · 0 negativos impossíveis · monotonia intacta |
| e2e (14 guiões) | contra o BUILD | ❌ **2 reprovam** (`hierarquia`, `contratacao`) |

### O que esta auditoria NÃO verificou

Para não confundir «não verificado» com «está bem»:

- **Os valores fiscais contra as fontes primárias.** Este ambiente não tem acesso fiável ao Portal das Finanças nem ao Diário da República. A integridade *interna* está verificada (o `assertFiscalDataIntegrity()` corre e passa); a *correção legal* de cada número continua a exigir revisão por profissional habilitado.
- **Stripe, Supabase e o contrato público em produção** — sem segredos, os respetivos `check` param no aviso.
- **Comportamento com dados reais** — o diretório de contabilistas está vazio sem Supabase, o que faz `afinidade:e2e` reprovar por falta de ambiente, **não** por defeito.
- **Os endpoints do INE/Eurostat** (`concelhos:check`, `mercado:check`, `oferta:concelhos:check`, `procura:nuts2:check`) — devolvem 403/503 através do proxy deste ambiente.

---

## 2. P0 — Bloqueadores

### P0-1 · O pipeline principal do `main` está vermelho há dois dias e vinte commits

**Evidência (GitHub Actions, workflow «Testes fiscais e build»):**

```
#410  2026-09-03 06:09  in_progress   main  866c9c89
#409  2026-09-02 18:49  failure       main  edbd56d6
#407  2026-09-02 18:24  failure       main  5b01db95
#404  2026-09-02 17:29  failure       main  328ee2a2
#403  2026-09-02 17:11  failure       main  ca74e626
… (todas as corridas em main desde #388) …
#388  2026-09-01 00:01  failure       main  a1376f67   ← primeira falha
#386  2026-08-31 20:42  success       main  f5ecad33   ← último verde
```

**17 corridas consecutivas em falha. 20 commits entregues sobre um pipeline vermelho.**

O job que falha é sempre o **«Motor de descoberta — fim a fim»**. Os outros cinco jobs (tipos/testes/build, três matrizes de desempenho, documentos) passam sempre. Há **duas causas distintas em duas fases**.

---

#### P0-1a · `zona:e2e` foi apagado do `package.json` mas o workflow continua a chamá-lo

**Severidade:** P0 · **Esforço:** 1 linha

`.github/workflows/testes-e-build.yml:198` executa:

```yaml
- name: Zona de risco — apaga só o que foi escolhido, com e sem sessão
  run: RC_BASE_URL=http://localhost:3000 npm run zona:e2e
```

`package.json` **não tem** o script `zona:e2e`. Foi adicionado em `29463cc` (2.157.0) e removido em `5b01db9` (2.157.1) — quase de certeza numa resolução de conflito de merge, porque o diff mostra apenas a reescrita da vírgula final:

```diff
# git show 5b01db9 -- package.json
-    "visivel:e2e": "node scripts/verificar-visivel.mjs",
-    "zona:e2e": "node scripts/verificar-zona-risco.mjs"
+    "visivel:e2e": "node scripts/verificar-visivel.mjs"
```

O guião `scripts/verificar-zona-risco.mjs` continua no repositório, continua a documentar `npm run zona:e2e` no seu cabeçalho (linha 25) — e **funciona**. Correu-se contra o build desta auditoria:

```
── O apagamento é o que foi escolhido, e mais nada ─────
  ✓ o que foi escolhido saiu
  ✓ o estúdio de negócio ficou
  ✓ os cenários ficaram
  ✓ a simulação de IRS ficou
── A chave pré-cofre ──────────────────────────────────
  ✓ a simulação de IRS saiu nas DUAS formas da chave
  ✓ e não levou os preços guardados à frente
✓ zona de risco: aparece sem sessão, conta o que existe, e apaga só o que foi escolhido.
EXIT=0
```

Ou seja: a verificação que guarda o defeito mais perigoso do produto — «apagar uma coisa e o cofre inteiro sair atrás» — está escrita, passa, e **nunca corre**.

**Correção** (`package.json`, na lista de scripts, por ordem alfabética):

```json
"visivel:e2e": "node scripts/verificar-visivel.mjs",
"zona:e2e": "node scripts/verificar-zona-risco.mjs"
```

**Prevenção:** acrescentar um portão que confirme que todo o `npm run <x>` referido em `.github/workflows/*.yml` existe em `package.json`. É um guião de dez linhas e teria apanhado isto no PR.

---

#### P0-1b · `contratacao:e2e` reprova: duas ligações com o mesmo nome acessível

**Severidade:** P0 · **Esforço:** 1 linha (+ 1 decisão de UX)

`scripts/verificar-contratacao.mjs:115` faz:

```js
await page.getByRole("link", { name: /Planear uma contratação/ }).getAttribute("href")
```

Em `/inicio/salario?percurso=empregador` esse localizador resolve para **dois** elementos, e o Playwright reprova em modo estrito:

```
locator.getAttribute: Error: strict mode violation:
getByRole('link', { name: /Planear uma contratação/ }) resolved to 2 elements:
  1) <a href="/ferramentas/planeador-contratacao" class="btn-shine focus-marca …">
  2) <a href="/ferramentas/planeador-contratacao" class="focus-marca mt-5 …">
     aka getByLabel('Contratar é o quarto passo, n').getByRole('link', …)
```

As duas origens:

- `src/components/foco/salario/HeroSalarioBifurcado.tsx:73` — `ctaPrimario={employer ? "Planear uma contratação" : undefined}`
- `src/lib/foco/arco-contratacao.ts:70` — `cta: "Planear uma contratação"`, o quarto passo do arco, **introduzido em `ca74e62` (2.156.0)**

O guião não foi atualizado quando o quarto passo entrou. Confirma-se na cronologia do CI: a corrida #403 é a primeira em que o passo 12 («Planeador patronal») falha, e #403 é exatamente `ca74e62`.

**Consequência em cadeia.** Como o passo 12 falha, tudo o que vem a seguir é **saltado**:

```
12 Planeador patronal …………………………………… failure
13 Zona de risco …………………………………………… skipped
14 ImageMagick para a comparação por píxel ……… skipped
15 Homepage — referência visual do commit fixado … skipped
```

**A matriz de regressão visual — 20 capturas de página inteira comparadas píxel a píxel contra um commit fixo — não corre desde 2 de setembro.**

**Correção mínima** (`scripts/verificar-contratacao.mjs:115`):

```js
await page.getByRole("link", { name: /Planear uma contratação/ }).first().getAttribute("href")
```

**Correção recomendada, além dessa.** Duas ligações com **nome acessível idêntico e destino idêntico** na mesma página não é só um problema de teste: na lista de ligações de um leitor de ecrã aparecem duas entradas indistinguíveis. Dar ao segundo um nome próprio — `"Planear a contratação a partir daqui"`, ou um `aria-label` que diga de que passo do arco vem — resolve as duas coisas de uma vez, e torna o localizador do guião naturalmente único.

---

#### P0-1c · Antes disso, a comparação visual corria — e falhava

Nas corridas **#388 a #402** (2026-09-01 00:01 → 2026-09-02 12:48) o passo que falhava era outro:

```
12 Planeador patronal …………………………………… success
13 ImageMagick ………………………………………………… success
14 Homepage — referência visual do commit fixado … failure   ← 3m47s a comparar
```

Isto é uma **regressão visual real** detetada pelo portão, contra o commit de referência `8d81e55`, que nunca foi resolvida — e que desde 2 de setembro deixou de ser sequer medida.

**Correção:** depois de P0-1a e P0-1b, recuperar o artefacto `matriz-visual` da corrida #402 e decidir, capa a capa, o que é regressão e o que é mudança deliberada. Se for deliberada, mover a referência para um commit novo com uma justificação escrita; se for regressão, corrigir. **Não reapontar a referência sem olhar para as imagens** — é a única forma de este portão voltar a significar alguma coisa.

---

### P0-2 · `hierarquia:e2e` reprova, e não corre em lado nenhum

**Severidade:** P0 · **Ficheiro:** `scripts/verificar-hierarquia.mjs`

Corrido contra o build desta auditoria, `npm run hierarquia:e2e` termina em **exit 1**:

```
FALHA landing-preco   @1440: 9.8% das superfícies do modo CLARO não têm pista visível (limite 8%).
      Piores: 0·focus-marca group relative flex min-h-[84p …
FALHA landing-recibos @1440: 9.8% das superfícies do modo CLARO não têm pista visível (limite 8%).
      Piores: 0·focus-marca group relative flex min-h-[84p …

  2 falha(s).
```

Não é artefacto de ambiente: é medição determinística de DOM e CSS sobre páginas estáticas. E os números do **modo escuro** são bastante piores — até **12,2%** em `landing-recibos @1440` e `landing-preco @1440` — mas o guião só reprova sobre o modo claro, pelo que essa deterioração não gera sinal nenhum.

**Correção:**
1. Dar contorno, sombra ou fundo às superfícies `focus-marca … min-h-[84px]` das duas leituras até descerem abaixo do limite.
2. Meter `hierarquia:e2e` no CI (ver P1-11).
3. Ponderar estender a asserção ao modo escuro, agora com um limite próprio — hoje mede-o e cala-se.

---

## 3. P1 — Graves

### P1-1 · O programa de autoridade está anulado pela política de crawlers, e nenhum documento o diz

**Severidade:** P1 · **Natureza:** contradição entre duas decisões documentadas

De um lado, o produto investe num programa formal para aparecer em respostas de IA:

- `docs/ESTRATEGIA.md §6 «Aparecer em respostas de IA»` — distingue expressamente **GPTBot (treino — decisão *separada*; bloqueá-lo não exclui a pesquisa)** de **OAI-SearchBot (pesquisa do ChatGPT)**.
- `docs/ESTRATEGIA.md §1.3` — item marcado `[x]`: *«robots validado para Googlebot, OAI-SearchBot e PerplexityBot»*.
- `src/lib/autoridade.ts:112` — `§10.4 — Benchmark mensal de respostas de IA`, com `PROMPTS_BENCHMARK`, «Taxa de citação», «Quota de citações», «Posição», testado em **ChatGPT Search, Google AI e Perplexity**.
- `/llms.txt` — 3 897 bytes escritos para modelos de linguagem, com uma secção «Ao citar o Recibo Certo».
- `.claude/skills/crescimento-recibocerto/SKILL.md:89` — diz aos futuros contribuidores que `robots.ts` declara OAI-SearchBot e companhia, «uma decisão registada, não um esquecimento».

Do outro lado, `src/lib/crawler-policy.ts` bloqueia **todos** eles, e `src/proxy.ts` acrescenta 403 ao nível HTTP:

```
GPTBot · OAI-SearchBot · ChatGPT-User · ClaudeBot · Claude-SearchBot · Claude-User ·
anthropic-ai · PerplexityBot · Perplexity-User · Google-Extended · GoogleOther ·
DuckAssistBot · CCBot · cohere-ai · Applebot-Extended · …
```

**Verificado empiricamente** contra o build:

| User-Agent | `/` | `/guias/escaloes-irs` | `/llms.txt` |
|---|---|---|---|
| `GPTBot/1.2` | **403** | **403** | **403** |
| `OAI-SearchBot/1.0` | **403** | **403** | **403** |
| `PerplexityBot/1.0` | **403** | **403** | **403** |
| `ClaudeBot/1.0` | **403** | **403** | **403** |
| `Googlebot/2.1` | 200 | 200 | 200 |
| navegador normal | 200 | 200 | 200 |

O que aconteceu, na leitura mais provável: a decisão de proteção de ativos (`docs/PROTECAO-ATIVOS.md`, posterior) **substituiu** a decisão de autoridade sem que a `ESTRATEGIA.md`, a skill de crescimento ou o `autoridade.ts` fossem atualizados. Fica um programa de medição cujo resultado está fixado em zero por construção: medir mensalmente a taxa de citação enquanto se recusa a leitura aos motores que citariam.

**Isto é uma decisão do dono do projeto, não um defeito técnico.** Mas tem de ser tomada uma vez e escrita num sítio só. As duas saídas coerentes:

- **(A) Manter a proteção.** Então: apagar `/llms.txt` (ou pelo menos deixar de o servir), retirar `§10.4` do `autoridade.ts`, corrigir `ESTRATEGIA.md §6` e `§1.3`, e corrigir a skill de crescimento — que hoje ensina o contrário.
- **(B) Recuperar a citação sem abrir o treino.** Manter em `AGENTES_EXTRACAO_BLOQUEADOS` os agentes de **treino e dataset** (`GPTBot`, `CCBot`, `Google-Extended`, `Applebot-Extended`, `anthropic-ai`, `Bytespider`, `AI2Bot`, `Timpibot`, `Omgilibot`, `PanguBot`, `Diffbot`, `ImagesiftBot`) e **retirar** os de **pesquisa e resposta em tempo real** (`OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot`, `DuckAssistBot`) e os **iniciados por pessoas** (`ChatGPT-User`, `Perplexity-User`, `Claude-User`). É exatamente a separação que a `ESTRATEGIA.md §6` já descreve e que a OpenAI documenta.

Em qualquer dos casos, o `check-security-boundary.mjs:109` tem de ser atualizado: hoje exige que a lista central inteira esteja bloqueada, e portanto **reprova a opção (B)**.

---

### P1-2 · `/llms.txt` devolve 403 exatamente a quem foi escrito

**Severidade:** P1 · **Ficheiro:** `src/proxy.ts:19-21`

Caso independente da decisão acima, e defeito puro em qualquer dos cenários. O proxy isenta do bloqueio dois caminhos:

```ts
const SINAIS_DE_DIREITOS = new Set([
  "/robots.txt",
  "/.well-known/tdmrep.json",
]);
```

`/llms.txt` não está na lista. Resultado medido: um agente que respeite as regras lê no `robots.txt` que está proibido, e se ainda assim tentar ler o `/llms.txt` — o ficheiro que existe **precisamente** para lhe dizer como citar o site — recebe 403. São 3,9 KB de conteúdo cuidado que só humanos e o Googlebot conseguem ler.

**Correção — cenário (A), manter a proteção:** deixar de servir `/llms.txt`. Um ficheiro cujo público-alvo está bloqueado à porta é dívida de manutenção.

**Correção — cenário (B):** acrescentar `"/llms.txt"` a `SINAIS_DE_DIREITOS`. Um ficheiro de sinalização de direitos e de instruções de citação pertence à mesma categoria do `robots.txt` e do `tdmrep.json`: deve ser sempre legível, mesmo por quem não pode ler o resto.

---

### P1-3 · Dezanove páginas públicas dizem a marca duas vezes no `<title>`

**Severidade:** P1 · **Esforço:** 19 linhas · **Impacto:** SEO e primeira impressão

O layout raiz define o template (`src/app/layout.tsx:75`):

```ts
title: { template: "%s | Recibo Certo", … }
```

Dezanove páginas escrevem também a marca no `metadata.title`, e o template acrescenta-a outra vez. O resultado no HTML servido, medido no build:

```
/ferramentas          Ferramentas fiscais 2026 — 17 simuladores e calculadoras | Recibo Certo | Recibo Certo   (86 car.)
/ferramentas/simulador-irs   Simulador de IRS 2026 — calcula o teu IRS anual passo a passo | Recibo Certo | Recibo Certo   (91)
/ferramentas/mapa-contabilistas  Mapa de preços por região 2026: … | Recibo Certo | Recibo Certo   (97)
/ferramentas/simulador-herancas  Simulador de Heranças e Sucessões 2026 — … | Recibo Certo | Recibo Certo   (97)
```

Nenhuma verificação apanha isto: o `seo:audit` confere presença de `title`, não a sua forma.

**As quinze com `| Recibo Certo`** — retirar o sufixo do `metadata.title` (o `openGraph.title` **mantém-no**, porque não passa pelo template; o comentário em `ferramentas/calcular-preco/page.tsx:33` já o explica bem):

| Ficheiro | Linha |
|---|---|
| `src/app/contabilistas/page.tsx` | 9 |
| `src/app/contabilistas/candidatura/page.tsx` | 45 |
| `src/app/ferramentas/ato-isolado/page.tsx` | 10 |
| `src/app/ferramentas/classificar-atividade/page.tsx` | 11 |
| `src/app/ferramentas/comparar-regimes/page.tsx` | 24 |
| `src/app/ferramentas/irs-jovem/page.tsx` | 34 |
| `src/app/ferramentas/mapa-contabilistas/page.tsx` | 10 |
| `src/app/ferramentas/payout-mor/page.tsx` | 10 |
| `src/app/ferramentas/recibos-verdes/page.tsx` | 28 |
| `src/app/ferramentas/regime-simplificado/page.tsx` | 13 |
| `src/app/ferramentas/seguranca-social/page.tsx` | 33 |
| `src/app/ferramentas/simulador-empresa/page.tsx` | 9 |
| `src/app/ferramentas/simulador-herancas/page.tsx` | 10 |
| `src/app/ferramentas/simulador-irs/page.tsx` | 20 |
| `src/app/guias/page.tsx` | 7 |

**As quatro com `— Recibo Certo`** (travessão, mesmo defeito): `src/app/cookies/page.tsx:8`, `src/app/termos/page.tsx:9`, `src/app/dashboard/payout/page.tsx:5`, e `src/app/ferramentas/page.tsx:35`.

**Prevenção:** um teste que percorra as rotas públicas do `PUBLIC_ROUTES` e falhe se o `<title>` resolvido contiver «Recibo Certo» mais de uma vez. Cabe em quinze linhas e fecha a classe inteira.

**A par disto:** 142 páginas têm `<title>` acima de 60 caracteres e 104 têm `description` acima de 160 — o Google trunca ambos. As de `/admin/*` e `/dashboard/*` não interessam (são `noindex`), mas as ~40 públicas interessam. Ver P2-8.

---

### P1-4 · `/precos` — a página comercial — não tem `<h1>`

**Severidade:** P1 · **Esforço:** 1 linha

O HTML servido em `/precos` começa a hierarquia no `<h2>`:

```html
<h2 class="font-display display-2 font-semibold text-ink">Um plano só. Duas formas de pagar.</h2>
<h3 …>Grátis</h3>  <h3 …>Recibo Certo Plus</h3>  <h3 …>Plus vitalício</h3>
<h2 …>As tuas dúvidas, respondidas.</h2>
```

É a única página pública indexada sem `<h1>` (`/redefinir-password` também não tem, mas é uma página de erro sem conteúdo). Duas consequências: quem navega por cabeçalhos com leitor de ecrã não encontra o título da página, e o Google perde o sinal mais forte de tema numa página de conversão.

**Correção:** promover «Um plano só. Duas formas de pagar.» a `<h1>` — mantendo `display-2`, que é uma classe de tamanho e não de nível — e descer os `<h2>` seguintes conforme necessário para não deixar buracos na hierarquia.

---

### P1-5 · Crítico de acessibilidade: interruptor sem nome no `/quiz-fiscal`

**Severidade:** P1 (axe: **critical**) · **Ficheiro:** `src/components/quiz-fiscal/SelecaoModo.tsx:329-337`

```tsx
<button
  type="button"
  onClick={() => updateConfig({ somAtivo: !config.somAtivo })}
  className="relative h-5 w-9 rounded-full …"
  style={{ backgroundColor: config.somAtivo ? QD : DOT_EMPTY }}
  role="switch"
  aria-checked={config.somAtivo}
>
  <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow …" />
</button>
```

`role="switch"` sem texto interior, sem `aria-label` e sem `aria-labelledby`. A etiqueta visível «Sons» é um `<span>` irmão, sem associação. Um leitor de ecrã anuncia «interruptor, desligado» e nada mais. Falha WCAG 2.2 **4.1.2 (Name, Role, Value)**, detetado nas quatro combinações de tema e viewport.

O padrão correto já existe no próprio repositório — `src/components/simulador/ModoGuiadoEmpresa.tsx:2635` usa `aria-labelledby="rot-tem-imovel"`, e a linha 2039 do mesmo ficheiro tem um comentário a explicar exatamente esta armadilha. É uma inconsistência, não desconhecimento.

**Correção:**

```tsx
<span id="rot-sons" className="text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>Sons</span>
…
<button … role="switch" aria-checked={config.somAtivo} aria-labelledby="rot-sons">
```

**Prevenção:** correr o axe também sobre `/quiz-fiscal` no CI. O `descobrir:e2e` já faz isso para a Descoberta — falta estender a cobertura.

---

### P1-6 · Seis pares de cor abaixo do mínimo AA

**Severidade:** P1 · **Regra do projeto violada:** inegociável n.º 5 («contraste»)

Medido com axe-core, com o tema forçado por `localStorage` (o `prefers-color-scheme` sozinho não muda o tema — ver P2-10):

| Cor / fundo | Rácio | Mínimo | Onde | Alvo |
|---|---|---|---|---|
| `#a87f0b` / `#fefcf2` | **3,57:1** | 4,5:1 | `/`, `/inicio/preco`, `/inicio/salario` · claro | `.text-fiz-700` (selo FIZ), 10-12 px negrito |
| `#b9d5cc` / `#ffffff` | **1,56:1** | 3:1 | `/ferramentas/simulador-irs` · claro | `.text-brand/30`, numerais de passo 30 px |
| `#1a342a` / `#1c1917` | **1,30:1** | 3:1 | `/ferramentas/simulador-irs` · **escuro** | os mesmos numerais — praticamente invisíveis |
| `#c5dfd7` / `#177e5e` | **3,56:1** | 4,5:1 | `/ferramentas/recibos-verdes` · ambos | `.text-white/75` sobre a faixa verde |
| `#768771` / `#faf4ec` | **3,51:1** | 4,5:1 | `/quiz-fiscal` · claro | etiquetas de categoria, 12 px |
| `#6a6460` / `#292524` | **2,60:1** | 4,5:1 | `/metodologia`, `/estado-dos-dados`, `/termos`, `/privacidade` · claro | índice móvel — ver P1-7 |

Notas de leitura: os numerais de 30 px contam como «texto grande» (limite 3:1) e falham à mesma; a `104` no relatório do axe é o número de nós afetados num só carregamento — é um padrão repetido, não um caso isolado. Se os numerais forem puramente decorativos, a saída correta é `aria-hidden="true"` **e** subir o contraste, porque continuam a ser vistos.

**Correção:** escurecer `text-fiz-700` até ≥ 4,5:1 sobre `#fefcf2`; subir `text-brand/30` para pelo menos `/50` em claro e definir um valor próprio em escuro; trocar `text-white/75` por `/90` sobre `#177e5e`; escurecer a etiqueta do quiz.

---

### P1-7 · O índice móvel das páginas legais usa paleta escura fixa — e parte o modo claro

**Severidade:** P1 · **Regra do projeto violada:** inegociável n.º 4 («modo claro intacto»)
**Ficheiro:** `src/components/LegalPage.tsx:235-247`

```tsx
{/* Mobile TOC */}
<div className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/60 p-4 lg:hidden">
  <p className="mb-3 … text-stone-500">Neste documento</p>
  …
    <a className="rounded-lg border border-stone-700 bg-stone-800 px-2.5 py-1 text-[11px] font-medium text-stone-400 …">
```

Nenhuma destas classes tem variante `dark:`. Confirmado num browser real: em **modo claro**, com o corpo a `rgb(237, 234, 224)` (creme), o bloco renderiza a `rgb(41, 37, 36)` com texto a `rgb(106, 100, 96)` — uma caixa preta no meio de uma página clara, a **2,60:1**. O contraste em modo escuro também não chega (4,26:1 contra os 4,5:1 exigidos a 11 px).

E a ironia está seis linhas abaixo, na mesma componente:

```tsx
<div className="flex-1 bg-cream dark:bg-stone-900">
```

O conteúdo respeita os dois temas; o índice acima dele não.

Afeta as seis páginas que usam `LegalPage`: `/termos`, `/privacidade`, `/cookies`, `/metodologia`, `/estado-dos-dados`, `/changelog-fiscal` — só em telemóvel (`lg:hidden`), que é onde o projeto declara desenhar primeiro.

**Correção:**

```tsx
<div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/60 lg:hidden">
  <p className="mb-3 … text-stone-500 dark:text-stone-500">Neste documento</p>
  …
  <a className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700
                dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 …">
```

**Prevenção:** um portão que reprove `bg-stone-8|9xx` / `text-stone-4xx` sem `dark:` ao lado, fora dos blocos que já estão sob `.dark`. O `motor:no-hardcodes` já faz análise estática deste género — é o sítio natural.

---

### P1-8 · Dois mapas dependem, em produção, de um URL `raw.githubusercontent.com`

**Severidade:** P1 · **Natureza:** fiabilidade + cadeia de fornecimento

- `src/components/mapa/MapaRegioes.tsx:167`
- `src/components/negocio/descoberta/MapaOndeOperar.tsx:69`

```ts
const GEO_URL = "https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2/2021/4326/20M/nutsrg_2.json";
```

O browser de cada visitante vai buscar as fronteiras NUTS a um **ramo `master` de um repositório de terceiros**, servido por um endpoint sem SLA e com limitação de débito. Três consequências:

1. **Fiabilidade** — se o repositório mudar o caminho, renomear o ramo ou alterar a forma do GeoJSON, os mapas partem em produção sem nenhum aviso e sem nenhuma alteração deste lado.
2. **Cadeia de fornecimento** — quem controlar aquele repositório controla o que os mapas desenham.
3. **Privacidade** — o IP de cada visitante chega ao GitHub/Microsoft (ver P1-9).

O projeto já sabe fazer isto bem: `src/lib/negocio/market/bulk/dados/concelhos-geo.json` é geometria alojada no próprio repositório, gerada por `npm run concelhos:geo` e commitada.

**Correção:** descarregar o `nutsrg_2.json` uma vez, fixá-lo numa **tag** (não `master`), guardá-lo em `public/geo/` ou em `bulk/dados/` com a proveniência e a data registadas ao lado dos outros conjuntos, e servi-lo da própria origem. Um guião `npm run nuts:geo` no molde do `concelhos:geo` fecha o ciclo de atualização.

---

### P1-9 · A política de privacidade não declara os terceiros que recebem o IP dos visitantes

**Severidade:** P1 · **Natureza:** conformidade RGPD

O quadro de subprocessadores em `src/app/privacidade/page.tsx:321-324` lista **quatro**: Supabase, Vercel, Stripe, Resend. Não lista:

- **CARTO** — `basemaps.cartocdn.com`, em quatro componentes (`MapaRegioes.tsx:200-201`, `MapaOndeOperar.tsx:94-95`, `contabilistas/local/MapaDoLocal.tsx:22-23`, `contabilistas/local/SeletorDeLocal.tsx:33-34`)
- **GitHub / Microsoft** — `raw.githubusercontent.com`, ver P1-8

Sempre que alguém abre `/ferramentas/mapa-contabilistas`, `/ferramentas/descobrir-negocio`, `/ferramentas/comparar-regimes`, `/dashboard/descobrir` ou um perfil de contabilista com mapa, o browser contacta diretamente esses domínios e transmite-lhes o endereço IP e o `Referer`. O endereço IP é dado pessoal (Considerando 30 do RGPD; TJUE, *Breyer*), e o art. 13.º, n.º 1, al. e) e f) obriga a identificar os destinatários e as transferências para países terceiros.

Rigorosamente, não são «subprocessadores» — não tratam dados por conta do Recibo Certo, são recursos que o browser vai buscar. Mas **são destinatários**, e a página não os menciona em lado nenhum.

A atribuição de licença, essa, **está correta** (`MapaRegioes.tsx:203` e equivalentes: `© OpenStreetMap © CARTO`) — não há problema de licenciamento.

**Correção:**
1. Acrescentar à página de privacidade uma secção curta — «Mapas» — a dizer que as páginas com mapa carregam mosaicos do CARTO e fronteiras do Eurostat, que isso transmite o IP a esses fornecedores, e em que páginas acontece.
2. Se P1-8 for corrigido (fronteiras auto-alojadas), o GitHub sai da lista sozinho.
3. Considerar carregar os mosaicos só depois de um gesto explícito («ver no mapa»), à maneira de um *click-to-load* — resolve a divulgação e o desempenho de uma vez.
4. **Verificar em produção** se o CARTO instala cookies. `src/app/cookies/page.tsx:126` afirma «Nenhum domínio externo instala cookies via Recibo Certo». Não foi possível confirmar neste ambiente (o proxy bloqueia o CARTO). Se instalar, a afirmação tem de mudar.

---

### P1-10 · A «regra absoluta» da pesquisa não se verifica

**Severidade:** P1 · **Natureza:** invariante declarado que é falso

`CLAUDE.md:153` e `src/lib/busca/medicao.ts:4` declaram:

> **Regra absoluta:** a consulta não sai do dispositivo.
> *Medição da pesquisa — a consulta NUNCA sai do dispositivo.*

**Medido num browser real.** Escrita a consulta `NIF-SEGREDO-123456789-quanto-pago-de-irs` em `/pesquisar` e premido Enter:

```
FUGAS DA CONSULTA: 1
  ★ GET http://127.0.0.1:3100/pesquisar?q=NIF-SEGREDO-123456789-quanto-pago-de-irs
URL final:  http://127.0.0.1:3100/pesquisar?q=NIF-SEGREDO-123456789-quanto-pago-de-irs
```

`/pesquisar` é rota **dinâmica** (`ƒ` no mapa do build) e lê `searchParams.q` no servidor (`src/app/pesquisar/page.tsx:56`). A consulta viaja no URL, é renderizada no servidor, e fica nos registos de acesso da Vercel.

**Importa distinguir três coisas, para não exagerar o achado:**

- **A decisão de produto está certa e bem argumentada.** O cabeçalho de `src/app/pesquisar/page.tsx:14-30` explica porquê: uma pesquisa precisa de um URL que se partilhe, se guarde nos favoritos e funcione sem JavaScript. Não se propõe desfazê-la.
- **A copy visível ao utilizador está correta.** `src/components/busca/moldura.tsx:642` — «Fica no teu dispositivo … Nada disto entra no endereço» — refere-se aos **valores reconhecidos** que preenchem a ferramenta seguinte (o handoff), não ao texto da consulta. E o handoff cumpre mesmo: viaja em `sessionStorage`.
- **O que está errado é o invariante escrito como absoluto**, e o portão que se apresenta como sua prova. O `busca:fronteira` verifica o **grafo de importações** — que o cabeçalho não arrasta o índice, que nenhum componente de cliente importa `documentos.ts`. É uma verificação excelente e não tem como ver uma navegação de URL. Prova isolamento de bundle; não prova confinamento da consulta.

**Correção:** reescrever a regra para o que é verdade e continua a ser bom:

> **Regra:** o **reconhecimento** e a **ordenação** correm no dispositivo — sem modelo, sem rede, sem servidor — e o **contexto preenchido** viaja em `sessionStorage`, nunca no endereço. A página de resultados `/pesquisar` é a exceção deliberada: tem endereço para se poder partilhar e para funcionar sem JavaScript, e por isso a consulta chega ao servidor e aos seus registos de acesso.

E, sendo consequente com isso: definir um prazo curto de retenção para os registos que contenham `?q=`, e considerar `referrerPolicy="no-referrer"` nas ligações que saem da página de resultados, para a consulta não viajar no `Referer` para o destino.

---

### P1-11 · Treze portões de qualidade nunca correm em lado nenhum

**Severidade:** P1 · **Natureza:** processo

Cruzando os scripts do `package.json` com todos os comandos dos workflows, estes existem, funcionam e **nunca são executados automaticamente**:

| Portão | Estado quando corrido nesta auditoria |
|---|---|
| `hierarquia:e2e` | ❌ **reprova** (P0-2) |
| `stripe:check` | ❌ **exit 1** (sem segredos — mas nem sequer é tentado) |
| `dashboard:e2e` | **Feito** — passa |
| `navegacao:e2e` | **Feito** — passa |
| `cabecalho:e2e` | **Feito** — passa |
| `bussola:e2e` | **Feito** — passa |
| `vencimento:e2e` | **Feito** — passa |
| `visivel:e2e` | **Feito** — passa |
| `palcos:e2e` | **Feito** — passa |
| `afinidade:e2e` | **Por decidir** — requer Supabase |
| `seo:audit` | **Feito** — passa com 1 aviso |
| `supabase:check` | **Feito** — passa com avisos |
| `busca:check` · `quiz:check` · `market:check` | cobertos indiretamente por `npm test` |

O padrão é claro: **o trabalho de escrever a verificação foi feito; o de a ligar não.** É a mesma raiz do P0-1a.

**Correção:** um job novo no `testes-e-build.yml`, a correr contra o mesmo artefacto de produção que os outros e2e já usam:

```yaml
- name: Portões de superfície — hierarquia, navegação, cabeçalho, bússola, painel, visibilidade, palcos
  run: |
    RC_BASE_URL=http://localhost:3000 npm run hierarquia:e2e
    RC_BASE_URL=http://localhost:3000 npm run navegacao:e2e
    RC_BASE_URL=http://localhost:3000 npm run cabecalho:e2e
    BASE_URL=http://localhost:3000    npm run bussola:e2e
    RC_BASE_URL=http://localhost:3000 npm run dashboard:e2e
    RC_BASE_URL=http://localhost:3000 npm run visivel:e2e
    BASE_URL=http://localhost:3000    npm run palcos:e2e
```

`seo:audit` e `supabase:check` são estáticos e cabem no job «Tipos, testes e build». `stripe:check` e `afinidade:e2e` precisam de segredos: ou entram num workflow agendado com os segredos ligados, ou passam a distinguir «não configurado» (saída 0 com aviso) de «configurado e errado» (saída 1) — hoje falham com 1 nos dois casos, o que os torna inúteis em CI.

---

## 4. P2 — Médios

### P2-1 · 36% dos parâmetros fiscais estão fora do portão de proveniência

**Ficheiro:** `src/lib/fiscal-data.ts:7105-7312` e `:8167-8182`

Medido carregando o módulo e percorrendo todas as exportações:

```
TOTAL de parâmetros Sourced<T> …… 535
em PARAMETROS_AUDITADOS ………………… 344
★ FORA DA AUDITORIA ………………………… 192   (35,9%)
```

O `assertFiscalDataIntegrity()` só aplica a estes três controlos aos 344 da lista:

```ts
const sourced: readonly Sourced<unknown>[] = PARAMETROS_AUDITADOS;
sourced.forEach((p) => {
  if (!(p.source in SOURCES)) erros.push(…);
  if (!isIsoDate(p.lastVerified)) erros.push(…);
  else if (… p.lastVerified > DATA_LAST_REVIEW) erros.push(…);
});
```

Ficam de fora blocos inteiros e nada triviais: `PAGAMENTOS_CONTA_IRS.*` (6), `COIMAS_RGIT.*` (8), `REDUCAO_COIMA.*` (5), `RESIDENCIA_FISCAL.*` (12), `REPRESENTANTE_FISCAL.*` (6), `NAO_RESIDENTES.*` (6), `ISENCAO_IVA_REGIME.*` (8), `DECLARACAO_PERIODICA_IVA.*` (5), `REGULARIZACAO_IVA.*` (5), `IRS_AUTOMATICO.*` (6), `PROPRIEDADE_INTELECTUAL_EBF.*` (5), `REDUCAO_IRS_REGIOES_AUTONOMAS`, `RENDIMENTO_MUNDIAL`, `RCBE_*`, `CAPITAL_SOCIAL_MINIMO_POR_SOCIO`…

Hoje nenhum deles viola nada — a data mais recente encontrada é `2026-09-01`, igual ao `DATA_LAST_REVIEW`. **A questão não é o estado atual, é a garantia:** o comentário no topo do ficheiro diz «é impossível publicar dados internamente inconsistentes (o build falha)», e para 192 parâmetros isso é falso. A chave `source` está protegida pelo tipo `SourceKey`; a validade e a coerência da data não estão protegidas por nada.

**Correção — não engordar a lista à mão.** Substituir `PARAMETROS_AUDITADOS` por uma recolha automática, que não pode ficar desatualizada:

```ts
function recolherSourced(raiz: unknown, prof = 0, visto = new WeakSet()): Sourced<unknown>[] {
  if (prof > 5 || !raiz || typeof raiz !== "object") return [];
  if (visto.has(raiz as object)) return [];
  visto.add(raiz as object);
  if (ehSourced(raiz)) return [raiz as Sourced<unknown>];
  return Object.values(raiz as Record<string, unknown>)
    .flatMap((v) => recolherSourced(v, prof + 1, visto));
}
```

Manter `PARAMETROS_AUDITADOS` como está — é útil para a API `/api/fiscal-data` e para a documentação — e acrescentar uma asserção nova: **todo o `Sourced` recolhido tem de passar os três controlos**, e a diferença entre o recolhido e o curado tem de ser explícita, não acidental.

---

### P2-2 · Oitenta e cinco parâmetros dizem «verificado a 11/06», e a interface diz «revisto a 01/09»

**Ficheiro:** `src/lib/fiscal-data.ts:777` (`const TODAY = "2026-06-11"`) e `:29` (`DATA_LAST_REVIEW = "2026-09-01"`)

Distribuição real das datas de verificação:

```
2026-06-11 …… 85 parâmetros   ← a constante TODAY
2026-08-07 …… 233
2026-08-06 ……  64
2026-07-29 ……  64
2026-09-01 ……  32
… (restantes, 10 datas) ……… 57
```

A `DATA_LAST_REVIEW` é o que a secção «Fontes» mostra ao utilizador e o que o `/llms.txt` publica («Última revisão dos parâmetros fiscais: 2026-09-01»). Oitenta e cinco parâmetros — entre eles o **IAS**, as **taxas de retenção do Art. 101.º**, o **IRC geral e PME**, o **limite PME**, a **derrama máxima**, a **taxa de dividendos** — não são tocados desde 11 de junho, quase três meses antes.

A asserção só impede o sentido *contrário* (parâmetro mais recente do que a revisão). Nada impede a distância crescer indefinidamente. E a constante chamar-se `TODAY` incentiva-o: é o valor por omissão de quem acrescenta um parâmetro novo, e congela na data em que foi escrita.

Esta é, palavra por palavra, a observação que a auditoria de julho fez em §3.3. Continua verdadeira, com as datas mudadas.

**Correção:**
1. Renomear `TODAY` para algo que não minta — `REV_BASE_2026_06` — para que ninguém a use por reflexo.
2. Acrescentar à asserção um limite de **frescura**: se algum parâmetro tiver `lastVerified` mais de N dias (90? 180?) antes do `DATA_LAST_REVIEW`, o `fiscal:check` avisa; ultrapassado o dobro, reprova.
3. Mostrar na secção «Fontes» a data **do parâmetro concreto** ao lado de cada valor, e não só a global. O `Sourced<T>` já a transporta — falta usá-la.

---

### P2-3 · Oito parâmetros fiscais sustentados por fontes comerciais ou secundárias

Das 166 fontes de `SOURCES`, 157 são oficiais ou institucionais. Restam oito, e algumas sustentam números que o utilizador lê como determinados por lei:

| Chave | Fonte | Sustenta |
|---|---|---|
| `subsidioRefeicao2026` | **edenred.pt** | `SUBSIDIO_REFEICAO` — limite diário isento, `fiscal-data.ts:5286` |
| `art163CodigoContributivo` | informador.pt (agregador privado) | `SS_AJUSTE_BASE` — o ajuste de ±25%, `:1143` |
| `retencaoSuplementar2026` | doutorfinancas.pt | retenção do trabalho suplementar, `:5798` |
| `ativosMaisValias2026` | ativos.pt (blog) | Art. 72.º n.º 1 e n.º 18 CIRS, `:4402`, `:4411` |
| `faciliteCripto2026` | facilite.co (blog) | criptoativos < 365 dias, `:4535` |
| `cgdImoveisMaisValias` | blog da CGD | mais-valias de imóveis |
| `pwcGuiaFiscal`, `ircObrigacoes` | PwC | pagamentos por conta de IRC, `:6996-7024` |

O `subsidioRefeicao2026` merece nota especial: a **Edenred vende cartões-refeição**, e o parâmetro tem dois valores — `dinheiro` e `cartao` — em que o do cartão é mais alto. Sustentar precisamente essa diferença na comunicação de quem vende o cartão é um conflito de interesses evitável, sobretudo num produto cuja primeira regra de ouro é a proveniência.

Todos estes valores têm base legal correta escrita ao lado. **É o endereço da fonte que não é a lei.**

**Correção:** substituir por articulado oficial. O Código dos Regimes Contributivos está no Diário da República; o Art. 2.º, n.º 3, al. b) do CIRS e o Art. 72.º estão no Portal das Finanças; os pagamentos por conta de IRC estão nos arts. 104.º e 105.º do CIRC. Onde uma fonte secundária for genuinamente insubstituível (uma tabela agregada que a AT não publica em HTML), marcá-la como tal no `Source` — um campo `natureza: "oficial" | "referencia"` — e fazer o `fiscal:check` contá-las e avisar.

---

### P2-4 · Tabelas roláveis sem acesso por teclado

**Severidade:** P2 (axe: serious) · **Regra:** WCAG 2.1.1

Oito ocorrências, quatro páginas, ambos os temas, só a 360 px:

```
scrollable-region-focusable — /metodologia, /estado-dos-dados, /investidores, /privacidade
alvo: #resultado > .space-y-4 > .overflow-x-auto.mt-3.rounded-2xl
      #citavel  > .space-y-4 > .overflow-x-auto.mt-3.rounded-2xl
```

Um contentor `overflow-x-auto` sem conteúdo focável não se consegue rolar só com teclado: quem não usa rato nem toque não chega às colunas da direita.

**Correção:** `tabIndex={0}` mais `role="region"` e um `aria-label` que diga o que a tabela mostra — no invólucro `.overflow-x-auto`. Um componente `<TabelaRolavel>` partilhado resolve os quatro sítios de uma vez e evita a próxima ocorrência.

---

### P2-5 · Peso das páginas — os guias são a superfície mais pesada do site

Medido num browser real, com `transferSize` (já comprimido):

| Rota | Pedidos | Transferido | JS (gzip) | Nós DOM |
|---|---|---|---|---|
| `/` | 42 | 522 KB | 311 KB | 1 601 |
| `/precos` | 35 | 437 KB | 265 KB | 860 |
| `/ferramentas/simulador-irs` | 56 | 925 KB | 666 KB | 1 164 |
| **`/guias/escaloes-irs`** | **87** | **1 059 KB** | **631 KB** | **2 943** |
| `/dashboard` | 94 | 1 033 KB | 803 KB | 632 |

O próprio portão do build já assinala o lado do HTML:

```
[homepage] AVISO: /: HTML cru 329.8 KB excede a meta editorial de 200.0 KB
[homepage] AVISO: /inicio/preco: 315.6 KB … /inicio/recibos: 291.3 KB … /inicio/empresa: 311.7 KB … /inicio/salario: 286.0 KB
```

O caso que mais custa é o dos **guias**. São 167 páginas, são o motor de aquisição orgânica, e um artigo que entrega 631 KB de JavaScript comprimido em 87 pedidos está três a seis vezes acima do que uma página de conteúdo bem otimizada entrega. A velocidade é fator de posicionamento, e é sobre estas páginas que o programa de autoridade assenta.

**Correção:** medir primeiro — `npm run desempenho` já existe. Depois, por ordem de retorno: (a) ver o que arrasta o `motion` e o SDK do Supabase para uma página de artigo, que não precisa de nenhum dos dois no arranque; (b) passar os blocos interativos dos guias a `next/dynamic({ ssr: false })` com carregamento por proximidade — o padrão do `usePerto` já existe no `ContadorVitalicio`; (c) atacar os 2 943 nós DOM, que é sinal de estrutura repetida que poderia ser gerada ou virtualizada.

O bloco `noModule` de 110 KB que o portão reporta **não é problema** — são os polyfills do Next que nenhum browser com módulos ES chega a pedir, e o guião já os exclui do orçamento com uma explicação correta.

---

### P2-6 · Limitação de débito em memória e IP vindo de cabeçalho manipulável

**Ficheiro:** `src/lib/rate-limit.ts`

Duas observações, a primeira já honestamente documentada no próprio ficheiro:

1. **O estado é por instância** e reinicia em arranque a frio. Em serverless, um atacante distribuído contorna-o sem esforço. É explicitamente aceite no comentário, mas as rotas protegidas por ele incluem envio de email, geração de cupões, prémios do quiz e criação de sessões de checkout — abuso com custo real.
2. **`clientIp()` confia no primeiro valor de `x-forwarded-for`.** Na Vercel esse valor é reescrito pela plataforma e é fiável; fora dela, ou se alguma vez o serviço for exposto diretamente, qualquer cliente pode enviar um `X-Forwarded-For` diferente a cada pedido e ficar com limite infinito. É uma dependência tácita do alojamento.
3. Menor: `prune()` só corre ao **criar** uma janela nova e só remove janelas **expiradas**. Com 10 000 chaves ativas não apaga nada e o mapa continua a crescer — a «trava de segurança contra crescimento ilimitado» do comentário não é o que o código faz.

**Correção:** para as rotas com custo (email, cupões, checkout, prémios), passar a um contador durável — Upstash/Redis ou uma tabela no Supabase com `INSERT … ON CONFLICT` — mantendo a assinatura atual, como o próprio comentário sugere. Preferir `x-vercel-forwarded-for` quando existir, e documentar a dependência da plataforma. No `prune()`, se após limpar as expiradas o mapa continuar acima de `MAX_KEYS`, remover as de expiração mais próxima.

---

### P2-7 · Ficheiros soltos na raiz: um guião de rascunho e um `.bat` com mensagem de commit fixa

**`smoke-tmp.mjs`** (raiz) — guião de rascunho commitado, referenciado por nada, com caminho absoluto para o Chromium de uma máquina específica (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) e `--ignore-certificate-errors`. **Correção:** apagar, ou mover para `scripts/` com o caminho vindo de `PLAYWRIGHT_CHROMIUM` como todos os outros.

**`git-push.bat`** (raiz):

```bat
git add -A
git commit -m "fix: corrigir bugs mobile e de logica no simulador"
git push
```

Um `git add -A` cego com **mensagem de commit fixa**. Quem o usar produz sempre um commit com a mesma descrição, seja qual for a alteração — e salta a regra de ouro n.º 9 (subir `APP_VERSION` e acrescentar entrada ao `CHANGELOG`), que é precisamente o que o `changelog-check.yml` existe para impor. **Correção:** apagar. Se a conveniência fizer falta em Windows, um guião que aceite a mensagem como argumento e recuse correr sem ela.

---

### P2-8 · Metadados acima do comprimento útil

- **142 páginas** com `<title>` acima de 60 caracteres
- **104 páginas** com `description` acima de 160 caracteres

Descontando `/admin/*` e `/dashboard/*` (que são `noindex` e não interessam), sobram cerca de 40 públicas — quase todas as ferramentas e vários guias. Casos extremos: `/ferramentas/simulador-irs` com 244 caracteres de description; `/ferramentas/mapa-contabilistas` com 97 de title.

Corrigir os 19 do P1-3 já resolve boa parte dos títulos. Para o resto, o alvo prático é ~55-60 caracteres de title e ~150-155 de description.

Duas páginas públicas herdam por inteiro os metadados da raiz — `/redefinir-password` e `/parceiros/indisponivel` partilham a mesma description, o que as torna duplicados exatos aos olhos de um motor de busca. O `seo:audit` já assinala parte disto («/inicio/empresa, /inicio/preco, /inicio/recibos, /inicio/salario, /redefinir-password»).

---

### P2-9 · Páginas privadas com o título de marketing no separador

Todas as 42 páginas de `/admin/*` e várias de `/contabilista/*` mostram no separador do browser:

> `Simulador de IRS, Recibos Verdes, Salário e Empresa 2026 | Recibo Certo`

e não têm `<h1>`. Não tem impacto de SEO (são `noindex`, corretamente), mas é exatamente o problema que o commit `e79a6be` («O separador do browser volta a dizer a marca em todo o painel», 2.155.1) se propôs resolver — e que ficou por resolver do lado do `/admin`. Quem trabalha com seis separadores abertos não os distingue.

**Correção:** um `layout.tsx` em `src/app/admin/` com `export const metadata = { title: { template: "%s · Admin — Recibo Certo", default: "Admin — Recibo Certo" } }` e um `title` por página. O mesmo para `/contabilista/`.

---

### P2-10 · O modo escuro ignora a preferência do sistema

**Ficheiro:** `src/app/layout.tsx:176`

```js
(function(){try{if(localStorage.getItem('recibocerto:theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()
```

O tema depende exclusivamente do `localStorage`. Confirmado num browser real: com `prefers-color-scheme: dark`, `document.documentElement.className` **não** recebe `dark` e o corpo mantém-se a `rgb(237, 234, 224)`. Quem tem o sistema em escuro recebe o site claro na primeira visita e só sai de lá se encontrar o interruptor.

Não encontrei decisão documentada a favor disto no `DESIGN.md` nem na skill de design — é mais provável que seja omissão do que escolha.

**Correção** (mantendo a escolha explícita a ganhar sempre à do sistema):

```js
(function(){try{var t=localStorage.getItem('recibocerto:theme');
if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))
document.documentElement.classList.add('dark')}catch(e){}})()
```

E acrescentar `<meta name="color-scheme" content="light dark">` para os controlos nativos (barras de deslocamento, campos de formulário) acompanharem.

---

### P2-11 · `.gitignore` não cobre todas as formas de `.env`

Cobre `.env` e `.env*.local`. Não cobre `.env.production`, `.env.development`, `.env.staging`. Não há nenhum no repositório neste momento — o varrimento de segredos não encontrou nada (os únicos aparentes são as verificações de prefixo em `src/lib/billing/prices.ts:50-51`, que são código legítimo). É endurecimento barato: trocar as duas linhas por `.env*` mais `!.env.example`.

---

### P2-12 · Verificações não herméticas

`concelhos:check`, `oferta:concelhos:check`, `procura:nuts2:check` e `mercado:check` fazem pedidos HTTP ao INE e ao Eurostat **a cada execução**. Neste ambiente devolveram 403 e 503, e o `gen-concelhos.mjs` termina com exceção não tratada. Duas execuções seguidas do mesmo comando deram resultados diferentes — é uma verificação que depende de terceiros para dizer se o repositório está bom.

Está corretamente contido: no `mercado-ingestao.yml` correm com `continue-on-error: true` e não bloqueiam nada. Mas quem os corre à mão recebe um traço de pilha, não uma mensagem.

**Correção:** apanhar as falhas de rede e distinguir «não consegui perguntar» (saída 0, aviso claro) de «perguntei e o ficheiro está desatualizado» (saída 1). Vale para os quatro.

---

## 5. P3 — Menores

| # | Achado | Ficheiro | Nota |
|---|---|---|---|
| P3-1 | `limiteGlobalDeducoes()` devolve `Infinity` (sentinela «sem limite») e `NaN` para entrada `NaN` — é a única função da família que não faz `sanitize()` da entrada | `src/lib/fiscal.ts:502-517` | Contido hoje **por acidente**: `limitado = somaBruta > limiteGlobal` dá `false` com `Infinity`, e o exportador de documentos (`src/lib/export/documento-irs.ts:75`) devolve `null` nesse caso, pelo que o `cent(Infinity)` nunca acontece. Preferir `null` explícito a `Infinity`, e `sanitize()` na entrada. |
| P3-2 | `calcular()` devolve `taxaRetencao` nominal enquanto a retenção efetiva é `bruto × (1 − isençãoJovem) × taxa` — com IRS Jovem, a percentagem mostrada e o valor em euros não batem certo | `src/lib/fiscal.ts:419-424` | Verificar como a interface os apresenta lado a lado; se apresentar, expor também a taxa efetiva. |
| P3-3 | `calcular()` anualiza um recibo com `bruto × 12` para estimar a SS, aplicando o mínimo de 20 €/mês a cada recibo | `src/lib/fiscal.ts:435-446` | Documentado como estimativa. Para quem emite vários recibos por mês, cada um traz o mínimo mensal inteiro. Vale um aviso na copy. |
| P3-4 | `linkedin-avatar` lê `arrayBuffer()` completo antes de verificar o tamanho; sem `content-length`, um servidor malicioso pode esgotar memória | `src/app/api/contabilistas/linkedin-avatar/[userId]/route.ts:69-70` | Risco baixo (o host está em lista de permissão). Ler em fluxo com corte aos 5 MB. |
| P3-5 | `ajusteBaseValido()` — `Math.round(x / 0,05) × 0,05` produz `0.15000000000000002` | `src/lib/fiscal.ts:216-222` | Arredondar a 2 casas depois do alinhamento. |
| P3-6 | JSON-LD com `JSON.stringify` em `dangerouslySetInnerHTML` (29 sítios) — `JSON.stringify` não escapa `<` | `src/components/guias/GuiaLayout.tsx:82`, `src/components/foco/HomepageFocoShell.tsx:35`, e 27 outros | **Não explorável hoje**: todo o conteúdo é estático e nenhuma destas páginas injeta dados de utilizador ou de base de dados. Endurecimento: `.replace(/</g, "\\u003c")` num utilitário partilhado, antes que a primeira página dinâmica apareça. |
| P3-7 | A CSP não tem `default-src` nem `script-src` | `next.config.mjs:73-76` | Decisão documentada e defensável (não partir Stripe, Supabase, mapas). Fica sem defesa em profundidade contra XSS. Caminho: CSP com nonce validada página a página, como o próprio comentário antecipa. |
| P3-8 | O `X-Robots-Tag: noai, noimageai` global é **substituído** (não somado) pelas regras de `/dashboard/*`, `/admin/*` e `/api/*` — medido nas respostas reais | `next.config.mjs:80-99` | Sem consequência (são páginas privadas), mas o `tdm-reservation: 1` continua presente, que é o sinal que conta. |
| P3-9 | 50 chaves distintas de `localStorage` sem inventário central nem versionamento uniforme | `src/lib/store/*` | Algumas versionadas (`:v1`, `:v2`, `__versao`), outras não. O `cofre.ts` faz migração e o `zona:e2e` prova que o apagamento seletivo funciona — mas uma mudança de formato numa chave não versionada não tem por onde migrar. |
| P3-10 | 14 avisos no `guias:links`: os links profundos do `seg-social.pt` redirecionam todos para a página inicial do portal | saída de `npm run guias:links` | Quem clicar em «trabalhadores independentes» aterra na entrada genérica. O portão marca-os como aviso e não como erro — corretamente, porque respondem 200 — mas o utilizador perde o destino. |

---

## 6. O que está bem construído — e não deve ser tocado

Uma auditoria que só enumera defeitos dá uma imagem falsa. Isto é genuinamente sólido:

1. **O conjunto de testes.** 204 ficheiros, 4 346 testes, 39,8 segundos, zero falhas. Não são testes de fachada: verificam identidades («PVP = líquido + IVA», «aumentar custo nunca aumenta lucro»), admissão de hipóteses no catálogo de mercado, integridade do grafo de descoberta, e o comportamento imutável do popup de Novidades.

2. **Os motores resistem a fuzzing.** 20 000 contextos de preço aleatórios — regimes de IVA, regiões, canais, custos de 0 a 10⁷, margens até 99,9%, volumes de 0 a 10⁵ — produziram **zero** valores não-finitos e **zero** exceções, e o round-trip `margem → markup → margem` é exato até 1e-9. A grelha fiscal completa, com `NaN`, `±Infinity` e negativos em todas as entradas, não produziu um único `NaN`, um único valor negativo impossível, nem uma quebra de monotonia no IRS progressivo ou na Segurança Social. Os únicos não-finitos encontrados são o `Infinity` deliberado do P3-1.

3. **A fronteira de segurança das APIs.** Todas as rotas sensíveis validam o JWT na Auth API (`sb.auth.getUser(token)`), nunca no conteúdo local do token. O papel de administração é confirmado em `profiles` **sob o RLS do próprio utilizador**, não com a chave de serviço. Os crons usam comparação em tempo constante e **falham fechados** sem `CRON_SECRET`. O `/api/conta/apagar` nunca aceita `user_id` do corpo — lê-o de `auth.uid()` do lado da base de dados. O `/api/conta/exportar` lê com a sessão da pessoa e não com a chave de serviço, precisamente para o RLS continuar a valer.

4. **O RLS.** 77 das 78 tabelas com `ENABLE ROW LEVEL SECURITY`. As quatro políticas `USING (true)` que existem são todas defensáveis, e a mais delicada — `contabilista_stripe` — é um exemplo de desenho cuidado: um papel dedicado `contrato_publico`, sem login e sem `BYPASSRLS`, dono da view, de onde sai **um único facto** (`charges_enabled`), com o raciocínio de privacidade escrito ao lado.

5. **O proxy de avatar do LinkedIn** (`linkedin-avatar/[userId]/route.ts`) é o SSRF mais bem defendido que se encontra num projeto deste tamanho: lista de permissão de anfitriões, só HTTPS, **revalidação do URL final depois dos redirecionamentos**, verificação de `content-type`, limite de tamanho, tempo-limite, e cabeçalhos de segurança na resposta.

6. **Higiene do código.** Zero `as any`, zero `eval`, zero `@ts-ignore`, zero `@ts-nocheck` em 1 540 ficheiros TypeScript. Nenhum segredo commitado. Cabeçalhos de segurança em todas as respostas, e `Cache-Control: private, no-store` correto em todas as rotas que devolvem dados de utilizador.

7. **Robustez em runtime.** 289 de 289 rotas devolvem 200. Em 64 carregamentos de página com browser real, rolagem completa e dois temas, apareceram **dois** erros de consola que não são de rede — ambos o mesmo «Supabase não configurado», esperado neste ambiente. Nenhum `pageerror`, nenhuma exceção de React, nenhuma quebra de hidratação.

8. **Onze dos catorze guiões e2e passam**, incluindo o portão do telemóvel (`movel:e2e`: cinco rotas × 360 e 320 px × dois temas, sem transbordo horizontal e sem texto abaixo dos 12 px) e o `zona:e2e` órfão.

9. **A cultura de comentários.** Os cabeçalhos que explicam *porque* uma decisão foi tomada — e o que se partiu antes — são raros e valiosos. `src/app/pesquisar/page.tsx`, `src/lib/fiscal.ts:157-170`, `20260820165708_o_contrato_publico_fecha_a_tabela.sql` e `scripts/verificar-chunks-homepage.mjs` são exemplos de documentação que sobrevive a quem a escreveu.

---

## 7. Plano de execução sugerido

### Bloco A — pôr o CI verde (uma sessão)

- [ ] **P0-1a** — repor `"zona:e2e"` no `package.json`
- [ ] **P0-1b** — `.first()` em `scripts/verificar-contratacao.mjs:115`, e nome acessível distinto para o CTA do arco
- [ ] Confirmar que a corrida seguinte de `testes-e-build.yml` chega ao passo 15
- [ ] **P0-1c** — recuperar o artefacto `matriz-visual` da corrida #402 e decidir capa a capa
- [ ] Portão novo: todo o `npm run <x>` dos workflows tem de existir no `package.json`

### Bloco B — o que já reprova e ninguém vê (uma sessão)

- [ ] **P1-11** — job novo no CI com `hierarquia`, `navegacao`, `cabecalho`, `bussola`, `dashboard`, `visivel`, `palcos`
- [ ] **P0-2** — corrigir as superfícies sem pista visível em `/inicio/preco` e `/inicio/recibos`
- [ ] `seo:audit` e `supabase:check` para dentro do job de tipos/testes
- [ ] `stripe:check` e `afinidade:e2e`: distinguir «não configurado» de «configurado e errado»

### Bloco C — o que o utilizador vê (uma a duas sessões)

- [ ] **P1-3** — 19 títulos com a marca duplicada + teste de prevenção
- [ ] **P1-4** — `<h1>` em `/precos`
- [ ] **P1-5** — `aria-labelledby` no interruptor de sons do quiz
- [ ] **P1-6** — seis pares de contraste até AA
- [ ] **P1-7** — índice móvel do `LegalPage` com variantes `dark:`
- [ ] **P2-4** — `<TabelaRolavel>` com `tabIndex`, `role` e `aria-label`
- [ ] **P2-9** — metadados próprios para `/admin` e `/contabilista`
- [ ] **P2-10** — tema a seguir a preferência do sistema

### Bloco D — decisões do dono do projeto (não são trabalho de código)

- [ ] **P1-1** — decidir entre (A) manter a proteção e apagar o programa de autoridade, ou (B) reabrir aos motores de resposta mantendo o treino bloqueado. Depois: atualizar `ESTRATEGIA.md §6` e `§1.3`, `autoridade.ts §10.4`, a skill de crescimento, e `check-security-boundary.mjs:109`
- [ ] **P1-2** — `/llms.txt`: isentar no proxy ou deixar de servir, conforme a decisão acima
- [ ] **P1-10** — reescrever a «regra absoluta» da pesquisa para o que é verdade; definir retenção dos registos com `?q=`

### Bloco E — dados, privacidade e fiabilidade

- [ ] **P1-8** — auto-alojar o GeoJSON NUTS, fixado numa tag
- [ ] **P1-9** — declarar CARTO (e GitHub, enquanto durar) na página de privacidade; ponderar carregamento sob gesto
- [ ] **P2-1** — recolha automática dos `Sourced` na asserção de integridade
- [ ] **P2-2** — renomear `TODAY`, limite de frescura no `fiscal:check`, mostrar a data por parâmetro
- [ ] **P2-3** — substituir as 8 fontes secundárias por articulado oficial (a da Edenred primeiro)
- [ ] **P2-6** — limitador de débito durável nas rotas com custo
- [ ] **P2-5** — medir e aliviar o peso dos guias

### Bloco F — arrumação

- [ ] **P2-7** — apagar `smoke-tmp.mjs` e `git-push.bat`
- [ ] **P2-8** — títulos e descriptions ao comprimento útil
- [ ] **P2-11** — `.gitignore`: `.env*` + `!.env.example`
- [ ] **P2-12** — verificações de rede a falhar com mensagem, não com traço de pilha
- [ ] **P3-1 a P3-10** — conforme houver espaço

---

## 8. Anexo — como reproduzir

```bash
npm ci
npm run build                       # portão de chunks incluído
npx vitest run                      # 204 ficheiros · 4 346 testes
npm audit --audit-level=high

# servidor de produção para os e2e e as medições
npx next start -p 3100 &
export RC_BASE_URL=http://127.0.0.1:3100
export BASE_URL=http://127.0.0.1:3100
export PLAYWRIGHT_CHROMIUM=/caminho/para/chromium   # se o Playwright empacotado não bater certo

node scripts/verificar-zona-risco.mjs      # passa — e nunca corre em CI
node scripts/verificar-hierarquia.mjs      # ❌ 2 falhas
node scripts/verificar-contratacao.mjs     # ❌ strict mode violation

# a contradição dos crawlers
curl -s -o /dev/null -w "%{http_code}\n" -A "OAI-SearchBot/1.0" http://127.0.0.1:3100/llms.txt   # 403
curl -s -o /dev/null -w "%{http_code}\n" -A "Googlebot/2.1"     http://127.0.0.1:3100/llms.txt   # 200

# os títulos duplicados
curl -s http://127.0.0.1:3100/ferramentas | grep -o "<title>[^<]*</title>"

# /precos sem h1
curl -s http://127.0.0.1:3100/precos | grep -o "<h1" | wc -l    # 0
```

**Histórico de CI:** `https://github.com/henriquecoding/recibo-certo/actions/workflows/testes-e-build.yml`
Corrida #409 (a mais recente concluída em `main`): `https://github.com/henriquecoding/recibo-certo/actions/runs/33669555702`

---

*Auditoria conduzida a 3 de setembro de 2026 sobre o commit `edbd56d` (versão 2.158.0). Todos os achados classificados como P0 e P1 foram reproduzidos empiricamente e trazem o comando ou a medição que os demonstra. Os valores fiscais não foram reverificados contra as fontes primárias — ver «O que esta auditoria NÃO verificou», secção 1.*
