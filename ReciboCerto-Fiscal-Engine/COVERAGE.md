# Matriz de cobertura

Esta matriz é um contrato de honestidade. `contract_only` significa que os inputs e bloqueios estão definidos, mas o domínio ainda não calcula imposto.

| Domínio | Estado | Primeiro resultado entregável | Bloqueio principal |
|---|---|---|---|
| Tesouraria por recibo | `contract_only` | Caixa, IVA, retenção e reserva SS separados | Migrar regras sem chamar obrigação à reserva |
| IRS anual | `contract_only` | Lotes de rendimento + coleta progressiva | Mínimo de existência, solidariedade, IFICI e IRS Jovem |
| IVA | `contract_only` | Enquadramento e territorialidade | Matriz art. 6.º e regimes transfronteiriços |
| SS independente | `contract_only` | Apuramento trimestral e contribuição mensal | Opção, limites e isenções condicionais |
| Retenção salarial | `contract_only` | Retenção por linha de remuneração | Elegibilidade IRS Jovem e casos laborais |
| IRC | `contract_only` | Ponte do resultado contabilístico à coleta | Ajustamentos fiscais e dados contabilísticos |
| Tributação autónoma | `contract_only` | Rubricas do art. 88.º com gates | Corrigir elétricos e agravamento no legado |
| Benefícios | `contract_only` | Checklist de elegibilidade | Evidência, auxílios de Estado e aprovação |
| Heranças/doações | `contract_only` | Casos simples, explicitamente limitados | Complexidade civil e avaliação |
| Rendimento internacional | `contract_only` | Encaminhamento português por país/categoria | Artigos de cada CDT e limite do crédito |

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

## Nota desta sessão

Alguns bloqueios do motor legado listados acima já foram corrigidos em `src/lib/` (ver `README.md`, secção "Estado dos P0"): adicional de solidariedade e âmbito do IFICI (bloqueio de "IRS anual"), correção do `taxaTA` das elétricas (bloqueio de "Tributação autónoma", parcial — o líquido do gerente também foi corrigido, mas a duplicação arquitetural entre `fiscal.ts`/`SimuladorIntegrado.tsx`/`ModoGuiadoEmpresa.tsx` mantém-se). Isto não muda o estado `contract_only` destes domínios nesta matriz — corrigir um bug no motor legado não substitui a migração para o novo núcleo, com proveniência, testes dourados e aprovação por domínio.
