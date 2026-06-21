# Supabase — ligação e operação

Runbook da integração Supabase do ReciboCerto. **Nenhuma chave deve ser
commitada.** As chaves vivem no `.env.local` (dev, ignorado pelo git) e nas
variáveis de ambiente da Vercel (produção).

---

## Estado verificado (17/06/2026)

Diagnóstico feito contra o projeto Supabase ao vivo e contra produção:

| Item | Estado |
|---|---|
| Projeto Supabase | `sxdditwefdzuqeephqiy` — ativo (`/auth/v1/health` → 200) |
| Schema (migrations 001–010) | **Aplicado** — as 11 tabelas existem |
| Produção (`www.recibocerto.pt`) | **Ligada** — env definidas na Vercel; deploy `READY` |
| Auth email/password | **Ativa** (signup aberto, autoconfirm ligado) |
| Auth Google | **Ativada e verificada** (`/authorize` → 302 → `accounts.google.com`) |
| Auth LinkedIn (OIDC) | **Ativada e verificada** (`/authorize` → 302 → `api.linkedin.com`) |
| Site URL + redirect allow-list | **Corrigidos** — ver abaixo |
| Repositório de dados | `store/recibos.ts` e `store/vencimentos.ts` em **modo duplo** (localStorage sem sessão; tabelas `recibos` / `recibos_vencimento` com sessão) |

Tabelas confirmadas: `profiles`, `recibos`, `subscriptions`, `anuncios`,
`admin_partners`, `email_waitlist`, `alertas_guardiao`, `quiz_profiles`,
`quiz_sessions`, `site_settings`, `recibos_vencimento`.

> **`recibos_vencimento`** (migration 010, aplicada 17/06/2026 via Management API):
> cenários guardados do simulador de vencimento. RLS own+admin. Tiering: grátis
> guarda até 3 cenários em localStorage; Pro sincroniza na nuvem (ilimitado).

> **Conclusão:** a app está totalmente ligada ao Supabase (auth e-mail + Google +
> LinkedIn OIDC, dados, admin, subscrições). Os três provedores de login foram
> verificados ao vivo. Não há lacunas funcionais conhecidas na auth.
>
> **Domínio canónico:** `https://www.recibocerto.pt`. O apex `recibocerto.pt`
> faz 307 para `www` (configurado na Vercel), por isso tudo no Supabase
> (Site URL, allow-list, callbacks) aponta para o `www`.

### Re-verificação 17/06/2026 (via Supabase MCP)

Confirmado contra a base de dados ao vivo:

- Projeto `sxdditwefdzuqeephqiy` — `ACTIVE_HEALTHY`, PostgreSQL 17.6, eu-west-1.
- **11 tabelas, todas com RLS ativa**: `profiles`, `recibos`, `recibos_vencimento`,
  `subscriptions`, `quiz_profiles`, `quiz_sessions`, `anuncios`, `admin_partners`,
  `email_waitlist`, `alertas_guardiao`, `site_settings`.
- Wiring do código completo (`client.ts` / `auth.tsx` / `subscription.tsx` + stores
  em modo duplo). **Não há lacunas de ligação** — só falta env local e hardening.

#### Avisos de segurança (advisors — nível WARN, **não aplicados**)

Nenhum erro crítico (nenhuma tabela exposta sem RLS). Há oportunidades de
*hardening* a ponderar — exigem DDL em produção, por isso ficam documentadas e
**não foram aplicadas**:

| Aviso | Objeto | Remediação |
|---|---|---|
| `search_path` mutável | funções `handle_new_user`, `set_atualizado_em`, `is_admin`, `criar_quiz_profile` | fixar `search_path` (`SET search_path = ''`) — [lint 0011](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) |
| `SECURITY DEFINER` executável via RPC | `handle_new_user`, `is_admin`, `criar_quiz_profile` (anon + authenticated) | `REVOKE EXECUTE` ou passar a `SECURITY INVOKER` — [lint 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) |
| Política RLS sempre verdadeira | `email_waitlist` INSERT (`qualquer_um_insere_waitlist`, `WITH CHECK (true)`) | provavelmente intencional (inscrição pública); confirmar/limitar — [lint 0024](https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy) |
| Proteção de passwords vazadas desligada | Auth | ativar (HaveIBeenPwned) — [doc](https://supabase.com/docs/guides/auth/password-security) |

> Os advisors de **performance** (índices não usados / FKs sem índice) são, na
> maioria, informativos e não foram enumerados aqui.

---

## ⚠️ Rotação de chaves (fazer primeiro)

As chaves de produção (Supabase `service_role`, Stripe `live`, Resend) foram
expostas num registo de conversa. **Roda-as** antes de qualquer outra coisa:

1. **Supabase** → Project Settings → API → *Reset* da `service_role` (e, se
   possível, das JWT). Atualiza o valor na Vercel e no `.env.local`.
2. **Stripe** → Developers → API keys → *Roll* da secret `live`. Atualiza o
   webhook secret se recriares o endpoint.
3. **Resend** → API Keys → revoga e cria nova.

A `anon` key é pública por design (vai no bundle do browser) — protegida pela
RLS; não precisa de rotação urgente, mas podes rodá-la na mesma.

---

## Variáveis de ambiente

A app usa as variáveis abaixo. **Definir na Vercel** (Project → Settings →
Environment Variables, ambiente *Production* e *Preview*) e, para dev local, no
`.env.local` (ver `.env.example` para a lista completa com Stripe/Resend/etc.).

| Variável | Onde obter | Exposta ao browser |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Sim (pública) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public | Sim (pública, RLS protege) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | **Não — secreta** |

> `NEXT_PUBLIC_*` são embebidas no build. Depois de mudar qualquer uma, é preciso
> **novo deploy** para fazer efeito.

---

## Ativar Google e LinkedIn (OAuth)

> **Estado (17/06/2026): ambos ATIVOS e verificados.** Esta secção fica como
> referência para reativar/rodar credenciais ou replicar num projeto novo.

### URL de callback (igual para os dois)
```
https://sxdditwefdzuqeephqiy.supabase.co/auth/v1/callback
```

### Google
1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services →
   Credentials → *Create credentials* → OAuth client ID → tipo **Web application**.
2. Em *Authorized redirect URIs*, cola o URL de callback acima.
3. Copia o **Client ID** e o **Client secret**.
4. Supabase → Authentication → Providers → **Google** → ativa, cola o ID/secret → *Save*.

### LinkedIn
1. [LinkedIn Developers](https://www.linkedin.com/developers/apps) → *Create app*
   (tem de ser associada a uma Página de empresa do LinkedIn).
2. Separador **Products** → adiciona **"Sign In with LinkedIn using OpenID Connect"**.
3. Separador **Auth**:
   - em *Authorized redirect URLs for your app*, cola o URL de callback acima;
   - confirma os scopes **openid**, **profile**, **email**;
   - copia o **Client ID** e o **Client Secret**.
4. Supabase → Authentication → Providers → **LinkedIn (OIDC)** → ativa, cola o
   ID/secret → *Save*.

> No Supabase é o provedor **"LinkedIn (OIDC)"** (chave `linkedin_oidc`). O antigo
> "LinkedIn" está descontinuado — não uses esse.

### URLs do site (importante para o redirect pós-login)
Supabase → Authentication → URL Configuration (valores **já aplicados**):
- **Site URL:** `https://www.recibocerto.pt` (domínio canónico — ver nota no topo)
- **Redirect URLs** (allow-list): `https://www.recibocerto.pt/**`,
  `https://recibocerto.pt/**` e, para dev, `http://localhost:3000/**`

> Antes desta correção o Site URL estava em `http://localhost:3000` (resíduo de
> dev) — partia os links de confirmação/recuperação por email e o redirect de
> fallback do OAuth. Corrigido a 17/06/2026 via Management API.

(No código, `entrarComGoogle`/`entrarComLinkedin` em `src/lib/supabase/auth.tsx`
redirecionam para `${origin}/dashboard`.)

### Verificar
```bash
curl -s -H "apikey: <ANON_KEY>" \
  https://sxdditwefdzuqeephqiy.supabase.co/auth/v1/settings | grep -o '"google":true\|"linkedin_oidc":true'
```

---

## Migrations

As migrations vivem em `supabase/migrations/` (001–010) e **já estão aplicadas**
no projeto. Para um projeto novo (ou staging), aplica-as por ordem via:

- **Supabase Studio** → SQL Editor → colar e correr cada ficheiro, **ou**
- **Supabase CLI**: `supabase link --project-ref sxdditwefdzuqeephqiy` e
  `supabase db push` (requer a password da BD / um access token — não incluídos
  nas chaves de runtime).

> A `service_role` key **não** corre DDL via API REST; aplicar schema exige o
> Studio, a CLI, ou a connection string do Postgres.

---

## Como a app se liga (mapa rápido)

- `src/lib/supabase/client.ts` — cliente do browser (anon). `supabaseConfigurado()`
  decide se a auth/nuvem estão disponíveis.
- `src/lib/supabase/auth.tsx` — `AuthProvider`/`useAuth`: sessão, login email +
  OAuth, modal global.
- `src/lib/supabase/admin.ts` — CRUD de anúncios, parceiros, waitlist, perfis.
- `src/lib/store/recibos.ts` — repositório de recibos em modo duplo
  (localStorage ↔ tabela `recibos`), preservando a promessa "sem registo".
- `src/lib/store/quiz-progresso.ts` — progresso do quiz (local ↔ `quiz_*`).
