# 00 — Visão geral do Motor de Recibo de Vencimento

## Objetivo e âmbito

O motor reconstrói um recibo português rubrica a rubrica, explica o tratamento de cada linha e separa:

- dinheiro pago ou descontado;
- base sujeita a IRS;
- base de incidência contributiva;
- retenção de IRS por bolsa legal;
- SS do trabalhador e da entidade empregadora;
- líquido antes/depois de penhora;
- custo da entidade empregadora.

Portugal é a única jurisdição normativa. Continente, Madeira e Açores selecionam tabelas próprias. Um país estrangeiro nunca altera regras salariais portuguesas neste domínio.

## Experiência pretendida

1. O utilizador cria rubricas ou importa um recibo.
2. O assistente pergunta factos, não conclusões fiscais: «existe acordo escrito para uso pessoal da viatura?», não «a viatura é tributável?».
3. Cada rubrica devolve sujeito, parcialmente isento, isento ou dedução, com explicação e fonte.
4. Casos incompletos devolvem `needs_input`; casos fora da matriz devolvem `unsupported`.
5. O resultado pode ser comparado com o recibo importado, outra proposta ou um objetivo de líquido.

## Estado desta entrega

Está implementado o núcleo funcional mensal em `src/domains/payroll/`: rubricas fixas, prémios, férias/Natal, horas extra, noturno, faltas, refeição, deslocações, abono para falhas, retroativos, viatura em espécie, penhora, cálculo inverso, auditoria de totais e projeções separadas de doença/parentalidade.

Continuam bloqueados para revisão factual própria: stock options, seguros, PPR/pensões, apoios sociais/educação, rescisões, função pública e regimes contratuais especiais. O bloqueio é uma proteção, não um valor zero.

## Critério de conclusão

Uma rubrica só é de produção quando a regra e o dataset estiverem aprovados, com vigência, fonte oficial, memória, fronteiras, testes dourados e revisão fiscal/laboral independente. O dataset 2026 permanece `draft`.

## Exemplo de saída

| Rubrica | Bruto/caixa | IRS sujeito | Base SS | IRS retido | SS trabalhador | Impacto líquido |
|---|---:|---:|---:|---:|---:|---:|
| Base | 2 000,00 € | 2 000,00 € | 2 000,00 € | pela tabela | 220,00 € | calculado |
| Refeição | por dias | só excesso diário | só excesso diário | alocado | 11% do excesso | calculado |

Valores exemplificativos nunca substituem o resultado versionado.
