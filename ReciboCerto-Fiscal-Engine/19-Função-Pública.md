# 19 — Função pública

## Fronteira de domínio

O motor mensal atual destina-se ao regime geral de trabalho dependente. Um trabalhador da Administração Pública não deve ser tratado como setor privado apenas por receber vencimento e descontar IRS.

## Diferenças a modelar

- vínculo e tabela remuneratória;
- posição/nível e suplementos;
- ADSE e outros descontos próprios;
- tempo de trabalho, horas extra e ajudas de custo;
- proteção social convergente ou regime geral;
- regras de faltas, doença e parentalidade;
- abono de refeição e atualizações orçamentais.

## Estado e encaminhamento

O builder deve perguntar «O vínculo é de emprego público?». Se sim, usa um contrato `public_employment` dedicado. Enquanto esse contrato não estiver aprovado, devolve `unsupported` com indicação dos campos necessários; não mostra um líquido privado como aproximação.

## Partes reutilizáveis

As tabelas de retenção de IRS por região/situação, o modelo de bolsas, dinheiro em cêntimos, memória e auditoria são reutilizáveis. Parâmetros laborais e contributivos não são herdados por defeito.

## Testes antes de ativar

CG Aposentações/regime geral, ADSE, suplementos, Madeira/Açores, refeição, férias/Natal, doença e casos de mobilidade.

## Fontes

Cada dataset deve citar Diário da República, DGAEP, AT e Segurança Social conforme a regra. A ausência de uma matriz oficial completa é o bloqueio registado deste capítulo.
