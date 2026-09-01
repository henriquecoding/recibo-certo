# Arquitetura — Pricing Engine

## Decisão estruturante: não se cria uma segunda fonte de verdade fiscal

O briefing pedia `tax-rules/` com versionamento. O Recibo Certo **já tem isso**:
`src/lib/fiscal-data.ts`, com `Sourced<T>` (valor + base legal + fonte + data de
verificação) e `assertFiscalDataIntegrity()` a falhar o build.

Criar um segundo registo de taxas de IVA ou de Segurança Social seria reproduzir
o defeito que o projeto já corrigiu duas vezes (a «Situação de IVA» que existia
em três sítios; os três registos paralelos de ferramentas). Por isso:

- **IVA, Segurança Social, IRS, coeficientes, retenção** → lidos de
  `fiscal-data.ts` / `fiscal.ts`. Zero literais.
- **Regras de negócio de preço** (comissões de canal, taxas de processamento,
  pressupostos de horas faturáveis, regras legais de afixação e promoções) →
  novas, em `src/lib/pricing/regras.ts`, com o **mesmo** contrato `Sourced<T>` e
  a sua própria asserção de integridade.

A fronteira é clara: `fiscal-data.ts` guarda o que o Estado impõe;
`pricing/regras.ts` guarda o que o mercado pratica. Os dois têm proveniência; só
o primeiro é lei.

## Fluxo

```
        PerguntaInicial (o que queres definir?)
                    ↓
              PricingContext            ← o cérebro: o cenário completo
                    ↓
    ┌───────────────┴────────────────┐
    │        motor.ts (orquestra)    │
    └───────────────┬────────────────┘
                    ↓
   custos → tempo → producao → comissoes → iva → fiscalTI
                    ↓
             preco.ts (resolve P)
                    ↓
   margem · breakeven · desconto · psicologico
                    ↓
        recomendacao (faixa) + cenarios (E se?)
                    ↓
              explicacao (memória de cálculo)
                    ↓
                Resultado
```

Todas as funções são **puras e síncronas**. Nenhum cálculo passa pelo servidor:
o motor corre no browser, o que mantém a promessa `privacy: "local-only"` do
catálogo de ferramentas.

## Os motores

| Motor | Ficheiro | Responsabilidade única |
|---|---|---|
| Custos | `motores/custos.ts` | Normaliza custos diretos, variáveis, fixos e ocultos; aplica desperdício e devoluções |
| Tempo | `motores/tempo.ts` | Horas produtivas reais → valor/hora |
| Produção | `motores/producao.ts` | Matéria-prima + mão de obra + energia + depreciação → custo unitário |
| Comissões | `motores/comissoes.ts` | Canal, pagamento, afiliado; separa base bruta de base líquida |
| IVA | `motores/iva.ts` | Taxa por região/escalão, isenção do Art. 53.º com duplo efeito, regime da margem |
| Fiscal TI | `motores/fiscal-ti.ts` | SS e IRS marginal como custo variável sobre a faturação |
| Preço | `motores/preco.ts` | Resolve `P` em forma fechada; deteta cenários impossíveis |
| Margem | `motores/margem.ts` | Margem ↔ markup, margem de contribuição |
| Break-even | `motores/breakeven.ts` | Unidades e faturação de equilíbrio |
| Desconto | `motores/desconto.ts` | Efeito do desconto na margem; desconto máximo |
| Psicológico | `motores/psicologico.ts` | Terminações comerciais, sempre como sugestão separada |
| Recomendação | `motores/recomendacao.ts` | As quatro âncoras da faixa de preço |
| Cenários | `motores/cenarios.ts` | «E se?», comparação A/B/C |
| Objetivo | `motores/objetivo.ts` | Caminho inverso (ganhar X, cobrar Y) |
| Explicação | `motores/explicacao.ts` | Memória de cálculo linha a linha, com nível de confiança |

Cada motor recebe tipos explícitos, devolve tipos explícitos e não conhece React.

## Contrato de entrada e saída

```ts
precificar(contexto: PricingContext): ResultadoPreco
```

`PricingContext` é serializável (guardável em `localStorage`, partilhável por
URL) e validado por `validarContexto()` antes de qualquer cálculo. Nenhum motor
assume que os números são finitos: `sanitize()` é aplicado na fronteira.

## Nível de confiança

Cada linha da explicação carrega `confianca: "oficial" | "mercado" | "estimativa"`:

- `oficial` — deriva de `fiscal-data.ts` (lei).
- `mercado` — deriva de `pricing/regras.ts` (preçário de terceiro, com data).
- `estimativa` — depende de pressupostos do utilizador.

A UI não grita isto. Mostra a origem quando a pessoa abre «ver cálculo», e
distingue visualmente uma taxa legal de um pressuposto editável. É a diferença
entre informar e fingir autoridade.

## O que fica de fora da v1 (deliberadamente)

- **Preço de mercado / concorrência.** Sem fonte fiável, a arquitetura fica
  preparada (`ComparacaoMercado` no tipo de resultado) mas o módulo devolve
  sempre «sem dados suficientes». Melhor um vazio honesto do que um número
  inventado.
- **Bundles multi-produto.** Os tipos suportam (`ItemBundle[]`), o UI ainda não.
- **Multi-moeda.** A engine usa uma constante de moeda em vez de assumir `€`
  literal, mas a v1 é EUR.

## Testes

`src/lib/__tests__/pricing.test.ts` cobre a matriz de 20 casos do briefing mais
os invariantes de §12 da especificação de cálculo. `assertRegrasPricing()` corre
ao importar o módulo, tal como `assertFiscalDataIntegrity()`.
