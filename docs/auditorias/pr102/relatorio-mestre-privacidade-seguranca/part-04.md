auth.uid() = contabilista.user_id
AND contabilista.estado = 'aprovado'
AND vinculo.estado = 'ativo'
AND recurso pertence ao mesmo vínculo
```

Suspender deve ser transacional: mudar estado, bloquear novas sessões/ações, revogar URLs/capacidades possíveis, terminar ou congelar relações segundo regra, emitir outbox/auditoria e notificar partes. Access tokens já emitidos só deixam de ser suficientes porque RLS relê o estado a cada pedido. Testar com token obtido **antes** da suspensão.

### PR-03 — P0 Crítico: limites de anexos existem na UI/metadata, não no Storage

Os buckets são criados sem `file_size_limit` e `allowed_mime_types`. As políticas de `storage.objects` permitem upload direto por parte ativa para o prefixo do vínculo. O limite de 10 MB, o máximo de cinco e o CHECK na tabela de metadata não impedem enviar objetos gigantes, tipos diferentes ou milhares de objetos sem criar a linha de metadata.

O mesmo se aplica, com variantes, aos documentos de candidatura: validação de 5 MB/MIME no cliente é contornável. `Content-Type` fornecido pelo cliente não prova o formato. O limite “5 anexos por mensagem” baseado em `count(*)` pode sofrer corrida.

**Correção obrigatória:**

- `file_size_limit` e `allowed_mime_types` no bucket como defesa base ([limites de buckets](https://supabase.com/docs/guides/storage/uploads/file-limits));
- retirar upload aberto por prefixo; emitir upload slot server-side, curto, single-use e ligado a vínculo/mensagem;
- filename gerado, extensão allowlisted, nome original apenas metadata sanitizada;
- validar magic bytes e estrutura, não só MIME/extensão;
- quarentena, antivírus e CDR quando aplicável; nunca servir conteúdo ativo inline;
- `Content-Disposition: attachment`, `nosniff`, domínio de downloads isolado;
- quota por utilizador/vínculo/dia e rate limit distribuído;
- slot ordinal único 1..5 ou RPC serializada, não `count` sem lock;
- job que compara `storage.objects` e metadata, eliminando órfãos após grace period.

O OWASP recomenda allowlist de extensões/tipos, validação de assinatura, nome gerado, limites, autorização, armazenamento separado e análise de conteúdo ([File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)).

### PR-04 — P0 Crítico: relação/consulta podem ter identidade e conteúdo reescritos

As políticas de update permitem à parte que muda estado alterar também `cliente_id`, `contabilista_id`, origem, timestamps, nome/contacto e, em consultas, horas, assunto e ownership. O trigger de 043 permite ao contabilista passar por certos updates sem perguntas, mas não implementa uma máquina de estados/colunas segura.

**Correção:** retirar `UPDATE` genérico; RPCs por comando (`accept_link`, `reject_link`, `cancel_appointment`, `reschedule_appointment`) com precondição de estado e `UPDATE ... WHERE estado = expected RETURNING`; triggers congelam identidades e `created_at`; grants de update por coluna apenas quando inevitável. Testar TOCTOU e dois pedidos simultâneos.

### PR-05 — P1 Alto: sanitização da partilha é client-side, superficial e não mostra tudo

`sanitizarConteudoPartilha` aplica allowlist apenas no topo. Campos permitidos como `entradas`, `resultado`, `cenarios` e `notas` aceitam JSON aninhado arbitrário. A UI representa objetos como “—” e arrays por contagem, logo a pessoa não vê “campo a campo” o payload real. A DB exige apenas consentimento não vazio; não impõe schema, byte limit ou quota. A constante de 20 partilhas/dia não está aplicada server-side.

**Correção:** endpoint/RPC server-only, schemas estritos e recursivos por tipo/versão, `additionalProperties:false`, limite em bytes/profundidade/elementos, seleção recursiva e preview JSON/PDF exato. Consentimento guarda schema version, campos escolhidos, hash e finalidade. O botão confirma contabilista, prazo, download e revogação. Testar chamadas diretas com chaves invisíveis, Unicode, arrays profundos e payload gigante. O OWASP recomenda validação sintática e semântica com allowlists no servidor ([Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)).

### PR-06 — P1 Alto: suspensão/terminação não define retenção nem direitos

Terminar vínculo fecha acesso, mas mensagens e anexos permanecem sem prazo e as partes deixam de ter mecanismo claro de exportar/eliminar. Tarefas podem ficar com `vinculo_id = NULL`, conservando título/descrição potencialmente pessoal de forma indefinida. É necessário definir papéis de responsável/subcontratante, finalidade, prazo por recurso, direitos e obrigação do contabilista.

Default recomendado: snapshots expiram em 7/30 dias configuráveis; anexos de conversa em 30/90 dias após vínculo, salvo obrigação indicada; mensagens com prazo definido; documentos de candidatura apagados após decisão + janela de recurso; metadados mínimos de auditoria separados e mais longos apenas com fundamento.

### PR-07 — P1 Alto: eliminação de conta pode falhar e objetos ficam órfãos

O upload acontece antes do insert de metadata; se o insert falhar, fica objeto. Cascades no Postgres não eliminam bytes de Storage. A rota de eliminação existente desconhece as 19 novas tabelas/buckets, e FKs `RESTRICT` podem impedir `auth.users` delete.

**Correção:** manifesto e deletion workflow descritos no RC-08; upload transaction pattern (pending object → metadata → promote/activate); compensação imediata em erro; reconciliação periódica; testes de falha em cada ponto. Nunca apagar `storage.objects` diretamente via SQL.

### PR-08 — P1 Alto: motivo de exceção de agenda é público pela API

A policy permite `anon SELECT` da linha de exceção, que inclui `motivo`. Esconder no componente não é controlo. Criar view pública apenas com `contabilista_id`, intervalo e disponibilidade, usando `security_invoker`/grants adequados, ou separar o motivo numa tabela privada. Testar a chave anon diretamente.

### PR-09 — P1 Alto: endpoint genérico de avisos permite notificações enganadoras

`/api/contabilistas/avisar` aceita uma parte do vínculo e um tipo de evento escolhido pelo caller, depois usa service role para criar aviso/email, sem provar que a consulta/cupão/ação correspondente ocorreu. Uma parte pode enviar “cupão ganho” ou “consulta confirmada” falsos e causar spam/confusão.

**Correção:** eliminar endpoint genérico. Eventos nascem atomicamente da transação de domínio, através de outbox (`appointment_confirmed`, `coupon_earned`), com idempotency key, dedupe, destinatário derivado, URL role-safe e retry. Rate limit não corrige falta de causalidade.

### PR-10 — P1 Alto: conteúdo/timestamps de mensagens e notificações ainda são mutáveis

O trigger de mensagens protege autor/corpo/vínculo, mas permite manipular `criado_em` e recibo de leitura não monotónico. A policy de notificações deixa o destinatário alterar tipo, título, corpo, URL e criação, além de `lida_em`.

**Correção:** conteúdo e criação append-only; leitura apenas `NULL → now()` por RPC/trigger; nunca voltar a NULL; servidor cria notificações; cliente tem apenas comando mark-read. Testes coluna a coluna.

### PR-11 — P1 Alto: aprovação/suspensão admin não é transacional e publicação é implícita

A rota admin faz múltiplas escritas e depois auditoria best-effort. Falha intermédia pode criar estados incoerentes ou ação sem trilho. Email da candidatura é copiado para perfil público na aprovação sem um preview/consentimento explícito de publicação claramente separado.

**Correção:** função transacional server-side; application privada separada de public profile; candidato escolhe e pré-visualiza campos públicos; verificação de credenciais e retenção de documentos; dual control para decisões de risco, se proporcional; auditoria atómica.

### PR-12 — P1 Alto: transições de consulta são vulneráveis a corrida/TOCTOU

A rota relê estado, decide e atualiza depois, sem condicionar o `UPDATE` ao estado anterior. Dois pedidos concorrentes podem sobrescrever cancelamento/confirmação. O cupão aceita `appointmentId` sem prova suficiente de que pertence à combinação cliente/contabilista/cupão.

**Correção:** máquina de estados formal e update condicional em transação; constraints de pertença e idempotency; retorno 409 em conflito; testes concorrentes.

### PR-13 — P1 Alto: email assíncrono fire-and-forget não é confiável

Chamadas `void porEmail` podem ser terminadas pelo runtime serverless depois da resposta; falhas não ficam num workflow retentável. Migrar para outbox/queue com estado, retry exponencial, idempotência e opt-outs apropriados. Não colocar informação fiscal no assunto ou preview do email.

### PR-14 — P1 Alto: a política de privacidade alterada pela PR continua incorreta

Problemas específicos:

- diz que a plataforma não cria dados sem ação da pessoa, mas outra parte e o sistema criam mensagens/notificações;
- diz que administração não acede a ficheiros, ignorando service role/operação/backups;
- anuncia 10 MB/5 anexos, não imposto no Storage;
- diz que o contabilista não vê dados fiscais, embora snapshots, mensagens e anexos possam conter dados fiscais; a verdade é “sem acesso automático/live aos stores; apenas ao que for explicitamente partilhado”;
- o resumo “gratuito = local” deixa de ser verdadeiro, porque utilizadores gratuitos podem usar relações/mensagens/agenda cloud;
- tabela de retenção não inclui candidatura, documentos, mensagens, anexos, partilhas, consultas, tarefas, loyalty e notificações.

### PR-15 — P1 Alto: testes RLS existem, mas não são CI obrigatório nem cobrem os ataques críticos

O script [`scripts/testar-rls.sh`](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/scripts/testar-rls.sh) e a suite SQL são úteis, mas os workflows verdes observados executam build/testes/npm audit/assets/changelog/guias — não `npm run rls:check`. A `main` não está protegida, logo checks não são barreira de merge.

Adicionar job obrigatório com Supabase/Postgres limpo e migrations completas, incluindo:

- token de contabilista obtido antes de suspensão;
- alteração de cada coluna em partilha/vínculo/consulta/notificação;
- anon a ler motivo privado;
- JSON aninhado/oversized pela API direta;
- upload direto sem metadata, MIME falso, tamanho/quantidade excessivos;
- duas operações concorrentes;
- eliminação de conta com relações/consultas/anexos;
- verificação de objetos órfãos;
- funções definer com IDs de terceiros;
- instalação limpa com grants explícitos.

Branch protection: review obrigatório por CODEOWNER para migrations/RLS/auth/Storage/política; status checks obrigatórios; dismiss stale approvals; bloquear force-push/delete; ambiente de produção com aprovação e migrations forward-only.

---

## 13. Registo priorizado de risco

| ID | Severidade | Título | Bloqueia merge/release? |
|---|---:|---|---:|
| RC-01 | P0 | Migração fiscal silenciosa e cruzada | Sim |
| RC-02 | P0 | Eliminação local falsa/incompleta | Sim |
| RC-08 | P0 | Eliminação de conta incompleta/não atómica | Sim para promessa; sim para PR #102 |
| RC-13 | P0 | Admin lê `preferencias_fiscais` em `profiles` | Sim |
| PR-01 | P0 | Partilhas “imutáveis” mutáveis | Sim |
| PR-02 | P0 | Contabilista suspenso mantém acesso | Sim |
| PR-03 | P0 | Upload direto contorna limites/metadata | Sim |
| PR-04 | P0 | Identidade/ownership reescrevíveis | Sim |
| RC-03/04/05/07 | P1 | Destino implícito, fila/draft/sessão local | Sim antes de reafirmar local-first |
| RC-10/11/12 | P1 | Retenção, contradição e portabilidade | Sim para política final |
| RC-14–17 | P1 | Operadores, auditoria, grants, definer | Sim para PR #102 |
| RC-18–21 | P1/P2 | CSP, geolocalização, mapas, sessão | CSP sim; restantes conforme feature |
| RC-22–26 | P1/P2 | Analytics pseudónimo, schema, retenção/logs | Sim para texto “anónimo” |
| RC-27–30 | P1 | Terceiros e afirmações incorretas | Sim para publicação da política |
| PR-05–15 | P1 | Partilha, retenção, avisos, integridade, CI | Sim para PR #102 |
| RC-06 | P2 | Store legado | Não isoladamente; corrigir em hardening |

**Definição:** P0 = exposição/violação direta e plausível de promessa ou fronteira de autorização; P1 = alto impacto ou controlo essencial ausente; P2 = hardening/redução de dívida que pode amplificar regressões.

---

## 14. Plano de correção executável

### Fase 0 — contenção imediata (0–72 horas)

1. Retirar/qualificar afirmações absolutas na página, importador e marketing.
2. Desativar migração automática de `preferencias_fiscais`; preservar dados locais sem os enviar.
3. Corrigir a Zona de Risco com manifesto central e cobrir todas as chaves atuais/legadas.
4. Separar `preferencias_fiscais` de `profiles` ou bloquear realmente acesso administrativo à coluna.
5. Marcar PR #102 como não pronta para merge até P0 resolvidos; não é necessário apagar trabalho.
6. Desativar uploads/partilhas da PR em produção por feature flag server-side caso já exista preview público.
7. Inventariar/configurar logs para não captar bodies/queries sensíveis.

### Fase 1 — bloqueadores da PR e verdade operacional (primeira semana)

1. Refatorar partilha para snapshot imutável + estado; schema server-side recursivo.
2. Aplicar estado aprovado em todas as policies e testar token pré-suspensão.
3. Implementar RPCs/máquinas de estado para vínculo, consulta, leitura e notificações.
4. Fechar Storage direto; limits, upload slots, magic-byte, quarentena e reconciliação.
5. Workflow de eliminação abrangendo DB, Storage, Auth e pagamentos; tratar FKs.
6. Outbox transacional para emails/avisos/auditoria.
7. Grants explícitos e funções definer privadas.
8. Executar RLS/Storage tests em CI obrigatório e proteger `main`.

### Fase 2 — segurança do browser e minimização (2–4 semanas)

1. CSP Report-Only → nonce/strict-dynamic → enforcement; Trusted Types faseado.
2. Central de Privacidade e Segurança; destino por dataset e presets.
3. Namespacing/cifra/TTL local; fila de sync visível.
4. MFA/AAL2 e gestão de sessões/dispositivos.
5. Analytics com schemas fechados, retenção executada e terminologia correta.
6. Mapas privacy-first e vendor registry automatizado.
7. Exportação local de documentos quando viável; egress guard central.

### Fase 3 — assurance contínua (30–90 dias)

1. AIPD/DPIA para dados fiscais, partilhas profissionais, perfis e monitorização; rever com DPO/jurista.
2. Pentest independente focado em Supabase RLS/Storage, XSS, IDOR e account deletion.
3. Threat model versionado e revisão em cada feature de egress/dataset.
4. Runbooks de incidente, rotação de chaves, backup restore + tombstones, pedidos de titular.
