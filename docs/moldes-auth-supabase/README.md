# Moldes de autenticação da Supabase

Gerados por `npm run auth:moldes`. **Não editar à mão** — a fonte é
`src/lib/email/auth-supabase.ts`, que partilha o layout com os restantes
emails do produto.

Colar em **Authentication → Emails**, no painel da Supabase, um a um.

| Molde no painel | Assunto | Ficheiro |
|---|---|---|
| Confirm signup | Confirma o teu email — Recibo Certo | `01-confirmar-registo.html` |
| Reset password | Definir uma palavra-passe nova — Recibo Certo | `02-recuperar-palavra-passe.html` |
| Magic Link | O teu link de entrada — Recibo Certo | `03-link-magico.html` |
| Change Email Address | Confirma o teu email novo — Recibo Certo | `04-mudar-email.html` |
| Invite user | Foste convidado para o Recibo Certo | `05-convite.html` |
| Reauthentication | O teu código de confirmação — Recibo Certo | `06-reautenticacao.html` |
