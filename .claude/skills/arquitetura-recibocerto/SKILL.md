---
name: arquitetura-recibocerto
description: Arquitetura, estrutura de ficheiros e convenções do ReciboCerto. Usar ao adicionar páginas/rotas/funcionalidades, ao mexer em estado/dados, ou para perceber onde vive cada coisa neste codebase.
---

# Arquitetura — ReciboCerto

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind v3
(`darkMode: "class"`) · `motion` (LazyMotion) · `localStorage` para dados · Vercel.
**Não re-arquitetar nem trocar o stack** sem aprovação. Minimizar dependências.

## Estrutura
```
src/
  app/
    layout.tsx          fontes (next/font), metadata/SEO, script de tema, MotionProvider
    page.tsx            landing (Hero, Calculadora, Stats, Features, Comparacao, Fontes, Precos, FAQ, EmailCapture)
    globals.css         tokens base, .display, .grain, .btn-shine, overrides .dark, reduced-motion
    robots.ts / sitemap.ts
    api/fiscal-data/route.ts   snapshot JSON dos parâmetros fiscais (force-static)
    dashboard/
      layout.tsx        sidebar (desktop) + nav inferior (mobile, 6 itens) + ThemeToggle
      page.tsx          home: número-herói, Saúde fiscal, Insights, painéis, onboarding
      recibos/ receitas/ prazos/ simulador/ comparador/
  components/
    ui/                 Button, Badge, InfoTip, ActivityCombobox, AnimatedNumber, CountUp,
                        Icons (SVG), ThemeToggle, Reveal, motion/(MotionProvider, Stagger)
    dashboard/          CalendarioPrazos, ReceitaChart, IvaProgresso, PoupancaTrimestral, Onboarding
    (landing): Nav, Hero, Stats, Features, Comparacao, Fontes, Precos, FAQ, EmailCapture, Footer
  lib/
    fiscal-data.ts      ★ fonte de verdade fiscal + asserções
    fiscal.ts           motor (calcular, simularIRSAnual, compararRegimes, irsProgressivo)
    insights.ts         gerarInsights + saudeFiscal
    prazos.ts           gerarPrazos / proximosPrazos / diasAte
    store/recibos.ts    useRecibos (CRUD localStorage), calcularRecibo, resumir
    export.ts           CSV (Blob) + PDF (impressão)
    motion.ts, format.ts (fmt/pct pt-PT), scroll.ts, faq.ts
scripts/check-fiscal-data.mjs       monitor fiscal (npm run fiscal:check)
.github/workflows/                  fiscal-data-check.yml + security-audit.yml
DESIGN.md                           design system documentado
```

## Convenções
- **pt-PT** em tudo. Sem emojis (ícones SVG).
- Server Components por defeito; `"use client"` só quando necessário (estado, handlers, `m.*`, localStorage).
- Dados/cálculo em `lib/` (puro, testável); UI fina por cima. Não duplicar lógica fiscal.
- Formatação só via `format.ts` (`fmt`, `pct`).
- Persistência isolada em `store/` — para migrar para Supabase, substituir a implementação do repositório mantendo a interface (`useRecibos`).
- Tipos partilhados vêm de `fiscal-data.ts`/`fiscal.ts` (TipoAtividade, Regiao, etc.).
- Tooltip (`InfoTip`) junto de qualquer seleção técnica (lei exige clareza ao leigo).

## Gotchas conhecidos
- Porta 3000 fica ocupada por `node` pendente entre execuções → matar `node` e libertar a porta antes de arrancar/preview.
- A ferramenta de preview/screenshot bloqueia com animações infinitas ou a meio de transições; verificar por DOM (eval) quando o screenshot expira.
- `useRef` (React 19) precisa de argumento inicial.
- O `CLAUDE.md` da pasta-pai (Refúgio Animal) não é deste projeto.
