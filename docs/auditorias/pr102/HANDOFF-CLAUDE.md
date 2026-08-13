# Handoff — continuação exata do Work sobre a PR #102

## Objetivo

Continuar **exatamente** o trabalho iniciado no chat “Análise de Pull Request” sobre `henriquecoding/recibo-certo` PR #102, sem reiniciar a análise, sem misturar com o trabalho de planos/Stripe da PR #104 e **sem fazer merge na `main`**.

## Git / isolamento

- PR original: `#102 — Plataforma de contabilistas: agenda, clientes, partilhas e fidelidade`
- Base de trabalho auditada: `claude/continue-interrupted-pr-73s7hi` @ `99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8`
- PR de continuação: `#103 — WIP: hardening integral e redesign da plataforma de contabilistas`
- Head de continuação: `agent/pr102-hardening-workspace`
- A PR #103 aponta para a branch da PR #102, **não** para `main`. Manter assim.
- Não fazer merge na `main` e não publicar/deployar em produção sem autorização explícita posterior.

## Estado em que o Work parou

O painel de progresso do chat mostrava:

- [x] Materializar a PR #102 e inventariar código, relatório e referências visuais.
- [~] **Endurecer schema, RLS, RPCs, Storage e privilégios no Supabase.** ← continuar daqui.
- [ ] Integrar catálogo de dados, preferências de privacidade, retenção e eliminação durável.
- [ ] Endurecer APIs, autenticação, notificações, pagamentos, analytics e fusos horários.
- [ ] Redesenhar áreas pública e autenticada com paridade claro/escuro e responsividade.
- [ ] Ampliar testes, CI, acessibilidade e regressão visual.
- [ ] Executar ciclos de build, testes, browser e preview Vercel até estabilizar.
- [ ] Publicar somente nesta branch e finalizar a PR contra a PR #102, sem merge na `main`.

Importante: no GitHub, antes deste handoff, a branch preservava apenas o workflow de snapshot; portanto não assumir que correções de código não commitadas no Work chegaram ao repositório. O material analítico, as decisões e o ponto de continuação foram recuperados e versionados aqui para impedir nova perda de contexto.

## Documentos vinculativos recuperados do Work

1. `docs/auditorias/pr102/auditoria-profunda-pr102/` — auditoria profunda da PR #102, incluindo P0/P1/P2, diagnóstico visual “Mesa Fiscal”, runtime, CI, Vercel e gate de merge.
2. `docs/auditorias/pr102/relatorio-mestre-privacidade-seguranca/` — relatório mestre de privacidade/segurança/persistência que o utilizador pediu explicitamente para incorporar neste trabalho.

Os relatórios foram divididos apenas por limite operacional de transferência. **Concatenar `part-01.md`, `part-02.md`, ... em ordem reconstrói byte a byte o ficheiro original.** Os hashes SHA-256 estão no README de cada relatório. Não resumir nem substituir estes documentos por este handoff.

## Requisitos de execução — segurança e dados

A implementação deve começar pelos bloqueadores P0 e transformar invariantes em garantias de banco/servidor, não em convenções de UI. Em particular:

- aplicar/migrar 042–045 num ambiente isolado e reproduzível; testar instalação limpa e idempotência;
- impedir reatribuição cross-tenant de vínculos e tornar ownership/origem imutáveis;
- contabilista suspenso perde imediatamente leitura e escrita;
- snapshots/partilhas ficam imutáveis salvo RPCs estreitas de “vista” e “revogar”;
- reserva/cancelamento/confirmação/conclusão passam por RPCs transacionais;
- conclusão + fidelidade/cupão é uma única transação atómica;
- aprovação administrativa + auditoria deve ser transacional;
- Storage deve impor tipo/tamanho/ownership e ter limpeza de órfãos;
- notificações devem nascer de eventos autoritativos, não de endpoint genérico forjável;
- `rls:check`/testes SQL reais entram no CI com papéis efetivos e casos adversariais;
- grants devem ser explícitos e mínimos; helpers `SECURITY DEFINER` internos não devem virar oráculos públicos.

## Privacidade, retenção e “Zona de perigo”

O relatório mestre de privacidade é parte do escopo, não backlog separado. Implementar uma taxonomia/manifesto único de datasets que alimente inventário, destino, retenção, exportação, sincronização e eliminação.

A **Zona de perigo deve ser configurável e granular**, permitindo escolher exatamente o que eliminar ou manter (por dataset e destino), sem desativar o baseline de segurança. Deve distinguir, no mínimo:

- recibos verdes;
- recibos de vencimento;
- cenários;
- preferências/perfil fiscal;
- drafts;
- prazos;
- caches calculados;
- filas offline;
- partilhas;
- mensagens/anexos;
- agenda/vínculos/fidelidade/tarefas da plataforma de contabilistas;
- Storage físico;
- conta/Auth;
- dados sujeitos a retenção legal.

Não inferir “cloud” a partir do plano como se fosse consentimento. Destino (`memory/session/device/cloud`) e subscrição são estados distintos. Nenhuma migração local→cloud silenciosa.

## Design / UX

Preservar a identidade calma do ReciboCerto, mas evoluir as áreas operacionais para a direção **“Mesa Fiscal”** definida na auditoria. Não resolver a simplicidade com decoração. Priorizar hierarquia, densidade útil, contexto, pessoas, estados semânticos e navegação persistente.

Ordem visual recomendada após segurança funcional:

1. Overview/Hoje;
2. Agenda;
3. Diretório público;
4. Clientes/ficha;
5. Trabalho;
6. estados sem sessão/vazios;
7. restante shell.

Modo claro e escuro têm **peso igual**. Validar ambos em mobile e desktop, não tratar dark mode como ajuste final.

## Testes/gates obrigatórios

Antes de considerar a PR pronta:

- migrações limpas + reaplicação;
- seed com admin, contabilista aprovado, suspenso, candidato, clientes A/B, múltiplos vínculos e dados representativos;
- testes RLS/REST adversariais de ownership e colunas imutáveis;
- E2E candidatura → aprovação → vínculo → conversa/anexo → agenda → consulta → fidelidade/cupão → término/suspensão → eliminação;
- corridas simultâneas de agendamento e resgate;
- Lisboa e Açores em mudança de DST;
- matriz visual 360/390/768/1024/desktop, claro/escuro;
- axe, teclado, focus traps, zero overflow e zero erros de console;
- browser limpo para reproduzir/encerrar hydration mismatch;
- threads de review resolvidas/respondidas com evidência;
- build, typecheck, unit/integration/E2E/RLS/security/audit todos verdes;
- preview Vercel funcional com schema realmente aplicado.

## Regra de continuidade

Não repetir a auditoria desde zero. Ler os documentos recuperados, verificar o estado atual da branch e começar pelo primeiro item ainda não satisfeito do gate. Fazer mudanças em ciclos pequenos, com teste de regressão associado, mantendo a PR #103 em draft até todos os gates ficarem verdes.
