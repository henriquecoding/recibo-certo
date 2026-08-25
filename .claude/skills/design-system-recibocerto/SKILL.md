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
- Marca: `brand #177E5E` em preenchimento e borda; **`#147455` em TEXTO**
  (`textColor.brand`) — ver a seguir. `brand-dark #0F6E56`, `brand-deep`,
  `brand-light #E1F5EE`, `brand-mint`.
- Neutros quentes: `cream #EDEAE0` (papel da página), `sand #E6E2D5`,
  `ink #1A1A17`, escala `stone`.
- Aviso (amarelo pastel, NÃO âmbar): `alert-bg #FEFBD0`, `alert`, `alert-border`, `alert-text #7A5C00`.
- Sombras quentes: `shadow-card / lift / float / glow`. Raio: até `rounded-4xl` (2rem). Textura: `.grain`.
- Tipografia: Playfair Display (`.font-display`, títulos) + DM Sans (corpo). Display fluido `.display-1/2`. `.eyebrow` para rótulos. Números com `tabular-nums`.

### Preenchimento, borda e texto são tokens SEPARADOS
`colors` (preenchimento), `borderColor` e `textColor` têm valores diferentes de
propósito, e a razão é dura — cada um tem uma régua diferente:

- um preenchimento LEVA TEXTO por cima e tem tecto de acessibilidade —
  `bg-stone-100` está a 4,60:1 do verde, com 0,10 de folga; escurecê-lo um degrau
  falha em 185 sítios de uma vez;
- uma borda NÃO leva texto e não tem tecto nenhum;
- `bg-brand` é a marca a ser VISTA (régua: o branco por cima, 5,02:1);
  `text-brand` é a marca a ser LIDA (régua: 4,5:1 sobre o papel). Por isso são
  #177E5E e #147455. Foi essa separação que permitiu escurecer o papel sem tocar
  na cor dos botões nem do logótipo.

### O papel é o degrau que carrega o modo claro
`cream` era `#F5F4F0` e punha o cartão branco a 1,101:1 do fundo — no limiar do
percetível. É `#EDEAE0` (1,204:1) porque **nada mais funciona**: bordas mais
escuras sozinhas não mudam a leitura, e sombras mais fortes também não (uma
sombra precisa de chão onde cair). Provado por eliminação, com a mesma zona
renderizada oito vezes. Se voltares a achar o claro «chato», é aqui que se mexe —
e só depois de perceber que mexer aqui obriga a mexer no verde de texto e no
tier terciário.

### Duas regras que só se aprendem a partir uma vez
1. **Uma borda tem dois lados.** Afinar só contra o cartão branco parte tudo o
   que vive directamente no papel (listas, faixas, o rodapé móvel). Medir os dois.
2. **Calibrar contra o pior COMPOSTO, não contra o token.** O texto que falhou AA
   quando o papel desceu não estava sobre o papel — estava sobre os halos verdes
   decorativos (`bg-brand/[0.03…0.05]`) compostos com ele: `#E3E6DB`. É esse o
   fundo que entra na conta. O axe apanha isto; a aritmética sobre o token não.

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

**Mas o portão não substitui os olhos.** A primeira correção passou a medição
inteira (0% de superfícies invisíveis em todas as páginas) e, posta ao lado do
antes, era indistinguível — porque o limiar de 1,05 diz «vê-se se procurares», e
não «a página tem estrutura». Depois de a medição passar, renderiza a mesma zona
com dois ou três candidatos deliberadamente EXAGERADOS e escolhe entre eles: para
achar o limiar da percepção é preciso passá-lo, não aproximar-se dele por baixo.
