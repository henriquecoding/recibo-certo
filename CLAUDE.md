# Recibo Certo — Manual de operação do projeto

> **LÊ ISTO PRIMEIRO.** Antes de programar neste projeto, consulta as skills em
> `.claude/skills/`. Elas contêm a disciplina aprendida e são obrigatórias:
>
> - `fiscalidade-pt-2026` — exatidão fiscal (LER antes de tocar em taxas/cálculos)
> - `design-system-recibocerto` — UI, dark mode, motion, acessibilidade
> - `arquitetura-recibocerto` — stack, estrutura, convenções
> - `verificacao-e-qualidade` — como verificar antes de concluir
> - `crescimento-recibocerto` — clusters de decisão, medição, routing comercial
>   e autoridade (LER antes de criar páginas, ferramentas, guias ou CTAs)
> - `pricing-engine-recibocerto` — engine de formação de preço (LER antes de
>   tocar em custos, margem, markup, comissões ou na faixa de preço)
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
5b. **Mobile-first, sempre (inegociável).** Desenha primeiro para telemóvel e só
   depois amplia (`sm:`/`lg:` adicionam, nunca a base assume desktop). Toda a UI
   tem de funcionar e ficar legível em ~360px de largura: sem overflow horizontal,
   alvos ≥ 36px, modais como folha inferior com corpo `min-h-0 overflow-y-auto`
   (e `max-h-[90dvh]` + safe-area), e respeitar `dvh`/`env(safe-area-inset-*)`.
   Secções pesadas (mapas/gráficos) carregam com `next/dynamic({ ssr:false })` e
   ficam dentro de um `ErrorBoundary` para nunca deixarem a página em branco.
   Verificar SEMPRE em viewport estreito antes de concluir — e a verificação é
   `npm run movel:e2e` (contra o BUILD, não contra o `dev`), que mede as CINCO
   rotas da homepage (`/`, `/inicio/preco`, `/inicio/recibos`, `/inicio/empresa`,
   `/inicio/salario`) a 360 e a 320px, nos dois temas. O piso tipográfico é uma
   classe (`.texto-micro` / `.texto-mini` em `globals.css`), não disciplina.
6. **Verificar antes de concluir** — `npm run build` + `npm audit --audit-level=high`
   (0 high) + smoke em runtime. Ver skill `verificacao-e-qualidade`.
7. **Planear e validar** mudanças grandes com o utilizador antes de implementar.
8. **O nome é «Recibo Certo», duas palavras.** Decidido a 31/08/2026 pelo dono do
   projeto, e aplicado a TUDO o que uma pessoa lê: a UI, a copy, os emails, os
   metadados, o logótipo, e também os painéis de terceiros — Stripe (nome da conta,
   `display_name`, nome do produto), Supabase (nome do projeto) e Google (nome da
   aplicação no ecrã de consentimento). A forma antiga «ReciboCerto», colada, não
   volta a aparecer em texto visível.
   O que **NÃO** muda, porque são identificadores e não nome: o domínio
   `recibocerto.pt`, o pacote `recibo-certo`, as `lookup_key` da Stripe
   (`recibocerto_plus_*`), as chaves idempotentes, os `User-Agent`
   (`ReciboCertoLinkCheck/1.0`) e a pasta `ReciboCerto-Fiscal-Engine/`.
   Não inventar testemunhos nem métricas.
9. **Changelog a cada merge para `main`.** Sobe `APP_VERSION` e acrescenta uma
   entrada (pt-PT, voltada ao utilizador) NO TOPO de `CHANGELOG` em
   `src/lib/version.ts` — é o que alimenta o popup "Novidades & Atualizações".
   `assertChangelogIntegrity()` falha o build e o workflow `changelog-check.yml`
   falha o PR se esqueceres.
10. **Popup "Novidades" — comportamento IMUTÁVEL (não mudar sem autorização).**
   Só pode aparecer (a) na primeira visita de sempre e (b) quando há uma versão
   nova (`APP_VERSION` muda). NUNCA a cada refresh. A versão é marcada como vista
   no instante em que o popup é mostrado (ver `NovidadesModal.tsx`), não só ao
   fechar — atualizar a página com ele aberto não o pode fazer reaparecer.
11. **Popup "Novidades" — carregamento por mês (INEGOCIÁVEL).** Ao abrir, o popup
   só pode carregar o **mês atual**. Os meses anteriores entram fechados, como um
   grupo com o nome do mês e a contagem de versões, e os dados desse mês só são
   pedidos **quando a pessoa clica nesse grupo** — um pedido por mês, nunca em
   lote e nunca à entrada. A regra vale por construção, não por disciplina:
   `scripts/gen-novidades.mjs` escreve `public/novidades/indice.json` SEM as
   entradas dos meses anteriores (só nome e contagem) e um
   `public/novidades/meses/AAAA-MM.json` por mês. Nenhum componente as pode
   mostrar à entrada porque elas não estão lá. O changelog NUNCA volta a ser
   importado como módulo JavaScript pelo cliente. Coberto por
   `src/lib/__tests__/novidades-popup.test.ts`.

## Mapa rápido

- `src/lib/fiscal-data.ts` — ★ fonte de verdade fiscal (taxas, atividades, deduções, IRC) + asserções.
- `src/lib/fiscal.ts` — motor: `calcular` (tesouraria/recibo), `simularIRSAnual` (anual), `compararRegimes`.
- `src/lib/insights.ts` — insights proativos + `saudeFiscal`.
- `src/lib/store/recibos.ts` — repositório (localStorage; trocar por Supabase no futuro).
- `src/lib/pricing/` — ★ engine de formação de preço: tipos, regras de mercado
  (`regras.ts`, com proveniência e data), motores puros em `motores/` e o
  orquestrador `motor.ts`. NÃO duplica `fiscal-data.ts` — lê de lá.
- `src/lib/analytics/` — ★ camada de medição: dicionário de eventos, identidade e
  atribuição, barreira de PII, DVM (North Star) e definições do painel semanal.
- `src/lib/negocio/market/` — ★ motor de evidência de mercado: registo de fontes,
  gate de evidência, frescura, quarentena, conectores INE/Eurostat e pilotos.
- `src/lib/negocio/descoberta/` — ★★ **Opportunity Discovery Engine**. O motor
  deixou de escolher de uma lista: compõe hipóteses (problema × modelo de receita
  × entrega × zona) a partir de um grafo de competências, capacidades e
  problemas. `contexto/` (o perfil profundo), `conhecimento/` (o grafo, com
  `assertGrafoIntegro()` a falhar o build em arestas partidas), `motor/`
  (geração, restrições que ELIMINAM, viabilidade em intervalos, regulação,
  procura/oferta, risco, scoring de dez dimensões, confiança separada do fit,
  stress test, diversidade, explicação, plano de validação, query planner e o
  pipeline com telemetria real) e `historico/`. Ver
  `docs/architecture/opportunity-discovery-engine.md`.
  **Regra absoluta:** nenhum número chega ao ecrã sem `Proveniencia` — observado,
  estimativa, cálculo ou hipótese. Não há caminho no tipo para o evitar.
- `src/lib/negocio/market/catalogo-oportunidades.ts` — ★ as 24 hipóteses curadas.
  Deixaram de ser o universo de respostas e passaram a ser SEEDS do grafo
  (`descoberta/conhecimento/seeds.ts`): copy de referência, ponte para a
  evidência dos pilotos e padrão de comparação. Regras de admissão testadas em
  `negocio-market-fit-audit.test.ts` (`npm run market:fit-audit`).
- `src/lib/negocio/market/opportunities.ts` — ★ Founder Fit v2: repartição do
  score por dimensão, empate publicado (`rank` partilhado + `tiedWith`) e
  deteção de perguntas inertes derivada do catálogo.
- `src/lib/negocio/market/concelhos.ts` — ★ os 308 concelhos, GERADO por
  `npm run concelhos:gen` a partir da metainformação do INE. Não editar à mão.
- `src/lib/negocio/market/oferta-concelhos.ts` + `bulk/dados/oferta-concelhos.json`
  — ★ matriz de oferta aos 308 concelhos (empresas por divisão da CAE +
  população). Gerada por `npm run oferta:concelhos` e **é para commitar**.
  Alimenta o quociente de localização — operadores por mil CLIENTES, com o
  denominador que cada `Problema` declara em `baseDeClientes`.
- `src/lib/negocio/market/bulk/` — ★ ingestão de fontes que não cabem num pedido
  HTTP (contratos públicos: 52 MB → 273 MB). O instantâneo em `bulk/dados/` é
  gerado por `npm run mercado:ingerir` e **é para commitar** — é ele que a
  aplicação serve. Atualizado por `.github/workflows/mercado-ingestao.yml`,
  que abre PR e nunca faz push para `main`.
- `ReciboCerto-Fiscal-Engine/src/releases/` — ★ **motor patronal por releases**. Um
  release declara estado, vigência, jurisdições, compatibilidade de engine e
  cobertura POR DOMÍNIO; `select.ts` é o único sítio que fabrica o
  `EmploymentPolicyBundle`, e `planEmploymentOffer` não aceita outra coisa.
  Nenhum componente importa uma `policy-YYYY.ts` — o portão
  `npm run motor:no-hardcodes` reprova se voltar a acontecer. A fronteira da
  aplicação é `src/lib/motor/release.ts`. Ver
  `docs/architecture/motor-patronal.md`.
  **Regra absoluta:** nenhuma copy diz «verificado» ou «validado» sem o estado
  do release por trás. `userReviewedInputs`, `policyApproved` e
  `calculationReproducible` são três coisas diferentes.
- `src/lib/clusters.ts` — os oito clusters de decisão, ICPs e inventário dos guias.
- `src/lib/routing.ts` — motor de routing comercial (FIZ / contabilista / Plus /
  sem parceiro) e as fronteiras que nunca se atravessam.
- `src/lib/autoridade.ts` — anatomia de resultado e de página citável, benchmark de IA.
- `src/lib/revisoes.ts` — data material de cada rota (o `lastmod` real do sitemap).
- `src/lib/motion.ts` — variantes de animação.
- `src/lib/version.ts` — ★ `APP_VERSION` + `CHANGELOG` do popup de Novidades (subir a cada merge para `main`; ver regra 9).
- `src/app/` — landing (`page.tsx`) + `dashboard/*` (visão geral, recibos, receitas, prazos, simulador, comparador) + `api/fiscal-data`.
- `src/components/ui/` — primitivas (Button, Badge, InfoTip, ActivityCombobox, Reveal, CountUp, ThemeToggle, Icons…).
- `scripts/check-fiscal-data.mjs` + `.github/workflows/` — monitor fiscal + auditoria de segurança.
- `scripts/verificar-movel.mjs` — ★ o portão do telemóvel (`npm run movel:e2e`). Ver a regra 5b.
- `DESIGN.md` — design system documentado.

## Próximos passos conhecidos
Ligar **Supabase** (auth/nuvem), **Stripe** (billing dos planos já desenhados),
**Resend** (alertas por email). Requerem credenciais do utilizador.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
