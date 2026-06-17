# ReciboCerto — Manual de operação do projeto

> **LÊ ISTO PRIMEIRO.** Antes de programar neste projeto, consulta as skills em
> `.claude/skills/`. Elas contêm a disciplina aprendida e são obrigatórias:
>
> - `fiscalidade-pt-2026` — exatidão fiscal (LER antes de tocar em taxas/cálculos)
> - `design-system-recibocerto` — UI, dark mode, motion, acessibilidade
> - `arquitetura-recibocerto` — stack, estrutura, convenções
> - `verificacao-e-qualidade` — como verificar antes de concluir
>
> Nota: o `CLAUDE.md` da pasta-pai (Desktop, "Refúgio Animal") **NÃO** pertence a
> este projeto — ignora-o.

## O que é

Copiloto financeiro para trabalhadores independentes em Portugal (recibos verdes).
Vende **tranquilidade**, não cálculos: mostrar quanto é teu, quanto reservar,
quando pagar, evitar multas.

## Stack (não re-arquitetar)

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind v3
(`darkMode: "class"`) · `motion` (framer-motion via LazyMotion) · persistência em
`localStorage` (`src/lib/store`) · deploy Vercel. Sem dependências novas sem motivo.

## Inegociáveis (regras de ouro)

1. **Nenhum dado fiscal inventado ou desatualizado.** Tudo vem de
   `src/lib/fiscal-data.ts` (fonte de verdade), com base legal, fonte e
   `lastVerified`. `assertFiscalDataIntegrity()` faz o build falhar se for
   inconsistente. Verificar valores em fontes oficiais (WebSearch) antes de mudar.
2. **Português de Portugal** em toda a UI e copy.
3. **Sem emojis** — apenas ícones SVG (`src/components/ui/Icons.tsx`).
4. **Modo claro intacto.** O dark mode é uma camada `.dark` em `globals.css`;
   nunca partir o claro.
5. **Acessibilidade sempre** — semântica, `aria-*`, foco, contraste, teclado,
   `prefers-reduced-motion`.
6. **Verificar antes de concluir** — `npm run build` + `npm audit --audit-level=high`
   (0 high) + smoke em runtime. Ver skill `verificacao-e-qualidade`.
7. **Planear e validar** mudanças grandes com o utilizador antes de implementar.
8. Manter o nome **ReciboCerto**. Não inventar testemunhos nem métricas.
9. **Changelog a cada merge para `main`.** Sobe `APP_VERSION` e acrescenta uma
   entrada (pt-PT, voltada ao utilizador) NO TOPO de `CHANGELOG` em
   `src/lib/version.ts` — é o que alimenta o popup "Novidades & Atualizações".
   `assertChangelogIntegrity()` falha o build e o workflow `changelog-check.yml`
   falha o PR se esqueceres.

## Mapa rápido

- `src/lib/fiscal-data.ts` — ★ fonte de verdade fiscal (taxas, atividades, deduções, IRC) + asserções.
- `src/lib/fiscal.ts` — motor: `calcular` (tesouraria/recibo), `simularIRSAnual` (anual), `compararRegimes`.
- `src/lib/insights.ts` — insights proativos + `saudeFiscal`.
- `src/lib/store/recibos.ts` — repositório (localStorage; trocar por Supabase no futuro).
- `src/lib/motion.ts` — variantes de animação.
- `src/lib/version.ts` — ★ `APP_VERSION` + `CHANGELOG` do popup de Novidades (subir a cada merge para `main`; ver regra 9).
- `src/app/` — landing (`page.tsx`) + `dashboard/*` (visão geral, recibos, receitas, prazos, simulador, comparador) + `api/fiscal-data`.
- `src/components/ui/` — primitivas (Button, Badge, InfoTip, ActivityCombobox, Reveal, CountUp, ThemeToggle, Icons…).
- `scripts/check-fiscal-data.mjs` + `.github/workflows/` — monitor fiscal + auditoria de segurança.
- `DESIGN.md` — design system documentado.

## Próximos passos conhecidos
Ligar **Supabase** (auth/nuvem), **Stripe** (billing dos planos já desenhados),
**Resend** (alertas por email). Requerem credenciais do utilizador.
