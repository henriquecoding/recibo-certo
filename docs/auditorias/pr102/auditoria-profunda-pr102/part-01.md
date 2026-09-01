# Auditoria profunda — Recibo Certo PR #102

**Data da análise:** 13 de agosto de 2026  
**Pull request:** [#102 — Plataforma de contabilistas: agenda, clientes, partilhas e fidelidade](https://github.com/henriquecoding/recibo-certo/pull/102)  
**Commit analisado:** `99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8`  
**Preview analisado:** [recibo-certo-os2f4p8s5-henpassquesoris-projects.vercel.app](https://recibo-certo-os2f4p8s5-henpassquesoris-projects.vercel.app/)  
**Escopo:** design, experiência, arquitetura, funcionalidades, segurança, dados, testes, CI e comportamento em runtime.

## 1. Veredito executivo

O PR representa uma expansão de produto grande e conceitualmente forte: deixa de ser apenas um conjunto de páginas e começa a formar um verdadeiro espaço de trabalho entre cliente e contabilista. A decomposição do domínio, a preocupação com estados vazios, a agenda, as partilhas, a fidelidade e o trabalho por cliente mostram boa visão de produto.

**Eu não faria merge nem promoveria este preview para produção no estado atual.** O motivo não é estético: existem bloqueios objetivos de runtime, segurança e integridade de dados.

O primeiro bloqueio já é visível no próprio preview: a página pública de contabilistas tenta consultar `public.contabilistas`, mas a tabela não existe no projeto Supabase ligado ao deployment. Isto significa que as migrações novas não foram aplicadas ao ambiente que deveria validar o PR. A interface carrega, mas a funcionalidade central não funciona e os fluxos autenticados não podem ser validados de ponta a ponta nesse ambiente.

Além disso, a inspeção das migrações e do código encontrou caminhos de escrita direta que permitem alterar campos que deveriam ser imutáveis. O caso mais grave é o vínculo: pelas políticas atuais, um contabilista pode, via REST, mudar o `cliente_id` de um vínculo já existente. Como mensagens e outros dados são associados ao vínculo, isso cria um caminho plausível de perda de acesso para um cliente e exposição do histórico a outro. Esse caminho foi identificado por leitura de SQL e fluxo de autorização; não foi explorado no ambiente público.

No design, a sensação de simplicidade do produto é real, mas a causa está bem localizada: **o Recibo Certo ainda usa a gramática visual de uma landing page em áreas que já são um software operacional**. Há muitos cartões brancos equivalentes, baixa densidade informacional, pouca identidade humana e pouca variação semântica entre estados. Adicionar mais gradientes, sombras ou ilustrações não resolveria. O salto de qualidade virá de hierarquia, dados, navegação persistente, contexto, estados semânticos e composição de workspace.

### Recomendação de decisão

| Decisão | Recomendação |
|---|---|
| Merge agora | **Não** |
| Teste interno após correções P0 | Sim |
| Beta com utilizadores reais | Apenas após RLS/E2E reais e preview com banco migrado |
| Refazer toda a interface | Não; preservar a marca e evoluir a gramática de produto |

## 2. Placar da revisão

As notas abaixo são uma fotografia deste commit, não uma avaliação da capacidade da equipa.

| Área | Nota | Leitura |
|---|---:|---|
| Conceito e arquitetura de produto | 8/10 | Escopo coeso e bom entendimento do relacionamento cliente–contabilista |
| Arquitetura de código | 7/10 | Boa separação por domínio; invariantes importantes ficaram espalhadas entre UI, API e SQL |
| Execução visual pública | 5,5/10 | Coerente e limpa, mas genérica e pouco orientada a prova/conversão |
| UI autenticada, pela inspeção do código | 7/10 | Componentes e estados promissores; não foi possível validá-los integralmente em runtime |
| Acessibilidade estrutural | 6,5/10 | Bons nomes de controlos e foco em vários componentes; há lacunas em overlays e landmarks |
| Cobertura de testes | 5/10 | Bom volume unitário e de especificações RLS; a parte crítica não roda no CI |
| Segurança e isolamento de dados | 3/10 | A intenção é correta, mas há mutações cross-tenant e invariantes ausentes |
| Prontidão de runtime | 2/10 | O preview não possui o schema necessário para o próprio PR |
| Prontidão para release | 2/10 | Build verde não representa um fluxo funcional e seguro neste momento |

## 3. O que foi efetivamente verificado

Esta análise distingue quatro tipos de evidência:

- **Runtime:** navegação e inspeção do deployment da Vercel em desktop, incluindo DOM, console e respostas da aplicação.
- **Build/CI:** deployment, build, checks e logs associados ao mesmo SHA do PR.
- **Código/SQL:** inspeção do diff, rotas, helpers, políticas RLS, triggers e fluxos de dados.
- **Referências:** comparação do produto com as seis referências visuais únicas enviadas; as imagens 2 e 3 são duplicadas.

Os fluxos autenticados internos não puderam ser executados de ponta a ponta porque o preview não tem as tabelas novas e não foi fornecido um conjunto de contas de teste. Nesses fluxos, a avaliação visual é baseada no código e a avaliação de segurança é baseada nas políticas e rotas. Essa limitação não reduz o bloqueio; ela é, por si só, um problema do processo de validação do PR.

## 4. Estado do PR, CI e deployment

### GitHub

- PR aberto, não draft e marcado como mergeable.
- Base: `main` no commit `3579cff…`.
- Head: `claude/continue-interrupted-pr-73s7hi` no commit `99436c9…`.
- 20 commits, 97 ficheiros alterados, aproximadamente `+15.982 / -53` linhas.
- Checks do GitHub verdes: changelog, proteção de assets, auditoria de dependências, build/fiscal e integridade de guias.
- Há 24 threads de review ainda abertas. Duas observações parecem já ter sido corrigidas no código atual — nome/e-mail do cliente e exibição de localização/link —, mas 22 continuam reproduzíveis ou exigem resposta técnica.
- O GitGuardian marcou um “Generic Password” num commit anterior. A ocorrência estava num fixture de teste com valores como `segredo`/`abc`, e os valores já foram removidos do head. Parece falso positivo, não credencial real, mas o incidente deve ser explicitamente encerrado como falso positivo antes do merge.

### Vercel

- Deployment `READY`, framework Next.js, ligado ao mesmo SHA do PR.
- Next.js `16.3.0`, Vercel CLI `58.9.5`, Node `24.x`, região `iad1`.
- Compilação em cerca de 32 s; TypeScript em 4,5 s; 278 páginas estáticas em 10,8 s; build total próximo de 60 s.
- O cache do build chegou a cerca de 757 MB; vale acompanhar o crescimento e o que está sendo incluído no cache.
- O campo `memory` do `vercel.json` foi ignorado porque o projeto usa Active CPU billing.
- `NEXT_PUBLIC_APP_URL` aponta para `https://recibocerto.pt`, enquanto o canónico usado pela aplicação é `https://www.recibocerto.pt`. Isso pode quebrar ou fragmentar callbacks de OAuth, pagamentos e canonicalização.
- No resumo de runtime observado, houve 85 respostas `200`, uma `204`, uma `304` e uma `307`.
- Os logs também registaram falha anterior em `/api/admin/contabilistas` por ausência de `public.contabilista_pedidos`.

### O “verde” atual não é suficiente

O pipeline executa TypeScript, testes unitários, checks internos, build, smoke test e `npm audit`. Isso é positivo, mas não valida as novas regras de autorização:

- existem cerca de 114 casos unitários nas suites `contabilistas-*.test.ts`;
- existem aproximadamente 119 assertions SQL de RLS;
- porém o CI **não executa** `npm run rls:check` nem `scripts/testar-rls.sh`;
- não há Playwright/Cypress equivalente, axe ou fluxo browser end-to-end nos workflows analisados;
- vários testes de “experiência” verificam strings e ligações de componentes no source, não o comportamento real de dois modais, foco, rede ou banco;
- o teste de fidelidade chama a função depois de `RESET ROLE`, como superuser PostgreSQL, e por isso não detecta a ausência de permissão para `service_role`.

Em resumo: o CI comprova que o código compila e que funções puras se comportam conforme esperado. Ainda não comprova que um cliente A não consegue afetar o cliente B, que uma suspensão corta acesso, ou que o fluxo completo funciona numa base limpa.

## 5. Auditoria do produto em runtime

### `/contabilistas`

Pontos positivos:

- hero limpo, marca coerente e hierarquia textual compreensível;
- navegação, `main`, `header` e `footer` presentes;
- 41 controlos analisados, todos com nome acessível;
- nenhum overflow horizontal no viewport de 1363 × 936;
- o idioma e a cópia estão adequados a pt-PT.

Bloqueio:

> `Could not find the table 'public.contabilistas' in the schema cache`

A página pública mais importante do novo produto não lista nenhum contabilista. O erro de infraestrutura é exposto diretamente ao utilizador, em inglês e com detalhe de implementação.

### `/contabilistas/candidatura`

- A estrutura pública carrega e os controlos têm nomes acessíveis.
- O título aparece com marca duplicada: `… | Recibo Certo | Recibo Certo`.
- O conteúdo é um hero e um cartão de registo isolado, seguido de muito espaço vazio.
- A página apresenta o pedido de autenticação, mas ainda não mostra suficientemente o valor, o processo, requisitos, prazo de análise, privacidade ou uma prévia do painel.

### `/contabilista`

- Para utilizador anónimo, aparece apenas um cartão central “Entra na tua conta”.
- Há somente um controlo e praticamente todo o viewport fica vazio.
- Não foram encontrados `main`, `nav`, `header` ou `footer` nessa tela.
- O título é o título genérico da homepage, não um título específico da área de contabilistas.

É um estado funcionalmente correto, mas visualmente parece uma barreira técnica, não uma porta de entrada para um produto premium.

### `/dashboard/contabilista`

- A shell existente do dashboard carrega, com navegação e controlos nomeados.
- Para o estado sem sessão, o conteúdo é novamente um cartão vazio/isolado.
- O título também é genérico.

### Console

Foi observado duas vezes o erro minificado React `#418`, compatível com hydration mismatch. Como o browser de auditoria também injeta uma extensão, é necessário reproduzir num browser limpo antes de classificar a origem como 100% da aplicação. Houve ainda um aviso do Google GSI sobre migração para FedCM, que não é bloqueador deste PR, mas merece entrar no backlog.

## 6. Diagnóstico de design

### O que já funciona

- A marca tem personalidade: creme, tinta escura, verde, superfícies suaves e cantos arredondados.
- A linguagem visual é calma e apropriada para um produto financeiro que precisa transmitir segurança.
- A cópia é simples, localizada e, em geral, orientada à ação.
- Há preocupação real com loading, vazio, erro, foco e alvos tácteis.
- A visão interna de “Hoje” combina próxima consulta, ações pendentes e lista futura.
- A agenda já contempla visões semanal e mensal.
- O quadro de trabalho tem estados, etapas, etiquetas e datas.
- A ficha de cliente aproxima conversas, consultas, partilhas e fidelidade — uma boa decisão de produto.

### Por que ainda parece simples

#### 1. A gramática visual ainda é de site institucional

As páginas usam o padrão `max-width + hero + cartões brancos arredondados + grande respiro`. Isso funciona numa landing page, mas não comunica um sistema operacional. Nas referências, o utilizador vê imediatamente calendário, eventos, pessoas, progresso e prioridades.

#### 2. Quase todas as superfícies têm o mesmo peso

O mesmo raio, fundo, borda e sombra aparece em painéis principais, linhas, cartões, estados vazios e ações. Quando tudo é “um cartão bonito”, nada diz o que é principal, secundário, interativo, urgente ou contextual.

#### 3. Baixa densidade informacional

Há bastante espaço, mas poucos sinais úteis por viewport. As referências são densas sem parecer caóticas: datas, avatar, duração, local, progresso, estado e ações ficam visíveis numa leitura rápida.

#### 4. Falta identidade humana

A listagem pública observada tem zero imagens. Também faltam avatares/monogramas, selo OCC, especialidades, disponibilidade, resposta média, modalidade e sinais de confiança. O produto conecta pessoas; a interface ainda trata os participantes como registos abstratos.

#### 5. Cores não carregam significado suficiente

O verde da marca é usado como identidade e ação, mas o sistema precisa de uma paleta semântica consistente: confirmado, pendente, cancelado, vencido, online, risco, administrativo. As referências usam cor para comprimir informação, não apenas decorar.

#### 6. A navegação do contabilista não parece um workspace

A navegação horizontal funciona com poucas páginas, mas o PR já introduz overview, agenda, clientes, conversas, partilhas, tarefas, fidelidade e perfil. Uma shell persistente com sidebar e barra de comando criaria muito mais presença de produto.

#### 7. Tipografia editorial em contexto operacional

A fonte display funciona bem no marketing. Em tabelas, números, agenda e cabeçalhos operacionais, ela reduz a sensação de precisão. Uma sans como DM Sans deve dominar o workspace; a fonte editorial pode ficar reservada ao hero público e a títulos raros de primeiro nível.

#### 8. O produto parece dividido em três aplicações
