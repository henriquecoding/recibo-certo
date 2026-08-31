
Há uma linguagem para páginas públicas, outra na shell antiga do cliente e outra no painel do contabilista. Essa fragmentação reduz a percepção de acabamento mesmo quando cada tela isolada é limpa.

### O que extrair das referências — sem copiar

| Referência | Princípio a reaproveitar no Recibo Certo |
|---|---|
| Tabato / bookings | Lista cronológica densa, filtros de estado, data como âncora, hora/local/pessoa numa linha |
| Calendar dashboard | Overview composto por agenda, atividade e tarefas; cada painel responde a uma pergunta diferente |
| Kanban pastel | Estados visualmente distintos, etiquetas, progresso, responsáveis e microdados dentro do cartão |
| Roadmap | Linha de “agora”, cores por domínio, progresso e detalhe contextual sob demanda |
| Medical billing/schedule | Sidebar forte, coerência entre calendário e dados financeiros, visual profissional sem excesso de ornamento |

O denominador comum não é “muito colorido”. É **informação operacional com hierarquia imediata**.

## 7. Direção visual recomendada: “Mesa Fiscal”

Não recomendo um redesign que descarte a marca atual. Recomendo evoluí-la para uma shell de produto.

### Estrutura desktop

- **Sidebar de 232–248 px:** Hoje, Agenda, Clientes, Conversas/Partilhas, Trabalho, Fidelidade e Perfil.
- **Barra superior:** pesquisa/command bar, período ou contexto atual, notificações e perfil.
- **Canvas:** fundo creme da marca; painéis principais brancos; linhas internas mais compactas e com raio menor.
- **Painel contextual opcional:** detalhe rápido de cliente, consulta ou tarefa sem perder a lista atual.

### Overview do contabilista

1. Saudação, data e ações rápidas.
2. Próxima consulta/agenda de hoje como maior bloco do primeiro viewport.
3. Pendências importantes: vínculos por decidir, partilhas novas, consultas a confirmar, tarefas vencidas.
4. Atividade de clientes e inbox compacto.
5. Quadro curto de trabalho e saúde do perfil/fidelidade.

O objetivo é responder em menos de cinco segundos:

- O que tenho hoje?
- O que está atrasado?
- Quem precisa de mim?
- Qual é a próxima ação?

### Diretório público

A ordem atual deve ser invertida. Os profissionais e filtros precisam aparecer antes dos quatro cartões explicativos.

Cada cartão de contabilista deveria ter:

- fotografia ou monograma de qualidade;
- nome, selo “OCC verificado” e localização;
- especialidades e tipos de cliente;
- presencial/online;
- próxima disponibilidade;
- preço inicial ou indicação transparente equivalente;
- estado “a aceitar novos clientes”;
- CTA “Ver perfil” e ação de vínculo/agendamento contextual.

Filtros acima da dobra: local, online, especialidade, disponibilidade e novos clientes. Os quatro benefícios podem virar uma faixa curta abaixo da primeira lista ou conteúdo editorial de suporte.

### Agenda

- Manter semana/mês, mas acrescentar um modo “Lista” inspirado na referência Tabato.
- Usar uma coluna de data forte e linhas densas com hora, cliente, modalidade, duração e estado.
- Adicionar linha de hora atual e ação contextual no próprio evento.
- Não oferecer horários indisponíveis; a interface deve receber do servidor slots já validados.

### Clientes e ficha do cliente

- Lista com avatar/monograma, estado do vínculo, próxima consulta, último contacto e número de pendências.
- Ficha com cabeçalho persistente do cliente e tabs: Visão geral, Conversa, Consultas, Partilhas, Trabalho e Fidelidade.
- Resumo lateral com contexto essencial; ações destrutivas ou de estado ficam agrupadas e explicadas.

### Trabalho

- As quatro colunas podem permanecer, mas precisam de cor semântica mais clara e cartões mais compactos.
- Mostrar vencimento, cliente, progresso por etapas e bloqueio no primeiro nível.
- Em mobile, usar tabs de estados; no desktop, kanban completo.

### Estados sem sessão e vazios

Trocar o cartão solitário por uma composição dividida:

- à esquerda, benefício e explicação curta;
- à direita, preview realista do produto ou lista de capacidades;
- CTA principal, alternativa e informação de privacidade/confiança.

### Sistema visual proposto

- Verde: confirmado/concluído e ação principal.
- Âmbar: pendente/aguarda cliente.
- Coral/vermelho: cancelado, vencido ou risco.
- Azul: online, informação e comunicação.
- Violeta: configuração/administrativo.
- Raio 28–32 px apenas em painéis de primeiro nível; 12–16 px em cartões/linhas; 8–10 px em tags.
- Sombras discretas somente para elevação real: menu, modal, painel lateral e item em drag.
- DM Sans na interface operacional; fonte display reservada à comunicação editorial.

Todas as combinações precisam ser validadas em WCAG, inclusive estados hover, focus, disabled e texto sobre chips pastel.

## 8. Funcionalidades: estado real

| Funcionalidade | O que existe | Estado neste commit |
|---|---|---|
| Diretório público | Página, filtros/estados e perfis | **Quebrado no preview** por schema ausente |
| Candidatura | Fluxo de entrada e aprovação administrativa | UI carrega; persistência não validável no preview; aprovação não transacional |
| Painel do contabilista | Shell, overview e navegação | Estrutura implementada; runtime autenticado não validado |
| Vínculo cliente–contabilista | Convite/pedido, aceite, recusa e término | Implementado, mas com mutações críticas permitidas por RLS |
| Agenda/disponibilidade | Regras, exceções, semana/mês e agendamentos | Boa base de domínio; invariantes podem ser contornadas via REST |
| Conversas | Mensagens, realtime e anexos | Base boa; storage e notificações precisam endurecimento |
| Partilhas/snapshots | Envio, leitura e revogação | Implementado; conteúdo/destinatário não estão suficientemente imutáveis |
| Fidelidade/cupões | Cartão, carimbo e resgate | Fluxo provável de falha por permissão/atomicidade; cupões expostos a inconsistências |
| Trabalho/tarefas | Quadro, etapas, etiquetas e datas | Implementado; escopo/suspensão precisam ser reforçados no banco |
| Tipos de consulta | Tabela/coluna na migração | **Não há UI nem integração TypeScript de produção**; não considerar concluído |
| Eliminação de conta | Rota existente ampliada parcialmente | Pode falhar e deixar dados já apagados com conta ainda ativa |

## 9. Pontos técnicos fortes

- Boa separação do domínio entre dados, agenda, vínculo, conversa, trabalho e fidelidade.
- Helpers de datas, slots e fidelidade são puros, determinísticos e bem cobertos por unit tests.
- A opção por RLS por padrão e buckets privados é a direção correta.
- A constraint GIST para impedir sobreposição de consultas fecha uma corrida que apenas validação em JavaScript não fecharia.
- O update de cupão possui guarda de estado para reduzir resgate concorrente.
- Nas rotas sensíveis de consulta/cupão, o servidor verifica utilizador autenticado e propriedade do contabilista antes de usar credencial privilegiada.
- URLs assinados de anexos têm duração curta.
- O corpo de mensagens possui trigger de imutabilidade e os canais realtime são limpos pelos componentes.
- Headers básicos de segurança estão presentes: HSTS, `nosniff`, frame policy e CORP. A CSP ainda é deliberadamente parcial.
- Loading, vazio e erro foram tratados com mais cuidado do que é comum num PR deste tamanho.

Esses pontos mostram que não é necessário recomeçar. O trabalho principal é consolidar as invariantes na camada certa e testar o sistema contra acessos adversariais.

## 10. Bloqueios de merge — P0

### P0.1 — O preview não tem as migrações do PR

**Evidência:** runtime e logs Vercel.  
**Impacto:** o diretório e o admin falham; todos os fluxos dependentes ficam sem validação real.  
**Correção:** usar uma base de preview isolada, aplicar migrações 042–045 numa base limpa, executar novamente para testar idempotência e carregar dados seed representativos. O deployment só deve ficar verde depois de um smoke test que consulta as tabelas novas.

### P0.2 — Um vínculo pode ser reatribuído a outro cliente

**Evidência:** políticas/triggers SQL.  
**Impacto:** o contabilista dono do vínculo pode manter o seu próprio `contabilista_id`, mas alterar `cliente_id`, estado, origem e dados de convite. Como mensagens são associadas ao vínculo, a reatribuição pode retirar o histórico do cliente original e torná-lo visível ao novo cliente. É um problema de isolamento cross-tenant e integridade.  
**Correção:** tornar IDs e campos de origem imutáveis no banco; permitir somente transições de estado explícitas por funções transacionais; usar `WITH CHECK` por transição; testar como cliente A, cliente B, contabilista e suspenso.

### P0.3 — Suspensão não revoga acesso aos dados

**Evidência:** políticas RLS verificam identidade, mas não o estado aprovado/ativo do contabilista.  
**Impacto:** um contabilista suspenso continua potencialmente a ler e escrever vínculos, mensagens, consultas, partilhas, fidelidade e tarefas. A UI pode esconder ações, mas REST continua disponível.  
**Correção:** centralizar uma função SQL segura do tipo `contabilista_ativo(auth.uid())` e aplicá-la a todas as políticas/rotas; adicionar testes de suspensão imediata.

### P0.4 — Partilhas podem ter conteúdo e destinatário reescritos

**Evidência:** políticas de UPDATE das partilhas.  
**Impacto:** a ação “marcar como vista” permite alterar mais colunas que o estado; a revogação do cliente também pode reescrever campos. Isso quebra o snapshot histórico e abre caminho para troca de `cliente_id`/conteúdo.  
**Correção:** triggers de imutabilidade de payload e ownership; funções específicas `marcar_partilha_vista` e `revogar_partilha`; nenhuma atualização genérica da linha.

### P0.5 — Regras de agendamento podem ser contornadas por REST

**Evidência:** RLS e caminhos de escrita direta.  
**Impacto:** um cliente pode inserir horários arbitrários sem validar disponibilidade, exceções, antecedência de 12 h ou janela de 60 dias. Updates permitem alterar IDs, horário e conteúdo enquanto se escolhe um estado permitido. O contabilista pode marcar “realizada” sem passar pelo fluxo que carimba a fidelidade. Slots ocupados não são fornecidos de forma redigida ao fluxo público, portanto a interface pode oferecer repetidamente um horário que acabará em conflito.  
**Correção:** eliminar INSERT/UPDATE genéricos para papéis públicos; criar RPC transacional de reserva que valida todas as invariantes e depende da constraint GIST; criar RPCs estreitas para cancelar, confirmar e concluir; expor disponibilidade agregada/redigida, nunca detalhes de outros clientes.

### P0.6 — Concluir consulta e carimbar fidelidade não é atómico

**Evidência:** grants SQL e rota da API.  
**Impacto:** `carimbar_consulta` é revogada de `PUBLIC`, `authenticated` e `anon`, sem grant explícito para `service_role`. A rota primeiro marca a consulta como realizada e depois tenta carimbar; se o RPC falhar, responde sucesso com fidelidade nula. A consulta fica concluída sem recompensa, e uma repetição pode ter comportamento divergente.  
**Correção:** uma única função transacional para validar, concluir, carimbar e eventualmente emitir cupão; grant mínimo ao papel utilizado pelo servidor; erro deve reverter toda a operação.

### P0.7 — Eliminação de conta pode deixar estado parcialmente destruído

**Evidência:** rota `/api/conta/apagar`, FKs e ordem das operações.  
**Impacto:** consultas e autor de mensagens usam restrições que podem impedir a remoção do utilizador. A rota apaga outros dados antes de tentar remover a conta Auth; se a última etapa falhar, o utilizador continua ativo com dados já removidos. A mensagem “Nada foi perdido” pode ser falsa.  
**Correção:** desenhar estratégia explícita de retenção/anónimização; executar operações relacionais de forma transacional; só comunicar sucesso depois de todas as etapas; tornar retry idempotente; testar contas com mensagens, consultas, vínculo, partilhas, fidelidade e candidatura.

### P0.8 — As políticas RLS críticas não rodam no CI

**Evidência:** workflows GitHub.  
**Impacto:** 119 assertions de segurança existem, mas não protegem o merge. Mesmo quando executadas, precisam de casos adversariais de mutação de colunas e papéis reais.  
**Correção:** subir Postgres/Supabase efémero, aplicar migrações do zero, executar RLS com `anon`, `authenticated`, `service_role` e perfis de domínio; falhar o PR em qualquer regressão.

## 11. Problemas de alta prioridade — P1
