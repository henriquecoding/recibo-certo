# O trabalho narrado no Work, que não chegou ao repositório

> **Estado: especificação por implementar.** Nada disto está em código.
>
> A sessão do Work descreveu, passo a passo, a implementação de tudo o que
> está aqui. Ao verificar o repositório, o que existe na branch
> `agent/pr102-hardening-workspace` são **1635 linhas de documentação e zero
> linhas de código** — os únicos ficheiros de `src/` ou `supabase/` que a
> branch acrescenta à PR #102 são a migração 046 e os testes adversariais,
> escritos depois, noutra sessão.
>
> Como foi verificado: procura de `file_size_limit`, `magic bytes`, `outbox`,
> `upload slot` e do wrapper de SHA-256 em **todos** os refs remotos. Todas as
> ocorrências estão em ficheiros `.md`. Nenhuma em `.ts`, `.tsx` ou `.sql`.
>
> Este documento existe para que a narração não se perca uma segunda vez. É
> suficientemente detalhada para servir de especificação; o que falta é
> executá-la e prová-la.

## Como usar

Cada item traz o que foi descrito e o que fica por provar. Nenhum se dá por
feito sem teste associado. A ordem é a do risco, não a da narração.

---

## A · Persistência e destino dos dados

### A1 — O destino deixa de ser inferido pelo plano
**Descrito:** o repositório de recibos de vencimento escolhia a nuvem
automaticamente a partir do plano, permitia três cenários gratuitos, e
declarava sucesso antes da confirmação do Supabase.
**Por fazer:** uma única amostra gratuita; destino escolhido pela pessoa
(`memory` / `session` / `device` / `cloud`); mutações atómicas — se a escrita
falhar, a interface não pode fingir que guardou.
**Prova:** teste que force falha do Supabase e confirme que a interface reporta
falha.

### A2 — Cofres isolados por utilizador, sem recuo silencioso
**Descrito:** recibos, vencimentos, cenários, perfil fiscal, rascunho de IRS e
prazos passam a respeitar o destino, isolar por utilizador e não fazer
fallback.
**Prova:** trocar de conta no mesmo browser não pode revelar dados da anterior.

### A3 — O perfil fiscal antigo só entra com confirmação explícita
**Descrito:** migração local→nuvem deixa de ser silenciosa (RC-01, P0 do
relatório mestre).

### A4 — Remover promessas de uma fila offline que já não existe
**Descrito:** mensagens antigas prometiam comportamento inexistente.

---

## B · Zona de perigo e eliminação

### B1 — Zona de perigo granular
**Descrito:** seleção «apagar/manter» por conjunto de dados, inventário local e
na nuvem, dependências entre conjuntos, manifesto do que vai acontecer,
estimativa antes de confirmar, cancelamento de cobrança, Storage, base de
dados, Auth por último, retomada por job.
**Fronteira:** a interface não pode prometer uma seletividade que o backend não
cumpre — a seleção tem de corresponder a operações SQL reais.
**Conjuntos mínimos** (do handoff): recibos verdes · recibos de vencimento ·
cenários · preferências e perfil fiscal · rascunhos · prazos · caches
calculados · filas offline · partilhas · mensagens e anexos · agenda, vínculos,
fidelidade e tarefas · Storage físico · conta/Auth · dados sob retenção legal.

### B2 — Workflow de eliminação reiniciável
**Descrito:** manifesto imutável do pedido, lease contra execução concorrente,
verificação real de que os objetos foram removidos, retomada diária,
cancelamento idempotente de Stripe e Lemon Squeezy, Auth em último, tratamento
explícito de conflitos.
**Prova:** matar o processo a meio e confirmar que a retoma acaba o trabalho
sem duplicar cancelamentos.

### B3 — Portabilidade completa
**Descrito:** pacote único com dados locais e da nuvem, consentimentos,
relações, histórico operacional e manifestos de ficheiros; exige
reautenticação/MFA; remove tokens técnicos e dados privados de terceiros.

---

## C · Storage e ficheiros (PR-03 do relatório mestre)

### C1 — Limites no próprio balde
**Por fazer:** `file_size_limit` e `allowed_mime_types` nos baldes. Hoje os
limites vivem na interface e numa restrição da tabela de metadata — nenhuma
delas impede um upload direto.

### C2 — Slots de upload server-side
**Descrito:** slots atómicos 1–5, URL assinada curta e de uso único, ligada ao
caso/mensagem. Retirar o upload aberto por prefixo.
**Nota:** o teto de cinco anexos por mensagem que existe hoje usa `count(*)`
sem lock — está sujeito a corrida. O slot ordinal resolve isso.

### C3 — Validar conteúdo, não a extensão
**Descrito:** magic bytes, hash, nome de ficheiro gerado, extensão em lista
branca, nome original só como metadata sanitizada.

### C4 — Descarregar com autorização atual
**Descrito:** autorização no momento do download, MFA para administração,
`Content-Disposition: attachment`, `nosniff`, sem cache. Sem URLs assinados
diretos na interface.

### C5 — Purga e reconciliação de órfãos
**Descrito:** apagar bytes expirados e reconciliar `storage.objects` com a
metadata, com período de graça.

---

## D · Browser, rede e terceiros

### D1 — CSP com nonce e relatório sanitizado
**Descrito:** sem guardar URLs nem payloads sensíveis no relatório.

### D2 — O mapa não fala com ninguém antes da regra escolhida
**Descrito:** nenhum tile, GeoJSON ou texto pesquisado sai do browser antes de
a pessoa escolher. (RC-20 do relatório mestre.)

### D3 — Analytics com schema fechado e duplo opt-in

### D4 — Registo obrigatório de fornecedores e destinos
**Descrito:** um controlo que falha quando aparece fornecedor ou destino
externo não declarado. É o que impede o inventário público de voltar a
divergir do código.

---

## E · SQL e infraestrutura

### E1 — `digest()` com `search_path` vazio em `SECURITY DEFINER`
**Descrito, e é o achado mais subtil de todos:** funções `SECURITY DEFINER` com
`SET search_path = ''` chamavam `digest()` sem qualificar o schema. Isso
funciona por acaso num ambiente e falha noutro, conforme o schema onde o
`pgcrypto` estiver instalado.
**Por fazer:** wrapper de SHA-256 qualificado, detetado na instalação, para que
limitação de tentativas, anonimização e eliminação não dependam de uma
configuração acidental do Supabase.
**Nota:** as migrações 042–046 desta plataforma não usam `digest()`. O achado é
sobre funções noutras partes do projeto — confirmar antes de corrigir.

### E2 — Idempotência das migrações
**Descrito:** políticas RLS recriadas sem `DROP` antes fariam a segunda
aplicação falhar.
**Estado:** as migrações 042–046 já são idempotentes e o `rls:check` aplica-as
duas vezes de propósito. Verificar as restantes.

### E3 — Remover o endpoint genérico de avisos
**Descrito:** a fronteira de segurança passou a aceitar a remoção intencional
de `/api/contabilistas/avisar`.
**Porquê:** é forjável — quem souber um id de vínculo dispara notificações. Os
avisos devem nascer de transições de estado no servidor.
**Nota:** este endpoint é meu, da Fase 3. A remoção é correta.

### E4 — Transições por RPC transacional (PR-12, P0.5)
**Descrito e por fazer:** `accept_link`, `reject_link`, `cancel_appointment`,
`reschedule_appointment`, com precondição de estado e
`UPDATE … WHERE estado = esperado RETURNING`. Testar TOCTOU e dois pedidos
simultâneos.

### E5 — Concluir consulta e carimbar numa só transação (P0.6)
**Estado:** o grant em falta já foi corrigido na migração 046. **A atomicidade
não** — a rota ainda marca «realizada» e só depois carimba.

---

## F · Testes que faltam

- upload direto ao balde, contornando as rotas → impossível;
- candidatura direta, contornando a rota → impossível;
- leitura de anexo expirado → impossível;
- fuso horário: Lisboa e Açores na mudança de hora (o teste falhava);
- corridas simultâneas de agendamento e de resgate de cupão;
- E2E completo: candidatura → aprovação → vínculo → conversa → agenda →
  consulta → fidelidade → término → eliminação.

---

## G · Design

Fica para depois da segurança funcional, e está descrito na auditoria profunda
(direção «Mesa Fiscal»). Modo claro e escuro com peso igual — validar os dois
em telemóvel e em desktop, não tratar o escuro como acerto final.
