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
- Marca: `brand #177E5E` (escurecido em 2026-08 para passar AA — o mínimo que lá
  chega, não voltar a mexer sem medir), `brand-dark #0F6E56`, `brand-deep`,
  `brand-light #E1F5EE`, `brand-mint`.
- Neutros quentes: `cream #F5F4F0` (fundo), `sand`, `ink #1A1A17`, escala `stone`.
- Aviso (amarelo pastel, NÃO âmbar): `alert-bg #FEFBD0`, `alert`, `alert-border`, `alert-text #7A5C00`.
- Sombras quentes: `shadow-card / lift / float / glow`. Raio: até `rounded-4xl` (2rem). Textura: `.grain`.
- Tipografia: Playfair Display (`.font-display`, títulos) + DM Sans (corpo). Display fluido `.display-1/2`. `.eyebrow` para rótulos. Números com `tabular-nums`.

### Preenchimento e borda são tokens SEPARADOS
`colors.stone.{50,100,200}` (preenchimentos) e `borderColor.stone.{50,100,200,300}`
(bordas) têm valores diferentes de propósito, e a razão é dura:

- um preenchimento LEVA TEXTO e tem tecto de acessibilidade — `bg-stone-100` está
  a 4,60:1 do verde da marca, com 0,10 de folga sobre AA; escurecê-lo um degrau
  falha em 185 sítios de uma vez;
- uma borda NÃO leva texto e não tem tecto nenhum.

Toda a hierarquia do modo claro veio daí. **Precisas de mais separação? Vai à
borda, não ao fundo.** Se mesmo assim precisares de um fundo mais escuro, tem de
ser uma superfície que comprovadamente nunca leva texto (ex.: os esqueletos de
carregamento, que têm regra própria em `globals.css`).

O papel da página (`cream`) é intocável: `#736C68` (o tier terciário) e o verde
da marca estão os dois a menos de 0,2 de AA sobre ele. Escurecer o fundo um único
degrau parte o site inteiro.

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
- **E nunca partir o escuro por trás:** os utilitários `dark:*` NÃO passam pela
  camada `.dark` — o Tailwind gera-lhes uma classe própria. `dark:text-stone-100`
  (708 sítios, a cor de título mais usada do tema escuro) lia o token do tema
  CLARO em bruto, portanto uma afinação do claro mexia-lhe sem ninguém dar por
  isso. Estão fixados no fim de `globals.css`, junto às variantes que já lá
  estavam pela mesma razão. **Ao mexer num token, procurar sempre quem o lê por
  `dark:`** (`rg 'dark:[a-z-]*-<token>'`) e confirmar com um instantâneo dos
  estilos computados antes/depois — não a olho, que não distingue #F5F5F4 de
  #F7F5EE.

## Motion (`src/lib/motion.ts` + `components/ui/motion`)
- `MotionProvider` (LazyMotion + `MotionConfig reducedMotion="user"`) já envolve a app. Usar `m.*` (não `motion.*`).
- Easing da marca `EASE = cubic-bezier(0.16,1,0.3,1)`. Durações: micro 0.2s, entrada 0.5–0.6s.
- Primitivas: `Reveal` (entra no viewport), `StaggerGroup/Item`, `CountUp`, `AnimatePresence` (acordeão/passos).
- **Cuidado:** animar `height` a partir de 0 com `whileInView` não dispara (elemento colapsado nunca interseta) → usar altura estática + `scaleY`, ou `animate` no mount. Animações infinitas (float/ping) prejudicam performance e bloqueiam screenshots — usar com parcimónia.

## Acessibilidade (obrigatória)
Semântica HTML, `aria-pressed/checked/expanded`, foco visível, contraste nos dois
temas, alvos ≥ 36px, navegação por teclado (combobox, tooltips, toggles),
`prefers-reduced-motion` respeitado.

## Hierarquia visual — medir, não sentir (`npm run hierarquia:e2e`)
Mexeste num token de cor, borda ou sombra? Corre isto. Mede, superfície a
superfície, a MELHOR das três pistas que a delimitam (degrau de fundo, aresta de
borda, anel de sombra) em catorze páginas × duas larguras × dois temas. Abaixo de
1,05:1 a superfície existe no DOM e não existe no ecrã.

O portão é o modo ESCURO: no claro, nenhuma página pode passar de 8% de
superfícies invisíveis nem ficar mais de 3 pontos atrás da mesma página no
escuro. Foi assim que se apanhou `border-stone-100` — a classe de borda mais
usada do projeto, a 1,016:1 contra o papel, invisível em 804 sítios durante meses
sem ninguém conseguir apontar o que estava errado.
