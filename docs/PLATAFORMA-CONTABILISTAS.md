# Plataforma de contabilistas — plano de arquitetura

> Estado: em construção na branch `claude/accountant-management-platform-xvb3hy`.
> Este documento é a fonte de verdade do desenho. Se o código divergir daqui,
> um dos dois está errado — e é para isso que o documento existe.

## 1. O que se está a construir

Três superfícies novas, por cima da app que já existe:

| Superfície | Quem entra | Onde vive |
|---|---|---|
| Painel de gestão | Contabilista **aprovado** | `/contabilista/*` |
| Área do cliente | Qualquer conta | `/dashboard/contabilista` |
| Diretório público | Toda a gente | `/contabilistas`, `/contabilistas/[slug]` |
| Fila de aprovação | Só administração | `/admin/contabilistas` |

O cliente continua a usar o ReciboCerto exatamente como hoje. O que muda é que
passa a poder **ligar-se a um contabilista**, enviar-lhe uma simulação, marcar
uma consulta e acumular carimbos num cartão de fidelidade.

## 2. A fronteira de privacidade (a decisão que governa tudo)

A migração `038_admin_deixa_de_ler_dados_fiscais.sql` tornou verdadeira a frase
da página de privacidade: **«só tu acedes aos teus dados»**. Quatro políticas que
davam à administração acesso ao conteúdo fiscal de toda a gente foram removidas.

Um contabilista aprovado **não é um administrador** e não pode herdar aquilo que
nem a administração tem. Portanto:

> **O contabilista nunca lê as tabelas fiscais do cliente.**
> Lê apenas *snapshots* que o cliente enviou de propósito, um a um.

Consequências de desenho, todas obrigatórias:

1. `partilhas` guarda uma **cópia imutável** (JSONB) do que foi enviado no
   momento do envio. Não é um apontador para `recibos`, `cenarios` ou
   `recibos_vencimento`. Se fosse um apontador, ligar-se a um contabilista
   dava-lhe leitura contínua de tudo — que é precisamente o que a 038 fechou.
2. Cada partilha regista **consentimento específico** (versão + instante). O
   `MONETIZACAO_PROIBIDA` em `routing.ts` proíbe «partilhar dados antes de
   consentimento específico»; aqui isso é uma coluna `NOT NULL`, não uma promessa.
3. A partilha é **revogável**. Revogada, a RLS deixa de a devolver ao
   contabilista — sem depender de o front-end esconder o cartão.
4. Terminar o vínculo não apaga o histórico, mas fecha o acesso.

## 3. Papéis — porque não se mexe em `profiles.role`

`profiles.role` é `'user' | 'admin'` e está trancado por trigger desde a
migração `019` (foi uma escalada de privilégios real: qualquer conta se
promovia a admin). Acrescentar um terceiro valor obrigaria a mexer no trigger
que fecha essa porta, para ganhar zero.

O papel de contabilista vive numa **tabela própria**:

```
public.contabilistas
  user_id (PK → auth.users)
  estado: pendente | aprovado | recusado | suspenso
```

Ser contabilista = ter linha com `estado = 'aprovado'`. A RLS pergunta isso pela
função `public.e_contabilista_aprovado(uuid)` (`SECURITY DEFINER`,
`search_path = ''`, sem `EXECUTE` para `anon`).

**Quem aprova:** só a administração, e só pelo servidor. O cliente não tem
`UPDATE` sobre `estado` — nenhuma política lho dá. A transição é escrita com
`service_role` depois de `adminDoPedido()` validar o token, e cada decisão entra
em `admin_auditoria` (migração 040). É o mesmo padrão dos prémios do quiz
(migração `024`): *validar quem pede não chega, é preciso validar o que é escrito*.

## 4. Candidatura

Qualquer conta pode candidatar-se em `/contabilistas/candidatura`:

- texto livre de justificação;
- **credenciais protegidas** (nº de inscrição na OCC, códigos de validação) —
  campo separado, com RLS que só devolve a linha ao próprio candidato e à
  administração;
- **documentos** — Supabase Storage, bucket privado, caminho por `user_id`;
- ou simplesmente um email de contacto, se preferir tratar disso fora da app.

A administração vê a fila, abre o processo, e aprova ou recusa **com motivo**. A
recusa não apaga nada: o candidato lê o motivo e pode corrigir e reenviar.

## 5. Agenda

`contabilista_disponibilidade` descreve a semana-tipo (dia da semana, início,
fim, duração da consulta). `contabilista_excecoes` fecha dias concretos.

Os slots livres são calculados por **função pura** em
`src/lib/contabilistas/agenda.ts` — determinística e testável, sem I/O.

O duplo agendamento é impossível **por construção**, não por disciplina:

```sql
exclude using gist (
  contabilista_id with =,
  slot with &&
) where (estado in ('pedido', 'confirmado'))
```

É o mesmo mecanismo que o `alem-da-sessao` usa em `care.appointments`. Duas
pessoas a marcar o mesmo horário ao mesmo tempo: a segunda transação falha na
base de dados, não numa verificação de leitura que corre antes da escrita.

## 6. Cartão de fidelidade

Configurado pelo contabilista, dentro de limites que o schema impõe:

| Campo | Regra |
|---|---|
| `preco_consulta_cents` | > 0. O preço «original» sobre o qual o desconto incide. |
| `fidelidade_meta` | 3 a 12 consultas. |
| `fidelidade_desconto_pct` | **10 a 50** (`CHECK`). Começa em 10. |

Um carimbo por consulta **realizada**, marcada pelo contabilista. A idempotência
é estrutural: `fidelidade_carimbos` tem `UNIQUE (agendamento_id)`. Carimbar duas
vezes o mesmo agendamento viola uma restrição — não depende de o código se
lembrar de verificar.

Ao atingir a meta, o servidor emite um cupão (`fidelidade_cupoes`) e abre cartão
novo. Tudo isto numa função `SECURITY DEFINER` chamada só pelo servidor:
carimbos e cupões **nunca** são escritos pelo cliente.

### O que o cupão é, e o que não é

O cupão é um **acordo entre o cliente e o contabilista**. O ReciboCerto regista-o
e mostra-o; não cobra a consulta, não processa o pagamento e não garante o
desconto. A interface tem de dizer isto — dizer o contrário seria uma afirmação
falsa sobre dinheiro de terceiros.

## 7. Routing — o site a apontar para o contabilista

`escolherRota()` (`src/lib/routing.ts`) ganha um sinal novo,
`temContabilistaVinculado`, e um motivo novo, `contabilista_vinculado`.

A ordem passa a ser:

1. `sem_parceiro` se a confiança é `fora_de_escopo` — **inalterado**;
2. `sem_parceiro` se não há resultado — **inalterado**;
3. **`contabilista` se a pessoa já tem contabilista ligado** ← novo;
4. `contabilista` se o caso exige julgamento profissional;
5. `fiz` para execução no escopo;
6. `plus` para quem é recorrente.

O novo passo entra **depois** das duas guardas de confiança, de propósito. Um
resultado fora de escopo continua a não abrir rota nenhuma: ter contabilista não
torna um cálculo mau em conselho bom.

Entra antes da FIZ porque o contabilista da pessoa não é uma lead vendida — é
alguém que ela já escolheu.

## 8. Enviar dados nunca exige Plus

O `entitlements.ts` já tem uma regra inviolável igual para a FIZ:

> «Ligar, continuar e enviar dados para a FIZ é gratuito e nunca verifica o plano.»

O mesmo passa a valer para o contabilista: **ligar-se, partilhar uma simulação e
marcar consulta não verificam o plano**. Não há `Entitlement` novo, porque criar
um seria criar a possibilidade de o cobrar. Está coberto por teste.

## 9. Etapas

| # | Etapa | Estado |
|---|---|---|
| 1 | Plano (este documento) | ✅ |
| 2 | Domínio puro + testes | ✅ |
| 3 | Migração SQL 042 + RLS | ✅ |
| 4 | Rotas de API | ✅ |
| 5 | Painel do contabilista | ✅ |
| 6 | Área do cliente | ✅ |
| 7 | Diretório público e candidatura | ✅ |
| 8 | Aprovação por administração | ✅ |
| 9 | Routing e medição | ✅ |
| 10 | Experiência: feedback, confirmações e marcação | ✅ |
| 11 | Verificação e publicação | falta o sitemap (§11) |

## 10.1 A camada de feedback (etapa 10)

Duas peças, na raiz da app, dentro do `CoordenadorOverlays`:

- **`ui/Avisos.tsx`** — a resposta a cada ação. Aparece em baixo, acima da
  navegação de telemóvel, e o relógio para enquanto o rato ou o teclado lá
  estiverem. Erros anunciam-se com `alert`; o resto com `status`.
- **`ui/Confirmar.tsx`** — a pergunta antes do que não se desfaz, com as
  consequências escritas, o foco a começar em «Cancelar» e o teclado preso
  dentro do diálogo. É `aria-modal`, por isso disputa a vaga dos overlays com
  prioridade 95 — acima de tudo menos do consentimento de cookies. Recusada a
  vaga, responde «não»: uma promessa por resolver deixava a ação suspensa.

O que conta como irreversível, e por isso pergunta: terminar um vínculo,
revogar uma partilha, cancelar ou recusar, suspender uma conta, desligar o
cartão de fidelidade, dar um cupão por usado — e **marcar uma consulta como
realizada**, que carimba o cartão e não se descarimba.

As invariantes estão fixadas em `src/lib/__tests__/contabilistas-experiencia.test.ts`.

## 10. O que fica de fora (decisões explícitas)

- **Pagamentos da consulta.** O ReciboCerto não é intermediário financeiro entre
  cliente e contabilista. O Stripe existente é do Plus e continua a ser só isso.
- **Notas clínicas / dossiê interno do contabilista.** Fora de âmbito por agora:
  guardar conteúdo profissional sobre terceiros levanta obrigações que não estão
  resolvidas.
- **Equipas e gabinetes com vários contabilistas.** O modelo é
  um-contabilista-uma-conta. `alem-da-sessao` mostra o caminho para organizações,
  se um dia fizer falta.
- **Venda da mesma lead a vários contabilistas.** Proibido por `routing.ts`.
