---
name: design-system-recibocerto
description: Design system, dark mode, motion e acessibilidade do ReciboCerto. Usar SEMPRE que criares ou alterares UI (componentes, páginas, estilos, animações). Garante nível premium, coerência e que o modo claro nunca parte.
---

# Design system — ReciboCerto

Estética: premium, calma, editorial, alta confiança (referências: Stripe, Linear,
Notion). Anti-"SaaS de IA". Ver também `DESIGN.md`.

## Princípios
Mostrar o dinheiro antes do imposto · reduzir ansiedade · ação > informação ·
clareza > esperteza · divulgação progressiva (toggles) · premium é contenção.

## Tokens (em `tailwind.config.ts` + `globals.css`)
- Marca: `brand #1D9E75`, `brand-dark #0F6E56`, `brand-deep`, `brand-light #E1F5EE`, `brand-mint`.
- Neutros quentes: `cream #F5F4F0` (fundo), `sand`, `ink #1A1A17`, escala `stone`.
- Aviso (amarelo pastel, NÃO âmbar): `alert-bg #FEFBD0`, `alert`, `alert-border`, `alert-text #7A5C00`.
- Sombras quentes: `shadow-card / lift / float / glow`. Raio: até `rounded-4xl` (2rem). Textura: `.grain`.
- Tipografia: Playfair Display (`.font-display`, títulos) + DM Sans (corpo). Display fluido `.display-1/2`. `.eyebrow` para rótulos. Números com `tabular-nums`.

## Regras de UI
- **Mobile-first (inegociável).** Base = telemóvel; `sm:`/`lg:` só ampliam. Testar a ~360px: sem overflow horizontal, grelhas empilham (`grid-cols-1` → `sm:grid-cols-*`), alvos ≥ 36px. Modais = folha inferior no telemóvel (`items-end` + `rounded-t-4xl`), corpo scrollável com **`min-h-0 flex-1 overflow-y-auto`** dentro de `max-h-[90dvh]`, e `env(safe-area-inset-*)`. Mapas/gráficos pesados via `next/dynamic({ ssr:false })` + `ErrorBoundary` (`src/components/ui/ErrorBoundary.tsx`) para nunca deixarem a página em branco.
- **Sem emojis.** Só ícones SVG de `src/components/ui/Icons.tsx` (adicionar lá novos).
- Reutilizar primitivas: `Button`, `Badge`, `InfoTip` (tooltip acessível — usar junto de qualquer campo técnico), `ActivityCombobox`, `AnimatedNumber`/`CountUp`, `StatCard`, `FeatureCard`.
- Cartões: `rounded-4xl border bg-white shadow-card`, hover `shadow-lift`.
- Estados: vazio (ícone+CTA), carregamento (`animate-pulse`), erro. Inputs com `focus:ring-brand`.
- Server Components por defeito; `"use client"` só quando há estado/handlers/motion.

## Dark mode (cinematográfico, quente)
- Ativado pela classe `.dark` no `<html>` (toggle `ThemeToggle`; script anti-flash em `layout.tsx`; preferência em `localStorage` + sistema).
- Implementado como **camada de override `.dark`** em `globals.css` que remapeia só
  os neutros (`bg-white`, `text-stone-*`, `border-stone-*`, `cream/sand`, `brand-light`, alertas).
- **Nunca partir o modo claro:** os overrides são `.dark`-scoped. Não tocar em
  `text-white`/`bg-brand`. Para SVG que precisa de cor temática, usar
  `fill/stroke="currentColor"` + classe `text-stone-*` (responde ao dark). Evitar
  cores hex fixas em texto/ícones que vivam sobre superfícies.

## Motion (`src/lib/motion.ts` + `components/ui/motion`)
- `MotionProvider` (LazyMotion + `MotionConfig reducedMotion="user"`) já envolve a app. Usar `m.*` (não `motion.*`).
- Easing da marca `EASE = cubic-bezier(0.16,1,0.3,1)`. Durações: micro 0.2s, entrada 0.5–0.6s.
- Primitivas: `Reveal` (entra no viewport), `StaggerGroup/Item`, `CountUp`, `AnimatePresence` (acordeão/passos).
- **Cuidado:** animar `height` a partir de 0 com `whileInView` não dispara (elemento colapsado nunca interseta) → usar altura estática + `scaleY`, ou `animate` no mount. Animações infinitas (float/ping) prejudicam performance e bloqueiam screenshots — usar com parcimónia.

## Acessibilidade (obrigatória)
Semântica HTML, `aria-pressed/checked/expanded`, foco visível, contraste nos dois
temas, alvos ≥ 36px, navegação por teclado (combobox, tooltips, toggles),
`prefers-reduced-motion` respeitado.
