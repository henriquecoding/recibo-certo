
### Integridade e autorização

1. **Término de vínculo não cumpre a promessa da UI.** A interface diz que consultas futuras serão canceladas, mas a camada de dados apenas termina o vínculo. As consultas continuam e podem bloquear horários. O contabilista também consegue reabrir o vínculo diretamente.
2. **Disponibilidade é salva com “delete all + insert”.** Uma falha depois do delete remove toda a agenda. Usar RPC transacional/upsert versionado.
3. **Motivo de exceção fica público.** O comentário sugere ocupação redigida, mas a política expõe a linha inteira, incluindo `motivo`, a utilizadores anónimos.
4. **Notificações são forjáveis.** Um participante autenticado pode enviar qualquer `tipo` para um vínculo ao qual pertence; o servidor não prova o evento nem o papel do emissor. Isso permite e-mails falsos de “aceite”, “consulta confirmada” ou “cupão ganho”. Notificações devem nascer da mutação autoritativa no servidor/banco, não de um endpoint genérico acionado pelo cliente.
5. **Cobertura funcional de notificações está incompleta.** Pedido de consulta, cancelamento pelo cliente, partilha recebida e decisão de candidatura não possuem chamadas de produção completas. O link do e-mail aponta sempre para `/dashboard/contabilista`, inclusive para destinatários que deveriam ir ao painel do contabilista.
6. **Rate limit em memória não é global.** Cold starts e instâncias paralelas da Vercel contornam o limite, especialmente em tentativa de cupões e spam de notificações. Usar armazenamento durável, regra de firewall ou limite atómico no banco.
7. **Aprovação administrativa não é transacional.** Criar/reativar contabilista, atualizar candidatura e escrever auditoria são etapas separadas. Falhas criam estados divergentes e a auditoria pode ser perdida. A reativação também não atualiza todos os campos derivados.
8. **Identidade verificada continua editável.** Depois da aprovação, nome e número OCC podem ser alterados pelo próprio profissional, enquanto o diretório comunica certificação. Separar campos verificados de campos editáveis; mudanças verificadas exigem nova revisão.
9. **Notificação marcada como lida permite reescrever conteúdo.** O owner pode atualizar título, corpo, URL e tipo, quando deveria alterar apenas timestamp/estado de leitura.
10. **Tarefas aceitam vínculo arbitrário.** O FK garante existência, mas não que o vínculo pertença ao mesmo contabilista; as políticas também não bloqueiam suspensos.

### Storage e anexos

11. **Limites de ficheiro estão apenas no cliente/metadados.** O utilizador pode fazer upload direto de objeto grande ou MIME arbitrário e nunca criar a linha de metadados. Isso produz custo, lixo e bypass de política funcional.
12. **Anexos de conversa não têm política de delete apropriada.** Uploads falhados ou removidos na UI podem permanecer no bucket.
13. **Documentos de candidatura têm o mesmo problema.** O limite de cinco ficheiros/5 MB é de UI; o bucket não impõe tamanho/MIME e o upload ocorre antes da candidatura, criando órfãos.
14. **O limite de cinco anexos pode sofrer corrida.** `count(*)` sem lock não impede uploads concorrentes de ultrapassarem o teto.

### Consistência funcional

15. **Hub do cliente mistura contabilistas.** O cartão principal é do vínculo atual, mas cupões, consultas e partilhas são consultados somente por cliente e exibidos sob esse contexto. Dados de um contabilista anterior/outro podem aparecer rotulados como se fossem do atual.
16. **O banco aceita vários vínculos ativos, mas a UX é singular.** `meuVinculo` escolhe o mais recente; vínculos ativos antigos ficam escondidos ou mal atribuídos. É necessário decidir a regra de produto: um contabilista ativo por cliente ou múltiplos, com seletor e escopo explícito.
17. **Cupão expirado pode aparecer disponível.** O estado persistido e a data precisam ser interpretados juntos no servidor.
18. **Resgate aceita `agendamentoId` insuficientemente validado.** É preciso provar que consulta, cliente, contabilista, momento e estado correspondem ao cupão.
19. **Tipos de consulta estão “mortos”.** A migração existe, mas não há uso TypeScript/UI de produção. Remover do escopo anunciado ou completar CRUD, associação à disponibilidade e reserva.
20. **`temContabilistaVinculado` não recebe dados em produção.** O sinal existe nos tipos/testes, mas não participa do fluxo real.

### Mobile e interação

21. **Duas navegações inferiores podem sobrepor-se.** `ChromeMobile` não exclui `/contabilista`, enquanto o painel novo desenha a própria navegação.
22. **A navegação usa seis colunas para sete itens.** Em mobile, um item cai sozinho numa segunda linha e pode cobrir conteúdo.
23. **Dois modais fogem do coordenador global.** `DetalheConsulta` e `EnviarAoContabilista` implementam `aria-modal`/focus trap próprios. Abrir uma confirmação global a partir do detalhe pode deixar dois traps e duas camadas “modais” ativas.
24. **Fuso horário fixo em Lisboa.** O produto suporta Açores, mas horários são calculados em `Europe/Lisbon`, produzindo desvio de uma hora para essa região.

## 12. Melhorias P2 — qualidade, SEO e performance

1. **Slug com base de 60 caracteres:** o sufixo de unicidade pode ser truncado, causando colisão repetida.
2. **Website do perfil não é normalizado:** `example.com` vira link relativo e esquemas não HTTP precisam ser rejeitados.
3. **Títulos duplicados:** diretório/candidatura já incluem “Recibo Certo” e o template raiz acrescenta novamente.
4. **Metadados privados genéricos:** `/contabilista` e hub usam título da homepage.
5. **Perfil público dinâmico é client-only:** SSR entrega skeleton sem H1 e metadata específica, apesar da intenção de SEO; faltam canonical e metadados por perfil.
6. **`noindex` incompleto:** cobre dashboard/admin/api, mas não toda a área privada `/contabilista`.
7. **Fetch duplicado do perfil:** layout busca o profissional e páginas chamam `usarFicha`, repetindo a consulta.
8. **Perfil público cria múltiplas ondas de rede:** consolidar dados server-side/streaming controlado.
9. **Ficha do cliente carrega conjuntos inteiros do contabilista e filtra no browser:** consultas, partilhas e cupões devem ser filtrados no servidor por cliente/vínculo, por performance e menor superfície de exposição.
10. **Mismatch apex/www:** alinhar `NEXT_PUBLIC_APP_URL`, OAuth, pagamentos, e-mails e canonical.
11. **Hydration mismatch observado:** reproduzir num browser limpo e adicionar teste sem erros de console.
12. **Cache de build elevado:** auditar dependências, outputs e cache keys antes que o crescimento afete tempo/custo.

## 13. Plano recomendado de correção

### Fase 1 — Base executável e segura

1. Criar Supabase de preview descartável por PR ou ambiente de staging isolado.
2. Aplicar todas as migrações do zero e testar reaplicação/idempotência.
3. Popular seed com: admin, contabilista aprovado, suspenso, candidato, clientes A/B, múltiplos vínculos, consultas, partilhas, mensagens, tarefas e cupões.
4. Corrigir RLS/imutabilidade de vínculo, partilha, consulta, notificação e tarefa.
5. Substituir mutações sensíveis por RPCs transacionais de escopo estreito.
6. Tornar conclusão+fidelidade, aprovação e eliminação de conta atómicas.
7. Impor limites de storage no upload e criar limpeza de órfãos.

### Fase 2 — Testes que refletem o risco real

1. Rodar testes RLS em CI com papéis reais, não apenas superuser.
2. Criar testes adversariais de REST para todas as colunas imutáveis.
3. E2E completo: candidatura → aprovação → vínculo → conversa/anexo → agenda → consulta → fidelidade/cupão → término/suspensão → eliminação.
4. Colisão simultânea de agendamento e resgate concorrente de cupão.
5. Matriz visual 360, 390, 768, 1024 e desktop; axe; teclado; zero erro de console.
6. Testar Lisboa e Açores em mudança de horário de verão.

### Fase 3 — Elevar a presença visual

1. Definir uma única shell “Mesa Fiscal”.
2. Redesenhar primeiro Overview, Agenda e Diretório — as três telas com maior impacto percebido.
3. Introduzir tokens semânticos, hierarquia de raios e tipografia operacional.
4. Acrescentar dados e identidade humana antes de acrescentar ornamento.
5. Unificar cliente e contabilista no mesmo sistema visual.
6. Criar screenshot tests dos estados críticos: loading, vazio, erro, dados reais, mobile e modal.

### Fase 4 — SEO, performance e acabamento

1. Metadata dinâmica server-side para perfis públicos.
2. `noindex` completo nas áreas privadas.
3. Eliminar fetches duplicados e filtrar por vínculo no servidor.
4. Corrigir apex/www, links externos, slugs e avisos Vercel.
5. Encerrar threads de review e o falso positivo do GitGuardian com justificativa.

## 14. Gate objetivo para liberar merge

Eu só aprovaria o merge quando todos estes itens estivessem verdadeiros:

- [ ] Preview utiliza base com migrações 042–045 aplicadas e seed funcional.
- [ ] Diretório, candidatura, admin e painel não exibem erro de schema.
- [ ] IDs de ownership e payloads históricos são imutáveis no banco.
- [ ] Contabilista suspenso perde imediatamente acesso de leitura e escrita.
- [ ] Reserva, cancelamento e conclusão passam por funções transacionais.
- [ ] Conclusão e fidelidade são uma única operação atómica.
- [ ] Término de vínculo executa exatamente o que a UI promete.
- [ ] Eliminação é consistente, idempotente e testada com todos os novos dados.
- [ ] Storage rejeita tipo/tamanho indevidos antes de persistir o objeto e limpa órfãos.
- [ ] Notificações derivam de eventos autoritativos e não podem ser forjadas pelo cliente.
- [ ] `rls:check` roda e bloqueia o CI.
- [ ] E2E cobre cliente A, cliente B, contabilista ativo, suspenso e admin.
- [ ] Mobile não possui navegação sobreposta, overflow ou duplo focus trap.
- [ ] Não há erro React/hydration num browser limpo.
- [ ] Threads de review estão resolvidas ou respondidas com evidência.

## 15. Conclusão

Este PR tem muito valor e já contém a base de um produto significativamente mais completo. O problema não é falta de ambição; é que a ambição funcional cresceu mais rápido do que o modelo de autorização, o ambiente de preview e a gramática visual.

A ordem correta agora é:

1. tornar o ambiente executável;
2. fixar as invariantes no banco;
3. provar segurança e fluxos com testes reais;
4. então elevar a interface para uma experiência de workspace.

Visualmente, a marca deve permanecer calma e confiável. O salto de qualidade não está em “enfeitar”: está em mostrar mais contexto útil, dar significado às cores, trazer pessoas e estados para a superfície, criar navegação persistente e permitir que cada tela responda rapidamente à próxima decisão do utilizador.

Com os P0 corrigidos e a direção “Mesa Fiscal” aplicada primeiro a Overview, Agenda e Diretório, o Recibo Certo pode sair de “interface limpa, porém simples” para “produto operacional, reconhecível e confiável” sem perder o que já o diferencia.
