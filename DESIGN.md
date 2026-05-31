# ReciboCerto — Design System

Sistema de design do copiloto financeiro. Premium, calmo, editorial e de alta
confiança. Tokens em `tailwind.config.ts` + `src/app/globals.css`.

## Princípios

1. **Mostrar o dinheiro antes do imposto** — o número que importa domina.
2. **Reduzir ansiedade primeiro** — calma > densidade.
3. **Ação > informação** — insights acionáveis, não dados crus.
4. **Clareza > esperteza** — jargão fiscal sempre traduzido (tooltips).
5. **Divulgação progressiva** — simples por defeito, profundidade por toggle.
6. **Confiança de nível bancário** — dados com fonte e data.
7. **Premium é contenção.**

## Cor

Marca (verde humano, não néon):
- `brand` `#1D9E75` · `brand-dark` `#0F6E56` · `brand-deep` `#0A4A39`
- `brand-light` `#E1F5EE` · `brand-mint` `#9FE1CB`

Superfícies / neutros (quentes):
- `cream` `#F5F4F0` (fundo app) · `sand` `#EDEAE2` · `ink` `#1A1A17`
- escala `stone` (Tailwind) para texto e bordas

Semânticas:
- Aviso (amarelo pastel): `alert-bg` `#FEFBD0` · `alert` `#FFF8A0` · `alert-border` `#E8D97A` · `alert-text` `#7A5C00`
- Perigo: `red-50/600` · Sucesso: `brand`

**Dark mode cinematográfico** (classe `.dark`, tons quentes): fundo `#141613`,
superfície `#1C1F1A`, texto `#E2E0D6`/`#F2F0E8`. Implementado como camada de
override dos neutros — não toca em `text-white`/`bg-brand`, por isso o modo claro
fica intacto. Preferência persistida + respeita o sistema (script anti-flash em
`layout.tsx`).

## Tipografia

- **Display** — Playfair Display (`.font-display`): títulos editoriais.
  Escala fluida: `.display-1` `clamp(2.5rem, 6vw, 4.5rem)`, `.display-2` `clamp(1.9rem, 4vw, 3rem)`.
- **Corpo** — DM Sans (`font-sans`): 14–18px, leitura calma.
- **Eyebrow** (`.eyebrow`): 12px, 600, tracking 0.15em, maiúsculas.
- Números: `tabular-nums` para alinhamento.

## Espaço, raio e elevação

- Espaçamento: escala Tailwind (4px base); secções `py-24`, cartões `p-6`.
- Raio: `rounded-xl` (controlos), `rounded-2xl/3xl`, `rounded-4xl` `2rem` (cartões premium).
- Sombras quentes (não cinzentas frias): `shadow-card`, `shadow-lift`, `shadow-float`, `shadow-glow`.
- Textura: `.grain` (ruído subtil) para fundos planos.

## Motion (Linear/Stripe-grade)

- Easing da marca: `cubic-bezier(0.16, 1, 0.3, 1)` (`EASE` em `lib/motion.ts`).
- Durações: micro 0.2s · entrada 0.5–0.6s · transições 0.3s.
- `prefers-reduced-motion` respeitado globalmente (`MotionConfig reducedMotion="user"` + CSS).
- Bundle contido: `LazyMotion` + `m.*` (não o `motion.*` completo).

Variantes (`lib/motion.ts`): `fadeUp`, `scaleIn`, `staggerContainer`, `staggerItem`.
Primitivas:
- `Reveal` — revela ao entrar no viewport.
- `Stagger` (`StaggerGroup`/`StaggerItem`) — cascata.
- `CountUp` — contagem animada de números.
- `MotionProvider` — provider global (LazyMotion + MotionConfig).
- `AnimatePresence` — acordeão (FAQ) e passos (Onboarding).
- `.btn-shine` — brilho tátil ao passar o rato; `active:scale` nos botões.

## Componentes

Primitivas (`components/ui`): `Button` (variantes primary/secondary/ghost),
`Badge` (tones), `InfoTip` (tooltip acessível), `ActivityCombobox` (combobox
pesquisável), `AnimatedNumber`, `CountUp`, `Icons` (SVG, sem emojis), `ThemeToggle`,
`StatCard`/`FeatureCard`.

Padrões: cartões com `shadow-card`, hover `shadow-lift`; estados vazios com ícone +
CTA; skeletons em `animate-pulse`; alertas em amarelo pastel; inputs com
`focus:ring-brand`.

## Acessibilidade

Semântica HTML, `aria-*` (pressed/checked/expanded), foco visível, contraste
adequado em ambos os temas, alvos de toque ≥ 36px, navegação por teclado
(combobox, tooltips, toggles).
