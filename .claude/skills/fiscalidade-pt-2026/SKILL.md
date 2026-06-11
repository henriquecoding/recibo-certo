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
<!-- Ano fiscal 2026 · última revisão 2026-06-11 · gerado de src/lib/fiscal-data.ts -->

- **IAS** 537,13 €.
- **Retenção na fonte** (cat. B): Art. 151.º 23% · outros serviços 11,5% · direitos de autor 16,5% · vendas sem retenção. Dispensa abaixo de 15 000 €/ano.
- **Coeficientes do regime simplificado**: serviços 151.º 0,75 · outros 0,35 · vendas/hotelaria 0,15 · propriedade intelectual 0,95 · AL moradia 0,35 (contenção 0,50) · transparência 1,0 · **subsídios não destinados à exploração 0,30** · **subsídios à exploração 0,10**.
- **IVA**: isenção até 15 000 € (excesso 18 750 €). Continente 6/13/23, Madeira 4/12/22 (DLR 6/2024/M), Açores 4/9/16.
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

## Tributação Autónoma — IRC (Art. 88.º CIRC 2026)

> Aplica-se ao simulador de empresa (IRC). Os valores abaixo são os vigentes desde
> OE2025 para combustão e OE2026 para PHEV (Euro 6e-bis). Threshold = custo de
> aquisição da viatura, não o encargo em si.

### Viaturas ligeiras de passageiros — taxas e thresholds

| Tipo | ≤ €37 500 | €37 500–€45 000 | > €45 000 |
|---|---|---|---|
| Combustão (gasóleo/gasolina) | 8% | 25% | 32% |
| PHEV (Euro 6e-bis, < 80 g CO₂/km) | 2,5% | 7,5% | 15% |
| Elétrica | 0% | 0% | 0% |

**Atenção (thresholds antigos incorretos):** até 2024 os limites eram €27 500 /
€35 000 com taxas 10% / 17,5% / 35%. Foram atualizados na Lei do OE2025 — não
usar os valores antigos.

### Outras taxas de tributação autónoma (n.ºs 7, 9, 1, 14 do Art. 88.º)

| Rubrica | Taxa |
|---|---|
| Despesas de representação (n.º 7) | 10% |
| Ajudas de custo + km em viatura própria (n.º 9) | 5% |
| Despesas não documentadas (n.º 1) | 50% |
| Agravamento por prejuízo fiscal (n.º 14) | +10 p.p. sobre cada taxa |

**Exceção ao agravamento (n.º 14):** não se aplica nos primeiros 3 anos de
atividade OU se tiver tido lucro em pelo menos 1 dos 3 exercícios anteriores.

### Base de incidência

- Viaturas: encargos anuais relacionados (combustível, seguros, manutenção,
  depreciações, rendas) × taxa — não o custo de aquisição.
- Representação: valor total da despesa × 10%.
- Cumulação: TA é liquidada independentemente do IRC regular.

**Fonte:** Art. 88.º CIRC (versão em vigor 2025/2026); OCC portal; Coverflex Guia
IRC 2026; Caetano/Fleet Magazine (PHEV OE2026).

---

## Benefícios Fiscais ao Investimento — IRC

### RFAI — Regime Fiscal de Apoio ao Investimento (Art. 22.º–26.º CFI)

| Região | Taxa de dedução | Limite por projeto |
|---|---|---|
| Norte, Centro, Alentejo, Açores, Madeira | 30% | Até €15 M |
| Norte, Centro, Alentejo, Açores, Madeira | 10% | Excedente a €15 M |
| Lisboa, Algarve | 10% | Sem limite máximo por lei |

**Limites à coleta:**
- Regra geral: dedução ≤ 50% da coleta IRC do período.
- Primeiros 3 anos de atividade elegível: dedução ≤ 100% da coleta.
- Saldo não deduzido: reportável por 10 exercícios seguintes.

**Investimentos elegíveis:** ativos corpóreos e incorpóreos produtivos (excluindo
viaturas, mobiliário de escritório e ativo biológico não consumível).

**Fonte:** Art. 22.º-26.º CFI (DL 162/2014 com alterações OE2022/Lei 12/2022);
estrategor.pt e santander.pt (Jan/Abr 2026); OCC Benefícios Fiscais Jan 2026.

### RFAI Contratual (Art. 8.º–22.º CFI)

Para investimentos de grande dimensão (tipicamente ≥ €3 M), negociado com IAPMEI/
AICEP. Benefícios adicionais além do RFAI regular:

- Redução IRC até 25–50% do investimento elegível.
- Isenção/redução IMI sobre imóveis afetos ao projeto.
- Isenção IMT na aquisição de imóveis elegíveis.
- Isenção Imposto do Selo nas operações elegíveis.
- Prazo: até 10 anos a partir da conclusão do projeto.

> Regime negociado caso a caso — o simulador apenas estima. Remeter para consulta
> com IAPMEI/AICEP para projetos desta dimensão.

**Fonte:** Art. 8.º-22.º CFI; portaldosincentivos.pt; IAPMEI; OCC Jan 2026.

### DLRR — Dedução por Lucros Retidos e Reinvestidos (Art. 27.º–34.º CFI)

- **Só PME e Small Mid Cap** (≤ 3 000 trabalhadores; confirmar definição CFI).
- Dedução: 10% dos lucros retidos e reinvestidos em ativos elegíveis.
- **Limite máximo de lucros elegíveis:** €5 000 000 por período.
- **Limite à coleta:** dedução ≤ 25% da coleta IRC.
- Saldo não utilizado: reportável por **12 exercícios** seguintes.
- Os lucros devem ser reinvestidos nos 3 anos seguintes à sua retenção.

**Fonte:** Art. 27.º-34.º CFI; OCC Benefícios Fiscais Jan 2026; Coverflex IRC 2026.

### SIFIDE II — Sistema de Incentivos Fiscais à I&D Empresarial (Art. 35.º–42.º CFI)

**Taxa base:** 32,5% das despesas com I&D do período.

**Taxa incremental:** 50% do aumento das despesas de I&D face à média dos 2
anos anteriores — capped a **€1 500 000** de incremento (i.e., máx €750 000 de
dedução incremental adicional).

**Majorações especiais:**

| Situação | Taxa efetiva (base + majoração) |
|---|---|
| PME < 2 exercícios, sem histórico incremental | 47,5% (base 32,5% + 15% majoração) |
| Sem despesas I&D nos últimos 2 anos (incremento = 100% da despesa atual) | Até 82,5% (32,5% + 50% do total) |

**Limite à coleta:** sem limite percentual explícito (difere de RFAI/DLRR); o
excesso é reportável por **12 exercícios** seguintes.

**Empresas do sistema científico e tecnológico nacional** (ISCT): taxa base pode
ser majorada — confirmar caso específico.

> Para o simulador: exibir a taxa máxima possível para o perfil indicado (startup,
> PME sem histórico, PME com histórico, grande empresa). Sempre notar que o
> apuramento exato exige os dados reais de I&D dos 2 anos anteriores.

**Fonte:** Art. 35.º-42.º CFI; OCC IRC Benefícios Fiscais; pmeincentivos.pt Mar 2026;
Ayming Portugal; Zabala Portugal.

---

## Regime de Contabilidade Organizada — Trabalhadores Independentes

Alternativa ao regime simplificado para categoria B (Art. 28.º e 32.º CIRS).

**Cálculo do rendimento tributável:**
```
rendTributavel = faturação − despesasReais − custoContabilista − SS − isençõesJovem
```
(vs. simplificado: `faturação × coeficiente − SS − isençõesJovem`)

**Quando é obrigatório:** volume de negócios > €200 000 em **dois anos
consecutivos** (passa obrigatoriamente no ano seguinte).

**Quando é vantajoso (estimativa):**
- Atividades Art. 151.º (coef. 0,75): compensa quando despesas reais documentadas
  > 25% da faturação menos o custo do contabilista.
- Atividades vendas (coef. 0,15): raramente vantajoso (dedução implícita já é 85%).

**Custo do contabilista certificado (OCC):**
- Estimativa: €150–300/mês (usar €200/mês = €2 400/ano como default no simulador).
- Obrigatório ter contabilista OCC no regime de contabilidade organizada.

**Tributação autónoma:** as viaturas e despesas de representação do TI em
contabilidade organizada ficam sujeitas às mesmas taxas de TA do Art. 88.º CIRC
(via Art. 73.º CIRS) — ver secção acima.

**IRS Jovem, deduções à coleta, escalões progressivos:** aplicam-se igual ao regime
simplificado. A Segurança Social é calculada da mesma forma (base = 70% ou 20%
da faturação).

**Fonte:** Art. 28.º, 32.º e 73.º CIRS; especialistadoirs.pt; crncontabilidade.pt;
simuladorneto.pt (Jan/Mar 2026).

---

## Benefícios Municipais — IMI e IMT

### IMI — Imposto Municipal sobre Imóveis
- Taxa geral: 0,3%–0,45% (prédios urbanos, conforme município).
- Taxa rural: 0,8%.
- **Isenção por RFAI:** prédios que constituam investimento relevante reconhecido
  pelo município; duração até 10 anos; decisão da assembleia municipal.

### IMT — Imposto Municipal sobre Transmissões Onerosas
- Taxa geral: 0%–8% consoante o valor e o tipo de imóvel.
- **Isenção por RFAI:** aquisição de imóveis integrados no projeto de investimento
  elegível; a isenção está ligada ao reconhecimento formal do RFAI.

> Para o simulador: modelar como potencial poupança associada ao RFAI/RFAI
> contratual. A isenção efetiva depende de reconhecimento casuístico pelo município
> — tratar como nota informativa, não aplicar automaticamente.

**Fonte:** PwC Guia Fiscal IMI/IMT 2026; estrategor.pt RFAI 2026; CGD IMI isenções.

---

## Particularidades Individuais — IRS

### Deficiência — Art. 87.º CIRS
- Dedução à coleta: **25% das despesas de saúde, reabilitação e educação** (não
  limitadas ao teto global de deduções).
- Dedução adicional sobre rendimentos: **15% dos rendimentos brutos** (cat. A, B, H)
  com grau de incapacidade ≥ 60%, máximo **€1 000** por sujeito passivo.
- Rendimentos de trabalho dependente de pessoa com deficiência: isenção de 50%
  (máx €13 085; escalão a confirmar anualmente).

**Fonte:** Art. 87.º CIRS; CGD Benefícios Deficiência; APD Porto; info.portaldasfinancas.gov.pt.

### IFICI — Incentivo Fiscal à Investigação Científica e Inovação (ex-NHR 2.0)
- Substitui o NHR clássico desde 2024 (OE2024).
- **Taxa flat: 20%** sobre rendimentos do trabalho e cat. B de origem portuguesa.
- Elegíveis: investigadores, professores universitários, pessoal de I&D, startups
  de tecnologia, determinadas atividades de valor acrescentado elevado.
- Prazo: 10 anos (não renovável após período esgotado).
- Dividendos e juros de fonte estrangeira: potencialmente isentos (confirmar caso a caso).

> Para o simulador: aplicar a taxa de 20% flat ao rendimento coletável (em vez
> dos escalões progressivos) quando o utilizador seleciona IFICI. Notar que a
> elegibilidade depende da atividade e estatuto aprovado pela AT.

**Fonte:** OE2024 (Lei 82/2023); PwC Guia IRS 2026; getgoldenvisa.com; agencygroup.pt;
expert-zoom.com (2026).

### Agregado Familiar e Dependentes — Deduções à Coleta (Art. 78.º-A CIRS)

| Situação | Dedução à coleta |
|---|---|
| 1.º e 2.º dependente | €600 cada |
| 3.º dependente e seguintes | €900 cada |
| Dependente com deficiência (≥ 60%) | €1 900 adicional por dependente |
| Ascendente em comunhão de habitação | €635 (se não aufere pensão) |

**Quociente conjugal (declaração conjunta):** soma de rendimentos ÷ 2 → aplica
escalões → imposto × 2. Vantajoso quando há assimetria de rendimentos entre cônjuges.

**Limite global das deduções à coleta (Art. 78.º n.º 7):** para rendimentos coletáveis
> €80 000: 1 000 € + [€80 000 − rendimento coletável] × (2 500/7 000). Para
rendimentos ≤ €80 000: sem limite global (exceto despesas de saúde com deficiência).

**Fonte:** Art. 78.º-A CIRS; comparaja.pt Deduções 2026; CGD IRS dependentes;
Doutor Finanças guia dependentes 2026.

---

## Englobamento — Opção de tributação progressiva (Cat. F, E, mais-valias)

Rendimentos das categorias E (capitais), F (prediais) e mais-valias (cat. G)
tributados por retenção na fonte (taxas liberatórias: 25–28%) podem, opcionalmente,
ser **englobados** ao rendimento global e tributados pelas taxas progressivas.

- Quando compensa: escalão marginal efetivo < 28% (i.e., rendimento coletável total
  após englobamento ≤ ~€25 000 para solteiro).
- Desvantagem: obriga a incluir todos os rendimentos da categoria no englobamento
  (não se pode escolher englobar só parte).
- Cat. B rendimento real: englobamento é obrigatório (não é opcional).

**Nota para o simulador:** calcular ambos os cenários (com/sem englobamento) e
exibir qual é mais favorável para o perfil indicado.

**Fonte:** Art. 22.º e 71.º-76.º CIRS; Coverflex Deduções 2026; comparaja.pt.

---

## Ao concluir
A API `GET /api/fiscal-data` deve expor qualquer parâmetro novo (com fonte/data).
Atualizar o FAQ (`src/lib/faq.ts`) e a secção "Fontes" se os números visíveis mudarem.
