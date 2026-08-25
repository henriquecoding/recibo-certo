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
- escala `stone` para texto, preenchimentos e bordas — com o degrau baixo
  redefinido em `tailwind.config.ts` (ver a seguir)

**Preenchimento e borda são tokens SEPARADOS** (`colors.stone` vs
`borderColor.stone`). Não é duplicação: um preenchimento leva texto por cima e
tem tecto de acessibilidade (`bg-stone-100` está a 4,60:1 do verde da marca —
escurecê-lo falha AA em 185 sítios); uma borda não leva texto e não tem tecto
nenhum. Foi de lá que veio a hierarquia do modo claro.

| degrau | preenchimento | contraste s/ branco | borda | contraste s/ branco |
| --- | --- | --- | --- | --- |
| 50 | `#F8F6F1` | 1,08:1 | `#EFECE4` | 1,18:1 |
| 100 | `#F7F5EE` | 1,09:1 | `#EBE7DE` | 1,23:1 |
| 200 | `#E7E5DE` | 1,26:1 | `#E2DDD2` | 1,35:1 |
| 300 | (Tailwind) | — | `#CFC9BA` | 1,65:1 |

Calibrados contra o modo escuro, que é a referência: lá o cartão destaca-se do
fundo (1,13:1) **e** a borda destaca-se do cartão (1,18:1). No claro havia só o
degrau branco-sobre-papel — metade das pistas. Medido por
`npm run hierarquia:e2e`.

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
  A aresta é da BORDA; a sombra é só altura. O anel de 1 px que `shadow-card`
  ainda tem (0,04) é a pista de reserva das superfícies elevadas sem borda —
  não a aresta principal, senão os cartões ficam com 2 px de contorno.
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

## Verificar a hierarquia (`npm run hierarquia:e2e`)

Mede, superfície a superfície, a MELHOR das três pistas que a podem delimitar —
degrau de fundo, aresta de borda, anel de sombra — em catorze páginas × duas
larguras × dois temas. Abaixo de 1,05:1 a superfície existe no DOM e não existe
no ecrã.

O critério de aprovação não é um número inventado: é o modo escuro. Uma página
no claro não pode ter mais de 8% de superfícies invisíveis, nem ficar mais de 3
pontos atrás da mesma página no escuro. Correr sempre que se mexer num token de
cor, borda ou sombra — foi assim que se apanhou a borda que nunca se via.
