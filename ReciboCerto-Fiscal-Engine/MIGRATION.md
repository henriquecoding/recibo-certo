# Plano de migração por fatias verticais

## Regra de trabalho

Cada fatia começa num teste que reproduz o comportamento atual, acrescenta o contrato novo, executa antigo e novo em paralelo e só troca a UI depois de as diferenças estarem explicadas. A lógica antiga é removida apenas no final da fatia.

## Mapeamento do legado

| Legado | Destino | Ação |
|---|---|---|
| `src/lib/fiscal-data.ts` | `datasets/` + `legal/` | Separar parâmetros, fonte, vigência e aprovação |
| `src/lib/fiscal.ts::calcular` | `receipt_cashflow` | Separar caixa de obrigação fiscal |
| `src/lib/fiscal.ts::simularIRSAnual` | `personal_income_tax` | Reescrever por lotes de rendimento |
| `src/lib/fiscal.ts::calcularTributacaoAutonoma` | `autonomous_taxation` | Corrigir P0 e migrar por rubrica |
| `src/lib/fiscal.ts::estimarRFAI/SIFIDE` | `tax_incentives` | Colocar gate de elegibilidade antes da fórmula |
| `src/lib/fiscal-dependente.ts` | `payroll_withholding` | Migrar tabela, linha remuneratória e memória |
| `src/lib/fiscal-heranca.ts` | `inheritance_and_gifts` | Delimitar explicitamente os casos suportados |
| `ModoGuiadoEmpresa.tsx` | `corporate_income_tax` + adaptador UI | Extrair toda a lógica fiscal do React |
| `/api/fiscal-data` | API de dataset/decisão | Acrescentar esquema, hash, estado e versão |

## Sequência

### M0 — P0 no legado

Corrigir com testes: mínimo de existência, adicional de solidariedade, âmbito IFICI, elegibilidade IRS Jovem, líquido do gerente, TA elétrica e ligações legais. Desativar benefícios automáticos sem elegibilidade.

**Estado:** concluído no motor em uso, com testes de reprodução. O mínimo de existência usa agora a decisão por troços do Art. 70.º; benefícios não confirmados não reduzem o imposto; a lógica empresarial comum foi extraída dos componentes React. Isto não aprova o dataset do núcleo novo.

### M1 — Recibo, IVA e SS

Primeira integração end-to-end: formulário → pedido normalizado → decisão → memória → UI. Esta fatia valida os contratos sem depender do IRS anual completo.

### M2 — Payroll

Migrar retenção mensal e remunerações. O simulador de empresa passa a consumir o resultado payroll do gerente, eliminando a omissão do IRS.

**Estado transitório:** o domínio dedicado de payroll está implementado como `functional_draft`, e o simulador reformulado usa `src/lib/payroll-simulator-legacy-adapter.ts` sobre as tabelas aprovadas atualmente pela aplicação. O simulador de empresa consome o mesmo cálculo salarial do gerente. Férias e Natal fracionados retêm proporcionalmente o imposto calculado sobre o direito total, nos termos do Art. 99.º-C, e não são somados ao salário para escolher uma taxa.

### M3 — IRS anual

Introduzir entidades e lotes de rendimento. Migrar taxas, deduções específicas, englobamento, solidariedade, mínimo de existência, benefícios e rendimentos estrangeiros.

### M4 — IRC e TA

Criar input contabilístico, ajustamentos e coleta. Integrar TA por rubrica e derramas. Só depois calcular dividendos e líquido do sócio/gerente.

### M5 — Benefícios e sucessões

Benefícios exigem dossiê de elegibilidade. Sucessões mantêm uma fronteira conservadora e encaminham casos complexos.

### M6 — Integração controlada

Execução paralela silenciosa do motor antigo e novo; comparação por cenário e telemetria sem dados pessoais; revisão das diferenças; ativação por feature flag e domínio; rollback imediato por dataset/versão.

As etapas M1 e M3–M6 permanecem pendentes. O estado transitório de M2 não autoriza ativar o dataset draft nem eliminar o adaptador antes dos testes cruzados e da aprovação independente.

## Compatibilidade

O adaptador temporário deve guardar:

- request normalizado;
- resultado legado;
- resultado novo;
- versão de ambos;
- diferenças por linha;
- motivo da diferença ou classificação `unexplained`.

Qualquer diferença inexplicada bloqueia a troca da superfície.

## Rollback

A aplicação seleciona engine e dataset por feature flag. O rollback muda a flag, não os dados históricos. Resultados guardados preservam `engineVersion` e `datasetId`.
