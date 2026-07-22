# Matriz de cobertura

Esta matriz é um contrato de honestidade. `contract_only` significa que os inputs e bloqueios estão definidos, mas o domínio ainda não calcula imposto.

| Domínio | Estado no núcleo novo | Estado da remediação em `src/lib/` | Bloqueio principal |
|---|---|---|---|
| Tesouraria por recibo | `contract_only` | Inputs monetários normalizados | Migrar regras sem chamar obrigação à reserva |
| IRS anual | `contract_only` | P0 do mínimo, solidariedade e âmbito IFICI corrigidos | Migrar por lotes; aprovar gates completos de regimes especiais |
| IVA | `contract_only` | Sem alteração estrutural | Matriz art. 6.º e regimes transfronteiriços |
| SS independente | `contract_only` | Sem alteração estrutural | Opção, limites e isenções condicionais |
| Retenção salarial | `functional_draft` | Simulador por rubrica integrado por adaptador revisto | Testes dourados oficiais, benefícios complexos, cessação e dataset aprovado |
| IRC | `contract_only` | Empresa centralizada, mas continua estimativa simplificada | Ponte do resultado contabilístico, ajustamentos e dados contabilísticos |
| Tributação autónoma | `contract_only` | Elétricos e paridade entre superfícies corrigidos | Migrar matriz integral do art. 88.º para o núcleo novo |
| Benefícios | `contract_only` | RFAI/SIFIDE falham de forma segura; potencial não reduz imposto | Evidência, auxílios de Estado e aprovação |
| Heranças/doações | `contract_only` | Inputs monetários normalizados | Complexidade civil e avaliação |
| Rendimento internacional | `contract_only` | Sem alteração estrutural | Artigos de cada CDT e limite do crédito |

## Definição de cobertura de uma regra

Uma regra só muda para `reviewed` quando contém:

- entidade e input versionado;
- vigência e jurisdição;
- pré-condições e exclusões;
- fórmula e política de arredondamento;
- referências oficiais semanticamente verificadas;
- memória de cálculo;
- casos de fronteira e propriedades;
- cenários dourados aprovados.

`production` exige ainda aprovação do dataset, testes cruzados com a aplicação e rollback ensaiado.

## Leitura correta da matriz

`functional_draft` significa que existe implementação e cobertura automatizada, mas não aprovação para o dataset novo substituir todos os cálculos em produção. As correções no motor em uso reduzem risco imediato; não mudam por si só o estado dos nove domínios `contract_only`. A passagem a `reviewed`/`production` continua a exigir proveniência, testes dourados e aprovação por domínio.
