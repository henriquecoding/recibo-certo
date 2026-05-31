---
name: fiscalidade-pt-2026
description: Disciplina de exatidão fiscal do ReciboCerto. Usar SEMPRE antes de tocar em taxas, coeficientes, deduções, atividades, na calculadora, no simulador de IRS ou no comparador. Garante que nenhum dado fiscal é inventado ou desatualizado.
---

# Exatidão fiscal — ReciboCerto (Portugal)

## Regra absoluta
**Nunca inventar nem usar de memória um número fiscal.** Taxas mudam todos os anos
(Orçamento do Estado). Antes de criar/alterar qualquer valor: confirmar em fonte
oficial/de referência (WebSearch — AT/Portal das Finanças, OCC, DECO, PwC Guia
Fiscal, CGD) e registar a fonte.

## Fonte de verdade única
Tudo vive em `src/lib/fiscal-data.ts`. Cada parâmetro é um `Sourced<T>`:
`{ value, legalBasis, source (chave de SOURCES), lastVerified }`.
- Adicionar fonte nova → entrada em `SOURCES`.
- Ao alterar um valor → atualizar `value`, `lastVerified` e `DATA_LAST_REVIEW`.
- **`assertFiscalDataIntegrity()`** corre na importação e faz o `build` falhar se
  houver inconsistências (ex.: `12×IAS ≠ teto SS`, taxas fora de [0,1], escalões
  não crescentes, IVA fora de ordem, parâmetro sem fonte). Estender as asserções
  quando adicionas dados.

## Motor de cálculo (`src/lib/fiscal.ts`)
- `calcular(input)` — **tesouraria por recibo** (o que entra na conta, o que
  reservar: retenção, IVA, SS). NÃO é o IRS final.
- `simularIRSAnual(input)` — **apuramento anual**: regime simplificado (coeficiente
  por atividade + regra dos 15%) OU contabilidade organizada, IRS Jovem,
  englobamento, quociente conjugal, deduções à coleta (com limite global),
  escalões progressivos, mínimo de existência. É estimativa — rotular como tal.
- `compararRegimes(input)` — recibos verdes vs sociedade (IRC + dividendos).
- `irsProgressivo(coletavel)` — soma por escalões.

## Atividades — motor de regras (entidade fiscal)
Cada atividade carrega um **pacote de regras**. Resolver sempre com
`efeitoFiscal(atividade)` → `{ coef, retencao, baseSS, regra15, nota, legalCoef }`.
Nunca assumir só pelo `tipo`.
- Catálogo oficial completo do **Art. 151.º** (Portaria 1011/2001) em `ATIVIDADES`,
  código `NNNN · Nome`.
- **Verdade importante (não inventar variação que não existe):** dentro do
  Art. 151.º o coeficiente é **uniforme 0,75** e a retenção **23%** (al. b). A
  variação real é *por categoria/regime*, não por código.
- Categorias base (via `tipo`): `art151` 0,75/23% · `outros` (1519) 0,35/11,5% ·
  `vendas` 0,15/sem retenção · `diretosAutor` 0,95/16,5%.
- Regimes especiais (overrides na `Atividade`, com `nota` legal):
  alojamento local — estabelecimento 0,15 · moradia/apartamento 0,35 · zona de
  contenção 0,50 (al. h) · transparência fiscal 1,0 (al. g) · **subsídios não
  destinados à exploração 0,30 (al. e)** · **subsídios à exploração 0,10 (al. f)**.
  A regra dos 15% só se aplica a 0,75 e 0,35 (al. b/c) → usar `regra15`. Subsídios
  têm retenção 0 e `regra15: false`; o enquadramento na SS deve ser confirmado.
- Exceções de retenção (situação, não código): dispensa < 15.000 € (toggle);
  **cliente estrangeiro/não residente → sem retenção** (Art. 101.º). 
- O motor (`calcular`, `simularIRSAnual`) aceita `retencaoOverride` / `coefOverride`
  / `aplicaRegra15Override` para refletir o pacote da atividade. Não inventar
  códigos nem coeficientes — buscar à tabela/Art. 31.º e registar fonte.
- **Recibos guardam `atividade`** (rótulo do catálogo); `reciboParaInput` resolve o
  `efeitoFiscal` (retenção/base SS do regime especial). O formulário de recibos, a
  calculadora e o simulador usam todos a `ActivityCombobox`.
- **Segurança Social do alojamento local** (verificado, fonte CGD/Doutor Finanças):
  estabelecimento/hostel → SS sobre 20% (hotelaria); AL em moradia/apartamento
  exercido em exclusivo → possível isenção de SS, mas **condicional à
  exclusividade**: modelada apenas como `nota` (não auto-aplicada) e a `nota`
  remete para confirmação com contabilista. Nunca aplicar a isenção no cálculo.

## Categoria F — rendimentos prediais (rendas puras)
Rendas sem alojamento local são **categoria F**, tributação totalmente distinta da
cat. B. Dados em `CATEGORIA_F` (`fiscal-data.ts`); motor próprio
`calcularCategoriaF` (`fiscal.ts`); UI no simulador (seletor de categoria B/F).
- Taxa autónoma (Art. 72.º): **25%** habitação · **28%** não habitacional.
- Reduções por duração do contrato HABITACIONAL comunicado à AT: 5–10 anos −10 p.p.;
  10–20 −15 p.p.; ≥20 −20 p.p. (renovações −2 p.p. cada, até −10 p.p.).
- Incide sobre rendas − despesas dedutíveis (Art. 41.º: conservação, IMI, selo,
  condomínio, seguros — não mobiliário nem juros). **Sem Segurança Social, sem IVA.**
- Não modela o englobamento (taxas progressivas) nem o regime de renda moderada
  (10%) do OE2026 (pendente de regulamentação) → tratados como nota.

## Valores-chave 2026 (confirmar anualmente)
> Bloco gerado automaticamente a partir de `src/lib/fiscal-data.ts` por
> `npm run skills:sync`. Não editar à mão — alterar os dados na fonte de verdade.

<!-- AUTO-GERADO:valores-fiscais — não editar à mão. Atualizado por `npm run skills:sync`. -->
<!-- Ano fiscal 2026 · última revisão 2026-05-30 · gerado de src/lib/fiscal-data.ts -->

- **IAS** 537,13 €.
- **Retenção na fonte** (cat. B): Art. 151.º 23% · outros serviços 11,5% · direitos de autor 16,5% · vendas sem retenção. Dispensa abaixo de 15 000 €/ano.
- **Coeficientes do regime simplificado**: serviços 151.º 0,75 · outros 0,35 · vendas/hotelaria 0,15 · propriedade intelectual 0,95 · AL moradia 0,35 (contenção 0,50) · transparência 1,0 · **subsídios não destinados à exploração 0,30** · **subsídios à exploração 0,10**.
- **IVA**: isenção até 15 000 € (excesso 18 750 €). Continente 6/13/23, Madeira 5/12/22, Açores 4/9/16.
- **Segurança Social**: taxa 21,4% sobre 70% (serviços) ou 20% (bens/hotelaria).
- **Categoria F (rendas puras)**: taxa autónoma habitação 25% · não habitacional 28%; reduções por duração do contrato habitacional (5–10 anos −10 p.p.; 10–20 −15 p.p.; ≥20 −20 p.p.). Sem SS, sem IVA. Motor próprio `calcularCategoriaF`.
- **IRS**: escalões de 12,5% a 48%; mínimo de existência 12 880 €.
- **IRC** (comparador): geral 19% · PME 15% até 50 000 €; dividendos 28%.
- **Catálogo**: 99 atividades (Art. 151.º + regimes especiais + subsídios).
<!-- /AUTO-GERADO:valores-fiscais -->

## Manutenção automática
`scripts/check-fiscal-data.mjs` (`npm run fiscal:check`) deteta desatualização;
`.github/workflows/fiscal-data-check.yml` corre mensalmente e abre issue. A
aplicação dos valores é **sempre verificada por humano** — nunca auto-aplicar.
`scripts/sync-skills-fiscal.mjs` (`npm run skills:sync`) extrai os valores de
`fiscal-data.ts` e regenera o bloco AUTO-GERADO desta skill — sempre que mudas os
dados, corre-o (ou usa `npm run skills:sync -- --check` no CI para detetar
divergências). Assim a skill nunca desalinha da fonte de verdade.

## Ao concluir
A API `GET /api/fiscal-data` deve expor qualquer parâmetro novo (com fonte/data).
Atualizar o FAQ (`src/lib/faq.ts`) e a secção "Fontes" se os números visíveis mudarem.
