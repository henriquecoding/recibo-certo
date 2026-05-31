# ReciboCerto

Calculadora de recibos verdes para trabalhadores independentes em Portugal — IRS
(retenção na fonte), Segurança Social e IVA, com as **taxas de 2026 verificadas e
com fonte**. Landing page + calculadora interativa, pronta para deploy na Vercel.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS** (sistema de design com tokens da marca)
- **next/font** (Playfair Display + DM Sans)
- Sem dependências de runtime extra — ícones são SVG inline, animações em CSS.

## Começar

```bash
npm install
npm run dev      # http://localhost:3000
```

Build de produção:

```bash
npm run build
npm run start
```

## Deploy na Vercel

1. Cria um repositório Git e faz `push`.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importa o repo.
3. A Vercel deteta Next.js automaticamente. Não é preciso configurar nada.
4. **Deploy**. Cada `git push` gera um preview; `main` vai para produção.

> Atualiza `SITE_URL` em `src/app/layout.tsx`, `page.tsx`, `robots.ts` e
> `sitemap.ts` para o domínio final.

## Estrutura

```
src/
├── app/
│   ├── layout.tsx            # fontes, metadata/SEO, <html lang="pt-PT">
│   ├── page.tsx              # landing + JSON-LD (FAQ + WebApplication)
│   ├── globals.css           # base, tipografia, animações, prefers-reduced-motion
│   ├── robots.ts · sitemap.ts
│   ├── api/fiscal-data/       # API JSON: consulta dos parâmetros + datas de verificação
│   └── dashboard/            # área autenticável (MVP local)
│       ├── layout.tsx        # navegação lateral
│       ├── page.tsx          # visão geral (saldo real + próximos prazos)
│       ├── recibos/          # registo e histórico de recibos
│       ├── prazos/           # calendário de obrigações fiscais
│       └── simulador/        # simulador de IRS anual (regime simplificado)
├── components/
│   ├── Nav · Hero · Stats · Calculadora · Features · FAQ · Fontes · EmailCapture · Footer
│   └── ui/                   # AnimatedNumber, Icons (SVG), StatCard, FeatureCard
└── lib/
    ├── fiscal-data.ts        # ★ FONTE DE VERDADE FISCAL (ver abaixo)
    ├── fiscal.ts             # motor de cálculo + simulador IRS (sem números mágicos)
    ├── prazos.ts             # geração das datas-limite fiscais
    ├── store/recibos.ts      # repositório de recibos (localStorage → Supabase)
    ├── faq.ts · format.ts · scroll.ts
scripts/check-fiscal-data.mjs # monitor de desatualização dos dados
.github/workflows/
  ├── fiscal-data-check.yml   # verificação mensal dos dados → abre issue
  └── security-audit.yml      # npm audit em cada push/PR (falha em high+)
```

## Segurança de dependências

O workflow `security-audit.yml` corre `npm audit --audit-level=high`:

- em **cada push e pull request** — falha o CI (bloqueia o merge) se entrar uma
  dependência com vulnerabilidade de severidade **high** ou superior;
- **semanalmente** — apanha vulnerabilidades divulgadas após o merge e abre/
  atualiza uma issue com a etiqueta `seguranca`.

Evitar `npm audit fix --force` sem rever: pode introduzir mudanças disruptivas
(ex.: fazer downgrade do Next.js). Preferir atualizar para a versão corrigida e
validar com `npm run build`. Para forçar uma versão corrigida numa dependência
transitiva, usar `overrides` no `package.json` (como já feito para o `postcss`).

```bash
npm audit --audit-level=high   # auditoria local (igual à do CI)
```

## Dashboard

Em `/dashboard` (acessível pelo botão “Abrir dashboard”):

- **Visão geral** — disponível este mês, reservas para impostos, próximos prazos.
- **Recibos** — registo e histórico; cada recibo usa o mesmo motor de cálculo.
- **Prazos fiscais** — contagem decrescente das obrigações (SS, IVA, IRS).
- **Simulador de IRS** — estimativa anual pelo regime simplificado: coeficiente,
  regra dos 15% (majoração de despesas), dedução automaticamente justificada,
  IRS Jovem, escalões progressivos e mínimo de existência. Pré-preenchido com os
  recibos registados.
- **Calendário fiscal** — vista de mês com marcadores por categoria, navegação e
  detalhe do dia, além da vista em lista.

> MVP em **modo local**: os dados ficam em `localStorage`. A camada
> `lib/store/recibos.ts` isola a persistência — basta substituir a implementação
> por Supabase (auth + base de dados na nuvem) sem alterar a UI.

## Sistema de integridade dos dados fiscais

Toda a fiscalidade está centralizada em **`src/lib/fiscal-data.ts`**. Cada parâmetro
(taxa, limite, coeficiente) é um objeto `Sourced<T>` com:

- `value` — o valor;
- `legalBasis` — o artigo do código aplicável (CIRS / CIVA / Código Contributivo);
- `source` — a fonte verificável (registada em `SOURCES`);
- `lastVerified` — a data da última verificação.

No fim do módulo, **`assertFiscalDataIntegrity()`** corre na importação e **lança**
(falhando o `build`) se detetar inconsistências, por exemplo:

- valores derivados que não batem certo (ex.: `12 × IAS ≠ teto da SS`);
- taxas fora do intervalo `[0, 1]` ou taxas de IVA fora de ordem;
- escala do IRS Jovem inválida;
- qualquer parâmetro sem fonte registada ou sem data de verificação.

Como cada página importa estes dados, **é impossível publicar dados internamente
inconsistentes**. A secção “Fontes” do site mostra ao utilizador as taxas, a base
legal e a data da última verificação.

### Como atualizar para um novo ano fiscal

1. Editar os valores em `fiscal-data.ts`.
2. Atualizar o `lastVerified` de cada parâmetro alterado e a constante
   `DATA_LAST_REVIEW`.
3. `npm run build` — se algum invariante quebrar, o build falha com a descrição.

## Monitorização automática (consultar quando as regras mudam)

Atualizar a lei fiscal de forma **totalmente automática** não é seguro: não há API
oficial em tempo real e aplicar números errados a uma ferramenta financeira é um
risco. O sistema implementado é **monitorização + verificação humana + propagação
automática**:

1. **Monitor** — `scripts/check-fiscal-data.mjs` deteta sinais de desatualização:
   - o ano fiscal dos dados é anterior ao ano civil atual;
   - a última revisão (`DATA_LAST_REVIEW`) excede 120 dias;
   - (com `--check-sources`) fontes oficiais inacessíveis.

   ```bash
   npm run fiscal:check            # verificação rápida
   npm run fiscal:check:sources    # + testa o acesso às fontes
   ```

2. **Alerta** — a GitHub Action `fiscal-data-check.yml` corre **mensalmente** e,
   se o monitor sinalizar, **abre/atualiza uma issue** com o relatório. Nunca
   altera dados.

3. **Verificação humana** — confirmar cada valor contra a fonte legal e atualizar
   `fiscal-data.ts`. As asserções de integridade impedem dados inconsistentes.

4. **Propagação automática** — feito o merge, a Vercel faz redeploy e **todo o
   site (calculadora + dashboard + API) reflete a mudança**, porque tudo lê da
   mesma fonte de verdade.

Os valores são ainda consultáveis em runtime na API `GET /api/fiscal-data`
(parâmetro, base legal, fonte e data de verificação) — incluindo o catálogo de
atividades, os coeficientes do Art. 31.º, o IRC e as deduções à coleta.

## Dados fiscais (2026) e fontes

| Parâmetro | Valor | Base legal |
|---|---|---|
| Retenção Art. 151.º | 23% | Art. 101.º / 151.º CIRS |
| Retenção outras atividades | 11,5% | Art. 101.º CIRS |
| Retenção direitos de autor | 16,5% | Art. 101.º CIRS |
| Dispensa de retenção | < 15 000 € / ano | Art. 101.º-B CIRS |
| Isenção de IVA | 15 000 € (excesso 25% → 18 750 €) | Art. 53.º CIVA |
| IVA continente | 6% / 13% / 23% | Art. 18.º CIVA |
| IVA Madeira | 5% / 12% / 22% | Art. 18.º CIVA |
| IVA Açores | 4% / 9% / 16% | Art. 18.º CIVA |
| Segurança Social | 21,4% sobre 70% (serviços) / 20% (bens) | Código Contributivo |
| IAS 2026 | 537,13 € | — |
| IRS Jovem | 100/75/50/25%, teto 55 × IAS | Regime IRS Jovem |
| Regime simplificado | coef. 0,75 / 0,35 | Art. 31.º CIRS |
| Escalões de IRS | 9 escalões (12,5% – 48%) | Art. 68.º CIRS |
| Dedução específica | máx(4.104 €; 8,54 × IAS) = 4.587,09 € | Art. 25.º CIRS |
| Regra dos 15% | majoração se despesas < 15% do bruto | Art. 31.º CIRS |
| Mínimo de existência | 12.880 € (RMMG 920 € × 14) | Art. 70.º CIRS |

As fontes completas (com links) estão em `SOURCES` (`fiscal-data.ts`) e visíveis na
secção “Fontes” do site.

## Aviso

Ferramenta **informativa** que estima a tesouraria por recibo. **Não** calcula o
apuramento final de IRS (escalões progressivos, englobamento anual) nem substitui
o aconselhamento de um contabilista certificado.

## Próximos passos

Já feito (modo local): dashboard (visão geral com gráfico de receita, progresso de
isenção de IVA e poupança trimestral), recibos com **export CSV/PDF**, calendário de
prazos, simulador de IRS, **comparador recibos vs empresa**, e secção de **preços** na
landing.

Por ligar a serviços externos (requer credenciais):
- **Supabase** — autenticação + base de dados (substituir `lib/store/recibos.ts`).
- **Resend** — alertas de prazos por email.
- **Stripe** — subscrição do plano Pro (a UI de preços já existe).
