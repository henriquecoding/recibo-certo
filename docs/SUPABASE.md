# Supabase — ligação e operação

Runbook da integração Supabase do ReciboCerto. **Nenhuma chave deve ser
commitada.** As chaves vivem no `.env.local` (dev, ignorado pelo git) e nas
variáveis de ambiente da Vercel (produção).

---

## Estado verificado (16/06/2026)

Diagnóstico feito contra o projeto Supabase ao vivo e contra produção:

| Item | Estado |
|---|---|
| Projeto Supabase | `sxdditwefdzuqeephqiy` — ativo (`/auth/v1/health` → 200) |
| Schema (migrations 001–010) | **Aplicado** — as 11 tabelas existem |
| Produção (`recibocerto.pt`) | **Ligada** — env definidas na Vercel; o site mostra "Entrar" |
| Auth email/password | **Ativa** (signup aberto, autoconfirm ligado) |
| Auth Google | **Ativada** no painel (cliente OAuth configurado) |
| Auth LinkedIn | Pendente — botão na UI; falta ativar o provedor "LinkedIn (OIDC)" |
| Repositório de dados | `store/recibos.ts` e `store/vencimentos.ts` em **modo duplo** (localStorage sem sessão; tabelas `recibos` / `recibos_vencimento` com sessão) |

Tabelas confirmadas: `profiles`, `recibos`, `subscriptions`, `anuncios`,
`admin_partners`, `email_waitlist`, `alertas_guardiao`, `quiz_profiles`,
`quiz_sessions`, `site_settings`, `recibos_vencimento`.

> **`recibos_vencimento`** (migration 010, aplicada 17/06/2026 via Management API):
> cenários guardados do simulador de vencimento. RLS own+admin. Tiering: grátis
> guarda até 3 cenários em localStorage; Pro sincroniza na nuvem (ilimitado).

> **Conclusão:** a app já está ligada ao Supabase (auth + dados + admin +
> subscrições). As únicas lacunas funcionais são os provedores OAuth
> (Google/LinkedIn) — ver abaixo.

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

Hoje os botões existem mas os provedores estão desligados → quem clica apanha
erro. Para os ativar:

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
Supabase → Authentication → URL Configuration:
- **Site URL:** `https://recibocerto.pt`
- **Redirect URLs** (allow-list): `https://recibocerto.pt/**` e, para dev,
  `http://localhost:3000/**`

(No código, `entrarComGoogle`/`entrarComGitHub` em `src/lib/supabase/auth.tsx`
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
